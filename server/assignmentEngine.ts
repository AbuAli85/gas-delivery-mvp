/**
 * Assignment Engine
 * Deterministic, side-effect-free zone-matching and provider selection.
 * All DB writes happen in routers.ts — this module only computes decisions.
 */

import { Zone, Provider } from "../drizzle/schema";
import { haversineKm, isPointInPolygon, LatLng } from "../shared/domain";

export interface ZoneWithProviders {
  zone: Zone;
  providers: Provider[];
}

/**
 * Find the best zone for a customer location.
 * Strategy:
 *   1. Find all zones whose polygon contains the customer point.
 *   2. If multiple, pick the one whose center is closest.
 *   3. If none contain the point, fall back to the closest zone center.
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

  const candidates = containing.length > 0 ? containing : zonesWithProviders;

  // Sort by distance to zone center, ascending
  candidates.sort((a, b) => {
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

  return candidates[0] ?? null;
}

/**
 * Select the next eligible provider for an order.
 * Eligible = isAvailable AND no activeOrderId AND not in rejectedProviderIds.
 * Returns null if no eligible provider exists.
 */
export function selectNextProvider(
  availableProviders: Provider[],
  rejectedProviderIds: number[]
): Provider | null {
  const rejected = new Set(rejectedProviderIds);
  const eligible = availableProviders.filter(
    (p) => p.isAvailable && p.activeOrderId == null && !rejected.has(p.id)
  );
  if (eligible.length === 0) return null;
  // For MVP: first eligible provider (could be randomized or scored in future)
  return eligible[0];
}
