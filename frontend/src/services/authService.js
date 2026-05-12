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

  async login(email, password) {
    const response = await api.post('/auth/login', {
      email,
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

  async updateProfile(username, bio, avatar) {
    return api.put('/auth/updateprofile', {
      username,
      bio,
      avatar,
    });
  }

  async logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return api.get('/auth/logout');
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
