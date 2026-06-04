// API Configuration
import { STORAGE_KEYS } from '../utils/constants';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this._redirecting = false;
  }

  getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  getHeaders(withAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (withAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(options.auth !== false),
        ...options.headers,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, { ...config, signal: controller.signal });

      clearTimeout(timeout);

      if (response.status === 401 && !this._redirecting && !options.skipAuthRedirect) {
        this._redirecting = true;
        const keysToRemove = [
          STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.USERNAME, STORAGE_KEYS.IS_LOGGED_IN,
          STORAGE_KEYS.USER_AVATAR,
          STORAGE_KEYS.MEMBER_SINCE, STORAGE_KEYS.SOCIAL_LINKS,
          STORAGE_KEYS.WATCHLIST, STORAGE_KEYS.MANGA_READ_LIST, STORAGE_KEYS.WATCH_HISTORY,
          STORAGE_KEYS.USER_RATINGS, STORAGE_KEYS.LIKED_ANIME, STORAGE_KEYS.MANGA_PROGRESS,
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));
        window.dispatchEvent(new CustomEvent('auth-logout', { detail: { reason: 'token_expired' } }));
        setTimeout(() => { this._redirecting = false; }, 2000);
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        try {
          const parsed = JSON.parse(text);
          throw new Error(parsed.message || `Request failed (${response.status})`);
        } catch {
          throw new Error(text || `Request failed (${response.status})`);
        }
      }

      const data = await response.json();

      return data;
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Server might be waking up, please try again.');
      }
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  // POST request
  async post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  }

  // PUT request
  async put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    });
  }

  // DELETE request
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }
}

const apiClient = new ApiClient();
export default apiClient;
