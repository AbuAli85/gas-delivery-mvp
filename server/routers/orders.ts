import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import {
  createAssignment,
  createOrder,
  getAllZones,
  getAllSubZones,
  getActiveAssignment,
  getAssignmentsByOrder,
  getEligibleProvidersByZone,
  getEligibleProvidersBySubZone,
  countAvailableProvidersBySubZone,
  getProviderActiveOrders,
  countProviderActiveOrders,
  getOrderById,
  setProviderActiveOrder,
  updateAssignment,
  updateOrder,
  countActiveAssignments,
  getProviderById,
  getAllOrders,
  countOrders,
} from "../db";
import { resolveZone, resolveSubZone, selectNextProvider } from "../assignmentEngine";
import {
  assertOrderTransition,
  FIXED_ORDER_PRICE,
  COMMISSION_AMOUNT,
  DEFAULT_ETA_MINUTES,
  MAX_CYLINDERS_PER_ORDER,
  LatLng,
  calculateOrderPrice,
  calculateMultiOrderETA,
} from "../../shared/domain";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function doAssignProvider(orderId: number): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
  const rejectedIds: number[] = Array.isArray(order.rejectedProviderIds)
    ? (order.rejectedProviderIds as number[])
    : [];
  if (!order.zoneId) {
    await updateOrder(orderId, { status: "cancelled" });
    throw new TRPCError({ code: "BAD_REQUEST", message: "لم يتم تحديد منطقة للطلب" });
  }

  // Delivery location for proximity check
  const newOrderLocation: LatLng = {
    lat: order.deliveryLat ?? order.customerLat,
    lng: order.deliveryLng ?? order.customerLng,
  };

  // Use getEligibleProvidersByZone which includes busy-but-eligible providers
  const eligible = await getEligibleProvidersByZone(order.zoneId, rejectedIds);

  // Build active orders map for proximity check
  const activeOrdersByProvider = new Map<number, import("../../drizzle/schema").Order[]>();
  for (const p of eligible) {
    const activeOrders = await getProviderActiveOrders(p.id);
    activeOrdersByProvider.set(p.id, activeOrders);
  }

  const provider = selectNextProvider(eligible, rejectedIds, newOrderLocation, activeOrdersByProvider);
  if (!provider) {
    await updateOrder(orderId, { status: "cancelled" });
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "لا يوجد مزودون متاحون في منطقتك",
    });
  }

  // Calculate ETA based on provider's current active order count
  const providerActiveCount = (activeOrdersByProvider.get(provider.id) ?? []).length;
  const gasAmount = parseFloat(String(order.gasAmount ?? "1"));
  const estimatedMinutes = calculateMultiOrderETA(providerActiveCount, gasAmount);

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
  // NOTE: setProviderActiveOrder is kept for backward compat but multi-order uses getProviderActiveOrders
  await setProviderActiveOrder(provider.id, orderId);
  // Anti-cheat: record assignedAt timestamp + update ETA
  await updateOrder(orderId, {
    status: "assigned",
    assignedProviderId: provider.id,
    assignedAt: new Date(),
    estimatedMinutes,
  });

  // Send Web Push notification to the assigned provider
  try {
    const { getPushSubscriptionsByProvider, deletePushSubscription } = await import("../db");
    const { sendPushNotification } = await import("../_core/webPush");
    const subs = await getPushSubscriptionsByProvider(provider.id);
    for (const sub of subs) {
      const ok = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        { title: "طلب جديد!", body: `طلب رقم #${orderId} بانتظارك. افتح التطبيق للقبول أو الرفض.`, tag: `order-${orderId}` }
      );
      if (!ok) await deletePushSubscription(sub.endpoint);
    }
  } catch (_) {}

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
        // Ordering location — where the customer is (analytics only)
        customerLat: z.number(),
        customerLng: z.number(),
        customerAddress: z.string().optional(),
        customerPhone: z.string().optional(),
        customerName: z.string().optional(),
        // Delivery location — where the gas should be delivered.
        // If omitted, falls back to customerLat/Lng for zone resolution.
        deliveryLat: z.number().optional(),
        deliveryLng: z.number().optional(),
        deliveryAddress: z.string().optional(),
        // gasAmount: number of cylinders (1–10)
        gasAmount: z.number().int().min(1).max(10).default(1),
      })
    )
    .mutation(async ({ input }) => {
      // Price = gasAmount × 3.300 OMR per cylinder
      const { unitPrice, deliveryFee, totalPrice } = calculateOrderPrice(input.gasAmount);

      // Zone resolution MUST use deliveryLat/Lng when provided.
      // Falls back to customerLat/Lng (ordering location) when delivery location is absent.
      const resolutionLat = input.deliveryLat ?? input.customerLat;
      const resolutionLng = input.deliveryLng ?? input.customerLng;
      const deliveryLocation: LatLng = { lat: resolutionLat, lng: resolutionLng };

      const allZones = await getAllZones();
      const allSubZones = await getAllSubZones();
      const zonesWithProviders = await Promise.all(
        allZones.map(async (zone) => ({
          zone,
          providers: await getEligibleProvidersByZone(zone.id),
        }))
      );

      const resolved = resolveZone(deliveryLocation, zonesWithProviders);

      // Sub-zone resolution: find the most specific neighborhood
      const resolvedSubZone = resolveSubZone(
        deliveryLocation,
        allSubZones.filter((sz) => sz.zoneId === (resolved?.zone.id ?? -1))
      );

      // Provider count: prefer sub-zone count, fall back to parent zone count
      let subZoneProviderCount = 0;
      if (resolvedSubZone) {
        subZoneProviderCount = await countAvailableProvidersBySubZone(resolvedSubZone.id);
      }
      const hasSubZoneProviders = resolvedSubZone ? subZoneProviderCount > 0 : null;
      // hasProviders = true if sub-zone has providers, OR if no sub-zone but parent zone has providers
      const hasProviders =
        resolvedSubZone !== null
          ? subZoneProviderCount > 0
          : (resolved?.providers.length ?? 0) > 0;

      const orderId = await createOrder({
        customerLat: input.customerLat,
        customerLng: input.customerLng,
        customerAddress: input.customerAddress ?? null,
        customerPhone: input.customerPhone ?? null,
        customerName: input.customerName ?? null,
        // Delivery location fields
        deliveryLat: input.deliveryLat ?? null,
        deliveryLng: input.deliveryLng ?? null,
        deliveryAddress: input.deliveryAddress ?? input.customerAddress ?? null,
        gasAmount: String(input.gasAmount),
        totalPrice: String(totalPrice),
        currency: "OMR",
        estimatedMinutes: DEFAULT_ETA_MINUTES,
        zoneId: resolved?.zone.id ?? null,
        subZoneId: resolvedSubZone?.id ?? null,
        status: "draft",
        paymentStatus: "pending",
        paymentMethod: "cash",          // default: cash on delivery
        commissionAmount: String(COMMISSION_AMOUNT),
        rejectedProviderIds: null,
      });

      return {
        orderId,
        gasAmount: input.gasAmount,
        unitPrice,
        deliveryFee,
        totalPrice,
        currency: "OMR",
        estimatedMinutes: DEFAULT_ETA_MINUTES,
        // Only set when the pin lies inside a zone polygon — matches delivery coords.
        zoneLabel: resolved?.zone.name ?? "",
        // Sub-zone (wilayat/neighborhood) — more precise than zone
        subZoneLabel: resolvedSubZone?.name ?? null,
        subZoneProviderCount: resolvedSubZone ? subZoneProviderCount : null,
        hasProviders,
        hasSubZoneProviders,
        // Echo back the resolved delivery location
        deliveryLat: input.deliveryLat ?? input.customerLat,
        deliveryLng: input.deliveryLng ?? input.customerLng,
        deliveryAddress: input.deliveryAddress ?? input.customerAddress ?? null,
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
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      if (order.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "تمت معالجة الطلب مسبقاً" });
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
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      if (order.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "تمت معالجة الطلب مسبقاً" });
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
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      if (order.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الطلب ليس في حالة مسودة" });
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
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      if (order.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "تمت معالجة الطلب مسبقاً" });
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
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود لهذه العملية" });
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
   * Customer cancels an order.
   * Allowed from: draft, pending, assigned.
   * Frees the provider if one was assigned.
   */
  cancelOrder: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      const cancellable = ["draft", "pending", "assigned"];
      if (!cancellable.includes(order.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `لا يمكن إلغاء الطلب في الحالة '${order.status}'`,
        });
      }

      // Free the assigned provider
      if (order.assignedProviderId) {
        await setProviderActiveOrder(order.assignedProviderId, null);
      }

      // Expire any pending assignment
      const activeAssignment = await getActiveAssignment(order.id);
      if (activeAssignment && activeAssignment.status === "pending") {
        await updateAssignment(activeAssignment.id, {
          status: "expired",
          respondedAt: new Date(),
        });
      }

      await updateOrder(order.id, {
        status: "cancelled",
        assignedProviderId: null,
      });

      return { success: true, orderId: order.id };
    }),

  /**
   * Customer polling: get current order status + assignment info.
   * Also checks for expired assignments (provider offline > 5 min) and auto-reassigns.
   */
  getOrderStatus: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      // ── Assignment expiry check (Fix 4) ──────────────────────────────────────
      // If order is in 'assigned' state and the active assignment has been pending
      // for > 5 minutes with no response, expire it and try the next provider.
      if (order.status === "assigned") {
        const activeAssignment = await getActiveAssignment(order.id);
        if (activeAssignment && activeAssignment.status === "pending") {
          const ageMs = Date.now() - new Date(activeAssignment.createdAt).getTime();
          const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
          if (ageMs > EXPIRY_MS) {
            // Expire this assignment
            await updateAssignment(activeAssignment.id, {
              status: "expired",
              respondedAt: new Date(),
            });
            // Free the provider
            await setProviderActiveOrder(activeAssignment.providerId, null);
            // Add to rejected list so they don't get re-assigned
            const currentRejected: number[] = Array.isArray(order.rejectedProviderIds)
              ? (order.rejectedProviderIds as number[])
              : [];
            const updatedRejected = Array.from(new Set([...currentRejected, activeAssignment.providerId]));
            await updateOrder(order.id, {
              status: "pending",
              assignedProviderId: null,
              rejectedProviderIds: updatedRejected as unknown as null,
            });
            // Try next provider (non-blocking — if no providers, order stays pending)
            try {
              await doAssignProvider(order.id);
            } catch (_) {
              // No providers available — order stays pending/cancelled
            }
            // Re-fetch order after reassignment
            const refreshed = await getOrderById(order.id);
            if (refreshed) Object.assign(order, refreshed);
          }
        }
      }

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
        status: order.status as string,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        estimatedMinutes: order.estimatedMinutes,
        totalPrice: order.totalPrice,
        gasAmount: order.gasAmount,
        currency: order.currency,
        // Ordering location (where customer was)
        customerAddress: order.customerAddress,
        customerLat: order.customerLat,
        customerLng: order.customerLng,
        // Delivery location (where gas should be delivered)
        deliveryAddress: order.deliveryAddress ?? order.customerAddress,
        deliveryLat: order.deliveryLat ?? order.customerLat,
        deliveryLng: order.deliveryLng ?? order.customerLng,
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

  // ─── Admin: List all orders ───────────────────────────────────────────────
  adminListOrders: publicProcedure
    .input(z.object({
      adminPin: z.string(),
      status: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      if (input.adminPin !== (process.env.ADMIN_PIN ?? "1234")) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة مرور المشرف غير صحيحة" });
      }
      const rows = await getAllOrders({ status: input.status, limit: input.limit, offset: input.offset });
      const total = await countOrders(input.status);
      return {
        orders: rows.map((o) => ({
          id: o.id,
          status: o.status,
          paymentStatus: o.paymentStatus,
          paymentMethod: o.paymentMethod,
          totalPrice: o.totalPrice,
          gasAmount: o.gasAmount,
          estimatedMinutes: o.estimatedMinutes,
          // Ordering location
          customerAddress: o.customerAddress,
          customerPhone: o.customerPhone,
          customerName: o.customerName,
          // Delivery location (where gas is delivered)
          deliveryAddress: o.deliveryAddress ?? o.customerAddress,
          deliveryLat: o.deliveryLat ?? o.customerLat,
          deliveryLng: o.deliveryLng ?? o.customerLng,
          assignedProviderId: o.assignedProviderId,
          createdAt: o.createdAt,
          acceptedAt: o.acceptedAt,
          deliveredAt: o.deliveredAt,
        })),
        total,
      };
    }),

  // ─── Admin: Force-cancel an order ────────────────────────────────────────
  adminCancelOrder: publicProcedure
    .input(z.object({ adminPin: z.string(), orderId: z.number() }))
    .mutation(async ({ input }) => {
      if (input.adminPin !== (process.env.ADMIN_PIN ?? "1234")) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة مرور المشرف غير صحيحة" });
      }
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      if (order.status === "delivered" || order.status === "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن إلغاء هذا الطلب" });
      }
      // Free the assigned provider if any
      if (order.assignedProviderId) {
        await setProviderActiveOrder(order.assignedProviderId, null);
      }
      await updateOrder(order.id, { status: "cancelled" });
      return { success: true };
    }),

  // ─── Admin: Mark order as delivered (manual override) ────────────────────
  adminMarkDelivered: publicProcedure
    .input(z.object({ adminPin: z.string(), orderId: z.number() }))
    .mutation(async ({ input }) => {
      if (input.adminPin !== (process.env.ADMIN_PIN ?? "1234")) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة مرور المشرف غير صحيحة" });
      }
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      if (order.assignedProviderId) {
        await setProviderActiveOrder(order.assignedProviderId, null);
      }
      await updateOrder(order.id, { status: "delivered", deliveredAt: new Date() });
      return { success: true };
    }),

  // ─── Admin: Stats summary ─────────────────────────────────────────────────
  adminStats: publicProcedure
    .input(z.object({ adminPin: z.string() }))
    .query(async ({ input }) => {
      if (input.adminPin !== (process.env.ADMIN_PIN ?? "1234")) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة مرور المشرف غير صحيحة" });
      }
      const all = await getAllOrders();
      const total = all.length;
      const delivered = all.filter((o) => o.status === "delivered").length;
      const cancelled = all.filter((o) => o.status === "cancelled").length;
      const pending = all.filter((o) => ["pending", "assigned", "accepted", "out_for_delivery"].includes(o.status)).length;
      const revenue = all
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + parseFloat(String(o.totalPrice ?? "0")), 0);
      return { total, delivered, cancelled, pending, revenue };
    }),
});
// Zone coverage updated: Mon Apr 20 14:24:05 EDT 2026
