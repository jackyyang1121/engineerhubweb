/**
 * EngineerHub - 統一API服務基礎類
 * 
 * 職責：
 * - 提供統一的API調用基礎設施
 * - 處理請求攔截、響應處理、錯誤管理
 * - 支援依賴注入和配置化
 * 
 * 設計原則：
 * - Narrowly focused: 專注於API通信基礎設施
 * - Flexible: 支援多種配置和自定義攔截器
 * - Loosely coupled: 與具體業務邏輯解耦
 */

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * API響應標準格式
 */
export interface ApiResponse<T = unknown> {
  /** 響應數據 */
  data: T;
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message?: string;
  /** 錯誤代碼 */
  code?: string;
  /** 分頁信息（可選） */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API錯誤類型
 */
export class ApiError extends Error {
  /** HTTP狀態碼 */
  public readonly status: number;
  /** 錯誤代碼 */
  public readonly code?: string;
  /** 原始響應數據 */
  public readonly data?: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/**
 * 請求攔截器接口
 */
export interface RequestInterceptor {
  /** 攔截器名稱 */
  name: string;
  /** 處理請求配置 */
  onRequest?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
  /** 處理請求錯誤 */
  onRequestError?: (error: unknown) => Promise<never>;
}

/**
 * 響應攔截器接口
 */
export interface ResponseInterceptor {
  /** 攔截器名稱 */
  name: string;
  /** 處理成功響應 */
  onResponse?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
  /** 處理響應錯誤 */
  onResponseError?: (error: unknown) => Promise<never>;
}

/**
 * API服務配置
 */
export interface ApiServiceConfig {
  /** 基礎URL */
  baseURL: string;
  /** 請求超時時間（毫秒） */
  timeout?: number;
  /** 預設headers */
  headers?: Record<string, string>;
  /** 是否啟用重試 */
  enableRetry?: boolean;
  /** 重試次數 */
  retryCount?: number;
  /** 重試延遲（毫秒） */
  retryDelay?: number;
}

/**
 * 統一API服務基礎類
 * 
 * 功能：
 * - 提供統一的HTTP客戶端
 * - 標準化的錯誤處理
 * - 請求/響應攔截器管理
 * - 自動重試機制
 * - Token自動注入
 * 
 * @example
 * ```typescript
 * const apiService = new ApiService({
 *   baseURL: 'http://localhost:8000/api',
 *   timeout: 5000,
 *   enableRetry: true
 * });
 * 
 * // 添加認證攔截器
 * apiService.addRequestInterceptor({
 *   name: 'auth',
 *   onRequest: (config) => {
 *     const token = getAuthToken();
 *     if (token) {
 *       config.headers.Authorization = `Bearer ${token}`;
 *     }
 *     return config;
 *   }
 * });
 * ```
 */
export class ApiService {
  /** Axios實例 */
  private readonly client: AxiosInstance;
  
  /** 配置選項 */
  private readonly config: Required<ApiServiceConfig>;
  
  /** 請求攔截器集合 */
  private readonly requestInterceptors: Map<string, RequestInterceptor> = new Map();
  
  /** 響應攔截器集合 */
  private readonly responseInterceptors: Map<string, ResponseInterceptor> = new Map();

  /**
   * 建構函數
   * @param config - API服務配置
   */
  constructor(config: ApiServiceConfig) {
    // 設定預設配置
    this.config = {
      timeout: 10000,
      headers: {},
      enableRetry: true,
      retryCount: 3,
      retryDelay: 1000,
      ...config,
    };

    // 創建Axios實例
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
    });

    // 設置基礎攔截器
    this.setupBaseInterceptors();
  }

