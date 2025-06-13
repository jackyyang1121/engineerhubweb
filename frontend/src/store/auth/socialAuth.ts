/**
 * EngineerHub - 社交登入服務
 * 
 * 職責：
 * - 處理 Google 和 GitHub 社交登入
 * - 管理第三方認證流程
 * - 處理社交登入回調
 * 
 * 設計原則：
 * - Narrowly focused: 專注於社交登入邏輯
 * - Flexible: 支援多種社交平台
 * - Loosely coupled: 與主要認證邏輯分離
 */

import React from 'react';
import { useAuthStore } from './authStore';
import * as authApi from '../../api/authApi';

// 統一使用 types/google.d.ts 中的類型定義
export type { GoogleOAuthResponse, GoogleOAuthConfig } from '../../types/google';

// 社交登入提供者
export type SocialProvider = 'google' | 'github';

// 社交登入配置
interface SocialAuthConfig {
  /** Google Client ID */
  googleClientId?: string;
  /** GitHub Client ID */
  githubClientId?: string;
  /** 重定向 URL */
  redirectUrl?: string;
}

// 社交登入錯誤
interface SocialAuthError {
  provider: SocialProvider;
  error: string;
  details?: unknown;
}

/**
 * 解析社交登入錯誤
 * @param provider 社交平台
 * @param error 錯誤對象
 * @returns 社交登入錯誤
 */
function parseSocialAuthError(provider: SocialProvider, error: unknown): SocialAuthError {
  let errorMessage = '社交登入失敗';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    if ('message' in error) {
      errorMessage = String(error.message);
    } else if ('error' in error) {
      errorMessage = String(error.error);
    }
  }
  
  return {
    provider,
    error: errorMessage,
    details: error,
  };
}

/**
 * 社交登入服務類
 * 
 * 提供各種社交平台的登入功能
 */
export class SocialAuthService {
  private static config: SocialAuthConfig = {};
  
  /**
   * 設置社交登入配置
   * @param config 配置對象
   */
  static setConfig(config: SocialAuthConfig) {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Google 社交登入
   * @param accessToken Google 訪問令牌
   * @returns 登入結果
   */
  static async loginWithGoogle(accessToken: string): Promise<{ success: boolean; error?: string }> {
    const { setLoading, setError, setAuth } = useAuthStore.getState();
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔑 開始 Google 社交登入...');
      
      // 調用 Google 社交登入 API
      const response = await authApi.loginWithGoogle(accessToken);
      
      console.log('✅ Google 登入成功:', {
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
      
      console.log('✅ Google 社交登入完成');
      return { success: true };
      
    } catch (error) {
      const socialError = parseSocialAuthError('google', error);
      console.error('❌ Google 登入失敗:', socialError);
      
      setError(socialError.error);
      return { success: false, error: socialError.error };
      
    } finally {
      setLoading(false);
    }
  }
  
  /**
   * GitHub 社交登入
   * @param code GitHub 授權碼
   * @returns 登入結果
   */
  static async loginWithGitHub(code: string): Promise<{ success: boolean; error?: string }> {
    const { setLoading, setError, setAuth } = useAuthStore.getState();
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔑 開始 GitHub 社交登入...');
      
      // 調用 GitHub 社交登入 API
      const response = await authApi.loginWithGitHub(code);
      
      console.log('✅ GitHub 登入成功:', {
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
      
      console.log('✅ GitHub 社交登入完成');
      return { success: true };
      
    } catch (error) {
      const socialError = parseSocialAuthError('github', error);
      console.error('❌ GitHub 登入失敗:', socialError);
      
      setError(socialError.error);
      return { success: false, error: socialError.error };
      
    } finally {
      setLoading(false);
    }
  }
  
  /**
   * 獲取 Google 登入 URL
   * @returns Google 授權 URL
   */
  static getGoogleLoginUrl(): string {
    const { googleClientId, redirectUrl } = this.config;
    
    if (!googleClientId) {
      throw new Error('Google Client ID 未設置');
    }
    
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUrl || `${window.location.origin}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  
  /**
   * 獲取 GitHub 登入 URL
   * @returns GitHub 授權 URL
   */
  static getGitHubLoginUrl(): string {
    const { githubClientId, redirectUrl } = this.config;
    
    if (!githubClientId) {
      throw new Error('GitHub Client ID 未設置');
    }
    
    const params = new URLSearchParams({
      client_id: githubClientId,
      redirect_uri: redirectUrl || `${window.location.origin}/auth/github/callback`,
      scope: 'user:email',
      state: crypto.randomUUID(), // CSRF 防護
    });
    
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * 處理社交登入回調
   * @param provider 社交平台
   * @param params 回調參數
   * @returns 處理結果
   */
  static async handleCallback(
    provider: SocialProvider,
    params: URLSearchParams
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔄 處理 ${provider} 回調...`);
      
      switch (provider) {
        case 'google': {
          const code = params.get('code');
          if (!code) {
            throw new Error('未收到 Google 授權碼');
          }
          
          // 這裡需要先將 code 換取 access token
          // 實際實現中，這通常在後端完成
          return await this.loginWithGoogle(code);
        }
        
        case 'github': {
          const code = params.get('code');
          const error = params.get('error');
          
          if (error) {
            throw new Error(`GitHub 授權失敗: ${error}`);
          }
          
          if (!code) {
            throw new Error('未收到 GitHub 授權碼');
          }
          
          return await this.loginWithGitHub(code);
        }
        
        default:
          throw new Error(`不支援的社交平台: ${provider}`);
      }
      
    } catch (error) {
      const socialError = parseSocialAuthError(provider, error);
      console.error(`❌ ${provider} 回調處理失敗:`, socialError);
      
      return { success: false, error: socialError.error };
    }
  }
}

/**
 * 使用社交登入的 Hook
 * 
 * 提供社交登入的便捷接口
 */
export function useSocialAuth() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // 清除錯誤
  const clearError = React.useCallback(() => {
    setError(null);
  }, []);
  
