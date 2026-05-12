import api from './api';

class AnimeService {
  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/anime${queryString ? `?${queryString}` : ''}`);
  }

  async getById(id) {
    return api.get(`/anime/${id}`);
  }

  async getTrending() {
    return api.get('/anime/trending');
  }

  async getPopular() {
    return api.get('/anime/popular');
  }

  async addToWatchlist(id) {
    return api.post(`/anime/${id}/watchlist`);
  }

  async removeFromWatchlist(id) {
    return api.delete(`/anime/${id}/watchlist`);
  }

  async getWatchlist() {
    return api.get('/anime/watchlist');
  }

  async updateWatchHistory(animeId, episodeWatched) {
    return api.post(`/anime/${animeId}/history`, {
      animeId,
      episodeWatched,
    });
  }

  async searchAnime(query, params = {}) {
    return this.getAll({
      ...params,
      search: query,
    });
  }
}

export default new AnimeService();