  /**
   * 設置基礎攔截器
   * 
   * 功能：
   * - 請求日誌記錄
   * - 響應標準化處理
   * - 錯誤統一轉換
   */
  private setupBaseInterceptors(): void {
    // 請求攔截器：日誌記錄
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🚀 API請求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ 請求攔截器錯誤:', error);
        return Promise.reject(error);
      }
    );

    // 響應攔截器：標準化處理
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API響應: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        console.error('❌ API錯誤:', error);
        
        // 如果啟用重試且符合重試條件
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }

        // 轉換為標準API錯誤
        throw this.transformError(error);
      }
    );
  }

  /**
   * 判斷是否應該重試
   * @param error - 錯誤對象
   * @returns 是否重試
   */
  private shouldRetry(error: unknown): boolean {
    if (!this.config.enableRetry) return false;
    
    const axiosError = error as { config?: { retryCount?: number }; code?: string; response?: { status?: number } };
    
    // 檢查重試次數
    const retryCount = axiosError.config?.retryCount || 0;
    if (retryCount >= this.config.retryCount) return false;

    // 只對特定錯誤類型重試
    const retryableErrors = [
      'ECONNABORTED', // 請求超時
      'ETIMEDOUT',    // 連接超時
      'ENOTFOUND',    // DNS錯誤
      'ECONNRESET',   // 連接重置
    ];

    const retryableStatuses = [408, 429, 502, 503, 504]; // 可重試的HTTP狀態碼

    return Boolean(
      (axiosError.code && retryableErrors.includes(axiosError.code)) ||
      (axiosError.response?.status && retryableStatuses.includes(axiosError.response.status))
    );
  }

  /**
   * 重試請求
   * @param error - 錯誤對象，包含配置信息
   * @returns 重試的Promise響應
   */
  private async retryRequest(error: { config: AxiosRequestConfig & { retryCount?: number } }): Promise<AxiosResponse> {
    // 獲取請求配置並增加重試計數
    const config = error.config;
    config.retryCount = (config.retryCount || 0) + 1;

    console.log(`🔄 重試請求 (${config.retryCount}/${this.config.retryCount}): ${config.url}`);

    // 等待重試延遲時間
    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));

    // 使用更新的配置重新發送請求
    return this.client.request(config);
  }

  /**
   * 轉換錯誤為標準API錯誤
   * @param error - 原始錯誤對象
   * @returns 標準API錯誤實例
   */
  private transformError(error: unknown): ApiError {
    // 定義axios錯誤類型
    const axiosError = error as {
      response?: { status: number; data?: { message?: string; error?: string; code?: string } };
      request?: unknown;
      message?: string;
    };

    if (axiosError.response) {
      // 服務器響應錯誤 - 有HTTP響應但狀態碼不是2xx
      const { status, data } = axiosError.response;
      const message = data?.message || data?.error || axiosError.message || '服務器錯誤';
      const code = data?.code || `HTTP_${status}`;
      
      return new ApiError(message, status, code, data);
    } else if (axiosError.request) {
      // 網絡錯誤 - 請求已發送但沒有收到響應
      return new ApiError('網絡連接失敗，請檢查網絡設置', 0, 'NETWORK_ERROR');
    } else {
      // 其他錯誤 - 在設置請求時發生錯誤
      return new ApiError(axiosError.message || '未知錯誤', 0, 'UNKNOWN_ERROR');
    }
  }

  /**
   * 添加請求攔截器
   * @param interceptor - 請求攔截器
   */
  public addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.set(interceptor.name, interceptor);

    this.client.interceptors.request.use(
      async (config) => {
        if (interceptor.onRequest) {
          return await interceptor.onRequest(config);
        }
        return config;
      },
      async (error) => {
        if (interceptor.onRequestError) {
          return await interceptor.onRequestError(error);
        }
        throw error;
      }
    );
  }

  /**
   * 添加響應攔截器
   * @param interceptor - 響應攔截器
   */
  public addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.set(interceptor.name, interceptor);

    this.client.interceptors.response.use(
      async (response) => {
        if (interceptor.onResponse) {
          return await interceptor.onResponse(response);
        }
        return response;
      },
      async (error) => {
        if (interceptor.onResponseError) {
          return await interceptor.onResponseError(error);
        }
        throw error;
      }
    );
  }

  /**
   * 移除請求攔截器
   * @param name - 攔截器名稱
   */
  public removeRequestInterceptor(name: string): void {
    this.requestInterceptors.delete(name);
  }

  /**
   * 移除響應攔截器
   * @param name - 攔截器名稱
   */
  public removeResponseInterceptor(name: string): void {
    this.responseInterceptors.delete(name);
  }

  /**
   * GET請求
   * @param url - 請求URL
   * @param config - 請求配置
   * @returns 響應數據
   */
  public async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * POST請求
   * @param url - 請求URL
   * @param data - 請求數據
   * @param config - 請求配置
   * @returns 響應數據
   */
  public async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT請求
   * @param url - 請求URL
   * @param data - 請求數據
   * @param config - 請求配置
   * @returns 響應數據
   */
  public async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH請求
   * @param url - 請求URL
   * @param data - 請求數據
   * @param config - 請求配置
   * @returns 響應數據
   */
  public async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE請求
   * @param url - 請求URL
   * @param config - 請求配置
   * @returns 響應數據
   */
  public async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * 獲取Axios實例（用於高級用法）
   * @returns Axios實例
   */
  public getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}

export default ApiService; 