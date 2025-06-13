/**
 * EngineerHub - 認證服務類
 * 
 * 職責：
 * - 處理用戶認證邏輯（登入、註冊、登出）
 * - 管理JWT Token（儲存、刷新、驗證）
 * - 處理社交登入（Google、GitHub）
 * - 用戶狀態管理和持久化
 * 
 * 設計原則：
 * - Narrowly focused: 專注於認證相關功能
 * - Flexible: 支援多種認證方式和配置
 * - Loosely coupled: 與UI組件和具體存儲實現解耦
 */

import { ApiService, ApiError } from './ApiService';
import type { AxiosRequestConfig } from 'axios';
import type { UserData as User, LoginData as LoginCredentials, RegisterData } from '../types';

/**
 * Token儲存介面 - 支援依賴注入
 */
export interface TokenStorage {
  /** 獲取Token */
  getToken(): string | null;
  /** 儲存Token */
  setToken(token: string): void;
  /** 移除Token */
  removeToken(): void;
  /** 獲取刷新Token */
  getRefreshToken(): string | null;
  /** 儲存刷新Token */
  setRefreshToken(token: string): void;
  /** 移除刷新Token */
  removeRefreshToken(): void;
}

/**
 * 本地儲存實現
 */
export class LocalTokenStorage implements TokenStorage {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  getToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  removeToken(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  removeRefreshToken(): void {
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
}

/**
 * 記憶體儲存實現（用於測試）
 */
export class MemoryTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  getToken(): string | null {
    return this.accessToken;
  }

  setToken(token: string): void {
    this.accessToken = token;
  }

  removeToken(): void {
    this.accessToken = null;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  removeRefreshToken(): void {
    this.refreshToken = null;
  }
}

/**
 * 認證事件類型
 */
export interface AuthEvents {
  /** 登入成功 */
  onLogin?: (user: User) => void;
  /** 登出 */
  onLogout?: () => void;
  /** Token刷新成功 */
  onTokenRefresh?: (token: string) => void;
  /** 認證錯誤 */
  onAuthError?: (error: ApiError) => void;
}

/**
 * 認證服務配置
 */
export interface AuthServiceConfig {
  /** API服務實例 */
  apiService: ApiService;
  /** Token儲存實現 */
  tokenStorage?: TokenStorage;
  /** 事件回調 */
  events?: AuthEvents;
  /** Token刷新閾值（分鐘） */
  refreshThreshold?: number;
  /** 自動刷新Token */
  autoRefresh?: boolean;
}

/**
 * 登入響應
 */
export interface LoginResponse {
  /** 用戶信息 */
  user: User;
  /** 訪問Token */
  access_token: string;
  /** 刷新Token */
  refresh_token: string;
  /** Token過期時間（秒） */
  expires_in?: number;
}

/**
 * 認證服務類
 * 
 * 功能：
 * - 統一的認證API調用
 * - Token自動管理和刷新
 * - 社交登入集成
 * - 認證狀態監控
 * - 事件驅動的狀態更新
 * 
 * @example
 * ```typescript
 * const authService = new AuthService({
 *   apiService: new ApiService({ baseURL: '/api' }),
 *   tokenStorage: new LocalTokenStorage(),
 *   events: {
 *     onLogin: (user) => console.log('用戶已登入:', user),
 *     onLogout: () => console.log('用戶已登出'),
 *   }
 * });
 * 
 * // 登入用戶
 * const user = await authService.login({
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 * ```
 */
export class AuthService {
  /** API服務實例 */
  private readonly apiService: ApiService;
  
  /** Token儲存實現 */
  private readonly tokenStorage: TokenStorage;
  
  /** 事件回調 */
  private readonly events: AuthEvents;
  
  /** 配置選項 */
  private readonly config: Required<Omit<AuthServiceConfig, 'apiService' | 'tokenStorage' | 'events'>>;
  
  /** 當前用戶 */
  private currentUser: User | null = null;
  
  /** Token刷新Promise（防止重複刷新） */
  private refreshPromise: Promise<string> | null = null;

  /**
   * 建構函數
   * @param config - 認證服務配置
   */
  constructor(config: AuthServiceConfig) {
    this.apiService = config.apiService;
    this.tokenStorage = config.tokenStorage || new LocalTokenStorage();
    this.events = config.events || {};
    
    // 設定預設配置
    this.config = {
      refreshThreshold: 5, // 5分鐘
      autoRefresh: true,
      ...config,
    };

    // 設置認證攔截器
    this.setupAuthInterceptor();
    
    // 如果啟用自動刷新，設置定時器
    if (this.config.autoRefresh) {
      this.setupAutoRefresh();
    }
  }

  /**
   * 設置認證攔截器
   * 
   * 功能：
   * - 自動在請求中添加Token
   * - 處理401錯誤並嘗試刷新Token
   */
  private setupAuthInterceptor(): void {
    // 請求攔截器：添加Token
    this.apiService.addRequestInterceptor({
      name: 'auth',
      onRequest: async (config) => {
        const token = this.tokenStorage.getToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
    });

    // 響應攔截器：處理認證錯誤
    this.apiService.addResponseInterceptor({
      name: 'auth',
      onResponseError: async (error: unknown) => {
        // 定義axios錯誤類型，避免使用any
        const axiosError = error as { 
          response?: { status?: number }; 
          config?: AxiosRequestConfig & { retryCount?: number } 
        };
        
        // 如果是401錯誤且有刷新Token，嘗試刷新
        if (axiosError.response?.status === 401 && this.tokenStorage.getRefreshToken()) {
          try {
            await this.refreshToken();
            
            // 重新發送原始請求
            const originalRequest = axiosError.config;
            const newToken = this.tokenStorage.getToken();
            if (newToken && originalRequest) {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.apiService.getAxiosInstance().request(originalRequest);
            }
          } catch (refreshError) {
            // 刷新失敗，執行登出
            await this.logout();
            this.events.onAuthError?.(refreshError as ApiError);
            throw refreshError;
          }
        }
        
        throw error;
      },
    });
  }

  /**
   * 設置自動刷新Token
   */
  private setupAutoRefresh(): void {
    setInterval(async () => {
      const token = this.tokenStorage.getToken();
      if (token && this.isTokenNearExpiry(token)) {
        try {
          await this.refreshToken();
        } catch (error) {
          console.warn('自動刷新Token失敗:', error);
        }
      }
    }, 60000); // 每分鐘檢查一次
  }

  /**
   * 檢查Token是否接近過期
   * @param token - JWT Token
   * @returns 是否接近過期
   */
  private isTokenNearExpiry(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // 轉換為毫秒
      const now = Date.now();
      const threshold = this.config.refreshThreshold * 60 * 1000; // 轉換為毫秒
      
      return (exp - now) <= threshold;
    } catch {
      // 無法解析Token，認為已過期
      return true;
    }
  }

  /**
   * 用戶登入
   * @param credentials - 登入憑證
   * @returns 登入成功的用戶信息
   */
  public async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await this.apiService.post<LoginResponse>('/auth/login/', credentials);
      
      // 儲存Token
      this.tokenStorage.setToken(response.access_token);
      this.tokenStorage.setRefreshToken(response.refresh_token);
      
      // 設置當前用戶
      this.currentUser = response.user;
      
      // 觸發登入事件
      this.events.onLogin?.(response.user);
      
      return response.user;
    } catch (error) {
      this.events.onAuthError?.(error as ApiError);
      throw error;
    }
  }

