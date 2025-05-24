import axios from 'axios';

// 创建axios实例 - 純 JWT 認證，無需 CSRF
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false // JWT 認證不需要 cookies
});

// 请求拦截器，只添加JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('engineerhub_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器，处理token过期
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // 处理token过期的情况
    if (error.response?.status === 401 && localStorage.getItem('engineerhub_token')) {
      // 清除token並重定向到登录页
      localStorage.removeItem('engineerhub_token');
      localStorage.removeItem('engineerhub_refresh_token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api; 