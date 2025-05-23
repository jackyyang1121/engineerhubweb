import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // 允许跨域请求携带cookie
});

// 请求拦截器，添加JWT token
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

// 响应拦截器，处理常见错误
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // 处理token过期的情况
    if (error.response?.status === 401 && localStorage.getItem('engineerhub_token')) {
      // 尝试使用刷新令牌
      try {
        // 刷新令牌的逻辑可以在这里实现
        // 这里暂时只是清除token并重定向到登录页
        localStorage.removeItem('engineerhub_token');
        localStorage.removeItem('engineerhub_refresh_token');
        window.location.href = '/login';
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 