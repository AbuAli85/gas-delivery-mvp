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

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

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
      `Invalid order transition: ${from} → ${to}`
    );
  }
}

export function assertAssignmentTransition(
  from: AssignmentStatus,
  to: AssignmentStatus
): void {
  if (!canTransitionAssignment(from, to)) {
    throw new Error(
      `Invalid assignment transition: ${from} → ${to}`
    );
  }
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

/** Gas price per cylinder in OMR */
export const GAS_PRICE_PER_UNIT = 3.5;
/** Delivery fee in OMR */
export const DELIVERY_FEE = 1.0;
/** Estimated delivery time in minutes */
export const DEFAULT_ETA_MINUTES = 30;

export function calculateOrderPrice(gasAmount: number): {
  unitPrice: number;
  deliveryFee: number;
  totalPrice: number;
} {
  const unitPrice = GAS_PRICE_PER_UNIT;
  const deliveryFee = DELIVERY_FEE;
  const totalPrice = parseFloat((gasAmount * unitPrice + deliveryFee).toFixed(3));
  return { unitPrice, deliveryFee, totalPrice };
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
  draft:            "Draft",
  pending:          "Finding Provider…",
  assigned:         "Provider Assigned",
  accepted:         "Order Accepted",
  out_for_delivery: "On the Way",
  delivered:        "Delivered",
  cancelled:        "Cancelled",
};

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  "pending",
  "assigned",
  "accepted",
  "out_for_delivery",
  "delivered",
];
