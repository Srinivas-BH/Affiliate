/**
 * Initialize Admin Account Script
 * Sets up admin with email: discyra2026@gmail.com and password: ROXYaff$2706
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "discyra2026@gmail.com";
const ADMIN_PASSWORD = "ROXYaff$2706"; // Updated to your required password

const initAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/smart-affiliate";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    let admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase().trim() });

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
        email: ADMIN_EMAIL.toLowerCase().trim(),
        password: ADMIN_PASSWORD,
        role: "admin",
        name: "Admin",
        isEmailVerified: true,
      });
      
      await admin.save();
      console.log("✅ Admin account created successfully!");
    }
 
    console.log("\nAdmin Credentials Updated:");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing admin:", error);
    process.exit(1);
  }
};

initAdmin();