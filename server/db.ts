import { and, desc, eq, inArray, isNull, ne, notInArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  Order,
  OrderAssignment,
  Provider,
  SavedLocation,
  Zone,
  orderAssignments,
  orders,
  providers,
  savedLocations,
  users,
  zones,
  pushSubscriptions,
  customerSessions,
  providerLocations,
  type PushSubscription,
  type InsertPushSubscription,
  type CustomerSession,
  type InsertCustomerSession,
  type ProviderLocation,
  providerWorkingHours,
  type ProviderWorkingHours,
  orderReviews,
  type OrderReview,
  type InsertOrderReview,
  subZones,
  providerSubZones,
  type SubZone,
  type InsertSubZone,
  type ProviderSubZone,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "phone"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    (values as Record<string, unknown>)[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? undefined;
}

// ─── Zones ────────────────────────────────────────────────────────────────────

export async function getAllZones(): Promise<Zone[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(zones).where(eq(zones.isActive, true));
}

export async function getZoneById(id: number): Promise<Zone | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(zones).where(eq(zones.id, id)).limit(1);
  return result[0] ?? undefined;
}

// ─── Providers ────────────────────────────────────────────────────────────────

export async function getProviderById(id: number): Promise<Provider | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(providers).where(eq(providers.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getAvailableProvidersByZone(
  zoneId: number,
  excludeProviderIds: number[] = []
): Promise<Provider[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(providers.zoneId, zoneId),
    eq(providers.isAvailable, true),
    isNull(providers.activeOrderId),
  ];

  if (excludeProviderIds.length > 0) {
    conditions.push(notInArray(providers.id, excludeProviderIds));
  }

  return db.select().from(providers).where(and(...conditions));
}

export async function getAllProviders(): Promise<Provider[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(providers);
}

export async function setProviderActiveOrder(
  providerId: number,
  orderId: number | null
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(providers)
    .set({ activeOrderId: orderId })
    .where(eq(providers.id, providerId));
}

export async function setProviderAvailability(
  providerId: number,
  isAvailable: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(providers)
    .set({ isAvailable })
    .where(eq(providers.id, providerId));
}

/**
 * Increment provider score counters after accept/reject/deliver.
 * @param accepted - true = increment acceptedOrders + totalOrders
 * @param rejected - true = increment rejectedOrders + totalOrders
 * @param delivered - true = increment totalOrders + totalCommission
 */
export async function incrementProviderScore(
  providerId: number,
  event: "accepted" | "rejected" | "delivered",
  commissionAmount?: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const provider = await getProviderById(providerId);
  if (!provider) return;

  const updates: Record<string, unknown> = {};
  if (event === "accepted") {
    updates.acceptedOrders = (provider.acceptedOrders ?? 0) + 1;
  } else if (event === "rejected") {
    updates.rejectedOrders = (provider.rejectedOrders ?? 0) + 1;
  } else if (event === "delivered") {
    updates.totalOrders = (provider.totalOrders ?? 0) + 1;
    if (commissionAmount) {
      const current = parseFloat(String(provider.totalCommission ?? "0"));
      updates.totalCommission = (current + commissionAmount).toFixed(3);
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(providers).set(updates).where(eq(providers.id, providerId));
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(
  data: Omit<typeof orders.$inferInsert, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(orders).values(data);
  return (result as { insertId: number }).insertId;
}

export async function getOrderById(id: number): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function updateOrder(
  id: number,
  data: Partial<typeof orders.$inferInsert>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set(data).where(eq(orders.id, id));
}

// ─── Order Assignments ────────────────────────────────────────────────────────

export async function createAssignment(data: {
  orderId: number;
  providerId: number;
  attemptNumber: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(orderAssignments).values({
    orderId: data.orderId,
    providerId: data.providerId,
    attemptNumber: data.attemptNumber,
    status: "pending",
  });
  return (result as { insertId: number }).insertId;
}

export async function getActiveAssignment(
  orderId: number
): Promise<OrderAssignment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(orderAssignments)
    .where(
      and(
        eq(orderAssignments.orderId, orderId),
        or(
          eq(orderAssignments.status, "pending"),
          eq(orderAssignments.status, "accepted")
        )
      )
    )
    .limit(1);
  return result[0] ?? undefined;
}

export async function getAssignmentById(
  id: number
): Promise<OrderAssignment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(orderAssignments)
    .where(eq(orderAssignments.id, id))
    .limit(1);
  return result[0] ?? undefined;
}

export async function updateAssignment(
  id: number,
  data: Partial<typeof orderAssignments.$inferInsert>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(orderAssignments).set(data).where(eq(orderAssignments.id, id));
}

export async function getAssignmentsByOrder(
  orderId: number
): Promise<OrderAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orderAssignments)
    .where(eq(orderAssignments.orderId, orderId));
}

export async function getAssignmentsByProvider(
  providerId: number
): Promise<OrderAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orderAssignments)
    .where(eq(orderAssignments.providerId, providerId));
}

