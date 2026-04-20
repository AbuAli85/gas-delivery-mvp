import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getSavedLocations, upsertSavedLocation, deleteSavedLocation } from "../db";

/**
 * Saved locations router.
 * All operations are keyed by a sessionKey (stored in localStorage, no auth required).
 * Supports up to 3 locations per session: home, work, other.
 */
export const locationsRouter = router({
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
});
