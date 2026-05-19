import api from './api';

class ReviewService {
  async createReview(animeId, mangaId, rating, title, content, isSpoiler = false) {
    return api.post('/reviews', {
      animeId,
      mangaId,
      rating,
      title,
      content,
      isSpoiler,
    });
  }

  async getReviews(type, id, page = 1, limit = 10) {
    return api.get(`/reviews/${type}/${id}?page=${page}&limit=${limit}`);
  }

  async likeReview(id) {
    return api.post(`/reviews/${id}/like`);
  }

  async deleteReview(id) {
    return api.delete(`/reviews/${id}`);
  }
}

const reviewService = new ReviewService();
export default reviewService;
