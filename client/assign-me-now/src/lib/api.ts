import axios from 'axios';

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001';
const TASK_BASE_URL = import.meta.env.VITE_TASK_API_URL || 'http://localhost:5000';

// Create a configured Axios instance
export const api = axios.create({
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to route requests to the correct microservice
api.interceptors.request.use((config) => {
  if (config.url?.startsWith('/auth')) {
    config.baseURL = AUTH_BASE_URL;
  } else if (config.url?.startsWith('/tasks')) {
    config.baseURL = TASK_BASE_URL;
  }
  return config;
});

// Initialize token from localStorage
let accessToken = localStorage.getItem('accessToken') || '';

export const setAccessToken = (token: string) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

export const getAccessToken = () => accessToken || localStorage.getItem('accessToken') || '';

export const setRefreshToken = (token: string) => {
  if (token) {
    localStorage.setItem('refreshToken', token);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

export const getRefreshToken = () => localStorage.getItem('refreshToken') || '';

// Request interceptor to add the auth token header to every request
api.interceptors.request.use(
  (config) => {
    if (accessToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh on 401 Unauthorized
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        const response = await axios.post('/auth/refresh', { refreshToken }, {
          withCredentials: true 
        });
        
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        
        // Save the new tokens
        setAccessToken(newAccessToken);
        if (newRefreshToken) setRefreshToken(newRefreshToken);
        
        // Update the failed request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed or expired.
        // We'll clear the token and force a redirect or state update from the AuthContext.
        setAccessToken('');
        // The AuthContext will listen to this rejection state or we can dispatch an event
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
