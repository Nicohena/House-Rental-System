import React, { useState } from "react";
import { Bell, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import toast from "react-hot-toast";

const PreferencesSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    marketingEmails: false,
  });

  const handleToggle = async (key) => {
    // Use user.id (from getPublicProfile) not user._id
    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    const newValue = !preferences[key];

    try {
      setLoading(true);
      setPreferences((prev) => ({
        ...prev,
        [key]: newValue,
      }));

      // Auto-save to backend
      await userService.updatePreferences(userId, {
        [key]: newValue,
      });

      toast.success("Preferences updated");
    } catch (error) {
      // Revert on error
      setPreferences((prev) => ({
        ...prev,
        [key]: !newValue,
      }));
      console.error("Preferences update error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update preferences",
      );
    } finally {
      setLoading(false);
    }
  };

  const preferenceItems = [
    {
      key: "emailNotifications",
      icon: Bell,
      title: "Email Notifications",
      description: "Receive updates about your booking requests.",
    },
    {
      key: "marketingEmails",
      icon: Mail,
      title: "Marketing Emails",
      description: "Receive offers and new listing alerts.",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Preferences</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage your app experience settings.
        </p>
      </div>

      <div className="space-y-6">
        {preferenceItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.title}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
              <label className="toggle-switch ml-4">
                <input
                  type="checkbox"
                  checked={preferences[item.key]}
                  onChange={() => handleToggle(item.key)}
                  disabled={loading}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PreferencesSettings;
