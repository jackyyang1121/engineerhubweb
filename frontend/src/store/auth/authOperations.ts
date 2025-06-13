/**
 * EngineerHub - 認證操作服務
 * 
 * 職責：
 * - 處理登入、註冊、登出邏輯
 * - Token 刷新和管理
 * - API 錯誤處理
 * 
 * 設計原則：
 * - Narrowly focused: 專注於認證操作邏輯
 * - Flexible: 支援多種認證方式
 * - Loosely coupled: 與 UI 狀態解耦
 */

import React from 'react';
import { useAuthStore } from './authStore';
import * as authApi from '../../api/authApi';
import type { UserData, RegisterData } from '../../api/authApi';

// API 錯誤類型定義
interface ApiError {
  response?: {
    data?: {
      detail?: string;
      non_field_errors?: string | string[];
      username?: string | string[];
      email?: string | string[];
      password1?: string | string[];
      [key: string]: unknown;
    };
  };
  message?: string;
}

/**
 * 解析 API 錯誤訊息
 * @param error API 錯誤對象
 * @returns 用戶友好的錯誤訊息
 */
function parseApiError(error: unknown): string {
  console.error('API 錯誤詳情:', error);

  // 默認錯誤訊息
  let errorMessage = '操作失敗，請稍後重試';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null && 'response' in error) {
    const apiError = error as ApiError;
    const errorData = apiError.response?.data;

    if (errorData?.detail) {
      errorMessage = errorData.detail;
    } else if (errorData?.non_field_errors) {
      const nonFieldErrors = errorData.non_field_errors;
      errorMessage = Array.isArray(nonFieldErrors) 
        ? nonFieldErrors[0] 
        : nonFieldErrors || errorMessage;
    } else if (errorData?.username) {
      const usernameErrors = errorData.username;
      errorMessage = Array.isArray(usernameErrors) 
        ? `用戶名: ${usernameErrors[0]}` 
        : `用戶名: ${usernameErrors}`;
    } else if (errorData?.email) {
      const emailErrors = errorData.email;
      errorMessage = Array.isArray(emailErrors) 
        ? `郵箱: ${emailErrors[0]}` 
        : `郵箱: ${emailErrors}`;
    } else if (errorData?.password1) {
      const passwordErrors = errorData.password1;
      errorMessage = Array.isArray(passwordErrors) 
        ? `密碼: ${passwordErrors[0]}` 
        : `密碼: ${passwordErrors}`;
    }
  }

  return errorMessage;
}

/**
 * 認證操作類
 * 
 * 提供所有認證相關的業務邏輯操作
 */
export class AuthOperations {
  /**
   * 用戶登入
   * @param username 用戶名或郵箱
   * @param password 密碼
   * @returns 登入結果
   */
  static async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { setLoading, setError, setAuth } = useAuthStore.getState();
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔐 開始登入流程...');
      
      // 調用登入 API
      const response = await authApi.login({ username, password });
      
      console.log('✅ 登入 API 成功:', {
        hasAccessToken: !!response.access,
        hasRefreshToken: !!response.refresh,
        hasUser: !!response.user,
        username: response.user?.username,
      });

      // 設置認證狀態
      setAuth({
        token: response.access,
        refreshToken: response.refresh,
        user: response.user,
      });
      
