import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import Navbar from "../../components/layout/Navbar";
import { useNavigate } from "react-router-dom";
import { User, Shield, CreditCard, Bell, History } from "lucide-react";
import GeneralProfile from "../../components/settings/GeneralProfile";
import SecuritySettings from "../../components/settings/SecuritySettings";
import PaymentSettings from "../../components/settings/PaymentSettings";
import PreferencesSettings from "../../components/settings/PreferencesSettings";
import BookingHistorySettings from "../../components/settings/BookingHistorySettings";
import "../user/Settings.css";

const Profile = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const tabs = [
    { id: "general", label: "General Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "history", label: "Booking History", icon: History },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralProfile />;
      case "security":
        return <SecuritySettings />;
      case "payments":
        return <PaymentSettings />;
      case "notifications":
        return <PreferencesSettings />;
      case "history":
        return <BookingHistorySettings />;
      default:
        return <GeneralProfile />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Account Settings
        </h1>

        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <nav className="settings-nav">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`settings-nav-item ${
                        activeTab === tab.id ? "active" : ""
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Profile;
