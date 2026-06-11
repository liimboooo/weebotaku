import api from './api';

class CommentService {
  async getComments(animeId, { episode, page = 1, limit = 20, sort = 'newest' } = {}) {
    let url = `/comments/${animeId}?page=${page}&limit=${limit}&sort=${sort}`;
    if (episode !== undefined && episode !== null) url += `&episode=${episode}`;
    // Send auth (optionalAuth on the backend) so each comment reports likedByMe/dislikedByMe.
    // skipAuthRedirect: reading comments must never log the user out on a stale token.
    return api.get(url, { skipAuthRedirect: true });
  }

  async createComment(animeId, content, { episode, isSpoiler = false } = {}) {
    return api.post(`/comments/${animeId}`, { content, episode, isSpoiler });
  }

  async likeComment(commentId) {
    return api.post(`/comments/${commentId}/like`);
  }

  async dislikeComment(commentId) {
    return api.post(`/comments/${commentId}/dislike`);
  }

  async replyToComment(commentId, content, isSpoiler = false) {
    return api.post(`/comments/${commentId}/reply`, { content, isSpoiler });
  }

  async editComment(commentId, content, isSpoiler) {
    return api.put(`/comments/${commentId}`, { content, isSpoiler });
  }

  async deleteComment(commentId) {
    return api.delete(`/comments/${commentId}`);
  }
}

const commentService = new CommentService();
export default commentService;
