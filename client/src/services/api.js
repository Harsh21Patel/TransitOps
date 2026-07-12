import axios from 'axios';
import { store } from '../redux/store';
import { setAccessToken, logoutLocal } from '../features/auth/authSlice';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send the httpOnly refresh cookie automatically
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const isAuthRoute = originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (status === 401 && code === 'TOKEN_EXPIRED' && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        store.dispatch(setAccessToken(newToken));
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        store.dispatch(logoutLocal());
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401 && !isAuthRoute) {
      store.dispatch(logoutLocal());
    }

    return Promise.reject(error);
  }
);

export default api;
