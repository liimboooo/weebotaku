import api from './api';

class NewsService {
  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/news${queryString ? `?${queryString}` : ''}`);
  }

  async getFeatured() {
    return api.get('/news/featured');
  }

  async getByCategory(category, page = 1, limit = 20) {
    return api.get(`/news/category/${category}?page=${page}&limit=${limit}`);
  }

  async getById(id) {
    return api.get(`/news/${id}`);
  }

  async likeNews(id) {
    return api.post(`/news/${id}/like`);
  }

  async createNews(title, description, content, imageUrl, category = 'other', featured = false) {
    return api.post('/news', {
      title,
      description,
      content,
      imageUrl,
      category,
      featured,
    });
  }
}

export default new NewsService();
