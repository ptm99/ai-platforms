import axios from 'axios';
import { getAccessToken, getRefreshToken, storeTokens, clearTokens } from '../utils/token';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const axiosClient = axios.create({
  baseURL: apiBase
});

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

function onRefreshed() {
  refreshQueue.forEach((cb) => cb());
  refreshQueue = [];
}

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        await new Promise<void>((resolve) => {
          refreshQueue.push(resolve);
        });
        return axiosClient(original);
      }

      isRefreshing = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const resp = await axios.post(`${apiBase}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = resp.data.tokens;

        storeTokens(accessToken, newRefreshToken);
        onRefreshed();
        isRefreshing = false;

        original.headers.Authorization = `Bearer ${accessToken}`;
        return axiosClient(original);
      } catch (e) {
        isRefreshing = false;
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);
