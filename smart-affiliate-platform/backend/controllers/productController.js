const Product = require("../models/Product");
const UserRequest = require("../models/UserRequest");
const StrategyResolver = require("../strategies/StrategyResolver");
const { extractAsin, detectPlatform } = require("../utils/detectPlatform");
const { sendProductNotification } = require("../utils/mailer");

/**
 * Add new product (Admin only)
 */
exports.addProduct = async (req, res) => {
  try {
    const { title, description, category, tags, price, originalPrice, discount, affiliateLink, imageUrl } = req.body;
    if (!affiliateLink) return res.status(400).json({ error: "Affiliate link is required" });

    const strategy = StrategyResolver.getStrategy(affiliateLink);
    let productData;

    if (strategy.name === "AMAZON_API") {
      const asin = extractAsin(affiliateLink);
      if (!asin) return res.status(400).json({ error: "Invalid Amazon URL." });
      try {
        const fetchedData = await strategy.fetchProductData(asin);
        productData = strategy.formatProductData({ ...fetchedData, category: category || "General", tags: tags || [] }, affiliateLink);
      } catch (error) {
        productData = strategy.formatProductData({ title, description, category, tags, price, originalPrice, discount, imageUrl }, affiliateLink);
      }
    } else {
      productData = strategy.formatProductData({ title, description, category, tags, price, originalPrice, discount, imageUrl }, affiliateLink);
    }

    productData.createdBy = req.user.id;
    const product = await Product.create(productData);
    
    // Trigger notification logic
    await exports.saveAndNotify(product);
    
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Save product and notify matching user requests
 * Merged Logic: Uses Main's advanced filtering & FeatureB's execution flow
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
      // 1. Precise Matching Logic (From Main)
      if (request.parsedTags.maxPrice && product.price > request.parsedTags.maxPrice) continue;
      if (request.parsedTags.minPrice && product.price < request.parsedTags.minPrice) continue;
      if (request.parsedTags.platforms && request.parsedTags.platforms.length > 0) {
          if (!request.parsedTags.platforms.includes(product.platform)) continue;
      }

      try {
        // 2. Send Email
        await sendProductNotification(request.userEmail, product);

        // 3. Update Request Data & Prevent Duplicates
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

        // 4. Mark Fulfilled (Threshold = 1 as per Main branch)
        if (request.matchedProducts.length >= 1) {
          request.isFulfilled = true;
          request.status = "FULFILLED";
        }
        
        await request.save();
        console.log(`✅ Request Fulfilled! Notified ${request.userEmail} for ${product.title}`);
      } catch (err) {
        console.error(`Failed to notify ${request.userEmail}:`, err.message);
      }
    }
  } catch (error) {
    console.error("SaveAndNotify error", error);
  }
};

/**
 * Get all products (User view)
 */
exports.getAllProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const filter = { freshness: "FRESH" };
    if (category) filter.category = { $regex: category, $options: "i" };
    if (search) filter.title = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;
    const products = await Product.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });
    const total = await Product.countDocuments(filter);
    
    // Bulk increment views for tracked visibility
    await Product.updateMany({ _id: { $in: products.map(p => p._id) } }, { $inc: { views: 1 } });
    
    res.json({ success: true, products, pagination: { total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get product by ID
 */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update product (Admin)
 */
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: new Date(), freshness: "FRESH" },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: "Product not found" });
    
    // Re-check notifications in case price dropped into someone's range
    await exports.saveAndNotify(product);
    
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete product (Admin)
 */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Track affiliate click
 */
exports.trackClick = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } }, { new: true });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true, redirectUrl: product.affiliateLink });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get detailed product statistics (Admin Analytics)
 */
exports.getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: { platform: "$platform", category: "$category", title: "$title" },
          avgPrice: { $avg: "$price" },
          totalViews: { $sum: { $ifNull: ["$views", 0] } },
          totalClicks: { $sum: { $ifNull: ["$clicks", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          platform: { $ifNull: ["$_id.platform", "OTHER"] },
          category: { $ifNull: ["$_id.category", "General"] },
          productName: { $ifNull: ["$_id.title", "Unknown Product"] },
          avgPrice: { $round: ["$avgPrice", 2] },
          totalViews: 1,
          totalClicks: 1
        }
      },
      { $sort: { platform: 1, category: 1 } }
    ]);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};