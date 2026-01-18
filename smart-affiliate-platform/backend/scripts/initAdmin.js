/**
 * Initialize Admin Account Script
 * Run this script once to set up the admin account with the default password
 * Usage: node scripts/initAdmin.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

// [UPDATED] New Admin Email
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "discyra2026@gmail.com";
const ADMIN_PASSWORD = "SBHaff$2706"; // Default admin password

const initAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/smart-affiliate");
    console.log("Connected to MongoDB");

    // Check if admin already exists
    let admin = await User.findOne({ email: ADMIN_EMAIL });

    if (admin) {
      // Update existing admin
      admin.password = ADMIN_PASSWORD; 
      admin.role = "admin";
      admin.name = admin.name || "Admin";
      admin.isEmailVerified = true;
      
      await admin.save();
      console.log("✅ Admin account updated successfully!");
    } else {
      // Create new admin
      admin = new User({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: "admin",
        name: "Admin",
        isEmailVerified: true,
      });
      
      await admin.save();
      console.log("✅ Admin account created successfully!");
    }
 
    console.log("\nAdmin Credentials:");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log("\n⚠️  IMPORTANT: Change this password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing admin:", error);
    process.exit(1);
  }
};

initAdmin();