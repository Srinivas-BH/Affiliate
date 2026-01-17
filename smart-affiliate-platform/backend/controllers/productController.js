const Product = require("../models/Product");
const UserRequest = require("../models/UserRequest");
const StrategyResolver = require("../strategies/StrategyResolver");
const { extractAsin, detectPlatform } = require("../utils/detectPlatform");
const { sendProductNotification } = require("../utils/mailer");

// ... [Keep addProduct function as is] ...
// (Only showing the critical saveAndNotify function that handles the logic)

/**
 * Save product and notify matching user requests
 * [UPDATED] Handles duplicate checks and immediate fulfillment
 */
exports.saveAndNotify = async (product) => {
  try {
    // Find matching user requests (Active only)
    const matches = await UserRequest.find({
      "parsedTags.category": { $regex: product.category, $options: "i" },
      isFulfilled: false,
      status: "ACTIVE",
    });

    console.log(`Found ${matches.length} matching requests for product: ${product.title}`);

    for (const request of matches) {
      // 1. Precise Matching Logic
      if (request.parsedTags.maxPrice && product.price > request.parsedTags.maxPrice) continue;
      if (request.parsedTags.minPrice && product.price < request.parsedTags.minPrice) continue;
      if (request.parsedTags.platforms.length > 0 && !request.parsedTags.platforms.includes(product.platform)) continue;

      try {
        // 2. Send Email
        await sendProductNotification(request.userEmail, product);

        // 3. Update Request Data (Prevent Duplicates)
        const alreadyMatched = request.matchedProducts.some(
          (id) => id.toString() === product._id.toString()
        );

        if (!alreadyMatched) {
          request.matchedProducts.push(product._id);
          request.notificationsSent.push({
            productId: product._id,
            sentAt: new Date(),
          });
        }

        // 4. [CRITICAL] Mark Fulfilled Immediately (Threshold = 1)
        if (request.matchedProducts.length >= 1) {
          request.isFulfilled = true;
          request.fulfilledAt = new Date();
          request.status = "FULFILLED";
        }

        await request.save();
        console.log(`✅ Request Fulfilled! Notified ${request.userEmail} for ${product.title}`);
      } catch (err) {
        console.error(`Failed to notify ${request.userEmail}:`, err.message);
      }
    }

    return product;
  } catch (error) {
    console.error("Save and notify error:", error);
  }
};

// ... [Keep other functions like getAllProducts, etc.] ...

// Export all functions (ensure this matches your existing exports)
exports.addProduct = async (req, res) => { /* ... existing code ... */ };
exports.getAllProducts = async (req, res) => { /* ... existing code ... */ };
exports.getProductById = async (req, res) => { /* ... existing code ... */ };
exports.updateProduct = async (req, res) => { /* ... existing code ... */ }; // This calls saveAndNotify internally
exports.deleteProduct = async (req, res) => { /* ... existing code ... */ };
exports.trackClick = async (req, res) => { /* ... existing code ... */ };
exports.getProductStats = async (req, res) => { /* ... existing code ... */ };