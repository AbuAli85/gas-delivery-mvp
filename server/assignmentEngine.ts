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
