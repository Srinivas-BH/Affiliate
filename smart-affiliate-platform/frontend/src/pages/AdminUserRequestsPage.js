import React, { useState, useEffect } from "react";
import api from "../utils/api";
import AdminNavbar from "../components/AdminNavbar";

export default function AdminUserRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ACTIVE");
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
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
      alert("Request deleted successfully");
    } catch (error) {
      console.error("Error deleting request:", error);
      alert("Failed to delete request");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setDeleting(true);
      const params = filter ? { status: filter } : {};
      const response = await api.delete("/requests/admin/delete/all", { params });
      setDeleteConfirm(null);
      fetchRequests();
      alert(
        `${response.deletedCount} request(s) deleted successfully`
      );
    } catch (error) {
      console.error("Error deleting requests:", error);
      alert("Failed to delete requests");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">📋 User Requests</h1>
          <div className="flex gap-4 items-center">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="">All</option>
            </select>
            {requests.length > 0 && (
              <button
                onClick={() =>
                  setDeleteConfirm(
                    `delete-all-${filter || "all"}`
                  )
                }
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                disabled={deleting}
              >
                🗑️ Delete All
              </button>
            )}
          </div>
        </div>

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                ⚠️ Confirm Delete
              </h2>
              <p className="text-gray-600 mb-6">
                {deleteConfirm.startsWith("delete-all")
                  ? `Are you sure you want to delete all ${
                      filter ? filter.toLowerCase() : ""
                    } requests? This action cannot be undone.`
                  : "Are you sure you want to delete this request? This action cannot be undone."}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirm.startsWith("delete-all")) {
                      handleDeleteAll();
                    } else {
                      handleDeleteRequest(deleteConfirm);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-md">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 text-xl">No requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request._id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      From: {request.userEmail}
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {request.naturalLanguageQuery}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        request.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : request.status === "FULFILLED"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {request.status}
                    </span>
                    <button
                      onClick={() => setDeleteConfirm(request._id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-semibold"
                      title="Delete this request"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Parsed Information:
                  </p>
                  <div className="grid md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold">Category:</span>{" "}
                      {request.parsedTags?.category || "Not specified"}
                    </div>
                    <div>
                      <span className="font-semibold">Max Price:</span>{" "}
                      {request.parsedTags?.maxPrice
                        ? `₹${request.parsedTags.maxPrice.toLocaleString()}`
                        : "No limit"}
                    </div>
                    <div>
                      <span className="font-semibold">Platforms:</span>{" "}
                      {request.parsedTags?.platforms?.length > 0
                        ? request.parsedTags.platforms.join(", ")
                        : "Any"}
                    </div>
                    <div>
                      <span className="font-semibold">Tags:</span>{" "}
                      {request.parsedTags?.tags?.join(", ") || "None"}
                    </div>
                  </div>
                </div>

                {request.matchedProducts?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Matched Products: {request.matchedProducts.length}
                    </p>
                    <p className="text-sm text-gray-600">
                      Notifications sent: {request.notificationsSent?.length || 0}
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-4">
                  Requested: {new Date(request.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
