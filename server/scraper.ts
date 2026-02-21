import crypto from "crypto";
import { ENV } from "./_core/env";

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
    // ASIN format: 10 alphanumeric characters
    const dpMatch = urlObj.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (dpMatch && dpMatch[1]) {
      return dpMatch[1].toUpperCase();
    }

    // Also try matching just /dp/ with any following path
    const simpleDpMatch = urlObj.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
    if (simpleDpMatch && simpleDpMatch[1]) {
      return simpleDpMatch[1].toUpperCase();
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
    const paapiData = await fetchViaPaapi(asin);
    if (paapiData) {
      return paapiData;
    }

    // Fallback parser for local/dev usage when PA-API credentials are absent.
    return fetchViaHtmlFallback(asin);
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

type AmazonProductDetails = {
  name: string;
  price: number;
  image: string;
  url: string;
};

async function fetchViaPaapi(asin: string): Promise<AmazonProductDetails | null> {
  const accessKey = ENV.amazonPaapiAccessKey;
  const secretKey = ENV.amazonPaapiSecretKey;
  const partnerTag = ENV.amazonPaapiPartnerTag;
  const host = ENV.amazonPaapiHost || "webservices.amazon.com";
  const region = ENV.amazonPaapiRegion || "us-east-1";
  const marketplace = ENV.amazonPaapiMarketplace || "www.amazon.com";

  if (!accessKey || !secretKey || !partnerTag) {
    return null;
  }

  const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems";
  const endpoint = `https://${host}/paapi5/getitems`;
  const payload = JSON.stringify({
    ItemIds: [asin],
    PartnerTag: partnerTag,
    PartnerType: "Associates",
    Marketplace: marketplace,
    Resources: [
      "ItemInfo.Title",
      "Images.Primary.Large",
      "Offers.Listings.Price",
      "DetailPageURL",
    ],
  });

  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = formatDateStamp(now);

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = [
    "POST",
    "/paapi5/getitems",
    "",
    canonicalHeaders,
    signedHeaders,
    sha256Hex(payload),
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/ProductAdvertisingAPI/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = getSignature(secretKey, dateStamp, region, stringToSign);
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-encoding": "amz-1.0",
      "x-amz-target": target,
      "x-amz-date": amzDate,
      authorization,
    },
    body: payload,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[Scraper] PA-API request failed:", response.status, body);
    return null;
  }

  const json = await response.json();
  const item = json?.ItemsResult?.Items?.[0];
  const amount = item?.Offers?.Listings?.[0]?.Price?.Amount;
  const title = item?.ItemInfo?.Title?.DisplayValue;
  const image = item?.Images?.Primary?.Large?.URL ?? "";
  const url = item?.DetailPageURL ?? `https://www.amazon.com/dp/${asin}`;

  if (typeof amount !== "number" || !title) {
    return null;
  }

  return {
    name: String(title),
    price: amount,
    image: String(image),
    url: String(url),
  };
}

async function fetchViaHtmlFallback(asin: string): Promise<AmazonProductDetails | null> {
  const productUrl = `https://www.amazon.com/dp/${asin}`;
  const response = await fetch(productUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const title =
    matchAndDecode(html, /<span[^>]*id="productTitle"[^>]*>([\s\S]*?)<\/span>/i) ??
    matchAndDecode(html, /<title>([\s\S]*?)<\/title>/i);
  const image = matchAndDecode(html, /<meta property="og:image" content="([^"]+)"/i) ?? "";
  const priceText =
    matchAndDecode(html, /<span[^>]*class="a-offscreen"[^>]*>\s*([^<]+)\s*<\/span>/i) ??
    matchAndDecode(html, /"priceAmount":"([^"]+)"/i);
  const parsedPrice = priceText ? parsePrice(priceText) : null;

  if (!title || parsedPrice == null) {
    return null;
  }

  return {
    name: title.trim(),
    price: parsedPrice,
    image,
    url: productUrl,
  };
}

function matchAndDecode(input: string, pattern: RegExp): string | null {
  const match = input.match(pattern);
  if (!match?.[1]) return null;
  return decodeHtml(match[1]).replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function formatDateStamp(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function getSignature(secretKey: string, dateStamp: string, region: string, stringToSign: string): string {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "ProductAdvertisingAPI");
  const signingKey = hmac(kService, "aws4_request");
  return crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
}
