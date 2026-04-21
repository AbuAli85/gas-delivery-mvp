import { TRPCError } from "@trpc/server";
import { and, eq, or } from "drizzle-orm";
import { sendSms, buildDeliveryStartedSms, buildOrderDeliveredSms } from "../sms";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { ENV } from "../_core/env";
import {
  countActiveAssignments,
  createAssignment,
  getActiveAssignment,
  getAssignmentById,
  getAssignmentsByProvider,
  getEligibleProvidersByZone,
  getProviderActiveOrders,
  countProviderActiveOrders,
  getOrderById,
  getPendingAssignmentForProvider,
  getProviderById,
  getProviderByPhone,
  setProviderActiveOrder,
  setProviderAvailability,
  updateAssignment,
  updateOrder,
  getAssignmentsByOrder,
  getAllProviders,
  getPendingProviders,
  incrementProviderScore,
  verifyProviderPin,
  createProvider,
  updateProviderStatus,
  savePushSubscription,
  upsertProviderLocation,
  getProviderLocation,
  getWorkingHours,
  getAllProvidersWorkingHours,
  upsertWorkingHoursRow,
  setProviderSubZones,
  getProviderSubZones,
  getDb,
} from "../db";
import { sendPushNotification } from "../_core/webPush";
import { selectNextProvider } from "../assignmentEngine";
import {
  assertAssignmentTransition,
  assertOrderTransition,
  MAX_CONCURRENT_ORDERS,
  calculateMultiOrderETA,
} from "../../shared/domain";

// ─── Internal: assign next provider after rejection ───────────────────────────

async function doAssignNext(orderId: number): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order || !order.zoneId) return;

  const rejectedIds: number[] = Array.isArray(order.rejectedProviderIds)
    ? (order.rejectedProviderIds as number[])
    : [];

  const available = await getEligibleProvidersByZone(order.zoneId, rejectedIds);
  // Build active orders map for proximity-based multi-order selection
  const activeOrdersByProvider = new Map<number, import("../../drizzle/schema").Order[]>();
  for (const p of available) {
    const activeOrders = await getProviderActiveOrders(p.id);
    activeOrdersByProvider.set(p.id, activeOrders);
  }
  const orderLocation = order.deliveryLat
    ? { lat: order.deliveryLat, lng: order.deliveryLng! }
    : { lat: order.customerLat, lng: order.customerLng };
  const next = selectNextProvider(available, rejectedIds, orderLocation, activeOrdersByProvider);

  if (!next) {
    // No more providers — cancel the order
    await updateOrder(orderId, { status: "cancelled" });
    return;
  }

  const allAssignments = await getAssignmentsByOrder(orderId);
  const attemptNumber = allAssignments.length + 1;

  // Recalculate ETA for the newly assigned provider
  const nextActiveOrders = activeOrdersByProvider.get(next.id) ?? [];
  const gasAmt = parseFloat(String(order.gasAmount ?? "1"));
  const newEta = calculateMultiOrderETA(nextActiveOrders.length, gasAmt);

  await createAssignment({ orderId, providerId: next.id, attemptNumber });
  // NOTE: activeOrderId is set when provider ACCEPTS (not when assigned)
  await updateOrder(orderId, {
    status: "assigned",
    assignedProviderId: next.id,
    estimatedMinutes: newEta,
  });

  // Send Web Push notification to the assigned provider
  try {
    const { getPushSubscriptionsByProvider, deletePushSubscription } = await import("../db");
    const subs = await getPushSubscriptionsByProvider(next.id);
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
      title: `Order #${orderId} Reassigned`,
      content: `Provider ${next.name} is now assigned to order #${orderId} (attempt ${attemptNumber}).`,
    });
  } catch (_) {}
}

// ─── Router ───────────────────────────────────────────────────────────────────

// ─── PIN input schema (shared across all authenticated mutations) ─────────────
// pinHash must be SHA-256 hex (64 lowercase hex chars) — the hash of exactly 4 digits
const withPin = z.object({
  providerId: z.number().int().positive(),
  pinHash: z
    .string()
    .length(64, "يجب أن يكون الرمز 4 أرقام")
    .regex(/^[0-9a-f]{64}$/, "صيغة غير صالحة"),
});

