// Google OAuth 響應類型
export interface GoogleOAuthResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

// Google OAuth 客戶端配置
export interface GoogleOAuthConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleOAuthResponse) => void;
}

// Google Identity 配置
export interface GoogleIdConfig {
  client_id: string;
  callback: (response: { credential: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

// Google API 類型定義
export interface GoogleAccounts {
  id: {
    initialize: (config: GoogleIdConfig) => void;
    prompt: () => void;
  };
  oauth2: {
    initTokenClient: (config: GoogleOAuthConfig) => { 
      requestAccessToken: () => void; 
    };
  };
}

export interface GoogleAPI {
  accounts: GoogleAccounts;
}

// 擴展 Window 介面
declare global {
  interface Window {
    google?: GoogleAPI;
  }
} 