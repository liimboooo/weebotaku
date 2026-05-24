import api from './api';

class CommunityService {
  async getAllPosts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/community${queryString ? `?${queryString}` : ''}`);
  }

  async getTrending() {
    return api.get('/community/trending');
  }

  async getByTag(tag, page = 1) {
    return api.get(`/community/hashtag/${encodeURIComponent(tag)}?page=${page}`);
  }

  async createPost(data) {
    return api.post('/community', data);
  }

  async getPostById(id) {
    return api.get(`/community/${id}`);
  }

  async updatePost(id, data) {
    return api.put(`/community/${id}`, data);
  }

  async likePost(id) {
    return api.post(`/community/${id}/like`);
  }

  async addComment(postId, content, mentions = []) {
    return api.post(`/community/${postId}/comment`, { content, mentions });
  }

  async updateComment(postId, commentId, content) {
    return api.put(`/community/comment/${postId}/${commentId}`, { content });
  }

  async deleteComment(postId, commentId) {
    return api.delete(`/community/comment/${postId}/${commentId}`);
  }

  async likeComment(postId, commentId) {
    return api.post(`/community/comment/${postId}/${commentId}/like`);
  }

  async deletePost(id) {
    return api.delete(`/community/${id}`);
  }
}

export default new CommunityService();