// ─── Helper: assert PIN is valid ──────────────────────────────────────────────
async function assertPin(providerId: number, pinHash: string): Promise<void> {
  const valid = await verifyProviderPin(providerId, pinHash);
  if (!valid) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "رمز غير صحيح" });
  }
}

export const providersRouter = router({
  /**
   * Verify a provider PIN. Returns { success: true } on match.
   * Frontend stores the pinHash in sessionStorage after this call.
   */
  verifyPin: publicProcedure
    .input(withPin)
    .mutation(async ({ input }) => {
      await assertPin(input.providerId, input.pinHash);
      const provider = await getProviderById(input.providerId);
      return { success: true, providerStatus: provider?.providerStatus ?? "approved" };
    }),

  /**
   * List all providers (for admin/seeding verification).
   */
  list: publicProcedure.query(async () => {
    return getAllProviders();
  }),

  /**
   * Get a single provider's profile + current state.
   */
  getById: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const provider = await getProviderById(input.providerId);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND" });
      return provider;
    }),

  /**
   * Toggle provider availability (online / offline).
   */
  toggleAvailability: publicProcedure
    .input(withPin)
    .mutation(async ({ input }) => {
      await assertPin(input.providerId, input.pinHash);
      const provider = await getProviderById(input.providerId);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND" });
      const next = !provider.isAvailable;
      await setProviderAvailability(input.providerId, next);
      return { isAvailable: next };
    }),

  /**
   * Get the current pending assignment for a provider (incoming order).
   */
  getIncomingOrder: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const assignment = await getPendingAssignmentForProvider(input.providerId);
      if (!assignment) return null;

      const order = await getOrderById(assignment.orderId);
      if (!order) return null;

      return {
        assignmentId: assignment.id,
        orderId: order.id,
        status: order.status,
        assignmentStatus: assignment.status,
        attemptNumber: assignment.attemptNumber,
        // Ordering location (where customer placed the order)
        customerLat: order.customerLat,
        customerLng: order.customerLng,
        customerAddress: order.customerAddress,
        customerPhone: order.customerPhone,
        customerName: order.customerName,
        // Delivery location (where gas must be delivered — may differ from ordering location)
        deliveryLat: order.deliveryLat ?? order.customerLat,
        deliveryLng: order.deliveryLng ?? order.customerLng,
        deliveryAddress: order.deliveryAddress ?? order.customerAddress,
        gasAmount: order.gasAmount,
        totalPrice: order.totalPrice,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        estimatedMinutes: order.estimatedMinutes,
        createdAt: order.createdAt,
        // Used by frontend to show real countdown (assignment was created at this time)
        assignmentCreatedAt: assignment.createdAt,
      };
    }),

  /**
   * Get the active (accepted) order for a provider.
   * @deprecated Use getActiveOrders instead for multi-order support.
   * Kept for backward compatibility — returns the most recent active order.
   */
  getActiveOrder: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const activeOrders = await getProviderActiveOrders(input.providerId);
      if (activeOrders.length === 0) return null;
      // Return the most recently accepted order
      const order = activeOrders.sort(
        (a, b) => new Date(b.acceptedAt ?? b.createdAt).getTime() - new Date(a.acceptedAt ?? a.createdAt).getTime()
      )[0];
      const assignment = await getActiveAssignment(order.id);
      return {
        orderId: order.id,
        assignmentId: assignment?.id ?? null,
        status: order.status,
        customerLat: order.customerLat,
        customerLng: order.customerLng,
        customerAddress: order.customerAddress,
        deliveryLat: order.deliveryLat ?? order.customerLat,
        deliveryLng: order.deliveryLng ?? order.customerLng,
        deliveryAddress: order.deliveryAddress ?? order.customerAddress,
        customerPhone: order.customerPhone,
        customerName: order.customerName,
        gasAmount: order.gasAmount,
        totalPrice: order.totalPrice,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        estimatedMinutes: order.estimatedMinutes,
        acceptedAt: order.acceptedAt,
        createdAt: order.createdAt,
      };
    }),

  /**
   * Get ALL active orders for a provider (multi-order support).
   * Returns an array of accepted/out_for_delivery orders sorted by acceptance time.
   */
  getActiveOrders: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const activeOrders = await getProviderActiveOrders(input.providerId);
      if (activeOrders.length === 0) return [];
      const sorted = activeOrders.sort(
        (a, b) => new Date(a.acceptedAt ?? a.createdAt).getTime() - new Date(b.acceptedAt ?? b.createdAt).getTime()
      );
      return Promise.all(
        sorted.map(async (order) => {
          const assignment = await getActiveAssignment(order.id);
          return {
            orderId: order.id,
            assignmentId: assignment?.id ?? null,
            status: order.status,
            customerLat: order.customerLat,
            customerLng: order.customerLng,
            customerAddress: order.customerAddress,
            deliveryLat: order.deliveryLat ?? order.customerLat,
            deliveryLng: order.deliveryLng ?? order.customerLng,
            deliveryAddress: order.deliveryAddress ?? order.customerAddress,
            customerPhone: order.customerPhone,
            customerName: order.customerName,
            gasAmount: order.gasAmount,
            totalPrice: order.totalPrice,
            currency: order.currency,
            paymentMethod: order.paymentMethod,
            estimatedMinutes: order.estimatedMinutes,
            acceptedAt: order.acceptedAt,
            createdAt: order.createdAt,
          };
        })
      );
    }),

  /**
   * Provider accepts an order.
   * Invariant: only one active assignment per order at a time.
   */
  acceptOrder: publicProcedure
    .input(z.object({ assignmentId: z.number(), providerId: z.number(), pinHash: z.string() }))
    .mutation(async ({ input }) => {
      await assertPin(input.providerId, input.pinHash);
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "التكليف غير موجود" });
      if (assignment.providerId !== input.providerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "هذا التكليف يخص مزوداً آخر" });
      }

      assertAssignmentTransition(assignment.status, "accepted");

      // Guard: only one active assignment per order
      const activeCount = await countActiveAssignments(assignment.orderId);
      if (activeCount > 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "يوجد تكليف آخر نشط لهذا الطلب بالفعل",
        });
      }

      const order = await getOrderById(assignment.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      assertOrderTransition(order.status, "accepted");

      await updateAssignment(input.assignmentId, {
        status: "accepted",
        respondedAt: new Date(),
      });

      await updateOrder(order.id, {
        status: "accepted",
        acceptedAt: new Date(),
      });

      // Set activeOrderId NOW (when provider accepts, not when assigned)
      await setProviderActiveOrder(input.providerId, order.id);

      // Increment provider score
      try { await incrementProviderScore(input.providerId, "accepted"); } catch (_) {}

      // Notify customer (via owner notification for MVP)
      try {
        await notifyOwner({
          title: `Order #${order.id} Accepted`,
          content: `Gas delivery #${order.id} accepted by provider ${input.providerId}. ETA: ${order.estimatedMinutes} min.`,
        });
      } catch (_) {}

      return { success: true, orderId: order.id };
    }),

  /**
   * Provider rejects an order.
   * Triggers auto-reassignment to the next eligible provider.
   */
  rejectOrder: publicProcedure
    .input(z.object({ assignmentId: z.number(), providerId: z.number(), pinHash: z.string() }))
    .mutation(async ({ input }) => {
      await assertPin(input.providerId, input.pinHash);
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "التكليف غير موجود" });
      if (assignment.providerId !== input.providerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "هذا التكليف يخص مزوداً آخر" });
      }

      assertAssignmentTransition(assignment.status, "rejected");

      const order = await getOrderById(assignment.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      // Mark assignment rejected
      await updateAssignment(input.assignmentId, {
        status: "rejected",
        respondedAt: new Date(),
      });

      // Increment rejection score
      try { await incrementProviderScore(input.providerId, "rejected"); } catch (_) {}

      // Only clear activeOrderId if this provider had actually accepted this order
      // (setProviderActiveOrder is only set on acceptOrder, not on assignment)
      const provider = await getProviderById(input.providerId);
      if (provider?.activeOrderId === order.id) {
        await setProviderActiveOrder(input.providerId, null);
      }

      // Add to rejected list
      const currentRejected: number[] = Array.isArray(order.rejectedProviderIds)
        ? (order.rejectedProviderIds as number[])
        : [];
      const updatedRejected = Array.from(new Set([...currentRejected, input.providerId]));

      await updateOrder(order.id, {
        status: "pending",
        assignedProviderId: null,
        rejectedProviderIds: updatedRejected as unknown as null,
      });

      // Auto-assign next provider
      await doAssignNext(order.id);

      return { success: true, orderId: order.id };
    }),

  /**
   * Provider marks order as out for delivery.
   */
  startDelivery: publicProcedure
    .input(z.object({ orderId: z.number(), providerId: z.number(), pinHash: z.string() }))
    .mutation(async ({ input }) => {
      await assertPin(input.providerId, input.pinHash);
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (order.assignedProviderId !== input.providerId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      assertOrderTransition(order.status, "out_for_delivery");
      await updateOrder(order.id, { status: "out_for_delivery" });

      // ── SMS: notify customer that delivery has started ─────────────────
      if (order.customerPhone) {
        const provider = await getProviderById(input.providerId);
        const smsBody = buildDeliveryStartedSms({
          customerName: order.customerName ?? "عزيزي العميل",
          providerName: provider?.name ?? "المزود",
          providerPhone: provider?.phone ?? "",
          estimatedMinutes: order.estimatedMinutes,
          orderId: order.id,
          gasAmount: String(order.gasAmount ?? 1),
        });
        sendSms(order.customerPhone, smsBody)
          .then(async (result) => {
            await updateOrder(order.id, {
              smsDeliveryStartedAt: new Date(),
              ...(result.sid ? { smsSid: result.sid } : {}),
            });
          })
          .catch(err => console.error("[SMS] Failed to send delivery-started SMS:", err));
      }

      return { success: true };
    }),

  /**
   * Provider marks order as delivered.
   */
  deliverOrder: publicProcedure
    .input(z.object({ orderId: z.number(), providerId: z.number(), pinHash: z.string(), providerNote: z.string().max(500).optional() }))
    .mutation(async ({ input }) => {
      await assertPin(input.providerId, input.pinHash);
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (order.assignedProviderId !== input.providerId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      assertOrderTransition(order.status, "delivered");

      await updateOrder(order.id, {
        status: "delivered",
        deliveredAt: new Date(),
        ...(input.providerNote ? { providerNote: input.providerNote } : {}),
      });

      // Free the provider
      await setProviderActiveOrder(input.providerId, null);

      // Mark assignment as completed
      const assignment = await getActiveAssignment(order.id);
      if (assignment) {
        await updateAssignment(assignment.id, { status: "completed", respondedAt: new Date() });
      }

      // Increment delivered score + commission
      const commissionAmt = parseFloat(String(order.commissionAmount ?? "0.100"));
      try { await incrementProviderScore(input.providerId, "delivered", commissionAmt); } catch (_) {}

      // Update commission status on order
      try {
        await updateOrder(order.id, { providerCommissionStatus: "pending_settlement" });
      } catch (_) {}

      try {
        await notifyOwner({
          title: `Order #${order.id} Delivered ✓`,
          content: `Gas delivery #${order.id} completed. Commission: OMR ${commissionAmt.toFixed(3)} pending settlement.`,
        });
      } catch (_) {}

      // ── SMS: notify customer that order was delivered ─────────────────
      if (order.customerPhone) {
        const deliveredSmsBody = buildOrderDeliveredSms({
          customerName: order.customerName ?? "عزيزي العميل",
          orderId: order.id,
          totalPrice: String(order.totalPrice ?? "0"),
          paymentMethod: order.paymentMethod ?? "cash",
        });
        sendSms(order.customerPhone, deliveredSmsBody)
          .then(async (result) => {
            await updateOrder(order.id, {
              smsDeliveredAt: new Date(),
              ...(result.sid ? { smsSid: result.sid } : {}),
            });
          })
          .catch(err => console.error("[SMS] Failed to send order-delivered SMS:", err));
      }

      return { success: true };
    }),

  /**
   * Get order history for a provider.
   */
  getOrderHistory: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const assignments = await getAssignmentsByProvider(input.providerId);
      const orderIds = Array.from(new Set(assignments.map((a) => a.orderId)));

      const orderDetails = await Promise.all(
        orderIds.map(async (id) => {
          const order = await getOrderById(id);
          const assignment = assignments.find((a) => a.orderId === id);
          return order
            ? {
                orderId: order.id,
                status: order.status,
                assignmentStatus: assignment?.status,
                totalPrice: order.totalPrice,
                currency: order.currency,
                customerAddress: order.customerAddress,
                deliveryAddress: order.deliveryAddress,
                gasAmount: order.gasAmount,
                paymentMethod: order.paymentMethod,
                createdAt: order.createdAt,
                deliveredAt: order.deliveredAt,
              }
            : null;
        })
      );

      return orderDetails.filter(Boolean).sort(
        (a, b) =>
          new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime()
      );
    }),

  /**
   * Self-registration: a new provider submits their details.
   * Creates a provider with providerStatus = 'pending_review'.
   */
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(128),
        phone: z.string().min(8).max(32),
        email: z.string().email().optional(),
        zoneId: z.number().int().positive(),
        // Sub-zones the provider covers (optional — can be set later)
        subZoneIds: z.array(z.number().int().positive()).optional(),
        pinHash: z.string().length(64), // SHA-256 hex
        vehicleType: z.string().max(64).optional(),
        vehiclePlate: z.string().max(32).optional(),
        nationalId: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Prevent duplicate registrations by phone
      const existing = await getProviderByPhone(input.phone);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "هذا الرقم مسجّل مسبقاً. يمكنك تتبع حالة طلبك باستخدام رقم هاتفك والرمز السري.",
        });
      }
      const providerId = await createProvider({
        name: input.name,
        phone: input.phone,
        email: input.email,
        zoneId: input.zoneId,
        pinHash: input.pinHash,
        vehicleType: input.vehicleType,
        vehiclePlate: input.vehiclePlate,
        nationalId: input.nationalId,
        adminCreated: false,
      });
      // Save sub-zone coverage if provided
      if (input.subZoneIds && input.subZoneIds.length > 0) {
        await setProviderSubZones(providerId, input.subZoneIds);
      }
      // Notify owner of new registration
      const subZoneNote = input.subZoneIds?.length
        ? `\nالأحياء: ${input.subZoneIds.join(', ')}`
        : '';
      try {
        await notifyOwner({
          title: `طلب انضمام جديد — ${input.name}`,
          content: `مزود جديد يطلب الانضمام:\nالاسم: ${input.name}\nالهاتف: ${input.phone}\nالمنطقة: ${input.zoneId}${subZoneNote}\nالسيارة: ${input.vehicleType ?? 'غير محدد'}\nرقم اللوحة: ${input.vehiclePlate ?? 'غير محدد'}`,
        });
      } catch (_) {}
      return { providerId, status: "pending_review" as const };
    }),

  /**
   * Check registration status by phone + PIN.
   * Used on the onboarding page to poll for approval.
   */
  getStatus: publicProcedure
    .input(z.object({ phone: z.string(), pinHash: z.string() }))
    .query(async ({ input }) => {
      const provider = await getProviderByPhone(input.phone);
      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND", message: "لم يُعثر على طلب التسجيل بهذا الرقم." });
      }
      if (provider.pinHash !== input.pinHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "الرمز السري غير صحيح." });
      }
      return {
        providerId: provider.id,
        name: provider.name,
        providerStatus: provider.providerStatus,
        rejectionReason: provider.rejectionReason ?? null,
        zoneId: provider.zoneId,
      };
    }),

  /**
   * Admin: list providers pending review.
   * Gated by OWNER_OPEN_ID env check (owner-only).
   */
  listPending: publicProcedure
    .input(z.object({ ownerKey: z.string() }))
    .query(async ({ input }) => {
      if (input.ownerKey !== ENV.ownerOpenId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح لك بهذا الإجراء." });
      }
      return getPendingProviders();
    }),

  /**
   * Admin: approve a pending provider.
   */
  approve: publicProcedure
    .input(z.object({ ownerKey: z.string(), providerId: z.number() }))
    .mutation(async ({ input }) => {
      if (input.ownerKey !== ENV.ownerOpenId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح لك بهذا الإجراء." });
      }
      const provider = await getProviderById(input.providerId);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND" });
      await updateProviderStatus(input.providerId, "approved");
      try {
        await notifyOwner({
          title: `تمت موافقة المزود ${provider.name}`,
          content: `تم قبول طلب انضمام ${provider.name} (هاتف: ${provider.phone}).`,
        });
      } catch (_) {}
      return { success: true };
    }),

  /**
   * Admin: reject a pending provider with a reason.
   */
  reject: publicProcedure
    .input(z.object({ ownerKey: z.string(), providerId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      if (input.ownerKey !== ENV.ownerOpenId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح لك بهذا الإجراء." });
      }
      const provider = await getProviderById(input.providerId);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND" });
      await updateProviderStatus(input.providerId, "rejected", input.reason);
      return { success: true };
    }),

  /**
   * Admin: list ALL providers (any status) with sub-zone names.
   * Gated by ADMIN_PIN.
   */
  adminListAll: publicProcedure
    .input(z.object({ adminPin: z.string() }))
    .query(async ({ input }) => {
      if (input.adminPin !== (process.env.ADMIN_PIN ?? "1234")) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "رمز الإدارة غير صحيح." });
      }
      const allProviders = await getAllProviders();
      const enriched = await Promise.all(
        allProviders.map(async (p) => {
          const subZones = await getProviderSubZones(p.id);
          return { ...p, subZoneNames: subZones.map((sz) => sz.name) };
        })
      );
      return enriched;
    }),

  /**
   * Admin: approve a pending provider (PIN-gated).
   */
  adminApprove: publicProcedure
    .input(z.object({ adminPin: z.string(), providerId: z.number() }))
    .mutation(async ({ input }) => {
      if (input.adminPin !== (process.env.ADMIN_PIN ?? "1234")) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "رمز الإدارة غير صحيح." });
      }
      const provider = await getProviderById(input.providerId);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND" });
      await updateProviderStatus(input.providerId, "approved");
      try {
        await notifyOwner({
          title: `تمت موافقة المزود ${provider.name}`,
          content: `تم قبول طلب انضمام ${provider.name} (هاتف: ${provider.phone}).`,
        });
      } catch (_) {}
      return { success: true };
    }),

  /**
   * Admin: reject a pending provider (PIN-gated).
   */
  adminReject: publicProcedure
    .input(z.object({ adminPin: z.string(), providerId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      if (input.adminPin !== (process.env.ADMIN_PIN ?? "1234")) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "رمز الإدارة غير صحيح." });
      }
      const provider = await getProviderById(input.providerId);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND" });
      await updateProviderStatus(input.providerId, "rejected", input.reason);
      return { success: true };
    }),

  /**
   * Get VAPID public key for push subscription.
   */
  getVapidPublicKey: publicProcedure.query(() => {
    return { publicKey: ENV.vapidPublicKey };
  }),

  /**
   * Save/update provider's Web Push subscription.
   */
  savePushSubscription: publicProcedure
    .input(z.object({
      providerId: z.number(),
      pinHash: z.string(),
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string(),
    }))
    .mutation(async ({ input }) => {
      const provider = await getProviderById(input.providerId);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "المزود غير موجود" });
      const valid = await verifyProviderPin(input.providerId, input.pinHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "رمز PIN غير صحيح" });
      await savePushSubscription({
        providerId: input.providerId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      });
      return { success: true };
    }),

  /**
   * Provider: update their GPS location (called every ~10s while delivering).
   */
  updateLocation: publicProcedure
    .input(z.object({
      providerId: z.number(),
      pinHash: z.string(),
      lat: z.number(),
      lng: z.number(),
    }))
    .mutation(async ({ input }) => {
      const valid = await verifyProviderPin(input.providerId, input.pinHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "رمز PIN غير صحيح" });
      await upsertProviderLocation(input.providerId, input.lat, input.lng);
      return { success: true };
    }),

  /**
   * Customer: get provider location for a given order (live tracking).
   */
  getLocationForOrder: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      if (!order || !order.assignedProviderId) return null;
      if (order.status !== "out_for_delivery" && order.status !== "accepted") return null;
      const loc = await getProviderLocation(order.assignedProviderId);
      if (!loc) return null;
      return { lat: loc.lat, lng: loc.lng, updatedAt: loc.updatedAt };
    }),

  /** Provider: get working hours schedule. */
  getWorkingHours: publicProcedure
    .input(z.object({ providerId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return await getWorkingHours(input.providerId);
    }),

  /** Provider: set/update working hours (PIN-protected). */
  setWorkingHours: publicProcedure
    .input(z.object({
      providerId: z.number().int().positive(),
      pinHash: z.string(),
      schedule: z.array(z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        openTime: z.string().regex(/^\d{2}:\d{2}$/),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/),
        isActive: z.boolean(),
      })),
    }))
    .mutation(async ({ input }) => {
      const valid = await verifyProviderPin(input.providerId, input.pinHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "رمز PIN غير صحيح" });
      for (const row of input.schedule) {
        await upsertWorkingHoursRow({
          providerId: input.providerId,
          dayOfWeek: row.dayOfWeek,
          openTime: row.openTime,
          closeTime: row.closeTime,
          isActive: row.isActive,
        });
      }
      return { success: true };
    }),

  /** Public: get service open/closed status based on all providers' working hours. */
  getServiceStatus: publicProcedure
    .query(async () => {
      const allHours = await getAllProvidersWorkingHours();
      const now = new Date();
      // Gulf Standard Time = UTC+4
      const gstOffset = 4 * 60;
      const localMs = now.getTime() + (gstOffset - now.getTimezoneOffset()) * 60000;
      const local = new Date(localMs);
      const dayOfWeek = local.getDay();
      const currentTime = `${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`;

      const todayRows = allHours.filter(h => h.dayOfWeek === dayOfWeek && h.isActive);
      const isOpen = todayRows.some(h => currentTime >= h.openTime && currentTime < h.closeTime);

      let nextOpenLabel: string | null = null;
      if (!isOpen) {
        const laterToday = todayRows.filter(h => currentTime < h.openTime);
        if (laterToday.length > 0) {
          const earliest = laterToday.sort((a, b) => a.openTime.localeCompare(b.openTime))[0];
          nextOpenLabel = `اليوم الساعة ${earliest.openTime}`;
        } else {
          for (let d = 1; d <= 7; d++) {
            const nextDay = (dayOfWeek + d) % 7;
            const nextRows = allHours.filter(h => h.dayOfWeek === nextDay && h.isActive);
            if (nextRows.length > 0) {
              const earliest = nextRows.sort((a, b) => a.openTime.localeCompare(b.openTime))[0];
              const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
              nextOpenLabel = d === 1
                ? `غداً الساعة ${earliest.openTime}`
                : `${DAY_NAMES[nextDay]} الساعة ${earliest.openTime}`;
              break;
            }
          }
        }
      }

      return { isOpen, nextOpenLabel, currentTime, dayOfWeek };
    }),

  /**
   * Real-time map data for a provider:
   * - Provider's own current location
   * - Provider's active orders (accepted / out_for_delivery) with delivery coords
   * - All pending/assigned orders in the same zone (for situational awareness)
   */
  getMapData: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const { providerId } = input;
      const provider = await getProviderById(providerId);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "المزود غير موجود" });

      const providerLoc = await getProviderLocation(providerId);
      const myActiveOrders = await getProviderActiveOrders(providerId);

      // All pending/assigned orders in the same zone for situational awareness
      const db = await getDb();
      const { orders: ordersTable } = await import("../../drizzle/schema");
      const zoneOrders = db && provider.zoneId ? await db
        .select()
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.zoneId, provider.zoneId),
            or(
              eq(ordersTable.status, "pending"),
              eq(ordersTable.status, "assigned")
            )
          )
        )
        .limit(50) : [];

      return {
        providerLocation: providerLoc
          ? { lat: providerLoc.lat, lng: providerLoc.lng, updatedAt: providerLoc.updatedAt }
          : null,
        myActiveOrders: myActiveOrders.map(o => ({
          orderId: o.id,
          status: o.status as string,
          deliveryLat: o.deliveryLat ?? o.customerLat,
          deliveryLng: o.deliveryLng ?? o.customerLng,
          deliveryAddress: o.deliveryAddress ?? o.customerAddress,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          gasAmount: o.gasAmount,
          totalPrice: o.totalPrice,
          estimatedMinutes: o.estimatedMinutes,
          paymentMethod: o.paymentMethod,
        })),
        zoneOrders: zoneOrders.map(o => ({
          orderId: o.id,
          status: o.status as string,
          deliveryLat: o.deliveryLat ?? o.customerLat,
          deliveryLng: o.deliveryLng ?? o.customerLng,
          deliveryAddress: o.deliveryAddress ?? o.customerAddress,
          gasAmount: o.gasAmount,
        })),
      };
    }),
});
