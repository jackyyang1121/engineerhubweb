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
        token: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        
        login: async (email, password) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authApi.login({ email, password });
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
          
          // 如果没有令牌，则未认证
          if (!token) {
            set({ isAuthenticated: false });
            return false;
          }
          
          // 检查令牌是否过期
          try {
            const decoded = jwtDecode<JwtPayload>(token);
            const currentTime = Date.now() / 1000;
            
            // 如果令牌还有效，获取最新的用户信息
            if (decoded.exp > currentTime) {
              try {
                const user = await authApi.getCurrentUser();
                set({ user, isAuthenticated: true });
                return true;
              } catch (error) {
                // 如果获取用户信息失败但令牌有效，可能是API问题
                // 此处暂且保持认证状态
                return true;
              }
            } else {
              // 令牌过期，尝试刷新
              return refreshAuth();
            }
          } catch (error) {
            // 解码令牌出错，尝试刷新
            return refreshAuth();
          }
        },
        
        refreshAuth: async () => {
          const { refreshToken } = get();
          if (!refreshToken) {
            set({ 
              token: null, 
              refreshToken: null, 
              user: null, 
              isAuthenticated: false 
            });
            return false;
          }
          
          try {
            const response = await authApi.refreshToken();
            set({
              token: response.access_token,
              refreshToken: response.refresh_token,
              user: response.user,
              isAuthenticated: true
            });
            return true;
          } catch (error) {
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