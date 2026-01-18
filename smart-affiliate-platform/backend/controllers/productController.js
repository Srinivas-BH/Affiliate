const Product = require("../models/Product");
const UserRequest = require("../models/UserRequest");
const StrategyResolver = require("../strategies/StrategyResolver");
// [FIX] Import detectPlatform
const { extractAsin, detectPlatform } = require("../utils/detectPlatform");
const { sendProductNotification } = require("../utils/mailer");

/**
 * Add new product (Admin only)
 * For Amazon products: Auto-fetches data from PA-API
 * For other platforms: Uses provided data
 */
exports.addProduct = async (req, res) => {
  try {
    const { title, description, category, tags, price, originalPrice, discount, affiliateLink, imageUrl } = req.body;

    if (!affiliateLink) {
      return res.status(400).json({
        error: "Affiliate link is required",
      });
    }

    // [FIX] Detect platform immediately from the link
    const platform = detectPlatform(affiliateLink);
    
    const strategy = StrategyResolver.getStrategy(affiliateLink);
    let productData;

    // For Amazon products, auto-fetch from PA-API
    if (strategy.name === "AMAZON_API") {
      const asin = extractAsin(affiliateLink);
      
      if (!asin) {
        return res.status(400).json({
          error: "Invalid Amazon URL. Could not extract ASIN.",
        });
      }

      try {
        // Fetch product data from Amazon PA-API
        const fetchedData = await strategy.fetchProductData(asin);
        
        // Use fetched data, but allow admin to override category and tags
        productData = strategy.formatProductData(
          {
            ...fetchedData,
            category: category || "General", // Admin can specify category
            tags: tags || [], // Admin can add tags
          },
          affiliateLink
        );
      } catch (error) {
        console.error("Failed to fetch from Amazon PA-API:", error);
        // Fallback: Use provided data if API fails
        if (!title || !category || !price) {
          return res.status(400).json({
            error: "Amazon PA-API fetch failed. Please provide title, category, and price manually.",
          });
        }
        productData = strategy.formatProductData(
          {
            title,
            description,
            category,
            tags,
            price,
            originalPrice,
            discount,
            imageUrl,
            platform, // [FIX] Pass platform to fallback
          },
          affiliateLink
        );
      }
    } else {
      // For non-API platforms, require manual data
      if (!title || !category || !price) {
        return res.status(400).json({
          error: "Title, category, and price are required for non-API platforms",
        });
      }

      productData = strategy.formatProductData(
        {
          title,
          description,
          category,
          tags,
          price,
          originalPrice,
          discount,
          imageUrl,
          platform, // [FIX] Pass the detected platform here
        },
        affiliateLink
      );
    }

    // Add admin reference
    productData.createdBy = req.user.id;

    // Extract ASIN for Amazon products (if not already set)
    if (productData.platform === "AMAZON" && !productData.asin) {
      productData.asin = extractAsin(affiliateLink);
    }

    const product = await Product.create(productData);

    // Trigger notify me logic
    await exports.saveAndNotify(product);

    res.status(201).json({
      success: true,
      message: productData.platform === "AMAZON" 
        ? "Product added successfully (data fetched from Amazon PA-API)" 
        : "Product added successfully",
      product,
    });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Save product and notify matching user requests
 */
exports.saveAndNotify = async (product) => {
  try {
    // Find matching user requests
    const matches = await UserRequest.find({
      "parsedTags.category": { $regex: product.category, $options: "i" },
      isFulfilled: false,
      status: "ACTIVE",
    });

    console.log(`Found ${matches.length} matching requests for product: ${product.title}`);

    // Notify matching users
    for (const request of matches) {
      // Check if price matches
      if (
        request.parsedTags.maxPrice &&
        product.price > request.parsedTags.maxPrice
      ) {
        continue;
      }

      if (
        request.parsedTags.minPrice &&
        product.price < request.parsedTags.minPrice
      ) {
        continue;
      }

      // Check if platform matches (if specified)
      if (
        request.parsedTags.platforms.length > 0 &&
        !request.parsedTags.platforms.includes(product.platform)
      ) {
        continue;
      }

      try {
        // Send notification email
        await sendProductNotification(request.userEmail, product);

        // Update request
        request.matchedProducts.push(product._id);
        request.notificationsSent.push({
          productId: product._id,
          sentAt: new Date(),
        });

        // Mark as fulfilled if required
        if (request.notificationsSent.length >= 3) {
          request.isFulfilled = true;
          request.fulfilledAt = new Date();
          request.status = "FULFILLED";
        }

        await request.save();
        console.log(`Notified user ${request.userEmail} for product ${product.title}`);
      } catch (err) {
        console.error(`Failed to notify ${request.userEmail}:`, err.message);
      }
    }

    return product;
  } catch (error) {
    console.error("Save and notify error:", error);
  }
};

/**
 * Get all products (User - filtered view)
 */
exports.getAllProducts = async (req, res) => {
  try {
    const { category, maxPrice, minPrice, platform, search, page = 1, limit = 20 } = req.query;

    const filter = { freshness: "FRESH" };

    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    if (maxPrice) {
      filter.price = { ...filter.price, $lte: parseInt(maxPrice) };
    }

    if (minPrice) {
      filter.price = { ...filter.price, $gte: parseInt(minPrice) };
    }

    if (platform) {
      filter.platform = platform;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const products = await Product.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    // Increment view count
    await Product.updateMany(filter, { $inc: { views: 1 } });

    res.json({
      success: true,
      products,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
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

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update product (Admin only)
 */
exports.updateProduct = async (req, res) => {
  try {
    const { title, description, category, price, originalPrice, discount, imageUrl, tags } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        category,
        price,
        originalPrice,
        discount,
        imageUrl,
        tags,
        lastUpdated: new Date(),
        freshness: "FRESH",
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Trigger notify me again for updated product
    await exports.saveAndNotify(product);

    res.json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete product (Admin only)
 */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
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

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Redirect to affiliate link
    res.json({
      success: true,
      redirectUrl: product.affiliateLink,
    });
  } catch (error) {
    console.error("Track click error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get product statistics (Admin only)
 */
exports.getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: "$platform",
          count: { $sum: 1 },
          avgPrice: { $avg: "$price" },
          totalViews: { $sum: "$views" },
          totalClicks: { $sum: "$clicks" },
        },
      },
    ]);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: error.message });
  }
};