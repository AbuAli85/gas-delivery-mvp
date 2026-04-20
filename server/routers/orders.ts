import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import {
  createAssignment,
  createOrder,
  getAllZones,
  getActiveAssignment,
  getAssignmentsByOrder,
  getAvailableProvidersByZone,
  getOrderById,
  setProviderActiveOrder,
  updateAssignment,
  updateOrder,
  countActiveAssignments,
  getProviderById,
} from "../db";
import { resolveZone, selectNextProvider } from "../assignmentEngine";
import {
  assertOrderTransition,
  FIXED_ORDER_PRICE,
  COMMISSION_AMOUNT,
  DEFAULT_ETA_MINUTES,
  LatLng,
  calculateOrderPrice,
} from "../../shared/domain";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function doAssignProvider(orderId: number): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

  const rejectedIds: number[] = Array.isArray(order.rejectedProviderIds)
    ? (order.rejectedProviderIds as number[])
    : [];

  if (!order.zoneId) {
    await updateOrder(orderId, { status: "cancelled" });
    throw new TRPCError({ code: "BAD_REQUEST", message: "No zone resolved for order" });
  }

  const available = await getAvailableProvidersByZone(order.zoneId, rejectedIds);
  const provider = selectNextProvider(available, rejectedIds);

  if (!provider) {
    await updateOrder(orderId, { status: "cancelled" });
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No available providers in your area",
    });
  }

  // Expire any stale pending assignments (safety guard)
  const existingActive = await getActiveAssignment(orderId);
  if (existingActive && existingActive.status === "pending") {
    await updateAssignment(existingActive.id, {
      status: "expired",
      respondedAt: new Date(),
    });
  }

  const allAssignments = await getAssignmentsByOrder(orderId);
  const attemptNumber = allAssignments.length + 1;

  await createAssignment({
    orderId,
    providerId: provider.id,
    attemptNumber,
  });

  await setProviderActiveOrder(provider.id, orderId);

  // Anti-cheat: record assignedAt timestamp
  await updateOrder(orderId, {
    status: "assigned",
    assignedProviderId: provider.id,
    assignedAt: new Date(),
  });

  try {
    await notifyOwner({
      title: `New Order #${orderId} Assigned`,
      content: `Provider ${provider.name} has been assigned order #${orderId}. Customer at: ${order.customerAddress ?? `${order.customerLat}, ${order.customerLng}`}`,
    });
  } catch (_) {
    // Non-blocking
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const ordersRouter = router({
  /**
   * Step 1: Customer creates a draft order with their location.
   * Price is FIXED at 3.300 OMR — no dynamic pricing.
   */
  createOrderDraft: publicProcedure
    .input(
      z.object({
        customerLat: z.number(),
        customerLng: z.number(),
        customerAddress: z.string().optional(),
        customerPhone: z.string().optional(),
        customerName: z.string().optional(),
        // gasAmount is always 1 — kept for API compatibility
        gasAmount: z.number().min(1).max(1).default(1),
      })
    )
    .mutation(async ({ input }) => {
      // Fixed price — always 3.300 OMR
      const { unitPrice, deliveryFee, totalPrice } = calculateOrderPrice();

      // Resolve zone
      const allZones = await getAllZones();
      const customerLocation: LatLng = {
        lat: input.customerLat,
        lng: input.customerLng,
      };

      const zonesWithProviders = await Promise.all(
        allZones.map(async (zone) => ({
          zone,
          providers: await getAvailableProvidersByZone(zone.id),
        }))
      );

      const resolved = resolveZone(customerLocation, zonesWithProviders);

      const orderId = await createOrder({
        customerLat: input.customerLat,
        customerLng: input.customerLng,
        customerAddress: input.customerAddress ?? null,
        customerPhone: input.customerPhone ?? null,
        customerName: input.customerName ?? null,
        gasAmount: "1",
        totalPrice: String(totalPrice),
        currency: "OMR",
        estimatedMinutes: DEFAULT_ETA_MINUTES,
        zoneId: resolved?.zone.id ?? null,
        status: "draft",
        paymentStatus: "pending",
        paymentMethod: "cash",          // default: cash on delivery
        commissionAmount: String(COMMISSION_AMOUNT),
        rejectedProviderIds: null,
      });

      return {
        orderId,
        gasAmount: 1,
        unitPrice,
        deliveryFee,
        totalPrice,
        currency: "OMR",
        estimatedMinutes: DEFAULT_ETA_MINUTES,
        zoneLabel: resolved?.zone.name ?? "Muscat",
        hasProviders: (resolved?.providers.length ?? 0) > 0,
      };
    }),

  /**
   * Step 2a: Customer selects CASH payment.
   * No payment required — order goes straight to assignment.
   */
  confirmCashOrder: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order already processed" });
      }

      assertOrderTransition(order.status, "pending");

      // Cash: payment_status stays pending (collected on delivery)
      await updateOrder(order.id, {
        paymentMethod: "cash",
        paymentStatus: "pending",
        status: "pending",
      });

      // Immediately assign a provider
      await doAssignProvider(order.id);

      return { success: true, orderId: order.id };
    }),

  /**
   * Step 2b: Customer selects BANK TRANSFER.
   * Show bank details, mark pending, then assign provider.
   */
  confirmBankTransfer: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order already processed" });
      }

      assertOrderTransition(order.status, "pending");

      await updateOrder(order.id, {
        paymentMethod: "bank_transfer",
        paymentStatus: "pending",  // manual confirmation — no automation
        status: "pending",
      });

      // Assign provider immediately (payment confirmed manually later)
      await doAssignProvider(order.id);

      return {
        success: true,
        orderId: order.id,
        bankDetails: {
          bankName: "Bank Muscat",
          accountName: "Gas Delivery Muscat LLC",
          accountNumber: "0123456789",
          iban: "OM810123456789012345678",
          reference: `ORDER-${order.id}`,
        },
      };
    }),

  /**
   * Step 2c: Create a Stripe/mock payment intent for ONLINE payment.
   */
  createPaymentIntent: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order is not in draft state" });
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY;

      if (stripeKey) {
        try {
          const stripe = await import("stripe").then(
            (m) => new m.default(stripeKey)
          );
          // OMR uses 3 decimal places — amount in baisa (1 OMR = 1000 baisa)
          const amountInBaisa = Math.round(parseFloat(order.totalPrice) * 1000);
          const intent = await stripe.paymentIntents.create({
            amount: amountInBaisa,
            currency: "omr",
            metadata: { orderId: String(order.id) },
          });
          await updateOrder(order.id, {
            paymentIntentId: intent.id,
            paymentMethod: "online",
          });
          return {
            method: "stripe" as const,
            clientSecret: intent.client_secret,
            paymentIntentId: intent.id,
            totalPrice: order.totalPrice,
            currency: order.currency,
          };
        } catch (err) {
          console.error("[Stripe] Failed to create payment intent:", err);
          // Fall through to mock
        }
      }

      // Mock path
      const mockIntentId = `mock_pi_${Date.now()}_${order.id}`;
      await updateOrder(order.id, {
        paymentIntentId: mockIntentId,
        paymentMethod: "online",
      });
      return {
        method: "mock" as const,
        clientSecret: null,
        paymentIntentId: mockIntentId,
        totalPrice: order.totalPrice,
        currency: order.currency,
      };
    }),

  /**
   * Step 2d: Confirm mock/online payment and trigger provider assignment.
   */
  confirmMockPayment: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order already processed" });
      }

      assertOrderTransition(order.status, "pending");

      await updateOrder(order.id, {
        paymentMethod: "online",
        paymentStatus: "confirmed",
        status: "pending",
      });

      await doAssignProvider(order.id);

      return { success: true, orderId: order.id };
    }),

  /**
   * Stripe webhook — confirm payment from Stripe event.
   */
  confirmStripePayment: publicProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await import("../db");
      const { getDb } = db;
      const drizzleDb = await getDb();
      if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { orders: ordersTable } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const result = await drizzleDb
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.paymentIntentId, input.paymentIntentId))
        .limit(1);

      const order = result[0];
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found for payment intent" });
      if (order.paymentStatus === "confirmed") return { success: true, orderId: order.id };

      assertOrderTransition(order.status, "pending");

      await updateOrder(order.id, {
        paymentMethod: "online",
        paymentStatus: "confirmed",
        status: "pending",
      });
      await doAssignProvider(order.id);

      return { success: true, orderId: order.id };
    }),

  /**
   * Customer polling: get current order status + assignment info.
   */
  getOrderStatus: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      let providerName: string | null = null;
      let providerPhone: string | null = null;

      if (order.assignedProviderId) {
        const provider = await getProviderById(order.assignedProviderId);
        providerName = provider?.name ?? null;
        providerPhone = provider?.phone ?? null;
      }

      const assignments = await getAssignmentsByOrder(order.id);

      return {
        orderId: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        estimatedMinutes: order.estimatedMinutes,
        totalPrice: order.totalPrice,
        currency: order.currency,
        customerAddress: order.customerAddress,
        assignedProviderId: order.assignedProviderId,
        providerName,
        providerPhone,
        attemptCount: assignments.length,
        createdAt: order.createdAt,
        assignedAt: order.assignedAt,
        acceptedAt: order.acceptedAt,
        deliveredAt: order.deliveredAt,
      };
    }),
});