export async function getPendingAssignmentForProvider(
  providerId: number
): Promise<(OrderAssignment & { order?: Order }) | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(orderAssignments)
    .where(
      and(
        eq(orderAssignments.providerId, providerId),
        eq(orderAssignments.status, "pending")
      )
    )
    .orderBy(desc(orderAssignments.createdAt))
    .limit(1);
  return result[0] ?? undefined;
}

export async function countActiveAssignments(orderId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select()
    .from(orderAssignments)
    .where(
      and(
        eq(orderAssignments.orderId, orderId),
        or(
          eq(orderAssignments.status, "pending"),
          eq(orderAssignments.status, "accepted")
        )
      )
    );
  return result.length;
}

// ─── Saved Locations ─────────────────────────────────────────────────────────

export async function getSavedLocations(sessionKey: string): Promise<SavedLocation[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(savedLocations)
    .where(eq(savedLocations.sessionKey, sessionKey))
    .limit(3);
}

export async function upsertSavedLocation(data: {
  sessionKey: string;
  label: "home" | "work" | "other";
  lat: number;
  lng: number;
  address?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Upsert by sessionKey + label (one Home, one Work per session)
  const existing = await db
    .select()
    .from(savedLocations)
    .where(
      and(
        eq(savedLocations.sessionKey, data.sessionKey),
        eq(savedLocations.label, data.label)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(savedLocations)
      .set({ lat: data.lat, lng: data.lng, address: data.address ?? null })
      .where(eq(savedLocations.id, existing[0].id));
  } else {
    await db.insert(savedLocations).values({
      sessionKey: data.sessionKey,
      label: data.label,
      lat: data.lat,
      lng: data.lng,
      address: data.address ?? null,
    });
  }
}

export async function deleteSavedLocation(id: number, sessionKey: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(savedLocations)
    .where(and(eq(savedLocations.id, id), eq(savedLocations.sessionKey, sessionKey)));
}

// ─── Provider PIN Auth ────────────────────────────────────────────────────────

/**
 * Verify a provider's PIN. Returns true if the SHA-256 hex hash of the given
 * pin matches the stored pinHash. Returns false if provider not found or no
 * pinHash is set.
 */
export async function verifyProviderPin(
  providerId: number,
  pinHash: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ pinHash: providers.pinHash })
    .from(providers)
    .where(eq(providers.id, providerId))
    .limit(1);
  if (!result[0]) return false;
  const stored = result[0].pinHash;
  if (!stored) return false;
  return stored === pinHash;
}

// ─── Provider Registration & Onboarding ──────────────────────────────────────
export async function createProvider(data: {
  name: string;
  phone: string;
  email?: string;
  zoneId: number;
  pinHash: string;
  vehicleType?: string;
  vehiclePlate?: string;
  nationalId?: string;
  adminCreated?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(providers).values({
    name: data.name,
    phone: data.phone,
    email: data.email,
    zoneId: data.zoneId,
    pinHash: data.pinHash,
    vehicleType: data.vehicleType,
    vehiclePlate: data.vehiclePlate,
    nationalId: data.nationalId,
    adminCreated: data.adminCreated ?? false,
    providerStatus: "pending_review",
    isAvailable: false, // not active until approved
  });
  return (result[0] as { insertId: number }).insertId;
}

export async function getProviderByPhone(phone: string): Promise<Provider | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(providers).where(eq(providers.phone, phone)).limit(1);
  return result[0] ?? undefined;
}

export async function updateProviderStatus(
  providerId: number,
  status: "pending_review" | "approved" | "rejected",
  rejectionReason?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(providers)
    .set({
      providerStatus: status,
      rejectionReason: rejectionReason ?? null,
      // Approved providers become available immediately
      isAvailable: status === "approved" ? true : false,
    })
    .where(eq(providers.id, providerId));
}

