import React, { useState, useRef, useEffect } from "react";
import { Camera, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import toast from "react-hot-toast";
import { getImageUrl } from "../../utils/imageUtils";

const GeneralProfile = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
  });

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log("[GeneralProfile] Component mounted");
    return () => console.log("[GeneralProfile] Component unmounted");
  }, []);

  useEffect(() => {
    console.log("[GeneralProfile] user changed:", user);
    if (user && !isInitialized) {
      console.log("[GeneralProfile] Initializing form with data:", user);
      setFormData({
        firstName: user.name?.split(" ")[0] || "",
        lastName: user.name?.split(" ").slice(1).join(" ") || "",
        email: user.email || "",
        phone: user.phone || "",
        bio: user.bio || "",
      });
      if (user.avatar) {
        setAvatarPreview(getImageUrl(user.avatar));
      }
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 800KB as per design)
      if (file.size > 800 * 1024) {
        toast.error("Image size must be less than 800KB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (JPG, GIF, or PNG)");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setLoading(true);
      await userService.removeAvatar();
      setAvatarPreview(null);
      setAvatarFile(null);
      toast.success("Avatar removed successfully");
      setUser({ ...user, avatar: null });
    } catch (error) {
      console.error("Remove avatar error:", error);
      if (error.response?.status === 404) {
        toast.error("Avatar removal not available on this server");
      } else {
        toast.error(error.response?.data?.message || "Failed to remove avatar");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    try {
      setLoading(true);

      // Try to upload avatar if changed (optional - may not be implemented on backend)
      if (avatarFile) {
        try {
          const avatarFormData = new FormData();
          avatarFormData.append("avatar", avatarFile);
          await userService.uploadAvatar(avatarFormData);
          toast.success("Avatar uploaded successfully");
        } catch (avatarError) {
          // If avatar upload fails, continue with profile update
          console.warn("Avatar upload not available:", avatarError);
          if (avatarError.response?.status !== 404) {
            toast.error(
              "Avatar upload failed, but continuing with profile update",
            );
          }
        }
      }

      // Update profile
      const updateData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone,
        bio: formData.bio,
      };
      console.log("[GeneralProfile] Submitting update:", updateData);
      // Update profile - use user.id (from getPublicProfile) or fallback to _id
      const userId = user?.id || user?._id;

      if (!userId) {
        console.error("User ID not found in context:", user);
        toast.error("User ID missing. Please try logging in again.");
        return;
      }

      const response = await userService.updateUser(userId, updateData);
      console.log("[GeneralProfile] Update response in component:", response);

      // Handle different response structures
      // response.data.user (standard wrapper) or response.user or response itself
      const updatedUser =
        response.data?.user ||
        response.user ||
        (response.success ? response.data || response : null);

      if (updatedUser) {
        console.log("[GeneralProfile] Updating AuthContext with:", updatedUser);
        // Merge with existing user to ensure we don't lose fields not returned by update
        setUser((prev) => ({ ...prev, ...updatedUser }));
        toast.success("Profile updated successfully");
      } else {
        console.error(
          "[GeneralProfile] Failed to extract user from response:",
          response,
        );
        toast.error(
          "Profile updated, but failed to sync locally. Please refresh.",
        );
      }

      setAvatarFile(null);
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (formData.firstName && formData.lastName) {
      return `${formData.firstName[0]}${formData.lastName[0]}`.toUpperCase();
    }
    return user?.name?.[0]?.toUpperCase() || "U";
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Profile Information
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Update your personal details and public profile.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Avatar Section */}
        <div className="mb-8 flex items-center gap-6">
          <div className="avatar-upload-area" onClick={handleAvatarClick}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" />
            ) : (
              <div className="avatar-placeholder">{getInitials()}</div>
            )}
            <div className="avatar-upload-overlay">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <div>
            <button
              type="button"
              onClick={handleAvatarClick}
              className="text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors"
            >
              Change Avatar
            </button>
            {avatarPreview && (
              <>
                <span className="mx-2 text-gray-400">|</span>
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={loading}
                  className="text-red-600 font-semibold text-sm hover:text-red-700 transition-colors"
                >
                  Remove
                </button>
              </>
            )}
            <p className="text-xs text-gray-500 mt-2">
              JPG, GIF or PNG. Max size 800K
            </p>
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="settings-form-group">
            <label htmlFor="firstName" className="settings-form-label">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className="settings-form-input"
              required
            />
          </div>

          <div className="settings-form-group">
            <label htmlFor="lastName" className="settings-form-label">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className="settings-form-input"
              required
            />
          </div>
        </div>

        {/* Email and Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="settings-form-group">
            <label htmlFor="email" className="settings-form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              className="settings-form-input"
              disabled
            />
          </div>

          <div className="settings-form-group">
            <label htmlFor="phone" className="settings-form-label">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="settings-form-input"
              placeholder="+1 (555) 012-3456"
            />
          </div>
        </div>

        {/* Bio */}
        <div className="settings-form-group mb-8">
          <label htmlFor="bio" className="settings-form-label">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            className="settings-form-textarea"
            placeholder="Digital nomad and software engineer looking for cozy spaces with good WiFi."
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.bio.length}/500 characters
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeneralProfile;
