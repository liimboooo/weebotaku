import api from './api';

const reactionService = {
  get: (animeId) => api.get(`/reactions/${animeId}`, { skipAuthRedirect: true }),
  like: (animeId) => api.post(`/reactions/${animeId}/like`),
  dislike: (animeId) => api.post(`/reactions/${animeId}/dislike`),
};

export default reactionService;