export async function getPendingProviders(): Promise<Provider[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(providers).where(eq(providers.providerStatus, "pending_review"));
}

// ─── Push Subscriptions ───────────────────────────────────────────────────────

export async function savePushSubscription(data: InsertPushSubscription): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Remove old subscriptions for this provider first (one active sub per provider)
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.providerId, data.providerId));
  await db.insert(pushSubscriptions).values(data);
}

export async function getPushSubscriptionsByProvider(providerId: number): Promise<PushSubscription[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.providerId, providerId));
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

// ─── Customer Sessions (OTP) ──────────────────────────────────────────────────

export async function upsertCustomerSession(phone: string, otpHash: string, expiresAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(customerSessions).where(eq(customerSessions.phone, phone)).limit(1);
  if (existing.length > 0) {
    await db.update(customerSessions)
      .set({ otpHash, otpExpiresAt: expiresAt, verified: false, sessionToken: null })
      .where(eq(customerSessions.phone, phone));
  } else {
    await db.insert(customerSessions).values({ phone, otpHash, otpExpiresAt: expiresAt });
  }
}

export async function getCustomerSessionByPhone(phone: string): Promise<CustomerSession | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(customerSessions).where(eq(customerSessions.phone, phone)).limit(1);
  return rows[0] ?? null;
}

export async function verifyCustomerOtp(phone: string, sessionToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(customerSessions)
    .set({ verified: true, sessionToken, otpHash: null })
    .where(eq(customerSessions.phone, phone));
}

export async function getCustomerSessionByToken(token: string): Promise<CustomerSession | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(customerSessions)
    .where(and(eq(customerSessions.sessionToken, token), eq(customerSessions.verified, true)))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Provider Locations ───────────────────────────────────────────────────────

export async function upsertProviderLocation(providerId: number, lat: number, lng: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(providerLocations).where(eq(providerLocations.providerId, providerId)).limit(1);
  if (existing.length > 0) {
    await db.update(providerLocations).set({ lat, lng }).where(eq(providerLocations.providerId, providerId));
  } else {
    await db.insert(providerLocations).values({ providerId, lat, lng });
  }
}

export async function getProviderLocation(providerId: number): Promise<ProviderLocation | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(providerLocations).where(eq(providerLocations.providerId, providerId)).limit(1);
  return rows[0] ?? null;
}

// ─── Admin Order Helpers ──────────────────────────────────────────────────────

export async function getAllOrders(opts?: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(orders).$dynamic();
  if (opts?.status) {
    query = query.where(eq(orders.status, opts.status as Order["status"]));
  }
  query = query.orderBy(orders.createdAt);
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.offset(opts.offset);
  const rows = await query;
  // Return newest first
  return rows.reverse();
}

export async function countOrders(status?: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select().from(orders);
  if (status) return rows.filter((r) => r.status === status).length;
  return rows.length;
}

// ─── Provider Working Hours ───────────────────────────────────────────────────

export async function getWorkingHours(providerId: number): Promise<ProviderWorkingHours[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(providerWorkingHours).where(eq(providerWorkingHours.providerId, providerId));
}

export async function getAllProvidersWorkingHours(): Promise<ProviderWorkingHours[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(providerWorkingHours);
}

export async function upsertWorkingHoursRow(data: {
  providerId: number;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Check if row exists
  const existing = await db
    .select()
    .from(providerWorkingHours)
    .where(
      and(
        eq(providerWorkingHours.providerId, data.providerId),
        eq(providerWorkingHours.dayOfWeek, data.dayOfWeek)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(providerWorkingHours)
      .set({ openTime: data.openTime, closeTime: data.closeTime, isActive: data.isActive })
      .where(
        and(
          eq(providerWorkingHours.providerId, data.providerId),
          eq(providerWorkingHours.dayOfWeek, data.dayOfWeek)
        )
      );
  } else {
    await db.insert(providerWorkingHours).values(data);
  }
}

// ─── Order Reviews ─────────────────────────────────────────────────────────────

export async function createReview(data: InsertOrderReview): Promise<OrderReview> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(orderReviews).values(data);
  const [row] = await db.select().from(orderReviews).where(eq(orderReviews.orderId, data.orderId));
  return row;
}

export async function getReviewByOrder(orderId: number): Promise<OrderReview | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(orderReviews).where(eq(orderReviews.orderId, orderId));
  return row ?? null;
}

