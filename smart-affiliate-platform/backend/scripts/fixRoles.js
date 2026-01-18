require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

// New Admin Credentials
const NEW_ADMIN_EMAIL = "discyra2026@gmail.com";
const OLD_ADMIN_EMAIL = "bhsrinivas94@gmail.com";
const ADMIN_PASSWORD = "SBHaff$2706";

const fixRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/smart-affiliate");
    console.log("Connected to MongoDB...");

    // 1. Demote Old Admin
    const oldAdmin = await User.findOne({ email: OLD_ADMIN_EMAIL });
    if (oldAdmin) {
      oldAdmin.role = "user"; // Demote to user
      oldAdmin.password = undefined; // Remove password (users are passwordless)
      await oldAdmin.save();
      console.log(`✅ Demoted ${OLD_ADMIN_EMAIL} to 'user' role.`);
    } else {
      console.log(`ℹ️ Old admin ${OLD_ADMIN_EMAIL} not found (no action needed).`);
    }

    // 2. Promote/Create New Admin
    let newAdmin = await User.findOne({ email: NEW_ADMIN_EMAIL });
    if (newAdmin) {
      newAdmin.role = "admin";
      newAdmin.password = ADMIN_PASSWORD;
      newAdmin.name = "Admin";
      await newAdmin.save();
      console.log(`✅ Updated ${NEW_ADMIN_EMAIL} to 'admin' role.`);
    } else {
      newAdmin = new User({
        email: NEW_ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: "admin",
        name: "Admin",
        isEmailVerified: true
      });
      await newAdmin.save();
      console.log(`✅ Created new admin ${NEW_ADMIN_EMAIL}.`);
    }

    console.log("\nDatabase roles fixed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing roles:", error);
    process.exit(1);
  }
};

fixRoles();