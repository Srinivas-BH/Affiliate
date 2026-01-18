const express = require("express");
const {
  initiateLogin, // [NEW]
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  setupAdmin,
  checkAdminStatus,
} = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/login-init", initiateLogin); // [NEW] Step 1 of login
router.post("/login", login);              // Step 2 of login
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/setup-admin", setupAdmin);
router.get("/admin-status", checkAdminStatus);

// Protected routes
router.get("/me", authMiddleware, getCurrentUser);
router.put("/profile", authMiddleware, updateProfile);

module.exports = router;