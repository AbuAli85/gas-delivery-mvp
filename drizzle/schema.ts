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
  pinHash: varchar("pinHash", { length: 64 }),
  // Scoring system — score = acceptedOrders / (acceptedOrders + rejectedOrders)
  acceptedOrders: int("acceptedOrders").default(0).notNull(),
  rejectedOrders: int("rejectedOrders").default(0).notNull(),
  totalOrders: int("totalOrders").default(0).notNull(),
  totalCommission: decimal("totalCommission", { precision: 10, scale: 3 }).default("0.000").notNull(),
  // ── Registration & onboarding ───────────────────────────────────────────────────────────────────────────────────
  // pending_review = submitted, waiting admin approval
  // approved       = can log in and receive orders
  // rejected       = application declined
  providerStatus: mysqlEnum("providerStatus", ["pending_review", "approved", "rejected"])
    .default("pending_review")
    .notNull(),
  rejectionReason: text("rejectionReason"),
  // Vehicle / onboarding details collected during registration
  vehicleType: varchar("vehicleType", { length: 64 }),
  vehiclePlate: varchar("vehiclePlate", { length: 32 }),
  nationalId: varchar("nationalId", { length: 64 }),
  // Whether the provider was created by admin (true) or self-registered (false)
  adminCreated: boolean("adminCreated").default(false).notNull(),
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
  // Resolved sub-zone (wilayat/neighborhood) — more precise than zoneId
  subZoneId: int("subZoneId"),
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
  // Delivery location — where the gas should be delivered.
  // If null, falls back to customerLat/Lng (ordering location).
  // Zone resolution ALWAYS uses deliveryLat/deliveryLng when present.
  deliveryLat: float("deliveryLat"),
  deliveryLng: float("deliveryLng"),
  deliveryAddress: text("deliveryAddress"),
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

// ─── Saved Locations ─────────────────────────────────────────────────────────
// Lightweight saved locations keyed by a browser sessionKey (no login required).
// Customers can save up to 3 locations: home, work, or other.
export const savedLocations = mysqlTable("saved_locations", {
  id: int("id").autoincrement().primaryKey(),
  // Anonymous session key stored in localStorage — no auth required
  sessionKey: varchar("sessionKey", { length: 64 }).notNull(),
  label: mysqlEnum("label", ["home", "work", "other"]).default("other").notNull(),
  lat: float("lat").notNull(),
  lng: float("lng").notNull(),
  address: text("address"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedLocation = typeof savedLocations.$inferSelect;
export type InsertSavedLocation = typeof savedLocations.$inferInsert;

// ─── Push Subscriptions ───────────────────────────────────────────────────────
// Web Push subscriptions for providers (browser-side push notifications).
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ─── Customer Sessions (OTP Auth) ─────────────────────────────────────────────
// Lightweight phone-based OTP sessions — no OAuth required.
export const customerSessions = mysqlTable("customer_sessions", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  otpHash: varchar("otpHash", { length: 64 }),
  otpExpiresAt: timestamp("otpExpiresAt"),
  verified: boolean("verified").default(false).notNull(),
  sessionToken: varchar("sessionToken", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomerSession = typeof customerSessions.$inferSelect;
export type InsertCustomerSession = typeof customerSessions.$inferInsert;

// ─── Provider Locations ───────────────────────────────────────────────────────
// Real-time provider GPS position for live customer map tracking.
export const providerLocations = mysqlTable("provider_locations", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull().unique(),
  lat: float("lat").notNull(),
  lng: float("lng").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProviderLocation = typeof providerLocations.$inferSelect;
export type InsertProviderLocation = typeof providerLocations.$inferInsert;

// ─── Provider Working Hours ───────────────────────────────────────────────────
// Weekly schedule per provider. dayOfWeek: 0=Sunday … 6=Saturday (JS convention).
// openTime / closeTime stored as "HH:MM" 24-hour strings (e.g. "08:00", "22:30").
export const providerWorkingHours = mysqlTable("provider_working_hours", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0-6
  openTime: varchar("openTime", { length: 5 }).notNull().default("08:00"),  // HH:MM
  closeTime: varchar("closeTime", { length: 5 }).notNull().default("22:00"), // HH:MM
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProviderWorkingHours = typeof providerWorkingHours.$inferSelect;
export type InsertProviderWorkingHours = typeof providerWorkingHours.$inferInsert;

// ─── Sub-Zones (Wilayats / Neighborhoods) ────────────────────────────────────
// Each parent zone (e.g. "السيب") is divided into sub-zones (e.g. "الموالح", "المعبيلة").
// Sub-zones allow per-neighborhood provider coverage tracking.
export const subZones = mysqlTable("sub_zones", {
  id: int("id").autoincrement().primaryKey(),
  zoneId: int("zoneId").notNull(),           // FK → zones.id
  name: varchar("name", { length: 128 }).notNull(),  // Arabic name, e.g. "الموالح"
  centerLat: float("centerLat").notNull(),
  centerLng: float("centerLng").notNull(),
  // Bounding polygon for sub-zone membership checks (same format as zones.polygon)
  polygon: json("polygon").notNull().$type<Array<{ lat: number; lng: number }>>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SubZone = typeof subZones.$inferSelect;
export type InsertSubZone = typeof subZones.$inferInsert;

// ─── Provider Sub-Zones (many-to-many) ───────────────────────────────────────
// A provider can cover multiple sub-zones (e.g. a driver in Seeb covers
// both الموالح and المعبيلة الجنوبية).
export const providerSubZones = mysqlTable("provider_sub_zones", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull(),
  subZoneId: int("subZoneId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProviderSubZone = typeof providerSubZones.$inferSelect;
export type InsertProviderSubZone = typeof providerSubZones.$inferInsert;

// ─── Order Reviews ────────────────────────────────────────────────────────────
// Customer ratings and comments submitted after order delivery.
// rating: 1–5 integer. customerPhone stored for display (no auth required).
export const orderReviews = mysqlTable("order_reviews", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique(), // one review per order
  providerId: int("providerId").notNull(),
  rating: int("rating").notNull(),            // 1–5
  comment: text("comment"),                   // optional free text
  customerPhone: varchar("customerPhone", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OrderReview = typeof orderReviews.$inferSelect;
export type InsertOrderReview = typeof orderReviews.$inferInsert;

// ─── OTP Requests ─────────────────────────────────────────────────────────────
// Secure phone OTP verification for customer login.
// codeHash: bcrypt hash of the 6-digit OTP (never stored in plain text).
// expiresAt: 5 minutes from creation.
// attempts: incremented on each wrong guess; locked after 3.
// verified: set to true once the correct code is entered.
export const otpRequests = mysqlTable("otp_requests", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  codeHash: varchar("codeHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  attempts: int("attempts").default(0).notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OtpRequest = typeof otpRequests.$inferSelect;
export type InsertOtpRequest = typeof otpRequests.$inferInsert;
