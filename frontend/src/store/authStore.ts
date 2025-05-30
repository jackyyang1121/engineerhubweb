import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import type { UserData } from '../api/authApi';
import * as authApi from '../api/authApi';

interface JwtPayload {
  exp: number;
  user_id: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 登录
  login: (email: string, password: string) => Promise<void>;
  // 注册
  register: (userData: authApi.RegisterData) => Promise<void>;
  // 登出
  logout: () => Promise<void>;
  // 检查认证状态
  checkAuth: () => Promise<boolean>;
  // 刷新令牌
  refreshAuth: () => Promise<boolean>;
  // 更新用户信息
  updateUser: (userData: Partial<UserData>) => Promise<void>;
  // 社交登录：Google
  loginWithGoogle: (accessToken: string) => Promise<void>;
  // 社交登录：GitHub
  loginWithGitHub: (code: string) => Promise<void>;
  // 清除错误
  clearError: () => void;
  // 设置加载状态
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始化時從 localStorage 讀取 token
        token: typeof window !== 'undefined' ? localStorage.getItem('engineerhub_token') : null,
        refreshToken: typeof window !== 'undefined' ? localStorage.getItem('engineerhub_refresh_token') : null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        
        login: async (email, password) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authApi.login({ email, password });
            
            // 同步 token 到 localStorage
            localStorage.setItem('engineerhub_token', response.access_token);
            localStorage.setItem('engineerhub_refresh_token', response.refresh_token);
            
            set({
              token: response.access_token,
              refreshToken: response.refresh_token,
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
          } catch (error) {
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : '登录失败' 
            });
            throw error;
          }
        },
        
        register: async (userData) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authApi.register(userData);
            
            // 同步 token 到 localStorage
            localStorage.setItem('engineerhub_token', response.access_token);
            localStorage.setItem('engineerhub_refresh_token', response.refresh_token);
            
            set({
              token: response.access_token,
              refreshToken: response.refresh_token,
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
          } catch (error) {
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : '注册失败' 
            });
            throw error;
          }
        },
        
        logout: async () => {
          set({ isLoading: true });
          try {
            await authApi.logout();
          } catch (error) {
            console.error('登出时出错', error);
          } finally {
            // 清除 localStorage 中的 token
            localStorage.removeItem('engineerhub_token');
            localStorage.removeItem('engineerhub_refresh_token');
            
            set({
              token: null,
              refreshToken: null,
              user: null,
              isAuthenticated: false,
              isLoading: false
            });
          }
        },
        
        checkAuth: async () => {
          const { token, refreshAuth } = get();
          
          console.log('🔐 檢查認證狀態:', {
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'None'
          });
          
          // 如果没有令牌，则未认证
          if (!token) {
            console.log('❌ 沒有 token，設為未認證');
            set({ isAuthenticated: false });
            return false;
          }
          
          // 检查令牌是否过期
          try {
            const decoded = jwtDecode<JwtPayload>(token);
            const currentTime = Date.now() / 1000;
            
            console.log('🔐 Token 解碼結果:', {
              exp: decoded.exp,
              currentTime,
              isExpired: decoded.exp <= currentTime,
              timeUntilExpiry: decoded.exp - currentTime
            });
            
            // 如果令牌还有效，获取最新的用户信息
            if (decoded.exp > currentTime) {
              try {
                console.log('✅ Token 有效，獲取用戶信息...');
                const user = await authApi.getCurrentUser();
                console.log('✅ 用戶信息獲取成功:', user.username);
                set({ user, isAuthenticated: true });
                return true;
              } catch (error) {
                console.error('❌ 獲取用戶信息失敗:', error);
                // 如果获取用户信息失败，尝试刷新token
                console.log('🔄 嘗試刷新 token...');
                return refreshAuth();
              }
            } else {
              // 令牌过期，尝试刷新
              console.log('⏰ Token 已過期，嘗試刷新...');
              return refreshAuth();
            }
          } catch (error) {
            // 解码令牌出错，尝试刷新
            console.error('❌ Token 解碼失敗:', error);
            console.log('🔄 嘗試刷新 token...');
            return refreshAuth();
          }
        },
        
        refreshAuth: async () => {
          const { refreshToken } = get();
          
          console.log('🔄 嘗試刷新認證:', {
            hasRefreshToken: !!refreshToken,
            refreshTokenPreview: refreshToken ? refreshToken.substring(0, 20) + '...' : 'None'
          });
          
          if (!refreshToken) {
            console.log('❌ 沒有 refresh token，清除認證狀態');
            // 清除所有 token
            localStorage.removeItem('engineerhub_token');
            localStorage.removeItem('engineerhub_refresh_token');
            
            set({ 
              token: null, 
              refreshToken: null, 
              user: null, 
              isAuthenticated: false 
            });
            return false;
          }
          
          try {
            console.log('🔄 調用 refresh token API...');
            // 使用統一的 API，而不是直接調用 authApi
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/auth/token/refresh/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                refresh: refreshToken
              })
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ Token 刷新成功');
            
            // 同步新 token 到 localStorage
            localStorage.setItem('engineerhub_token', data.access);
            if (data.refresh) {
              localStorage.setItem('engineerhub_refresh_token', data.refresh);
            }
            
            // 獲取用戶信息
            const user = await authApi.getCurrentUser();
            
            set({
              token: data.access,
              refreshToken: data.refresh || refreshToken,
              user: user,
              isAuthenticated: true
            });
            return true;
          } catch (error) {
            console.error('❌ Token 刷新失敗:', error);
            // 清除所有 token
            localStorage.removeItem('engineerhub_token');
            localStorage.removeItem('engineerhub_refresh_token');
            
            set({ 
              token: null, 
              refreshToken: null, 
              user: null, 
              isAuthenticated: false 
            });
            return false;
          }
        },
        
        updateUser: async (userData) => {
          set({ isLoading: true, error: null });
          try {
            const updatedUser = await authApi.updateUserProfile(userData);
            set({
              user: updatedUser,
              isLoading: false
            });
          } catch (error) {
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : '更新用户信息失败' 
            });
            throw error;
          }
        },
        
        loginWithGoogle: async (accessToken) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authApi.loginWithGoogle(accessToken);
            set({
              token: response.access_token,
              refreshToken: response.refresh_token,
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
          } catch (error) {
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : 'Google登录失败' 
            });
            throw error;
          }
        },
        
        loginWithGitHub: async (code) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authApi.loginWithGitHub(code);
            set({
              token: response.access_token,
              refreshToken: response.refresh_token,
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
          } catch (error) {
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : 'GitHub登录失败' 
            });
            throw error;
          }
        },
        
        clearError: () => set({ error: null }),
        setLoading: (isLoading) => set({ isLoading })
      }),
      {
        name: 'engineerhub-auth-storage',
        partialize: (state) => ({
          token: state.token,
          refreshToken: state.refreshToken,
          user: state.user,
          isAuthenticated: state.isAuthenticated
        })
      }
    )
  )
); 