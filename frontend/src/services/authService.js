import api from './api';

class AuthService {
  async register(username, email, password, passwordConfirm) {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
      passwordConfirm,
    }, { auth: false });

    if (response.success) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  }

  async login(username, password) {
    const response = await api.post('/auth/login', {
      username,
      password,
    }, { auth: false });

    if (response.success) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  }

  async getMe() {
    return api.get('/auth/me');
  }

  async updateProfile(data) {
    const response = await api.put('/auth/updateprofile', data);
    if (response.success && response.user) {
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  }

  async logout() {
    try {
      await api.get('/auth/logout');
    } catch {
      // Server might be down, still clear local state
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('username');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userAvatar');
    localStorage.removeItem('userStatusMessage');
  }

  async getUserByUsername(username) {
    const response = await api.get(`/auth/by-username/${username}`, { auth: false });
    return response;
  }

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }
}

export default new AuthService();
