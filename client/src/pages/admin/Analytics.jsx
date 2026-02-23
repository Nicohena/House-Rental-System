import React, { useState, useEffect } from "react";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Users,
  Home,
  CalendarCheck,
  DollarSign,
  ShieldCheck,
  BarChart3,
  Loader2,
  ArrowLeft,
} from "lucide-react";

const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}
      >
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  </div>
);

const BreakdownCard = ({ title, data, colorMap }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
    <h3 className="font-bold text-slate-900 mb-4">{title}</h3>
    <div className="space-y-3">
      {Object.entries(data || {}).map(([key, count]) => (
        <div key={key} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${colorMap?.[key] || "bg-slate-300"}`}
            />
            <span className="text-sm text-slate-600 capitalize">{key}</span>
          </div>
          <span className="font-bold text-slate-900">{count}</span>
        </div>
      ))}
      {(!data || Object.keys(data).length === 0) && (
        <p className="text-sm text-slate-400">No data yet</p>
      )}
    </div>
  </div>
);

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsData, statsData] = await Promise.all([
        adminService.getAnalytics(),
        adminService.getStats(),
      ]);
      setAnalytics(analyticsData?.data || analyticsData);
      setStats(statsData?.data || statsData);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const roleColors = {
    tenant: "bg-blue-400",
    owner: "bg-emerald-400",
    admin: "bg-purple-400",
  };

  const statusColors = {
    pending: "bg-yellow-400",
    approved: "bg-emerald-400",
    rejected: "bg-red-400",
    cancelled: "bg-slate-400",
    completed: "bg-blue-400",
  };

  const typeColors = {
    apartment: "bg-blue-400",
    house: "bg-emerald-400",
    condo: "bg-purple-400",
    townhouse: "bg-orange-400",
    studio: "bg-pink-400",
    room: "bg-yellow-400",
    unspecified: "bg-slate-400",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <span className="ml-3 text-slate-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  const overview = analytics?.overview || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-sm text-slate-500 mt-1">
                Platform performance overview
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {["7d", "30d", "90d", "1y"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  period === p
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {p === "7d"
                  ? "7 Days"
                  : p === "30d"
                    ? "30 Days"
                    : p === "90d"
                      ? "90 Days"
                      : "1 Year"}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <StatCard
            icon={Users}
            label="Total Users"
            value={overview.totalUsers || 0}
            color="bg-blue-500"
          />
          <StatCard
            icon={Home}
            label="Total Houses"
            value={overview.totalHouses || 0}
            color="bg-emerald-500"
          />
          <StatCard
            icon={CalendarCheck}
            label="Total Bookings"
            value={overview.totalBookings || 0}
            color="bg-purple-500"
          />
          <StatCard
            icon={ShieldCheck}
            label="Pending Verifications"
            value={overview.pendingVerifications || 0}
            color="bg-yellow-500"
          />
          <StatCard
            icon={DollarSign}
            label="Revenue"
            value={`ETB ${(overview.revenue || 0).toLocaleString()}`}
            color="bg-green-500"
            subtext={`${overview.transactions || 0} transactions`}
          />
          <StatCard
            icon={TrendingUp}
            label="Period"
            value={period.toUpperCase()}
            color="bg-indigo-500"
          />
        </div>

        {/* Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <BreakdownCard
            title="Users by Role"
            data={stats?.usersByRole}
            colorMap={roleColors}
          />
          <BreakdownCard
            title="Bookings by Status"
            data={stats?.bookingsByStatus}
            colorMap={statusColors}
          />
          <BreakdownCard
            title="Houses by Type"
            data={stats?.housesByType}
            colorMap={typeColors}
          />
        </div>

        {/* Recent Activity */}
        {stats?.recentActivity?.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 size={18} /> Recent Activity (24h)
            </h3>
            <div className="space-y-3">
              {stats.recentActivity.map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900">
                      {log.action?.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      by {log.performedBy?.name || "System"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
