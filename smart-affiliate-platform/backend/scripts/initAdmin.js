require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const ADMIN_EMAIL = "discyra2026@gmail.com";
const ADMIN_PASS = "SBHaff$2706";

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) admin = new User({ email: ADMIN_EMAIL });
  
  admin.password = ADMIN_PASS;
  admin.role = "admin";
  admin.name = "Super Admin";
  admin.isEmailVerified = true;
  
  await admin.save();
  console.log("✅ Admin Setup Complete:", ADMIN_EMAIL);
  process.exit();
})();