import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function AdminSetupPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("Admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isAlreadySetup, setIsAlreadySetup] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumbers: false,
    hasSpecialChars: false,
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await api.get("/auth/admin-status");
      if (response.isAdminSetup) {
        setIsAlreadySetup(true);
        setError("Admin account is already initialized. Please login instead.");
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const validatePasswordStrength = (pwd) => {
    const requirements = {
      minLength: pwd.length >= 12,
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumbers: /[0-9]/.test(pwd),
      hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    };

    setPasswordRequirements(requirements);
    return Object.values(requirements).every((req) => req);
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    validatePasswordStrength(pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!password || !confirmPassword || !name) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!Object.values(passwordRequirements).every((req) => req)) {
      setError("Password does not meet strength requirements");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/setup-admin", {
        password,
        name,
      });

      setSuccess("Admin account setup successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.error || "Failed to setup admin account");
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (isAlreadySetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2">Already Setup</h1>
          <p className="text-gray-600 mb-6">Admin account is already initialized.</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center py-12 px-4">
      {/* Animated background shapes */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl">👑</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Admin Setup</h1>
          <p className="text-blue-100">Initialize your secure admin account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md">
            <p className="font-semibold">⚠️ Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md animate-bounce">
            <p className="font-semibold">✅ Success</p>
            <p className="text-sm">{success}</p>
          </div>
        )}

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
            {/* Admin Email Display */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📧 Admin Email
              </label>
              <input
                type="email"
                value="discyra2026@gmail.com"
                disabled
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Default admin email (fixed)</p>
            </div>

            {/* Admin Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                👤 Admin Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter admin name"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔐 Secure Password
              </label>
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Create a strong password"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ✓ Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
          </div>

          {/* Password Requirements */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">
              🔒 Password Strength Requirements
            </h3>
            <div className="space-y-2">
              <RequirementCheck
                met={passwordRequirements.minLength}
                label="At least 12 characters"
              />
              <RequirementCheck
                met={passwordRequirements.hasUpperCase}
                label="At least one UPPERCASE letter (A-Z)"
              />
              <RequirementCheck
                met={passwordRequirements.hasLowerCase}
                label="At least one lowercase letter (a-z)"
              />
              <RequirementCheck
                met={passwordRequirements.hasNumbers}
                label="At least one number (0-9)"
              />
              <RequirementCheck
                met={passwordRequirements.hasSpecialChars}
                label="At least one special character (!@#$%^&*)"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !Object.values(passwordRequirements).every((req) => req)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 active:scale-95 shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Setting up...
              </span>
            ) : (
              "🚀 Setup Admin Account"
            )}
          </button>
        </form>

        {/* Info Box */}
        <div className="bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl p-4 backdrop-blur-md">
          <p className="text-white text-sm">
            <strong>ℹ️ Note:</strong> This setup page is only accessible once. After setup, use the login page with your credentials.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Requirement Check Component
 */
function RequirementCheck({ met, label }) {
  return (
    <div className="flex items-center space-x-2">
      <div
        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
          met
            ? "bg-green-500 text-white"
            : "bg-gray-300 text-gray-500"
        }`}
      >
        {met ? (
          <span className="text-xs font-bold">✓</span>
        ) : (
          <span className="text-xs font-bold">○</span>
        )}
      </div>
      <span className={`text-sm ${met ? "text-green-700 font-semibold" : "text-gray-600"}`}>
        {label}
      </span>
    </div>
  );
}
