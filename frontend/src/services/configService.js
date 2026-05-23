import api from './api';

class ConfigService {
  async getRules() {
    return api.get('/config/rules', { auth: false });
  }

  async getFeatures() {
    return api.get('/config/features', { auth: false });
  }
}

const configService = new ConfigService();
export default configService;
