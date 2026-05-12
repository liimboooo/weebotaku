import api from './api';

class CommunityService {
  async getAllPosts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/community${queryString ? `?${queryString}` : ''}`);
  }

  async createPost(title, content, category = 'discussion', tags = [], images = []) {
    return api.post('/community', {
      title,
      content,
      category,
      tags,
      images,
    });
  }

  async getPostById(id) {
    return api.get(`/community/${id}`);
  }

  async likePost(id) {
    return api.post(`/community/${id}/like`);
  }

  async addComment(id, content) {
    return api.post(`/community/${id}/comment`, {
      content,
    });
  }

  async deletePost(id) {
    return api.delete(`/community/${id}`);
  }
}

export default new CommunityService();
