const User = require("../models/User");
const { generateToken } = require("../utils/tokenUtils");
const { sendOTPEmail, sendWelcomeEmail } = require("../utils/mailer");
const bcrypt = require("bcryptjs");

// Admin Email Config
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "discyra2026@gmail.com").toLowerCase().trim();

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Helper: Strict Email Validation
 */
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Step 1: Initiate Login (Check Email & Send OTP if User)
 */
exports.initiateLogin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!validateEmail(email)) return res.status(400).json({ error: "Invalid email format" });

    const cleanEmail = email.toLowerCase().trim();

    // CASE 1: Admin Login
    if (cleanEmail === ADMIN_EMAIL) {
      return res.json({
        success: true,
        mode: "PASSWORD", // Tell frontend to show password field
        message: "Please enter admin password",
      });
    }

    // CASE 2: User Login (OTP Flow)
    let user = await User.findOne({ email: cleanEmail });

    // Auto-register if new user
    if (!user) {
      user = await User.create({
        email: cleanEmail,
        role: "user",
        isEmailVerified: false,
      });
      // Optional: Send welcome email in background
      sendWelcomeEmail(cleanEmail, "").catch(err => console.error("Welcome email error:", err.message));
    }

    // Generate & Save OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP Email
    try {
      await sendOTPEmail(cleanEmail, otp);
      console.log(`✅ Login OTP sent to ${cleanEmail}`);
    } catch (err) {
      console.error("❌ Failed to send OTP:", err.message);
      return res.status(500).json({ error: "Failed to send verification email. Please try again." });
    }

    return res.json({
      success: true,
      mode: "OTP", // Tell frontend to show OTP field
      message: `Verification code sent to ${cleanEmail}`,
    });

  } catch (error) {
    console.error("Initiate login error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Step 2: Finalize Login (Verify Password or OTP)
 */
exports.login = async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Admin Verification
    if (cleanEmail === ADMIN_EMAIL) {
      if (!password) return res.status(400).json({ error: "Password required for admin" });

      const admin = await User.findOne({ email: cleanEmail });
      if (!admin) return res.status(401).json({ error: "Admin account not found" });

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) return res.status(401).json({ error: "Invalid admin credentials" });

      const token = generateToken(admin);
      return res.json({
        success: true,
        token,
        user: { id: admin._id, email: admin.email, role: "admin", name: admin.name },
      });
    }

    // 2. User Verification
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!otp) return res.status(400).json({ error: "OTP is required" });

    // Verify OTP
    if (!user.otp || user.otp !== otp) {
      return res.status(401).json({ error: "Invalid verification code" });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(401).json({ error: "Verification code expired" });
    }

    // Clear OTP & Verify Email status
    user.otp = null;
    user.otpExpiry = null;
    user.isEmailVerified = true;
    await user.save();

    const token = generateToken(user);
    return res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, role: "user", name: user.name },
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ... (Keep existing forgotPassword, resetPassword, etc. exactly as they were) ...
// Copy-paste the rest of your existing controller functions below here
// (forgotPassword, resetPassword, getCurrentUser, updateProfile, setupAdmin, checkAdminStatus)

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: "If email exists, OTP will be sent" });
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();
    try { await sendOTPEmail(email, otp); } catch (err) { console.error(err); }
    res.json({ success: true, message: "OTP sent successfully." });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: "All fields required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.otp || user.otp !== otp) return res.status(401).json({ error: "Invalid OTP" });
    if (new Date() > user.otpExpiry) return res.status(401).json({ error: "OTP expired" });
    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -otp");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, preferences } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, phone, preferences }, { new: true });
    res.json({ success: true, message: "Profile updated", user });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.setupAdmin = async (req, res) => {
  try {
    const { password, name } = req.body;
    const adminEmail = (process.env.ADMIN_EMAIL || "discyra2026@gmail.com").toLowerCase().trim();
    if (!password) return res.status(400).json({ error: "Password is required" });
    let admin = await User.findOne({ email: adminEmail });
    if (admin && admin.password) return res.status(403).json({ error: "Admin already initialized." });
    if (!admin) {
      admin = new User({ email: adminEmail, role: "admin", name: name || "Admin", isEmailVerified: true });
    } else {
      admin.name = name || admin.name || "Admin";
      admin.role = "admin";
    }
    admin.password = password;
    await admin.save();
    res.json({ success: true, message: "Admin setup success", admin: { id: admin._id, email: admin.email, role: admin.role } });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.checkAdminStatus = async (req, res) => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "discyra2026@gmail.com").toLowerCase().trim();
    const admin = await User.findOne({ email: adminEmail });
    res.json({ success: true, isAdminSetup: !!(admin && admin.password), adminEmail });
  } catch (error) { res.status(500).json({ error: error.message }); }
};