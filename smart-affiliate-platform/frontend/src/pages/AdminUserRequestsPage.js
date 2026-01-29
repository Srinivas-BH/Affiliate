import React, { useEffect, useState } from "react";
import AdminNavbar from "../components/AdminNavbar";
import api from "../utils/api";
import { Link } from "react-router-dom";

const AdminUserRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); // "active" or "completed"

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/requests/admin/all");
      if (res.data.success) {
        setRequests(res.data.requests);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- FILTERING LOGIC ---
  // 1. Active (Pending): Not fulfilled yet
  const activeRequests = requests.filter((r) => !r.isFulfilled);
  
  // 2. Completed (Fulfilled): Already matched with a product
  const completedRequests = requests.filter((r) => r.isFulfilled);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">User Requests</h1>

        {/* --- TABS --- */}
        <div className="flex space-x-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`pb-2 px-4 text-sm font-medium transition-colors duration-200 ${
              activeTab === "active"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Active (Pending)
            <span className="ml-2 bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full text-xs">
              {activeRequests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`pb-2 px-4 text-sm font-medium transition-colors duration-200 ${
              activeTab === "completed"
                ? "border-b-2 border-green-600 text-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Fulfilled (Completed)
            <span className="ml-2 bg-green-100 text-green-800 py-0.5 px-2 rounded-full text-xs">
              {completedRequests.length}
            </span>
          </button>
        </div>

        {/* --- CONTENT --- */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* RENDER BASED ON ACTIVE TAB */}
            {(activeTab === "active" ? activeRequests : completedRequests).length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No {activeTab} requests found.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {(activeTab === "active" ? activeRequests : completedRequests).map((request) => (
                  <li key={request._id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              request.isFulfilled
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {request.isFulfilled ? "COMPLETED" : "PENDING"}
                          </span>
                          <span className="text-sm text-gray-500">
                            Requested by: <span className="font-medium">{request.userEmail}</span>
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-gray-900 font-medium text-lg mb-2">"{request.query}"</p>

                        {/* Extracted Tags */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {request.parsedTags.category && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              Category: {request.parsedTags.category}
                            </span>
                          )}
                          {request.parsedTags.maxPrice && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              Max Price: ₹{request.parsedTags.maxPrice}
                            </span>
                          )}
                        </div>

                        {/* --- COMPLETED TAB CONTENT (Matched Product) --- */}
                        {activeTab === "completed" && request.matchedProducts && request.matchedProducts.length > 0 && (
                          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h4 className="text-sm font-bold text-green-800 mb-2">✅ Fulfilled by:</h4>
                            {request.matchedProducts.map((prodId) => (
                              // Note: If populate() is used in backend, prodId will be an object. 
                              // If not, it's a string ID. Assuming object here or logic to fetch.
                              // For simplicity, usually matchedProducts is populated.
                              <div key={typeof prodId === 'object' ? prodId._id : prodId} className="text-sm text-gray-700">
                                {typeof prodId === 'object' ? (
                                  <Link to={`/product/${prodId._id}`} className="text-blue-600 hover:underline">
                                    {prodId.title}
                                  </Link>
                                ) : (
                                  <span>Product ID: {prodId}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Button (Only for Active Tab) */}
                      {activeTab === "active" && (
                        <div className="ml-4">
                           <Link 
                             to={`/admin/products?category=${request.parsedTags.category || ''}`}
                             className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                           >
                             Find Product
                           </Link>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserRequestsPage;