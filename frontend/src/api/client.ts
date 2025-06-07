/**
 * API 客戶端模組
 * 提供統一的 HTTP 請求客戶端，包含攔截器、錯誤處理和自動重試
 */

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { errorManager, AppError, ErrorType, ErrorSeverity } from '../utils/errorHandler';

// API 配置介面
interface ApiConfig {
  baseURL: string;              // 基礎 URL
  timeout: number;              // 超時時間
  retryCount: number;           // 重試次數
  retryDelay: number;           // 重試延遲（毫秒）
  enableLogging: boolean;       // 是否啟用日誌
  slowThreshold: number;        // 慢速請求閾值（毫秒）
}

// 默認配置
const defaultConfig: ApiConfig = {
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 30000,               // 30秒超時
  retryCount: 2,                // 重試2次
  retryDelay: 1000,             // 重試延遲1秒
  enableLogging: true,          // 啟用日誌
  slowThreshold: 5000           // 慢速請求閾值5秒
};

// API 客戶端類
class ApiClient {
  private instance: AxiosInstance;
  private config: ApiConfig;
  private requestCount = 0;     // 請求計數器

  constructor(config?: Partial<ApiConfig>) {
    // 合併配置
    this.config = { ...defaultConfig, ...config };
    
    // 創建 axios 實例
    this.instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // 設置攔截器
    this.setupInterceptors();
  }

  // 設置攔截器
  private setupInterceptors(): void {
    // 請求攔截器
    this.instance.interceptors.request.use(
      (config: any) => this.handleRequest(config),
      (error: any) => this.handleRequestError(error)
    );

    // 響應攔截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => this.handleResponse(response),
      async (error: AxiosError) => {
        const config = error.config;
        
        // 清除性能計時器
        const requestId = (config as any)?.requestId;
        const startTime = (config as any)?.startTime;
        
        if (config && startTime) {
          const duration = Date.now() - startTime;
          
          // 性能警告（超過5秒）
          if (duration > this.config.slowThreshold) {
            logger.warn('performance', `慢速請求 ${requestId}`, {
              url: config.url,
              method: config.method,
              duration: `${duration}ms`
            });
          }
        }

        // 網絡錯誤自動重試
        if (
          config &&
          !error.response && 
          error.code !== 'ECONNABORTED' &&
          (config as any).retryCount < this.config.retryCount
        ) {
          (config as any).retryCount = ((config as any).retryCount || 0) + 1;
          logger.warn('api', `重試請求 (${(config as any).retryCount}/${this.config.retryCount})`, {
            url: config.url,
            method: config.method
          });
          
          // 延遲後重試
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
          return this.instance.request(config);
        }

        // 處理特定的錯誤狀態
        if (error.response?.status === 401) {
          // 認證失敗，可能需要刷新 token
          const refreshed = await this.tryRefreshToken();
          if (refreshed && config) {
            // 重試原始請求
            return this.instance.request(config);
          }
        }

        // 轉換錯誤並記錄
        const appError = this.handleApiError(error);
        errorManager.handle(appError);
        
        return Promise.reject(appError);
      }
    );
  }

  // 處理請求
  private handleRequest(config: any): any {
    // 增加請求計數
    this.requestCount++;
    const requestId = `REQ-${Date.now()}-${this.requestCount}`;
    
    // 添加請求 ID 到 headers
    config.headers = config.headers || {};
    config.headers['X-Request-ID'] = requestId;

    // 從 localStorage 獲取 token
    const token = localStorage.getItem('engineerhub_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // 記錄請求日誌
    if (this.config.enableLogging) {
      logger.debug('api', `發送請求 ${requestId}`, {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
        data: config.data,
        headers: this.sanitizeHeaders(config.headers)
      });
    }

    // 性能監控
    config.metadata = { startTime: Date.now(), requestId };

    return config;
  }

  // 處理請求錯誤
  private handleRequestError(error: any): Promise<never> {
    logger.error('api', '請求配置錯誤', error);
    const appError = new AppError(
      '請求配置錯誤',
      ErrorType.CLIENT,
      ErrorSeverity.HIGH,
      { context: error }
    );
    errorManager.handle(appError);
    return Promise.reject(appError);
  }

  // 處理響應
  private handleResponse(response: AxiosResponse): AxiosResponse {
    const config = response.config;
    
    // 清除性能計時器（如果存在）
    if ((config as any)?.startTime) {
      const duration = Date.now() - (config as any).startTime;
      
      // 記錄慢速請求（超過5秒）
      if (duration > this.config.slowThreshold) {
        logger.warn('performance', '慢速請求', {
          url: config.url,
          method: config.method,
          duration: `${duration}ms`
        });
      }
    }
    
    return response;
  }

  // 嘗試刷新 token
  private async tryRefreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('engineerhub_refresh_token');
      if (!refreshToken) return false;

      logger.info('auth', '嘗試刷新 token');
      
      const response = await axios.post(
        `${this.config.baseURL}/auth/token/refresh/`,
        { refresh: refreshToken }
      );

      // 保存新 token
      const { access, refresh } = response.data;
      localStorage.setItem('engineerhub_token', access);
      if (refresh) {
        localStorage.setItem('engineerhub_refresh_token', refresh);
      }

      logger.info('success', 'Token 刷新成功');
      return true;
    } catch (error) {
      logger.error('auth', 'Token 刷新失敗', error);
      // 清除無效的 token
      localStorage.removeItem('engineerhub_token');
      localStorage.removeItem('engineerhub_refresh_token');
      return false;
    }
  }

  // 清理敏感資訊的 headers
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    if (sanitized.Authorization) {
      sanitized.Authorization = 'Bearer [REDACTED]';
    }
    return sanitized;
  }

  // 公開方法：GET 請求
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  // 公開方法：POST 請求
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  // 公開方法：PUT 請求
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  // 公開方法：PATCH 請求
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  // 公開方法：DELETE 請求
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }

  // 上傳文件
  async upload<T = any>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
    const response = await this.instance.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });
    return response.data;
  }

  // 下載文件
  async download(url: string, filename?: string): Promise<Blob> {
    const response = await this.instance.get(url, {
      responseType: 'blob'
    });

    // 如果提供了文件名，自動下載
    if (filename) {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(response.data);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    }

    return response.data;
  }

  // 獲取 axios 實例（用於特殊需求）
  getAxiosInstance(): AxiosInstance {
    return this.instance;
  }

  // 處理 API 錯誤
  private handleApiError(error: AxiosError): AppError {
    // 實現處理 API 錯誤的邏輯
    // 這裡需要根據實際情況實現
    return new AppError(
      'API 錯誤',
      ErrorType.API,
      ErrorSeverity.HIGH,
      { context: error }
    );
  }
}

// 創建默認的 API 客戶端實例
export const apiClient = new ApiClient();

// 創建專門的客戶端工廠函數
export function createApiClient(config?: Partial<ApiConfig>): ApiClient {
  return new ApiClient(config);
}

// 導出類型
export type { ApiConfig };
export { ApiClient }; 