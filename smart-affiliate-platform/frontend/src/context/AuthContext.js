import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await api.get("/auth/me");
          setUser(response.user);
          localStorage.setItem("user", JSON.stringify(response.user));
        } catch (error) {
          if (error.response?.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token]);

  // Step 1: Initiate Login (Check Email)
  const initiateLogin = async (email) => {
    try {
      const response = await api.post("/auth/login-init", { email });
      return response; // Returns { mode: 'PASSWORD' | 'OTP', message: ... }
    } catch (error) {
      console.error("Initiate login error:", error);
      throw error;
    }
  };

  // Step 2: Finalize Login (Verify)
  const login = async (email, password = null, otp = null) => {
    try {
      const response = await api.post("/auth/login", { email, password, otp });
      
      if (!response || !response.token || !response.user) {
        throw new Error("Invalid response from server");
      }
      
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      
      setToken(response.token);
      setUser(response.user);
      
      return response;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const forgotPassword = async (email) => {
    return api.post("/auth/forgot-password", { email });
  };

  const resetPassword = async (email, otp, newPassword) => {
    return api.post("/auth/reset-password", { email, otp, newPassword });
  };

  const updateProfile = async (data) => {
    const response = await api.put("/auth/profile", data);
    setUser(response.user);
    localStorage.setItem("user", JSON.stringify(response.user));
    return response;
  };

  const checkIsAdmin = () => {
    if (user?.role === "admin") return true;
    if (!user && token) {
      try {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          return parsedUser?.role === "admin";
        }
      } catch (e) {}
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        initiateLogin, // [NEW]
        login,
        logout,
        forgotPassword,
        resetPassword,
        updateProfile,
        isLoggedIn: !!token,
        isAdmin: checkIsAdmin(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};