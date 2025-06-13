/**
 * EngineerHub - 認證模組統一導出
 * 
 * 整合所有認證相關功能：
 * - 核心認證狀態管理
 * - 認證操作服務
 * - 社交登入服務
 * 
 * 設計原則：
 * - Narrowly focused: 提供清晰的模組界面
 * - Flexible: 支援按需導入
 * - Loosely coupled: 模組間低耦合
 */

import React from 'react';

// 核心認證狀態管理
import {
  useAuthStore,
  authSelectors,
  useAuth,
  useUser,
  useAuthLoading,
  useAuthError,
} from './authStore';

// 認證操作服務
import {
  AuthOperations,
  useAuthOperations,
  useAutoTokenRefresh,
  useAuthInitialization,
} from './authOperations';

// 社交登入服務
import {
  SocialAuthService,
  useSocialAuth,
  useSocialAuthCallback,
  useGoogleOneTap,
  type SocialProvider,
} from './socialAuth';

// 重新導出所有功能
export {
  useAuthStore,
  authSelectors,
  useAuth,
  useUser,
  useAuthLoading,
  useAuthError,
  AuthOperations,
  useAuthOperations,
  useAutoTokenRefresh,
  useAuthInitialization,
  SocialAuthService,
  useSocialAuth,
  useSocialAuthCallback,
  useGoogleOneTap,
  type SocialProvider,
};

// 類型定義
export type { UserData, RegisterData } from '../../api/authApi';

/**
 * 認證模組初始化
 * 
 * 提供認證模組的統一初始化入口
 */
export class AuthModule {
  private static initialized = false;
  
  /**
   * 初始化認證模組
   * @param config 配置選項
   */
  static async initialize(config?: {
    /** 是否啟用自動 Token 刷新 */
    enableAutoRefresh?: boolean;
    /** 社交登入配置 */
    socialAuth?: {
      googleClientId?: string;
      githubClientId?: string;
      redirectUrl?: string;
    };
    /** 是否在開發環境啟用調試 */
    enableDebug?: boolean;
  }) {
    if (this.initialized) {
      console.warn('認證模組已初始化');
      return;
    }
    
    console.log('🚀 初始化認證模組...');
    
    // 設置社交登入配置
    if (config?.socialAuth) {
      const { SocialAuthService } = await import('./socialAuth');
      SocialAuthService.setConfig(config.socialAuth);
    }
    
    // 檢查認證狀態
    const { AuthOperations } = await import('./authOperations');
    await AuthOperations.checkAuth();
    
    this.initialized = true;
    console.log('✅ 認證模組初始化完成');
  }
  
  /**
   * 獲取認證模組狀態
   */
  static getStatus() {
    return {
      initialized: this.initialized,
    };
  }
}

/**
 * 使用完整認證功能的 Hook
 * 
 * 提供最完整的認證功能集合
 */
export function useFullAuth() {
  // 核心狀態
  const auth = useAuth();
  
  // 操作方法
  const operations = useAuthOperations();
  
  // 社交登入
  const socialAuth = useSocialAuth();
  
  return {
    // 狀態
    ...auth,
    
    // 基本操作
    ...operations,
    
    // 社交登入
    social: socialAuth,
    
    // 便捷方法
    /**
     * 快速登入
     * @param username 用戶名
     * @param password 密碼
     */
    quickLogin: async (username: string, password: string) => {
      return await operations.login(username, password);
    },
    
    /**
     * 快速登出
     */
    quickLogout: async () => {
      return await operations.logout();
    },
    
    /**
     * 檢查是否需要重新認證
     */
    needsReauth: () => {
      return !auth.isAuthenticated || !auth.isTokenValid;
    },
    
    /**
     * 獲取用戶顯示名稱
     */
    getDisplayName: () => {
      if (!auth.user) return '未知用戶';
      
      if (auth.user.first_name && auth.user.last_name) {
        return `${auth.user.first_name} ${auth.user.last_name}`;
      }
      
      return auth.user.username || auth.user.email || '未知用戶';
    },
    
    /**
     * 檢查用戶權限
     * @param permission 權限名稱
     */
    hasPermission: (permission: string) => {
      // 這裡可以實現更複雜的權限檢查邏輯
      switch (permission) {
        case 'admin':
          return auth.isAdmin;
        case 'post.create':
          return auth.isAuthenticated;
        case 'post.edit':
          return auth.isAuthenticated;
        case 'post.delete':
          return auth.isAuthenticated || auth.isAdmin;
        case 'user.edit':
          return auth.isAuthenticated;
        default:
          return false;
      }
    },
  };
}

/**
 * 使用認證守衛的 Hook
 * 
 * 提供路由守衛功能
 */
export function useAuthGuard() {
  const { isAuthenticated, isInitialized } = useAuth();
  
  return {
    /** 是否已認證 */
    isAuthenticated,
    /** 是否已初始化 */
    isInitialized,
    /** 是否可以訪問受保護的路由 */
    canAccess: isAuthenticated && isInitialized,
    /** 是否需要顯示載入畫面 */
    showLoading: !isInitialized,
    /** 是否需要重定向到登入頁 */
    shouldRedirectToLogin: isInitialized && !isAuthenticated,
  };
}

/**
 * 使用認證狀態同步的 Hook
 * 
 * 在多個標籤頁間同步認證狀態
 */
export function useAuthSync() {
  const { clearAuth, setAuth } = useAuth();
  
  React.useEffect(() => {
    // 監聽 storage 變化（用於跨標籤頁同步）
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'engineerhub-auth') {
        try {
          const newAuthData = event.newValue ? JSON.parse(event.newValue) : null;
          
          if (!newAuthData || !newAuthData.state?.isAuthenticated) {
            // 其他標籤頁登出了
            clearAuth();
          } else if (newAuthData.state?.token) {
            // 其他標籤頁登入了
            setAuth({
              token: newAuthData.state.token,
              refreshToken: newAuthData.state.refreshToken,
              user: newAuthData.state.user,
            });
          }
        } catch (error) {
          console.error('❌ 同步認證狀態失敗:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [clearAuth, setAuth]);
}

// 預設導出
export default AuthModule; 