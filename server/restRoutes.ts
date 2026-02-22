import type { Express, Request, Response } from "express";
import { z } from "zod";
import {
  addPriceHistory,
  addTrackedProduct,
  getProductPriceHistory,
  getTrackedProductById,
  getTrackedProductsByEmail,
} from "./db";
import { extractASINFromUrl, fetchAmazonProductDetails, isValidAmazonUrl } from "./scraper";

const trackProductSchema = z.object({
  productUrl: z.string().url("Invalid URL"),
  targetPrice: z.number().positive("Target price must be positive"),
  email: z.string().email("Invalid email"),
});

const emailQuerySchema = z.object({
  email: z.string().email("Invalid email"),
});

export function registerMvpRestRoutes(app: Express) {
  app.post("/api/track-product", async (req: Request, res: Response) => {
    const parsed = trackProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid payload",
        details: parsed.error.flatten(),
      });
    }

    const { productUrl, targetPrice, email } = parsed.data;

    if (!isValidAmazonUrl(productUrl)) {
      return res.status(400).json({ error: "Invalid Amazon product URL" });
    }

    const asin = extractASINFromUrl(productUrl);
    if (!asin) {
      return res.status(400).json({ error: "Could not extract ASIN from URL" });
    }

    const productDetails = await fetchAmazonProductDetails(asin);
    if (!productDetails) {
      return res.status(502).json({ error: "Failed to fetch product details from Amazon" });
    }

    try {
      const product = await addTrackedProduct({
        // MVP mode works without mandatory authentication.
        userId: 0,
        asin,
        productName: productDetails.name,
        productUrl: productDetails.url || productUrl,
        productImage: productDetails.image || null,
        currentPrice: String(productDetails.price) as any,
        targetPrice: String(targetPrice) as any,
        notificationEmail: email,
        isActive: 1,
        lastCheckedAt: new Date(),
      });

      await addPriceHistory({
        productId: product.id,
        price: String(productDetails.price) as any,
      });

      return res.status(201).json(product);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });

  app.get("/api/products", async (req: Request, res: Response) => {
    const parsed = emailQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Query param 'email' is required",
      });
    }

    try {
      const products = await getTrackedProductsByEmail(parsed.data.email);
      return res.json(products);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });

  app.get("/api/products/:productId/history", async (req: Request, res: Response) => {
    const productId = Number(req.params.productId);
    const days = Number(req.query.days ?? 30);

    if (!Number.isFinite(productId) || productId <= 0) {
      return res.status(400).json({ error: "Invalid productId" });
    }
    if (!Number.isFinite(days) || days <= 0) {
      return res.status(400).json({ error: "Invalid days value" });
    }

    try {
      const product = await getTrackedProductById(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const history = await getProductPriceHistory(productId, days);
      return res.json({ product, priceHistory: history });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });
}
