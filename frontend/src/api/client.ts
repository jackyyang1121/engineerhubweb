/**
 * 統一的 API 客戶端配置
 */

import axios from 'axios';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// 環境變數配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws';

// 創建 axios 實例
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超時
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加認證 token
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 添加 CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken && config.headers) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    return config;
  },
  (error: Error) => {
    console.error('請求配置錯誤:', error);
    return Promise.reject(error);
  }
);

// 錯誤響應類型定義
interface APIErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
  config?: {
    _retry?: boolean;
    headers?: Record<string, string>;
  };
  code?: string;
  message?: string;
}

// 響應攔截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: APIErrorResponse) => {
    const originalRequest = error.config;
    
    // 處理 401 未授權錯誤
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // 嘗試使用 refresh token 刷新 access token
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken
          });
          
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          
          // 重新發送原始請求
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${access}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // refresh token 也無效，清除所有 token 並跳轉到登入頁
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // 處理網路錯誤
    if (error.code === 'NETWORK_ERROR') {
      console.error('網路連接錯誤');
    }
    
    // 處理超時錯誤
    if (error.code === 'ECONNABORTED') {
      console.error('請求超時');
    }
    
    return Promise.reject(error);
  }
);

// WebSocket URL 生成器
export const getWebSocketURL = (path: string): string => {
  const token = localStorage.getItem('access_token');
  const baseUrl = WS_BASE_URL.replace(/\/$/, ''); // 移除結尾的斜線
  const cleanPath = path.replace(/^\//, ''); // 移除開頭的斜線
  
  if (token) {
    return `${baseUrl}/${cleanPath}/?token=${token}`;
  }
  return `${baseUrl}/${cleanPath}/`;
};

// API 響應類型
export interface APIResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// 分頁響應類型
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// 錯誤處理工具
export const handleAPIError = (error: APIErrorResponse): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.response?.data?.errors) {
    const errors = error.response.data.errors;
    const firstError = Object.values(errors)[0];
    if (Array.isArray(firstError) && firstError.length > 0) {
      return firstError[0];
    }
  }
  
  if (error.message) {
    return error.message;
  }
  
  return '發生未知錯誤';
};

// 上傳進度回調類型
export type UploadProgressCallback = (progress: number) => void;

// 文件上傳方法
export const uploadFile = async (
  url: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<AxiosResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });
};

export default apiClient; 