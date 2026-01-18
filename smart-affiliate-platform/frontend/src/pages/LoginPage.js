import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loginMode, setLoginMode] = useState("EMAIL"); // EMAIL, PASSWORD, OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  
  const { initiateLogin, login, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  // STEP 1: Submit Email
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // Call backend to check if Admin (Password) or User (OTP)
      const response = await initiateLogin(email);
      
      if (response.mode === "PASSWORD") {
        setLoginMode("PASSWORD");
        setMessage(""); // Admin doesn't need a message
      } else if (response.mode === "OTP") {
        setLoginMode("OTP");
        setMessage(response.message); // "Verification code sent to..."
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to verify email");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify Credentials (Password or OTP)
  const handleFinalLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Pass both; backend checks which one to use based on email
      const response = await login(email, password, otp);
      
      if (response.user.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
      setLoading(false);
    }
  };

  const handleBack = () => {
    setLoginMode("EMAIL");
    setPassword("");
    setOtp("");
    setError("");
    setMessage("");
  };

  if (authLoading) return <div className="text-center p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl">🛍️</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">DIS-CYRA</h1>
          <p className="text-blue-100 text-lg mt-2">Login to continue</p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md">
            <p className="font-semibold">⚠️ Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {message && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md">
            <p className="font-semibold">✅ Check your email</p>
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* --- FORM 1: EMAIL INPUT --- */}
        {loginMode === "EMAIL" && (
          <form className="space-y-6 bg-white rounded-2xl shadow-2xl p-8" onSubmit={handleEmailSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">📧 Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                placeholder="Enter your email"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-lg transition shadow-lg disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Continue"}
            </button>
          </form>
        )}

        {/* --- FORM 2: PASSWORD INPUT (ADMIN) --- */}
        {loginMode === "PASSWORD" && (
          <form className="space-y-6 bg-white rounded-2xl shadow-2xl p-8" onSubmit={handleFinalLogin}>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-700 font-semibold">🔐 Admin Login</p>
              <p className="text-xs text-blue-600 mt-1">{email}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">🔒 Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleBack} className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg">Back</button>
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-lg">
                {loading ? "Logging in..." : "Login"}
              </button>
            </div>
          </form>
        )}

        {/* --- FORM 3: OTP INPUT (USER) --- */}
        {loginMode === "OTP" && (
          <form className="space-y-6 bg-white rounded-2xl shadow-2xl p-8" onSubmit={handleFinalLogin}>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-4">
              <p className="text-sm text-green-700 font-semibold">🛡️ Verify it's you</p>
              <p className="text-xs text-green-600 mt-1">We sent a code to {email}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">🔢 Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} // Numbers only
                required
                maxLength="6"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition text-center text-2xl tracking-widest"
                placeholder="123456"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleBack} className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg">Back</button>
              <button type="submit" disabled={loading} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 shadow-lg">
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}