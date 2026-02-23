// Navbar component
import React, { useEffect, useState } from "react";
import { Search, ChevronDown, User, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUtils";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";

export const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) {
        setNotifications([]);
        return;
      }
      // Ensure we have a valid user ID
      const userId = user.id || user._id;
      if (!userId) {
        return;
      }

      try {
        setLoadingNotifications(true);
        const response = await userService.getNotifications(userId);
        const notifs =
          response.data?.notifications ||
          response.data?.data?.notifications ||
          [];
        setNotifications(notifs);
      } catch (error) {
        console.error("Failed to load notifications", error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotifications();
  }, [user]);

  const handleOpenNotifications = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setShowNotifications((prev) => !prev);

    // Optimistically mark all as read
    if (unreadCount > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      try {
        const userId = user.id || user._id;
        if (userId) {
          await userService.markAllNotificationsRead(userId);
        }
      } catch (error) {
        console.error("Failed to mark notifications as read", error);
      }
    }
  };

  return (
    <header className="h-20 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by location, city, or zip..."
            className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            onKeyDown={(e) => e.key === "Enter" && navigate("/search")}
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={handleOpenNotifications}
            className="relative p-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Bell className="text-slate-500" size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white shadow-lg rounded-2xl border border-slate-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Notifications
                </span>
                {loadingNotifications && (
                  <span className="text-[10px] text-slate-400">Loading...</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-400 text-center">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`px-4 py-3 text-sm border-b border-slate-50 ${
                        !n.read ? "bg-slate-50" : ""
                      }`}
                    >
                      <p className="font-semibold text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleString()
                          : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => navigate("/tenant/dashboard")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              window.location.pathname.includes("tenant")
                ? "bg-white shadow-sm text-primary"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Tenant
          </button>
          <button
            onClick={() => navigate("/owner/dashboard")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              window.location.pathname.includes("owner")
                ? "bg-white shadow-sm text-primary"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Owner
          </button>
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                window.location.pathname.includes("admin")
                  ? "bg-white shadow-sm text-primary"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Admin
            </button>
          )}
        </div>

        <div
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary">
            {user?.avatar ? (
              <img
                src={getImageUrl(user.avatar)}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User size={16} />
            )}
          </div>
          <p className="text-sm font-bold text-slate-700 hidden md:block">
            {user?.name || "Profile"}
          </p>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
