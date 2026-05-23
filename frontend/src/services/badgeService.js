import api from './api';

class BadgeService {
  async getBadgeDefs() {
    return api.get('/badges', { auth: false });
  }
}

const badgeService = new BadgeService();
export default badgeService;
