import api from './api';

class FriendService {
  async sendRequest(userId) {
    return api.post('/friends/request', { userId });
  }

  async acceptRequest(friendshipId) {
    return api.put(`/friends/accept/${friendshipId}`);
  }

  async rejectRequest(friendshipId) {
    return api.delete(`/friends/reject/${friendshipId}`);
  }

  async removeFriend(userId) {
    return api.delete(`/friends/remove/${userId}`);
  }

  async getFriends(userId) {
    const path = userId ? `/friends/list/${userId}` : '/friends/list';
    return api.get(path);
  }

  async getPendingRequests() {
    return api.get('/friends/pending');
  }

  async getFriendshipStatus(userId) {
    return api.get(`/friends/status/${userId}`);
  }
}

export default new FriendService();
