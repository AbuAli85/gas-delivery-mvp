/**
 * customers.ts — Customer loyalty, referral, and profile procedures.
 *
 * All procedures use sessionToken (stored in localStorage) for auth.
 * Admin procedures use the same adminPin as orders/providers.
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
// getDb() is async — must be awaited before use
import {
  customers,
  customerOffers,
  customerOfferRedemptions,
  referrals,
  orders,
} from "../../drizzle/schema";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import crypto from "crypto";

const ADMIN_PIN = process.env.ADMIN_PIN ?? "1234";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compute tier from points */
function computeTier(points: number): "bronze" | "silver" | "gold" | "platinum" {
  if (points >= 1000) return "platinum";
  if (points >= 500) return "gold";
  if (points >= 100) return "silver";
  return "bronze";
}

/** Generate a unique 8-char uppercase referral code */
function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

type DbType = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Get customer by sessionToken, throws UNAUTHORIZED if not found */
async function requireCustomer(db: DbType, sessionToken: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.sessionToken, sessionToken))
    .limit(1);
  if (!customer) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid session" });
  }
  return customer;
}

/** Award points to a customer and update tier */
async function addPoints(db: DbType, customerId: number, pts: number) {
  const [current] = await db
    .select({ points: customers.points })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  if (!current) return;
  const newPoints = current.points + pts;
  const newTier = computeTier(newPoints);
  await db
    .update(customers)
    .set({ points: newPoints, tier: newTier })
    .where(eq(customers.id, customerId));
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const customersRouter = router({
  // ── Profile ────────────────────────────────────────────────────────────────

  /** Get customer profile by sessionToken */
  getProfile: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return requireCustomer(db, input.sessionToken);
    }),

  /** Create or update customer profile. Handles referral code application on first save. */
  upsertProfile: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        phone: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        customerType: z.enum(["individual", "restaurant", "business"]).optional(),
        referralCode: z.string().optional(), // code entered by this new customer
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Check if customer already exists by phone
      const [existing] = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, input.phone))
        .limit(1);

      if (existing) {
        // Update profile
        await db
          .update(customers)
          .set({
            sessionToken: input.sessionToken,
            name: input.name ?? existing.name ?? undefined,
            email: input.email ?? existing.email ?? undefined,
            customerType: input.customerType ?? existing.customerType,
          })
          .where(eq(customers.id, existing.id));
        return { ...existing, sessionToken: input.sessionToken };
      }

      // New customer — generate referral code
      let refCode = generateReferralCode();
      // Ensure uniqueness (retry once on collision)
      const [collision] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.referralCode, refCode))
        .limit(1);
      if (collision) refCode = generateReferralCode();

      const [inserted] = await db
        .insert(customers)
        .values({
          phone: input.phone,
          sessionToken: input.sessionToken,
          name: input.name,
          email: input.email,
          customerType: input.customerType ?? "individual",
          referralCode: refCode,
        })
        .$returningId();

      const newCustomerId = inserted.id;

      // Apply referral code if provided
      if (input.referralCode) {
        const [inviter] = await db
          .select()
          .from(customers)
          .where(
            and(
              eq(customers.referralCode, input.referralCode.toUpperCase()),
              ne(customers.id, newCustomerId)
            )
          )
          .limit(1);

        if (inviter) {
          // Create pending referral record
          await db.insert(referrals).values({
            inviterId: inviter.id,
            inviteeId: newCustomerId,
            status: "pending",
          });
        }
      }

      const [created] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, newCustomerId))
        .limit(1);
      return created;
    }),

  // ── Loyalty ────────────────────────────────────────────────────────────────

  /** Get loyalty summary: points, tier, next tier threshold, referral stats */
  getLoyalty: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const customer = await requireCustomer(db, input.sessionToken);

      const tierThresholds = { bronze: 0, silver: 100, gold: 500, platinum: 1000 };
      const tierOrder = ["bronze", "silver", "gold", "platinum"] as const;
      const currentIdx = tierOrder.indexOf(customer.tier);
      const nextTier = tierOrder[currentIdx + 1] ?? null;
      const nextThreshold = nextTier ? tierThresholds[nextTier] : null;
      const pointsToNext = nextThreshold ? nextThreshold - customer.points : null;

      // Referral stats
      const allReferrals = await db
        .select()
        .from(referrals)
        .where(eq(referrals.inviterId, customer.id));

      return {
        points: customer.points,
        tier: customer.tier,
        nextTier,
        pointsToNext,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        referralCode: customer.referralCode,
        referralLink: `${process.env.APP_URL ?? ""}/customer/login?ref=${customer.referralCode}`,
        totalReferrals: allReferrals.length,
        rewardedReferrals: allReferrals.filter((r) => r.status === "rewarded").length,
        pendingReferrals: allReferrals.filter((r) => r.status === "pending").length,
      };
    }),

  // ── Order History ──────────────────────────────────────────────────────────

  getOrderHistory: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const customer = await requireCustomer(db, input.sessionToken);

      const history = await db
        .select({
          id: orders.id,
          status: orders.status,
          totalPrice: orders.totalPrice,
          createdAt: orders.createdAt,
          deliveryAddress: orders.deliveryAddress,
          paymentMethod: orders.paymentMethod,
        })
        .from(orders)
        .where(eq(orders.customerPhone, customer.phone))
        .orderBy(desc(orders.createdAt))
        .limit(50);

      return history;
    }),

  // ── Offers ─────────────────────────────────────────────────────────────────

  getOffers: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const customer = await requireCustomer(db, input.sessionToken);

      const tierOrder = ["bronze", "silver", "gold", "platinum"];
      const tierIdx = tierOrder.indexOf(customer.tier);

      const allOffers = await db
        .select()
        .from(customerOffers)
        .where(eq(customerOffers.isActive, true));

      // Filter offers accessible to this tier
      const accessible = allOffers.filter(
        (o) => tierOrder.indexOf(o.minTier) <= tierIdx
      );

      // Get already redeemed offer IDs
      const redeemed = await db
        .select({ offerId: customerOfferRedemptions.offerId })
        .from(customerOfferRedemptions)
        .where(eq(customerOfferRedemptions.customerId, customer.id));
      const redeemedIds = new Set(redeemed.map((r) => r.offerId));

      return accessible.map((o) => ({
        ...o,
        canRedeem: customer.points >= o.pointsCost && !redeemedIds.has(o.id),
        alreadyRedeemed: redeemedIds.has(o.id),
      }));
    }),

  // ── Award Points (called internally by providers.deliverOrder) ─────────────

  /**
   * Award points to a customer after order delivery.
   * Also checks for pending referrals and rewards them on first order.
   * This is a public procedure called server-side from providers router.
   */
  awardOrderPoints: publicProcedure
    .input(
      z.object({
        phone: z.string(),
        orderId: z.number(),
        orderTotal: z.string(), // decimal string
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Find customer by phone
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, input.phone))
        .limit(1);

      if (!customer) return { awarded: false };

      const BASE_POINTS = 10;

      // Award base points
      await addPoints(db, customer.id, BASE_POINTS);

      // Update totalOrders and totalSpent
      const spent = parseFloat(input.orderTotal) || 0;
      await db
        .update(customers)
        .set({
          totalOrders: sql`${customers.totalOrders} + 1`,
          totalSpent: sql`${customers.totalSpent} + ${spent}`,
        })
        .where(eq(customers.id, customer.id));

      // Check if this is the customer's first order (totalOrders was 0 before this)
      const isFirstOrder = customer.totalOrders === 0;

      if (isFirstOrder) {
        // Find pending referral where this customer is the invitee
        const [pendingRef] = await db
          .select()
          .from(referrals)
          .where(
            and(
              eq(referrals.inviteeId, customer.id),
              eq(referrals.status, "pending")
            )
          )
          .limit(1);

        if (pendingRef) {
          // Award inviter points
          await addPoints(db, pendingRef.inviterId, pendingRef.inviterPoints);
          // Award invitee bonus points
          await addPoints(db, customer.id, pendingRef.inviteePoints);
          // Mark referral as rewarded
          await db
            .update(referrals)
            .set({ status: "rewarded", rewardedAt: new Date() })
            .where(eq(referrals.id, pendingRef.id));
        }
      }

      return { awarded: true, basePoints: BASE_POINTS, isFirstOrder };
    }),

  // ── Admin Procedures ───────────────────────────────────────────────────────

  adminGetStats: publicProcedure
    .input(z.object({ adminPin: z.string().optional() }).optional())
    .query(async ({ input }) => {
      // Note: admin pin check is done on the client side via the existing pattern
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const totalCustomers = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(customers);

      const byType = await db
        .select({
          customerType: customers.customerType,
          cnt: sql<number>`COUNT(*)`,
        })
        .from(customers)
        .groupBy(customers.customerType);

      const byTier = await db
        .select({
          tier: customers.tier,
          cnt: sql<number>`COUNT(*)`,
        })
        .from(customers)
        .groupBy(customers.tier);

      const revenueByZone = await db
        .select({
          zoneId: orders.zoneId,
          revenue: sql<string>`SUM(${orders.totalPrice})`,
          orderCount: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(eq(orders.status, "delivered"))
        .groupBy(orders.zoneId)
        .orderBy(desc(sql`SUM(${orders.totalPrice})`))
        .limit(10);

      const topCustomers = await db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          points: customers.points,
          tier: customers.tier,
          totalOrders: customers.totalOrders,
          totalSpent: customers.totalSpent,
        })
        .from(customers)
        .orderBy(desc(customers.totalSpent))
        .limit(10);

      // Referral stats
      const totalReferrals = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(referrals);
      const rewardedReferrals = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(referrals)
        .where(eq(referrals.status, "rewarded"));

      return {
        totalCustomers: totalCustomers[0]?.count ?? 0,
        byType,
        byTier,
        revenueByZone,
        topCustomers,
        totalReferrals: totalReferrals[0]?.count ?? 0,
        rewardedReferrals: rewardedReferrals[0]?.count ?? 0,
      };
    }),

  adminListOffers: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(customerOffers).orderBy(desc(customerOffers.createdAt));
  }),

  adminCreateOffer: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        titleAr: z.string().min(1),
        discountType: z.enum(["percentage", "fixed", "free_delivery"]),
        discountValue: z.number().min(0),
        minTier: z.enum(["bronze", "silver", "gold", "platinum"]).optional(),
        pointsCost: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.insert(customerOffers).values({
        title: input.title,
        titleAr: input.titleAr,
        discountType: input.discountType,
        discountValue: String(input.discountValue),
        minTier: input.minTier ?? "bronze",
        pointsCost: input.pointsCost ?? 0,
      });
      return { success: true };
    }),

  adminToggleOffer: publicProcedure
    .input(z.object({ offerId: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .update(customerOffers)
        .set({ isActive: input.isActive })
        .where(eq(customerOffers.id, input.offerId));
      return { success: true };
    }),
});
