import React from "react";
import {
  Search,
  Heart,
  BookOpen,
  MessageSquare,
  Bell,
  CreditCard,
  Settings,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getImageUrl } from "../../utils/imageUtils";

const NavItem = ({ icon: Icon, label, active = false, count, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
      active
        ? "bg-primary text-white shadow-md"
        : "text-slate-500 hover:bg-slate-100"
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon
        size={20}
        className={active ? "text-white" : "group-hover:text-primary"}
      />
      <span className="font-semibold text-sm">{label}</span>
    </div>
    {count && (
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          active ? "bg-white/20 text-white" : "bg-red-500 text-white"
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="w-64 border-r border-slate-200 h-screen flex flex-col bg-white sticky top-0">
      <div className="p-6">
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-primary cursor-pointer"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm" />
          </div>
          <span className="text-xl font-black italic tracking-tighter uppercase">
            SmartRent
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-8 overflow-y-auto">
        {user?.role === "owner" ? (
          /* Owner Menu */
          <>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">
                Overview
              </p>
              <div className="space-y-1">
                <NavItem
                  icon={BookOpen}
                  label="Dashboard"
                  active={location.pathname === "/owner/dashboard"}
                  onClick={() => navigate("/owner/dashboard")}
                />
                <NavItem
                  icon={Search}
                  label="Listings"
                  active={location.pathname === "/owner/listings"}
                  onClick={() => navigate("/owner/listings")}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">
                Management
              </p>
              <div className="space-y-1">
                <NavItem
                  icon={BookOpen}
                  label="Bookings"
                  active={location.pathname === "/owner/bookings"}
                  onClick={() => navigate("/owner/bookings")}
                />
                <NavItem
                  icon={MessageSquare}
                  label="Messages"
                  active={location.pathname === "/messages"}
                  onClick={() => navigate("/messages")}
                  count={3}
                />
                <NavItem
                  icon={CreditCard}
                  label="Payments"
                  active={location.pathname === "/payments"}
                  onClick={() => navigate("/payments")}
                />
                <NavItem
                  icon={Settings}
                  label="Settings"
                  active={location.pathname === "/settings"}
                  onClick={() => navigate("/settings")}
                />
              </div>
            </div>
          </>
        ) : (
          /* Tenant Menu (Default) */
          <>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">
                Menu
              </p>
              <div className="space-y-1">
                <NavItem
                  icon={Search}
                  label="Explore"
                  active={location.pathname === "/search"}
                  onClick={() => navigate("/search")}
                />
                <NavItem
                  icon={Heart}
                  label="Saved Homes"
                  active={location.pathname === "/saved"}
                  onClick={() => navigate("/saved")}
                />
                <NavItem
                  icon={BookOpen}
                  label="My Bookings"
                  active={location.pathname === "/tenant/dashboard"}
                  onClick={() => navigate("/tenant/dashboard")}
                />
                <NavItem
                  icon={MessageSquare}
                  label="Messages"
                  active={location.pathname === "/messages"}
                  onClick={() => navigate("/messages")}
                  count={3}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">
                Preferences
              </p>
              <div className="space-y-1">
                <NavItem
                  icon={Bell}
                  label="Notifications"
                  active={location.pathname === "/notifications"}
                  onClick={() => navigate("/notifications")}
                />
                {user?.role !== "owner" && (
                  <NavItem
                    icon={CreditCard}
                    label="Payments"
                    active={location.pathname === "/payments"}
                    onClick={() => navigate("/payments")}
                  />
                )}
                <NavItem
                  icon={Settings}
                  label="Settings"
                  active={location.pathname === "/profile"}
                  onClick={() => navigate("/profile")}
                />
              </div>
            </div>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
          <div
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden cursor-pointer"
          >
            {user?.avatar ? (
              <img src={getImageUrl(user.avatar)} alt="User" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <UserIcon size={20} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {user?.name || "User Name"}
            </p>
            <p className="text-[10px] text-slate-500 font-medium uppercase">
              {user?.role || "Tenant"} Account
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
