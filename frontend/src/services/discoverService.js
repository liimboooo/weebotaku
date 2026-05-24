import api from './api';

class DiscoverService {
  async getTrending(page = 1) {
    return api.get(`/discover/trending?page=${page}`, { auth: false });
  }

  async getSeasonal(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/discover/seasonal${qs ? `?${qs}` : ''}`, { auth: false });
  }

  async getUpcoming(page = 1) {
    return api.get(`/discover/upcoming?page=${page}`, { auth: false });
  }
}

export default new DiscoverService();
