const Product = require("../models/Product");
const UserRequest = require("../models/UserRequest");
const StrategyResolver = require("../strategies/StrategyResolver");
const { extractAsin } = require("../utils/detectPlatform");
const { sendProductNotification } = require("../utils/mailer");

/**
 * Helper to handle product data fetching and formatting
 */
const prepareProductData = async (body, userId) => {
  const { title, description, category, tags, price, originalPrice, discount, affiliateLink, imageUrl } = body;
  const strategy = StrategyResolver.getStrategy(affiliateLink);
  let productData;

  if (strategy.name === "AMAZON_API") {
    const asin = extractAsin(affiliateLink);
    if (!asin) throw new Error("Invalid Amazon URL.");
    
    try {
      const fetchedData = await strategy.fetchProductData(asin);
      productData = strategy.formatProductData(
        { ...fetchedData, category: category || "General", tags: tags || [] }, 
        affiliateLink
      );
    } catch (error) {
      // Fallback to manual data if API fails
      productData = strategy.formatProductData(
        { title, description, category, tags, price, originalPrice, discount, imageUrl }, 
        affiliateLink
      );
    }
  } else {
    productData = strategy.formatProductData(
      { title, description, category, tags, price, originalPrice, discount, imageUrl }, 
      affiliateLink
    );
  }

  productData.createdBy = userId;
  return productData;
};

/**
 * Add new product (Admin only)
 */
exports.addProduct = async (req, res) => {
  try {
    if (!req.body.affiliateLink) return res.status(400).json({ error: "Affiliate link is required" });

    const productData = await prepareProductData(req.body, req.user.id);
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
 * Matches users based on category, price, and platform
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
      // 1. Precise Filtering
      const { maxPrice, minPrice, platforms } = request.parsedTags;
      if (maxPrice && product.price > maxPrice) continue;
      if (minPrice && product.price < minPrice) continue;
      if (platforms?.length > 0 && !platforms.includes(product.platform)) continue;

      try {
        // 2. Avoid duplicate notifications for the same product
        const alreadyMatched = request.matchedProducts.some(id => id.toString() === product._id.toString());
        if (alreadyMatched) continue;

        // 3. Notify and Update
        await sendProductNotification(request.userEmail, product);

        request.matchedProducts.push(product._id);
        request.notificationsSent.push({ productId: product._id, sentAt: new Date() });

        // 4. Mark Fulfilled (Threshold = 1 as per Main branch)
        if (request.matchedProducts.length >= 1) {
          request.isFulfilled = true;
          request.status = "FULFILLED";
        }
        
        await request.save();
        console.log(`✅ Request Fulfilled! Notified ${request.userEmail} for ${product.title}`);
      } catch (err) {
        console.error(`Notification failed for ${request.userEmail}:`, err.message);
      }
    }
  } catch (error) {
    console.error("SaveAndNotify critical error:", error);
  }
};

/**
 * Get all products (User view with pagination)
 */
exports.getAllProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const filter = { freshness: "FRESH" };
    
    if (category) filter.category = { $regex: category, $options: "i" };
    if (search) filter.title = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;
    const products = await Product.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);
    
    // Increment views for the batch
    if (products.length > 0) {
      await Product.updateMany(
        { _id: { $in: products.map(p => p._id) } }, 
        { $inc: { views: 1 } }
      );
    }
    
    res.json({ 
      success: true, 
      products, 
      pagination: { total, pages: Math.ceil(total / limit), currentPage: parseInt(page) } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get product by ID
 */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      { $inc: { views: 1 } }, 
      { new: true }
    );
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
    
    // Re-trigger notifications (e.g., if price was updated to fit a user's budget)
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
    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      { $inc: { clicks: 1 } }, 
      { new: true }
    );
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true, redirectUrl: product.affiliateLink });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Product Analytics (Admin)
 */
exports.getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: { platform: "$platform", category: "$category" },
          avgPrice: { $avg: "$price" },
          totalViews: { $sum: { $ifNull: ["$views", 0] } },
          totalClicks: { $sum: { $ifNull: ["$clicks", 0] } },
          productCount: { $sum: 1 }
        },
      },
      {
        $project: {
          _id: 0,
          platform: "$_id.platform",
          category: "$_id.category",
          avgPrice: { $round: ["$avgPrice", 2] },
          totalViews: 1,
          totalClicks: 1,
          productCount: 1
        }
      },
      { $sort: { totalClicks: -1 } }
    ]);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};