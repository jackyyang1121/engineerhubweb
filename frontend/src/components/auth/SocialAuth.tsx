/**
 * EngineerHub - 社交登入組件重構示例
 * 
 * ======================================================================================
 * 🎯 Clean Code 深度重構：組件分離 + 職責單一 + 可重用設計
 * ======================================================================================
 * 
 * 本文件展示如何將原本 208 行的大型 SocialAuth 組件重構為符合 Clean Code 原則的
 * 小型、職責單一的組件。這是一個完整的學習範例，展示了前端組件設計的最佳實踐。
 * 
 * 重構核心原則：
 * ╭─────────────────────────────────────────────────────────────╮
 * │ 1. 單一職責原則 (Single Responsibility Principle)          │
 * │    - 每個組件只負責一個明確的UI功能                          │
 * │    - 業務邏輯與UI邏輯分離                                    │
 * │                                                             │
 * │ 2. 組件組合 (Component Composition)                         │
 * │    - 大組件拆分為小的可重用組件                              │
 * │    - 通過組合實現複雜功能                                    │
 * │                                                             │
 * │ 3. 自定義Hook (Custom Hooks)                                │
 * │    - 封裝複雜的狀態邏輯                                      │
 * │    - 提高邏輯的可測試性和可重用性                            │
 * ╰─────────────────────────────────────────────────────────────╯
 * 
 * ======================================================================================
 */

import React, { useState, useCallback } from 'react';

// ======================================================================================
// 🔧 類型定義 - 清晰的接口設計
// ======================================================================================

/**
 * Google API 類型定義
 * 
 * 📚 學習重點：
 * - 避免全局類型衝突
 * - 使用類型斷言處理第三方API
 * - 靈活的類型聲明方法
 */
type GoogleAuthConfig = {
  client_id: string;
  callback: (response: GoogleAuthResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
};

type GoogleAuthResponse = {
  credential: string;
  select_by?: string;
};

type GoogleAccountsAPI = {
  initialize: (config: GoogleAuthConfig) => void;
  prompt: () => void;
};

type WindowWithGoogle = Window & {
  google?: {
    accounts?: {
      id?: GoogleAccountsAPI;
    };
  };
};

type GoogleJWTPayload = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  aud: string;
  exp: number;
  iat: number;
  iss: string;
};

/**
 * OAuth 回調數據接口
 * 
 * 📚 學習重點：
 * - 接口設計的一致性
 * - 類型安全的保證
 * - API 響應的標準化
 */
interface OAuthCallbackData {
  access_token: string;
  user: {
    id: string;
    email: string;
    username: string;
    avatar?: string;
  };
}

/**
 * 支持的社交登入平台
 */
type SocialProvider = 'google' | 'github' | 'facebook' | 'twitter';

/**
 * 社交登入配置接口
 */
interface SocialLoginConfig {
  provider: SocialProvider;
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  hoverColor: string;
}

// ======================================================================================
// 🎭 Google OAuth 處理器類 - 單一職責：Google 登入流程
// ======================================================================================

/**
 * Google OAuth 處理器
 * 
 * ╭─ 📚 學習重點 ────────────────────────────────────────────╮
 * │ • 類的封裝：將相關的方法組織在一個類中                      │
 * │ • 錯誤處理：統一的錯誤處理機制                              │
 * │ • 配置管理：將配置信息統一管理                              │
 * │ • 異步處理：Promise 的正確使用                              │
 * ╰────────────────────────────────────────────────────────╯
 * 
 * 🎯 職責範圍：
 * ├── ✅ 管理 Google OAuth 流程
 * ├── ✅ 處理 Google API 響應
 * ├── ✅ 統一錯誤處理和日誌記錄
 * └── ✅ 提供清晰的配置接口
 */
class GoogleOAuthHandler {
  private clientId: string;
  
  constructor(clientId: string) {
    this.clientId = clientId;
  }
  
