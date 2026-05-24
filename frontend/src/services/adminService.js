import api from './api';

class AdminService {
  async getStats() {
    return api.get('/admin/stats');
  }

  async getUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/admin/users${qs ? `?${qs}` : ''}`);
  }

  async updateUserRole(id, role) {
    return api.put(`/admin/users/${id}/role`, { role });
  }

  async banUser(id) {
    return api.put(`/admin/users/${id}/ban`);
  }

  async deleteUser(id) {
    return api.delete(`/admin/users/${id}`);
  }

  async getReports(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/admin/reports${qs ? `?${qs}` : ''}`);
  }

  async updateReport(id, status) {
    return api.put(`/admin/reports/${id}`, { status });
  }

  async getPosts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/admin/posts${qs ? `?${qs}` : ''}`);
  }

  async deletePost(id) {
    return api.delete(`/admin/posts/${id}`);
  }

  async getChatRooms() {
    return api.get('/admin/rooms');
  }

  async deleteChatRoom(id) {
    return api.delete(`/admin/rooms/${id}`);
  }
}

export default new AdminService();
