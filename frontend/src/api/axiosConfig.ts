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
    console.log('🔐 請求攔截器:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      token: token ? token.substring(0, 20) + '...' : 'None'
    });
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ 請求配置錯誤:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器，处理token过期和重试
api.interceptors.response.use(
  (response) => {
    console.log('✅ 響應成功:', {
      url: response.config.url,
      status: response.status,
      method: response.config.method
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.log('❌ 響應錯誤:', {
      url: originalRequest?.url,
      status: error.response?.status,
      method: originalRequest?.method,
      hasRetried: originalRequest?._retry
    });
    
    // 处理401错误和token刷新
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('engineerhub_refresh_token');
      if (refreshToken) {
        console.log('🔄 嘗試刷新 token...');
        try {
          // 使用refresh token刷新access token
          const response = await axios.post(`${api.defaults.baseURL}/auth/token/refresh/`, {
            refresh: refreshToken
          });
          
          const newAccessToken = response.data.access;
          localStorage.setItem('engineerhub_token', newAccessToken);
          
          console.log('✅ Token 刷新成功');
          
          // 重新发送原始请求
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
          
        } catch (refreshError) {
          console.error('❌ Token 刷新失敗:', refreshError);
          // 清除无效的token
          localStorage.removeItem('engineerhub_token');
          localStorage.removeItem('engineerhub_refresh_token');
          
          // 重定向到登录页
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        console.log('❌ 沒有 refresh token，重定向到登入頁');
        // 没有refresh token，重定向到登录页
        localStorage.removeItem('engineerhub_token');
        localStorage.removeItem('engineerhub_refresh_token');
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 