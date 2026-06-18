import axios, { AxiosInstance } from 'axios';
import { getToken } from '../utils/storage';
import { API_BASE_URL } from '../utils/constants';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('Token expired, redirecting to login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