export async function getReviewsByProvider(providerId: number): Promise<OrderReview[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orderReviews)
    .where(eq(orderReviews.providerId, providerId))
    .orderBy(desc(orderReviews.createdAt));
}

export async function getProviderRatingStats(
  providerId: number
): Promise<{ avg: number; total: number; distribution: Record<number, number> }> {
  const db = await getDb();
  if (!db) return { avg: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  const rows = await db
    .select()
    .from(orderReviews)
    .where(eq(orderReviews.providerId, providerId));
  if (rows.length === 0) return { avg: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of rows) {
    distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
    sum += r.rating;
  }
  return { avg: Math.round((sum / rows.length) * 10) / 10, total: rows.length, distribution };
}

export async function getAllReviews(): Promise<OrderReview[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderReviews).orderBy(desc(orderReviews.createdAt));
}

// ─── Sub-Zones ────────────────────────────────────────────────────────────────

/** Return all active sub-zones, optionally filtered by parent zone. */
export async function getAllSubZones(zoneId?: number): Promise<SubZone[]> {
  const db = await getDb();
  if (!db) return [];
  if (zoneId !== undefined) {
    return db
      .select()
      .from(subZones)
      .where(and(eq(subZones.zoneId, zoneId), eq(subZones.isActive, true)));
  }
  return db.select().from(subZones).where(eq(subZones.isActive, true));
}

export async function getSubZoneById(id: number): Promise<SubZone | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subZones).where(eq(subZones.id, id)).limit(1);
  return result[0] ?? undefined;
}

/**
 * Count available providers in a sub-zone.
 * A provider is "in" a sub-zone if they have a row in provider_sub_zones.
 * Available = isAvailable=true AND activeOrderId IS NULL AND providerStatus=approved.
 */
export async function countAvailableProvidersBySubZone(subZoneId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Get all provider IDs that cover this sub-zone
  const coverage = await db
    .select({ providerId: providerSubZones.providerId })
    .from(providerSubZones)
    .where(eq(providerSubZones.subZoneId, subZoneId));
  if (coverage.length === 0) return 0;
  const providerIds = coverage.map((r) => r.providerId);
  const available = await db
    .select({ id: providers.id })
    .from(providers)
    .where(
      and(
        inArray(providers.id, providerIds),
        eq(providers.isAvailable, true),
        isNull(providers.activeOrderId),
        eq(providers.providerStatus, "approved")
      )
    );
  return available.length;
}

/**
 * Get available providers in a sub-zone (for assignment).
 * Falls back to parent zone if no sub-zone providers are available.
 */
export async function getAvailableProvidersBySubZone(
  subZoneId: number,
  excludeProviderIds: number[] = []
): Promise<Provider[]> {
  const db = await getDb();
  if (!db) return [];
  const coverage = await db
    .select({ providerId: providerSubZones.providerId })
    .from(providerSubZones)
    .where(eq(providerSubZones.subZoneId, subZoneId));
  if (coverage.length === 0) return [];
  let providerIds = coverage.map((r) => r.providerId);
  if (excludeProviderIds.length > 0) {
    providerIds = providerIds.filter((id) => !excludeProviderIds.includes(id));
  }
  if (providerIds.length === 0) return [];
  return db
    .select()
    .from(providers)
    .where(
      and(
        inArray(providers.id, providerIds),
        eq(providers.isAvailable, true),
        isNull(providers.activeOrderId),
        eq(providers.providerStatus, "approved")
      )
    );
}

/** Get sub-zones covered by a provider. */
export async function getProviderSubZones(providerId: number): Promise<SubZone[]> {
  const db = await getDb();
  if (!db) return [];
  const links = await db
    .select({ subZoneId: providerSubZones.subZoneId })
    .from(providerSubZones)
    .where(eq(providerSubZones.providerId, providerId));
  if (links.length === 0) return [];
  const ids = links.map((l) => l.subZoneId);
  return db.select().from(subZones).where(inArray(subZones.id, ids));
}

