import React, { useState, useEffect } from "react";
import api from "../utils/api";
import AdminNavbar from "../components/AdminNavbar";

export default function AdminUsersListPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/auth/admin/users-list")
      .then(res => {
        setUsers(res.users || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">👥 User Directory</h1>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Joined On</th>
                <th className="px-6 py-4">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-blue-50/50">
                  <td className="px-6 py-4 font-medium text-blue-600">{u.email}</td>
                  <td className="px-6 py-4 text-gray-700">{u.name || "N/A"}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {u.lastActive ? new Date(u.lastActive).toLocaleString() : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="p-10 text-center text-gray-400">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
}