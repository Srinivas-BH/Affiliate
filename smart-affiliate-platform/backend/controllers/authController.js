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
 * Decides if we need a Password (Admin) or OTP (User)
 */
exports.initiateLogin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!validateEmail(email)) return res.status(400).json({ error: "Invalid email format" });

    const cleanEmail = email.toLowerCase().trim();

    // CASE 1: Admin Login -> Request Password
    if (cleanEmail === ADMIN_EMAIL) {
      return res.json({
        success: true,
        mode: "PASSWORD",
        message: "Please enter admin password",
      });
    }

    // CASE 2: User Login -> Send OTP
    let user = await User.findOne({ email: cleanEmail });

    // Auto-create user if not exists
    if (!user) {
      user = await User.create({
        email: cleanEmail,
        role: "user",
        isEmailVerified: false,
      });
      // Send welcome email in background
      sendWelcomeEmail(cleanEmail, "").catch(e => console.error("Welcome email failed", e));
    }

    // Generate & Save OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    // Send OTP Email
    try {
      await sendOTPEmail(cleanEmail, otp);
      console.log(`✅ Login OTP sent to ${cleanEmail}`);
    } catch (err) {
      console.error(`❌ Failed to send OTP to ${cleanEmail}:`, err.message);
      return res.status(500).json({ error: "Could not send verification code. Check email settings." });
    }

    return res.json({
      success: true,
      mode: "OTP",
      message: `Verification code sent to ${cleanEmail}`,
    });

  } catch (error) {
    console.error("Initiate Login Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * STEP 2: Finalize Login
 * Verifies Password (Admin) or OTP (User)
 */
exports.login = async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // --- ADMIN VERIFICATION ---
    if (cleanEmail === ADMIN_EMAIL) {
      if (!password) return res.status(400).json({ error: "Password required for Admin" });

      const admin = await User.findOne({ email: cleanEmail });
      if (!admin) return res.status(401).json({ error: "Admin not initialized. Run initAdmin script." });

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) return res.status(401).json({ error: "Invalid Admin Password" });

      const token = generateToken(admin);
      return res.json({
        success: true,
        token,
        user: { id: admin._id, email: admin.email, role: "admin", name: admin.name },
      });
    }

    // --- USER VERIFICATION ---
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!otp) return res.status(400).json({ error: "Verification Code (OTP) is required" });

    // Verify OTP
    if (user.otp !== otp) return res.status(401).json({ error: "Invalid Verification Code" });
    if (new Date() > user.otpExpiry) return res.status(401).json({ error: "Code expired. Please try again." });

    // Success: Clear OTP & Login
    user.otp = null;
    user.otpExpiry = null;
    user.isEmailVerified = true;
    
    // SECURITY: Ensure old admin email is demoted if logging in via OTP flow
    if (user.role === 'admin') user.role = 'user'; 
    
    await user.save();

    const token = generateToken(user);
    return res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, role: "user", name: user.name },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// --- KEEP EXISTING FUNCTIONS ---
exports.forgotPassword = async (req, res) => {
  /* Copy existing forgotPassword logic from previous version */
  // Shortened for brevity - logic remains: find user -> send OTP
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: "OTP sent if email exists" });
    
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10*60*1000);
    await user.save();
    try { await sendOTPEmail(email, otp); } catch(e) {}
    res.json({ success: true, message: "OTP sent" });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.resetPassword = async (req, res) => {
  /* Copy existing resetPassword logic */
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
  const user = await User.findById(req.user.id).select("-password -otp");
  res.json({ success: true, user });
};

exports.updateProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true });
  res.json({ success: true, user });
};

exports.setupAdmin = async (req, res) => {
  // Logic to set up admin password initially if needed
  // (Usually handled by initAdmin script, but kept for compatibility)
  res.status(403).json({ error: "Use server script to setup admin" });
};

exports.checkAdminStatus = async (req, res) => {
  const admin = await User.findOne({ email: ADMIN_EMAIL });
  res.json({ success: true, isAdminSetup: !!(admin && admin.password) });
};