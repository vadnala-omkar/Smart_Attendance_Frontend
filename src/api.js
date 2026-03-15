import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('att_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('att_token');
      localStorage.removeItem('att_user');
      localStorage.removeItem('att_role');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
