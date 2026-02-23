import apiClient from './client';

export const houseService = {
  getHouses: (params) => apiClient.get('/houses', { params }),
  getHouseById: (id) => apiClient.get(`/houses/${id}`),
  getMyListings: () => apiClient.get('/houses/my-listings'),
  createHouse: (data) => apiClient.post('/houses', data),
  updateHouse: (id, data) => apiClient.patch(`/houses/${id}`, data),
  deleteHouse: (id) => apiClient.delete(`/houses/${id}`),
  uploadImages: (formData) => apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  addRating: (houseId, { score, comment }) => apiClient.post(`/houses/${houseId}/ratings`, { score, comment }),
};
