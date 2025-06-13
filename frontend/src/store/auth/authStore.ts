/**
 * EngineerHub - 核心認證狀態管理
 * 
 * 職責：
 * - 管理認證狀態
 * - 提供基本的登入/登出功能
 * - Token 管理
 * 
 * 設計原則：
 * - Narrowly focused: 只處理核心認證邏輯
 * - Flexible: 支援不同的認證方式
 * - Loosely coupled: 不依賴特定的 UI 組件
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import type { UserData } from '../../api/authApi';

// JWT Payload 接口
interface JwtPayload {
  /** Token 過期時間（Unix 時間戳） */
  exp: number;
  /** 用戶 ID */
  user_id: string;
  /** Token 簽發時間 */
  iat?: number;
  /** Token 唯一標識符 */
  jti?: string;
}

// 認證狀態接口
interface AuthState {
  // ==================== 狀態屬性 ====================
  /** JWT Access Token */
  token: string | null;
  /** JWT Refresh Token */
  refreshToken: string | null;
  /** 用戶數據 */
  user: UserData | null;
  /** 認證狀態 */
  isAuthenticated: boolean;
  /** 載入狀態 */
  isLoading: boolean;
  /** 錯誤訊息 */
  error: string | null;
  /** 是否已初始化完成 */
  isInitialized: boolean;

  // ==================== 核心方法 ====================
  /**
   * 設置認證數據
   * @param authData 認證數據
   */
  setAuth: (authData: {
    token: string;
    refreshToken: string;
    user: UserData;
  }) => void;

  /**
   * 清除認證數據
   */
  clearAuth: () => void;

  /**
   * 用戶登出
   */
  logout: () => void;

  /**
   * 設置載入狀態
   * @param isLoading 載入狀態
   */
  setLoading: (isLoading: boolean) => void;

  /**
   * 設置錯誤訊息
   * @param error 錯誤訊息
   */
  setError: (error: string | null) => void;

  /**
   * 更新用戶資料
   * @param userData 用戶資料
   */
  updateUser: (userData: Partial<UserData>) => void;

  /**
   * 檢查 Token 是否有效
   * @returns Token 是否有效
   */
  isTokenValid: () => boolean;

  /**
   * 獲取 Token 剩餘有效時間（秒）
   * @returns 剩餘時間或 null
   */
  getTokenExpiryTime: () => number | null;

  /**
   * 標記為已初始化
   */
  setInitialized: () => void;
}

/**
 * 檢查 JWT Token 是否有效
 * @param token JWT Token
 * @returns Token 是否有效
 */
function isValidToken(token: string | null): boolean {
  if (!token) return false;

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const currentTime = Date.now() / 1000;
    
    // 檢查 Token 是否已過期（提前 30 秒判斷，用於刷新緩衝）
    return decoded.exp > currentTime + 30;
  } catch (error) {
    console.warn('Token 解析失敗:', error);
    return false;
  }
}

/**
 * 獲取 Token 過期時間
 * @param token JWT Token
 * @returns 過期時間戳或 null
 */
function getTokenExpiry(token: string | null): number | null {
  if (!token) return null;

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.exp;
  } catch (error) {
    console.warn('Token 解析失敗:', error);
    return null;
  }
}

/**
 * 核心認證狀態管理
 * 
 * 提供最基礎的認證狀態管理功能
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // ==================== 初始狀態 ====================
        token: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isInitialized: false,

        // ==================== 核心方法 ====================
        setAuth: (authData) => {
          console.log('🔐 設置認證數據');
          
          set({
            token: authData.token,
            refreshToken: authData.refreshToken,
            user: authData.user,
            isAuthenticated: true,
            error: null,
          });
          
          console.log('✅ 認證數據已設置');
        },

        clearAuth: () => {
          console.log('🔐 清除認證數據');
          
          set({
            token: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            error: null,
          });
          
          console.log('✅ 認證數據已清除');
        },

        logout: () => {
          console.log('🚪 用戶登出');
          
          // 清除認證數據
          set({
            token: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            error: null,
          });
          
          console.log('✅ 用戶已登出');
        },

        setLoading: (isLoading) => {
          set({ isLoading });
        },

        setError: (error) => {
          set({ error });
        },

        updateUser: (userData) => {
          const { user } = get();
          if (user) {
            console.log('👤 更新用戶資料:', userData);
            set({
              user: { ...user, ...userData },
            });
          }
        },

        isTokenValid: () => {
          const { token } = get();
          return isValidToken(token);
        },

        getTokenExpiryTime: () => {
          const { token } = get();
          const expiry = getTokenExpiry(token);
          
          if (!expiry) return null;
          
          const currentTime = Date.now() / 1000;
          return Math.max(0, expiry - currentTime);
        },

        setInitialized: () => {
          set({ isInitialized: true });
        },
      }),
      {
        name: 'engineerhub-auth',
        version: 1,
        // 只持久化必要的狀態
        partialize: (state) => ({
          token: state.token,
          refreshToken: state.refreshToken,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
        // 恢復時的處理
        onRehydrateStorage: () => (state) => {
          console.log('🔄 恢復認證狀態:', {
            hasToken: !!state?.token,
            hasUser: !!state?.user,
            isAuthenticated: state?.isAuthenticated,
          });
          
          // 檢查恢復的 Token 是否仍然有效
          if (state?.token && !isValidToken(state.token)) {
            console.warn('⚠️ 恢復的 Token 已過期，清除認證狀態');
            state.token = null;
            state.refreshToken = null;
            state.user = null;
            state.isAuthenticated = false;
          }
        },
      }
    ),
    {
      name: 'auth-store',
      enabled: import.meta.env.DEV,
    }
  )
);

/**
 * 認證狀態選擇器
 * 
 * 提供常用的狀態選擇器，優化性能
 */
