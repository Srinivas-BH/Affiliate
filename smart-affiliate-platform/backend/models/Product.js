const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    tags: [String],
    price: {
      type: Number,
      required: true,
    },
    originalPrice: {
      type: Number,
      default: null,
    },
    discount: {
      type: Number,
      default: 0,
    },
    platform: {
      type: String,
      enum: ["AMAZON", "FLIPKART", "MYNTRA", "MEESHO", "OTHER"],
      required: true,
      index: true,
    },
    affiliateLink: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    asin: {
      type: String,
      // [FIX] Removed 'default: null' to prevent duplicate null key errors
      unique: true,
      sparse: true,
    },
    strategy: {
      type: String,
      enum: ["AMAZON_API", "MANUAL", "LINK_ONLY"],
      default: "MANUAL",
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    freshness: {
      type: String,
      enum: ["FRESH", "STALE", "ARCHIVED"],
      default: "FRESH",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    views: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    conversions: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
productSchema.index({ category: 1, price: 1 });
productSchema.index({ platform: 1, freshness: 1 });

module.exports = mongoose.model("Product", productSchema);