  /**
   * 用戶註冊
   * @param data - 註冊數據
   * @returns 註冊成功的用戶信息
   */
  public async register(data: RegisterData): Promise<User> {
    try {
      const response = await this.apiService.post<LoginResponse>('/auth/register/', data);
      
      // 儲存Token
      this.tokenStorage.setToken(response.access_token);
      this.tokenStorage.setRefreshToken(response.refresh_token);
      
      // 設置當前用戶
      this.currentUser = response.user;
      
      // 觸發登入事件
      this.events.onLogin?.(response.user);
      
      return response.user;
    } catch (error) {
      this.events.onAuthError?.(error as ApiError);
      throw error;
    }
  }

  /**
   * 用戶登出
   */
  public async logout(): Promise<void> {
    try {
      // 調用後端登出API
      await this.apiService.post('/auth/logout/');
    } catch (error) {
      // 即使後端登出失敗，也要清除本地狀態
      console.warn('後端登出失敗:', error);
    } finally {
      // 清除本地狀態
      this.tokenStorage.removeToken();
      this.tokenStorage.removeRefreshToken();
      this.currentUser = null;
      
      // 觸發登出事件
      this.events.onLogout?.();
    }
  }

  /**
   * 刷新Token
   * @returns 新的訪問Token
   */
  public async refreshToken(): Promise<string> {
    // 防止重複刷新
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * 執行Token刷新
   * @returns 新的訪問Token
   */
  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new ApiError('沒有刷新Token', 401);
    }

