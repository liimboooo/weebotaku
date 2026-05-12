import api from './api';

class MangaService {
  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/manga${queryString ? `?${queryString}` : ''}`);
  }

  async getById(id) {
    return api.get(`/manga/${id}`);
  }

  async getPopular() {
    return api.get('/manga/popular');
  }

  async addToList(id) {
    return api.post(`/manga/${id}/list`);
  }

  async removeFromList(id) {
    return api.delete(`/manga/${id}/list`);
  }

  async searchManga(query, params = {}) {
    return this.getAll({
      ...params,
      search: query,
    });
  }
}

export default new MangaService();
