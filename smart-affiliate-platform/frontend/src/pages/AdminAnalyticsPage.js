import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import AdminNavbar from "../components/AdminNavbar";

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProducts: 0,
    totalRequests: 0,
    detailedProductStats: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [userRes, productRes, requestRes] = await Promise.all([
        api.get("/auth/admin/stats").catch(() => ({ stats: { totalUsers: 0, activeUsers: 0 } })),
        api.get("/products/admin/stats").catch(() => ({ stats: [] })),
        api.get("/requests/admin/stats").catch(() => ({ stats: { byStatus: [] } })),
      ]);

      setAnalytics({
        totalUsers: userRes.stats?.totalUsers || 0,
        activeUsers: userRes.stats?.activeUsers || 0,
        totalProducts: productRes.stats?.length || 0,
        totalRequests: requestRes.stats?.byStatus?.reduce((acc, s) => acc + s.count, 0) || 0,
        detailedProductStats: productRes.stats || [],
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-2">
          📈 Platform Live Insights
        </h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* TOTAL USERS CARD - CLICKABLE */}
          <div 
            onClick={() => navigate("/admin/users")}
            className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500 cursor-pointer hover:bg-blue-50 transition-all transform hover:scale-105"
          >
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Total Users</p>
            <p className="text-3xl font-black text-gray-800">{analytics.totalUsers}</p>
            <p className="text-xs text-blue-600 mt-2 font-bold">View user list →</p>
          </div>

          {/* LIVE NOW CARD */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Live Now</p>
                <p className="text-3xl font-black text-green-600">{analytics.activeUsers}</p>
              </div>
              <div className="flex items-center">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Live Products</p>
            <p className="text-3xl font-black text-gray-800">{analytics.totalProducts}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">User Requests</p>
            <p className="text-3xl font-black text-gray-800">{analytics.totalRequests}</p>
          </div>
        </div>

        {/* Product Performance Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-10 border border-gray-100">
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Product Performance Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white text-gray-400 uppercase text-xs font-bold">
                <tr>
                  <th className="px-6 py-4 border-b">Platform</th>
                  <th className="px-6 py-4 border-b">Category</th>
                  <th className="px-6 py-4 border-b">Product Name</th>
                  <th className="px-6 py-4 border-b text-right">Avg Price</th>
                  <th className="px-6 py-4 border-b text-center">Views</th>
                  <th className="px-6 py-4 border-b text-center">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.detailedProductStats.map((item, index) => (
                  <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-700 uppercase">
                      {item.platform === "AMAZON" ? "🟠 AMAZON" : 
                       item.platform === "FLIPKART" ? "🔵 FLIPKART" : 
                       `📦 ${item.platform}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.category}</td>
                    
                    {/* Maps to the field projected from the backend */}
                    <td className="px-6 py-4 text-gray-900 font-semibold">{item.productName}</td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-blue-600">
                      ₹{item.avgPrice?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                      {item.totalViews || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                        {item.totalClicks || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}