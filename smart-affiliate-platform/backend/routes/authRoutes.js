const express = require("express");
const {
  initiateLogin,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  checkAdminStatus,
  getAdminUserStats,
  handleHeartbeat,
  getAllUsers
} = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/login-init", initiateLogin);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/admin-status", checkAdminStatus);

// Protected routes
router.get("/me", authMiddleware, getCurrentUser);
router.put("/profile", authMiddleware, updateProfile);
router.post("/heartbeat", authMiddleware, handleHeartbeat);
router.get("/admin/stats", authMiddleware, getAdminUserStats);
router.get("/admin/users-list", authMiddleware, getAllUsers);

module.exports = router;