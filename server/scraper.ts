/**
 * Amazon Product Scraper
 * Handles extraction of ASIN from URLs and price fetching
 */

/**
 * Extract ASIN from Amazon product URL
 * Supports multiple Amazon URL formats:
 * - https://www.amazon.com/dp/B0XXXXXX
 * - https://www.amazon.com/product-name/dp/B0XXXXXX
 * - https://amazon.com/gp/product/B0XXXXXX
 */
export function extractASINFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // First check if it's an Amazon domain
    const isAmazonDomain = /amazon\.[a-z.]+/.test(urlObj.hostname);
    if (!isAmazonDomain) {
      return null;
    }
    
    // Match /dp/ or /gp/product/ patterns
    // ASIN format: 8-10 characters (letters and numbers)
    const dpMatch = urlObj.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{8,10})/);
    if (dpMatch && dpMatch[1]) {
      return dpMatch[1];
    }
    
    // Also try matching just /dp/ with any following path
    const simpleDpMatch = urlObj.pathname.match(/\/dp\/([A-Z0-9]{8,10})/);
    if (simpleDpMatch && simpleDpMatch[1]) {
      return simpleDpMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error("Error parsing URL:", error);
    return null;
  }
}

/**
 * Fetch product details from Amazon using a scraping service
 * For MVP, we use a simple approach with a scraping API
 * 
 * In production, you would use:
 * - Amazon Product Advertising API (official but requires approval)
 * - ScraperAPI or similar proxy service
 * - Puppeteer with headless browser
 */
export async function fetchAmazonProductDetails(asin: string): Promise<{
  name: string;
  price: number;
  image: string;
  url: string;
} | null> {
  try {
    // For MVP, we'll use a mock implementation
    // In production, integrate with actual scraping service
    
    // Example: Using RapidAPI Amazon scraper or similar
    // This is a placeholder - replace with actual implementation
    
    const url = `https://www.amazon.com/dp/${asin}`;
    
    // Mock response for demonstration
    // Replace this with actual API call
    const mockData = {
      name: `Amazon Product ${asin}`,
      price: 99.99,
      image: "https://via.placeholder.com/300x300?text=Product",
      url: url,
    };
    
    return mockData;
  } catch (error) {
    console.error("Error fetching product details:", error);
    return null;
  }
}

/**
 * Validate Amazon product URL format
 */
export function isValidAmazonUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Check if it's an Amazon domain (amazon.com, amazon.co.uk, etc.)
    const isAmazonDomain = /amazon\.[a-z.]+/.test(urlObj.hostname);
    const hasAsin = extractASINFromUrl(url) !== null;
    return isAmazonDomain && hasAsin;
  } catch (error) {
    return false;
  }
}

/**
 * Parse price from various formats
 */
export function parsePrice(priceString: string): number | null {
  try {
    // Remove currency symbols and extra whitespace
    const cleaned = priceString.replace(/[^\d.]/g, "");
    const price = parseFloat(cleaned);
    return isNaN(price) ? null : price;
  } catch (error) {
    return null;
  }
}
