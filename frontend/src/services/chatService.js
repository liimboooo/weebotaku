import api from './api';

class ChatService {
  async getRooms(type) {
    const params = type ? `?type=${type}` : '';
    return api.get(`/chat/rooms${params}`);
  }

  async getRoom(id) {
    return api.get(`/chat/rooms/${id}`);
  }

  async createRoom(data) {
    return api.post('/chat/rooms', data);
  }

  async updateRoom(id, data) {
    return api.put(`/chat/rooms/${id}`, data);
  }

  async deleteRoom(id) {
    return api.delete(`/chat/rooms/${id}`);
  }

  async joinRoom(id) {
    return api.post(`/chat/rooms/${id}/join`);
  }

  async leaveRoom(id) {
    return api.post(`/chat/rooms/${id}/leave`);
  }

  async getMessages(roomId, page = 1) {
    return api.get(`/chat/rooms/${roomId}/messages?page=${page}`);
  }

  async sendMessage(roomId, body, type = 'text', mediaUrl = null) {
    return api.post(`/chat/rooms/${roomId}/messages`, { body, type, mediaUrl });
  }
}

export default new ChatService();
