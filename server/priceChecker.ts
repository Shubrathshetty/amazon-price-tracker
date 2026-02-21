/**
 * Price Checker Job
 * Runs daily to check product prices and send notifications
 */

import { getDb, getActiveTrackedProducts, updateTrackedProduct, addPriceHistory } from "./db";
import { fetchAmazonProductDetails } from "./scraper";
import { sendPriceDropAlert } from "./emailService";

/**
 * Main job function to check all active product prices
 * Should be called by a cron job once per day
 */
export async function checkAllProductPrices(): Promise<{
  checked: number;
  updated: number;
  notificationsSent: number;
  errors: string[];
}> {
  const result = {
    checked: 0,
    updated: 0,
    notificationsSent: 0,
    errors: [] as string[],
  };

  try {
    const products = await getActiveTrackedProducts();
    result.checked = products.length;

    console.log(`[Price Checker] Starting price check for ${products.length} products`);

    for (const product of products) {
      try {
        // Fetch current price from Amazon
        const productDetails = await fetchAmazonProductDetails(product.asin);
        
        if (!productDetails) {
          result.errors.push(`Failed to fetch details for ASIN ${product.asin}`);
          continue;
        }

        const newPrice = productDetails.price;
        const oldPrice = parseFloat(product.currentPrice as any);
        const targetPrice = parseFloat(product.targetPrice as any);

        // Record price in history
        await addPriceHistory({
          productId: product.id,
          price: String(newPrice) as any,
        });

        // Check if price changed
        if (newPrice !== oldPrice) {
          await updateTrackedProduct(product.id, {
            currentPrice: String(newPrice) as any,
            lastCheckedAt: new Date(),
          });
          result.updated++;

          console.log(
            `[Price Checker] Price updated for ${product.productName}: $${oldPrice} → $${newPrice}`
          );
        } else {
          // Just update lastCheckedAt
          await updateTrackedProduct(product.id, {
            lastCheckedAt: new Date(),
          });
        }

        // Check if price dropped below target and send notification
        if (newPrice <= targetPrice && oldPrice > targetPrice) {
          const notificationSent = await sendPriceDropAlert({
            productName: product.productName,
            productUrl: product.productUrl,
            currentPrice: newPrice,
            targetPrice: targetPrice,
            email: product.notificationEmail,
          });

          if (notificationSent) {
            await updateTrackedProduct(product.id, {
              priceDropNotifiedAt: new Date(),
            });
            result.notificationsSent++;
            console.log(
              `[Price Checker] Notification sent for ${product.productName} to ${product.notificationEmail}`
            );
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Error checking product ${product.id}: ${errorMsg}`);
        console.error(`[Price Checker] Error checking product ${product.id}:`, error);
      }
    }

    console.log(
      `[Price Checker] Job completed: ${result.updated} prices updated, ${result.notificationsSent} notifications sent`
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Fatal error in price checker: ${errorMsg}`);
    console.error("[Price Checker] Fatal error:", error);
  }

  return result;
}

/**
 * Initialize the price checker cron job
 * This should be called on server startup
 */
export function initializePriceChecker(): void {
  // For MVP, we'll use a simple interval-based approach
  // In production, use a proper cron library like 'node-cron'
  
  // Run price check every 24 hours (86400000 ms)
  // Set to run at a specific time each day for more predictability
  const scheduleNextCheck = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // Run at 2 AM

    const timeUntilNextCheck = tomorrow.getTime() - now.getTime();

    console.log(
      `[Price Checker] Next price check scheduled in ${Math.round(timeUntilNextCheck / 1000 / 60)} minutes`
    );

    setTimeout(async () => {
      await checkAllProductPrices();
      scheduleNextCheck(); // Schedule the next check
    }, timeUntilNextCheck);
  };

  scheduleNextCheck();
}
