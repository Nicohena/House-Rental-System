import apiClient from './client';

const adminService = {
  getPendingListings: async () => {
    const response = await apiClient.get('/admin/listings/pending');
    return response.data;
  },

  verifyListing: async (id, decision) => {
    const response = await apiClient.patch(`/admin/listings/${id}/verify`, { decision });
    return response.data;
  },

  getUsers: async () => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await apiClient.patch(`/admin/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  },

  getAnalytics: async () => {
    const response = await apiClient.get('/admin/analytics');
    return response.data;
  },

  getLogs: async () => {
    const response = await apiClient.get('/admin/logs');
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  }
};

export default adminService;
