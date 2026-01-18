import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [credential, setCredential] = useState(""); // Stores Password or OTP
  const [mode, setMode] = useState("EMAIL"); // 'EMAIL', 'PASSWORD', 'OTP'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  
  const { initiateLogin, login, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect if logged in
  useEffect(() => {
    if (user) navigate(isAdmin ? "/admin/dashboard" : "/dashboard", { replace: true });
  }, [user, isAdmin, navigate]);

  // Step 1: Submit Email
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(""); setMsg(""); setLoading(true);

    try {
      const res = await initiateLogin(email);
      setMode(res.mode); // Switches UI to Password or OTP input
      setMsg(res.message);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit Credential
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);

    try {
      // If Admin mode, send password. If User mode, send OTP.
      const password = mode === "PASSWORD" ? credential : null;
      const otp = mode === "OTP" ? credential : null;

      await login(email, password, otp);
      // Navigation handled by useEffect
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">DIS-CYRA</h1>
          <p className="text-gray-500">Secure Login</p>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        {msg && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{msg}</div>}

        {mode === "EMAIL" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">
              {loading ? "Checking..." : "Continue"}
            </button>
          </form>
        )}

        {(mode === "PASSWORD" || mode === "OTP") && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="bg-blue-50 p-3 rounded text-blue-800 text-sm font-semibold mb-2">
              Logging in as: {email}
            </div>
            
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                {mode === "PASSWORD" ? "Admin Password" : "Verification Code (OTP)"}
              </label>
              <input 
                type={mode === "PASSWORD" ? "password" : "text"}
                required
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                placeholder={mode === "PASSWORD" ? "••••••" : "123456"}
                value={credential}
                onChange={e => setCredential(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => { setMode("EMAIL"); setCredential(""); setMsg(""); setError(""); }}
                className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg"
              >
                Back
              </button>
              <button disabled={loading} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">
                {loading ? "Verifying..." : "Login"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}