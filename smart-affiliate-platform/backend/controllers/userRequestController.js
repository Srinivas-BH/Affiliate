const UserRequest = require("../models/UserRequest");
const Product = require("../models/Product");
const { parseNLPQuery } = require("../utils/nlpParser");
const { sendProductNotification } = require("../utils/mailer");

/**
 * Submit Notify Me request (User)
 */
exports.submitNotifyRequest = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Parse natural language query
    const parsedTags = parseNLPQuery(query);

    // Create user request
    const userRequest = await UserRequest.create({
      userId: req.user.id,
      userEmail: req.user.email,
      naturalLanguageQuery: query,
      parsedTags,
      status: "ACTIVE",
    });

    // Check for existing matching products
    const filter = { freshness: "FRESH" };

    if (parsedTags.category) {
      filter.category = { $regex: parsedTags.category, $options: "i" };
    }

    if (parsedTags.maxPrice) {
      filter.price = { $lte: parsedTags.maxPrice };
    }

    if (parsedTags.minPrice) {
      filter.price = { ...filter.price, $gte: parsedTags.minPrice };
    }

    if (parsedTags.platforms.length > 0) {
      filter.platform = { $in: parsedTags.platforms };
    }

    const matchingProducts = await Product.find(filter).limit(5);

    // Notify for existing products
    for (const product of matchingProducts) {
      try {
        await sendProductNotification(req.user.email, product);
        userRequest.matchedProducts.push(product._id);
        userRequest.notificationsSent.push({
          productId: product._id,
          sentAt: new Date(),
        });
      } catch (err) {
        console.error(`Failed to send notification:`, err.message);
      }
    }

    await userRequest.save();

    res.status(201).json({
      success: true,
      message: "Notify request submitted successfully",
      userRequest,
      matchingProducts: matchingProducts.length,
    });
  } catch (error) {
    console.error("Submit notify request error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user's notify requests
 */
exports.getUserRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { userId: req.user.id };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const requests = await UserRequest.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("matchedProducts")
      .sort({ createdAt: -1 });

    const total = await UserRequest.countDocuments(filter);

    res.json({
      success: true,
      requests,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.error("Get user requests error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cancel notify request
 */
exports.cancelRequest = async (req, res) => {
  try {
    const request = await UserRequest.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    request.status = "CANCELLED";
    await request.save();

    res.json({
      success: true,
      message: "Request cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel request error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all notify requests (Admin - for monitoring)
 */
exports.getAllRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const requests = await UserRequest.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("userId", "email name")
      .populate("matchedProducts")
      .sort({ createdAt: -1 });

    const total = await UserRequest.countDocuments(filter);

    res.json({
      success: true,
      requests,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.error("Get all requests error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get request statistics (Admin)
 */
exports.getRequestStats = async (req, res) => {
  try {
    const stats = await UserRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const topCategories = await UserRequest.aggregate([
      {
        $group: {
          _id: "$parsedTags.category",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      stats: {
        byStatus: stats,
        topCategories,
      },
    });
  } catch (error) {
    console.error("Get request stats error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a specific user request (Admin)
 */
exports.deleteRequest = async (req, res) => {
  try {
    const request = await UserRequest.findByIdAndDelete(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json({
      success: true,
      message: "Request deleted successfully",
    });
  } catch (error) {
    console.error("Delete request error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete all user requests (Admin)
 */
exports.deleteAllRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const result = await UserRequest.deleteMany(filter);

    res.json({
      success: true,
      message: `${result.deletedCount} request(s) deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete all requests error:", error);
    res.status(500).json({ error: error.message });
  }
};
