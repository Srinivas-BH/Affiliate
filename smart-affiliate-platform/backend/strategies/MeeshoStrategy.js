/**
 * Meesho Strategy - Manual Data Entry (Updated)
 * Allows Admin to enter Price/Title manually so "Notify Me" works.
 */
class MeeshoStrategy {
  constructor() {
    this.name = "MANUAL"; // Changed from LINK_ONLY to MANUAL
  }

  /**
   * Validate Meesho product data
   */
  validateProductData(data) {
    if (!data.affiliateLink) {
      throw new Error("Affiliate link is required");
    }

    if (!data.affiliateLink.toLowerCase().includes("meesho")) {
      throw new Error("Invalid Meesho link");
    }

    // Require price/title so notifications work
    if (!data.title || !data.price) {
      throw new Error("Title and Price are required for Meesho products");
    }

    return true;
  }

  /**
   * Format product data for storage
   */
  formatProductData(data, affiliateLink) {
    return {
      title: data.title || "Meesho Product",
      description: data.description || "",
      category: data.category || "Fashion", // Default to Fashion for Meesho
      tags: data.tags || [],
      imageUrl: data.imageUrl || "",
      affiliateLink: affiliateLink || data.affiliateLink,
      platform: "MEESHO",
      strategy: "MANUAL",
      price: data.price, // [FIX] Now stores the real price you enter
      originalPrice: data.originalPrice || data.price,
      discount: data.discount || 0,
      lastUpdated: new Date(),
      freshness: "FRESH",
    };
  }

  /**
   * Validate if product can be handled by this strategy
   */
  canHandle(affiliateLink) {
    return affiliateLink.toLowerCase().includes("meesho");
  }
}

module.exports = MeeshoStrategy;