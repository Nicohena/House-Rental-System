import apiClient from './client';

const userService = {
  getMe: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  updatePassword: async (passwordData) => {
    const response = await apiClient.patch('/users/me/password', passwordData);
    return response.data;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id, userData) => {
    console.log(`[userService] Updating user ${id} with:`, userData);
    const response = await apiClient.patch(`/users/${id}`, userData);
    console.log(`[userService] Update user response:`, response.data);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  getPreferences: async (id) => {
    const response = await apiClient.get(`/users/${id}/preferences`);
    return response.data;
  },

  updatePreferences: async (id, preferences) => {
    const response = await apiClient.patch(`/users/${id}/preferences`, preferences);
    return response.data;
  },

  // Saved homes (wishlist)
  getSavedHomes: async (id) => {
    const response = await apiClient.get(`/users/${id}/saved-homes`);
    return response.data;
  },

  addSavedHome: async (id, houseId) => {
    const response = await apiClient.post(`/users/${id}/saved-homes`, { houseId });
    return response.data;
  },

  removeSavedHome: async (id, houseId) => {
    const response = await apiClient.delete(`/users/${id}/saved-homes/${houseId}`);
    return response.data;
  },

  // Notifications
  getNotifications: async (id) => {
    const response = await apiClient.get(`/users/${id}/notifications`);
    return response.data;
  },

  markNotificationRead: async (id, notificationId) => {
    const response = await apiClient.patch(`/users/${id}/notifications/${notificationId}`, { read: true });
    return response.data;
  },

  markAllNotificationsRead: async (id) => {
    const response = await apiClient.patch(`/users/${id}/notifications/mark-all-read`);
    return response.data;
  },

  // Avatar management
  uploadAvatar: async (formData) => {
    const response = await apiClient.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  removeAvatar: async () => {
    const response = await apiClient.delete('/users/me/avatar');
    return response.data;
  },

  // Account deletion
  deleteAccount: async (password) => {
    const response = await apiClient.delete('/users/me', {
      data: { password },
    });
    return response.data;
  },
};

export default userService;
