import { describe, expect, it } from "vitest";
import { extractASINFromUrl, isValidAmazonUrl, parsePrice } from "./scraper";

describe("Amazon Scraper", () => {
  describe("extractASINFromUrl", () => {
    it("extracts ASIN from standard Amazon URL", () => {
      const url = "https://www.amazon.com/dp/B0ABCDEF";
      const asin = extractASINFromUrl(url);
      expect(asin).toBe("B0ABCDEF");
    });

    it("extracts ASIN from product name URL", () => {
      const url = "https://www.amazon.com/Some-Product-Name/dp/B0ABCDEF";
      const asin = extractASINFromUrl(url);
      expect(asin).toBe("B0ABCDEF");
    });

    it("extracts ASIN from gp/product URL", () => {
      const url = "https://www.amazon.com/gp/product/B0ABCDEF";
      const asin = extractASINFromUrl(url);
      expect(asin).toBe("B0ABCDEF");
    });

    it("returns null for invalid URL", () => {
      const url = "https://www.amazon.com/invalid";
      const asin = extractASINFromUrl(url);
      expect(asin).toBeNull();
    });

    it("returns null for non-Amazon URL", () => {
      const url = "https://www.ebay.com/dp/B0ABCDEF";
      const asin = extractASINFromUrl(url);
      expect(asin).toBeNull();
    });
  });

  describe("isValidAmazonUrl", () => {
    it("validates correct Amazon URL", () => {
      const url = "https://www.amazon.com/dp/B0ABCDEF";
      expect(isValidAmazonUrl(url)).toBe(true);
    });

    it("rejects invalid Amazon URL", () => {
      const url = "https://www.amazon.com/invalid";
      expect(isValidAmazonUrl(url)).toBe(false);
    });

    it("rejects non-Amazon URL", () => {
      const url = "https://www.example.com/dp/B0ABCDEF";
      expect(isValidAmazonUrl(url)).toBe(false);
    });
  });

  describe("parsePrice", () => {
    it("parses price from string with currency symbol", () => {
      const price = parsePrice("$99.99");
      expect(price).toBe(99.99);
    });

    it("parses price from plain number", () => {
      const price = parsePrice("99.99");
      expect(price).toBe(99.99);
    });

    it("parses price with commas", () => {
      const price = parsePrice("$1,299.99");
      expect(price).toBe(1299.99);
    });

    it("returns null for invalid price", () => {
      const price = parsePrice("invalid");
      expect(price).toBeNull();
    });
  });
});