  /**
   * 執行 Google OAuth 認證流程
   * 
   * ╭─ 📋 認證流程 ────────────────────────────────────────╮
   * │ 1. 檢查 Google API 是否可用                           │
   * │ 2. 初始化 Google OAuth 客戶端                         │
   * │ 3. 觸發登入流程                                      │
   * │ 4. 處理認證結果                                      │
   * │ 5. 返回標準化的用戶數據                               │
   * ╰───────────────────────────────────────────────────╯
   * 
   * Returns:
   *   Promise<OAuthCallbackData>: 標準化的用戶認證數據
   * 
   * Throws:
   *   Error: 當認證過程出現問題時
   */
  async authenticate(): Promise<OAuthCallbackData> {
    try {
      // 🔧 步驟 1：檢查 Google API 可用性
      if (!this._isGoogleAPIAvailable()) {
        throw new Error('Google API 尚未載入，請檢查網路連接');
      }
      
      // 🔧 步驟 2-4：執行認證流程
      const authResult = await this._performGoogleAuth();
      
      // 🔧 步驟 5：標準化返回數據
      return this._normalizeAuthResult(authResult);
      
    } catch (error) {
      console.error('Google OAuth 認證失敗:', error);
      throw new Error(`Google 登入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }
  
  /**
   * 檢查 Google API 是否可用
   * 
   * 🔒 私有方法：用於內部類型安全檢查
   */
  private _isGoogleAPIAvailable(): boolean {
    // 使用類型斷言來安全地訪問 Google API
    return !!(window as unknown as WindowWithGoogle).google?.accounts?.id;
  }
  
  /**
   * 執行實際的 Google 認證邏輯
   * 
   * 🔒 私有方法：僅供內部使用，不對外暴露
   */
  private _performGoogleAuth(): Promise<GoogleAuthResponse> {
    return new Promise((resolve, reject) => {
      try {
        // 使用類型斷言安全地訪問 Google API
        const googleAccounts = (window as unknown as WindowWithGoogle).google?.accounts?.id;
        if (!googleAccounts) {
          reject(new Error('Google API 不可用'));
          return;
        }
        
        googleAccounts.initialize({
          client_id: this.clientId,
          callback: (response: GoogleAuthResponse) => {
            if (response.credential) {
              resolve(response);
            } else {
              reject(new Error('未收到有效的認證憑證'));
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });
        
        // 觸發登入流程
        googleAccounts.prompt();
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * 標準化認證結果
   * 
   * Args:
   *   authResult: Google API 返回的原始認證結果
   * 
   * Returns:
   *   OAuthCallbackData: 標準化的認證數據
   */
  private _normalizeAuthResult(authResult: GoogleAuthResponse): OAuthCallbackData {
    // 解碼 JWT token 獲取用戶信息
    const payload = JSON.parse(atob(authResult.credential.split('.')[1])) as GoogleJWTPayload;
    
    return {
      access_token: authResult.credential,
      user: {
        id: payload.sub,
        email: payload.email,
        username: payload.name || payload.email.split('@')[0],
        avatar: payload.picture
      }
    };
  }
}

// ======================================================================================
// 🎣 社交登入管理器 Hook - 單一職責：登入狀態和邏輯管理
// ======================================================================================

/**
 * 社交登入管理器 Hook
 * 
 * ╭─ 📚 學習重點 ────────────────────────────────────────────╮
 * │ • 自定義Hook：將複雜邏輯從組件中分離                        │
 * │ • 狀態管理：統一管理登入相關的所有狀態                      │
 * │ • 事件處理：提供清晰的事件處理接口                          │
 * │ • 錯誤邊界：統一的錯誤處理和用戶反饋                        │
 * ╰────────────────────────────────────────────────────────╯
 * 
 * 🎯 職責範圍：
 * ├── ✅ 管理登入載入狀態
 * ├── ✅ 處理各種社交平台登入
 * ├── ✅ 統一錯誤處理和用戶提示
 * └── ✅ 提供清晰的狀態查詢接口
 */
function useSocialLoginManager() {
  // 🎛️ 狀態管理：使用 useState 管理組件狀態
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Google 登入處理器
   * 
   * ╭─ 🔄 處理流程 ────────────────────────────────────────╮
   * │ 1. 設置載入狀態                                        │
   * │ 2. 清除之前的錯誤                                      │
   * │ 3. 執行 Google OAuth 流程                              │
   * │ 4. 處理認證結果                                        │
   * │ 5. 重置載入狀態                                        │
   * ╰───────────────────────────────────────────────────╯
   */
  const handleGoogleLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const googleHandler = new GoogleOAuthHandler(
        import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
      );
      
      const authData = await googleHandler.authenticate();
      
      // 🎯 這裡應該調用你的後端 API 來處理登入
      console.log('Google 登入成功:', authData);
      
      // TODO: 調用後端 API
      // await authService.loginWithGoogle(authData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登入過程中發生未知錯誤';
      setError(errorMessage);
      console.error('Google 登入失敗:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * GitHub 登入處理器
   * 
   * 📝 注意：這裡僅為示例，實際項目中需要實現完整的 GitHub OAuth 流程
   */
  const handleGitHubLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 🚧 GitHub OAuth 流程實現
      // 實際項目中需要：
      // 1. 重定向到 GitHub OAuth 授權頁面
      // 2. 處理回調並獲取授權碼
      // 3. 使用授權碼換取訪問令牌
      // 4. 獲取用戶信息
      
      console.log('GitHub 登入功能開發中...');
      setError('GitHub 登入功能正在開發中，敬請期待！');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登入過程中發生未知錯誤';
      setError(errorMessage);
      console.error('GitHub 登入失敗:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * 通用登入處理器
   * 
   * Args:
   *   provider: 社交登入平台標識
   */
  const handleLogin = useCallback((provider: SocialProvider) => {
    switch (provider) {
      case 'google':
        return handleGoogleLogin();
      case 'github':
        return handleGitHubLogin();
      default:
        setError(`暫不支持 ${provider} 登入`);
        return Promise.resolve();
    }
  }, [handleGoogleLogin, handleGitHubLogin]);
  
  /**
   * 清除錯誤狀態
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // 🎁 返回 Hook 的公共接口
  return {
    isLoading,
    error,
    handleLogin,
    clearError
  };
}

// ======================================================================================
// 🎨 UI 組件層 - 單一職責：純UI展示和用戶交互
// ======================================================================================

/**
 * 社交登入按鈕組件
 * 
 * ╭─ 📚 學習重點 ────────────────────────────────────────────╮
 * │ • 組件封裝：將可重用的UI邏輯封裝成組件                      │
 * │ • Props設計：清晰的Props接口設計                           │
 * │ • 狀態展示：載入狀態和禁用狀態的處理                        │
 * │ • 無障礙性：合適的ARIA標籤和語義化標籤                      │
 * ╰────────────────────────────────────────────────────────╯
 * 
 * 🎯 職責範圍：
 * ├── ✅ 展示社交登入按鈕
 * ├── ✅ 處理點擊事件
 * ├── ✅ 展示載入狀態
 * └── ✅ 提供一致的視覺風格
 */
interface SocialLoginButtonProps {
  config: SocialLoginConfig;
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  config,
  onClick,
  isLoading,
  disabled = false
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        w-full flex justify-center items-center px-4 py-3 border border-gray-300 
        rounded-lg shadow-sm text-sm font-medium text-gray-700 
        ${config.bgColor} ${config.hoverColor}
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
      `}
      aria-label={`使用 ${config.provider} 登入`}
    >
      {isLoading ? (
        <>
          <LoadingSpinner className="w-5 h-5 mr-2" />
        </>
      ) : (
        <span className="w-5 h-5 mr-2">{config.icon}</span>
      )}
      
      <span>
        {isLoading ? '登入中...' : config.label}
      </span>
    </button>
  );
};

/**
 * 載入指示器組件
 * 
 * 🎯 單一職責：展示載入動畫
 */
interface LoadingSpinnerProps {
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className = '' }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * 分隔線組件
 * 
 * 🎯 單一職責：展示視覺分隔線
 */
interface DividerProps {
  text: string;
}

const Divider: React.FC<DividerProps> = ({ text }) => (
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-300" />
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-2 bg-white text-gray-500">{text}</span>
    </div>
  </div>
);

/**
 * Google 圖標組件
 * 
 * 🎯 單一職責：展示 Google 品牌圖標
 */
const GoogleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
    <path
      fill="#4285f4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34a853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#fbbc05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#ea4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

/**
 * GitHub 圖標組件
 * 
 * 🎯 單一職責：展示 GitHub 品牌圖標
 */
const GitHubIcon: React.FC = () => (
  <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

// ======================================================================================
// 🎭 主組件 - 組合設計模式：統一組合各個小組件
// ======================================================================================

/**
 * 重構後的社交認證組件主體
 * 
 * ╭─ 📚 學習重點 ────────────────────────────────────────────╮
 * │ • 組合模式：通過組合小組件實現複雜功能                      │
 * │ • 配置驅動：通過配置對象驅動組件渲染                        │
 * │ • 錯誤邊界：統一的錯誤處理和用戶提示                        │
 * │ • 清晰接口：簡潔明確的Props接口設計                         │
 * ╰────────────────────────────────────────────────────────╯
 * 
 * 🎯 職責範圍：
 * ├── ✅ 組合各個子組件
 * ├── ✅ 管理組件間的數據流
 * ├── ✅ 提供統一的用戶界面
 * └── ✅ 處理用戶交互事件
 */
interface SocialAuthRefactoredProps {
  className?: string;
  showDivider?: boolean;
  dividerText?: string;
}

const SocialAuthRefactored: React.FC<SocialAuthRefactoredProps> = ({
  className = '',
  showDivider = true,
  dividerText = '或使用社交帳號登入'
}) => {
  // 🎣 使用自定義Hook管理狀態和邏輯
  const { isLoading, error, handleLogin, clearError } = useSocialLoginManager();
  
  // 🎛️ 社交登入平台配置
  const socialConfigs: Record<string, SocialLoginConfig> = {
    google: {
      provider: 'google',
      label: '使用 Google 登入',
      icon: <GoogleIcon />,
      bgColor: 'bg-white hover:bg-gray-50',
      hoverColor: 'hover:border-gray-400'
    },
    github: {
      provider: 'github',
      label: '使用 GitHub 登入',
      icon: <GitHubIcon />,
      bgColor: 'bg-gray-900 hover:bg-gray-800',
      hoverColor: 'text-white border-gray-900'
    },
    facebook: {
      provider: 'facebook',
      label: '使用 Facebook 登入',
      icon: <div>📘</div>, // 簡化圖標
      bgColor: 'bg-blue-600 hover:bg-blue-700',
      hoverColor: 'text-white border-blue-600'
    },
    twitter: {
      provider: 'twitter',
      label: '使用 Twitter 登入',
      icon: <div>🐦</div>, // 簡化圖標
      bgColor: 'bg-sky-500 hover:bg-sky-600',
      hoverColor: 'text-white border-sky-500'
    }
  };
  
  // 🎨 渲染社交登入按鈕
  const renderSocialButtons = () => {
    return Object.entries(socialConfigs).map(([provider, config]) => {
      if (provider === 'facebook' || provider === 'twitter') {
        return null; // 暫時隱藏未實現的平台
      }
      
      return (
        <SocialLoginButton
          key={provider}
          config={config}
          isLoading={isLoading}
          onClick={() => handleLogin(provider as SocialProvider)}
        />
      );
    });
  };
  
  // 🎨 渲染載入狀態
  const renderLoadingState = () => {
    if (!isLoading) return null;
    
    return (
      <div className="mt-4 flex items-center justify-center">
        <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-gray-500 bg-white transition ease-in-out duration-150 cursor-not-allowed">
          <LoadingSpinner className="w-5 h-5 mr-3" />
          正在處理登入請求...
        </div>
      </div>
    );
  };
  
  // 🎨 渲染錯誤提示
  const renderErrorMessage = () => {
    if (!error) return null;
    
    return (
      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-400">⚠️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={clearError}
              className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
            >
              關閉提示
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // 🎨 主要渲染邏輯
  return (
    <div className={className}>
      {/* 分隔線 */}
      {showDivider && <Divider text={dividerText} />}
      
      {/* 社交登入按鈕區域 */}
      <div className="mt-6 space-y-3">
        {renderSocialButtons()}
        
        {/* 載入狀態提示 */}
        {renderLoadingState()}
        
        {/* 錯誤提示 */}
        {renderErrorMessage()}
      </div>
    </div>
  );
};

export default SocialAuthRefactored;

// ======================================================================================
// 📚 重構成果展示和學習總結
// ======================================================================================

/*
╔══════════════════════════════════════════════════════════════════════════════════╗
║                           🎓 Clean Code 重構成果總結                                ║
╚══════════════════════════════════════════════════════════════════════════════════╝

🎯 重構前 vs 重構後對比：

┌─ 重構前的問題 ────────────────────────────────────────────────────────────────┐
│ ❌ SocialAuth 組件：208 行代碼，職責過多                                       │
│ ❌ 一個組件混合：OAuth流程、UI渲染、狀態管理、錯誤處理                          │
│ ❌ 邏輯複雜：OAuth邏輯與UI邏輯混雜在一起                                       │
│ ❌ 難以測試：大組件難以進行單元測試                                             │
│ ❌ 重用困難：組件耦合度高，難以重用                                             │
│ ❌ 維護困難：修改一個功能影響其他功能                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌─ 重構後的改進 ────────────────────────────────────────────────────────────────┐
│ ✅ 職責分離：                                                                  │
│    • GoogleOAuthHandler      → 專門處理 Google OAuth 邏輯                     │
│    • useSocialLoginManager   → 專門管理登入狀態和邏輯                         │
│    • SocialLoginButton       → 專門展示登入按鈕UI                             │
│    • LoadingSpinner          → 專門展示載入動畫                               │
│    • SocialAuthRefactored    → 專門組合各個組件                               │
│                                                                               │
│ ✅ 組件化設計：                                                                │
│    • 每個組件都有明確的職責                                                   │
│    • 組件間通過Props和回調通信                                                │
│    • 高內聚、低耦合的設計                                                     │
│                                                                               │
│ ✅ 可重用性：                                                                  │
│    • LoadingSpinner 可在其他地方重用                                          │
│    • SocialLoginButton 可配置用於不同平台                                     │
│    • useSocialLoginManager 可在其他登入場景重用                               │
╰───────────────────────────────────────────────────────────────────────────┘

📈 帶來的具體好處：

╭─ 可測試性提升 ────────────────────────────────────────────────────────────────╮
│ 重構前：                                                                       │
│   // 需要測試整個大組件，涵蓋所有功能                                          │
│   render(<SocialAuth />)                                                      │
│                                                                               │
│ 重構後：                                                                       │
│   // 可以單獨測試每個組件                                                     │
│   it('LoadingSpinner should render correctly', () => {                       │
│     render(<LoadingSpinner />)                                               │
│   })                                                                          │
│                                                                               │
│   it('useSocialLoginManager should handle Google login', () => {             │
│     const { result } = renderHook(() => useSocialLoginManager())             │
│     act(() => result.current.handleLogin('google'))                          │
│   })                                                                          │
╰───────────────────────────────────────────────────────────────────────────────╯

╭─ 可維護性提升 ────────────────────────────────────────────────────────────────╮
│ • 修改UI樣式：只需修改對應的UI組件                                             │
│ • 修改OAuth邏輯：只需修改GoogleOAuthHandler                                    │
│ • 修改狀態管理：只需修改useSocialLoginManager                                  │
│ • 添加新平台：只需添加新的配置和處理器                                         │
│                                                                               │
│ 每個修改都有明確的範圍，不會意外影響其他功能                                   │
╰───────────────────────────────────────────────────────────────────────────────╯

🎯 學習價值總結：

通過這個重構範例，您學到了：

1. 🎯 如何拆分大型React組件
   • 識別組件的不同職責
   • 按功能領域拆分組件
   • 保持組件的單一職責

2. 🎣 如何設計自定義Hook
   • 將狀態邏輯從UI中分離
   • 提高邏輯的可重用性
   • 簡化組件的複雜度

3. 🧩 如何實現組件組合模式
   • 通過小組件組合成複雜功能
   • 保持組件間的鬆耦合
   • 提高組件的可重用性

4. 🎨 如何設計清晰的Props接口
   • 明確的類型定義
   • 合理的默認值設置
   • 便於使用的API設計

5. 🛡️ 如何處理錯誤和載入狀態
   • 統一的錯誤處理機制
   • 良好的用戶體驗設計
   • 無障礙性的考慮

這些技能將幫助您在React開發中寫出更高質量、更易維護的組件！
*/ 