export const authSelectors = {
  /** 是否已認證 */
  isAuthenticated: (state: AuthState) => state.isAuthenticated,
  
  /** 當前用戶 */
  user: (state: AuthState) => state.user,
  
  /** 用戶 ID */
  userId: (state: AuthState) => state.user?.id,
  
  /** 用戶名 */
  username: (state: AuthState) => state.user?.username,
  
  /** 是否為管理員 */
  isAdmin: (state: AuthState) => state.user?.is_staff || false,
  
  /** 載入狀態 */
  isLoading: (state: AuthState) => state.isLoading,
  
  /** 錯誤訊息 */
  error: (state: AuthState) => state.error,
  
  /** 是否已初始化 */
  isInitialized: (state: AuthState) => state.isInitialized,
  
  /** Token 是否有效 */
  isTokenValid: (state: AuthState) => state.isTokenValid(),
  
  /** Token 剩餘時間 */
  tokenExpiryTime: (state: AuthState) => state.getTokenExpiryTime(),
};

/**
 * 使用認證狀態的 Hook
 * 
 * 提供簡化的認證狀態訪問
 */
export function useAuth() {
  const store = useAuthStore();
  
  return {
    // 狀態
    isAuthenticated: store.isAuthenticated,
    user: store.user,
    isLoading: store.isLoading,
    error: store.error,
    isInitialized: store.isInitialized,
    
    // 計算屬性
    userId: store.user?.id,
    username: store.user?.username,
    isAdmin: store.user?.is_staff || false,
    isTokenValid: store.isTokenValid(),
    tokenExpiryTime: store.getTokenExpiryTime(),
    
    // 方法
    setAuth: store.setAuth,
    clearAuth: store.clearAuth,
    setLoading: store.setLoading,
    setError: store.setError,
    updateUser: store.updateUser,
    setInitialized: store.setInitialized,
  };
}

/**
 * 使用用戶資料的 Hook
 * 
 * 只訂閱用戶相關狀態，避免不必要的重新渲染
 */
export function useUser() {
  const user = useAuthStore(authSelectors.user);
  const isAuthenticated = useAuthStore(authSelectors.isAuthenticated);
  const updateUser = useAuthStore((state) => state.updateUser);
  
  return {
    user,
    isAuthenticated,
    updateUser,
    // 便捷屬性
    userId: user?.id,
    username: user?.username,
    email: user?.email,
    fullName: user?.first_name && user?.last_name 
      ? `${user.first_name} ${user.last_name}` 
      : user?.username,
    isAdmin: user?.is_staff || false,
    avatar: user?.avatar,
  };
}

/**
 * 使用載入狀態的 Hook
 * 
 * 只訂閱載入相關狀態
 */
export function useAuthLoading() {
  const isLoading = useAuthStore(authSelectors.isLoading);
  const setLoading = useAuthStore((state) => state.setLoading);
  
  return {
    isLoading,
    setLoading,
  };
}

/**
 * 使用錯誤狀態的 Hook
 * 
 * 只訂閱錯誤相關狀態
 */
export function useAuthError() {
  const error = useAuthStore(authSelectors.error);
  const setError = useAuthStore((state) => state.setError);
  
  return {
    error,
    setError,
    clearError: () => setError(null),
  };
} 