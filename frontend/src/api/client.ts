/**
 * 統一的 API 客戶端
 * 整合錯誤處理、日誌記錄、請求攔截和響應處理
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { errorManager, handleApiError, AppError, ErrorType, ErrorSeverity } from '../utils/errorHandler';

// API 配置介面
interface ApiConfig {
  baseURL: string;              // 基礎 URL
  timeout: number;              // 超時時間
  retryCount: number;           // 重試次數
  retryDelay: number;           // 重試延遲（毫秒）
  enableLogging: boolean;       // 是否啟用日誌
}

// 默認配置
const defaultConfig: ApiConfig = {
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 30000,               // 30秒超時
  retryCount: 2,                // 重試2次
  retryDelay: 1000,             // 重試延遲1秒
  enableLogging: true           // 啟用日誌
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
      (error: AxiosError) => this.handleResponseError(error)
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
    const { config } = response;
    const metadata = config.metadata as any;
    
    // 計算請求時間
    const duration = Date.now() - metadata.startTime;

    // 記錄響應日誌
    if (this.config.enableLogging) {
      logger.info('api', `請求成功 ${metadata.requestId}`, {
        status: response.status,
        duration: `${duration}ms`,
        url: config.url,
        dataSize: JSON.stringify(response.data).length
      });
    }

    // 性能警告
    if (duration > 5000) {
      logger.warn('performance', `慢速請求警告`, {
        url: config.url,
        duration: `${duration}ms`
      });
    }

    return response;
  }

  // 處理響應錯誤
  private async handleResponseError(error: AxiosError): Promise<any> {
    const config = error.config;
    const metadata = (config as any)?.metadata;

    // 記錄錯誤日誌
    logger.error('api', `請求失敗 ${metadata?.requestId || 'UNKNOWN'}`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: config?.url,
      message: error.message,
      data: error.response?.data
    });

    // 處理特定的錯誤狀態
    if (error.response?.status === 401) {
      // 認證失敗，可能需要刷新 token
      const refreshed = await this.tryRefreshToken();
      if (refreshed && config) {
        // 重試原始請求
        return this.instance.request(config);
      }
    }

    // 重試邏輯
    if (this.shouldRetry(error) && config) {
      const retryCount = (config as any).retryCount || 0;
      if (retryCount < this.config.retryCount) {
        logger.info('api', `重試請求 (${retryCount + 1}/${this.config.retryCount})`, {
          url: config.url
        });
        
        // 延遲後重試
        await this.delay(this.config.retryDelay * (retryCount + 1));
        
        // 更新重試計數
        (config as any).retryCount = retryCount + 1;
        
        return this.instance.request(config);
      }
    }

    // 轉換為應用錯誤
    const appError = handleApiError(error);
    errorManager.handle(appError);
    
    return Promise.reject(appError);
  }

  // 判斷是否應該重試
  private shouldRetry(error: AxiosError): boolean {
    // 網絡錯誤或 5xx 錯誤可以重試
    if (!error.response) return true;
    if (error.response.status >= 500) return true;
    if (error.response.status === 429) return true; // Too Many Requests
    return false;
  }

  // 延遲函數
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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