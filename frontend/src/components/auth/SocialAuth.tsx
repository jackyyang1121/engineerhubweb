/**
 * 社交登入組件
 * 
 * 功能：
 * 1. Google OAuth2 登入
 * 2. GitHub OAuth2 登入  
 * 3. 登入狀態處理
 * 4. 錯誤處理和用戶反饋
 */

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../store/authStore';

// Google OAuth 響應類型
interface GoogleOAuthResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

// Google OAuth 客戶端配置
interface GoogleOAuthConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleOAuthResponse) => void;
}

// Google API 類型定義
interface GoogleAPI {
  accounts: {
    oauth2: {
      initTokenClient: (config: GoogleOAuthConfig) => {
        requestAccessToken: () => void;
      };
    };
  };
}

// Google 登入按鈕組件
const GoogleLoginButton: React.FC<{ onLoading: (loading: boolean) => void }> = ({ onLoading }) => {
  const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);

  const handleGoogleLogin = async () => {
    onLoading(true);
    
    try {
      // 檢查是否已載入 Google SDK
      if (!window.google) {
        toast.error('Google 登入服務未載入，請稍後再試');
        return;
      }

      // 初始化 Google OAuth2
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'profile email',
        callback: async (response: GoogleOAuthResponse) => {
          if (response.access_token) {
            try {
              await loginWithGoogle(response.access_token);
              toast.success('Google 登入成功！');
            } catch (error) {
              console.error('Google 登入失敗:', error);
              toast.error('Google 登入失敗，請稍後再試');
            }
          } else {
            toast.error(response.error_description || 'Google 登入被取消');
          }
          onLoading(false);
        },
      });

      // 觸發登入流程
      client.requestAccessToken();
    } catch (error) {
      console.error('Google 登入錯誤:', error);
      toast.error('Google 登入服務出錯');
      onLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
      使用 Google 登入
    </button>
  );
};

// GitHub 登入按鈕組件
const GitHubLoginButton: React.FC<{ onLoading: (loading: boolean) => void }> = ({ onLoading }) => {
  const loginWithGitHub = useAuthStore(state => state.loginWithGitHub);

  const handleGitHubLogin = async () => {
    onLoading(true);
    
    try {
      const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
      const redirectUri = `${window.location.origin}/auth/github/callback`;
      const scope = 'user:email';
      
      // 構建 GitHub OAuth URL
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${Math.random().toString(36).substring(7)}`;
      
      // 打開新視窗進行授權
      const authWindow = window.open(
        githubAuthUrl,
        'github-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // 監聽授權完成消息
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GITHUB_AUTH_SUCCESS') {
          try {
            await loginWithGitHub(event.data.code);
            toast.success('GitHub 登入成功！');
            authWindow?.close();
          } catch (error) {
            console.error('GitHub 登入失敗:', error);
            toast.error('GitHub 登入失敗，請稍後再試');
          }
          window.removeEventListener('message', handleMessage);
          onLoading(false);
        } else if (event.data.type === 'GITHUB_AUTH_ERROR') {
          toast.error('GitHub 登入失敗：' + (event.data.error || '未知錯誤'));
          authWindow?.close();
          window.removeEventListener('message', handleMessage);
          onLoading(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // 檢測視窗是否被關閉（用戶取消授權）
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          onLoading(false);
          toast.info('GitHub 登入已取消');
        }
      }, 1000);

    } catch (error) {
      console.error('GitHub 登入錯誤:', error);
      toast.error('GitHub 登入服務出錯');
      onLoading(false);
    }
  };

  return (
    <button
      onClick={handleGitHubLogin}
      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
    >
      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
      使用 GitHub 登入
    </button>
  );
};

// 主要社交登入組件
interface SocialAuthProps {
  className?: string;
}

const SocialAuth: React.FC<SocialAuthProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className={className}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">或使用社交帳號登入</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <GoogleLoginButton onLoading={setIsLoading} />
        <GitHubLoginButton onLoading={setIsLoading} />
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-gray-500 bg-white transition ease-in-out duration-150 cursor-not-allowed">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            登入中...
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialAuth;

// 擴展 Window 介面以支援 Google API
declare global {
  interface Window {
    google?: GoogleAPI;
  }
} 