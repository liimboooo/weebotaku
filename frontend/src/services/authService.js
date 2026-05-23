import api from './api';
import { STORAGE_KEYS } from '../utils/constants';
import { syncFromBackend } from './storage';

function storeUserData(user) {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.USERNAME, user.username);
  localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
  if (user.avatar) localStorage.setItem(STORAGE_KEYS.USER_AVATAR, user.avatar);
  if (user.banner) localStorage.setItem(STORAGE_KEYS.USER_BANNER, user.banner);
  if (user.statusMessage) localStorage.setItem(STORAGE_KEYS.USER_STATUS_MESSAGE, user.statusMessage);
  if (user.memberSince) localStorage.setItem(STORAGE_KEYS.MEMBER_SINCE, String(user.memberSince));
  if (user.socialLinks) localStorage.setItem(STORAGE_KEYS.SOCIAL_LINKS, JSON.stringify(user.socialLinks));

  if (user.watchlist) {
    const mapped = user.watchlist.map(item => ({
      id: item.animeId,
      name: item.name,
      img: item.img,
      rating: item.rating,
      episodes: item.episodes,
      year: item.year,
      status: item.status,
      genres: item.genres || [],
      listStatus: item.listStatus || 'Watch Later',
      type: 'anime',
    }));
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(mapped));
  }

  if (user.readlist) {
    const mapped = user.readlist.map(item => ({
      id: item.mangaId,
      title: item.title,
      cover: item.cover,
      author: item.author,
      rating: item.rating,
      ch: item.ch,
      status: item.status,
      demo: item.demo,
      type: 'manga',
    }));
    localStorage.setItem(STORAGE_KEYS.MANGA_READ_LIST, JSON.stringify(mapped));
  }

  if (user.watchHistory) {
    const mapped = user.watchHistory.map(item => ({
      animeId: item.animeId,
      episode: item.episode,
      timestamp: new Date(item.timestamp).getTime(),
      animeName: item.animeName || '',
      animeImg: item.animeImg || '',
    }));
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(mapped));
  }

  if (user.ratings) {
    localStorage.setItem(STORAGE_KEYS.USER_RATINGS, JSON.stringify(user.ratings));
  }

  if (user.likedAnime) {
    localStorage.setItem(STORAGE_KEYS.LIKED_ANIME, JSON.stringify(user.likedAnime));
  }

  if (user.mangaProgress) {
    localStorage.setItem(STORAGE_KEYS.MANGA_PROGRESS, JSON.stringify(user.mangaProgress));
  }

  if (user.progression) {
    localStorage.setItem(STORAGE_KEYS.USER_PROGRESSION, JSON.stringify(user.progression));
  }
}

class AuthService {
  async register(username, email, password, passwordConfirm) {
    const response = await api.post('/auth/register', {
      username, email, password, passwordConfirm,
    }, { auth: false });

    if (response.success) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
      storeUserData(response.user);
    }

    return response;
  }

  async login(username, password) {
    const response = await api.post('/auth/login', {
      username, password,
    }, { auth: false });

    if (response.success) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
      storeUserData(response.user);
    }

    return response;
  }

  async googleLogin(credential) {
    const response = await api.post('/auth/google', { credential }, { auth: false });

    if (response.success) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
      storeUserData(response.user);
    }

    return response;
  }

  async getMe() {
    const response = await api.get('/auth/me');
    if (response.success && response.user) {
      storeUserData(response.user);
    }
    return response;
  }

  async updateProfile(data) {
    const response = await api.put('/auth/updateprofile', data);
    if (response.success && response.user) {
      storeUserData(response.user);
      window.dispatchEvent(new Event('profile-avatar-updated'));
      window.dispatchEvent(new Event('user-status-updated'));
    }
    return response;
  }

  async syncProgression(progression) {
    return api.post('/auth/sync-progression', progression);
  }

  async logout() {
    try {
      await api.get('/auth/logout');
    } catch {}
    const keysToRemove = [
      STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.USERNAME, STORAGE_KEYS.IS_LOGGED_IN,
      STORAGE_KEYS.USER_AVATAR, STORAGE_KEYS.USER_BANNER, STORAGE_KEYS.USER_STATUS_MESSAGE,
      STORAGE_KEYS.MEMBER_SINCE, STORAGE_KEYS.SOCIAL_LINKS,
      STORAGE_KEYS.WATCHLIST, STORAGE_KEYS.MANGA_READ_LIST, STORAGE_KEYS.WATCH_HISTORY,
      STORAGE_KEYS.USER_RATINGS, STORAGE_KEYS.LIKED_ANIME, STORAGE_KEYS.MANGA_PROGRESS,
      STORAGE_KEYS.USER_PROGRESSION,
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  async searchUsers(query) {
    const response = await api.get(`/auth/search?q=${encodeURIComponent(query)}`, { auth: false });
    return response?.users || [];
  }

  async getUserByUsername(username) {
    const response = await api.get(`/auth/by-username/${username}`, { auth: false });
    return response;
  }

  getCurrentUser() {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn() {
    return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  async refreshUser() {
    return syncFromBackend();
  }
}

const authService = new AuthService();
export default authService;

