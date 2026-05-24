import api from './api';

class LeaderboardService {
  async getLeaderboard(type = 'xp', limit = 50) {
    return api.get(`/leaderboard?type=${type}&limit=${limit}`, { auth: false });
  }
}

export default new LeaderboardService();
