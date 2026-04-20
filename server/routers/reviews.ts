import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createReview,
  getReviewByOrder,
  getReviewsByProvider,
  getProviderRatingStats,
  getAllReviews,
} from "../db";

export const reviewsRouter = router({
  // Submit a review after delivery — no auth required (customer uses phone)
  submitReview: publicProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        providerId: z.number().int().positive(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(500).optional(),
        customerPhone: z.string().max(32).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Prevent duplicate reviews for the same order
      const existing = await getReviewByOrder(input.orderId);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "لقد قمت بتقييم هذا الطلب مسبقاً.",
        });
      }
      const review = await createReview({
        orderId: input.orderId,
        providerId: input.providerId,
        rating: input.rating,
        comment: input.comment ?? null,
        customerPhone: input.customerPhone ?? null,
      });
      return { success: true, review };
    }),

  // Check if an order already has a review
  getByOrder: publicProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return await getReviewByOrder(input.orderId);
    }),

  // Get all reviews for a specific provider (shown on provider dashboard)
  getProviderReviews: publicProcedure
    .input(z.object({ providerId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return await getReviewsByProvider(input.providerId);
    }),

  // Get rating stats for a provider (avg, total, distribution)
  getProviderStats: publicProcedure
    .input(z.object({ providerId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return await getProviderRatingStats(input.providerId);
    }),

  // Admin: get all reviews across all providers
  getAllReviews: publicProcedure.query(async () => {
    return await getAllReviews();
  }),
});
