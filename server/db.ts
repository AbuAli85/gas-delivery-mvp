import { and, eq, inArray, isNull, ne, notInArray, or } from "drizzle-orm";
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
