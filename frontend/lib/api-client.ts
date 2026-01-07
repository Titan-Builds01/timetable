import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors gracefully (allow public access)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on blob errors (exports)
    if (error.config?.responseType === 'blob') {
      return Promise.reject(error);
    }

    // For 401 errors, just remove the token but don't redirect
    // This allows public access to work properly
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        // Only redirect if we're on a protected page and user was trying to access it
        // For now, let the error propagate so components can handle it
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

