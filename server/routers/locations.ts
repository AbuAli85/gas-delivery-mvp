import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { makeRequest, type GeocodingResult } from "../_core/map";
import { getSavedLocations, upsertSavedLocation, deleteSavedLocation, getAllZones } from "../db";

/**
 * Saved locations router.
 * All operations are keyed by a sessionKey (stored in localStorage, no auth required).
 * Supports up to 3 locations per session: home, work, other.
 */
export const locationsRouter = router({
  /**
   * Forward geocode (address → coordinates) via server Maps proxy.
   * Used when the browser Geocoder JS API fails or returns nothing (common with some proxies).
   */
  geocodeAddress: publicProcedure
    .input(z.object({ address: z.string().min(1).max(512) }))
    .mutation(async ({ input }) => {
      try {
        const data = await makeRequest<GeocodingResult>("/maps/api/geocode/json", {
          address: input.address,
          region: "om",
          language: "ar",
        });
        if (data.status !== "OK" || !data.results?.[0]) {
          return { ok: false as const, status: data.status ?? "UNKNOWN" };
        }
        const r = data.results[0];
        const loc = r.geometry.location;
        const lat = typeof loc.lat === "number" ? loc.lat : Number((loc as { lat?: number }).lat);
        const lng = typeof loc.lng === "number" ? loc.lng : Number((loc as { lng?: number }).lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return { ok: false as const, status: "INVALID_RESPONSE" };
        }
        return {
          ok: true as const,
          lat,
          lng,
          formattedAddress: r.formatted_address,
        };
      } catch {
        return { ok: false as const, status: "REQUEST_FAILED" };
      }
    }),

  /**
   * List saved locations for a session.
   */
  list: publicProcedure
    .input(z.object({ sessionKey: z.string().min(1) }))
    .query(async ({ input }) => {
      const locs = await getSavedLocations(input.sessionKey);
      return locs.map((l) => ({
        id: l.id,
        label: l.label,
        lat: l.lat,
        lng: l.lng,
        address: l.address ?? null,
      }));
    }),

  /**
   * Save or update a location for a session.
   * One Home and one Work per session — subsequent saves overwrite.
   */
  save: publicProcedure
    .input(
      z.object({
        sessionKey: z.string().min(1),
        label: z.enum(["home", "work", "other"]),
        lat: z.number(),
        lng: z.number(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await upsertSavedLocation({
        sessionKey: input.sessionKey,
        label: input.label,
        lat: input.lat,
        lng: input.lng,
        address: input.address ?? null,
      });
      return { success: true };
    }),

  /**
   * Delete a saved location by ID (must belong to the same sessionKey).
   */
  delete: publicProcedure
    .input(z.object({ id: z.number(), sessionKey: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await deleteSavedLocation(input.id, input.sessionKey);
      return { success: true };
    }),

  /**
   * List all active delivery zones with their polygon boundaries.
   * Used by the map to draw zone overlays.
   */
  listZones: publicProcedure.query(async () => {
    const zones = await getAllZones();
    return zones.map((z) => ({
      id: z.id,
      name: z.name,
      centerLat: z.centerLat,
      centerLng: z.centerLng,
      polygon: z.polygon,
    }));
  }),
});
