/**
 * Shared domain: enums, transition guards, and zone geometry helpers.
 * This module is imported by both server procedures and Vitest tests.
 * No framework dependencies — pure TypeScript.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "draft"
  | "pending"
  | "assigned"
  | "accepted"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "confirmed" | "failed" | "refunded";
export type PaymentMethod = "cash" | "online" | "bank_transfer";
export type ProviderCommissionStatus = "unpaid" | "pending_settlement" | "settled";

export type AssignmentStatus = "pending" | "accepted" | "rejected" | "expired";

// ─── Transition tables ────────────────────────────────────────────────────────

/**
 * Valid (from → to) transitions for orders.
 * Any transition not in this map is illegal.
 */
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft:            ["pending", "cancelled"],
  pending:          ["assigned", "cancelled"],
  assigned:         ["accepted", "pending", "cancelled"],  // pending = reassign after rejection
  accepted:         ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered:        [],
  cancelled:        [],
};

/**
 * Valid (from → to) transitions for order_assignments.
 */
const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  pending:  ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired:  [],
};

// ─── Transition guards ────────────────────────────────────────────────────────

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionAssignment(
  from: AssignmentStatus,
  to: AssignmentStatus
): boolean {
  return ASSIGNMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new Error(
      `انتقال غير صالح للطلب: ${from} → ${to}`
    );
  }
}

export function assertAssignmentTransition(
  from: AssignmentStatus,
  to: AssignmentStatus
): void {
  if (!canTransitionAssignment(from, to)) {
    throw new Error(
      `انتقال غير صالح للتكليف: ${from} → ${to}`
    );
  }
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

/**
 * PRICE PER CYLINDER: 3.300 OMR each (includes delivery for the whole order).
 * Delivery fee is always 0 (included in the per-cylinder price).
 */
export const PRICE_PER_CYLINDER = 3.300;
/** @deprecated kept for backward compatibility — use PRICE_PER_CYLINDER */
export const FIXED_ORDER_PRICE = 3.300;
export const COMMISSION_AMOUNT = 0.100;
/** Estimated delivery time in minutes per order */
export const DEFAULT_ETA_MINUTES = 30;
/** Extra minutes per additional cylinder in the same order */
export const EXTRA_MINUTES_PER_CYLINDER = 2;
/** Maximum cylinders a customer can order at once */
export const MAX_CYLINDERS_PER_ORDER = 10;
/** Maximum concurrent active orders a provider can handle */
export const MAX_CONCURRENT_ORDERS = 3;
/** Radius in km within which a provider's active orders must be for multi-order eligibility */
export const MULTI_ORDER_PROXIMITY_KM = 5;
/** Average travel time between stops in minutes (used for ETA estimation) */
export const TRAVEL_TIME_BETWEEN_STOPS_MIN = 10;

/** @deprecated use PRICE_PER_CYLINDER instead */
export const GAS_PRICE_PER_UNIT = 3.5;
/** @deprecated delivery is included in per-cylinder price */
export const DELIVERY_FEE = 0;

/**
 * Calculate order price based on number of cylinders.
 * Price = gasAmount × PRICE_PER_CYLINDER (delivery included).
 * @param gasAmount Number of cylinders (1–10). Defaults to 1.
 */
export function calculateOrderPrice(gasAmount: number = 1): {
  unitPrice: number;
  deliveryFee: number;
  totalPrice: number;
} {
  const clampedAmount = Math.max(1, Math.min(MAX_CYLINDERS_PER_ORDER, Math.round(gasAmount)));
  return {
    unitPrice: PRICE_PER_CYLINDER,
    deliveryFee: 0,
    totalPrice: parseFloat((clampedAmount * PRICE_PER_CYLINDER).toFixed(3)),
  };
}

/**
 * Estimate delivery time for a new order assigned to a provider who already has active orders.
 * ETA = sum of remaining delivery times for active orders + travel time to new order.
 * @param activeOrderCount Number of orders the provider is already handling
 * @param gasAmount Number of cylinders in the new order
 */
export function calculateMultiOrderETA(
  activeOrderCount: number,
  gasAmount: number = 1
): number {
  const baseETA = DEFAULT_ETA_MINUTES;
  const extraForCylinders = (gasAmount - 1) * EXTRA_MINUTES_PER_CYLINDER;
  const extraForActiveOrders = activeOrderCount * TRAVEL_TIME_BETWEEN_STOPS_MIN;
  return baseETA + extraForCylinders + extraForActiveOrders;
}

/**
 * Provider score = acceptedOrders / (acceptedOrders + rejectedOrders).
 * Returns 1.0 for new providers with no history (benefit of the doubt).
 */
export function calculateProviderScore(accepted: number, rejected: number): number {
  const total = accepted + rejected;
  if (total === 0) return 1.0;
  return accepted / total;
}

// ─── Zone geometry ────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Haversine distance in kilometres between two lat/lng points.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Ray-casting point-in-polygon test.
 * Returns true if point is inside the polygon.
 */
export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  const { lat: py, lng: px } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ─── Order status display helpers ─────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft:            "مسودة",
  pending:          "جارٍ البحث عن مزود…",
  assigned:         "تم تعيين مزود",
  accepted:         "تم قبول الطلب",
  out_for_delivery: "في الطريق إليك",
  delivered:        "تم التوصيل",
  cancelled:        "تم الإلغاء",
};

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  "pending",
  "assigned",
  "accepted",
  "out_for_delivery",
  "delivered",
];
