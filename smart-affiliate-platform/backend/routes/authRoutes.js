const express = require("express");
const {
  initiateLogin, // [NEW]
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  checkAdminStatus,
} = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/login-init", initiateLogin); // Step 1: Check Email
router.post("/login", login);              // Step 2: Verify Password/OTP
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/admin-status", checkAdminStatus);

// Protected routes
router.get("/me", authMiddleware, getCurrentUser);
router.put("/profile", authMiddleware, updateProfile);

module.exports = router;