      console.log('✅ 登入成功，用戶已認證');
      return { success: true };
      
    } catch (error) {
      const errorMessage = parseApiError(error);
      console.error('❌ 登入失敗:', errorMessage);
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      setLoading(false);
    }
  }

  /**
   * 用戶註冊
   * @param userData 註冊數據
   * @returns 註冊結果
   */
  static async register(userData: RegisterData): Promise<{ success: boolean; error?: string }> {
    const { setLoading, setError, setAuth } = useAuthStore.getState();
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📝 開始註冊流程...');
      
      // 調用註冊 API
      const response = await authApi.register(userData);
      
      console.log('✅ 註冊 API 成功:', {
        hasAccessToken: !!response.access,
        hasRefreshToken: !!response.refresh,
        hasUser: !!response.user,
        username: response.user?.username,
      });

      // 如果註冊後直接返回了 token，則自動登入
      if (response.access && response.refresh && response.user) {
        setAuth({
          token: response.access,
          refreshToken: response.refresh,
          user: response.user,
        });
        console.log('✅ 註冊成功並自動登入');
      } else {
        console.log('✅ 註冊成功，需要驗證郵箱或手動登入');
      }
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = parseApiError(error);
      console.error('❌ 註冊失敗:', errorMessage);
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      setLoading(false);
    }
  }

  /**
   * 用戶登出
   * @returns 登出結果
   */
  static async logout(): Promise<{ success: boolean; error?: string }> {
    const { setLoading, setError, clearAuth, refreshToken } = useAuthStore.getState();
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚪 開始登出流程...');
      
      // 如果有 refresh token，調用登出 API
      if (refreshToken) {
        await authApi.logout();
        console.log('✅ 服務端登出成功');
      }
      
      // 清除本地認證狀態
      clearAuth();
      console.log('✅ 本地狀態已清除');
      
      return { success: true };
      
    } catch (error) {
      // 登出失敗也要清除本地狀態
      console.warn('⚠️ 服務端登出失敗，但仍清除本地狀態:', error);
      clearAuth();
      
      return { success: true }; // 登出總是返回成功
      
    } finally {
      setLoading(false);
    }
  }

  /**
   * 刷新認證 Token
   * @returns 刷新結果
   */
  static async refreshAuth(): Promise<{ success: boolean; error?: string }> {
    const { refreshToken, setAuth, clearAuth, setError } = useAuthStore.getState();
    
    if (!refreshToken) {
      console.warn('⚠️ 沒有 refresh token，無法刷新');
      return { success: false, error: '沒有有效的刷新令牌' };
    }
    
    try {
      console.log('🔄 開始刷新 Token...');
      
      // 調用刷新 API
      const response = await authApi.refreshToken(refreshToken);
      
      console.log('✅ Token 刷新成功');
      
      // 更新認證狀態
      const { user } = useAuthStore.getState();
      if (user) {
        setAuth({
          token: response.access,
          refreshToken: response.refresh || refreshToken, // 使用新的或保持舊的
          user,
        });
      }
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = parseApiError(error);
      console.error('❌ Token 刷新失敗:', errorMessage);
      
      // 刷新失敗，清除認證狀態
      setError('登入已過期，請重新登入');
      clearAuth();
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 檢查認證狀態
   * @returns 檢查結果
   */
  static async checkAuth(): Promise<{ success: boolean; error?: string }> {
    const { token, isTokenValid, setInitialized } = useAuthStore.getState();
    
    try {
      console.log('🔍 檢查認證狀態...');
      
      // 如果沒有 token，直接返回未認證
      if (!token) {
        console.log('❌ 沒有 Token');
        setInitialized();
        return { success: false, error: '未登入' };
      }
      
      // 檢查 token 是否有效
      if (!isTokenValid()) {
        console.log('⚠️ Token 已過期，嘗試刷新...');
        
        // 嘗試刷新 token
        const refreshResult = await this.refreshAuth();
        if (!refreshResult.success) {
          setInitialized();
          return { success: false, error: 'Token 已過期且刷新失敗' };
        }
      }
      
      console.log('✅ 認證狀態有效');
      setInitialized();
      return { success: true };
      
    } catch (error) {
      const errorMessage = parseApiError(error);
      console.error('❌ 認證檢查失敗:', errorMessage);
      
      setInitialized();
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 更新用戶資料
   * @param userData 要更新的用戶資料
   * @returns 更新結果
   */
  static async updateUser(userData: Partial<UserData>): Promise<{ success: boolean; error?: string }> {
    const { setLoading, setError, updateUser } = useAuthStore.getState();
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('👤 更新用戶資料...');
      
      // 調用更新 API
      const updatedUser = await authApi.updateUserProfile(userData);
      
      console.log('✅ 用戶資料更新成功');
      
      // 更新本地狀態
      updateUser(updatedUser);
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = parseApiError(error);
      console.error('❌ 用戶資料更新失敗:', errorMessage);
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      setLoading(false);
    }
  }

  /**
   * 修改密碼
   * @param oldPassword 舊密碼
   * @param newPassword 新密碼
   * @returns 修改結果
   */
  static async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const { setLoading, setError } = useAuthStore.getState();
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔒 修改密碼...');
      
      // 調用修改密碼 API
      await authApi.changePassword({
        old_password: oldPassword,
        new_password1: newPassword,
        new_password2: newPassword,
      });
      
      console.log('✅ 密碼修改成功');
      return { success: true };
      
    } catch (error) {
      const errorMessage = parseApiError(error);
      console.error('❌ 密碼修改失敗:', errorMessage);
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      setLoading(false);
    }
  }
}

/**
 * 使用認證操作的 Hook
 * 
 * 提供認證操作的便捷接口
 */
export function useAuthOperations() {
  return {
    login: AuthOperations.login,
    register: AuthOperations.register,
    logout: AuthOperations.logout,
    refreshAuth: AuthOperations.refreshAuth,
    checkAuth: AuthOperations.checkAuth,
    updateUser: AuthOperations.updateUser,
    changePassword: AuthOperations.changePassword,
  };
}

/**
 * 使用自動 Token 刷新的 Hook
 * 
 * 在 Token 即將過期時自動刷新
 */
export function useAutoTokenRefresh() {
  const { isAuthenticated, isTokenValid, getTokenExpiryTime } = useAuthStore();
  
  React.useEffect(() => {
    if (!isAuthenticated || !isTokenValid()) return;
    
    const expiryTime = getTokenExpiryTime();
    if (!expiryTime) return;
    
    // 在 Token 過期前 2 分鐘刷新
    const refreshTime = Math.max(0, (expiryTime - 120) * 1000);
    
    const timer = setTimeout(async () => {
      console.log('🔄 自動刷新 Token...');
      await AuthOperations.refreshAuth();
    }, refreshTime);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, isTokenValid, getTokenExpiryTime]);
}

/**
 * 使用認證初始化的 Hook
 * 
 * 在應用啟動時檢查認證狀態
 */
export function useAuthInitialization() {
  const { isInitialized } = useAuthStore();
  const [isChecking, setIsChecking] = React.useState(false);
  
  React.useEffect(() => {
    if (isInitialized || isChecking) return;
    
    setIsChecking(true);
    AuthOperations.checkAuth().finally(() => {
      setIsChecking(false);
    });
  }, [isInitialized, isChecking]);
  
  return {
    isInitialized,
    isChecking,
  };
} 