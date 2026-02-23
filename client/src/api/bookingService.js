import apiClient from './client';

const bookingService = {
  getBookings: async () => {
    const response = await apiClient.get('/bookings');
    return response.data;
  },

  createBooking: async (bookingData) => {
    const response = await apiClient.post('/bookings', bookingData);
    return response.data;
  },

  getBookingStats: async () => {
    const response = await apiClient.get('/bookings/stats');
    return response.data;
  },

  getAllBookings: async () => {
    const response = await apiClient.get('/bookings/all');
    return response.data;
  },

  getBookingById: async (id) => {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data;
  },

  updateBooking: async (id, bookingData) => {
    const response = await apiClient.patch(`/bookings/${id}`, bookingData);
    return response.data;
  },

  cancelBooking: async (id) => {
    const response = await apiClient.post(`/bookings/${id}/cancel`);
    return response.data;
  },

  // Owner specific methods
  getOwnerBookings: async () => {
    const response = await apiClient.get('/bookings/owner');
    return response.data;
  },

  getPendingRequests: async () => {
    const response = await apiClient.get('/bookings/pending');
    return response.data;
  },

  acceptBooking: async (id) => {
    const response = await apiClient.post(`/bookings/${id}/accept`);
    return response.data;
  },

  declineBooking: async (id) => {
    const response = await apiClient.post(`/bookings/${id}/decline`);
    return response.data;
  },

  getRevenueAnalytics: async (timeRange = '6m') => {
    const response = await apiClient.get(`/bookings/revenue?range=${timeRange}`);
    return response.data;
  }
};

export default bookingService;
