import apiClient from './client';

const recommendationService = {
  getSimilarHouses: async (houseId) => {
    const response = await apiClient.get(`/recommendations/similar/${houseId}`);
    return response.data;
  },

  getRecommendations: async (userId) => {
    const response = await apiClient.get(`/recommendations/${userId}`);
    return response.data;
  },

  markViewed: async (userId, houseId) => {
    const response = await apiClient.post(`/recommendations/${userId}/view/${houseId}`);
    return response.data;
  },

  recordFeedback: async (userId, feedbackData) => {
    const response = await apiClient.post(`/recommendations/${userId}/feedback`, feedbackData);
    return response.data;
  }
};

export default recommendationService;
