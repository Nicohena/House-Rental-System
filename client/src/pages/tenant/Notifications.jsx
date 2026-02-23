import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Bell, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await userService.getNotifications(user.id);
        const list =
          response.data?.notifications || response.data?.data?.notifications || [];
        setNotifications(list);
        setError(null);
      } catch (err) {
        console.error("Failed to load notifications", err);
        setError(
          err.response?.data?.message ||
            "Failed to load notifications. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user || notifications.length === 0) return;
    try {
      setMarkingAll(true);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await userService.markAllNotificationsRead(user.id);
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
      alert(
        err.response?.data?.message ||
          "Something went wrong while updating notifications.",
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Bell className="text-primary" />
              <span>Notifications</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Stay up to date with activity on your account.
            </p>
          </div>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll || unreadCount === 0}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-slate-500 font-medium">
              Loading your notifications...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center font-bold">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg font-bold mb-2">
              You have no notifications yet.
            </p>
            <p className="text-slate-400 text-sm">
              Activity like saved homes and bookings will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  !n.read ? "bg-slate-50" : ""
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                </div>
                <div className="text-right text-xs text-slate-400 whitespace-nowrap">
                  {n.createdAt
                    ? new Date(n.createdAt).toLocaleString()
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;

