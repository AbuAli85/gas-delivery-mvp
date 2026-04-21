/**
 * Assignment Engine
 * Deterministic, side-effect-free zone-matching and provider selection.
 * All DB writes happen in routers.ts — this module only computes decisions.
 */

import { Zone, Provider, SubZone, Order } from "../drizzle/schema";
import { haversineKm, isPointInPolygon, LatLng, MULTI_ORDER_PROXIMITY_KM, MAX_CONCURRENT_ORDERS } from "../shared/domain";

export interface ZoneWithProviders {
  zone: Zone;
  providers: Provider[];
}

/**
 * Find the best zone for a delivery location.
 * Strategy:
 *   1. Keep only zones whose polygon contains the point (no “nearest center” guess —
 *      that mislabels orders when the pin is outside Muscat polygons, e.g. Seeb).
 *   2. If multiple contain the point, pick the one whose center is closest.
 *   3. If none contain the point, return null (no provider zone linked to this pin).
 */
export function resolveZone(
  customerLocation: LatLng,
  zonesWithProviders: ZoneWithProviders[]
): ZoneWithProviders | null {
  if (zonesWithProviders.length === 0) return null;

  const containing = zonesWithProviders.filter(({ zone }) => {
    const polygon = zone.polygon as LatLng[];
    return isPointInPolygon(customerLocation, polygon);
  });

  if (containing.length === 0) {
    return null;
  }

  containing.sort((a, b) => {
    const da = haversineKm(customerLocation, {
      lat: a.zone.centerLat,
      lng: a.zone.centerLng,
    });
    const db = haversineKm(customerLocation, {
      lat: b.zone.centerLat,
      lng: b.zone.centerLng,
    });
    return da - db;
  });

  return containing[0] ?? null;
}

/**
 * Find the best sub-zone (wilayat/neighborhood) for a delivery location.
 * Same strategy as resolveZone but operates on sub-zones.
 * Returns null if the point is not inside any sub-zone polygon.
 */
export function resolveSubZone(
  customerLocation: LatLng,
  subZones: SubZone[]
): SubZone | null {
  if (subZones.length === 0) return null;

  const containing = subZones.filter((sz) => {
    const polygon = sz.polygon as LatLng[];
    if (!polygon || polygon.length < 3) return false;
    return isPointInPolygon(customerLocation, polygon);
  });

  if (containing.length === 0) return null;

  // If multiple sub-zones contain the point (overlap), pick nearest center
  containing.sort((a, b) => {
    const da = haversineKm(customerLocation, { lat: a.centerLat, lng: a.centerLng });
    const db = haversineKm(customerLocation, { lat: b.centerLat, lng: b.centerLng });
    return da - db;
  });

  return containing[0] ?? null;
}

/**
 * Check if a provider is eligible to accept a new order alongside their existing active orders.
 * Conditions:
 *   1. Provider is available and approved.
 *   2. Provider has fewer than MAX_CONCURRENT_ORDERS active orders.
 *   3. The new order is within MULTI_ORDER_PROXIMITY_KM of ALL existing active orders.
 *      (If the provider has no active orders, they are always eligible.)
 */
export function isProviderEligibleForMultiOrder(
  provider: Provider,
  newOrderLocation: LatLng,
  activeOrders: Order[],
  maxConcurrent: number = MAX_CONCURRENT_ORDERS,
  proximityKm: number = MULTI_ORDER_PROXIMITY_KM
): boolean {
  if (!provider.isAvailable) return false;
  if (activeOrders.length >= maxConcurrent) return false;
  // If no active orders, provider is free — always eligible
  if (activeOrders.length === 0) return true;
  // Check proximity: new order must be within proximityKm of ALL active orders
  for (const activeOrder of activeOrders) {
    const activeLat = activeOrder.deliveryLat ?? activeOrder.customerLat;
    const activeLng = activeOrder.deliveryLng ?? activeOrder.customerLng;
    const dist = haversineKm(newOrderLocation, { lat: activeLat, lng: activeLng });
    if (dist > proximityKm) return false;
  }
  return true;
}

/**
 * Select the next eligible provider for an order.
 * Priority:
 *   1. Free providers (no active orders) — preferred.
 *   2. Busy-but-eligible providers (< MAX_CONCURRENT_ORDERS AND within proximity).
 * Providers in rejectedProviderIds are excluded.
 * @param availableProviders Providers fetched from DB (already filtered by zone/availability)
 * @param rejectedProviderIds Provider IDs that have already rejected this order
 * @param newOrderLocation Delivery coordinates of the new order
 * @param activeOrdersByProvider Map of providerId -> active orders (for proximity check)
 */
export function selectNextProvider(
  availableProviders: Provider[],
  rejectedProviderIds: number[],
  newOrderLocation?: LatLng,
  activeOrdersByProvider?: Map<number, Order[]>
): Provider | null {
  const rejected = new Set(rejectedProviderIds);
  const candidates = availableProviders.filter((p) => !rejected.has(p.id) && p.isAvailable);
  if (candidates.length === 0) return null;

  // Separate free providers from busy-but-eligible providers
  const freeProviders: Provider[] = [];
  const busyEligibleProviders: Provider[] = [];

  for (const provider of candidates) {
    const activeOrders = activeOrdersByProvider?.get(provider.id) ?? [];
    if (activeOrders.length === 0) {
      freeProviders.push(provider);
    } else if (
      newOrderLocation &&
      isProviderEligibleForMultiOrder(provider, newOrderLocation, activeOrders)
    ) {
      busyEligibleProviders.push(provider);
    }
  }

  /**
   * Rank providers by composite score for fair distribution:
   *   1. Fewer active orders (free before busy)
   *   2. Higher acceptance rate (acceptedOrders / (accepted + rejected))
   *   3. Fewer total delivered orders (distribute to less-busy providers first)
   */
  const rankProvider = (p: Provider, activeCount: number): number => {
    const accepted = p.acceptedOrders ?? 0;
    const rejected = p.rejectedOrders ?? 0;
    const total = accepted + rejected;
    const acceptRate = total === 0 ? 1.0 : accepted / total;
    // Lower active count = better; higher acceptRate = better; fewer total orders = better (tie-break)
    return -activeCount * 100 + acceptRate * 10 - (p.totalOrders ?? 0) * 0.001;
  };

  freeProviders.sort((a, b) => {
    const sa = rankProvider(a, 0);
    const sb = rankProvider(b, 0);
    return sb - sa;
  });

  busyEligibleProviders.sort((a, b) => {
    const aActive = (activeOrdersByProvider?.get(a.id) ?? []).length;
    const bActive = (activeOrdersByProvider?.get(b.id) ?? []).length;
    const sa = rankProvider(a, aActive);
    const sb = rankProvider(b, bActive);
    return sb - sa;
  });

  // Prefer free providers first, then busy-but-eligible
  const ordered = [...freeProviders, ...busyEligibleProviders];
  return ordered[0] ?? null;
}
