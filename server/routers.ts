import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { addTrackedProduct, getUserTrackedProducts, getTrackedProductById, updateTrackedProduct, deleteTrackedProduct, addPriceHistory, getProductPriceHistory } from "./db";
import { extractASINFromUrl, isValidAmazonUrl, fetchAmazonProductDetails } from "./scraper";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  products: router({
    /**
     * Add a new product to track
     * Validates Amazon URL, extracts ASIN, fetches product details
     */
    add: protectedProcedure
      .input(
        z.object({
          productUrl: z.string().url("Invalid URL"),
          targetPrice: z.number().positive("Target price must be positive"),
          notificationEmail: z.string().email("Invalid email address"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Validate Amazon URL
        if (!isValidAmazonUrl(input.productUrl)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Amazon product URL",
          });
        }

        // Extract ASIN
        const asin = extractASINFromUrl(input.productUrl);
        if (!asin) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Could not extract product ID from URL",
          });
        }

        // Fetch product details
        const productDetails = await fetchAmazonProductDetails(asin);
        if (!productDetails) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch product details",
          });
        }

        // Add to database
        const product = await addTrackedProduct({
          userId: ctx.user.id,
          asin,
          productName: productDetails.name,
          productUrl: input.productUrl,
          productImage: productDetails.image,
          currentPrice: String(productDetails.price) as any,
          targetPrice: String(input.targetPrice) as any,
          notificationEmail: input.notificationEmail,
          isActive: 1,
          lastCheckedAt: new Date(),
        });

        // Record initial price in history
        await addPriceHistory({
          productId: product.id,
          price: String(productDetails.price) as any,
        });

        return product;
      }),

    /**
     * Get all tracked products for the current user
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserTrackedProducts(ctx.user.id);
    }),

    /**
     * Get a specific tracked product with its price history
     */
    getWithHistory: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        const product = await getTrackedProductById(input.productId);
        
        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        if (product.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this product",
          });
        }

        const history = await getProductPriceHistory(product.id, 30);

        return {
          product,
          priceHistory: history,
        };
      }),

    /**
     * Update target price for a product
     */
    updateTarget: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          targetPrice: z.number().positive("Target price must be positive"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const product = await getTrackedProductById(input.productId);
        
        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        if (product.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this product",
          });
        }

        return updateTrackedProduct(input.productId, {
          targetPrice: String(input.targetPrice) as any,
        });
      }),

    /**
     * Stop tracking a product
     */
    remove: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const product = await getTrackedProductById(input.productId);
        
        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        if (product.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this product",
          });
        }

        await deleteTrackedProduct(input.productId);
        
        return { success: true };
      }),
  }),

  priceHistory: router({
    /**
     * Get price history for a specific product
     */
    get: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          days: z.number().default(30).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const product = await getTrackedProductById(input.productId);
        
        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        if (product.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this product",
          });
        }

        return getProductPriceHistory(input.productId, input.days || 30);
      }),
  }),
});

export type AppRouter = typeof appRouter;
