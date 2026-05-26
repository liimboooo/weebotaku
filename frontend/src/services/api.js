// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL;

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this._redirecting = false;
  }

  getToken() {
    return localStorage.getItem('token');
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

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
