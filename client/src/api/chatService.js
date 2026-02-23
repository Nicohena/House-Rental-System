import apiClient from './client';

const chatService = {
  getConversations: async () => {
    const response = await apiClient.get('/chat');
    return response.data;
  },

  sendMessage: async (messageData) => {
    const response = await apiClient.post('/chat', messageData);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/chat/unread');
    return response.data;
  },

  getChatHistory: async (roomId) => {
    const response = await apiClient.get(`/chat/${roomId}`);
    return response.data;
  },

  markAsRead: async (roomId) => {
    const response = await apiClient.patch(`/chat/${roomId}/read`);
    return response.data;
  },

  deleteMessage: async (messageId) => {
    const response = await apiClient.delete(`/chat/message/${messageId}`);
    return response.data;
  },

  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('images', file);
    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default chatService;
