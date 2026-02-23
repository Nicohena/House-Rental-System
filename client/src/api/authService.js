import apiClient from './client';

export const authService = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (userData) => apiClient.post('/auth/register', userData),
  getMe: () => apiClient.get('/auth/me'),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  logout: () => apiClient.post('/auth/logout'),
};
