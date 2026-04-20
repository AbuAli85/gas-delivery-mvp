import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  float,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "provider"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Zones ────────────────────────────────────────────────────────────────────
// Delivery zones covering Muscat governorate areas.
// polygon: JSON array of {lat, lng} objects forming a closed polygon.
export const zones = mysqlTable("zones", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  city: varchar("city", { length: 64 }).default("Muscat").notNull(),
  centerLat: float("centerLat").notNull(),
  centerLng: float("centerLng").notNull(),
  // Bounding polygon for zone membership checks
  polygon: json("polygon").notNull().$type<Array<{ lat: number; lng: number }>>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Zone = typeof zones.$inferSelect;
export type InsertZone = typeof zones.$inferInsert;

// ─── Providers ────────────────────────────────────────────────────────────────
export const providers = mysqlTable("providers", {
  id: int("id").autoincrement().primaryKey(),
  zoneId: int("zoneId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  // ID of the currently active order (null = free to accept new orders)
  activeOrderId: int("activeOrderId"),
  // Scoring system — score = acceptedOrders / (acceptedOrders + rejectedOrders)
  acceptedOrders: int("acceptedOrders").default(0).notNull(),
  rejectedOrders: int("rejectedOrders").default(0).notNull(),
  totalOrders: int("totalOrders").default(0).notNull(),
  totalCommission: decimal("totalCommission", { precision: 10, scale: 3 }).default("0.000").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
})

export type Provider = typeof providers.$inferSelect;
export type InsertProvider = typeof providers.$inferInsert;

// ─── Orders ───────────────────────────────────────────────────────────────────
// Status flow: draft → pending → assigned → accepted → out_for_delivery → delivered
//              draft → cancelled  (before payment)
//              pending → cancelled (no providers available)
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  // Customer info — no login required
  customerPhone: varchar("customerPhone", { length: 32 }),
  customerName: varchar("customerName", { length: 128 }),
  customerLat: float("customerLat").notNull(),
  customerLng: float("customerLng").notNull(),
  customerAddress: text("customerAddress"),
  // Order details
  gasAmount: decimal("gasAmount", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("OMR").notNull(),
  estimatedMinutes: int("estimatedMinutes").default(30).notNull(),
  // Resolved zone for this order
  zoneId: int("zoneId"),
  // Status — explicit enum, no implicit transitions
  status: mysqlEnum("status", [
    "draft",
    "pending",
    "assigned",
    "accepted",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ])
    .default("draft")
    .notNull(),
  // Currently assigned provider (set when status = assigned/accepted)
  assignedProviderId: int("assignedProviderId"),
  // JSON array of provider IDs that have already rejected this order
  rejectedProviderIds: json("rejectedProviderIds").$type<number[]>(),
  // Payment — hybrid: cash | online | bank_transfer
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "online", "bank_transfer"])
    .default("cash")
    .notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "confirmed", "failed", "refunded"])
    .default("pending")
    .notNull(),
  paymentIntentId: varchar("paymentIntentId", { length: 256 }),
  // Commission tracking
  commissionAmount: decimal("commissionAmount", { precision: 10, scale: 3 }).default("0.100").notNull(),
  providerCommissionStatus: mysqlEnum("providerCommissionStatus", [
    "unpaid",
    "pending_settlement",
    "settled",
  ])
    .default("unpaid")
    .notNull(),
  // Anti-cheat timestamps
  assignedAt: timestamp("assignedAt"),
  acceptedAt: timestamp("acceptedAt"),
  deliveredAt: timestamp("deliveredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── Order Assignments ────────────────────────────────────────────────────────
// One row per provider-order assignment attempt.
// Only ONE assignment per order may be in status='pending' or 'accepted' at a time.
// This table is the source of truth for the assignment state machine.
export const orderAssignments = mysqlTable("order_assignments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  providerId: int("providerId").notNull(),
  // pending → accepted | rejected | expired
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "expired"])
    .default("pending")
    .notNull(),
  // Sequence number within this order (1 = first attempt, 2 = second, …)
  attemptNumber: int("attemptNumber").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  respondedAt: timestamp("respondedAt"),
});

export type OrderAssignment = typeof orderAssignments.$inferSelect;
export type InsertOrderAssignment = typeof orderAssignments.$inferInsert;
