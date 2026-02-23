import apiClient from './client';

const paymentService = {
  initiatePayment: async (paymentData) => {
    const response = await apiClient.post('/payments/initiate', paymentData);
    return response.data;
  },

  getPaymentHistory: async () => {
    const response = await apiClient.get('/payments');
    return response.data;
  },

  getPaymentById: async (id) => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data;
  },

  getPaymentStatus: async (id) => {
    const response = await apiClient.get(`/payments/${id}/status`);
    return response.data;
  },

  updatePaymentStatus: async (id, status) => {
    const response = await apiClient.patch(`/payments/${id}/status`, { status });
    return response.data;
  },

  processRefund: async (id) => {
    const response = await apiClient.post(`/payments/${id}/refund`);
    return response.data;
  }
};

export default paymentService;
