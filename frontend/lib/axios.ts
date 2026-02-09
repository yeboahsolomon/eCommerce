import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for global error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (keep silent refresh logic placeholder if needed)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // In a cookie-based flow, the browser handles cookies. 
      // If we get 401 here, it usually means the cookie is expired or invalid.
      // We can trigger a logout or redirect here.
      
      // For now, just reject to let React Query or components handle it
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);
