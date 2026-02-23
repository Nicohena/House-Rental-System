import React, { useState, useEffect } from "react";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <div className="text-center p-20">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Admin Control Panel
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-500 font-medium">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.totalUsers || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-500 font-medium">Verified Houses</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.verifiedHouses || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500 font-medium">
              Pending Approvals
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.pendingHouses || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
            <p className="text-sm text-gray-500 font-medium">Total Bookings</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.totalBookings || 0}
            </p>
          </div>
        </div>

        {/* Management Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link
            to="/admin/listings"
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 block"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Listing Management
            </h2>
            <p className="text-gray-600 mb-4">
              Review, approve, or reject new house listings submitted by owners.
            </p>
            <span className="text-blue-600 font-semibold flex items-center">
              Go to Listings →
            </span>
          </Link>

          <Link
            to="/admin/users"
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 block"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              User Management
            </h2>
            <p className="text-gray-600 mb-4">
              Manage user accounts, roles, and permissions across the platform.
            </p>
            <span className="text-blue-600 font-semibold flex items-center">
              Go to Users →
            </span>
          </Link>

          <Link
            to="/admin/analytics"
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 block"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Analytics</h2>
            <p className="text-gray-600 mb-4">
              View platform performance, revenue trends, and usage statistics.
            </p>
            <span className="text-blue-600 font-semibold flex items-center">
              Go to Analytics →
            </span>
          </Link>

          <Link
            to="/admin/logs"
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 block"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Audit Logs
            </h2>
            <p className="text-gray-600 mb-4">
              Track all admin actions, verification decisions, and system
              events.
            </p>
            <span className="text-blue-600 font-semibold flex items-center">
              Go to Logs →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