/** Set (replace) the sub-zones for a provider. */
export async function setProviderSubZones(
  providerId: number,
  subZoneIds: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete existing
  await db.delete(providerSubZones).where(eq(providerSubZones.providerId, providerId));
  // Insert new
  if (subZoneIds.length > 0) {
    await db.insert(providerSubZones).values(
      subZoneIds.map((subZoneId) => ({ providerId, subZoneId }))
    );
  }
}

/**
 * Get coverage stats for all sub-zones grouped by parent zone.
 * Returns: { zoneId, zoneName, subZones: [{ id, name, providerCount }] }
 */
export async function getSubZoneCoverageStats(): Promise<
  Array<{
    zoneId: number;
    zoneName: string;
    subZones: Array<{ id: number; name: string; providerCount: number }>;
  }>
> {
  const db = await getDb();
  if (!db) return [];
  const allZones = await getAllZones();
  const allSubZones = await getAllSubZones();
  const result = [];
  for (const zone of allZones) {
    const zoneSubZones = allSubZones.filter((sz) => sz.zoneId === zone.id);
    const subZonesWithCount = await Promise.all(
      zoneSubZones.map(async (sz) => ({
        id: sz.id,
        name: sz.name,
        providerCount: await countAvailableProvidersBySubZone(sz.id),
      }))
    );
    result.push({ zoneId: zone.id, zoneName: zone.name, subZones: subZonesWithCount });
  }
  return result;
}

// ─── Multi-Order Provider Support ─────────────────────────────────────────────

/**
 * Get all active orders for a provider (accepted or out_for_delivery).
 * Used to check concurrent order count and proximity for multi-order eligibility.
 */
export async function getProviderActiveOrders(providerId: number): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.assignedProviderId, providerId),
        or(eq(orders.status, "accepted"), eq(orders.status, "out_for_delivery"))
      )
    );
}

/**
 * Count active orders for a provider.
 */
export async function countProviderActiveOrders(providerId: number): Promise<number> {
  const activeOrders = await getProviderActiveOrders(providerId);
  return activeOrders.length;
}

/**
 * Get available OR busy-but-eligible providers in a zone.
 * Eligible = isAvailable=true AND providerStatus=approved AND activeOrderCount < MAX_CONCURRENT_ORDERS.
 * This replaces the strict "activeOrderId IS NULL" check for multi-order support.
 */
export async function getEligibleProvidersByZone(
  zoneId: number,
  excludeProviderIds: number[] = [],
  maxConcurrentOrders: number = 3
): Promise<Provider[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(providers.zoneId, zoneId),
    eq(providers.isAvailable, true),
    eq(providers.providerStatus, "approved"),
  ];
  if (excludeProviderIds.length > 0) {
    conditions.push(notInArray(providers.id, excludeProviderIds));
  }
  const allAvailable = await db.select().from(providers).where(and(...conditions));
  // Filter: include only those with fewer than maxConcurrentOrders active orders
  const eligible: Provider[] = [];
  for (const provider of allAvailable) {
    const activeCount = await countProviderActiveOrders(provider.id);
    if (activeCount < maxConcurrentOrders) {
      eligible.push(provider);
    }
  }
  return eligible;
}

/**
 * Get eligible providers in a sub-zone (for multi-order assignment).
 */
export async function getEligibleProvidersBySubZone(
  subZoneId: number,
  excludeProviderIds: number[] = [],
  maxConcurrentOrders: number = 3
): Promise<Provider[]> {
  const db = await getDb();
  if (!db) return [];
  const coverage = await db
    .select({ providerId: providerSubZones.providerId })
    .from(providerSubZones)
    .where(eq(providerSubZones.subZoneId, subZoneId));
  if (coverage.length === 0) return [];
  let providerIds = coverage.map((r) => r.providerId);
  if (excludeProviderIds.length > 0) {
    providerIds = providerIds.filter((id) => !excludeProviderIds.includes(id));
  }
  if (providerIds.length === 0) return [];
  const allAvailable = await db
    .select()
    .from(providers)
    .where(
      and(
        inArray(providers.id, providerIds),
        eq(providers.isAvailable, true),
        eq(providers.providerStatus, "approved")
      )
    );
  // Filter: include only those with fewer than maxConcurrentOrders active orders
  const eligible: Provider[] = [];
  for (const provider of allAvailable) {
    const activeCount = await countProviderActiveOrders(provider.id);
    if (activeCount < maxConcurrentOrders) {
      eligible.push(provider);
    }
  }
  return eligible;
}
