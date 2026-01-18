const User = require("../models/User");
const { generateToken } = require("../utils/tokenUtils");
const { sendOTPEmail, sendWelcomeEmail } = require("../utils/mailer");
const bcrypt = require("bcryptjs");

// [CONFIG] strict admin email
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "discyra2026@gmail.com").toLowerCase().trim();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * STEP 1: Initiate Login
 */
exports.initiateLogin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!validateEmail(email)) return res.status(400).json({ error: "Invalid email format" });

    const cleanEmail = email.toLowerCase().trim();

    if (cleanEmail === ADMIN_EMAIL) {
      return res.json({
        success: true,
        mode: "PASSWORD",
        message: "Please enter admin password",
      });
    }

    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      user = await User.create({
        email: cleanEmail,
        role: "user",
        isEmailVerified: false,
      });
      sendWelcomeEmail(cleanEmail, "").catch(e => console.error("Welcome email failed", e));
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 
    await user.save();

    try {
      await sendOTPEmail(cleanEmail, otp);
      console.log(`✅ Login OTP sent to ${cleanEmail}`);
    } catch (err) {
      return res.status(500).json({ error: "Could not send verification code." });
    }

    return res.json({
      success: true,
      mode: "OTP",
      message: `Verification code sent to ${cleanEmail}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * STEP 2: Finalize Login
 */
exports.login = async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    if (cleanEmail === ADMIN_EMAIL) {
      const admin = await User.findOne({ email: cleanEmail });
      if (!admin) return res.status(401).json({ error: "Admin not initialized." });

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) return res.status(401).json({ error: "Invalid Admin Password" });

      admin.lastActive = new Date();
      await admin.save();

      const token = generateToken(admin);
      return res.json({
        success: true,
        token,
        user: { id: admin._id, email: admin.email, role: "admin", name: admin.name },
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.otp !== otp) return res.status(401).json({ error: "Invalid Code" });
    if (new Date() > user.otpExpiry) return res.status(401).json({ error: "Code expired" });

    user.otp = null;
    user.otpExpiry = null;
    user.isEmailVerified = true;
    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user);
    return res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, role: "user", name: user.name },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * NEW: Get User Statistics for Admin Analytics
 */
exports.getAdminUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsers = await User.countDocuments({
      role: "user",
      lastActive: { $gte: fiveMinutesAgo }
    });

    res.json({
      success: true,
      stats: { totalUsers, activeUsers }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * NEW: Fetch all users for the admin list
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password -otp").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * NEW: Heartbeat Tracker Logic
 */
exports.handleHeartbeat = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { lastActive: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: "OTP sent if email exists" });
    
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    try { await sendOTPEmail(email, otp); } catch (e) {}
    res.json({ success: true, message: "OTP sent" });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.otp !== otp) return res.status(400).json({ error: "Invalid/Expired OTP" });
    user.password = newPassword;
    user.otp = null;
    await user.save();
    res.json({ success: true, message: "Password reset" });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -otp");
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true });
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.checkAdminStatus = async (req, res) => {
  try {
    const admin = await User.findOne({ email: ADMIN_EMAIL });
    res.json({ success: true, isAdminSetup: !!(admin && admin.password) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};