  // Google 登入
  const loginWithGoogle = React.useCallback(async (accessToken: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await SocialAuthService.loginWithGoogle(accessToken);
      if (!result.success) {
        setError(result.error || 'Google 登入失敗');
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // GitHub 登入
  const loginWithGitHub = React.useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await SocialAuthService.loginWithGitHub(code);
      if (!result.success) {
        setError(result.error || 'GitHub 登入失敗');
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 打開社交登入視窗
  const openSocialLogin = React.useCallback((provider: SocialProvider) => {
    try {
      let url: string;
      
      switch (provider) {
        case 'google':
          url = SocialAuthService.getGoogleLoginUrl();
          break;
        case 'github':
          url = SocialAuthService.getGitHubLoginUrl();
          break;
        default:
          throw new Error(`不支援的社交平台: ${provider}`);
      }
      
      // 打開彈窗或重定向
      window.location.href = url;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '打開社交登入失敗';
      setError(errorMessage);
      console.error('❌ 打開社交登入失敗:', error);
    }
  }, []);
  
  return {
    isLoading,
    error,
    clearError,
    loginWithGoogle,
    loginWithGitHub,
    openSocialLogin,
  };
}

/**
 * 使用社交登入回調的 Hook
 * 
 * 處理社交登入回調頁面的邏輯
 */
export function useSocialAuthCallback(provider: SocialProvider) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [result, setResult] = React.useState<{ success: boolean; error?: string } | null>(null);
  
  React.useEffect(() => {
    const handleCallback = async () => {
      setIsProcessing(true);
      
      try {
        // 獲取 URL 參數
        const urlParams = new URLSearchParams(window.location.search);
        
        // 處理回調
        const callbackResult = await SocialAuthService.handleCallback(provider, urlParams);
        
        setResult(callbackResult);
        
        // 如果成功，可以重定向到主頁
        if (callbackResult.success) {
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '回調處理失敗';
        setResult({ success: false, error: errorMessage });
        console.error('❌ 社交登入回調失敗:', error);
      } finally {
        setIsProcessing(false);
      }
    };
    
    handleCallback();
  }, [provider]);
  
  return {
    isProcessing,
    result,
  };
}

/**
 * 使用 Google One Tap 登入的 Hook
 * 
 * 實現 Google One Tap 無縫登入體驗
 */
export function useGoogleOneTap() {
  const [isReady, setIsReady] = React.useState(false);
  
  React.useEffect(() => {
    // 載入 Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsReady(true);
    };
    
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(script);
    };
  }, []);
  
  // 初始化 One Tap
  const initializeOneTap = React.useCallback((clientId: string) => {
    if (!isReady || !window.google) return;
    
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          // 使用 ID Token 進行登入
          await SocialAuthService.loginWithGoogle(response.credential);
        } catch (error) {
          console.error('❌ Google One Tap 登入失敗:', error);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    
    // 顯示 One Tap 提示
    window.google.accounts.id.prompt();
  }, [isReady]);
  
  return {
    isReady,
    initializeOneTap,
  };
}

 