    try {
      const response = await this.apiService.post<{ access_token: string }>('/auth/token/refresh/', {
        refresh: refreshToken,
      });

      // 儲存新Token
      this.tokenStorage.setToken(response.access_token);
      
      // 觸發刷新事件
      this.events.onTokenRefresh?.(response.access_token);
      
      return response.access_token;
    } catch (error) {
      // 刷新失敗，清除所有Token
      this.tokenStorage.removeToken();
      this.tokenStorage.removeRefreshToken();
      throw error;
    }
  }

  /**
   * 獲取當前用戶信息
   * @returns 當前用戶或null
   */
  public async getCurrentUser(): Promise<User | null> {
    // 如果已有用戶信息，直接返回
    if (this.currentUser) {
      return this.currentUser;
    }

    // 如果有Token，嘗試獲取用戶信息
    const token = this.tokenStorage.getToken();
    if (token) {
      try {
        const user = await this.apiService.get<User>('/auth/user/');
        this.currentUser = user;
        return user;
      } catch (error) {
        // 獲取用戶信息失敗，可能Token已過期
        console.warn('獲取用戶信息失敗:', error);
        await this.logout();
      }
    }

    return null;
  }

  /**
   * 檢查是否已認證
   * @returns 是否已認證
   */
  public isAuthenticated(): boolean {
    return !!this.tokenStorage.getToken();
  }

  /**
   * Google社交登入
   * @param code - Google授權碼
   * @returns 登入成功的用戶信息
   */
  public async googleLogin(code: string): Promise<User> {
    try {
      const response = await this.apiService.post<LoginResponse>('/auth/google/', { code });
      
      // 儲存Token
      this.tokenStorage.setToken(response.access_token);
      this.tokenStorage.setRefreshToken(response.refresh_token);
      
      // 設置當前用戶
      this.currentUser = response.user;
      
      // 觸發登入事件
      this.events.onLogin?.(response.user);
      
      return response.user;
    } catch (error) {
      this.events.onAuthError?.(error as ApiError);
      throw error;
    }
  }

  /**
   * GitHub社交登入
   * @param code - GitHub授權碼
   * @returns 登入成功的用戶信息
   */
  public async githubLogin(code: string): Promise<User> {
    try {
      const response = await this.apiService.post<LoginResponse>('/auth/github/', { code });
      
      // 儲存Token
      this.tokenStorage.setToken(response.access_token);
      this.tokenStorage.setRefreshToken(response.refresh_token);
      
      // 設置當前用戶
      this.currentUser = response.user;
      
      // 觸發登入事件
      this.events.onLogin?.(response.user);
      
      return response.user;
    } catch (error) {
      this.events.onAuthError?.(error as ApiError);
      throw error;
    }
  }

  /**
   * 更新用戶資料
   * @param data - 更新數據
   * @returns 更新後的用戶信息
   */
  public async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const updatedUser = await this.apiService.patch<User>('/auth/user/', data);
      this.currentUser = updatedUser;
      return updatedUser;
    } catch (error) {
      this.events.onAuthError?.(error as ApiError);
      throw error;
    }
  }

  /**
   * 更改密碼
   * @param oldPassword - 舊密碼
   * @param newPassword - 新密碼
   */
  public async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await this.apiService.post('/auth/password/change/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
    } catch (error) {
      this.events.onAuthError?.(error as ApiError);
      throw error;
    }
  }

  /**
   * 請求密碼重置
   * @param email - 用戶電子郵件
   */
  public async requestPasswordReset(email: string): Promise<void> {
    try {
      await this.apiService.post('/auth/password/reset/', { email });
    } catch (error) {
      this.events.onAuthError?.(error as ApiError);
      throw error;
    }
  }

  /**
   * 確認密碼重置
   * @param token - 重置Token
   * @param newPassword - 新密碼
   */
  public async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    try {
      await this.apiService.post('/auth/password/reset/confirm/', {
        token,
        new_password: newPassword,
      });
    } catch (error) {
      this.events.onAuthError?.(error as ApiError);
      throw error;
    }
  }

  /**
   * 獲取當前Token
   * @returns 當前訪問Token
   */
  public getToken(): string | null {
    return this.tokenStorage.getToken();
  }

  /**
   * 驗證電子郵件
   * @param token - 驗證Token
   */
  public async verifyEmail(token: string): Promise<void> {
    try {
      await this.apiService.post('/auth/email/verify/', { token });
    } catch (error) {
      this.events.onAuthError?.(error as ApiError);
      throw error;
    }
  }

  /**
   * 重新發送驗證郵件
   */
  public async resendVerificationEmail(): Promise<void> {
    try {
      await this.apiService.post('/auth/email/verify/resend/');
    } catch (error) {
      this.events.onAuthError?.(error as ApiError);
      throw error;
    }
  }
}

export default AuthService; 