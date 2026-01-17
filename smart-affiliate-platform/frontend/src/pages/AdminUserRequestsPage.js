import React, { useState, useEffect } from "react";
import api from "../utils/api";
import AdminNavbar from "../components/AdminNavbar";

export default function AdminUserRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ACTIVE");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      // Fetch requests based on the filter (ACTIVE, FULFILLED, or ALL)
      const response = await api.get("/requests/admin/all", {
        params: { status: filter },
      });
      setRequests(response.requests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    try {
      setDeleting(true);
      await api.delete(`/requests/admin/${requestId}`);
      setDeleteConfirm(null);
      fetchRequests();
    } catch (error) {
      alert("Failed to delete request");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setDeleting(true);
      const params = filter ? { status: filter } : {};
      await api.delete("/requests/admin/delete/all", { params });
      setDeleteConfirm(null);
      fetchRequests();
    } catch (error) {
      alert("Failed to delete requests");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        
        {/* Header & Filter */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">📋 User Requests</h1>
          <div className="flex gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white shadow-sm font-medium"
            >
              <option value="ACTIVE">Active (Pending)</option>
              <option value="FULFILLED">Fulfilled (Completed)</option>
              <option value="">All Requests</option>
            </select>
            {requests.length > 0 && (
              <button
                onClick={() => setDeleteConfirm(`delete-all-${filter || "all"}`)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete All
              </button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
              <p className="mb-6 text-gray-600">Are you sure? This cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deleteConfirm.startsWith("delete-all") ? handleDeleteAll() : handleDeleteRequest(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request Cards */}
        <div className="space-y-6">
          {requests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500 text-lg">No {filter.toLowerCase()} requests found.</p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">"{request.naturalLanguageQuery}"</h3>
                    <p className="text-sm text-gray-500">User: {request.userEmail}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                    request.status === 'FULFILLED' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {request.status}
                  </span>
                </div>

                {/* AI Analysis Tags */}
                <div className="flex flex-wrap gap-2 mb-4 text-sm">
                  <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">
                    📂 {request.parsedTags?.category || "Unknown"}
                  </span>
                  <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">
                    💰 Max: {request.parsedTags?.maxPrice ? `₹${request.parsedTags.maxPrice}` : "Any"}
                  </span>
                  {request.parsedTags?.platforms?.map(p => (
                    <span key={p} className="bg-gray-100 px-2 py-1 rounded text-gray-700">🛒 {p}</span>
                  ))}
                </div>

                {/* --- FULFILLED PRODUCT SECTION --- */}
                {/* This section specifically shows the product that matched this request */}
                {request.matchedProducts && request.matchedProducts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                      ✅ Fulfilled by this product:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {request.matchedProducts.map((product) => (
                        <div key={product._id} className="flex items-start gap-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <img 
                            src={product.imageUrl || "https://via.placeholder.com/60"} 
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded bg-white" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate" title={product.title}>
                              {product.title}
                            </p>
                            <p className="text-sm text-green-600 font-bold">
                              ₹{product.price?.toLocaleString()}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-gray-500">{product.platform}</span>
                              <a 
                                href={product.affiliateLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-xs font-bold text-blue-600 hover:underline"
                              >
                                View Link
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 flex justify-between items-center">
                   <p className="text-xs text-gray-400">
                    Requested on: {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                   <button 
                    onClick={() => setDeleteConfirm(request._id)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    Remove Request
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}