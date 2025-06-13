/**
 * EngineerHub - 認證狀態管理 Store
 * 
 * 使用 Zustand 管理用戶認證狀態，整合 dj-rest-auth + SimpleJWT
 * 
 * 主要功能：
 * - JWT Token 管理（access + refresh）
 * - 用戶登入/登出/註冊
 * - 自動 Token 刷新
 * - 認證狀態持久化
 * - 社交登入支援
 */

import React from 'react'; // 導入 React，用於 useEffect
import { create } from 'zustand'; // 導入 zustand 的 create 函數，用於創建 store，store功能是管理用戶認證狀態
import { devtools, persist } from 'zustand/middleware'; // 導入 zustand 的中間件：devtools（用於調試工具集成）和 persist（用於持久化存儲）
import { jwtDecode } from 'jwt-decode'; // 導入 jwt-decode 函數，用於解碼 JWT 令牌
import type { UserData } from '../api/authApi'; // 導入 UserData 類型，從 authApi 文件中
import * as authApi from '../api/authApi'; // 導入 authApi 模塊中的所有導出內容

// JWT Payload 接口定義
interface JwtPayload {
  exp: number;        // Token 過期時間（Unix 時間戳）
  user_id: string;    // 用戶 ID
  iat?: number;       // Token 簽發時間
  jti?: string;       // Token 唯一標識符
}

// 新增 API 錯誤類型定義
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

// 認證狀態接口定義
interface AuthState {
  // ==================== 狀態屬性 ====================
  token: string | null;           // JWT Access Token
  refreshToken: string | null;    // JWT Refresh Token
  user: UserData | null;          // 用戶數據
  isAuthenticated: boolean;       // 認證狀態
  isLoading: boolean;             // 加載狀態
  error: string | null;           // 錯誤訊息
  isInitialized: boolean;         // 是否已初始化完成

  // ==================== 認證方法 ====================
  /**
   * 用戶登入
   * @param username 用戶名或郵箱
   * @param password 密碼
   */
  login: (username: string, password: string) => Promise<void>;

  /**
   * 用戶註冊
   * @param userData 註冊數據
   */
  register: (userData: authApi.RegisterData) => Promise<void>;

  /**
   * 用戶登出
   */
  logout: () => Promise<void>;

  /**
   * 檢查認證狀態
   * @returns 是否已認證
   */
  checkAuth: () => Promise<boolean>;

  /**
   * 刷新認證 Token
   * @returns 刷新是否成功
   */
  refreshAuth: () => Promise<boolean>;

  /**
   * 更新用戶信息
   * @param userData 要更新的用戶數據
   */
  updateUser: (userData: Partial<UserData>) => Promise<void>;

  // ==================== 社交登入方法 ====================
  /**
   * Google 社交登入
   * @param accessToken Google 訪問令牌
   */
  loginWithGoogle: (accessToken: string) => Promise<void>;

  /**
   * GitHub 社交登入
   * @param code GitHub 授權碼
   */
  loginWithGitHub: (code: string) => Promise<void>;

  // ==================== 工具方法 ====================
  /**
   * 清除錯誤訊息
   */
  clearError: () => void;

  /**
   * 設置加載狀態
   * @param isLoading 加載狀態
   */
  setLoading: (isLoading: boolean) => void;
}

// 創建認證 Store
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // ==================== 初始狀態 ====================
        // persist 會自動從 localStorage 恢復這些狀態
        token: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isInitialized: false,

        // ==================== 登入方法 ====================
        login: async (username, password) => {
          set({ isLoading: true, error: null });
          
          try {
            console.log('🔐 開始登入流程...');
            
            // 調用 dj-rest-auth 登入 API
            const response = await authApi.login({ username, password });
            
            console.log('✅ 登入 API 成功，響應數據:', {
              hasAccessToken: !!response.access,
              hasRefreshToken: !!response.refresh,
              hasUser: !!response.user,
              username: response.user?.username
            });

            console.log('✅ Token 將通過 persist 自動保存');

            // 更新 Store 狀態
            set({
              token: response.access,
              refreshToken: response.refresh,
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            
            console.log('✅ Store 狀態已更新，用戶已認證');
            
            // 調試：檢查設置後的狀態
            const currentState = get();
            console.log('🔍 登入後當前狀態:', {
              hasToken: !!currentState.token,
              hasRefreshToken: !!currentState.refreshToken,
              hasUser: !!currentState.user,
              isAuthenticated: currentState.isAuthenticated,
              tokenLength: currentState.token?.length || 0
            });
            
          } catch (error) {
            console.error('❌ 登入失敗:', error);
            
            // 處理錯誤訊息
            let errorMessage = '登入失敗';
            if (error instanceof Error) {
              errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null && 'response' in error) {
              const apiError = error as ApiError;
              if (apiError.response?.data?.detail) {
                errorMessage = apiError.response.data.detail;
              } else if (apiError.response?.data?.non_field_errors) {
                const nonFieldErrors = apiError.response.data.non_field_errors;
                errorMessage = Array.isArray(nonFieldErrors) ? nonFieldErrors[0] : nonFieldErrors || '登入失敗';
              }
            }
            
            set({ 
              isLoading: false, 
              error: errorMessage,
              isAuthenticated: false,
              token: null,
              refreshToken: null,
              user: null
            });
            
            // Token 清除將通過 persist 自動處理
            
            throw error;
          }
        },

        // ==================== 註冊方法 ====================
        register: async (userData) => {
          set({ isLoading: true, error: null });
          
          try {
            console.log('📝 開始註冊流程...');
            
            // 調用 dj-rest-auth 註冊 API
            const response = await authApi.register(userData);
            
            console.log('✅ 註冊 API 成功，響應數據:', {
              hasAccessToken: !!response.access,
              hasRefreshToken: !!response.refresh,
              hasUser: !!response.user,
              accessTokenPreview: response.access ? response.access.substring(0, 50) + '...' : 'None',
              refreshTokenPreview: response.refresh ? response.refresh.substring(0, 50) + '...' : 'None',
              username: response.user?.username || 'None'
            });

            // Token 將通過 persist 自動保存

            // 更新 Store 狀態
            set({
              token: response.access,
              refreshToken: response.refresh,
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            
            console.log('✅ Store 狀態已更新');
            
            // 驗證設置後的狀態
            const currentState = get();
            console.log('🔍 註冊後當前狀態驗證:', {
              hasToken: !!currentState.token,
              hasRefreshToken: !!currentState.refreshToken,
              hasUser: !!currentState.user,
              isAuthenticated: currentState.isAuthenticated,
              tokenPreview: currentState.token ? currentState.token.substring(0, 50) + '...' : 'None',
              username: currentState.user?.username || 'None'
            });
            
            // 檢查 persist 是否正確保存
            setTimeout(() => {
              try {
                const persistedData = localStorage.getItem('engineerhub-auth-storage');
                if (persistedData) {
                  const parsed = JSON.parse(persistedData);
                  console.log('🔍 註冊後 localStorage 驗證:', {
                    hasToken: !!parsed.state?.token,
                    hasRefreshToken: !!parsed.state?.refreshToken,
                    hasUser: !!parsed.state?.user,
                    isAuthenticated: !!parsed.state?.isAuthenticated,
                    tokenPreview: parsed.state?.token ? parsed.state.token.substring(0, 50) + '...' : 'None'
                  });
                } else {
                  console.error('❌ localStorage 中沒有找到 persist 數據');
                }
              } catch (error) {
                console.error('❌ 檢查 localStorage 失敗:', error);
              }
            }, 100);
            
            console.log('✅ 註冊成功，用戶已認證');
            
          } catch (error) {
            console.error('❌ 註冊失敗:', error);
            
            // 處理錯誤訊息
            let errorMessage = '註冊失敗';
            if (error instanceof Error) {
              errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null && 'response' in error) {
              const apiError = error as ApiError;
              if (apiError.response?.data?.detail) {
                errorMessage = apiError.response.data.detail;
              } else if (apiError.response?.data) {
                // 處理字段特定錯誤
                const data = apiError.response.data;
                const fieldErrors: string[] = [];
                
                if (data.username) {
                  const usernameError = Array.isArray(data.username) ? data.username[0] : data.username;
                  fieldErrors.push(`用戶名: ${usernameError}`);
                }
                if (data.email) {
                  const emailError = Array.isArray(data.email) ? data.email[0] : data.email;
                  fieldErrors.push(`郵箱: ${emailError}`);
                }
                if (data.password1) {
                  const passwordError = Array.isArray(data.password1) ? data.password1[0] : data.password1;
                  fieldErrors.push(`密碼: ${passwordError}`);
                }
                if (data.non_field_errors) {
                  const nonFieldErrors = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
                  fieldErrors.push(nonFieldErrors || '註冊失敗');
                }
                
                if (fieldErrors.length > 0) {
                  errorMessage = fieldErrors.join('; ');
                }
              }
            }
            
            set({ 
              isLoading: false, 
              error: errorMessage,
              isAuthenticated: false,
              token: null,
              refreshToken: null,
              user: null
            });
            
            throw error;
          }
        },

        // ==================== 登出方法 ====================
        logout: async () => {
          set({ isLoading: true });
          
          try {
            console.log('🚪 開始登出流程...');
            
            // 調用 dj-rest-auth 登出 API（會將 refresh token 加入黑名單）
            await authApi.logout();
            
            console.log('✅ 登出 API 成功');
            
          } catch (error) {
            console.error('⚠️ 登出 API 失敗，但仍清除本地狀態:', error);
          } finally {
            // 無論 API 是否成功，都清除本地狀態
            // Token 清除將通過 persist 自動處理

            set({
              token: null,
              refreshToken: null,
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            });
            
            console.log('✅ 本地認證狀態已清除');
          }
        },

        // ==================== 檢查認證狀態 ====================
        checkAuth: async () => {
          const state = get();
          const { token, refreshAuth, isInitialized } = state;

          console.log('🔐 檢查認證狀態:', {
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'None',
            isInitialized
          });

          // 如果persist還沒有恢復完成，等待一小段時間再重試
          if (!isInitialized) {
            console.log('⏳ 等待 persist 恢復...');
            await new Promise(resolve => setTimeout(resolve, 100));
            return get().checkAuth(); // 遞歸重試
          }

          // 如果沒有 Token，則未認證
          if (!token) {
            console.log('❌ 沒有 Token，設為未認證');
            set({ isAuthenticated: false });
            return false;
          }

          try {
            // 檢查 Token 是否過期
            const decoded = jwtDecode<JwtPayload>(token);
            const currentTime = Date.now() / 1000;
            
            console.log('🔍 Token 檢查:', {
              exp: decoded.exp,
              current: currentTime,
              isExpired: decoded.exp < currentTime,
              timeLeft: Math.max(0, decoded.exp - currentTime)
            });

            // 如果 Token 過期，嘗試刷新
            if (decoded.exp < currentTime) {
              console.log('⏰ Token 已過期，嘗試刷新...');
              const refreshSuccess = await refreshAuth();
              
              if (!refreshSuccess) {
                console.log('❌ Token 刷新失敗，設為未認證');
                set({ isAuthenticated: false });
                return false;
              }
              
              console.log('✅ Token 刷新成功');
            }

            // 獲取當前用戶信息
            try {
              const user = await authApi.getCurrentUser();
              set({ 
                user, 
                isAuthenticated: true 
              });
              
              console.log('✅ 用戶信息已更新:', user.username);
              return true;
              
            } catch (userError) {
              console.error('❌ 獲取用戶信息失敗:', userError);
              
              // 如果獲取用戶信息失敗，可能是 Token 無效
              const refreshSuccess = await refreshAuth();
              if (refreshSuccess) {
                // 刷新成功後重試獲取用戶信息
                try {
                  const user = await authApi.getCurrentUser();
                  set({ 
                    user, 
                    isAuthenticated: true 
                  });
                  return true;
                } catch (retryError) {
                  console.error('❌ 重試獲取用戶信息失敗:', retryError);
                }
              }
              
              set({ isAuthenticated: false });
              return false;
            }

          } catch (error) {
            console.error('❌ Token 解析失敗:', error);
            set({ isAuthenticated: false });
            return false;
          }
        },

        // ==================== 刷新認證 Token ====================
        refreshAuth: async () => {
          const { refreshToken } = get();

          if (!refreshToken) {
            console.log('❌ 沒有 Refresh Token');
            return false;
          }

          try {
            console.log('🔄 開始刷新 Token...');
            
            // 調用 dj-rest-auth Token 刷新 API
            const response = await authApi.refreshToken(refreshToken);
            
            console.log('✅ Token 刷新成功');

            // Token 將通過 persist 自動保存

            // 更新 Store 狀態
            set({
              token: response.access,
              refreshToken: response.refresh || refreshToken, // 如果沒有新的 refresh token，保持原有的
              isAuthenticated: true
            });

            return true;

          } catch (error) {
            console.error('❌ Token 刷新失敗:', error);
            
            // 刷新失敗，清除所有認證狀態
            // Token 清除將通過 persist 自動處理
            
            set({
              token: null,
              refreshToken: null,
              user: null,
              isAuthenticated: false
            });

            return false;
          }
        },

        // ==================== 更新用戶信息 ====================
        updateUser: async (userData) => {
          set({ isLoading: true, error: null });
          
          try {
            console.log('👤 更新用戶信息...');
            
            // 調用 dj-rest-auth 用戶更新 API
            const updatedUser = await authApi.patchUserProfile(userData);
            
            set({
              user: updatedUser,
              isLoading: false
            });
            
            console.log('✅ 用戶信息更新成功');
            
          } catch (error) {
            console.error('❌ 用戶信息更新失敗:', error);
            
            let errorMessage = '更新失敗';
            if (error instanceof Error) {
              errorMessage = error.message;
            }
            
            set({ 
              isLoading: false, 
              error: errorMessage 
            });
            
            throw error;
          }
        },

        // ==================== Google 社交登入 ====================
        loginWithGoogle: async (accessToken) => {
          set({ isLoading: true, error: null });
          
          try {
            console.log('🔐 Google 社交登入...');
            
            const response = await authApi.loginWithGoogle(accessToken);
            
            // Token 將通過 persist 自動保存

            set({
              token: response.access,
              refreshToken: response.refresh,
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
            
            console.log('✅ Google 登入成功');
            
          } catch (error) {
            console.error('❌ Google 登入失敗:', error);
            
            set({ 
              isLoading: false, 
              error: 'Google 登入失敗' 
            });
            
            throw error;
          }
        },

        // ==================== GitHub 社交登入 ====================
        loginWithGitHub: async (code) => {
          set({ isLoading: true, error: null });
          
          try {
            console.log('🔐 GitHub 社交登入...');
            
            const response = await authApi.loginWithGitHub(code);
            
            // Token 將通過 persist 自動保存

            set({
              token: response.access,
              refreshToken: response.refresh,
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
            
            console.log('✅ GitHub 登入成功');
            
          } catch (error) {
            console.error('❌ GitHub 登入失敗:', error);
            
            set({ 
              isLoading: false, 
              error: 'GitHub 登入失敗' 
            });
            
            throw error;
          }
        },

        // ==================== 工具方法 ====================
        clearError: () => {
          set({ error: null });
        },

        setLoading: (isLoading) => {
          set({ isLoading });
        },
      }),
      {
        name: 'engineerhub-auth-storage', // localStorage 鍵名
        partialize: (state) => ({
          // 只持久化必要的狀態
          token: state.token,
          refreshToken: state.refreshToken,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          // 不持久化 isInitialized，每次啟動都重新初始化
        }),
        // 添加persist完成回調
        onRehydrateStorage: () => (state) => {
          console.log('🔄 Persist 恢復完成:', {
            hasState: !!state,
            hasToken: !!state?.token,
            hasRefreshToken: !!state?.refreshToken,
            hasUser: !!state?.user,
            isAuthenticated: !!state?.isAuthenticated,
            tokenPreview: state?.token ? state.token.substring(0, 20) + '...' : 'None'
          });
          
          // 額外調試：檢查localStorage中的實際數據
          try {
            const persistedData = localStorage.getItem('engineerhub-auth-storage');
            console.log('📦 localStorage 實際數據:', {
              exists: !!persistedData,
              preview: persistedData ? persistedData.substring(0, 100) + '...' : 'None'
            });
            
            if (persistedData) {
              const parsedData = JSON.parse(persistedData);
              console.log('📊 解析後的數據結構:', {
                hasState: !!parsedData.state,
                hasToken: !!parsedData.state?.token,
                hasRefreshToken: !!parsedData.state?.refreshToken,
                hasUser: !!parsedData.state?.user,
                isAuthenticated: !!parsedData.state?.isAuthenticated
              });
            }
          } catch (error) {
            console.error('❌ 讀取localStorage失敗:', error);
          }
          
          // 恢復完成後自動標記為已初始化
          if (state) {
            state.isInitialized = true;
          }
        },
      }
    ),
    {
      name: 'engineerhub-auth-store', // DevTools 中的 store 名稱
    }
  )
);

// ==================== 專用 Hook：等待 Persist 初始化 ====================
/**
 * 確保 persist 恢復完成的 Hook
 * 在應用啟動時使用，確保 checkAuth 在正確的時機執行
 * 
 * @returns 是否已初始化完成
 */
export const useAuthInitialized = () => {
  const isInitialized = useAuthStore(state => state.isInitialized);
  const checkAuth = useAuthStore(state => state.checkAuth);
  
  // 當初始化完成時，自動執行認證檢查
  React.useEffect(() => {
    if (isInitialized) {
      console.log('✅ Auth Store 已初始化，執行認證檢查');
      checkAuth();
    }
  }, [isInitialized, checkAuth]);
  
  return isInitialized;
};



/*
🔍 一、瀏覽器 ≠ 電腦
先澄清一個觀念：
🖥️ 電腦（作業系統） 是硬體加上作業系統（像 Windows、macOS、Linux）
🌐 瀏覽器（Chrome、Firefox、Edge、Safari） 是一個軟體，跑在作業系統上。
所以當你「開啟瀏覽器」的時候，瀏覽器就好像是一個沙盒（sandbox），它把「JavaScript 執行環境」隔離起來，並且附帶一個 window 物件，裡面包含：
localStorage
document
navigator
alert
fetch
等各種跟「瀏覽器功能」有關的東西。

🔍 二、localStorage 是瀏覽器的 API
localStorage 其實是瀏覽器提供的一個本地儲存機制，讓你可以把一些小資料（像 token）存在使用者的電腦上（其實就是瀏覽器的資料夾或資料庫裡）。
但注意：
👉 是瀏覽器幫你管理，不是直接存在電腦檔案系統的某個檔案。
你程式裡調用：
localStorage.setItem('token', '123');
這行程式碼會跟瀏覽器說：「請幫我把 token 存起來。」
瀏覽器就會在它的資料庫（像 IndexedDB 或專屬的 localStorage 資料結構）裡記住這個資料，並且只跟當前的「domain（網域）」綁定（例如：https://example.com）。
所以在使用者電腦上，localStorage 的資料是由瀏覽器控制的，並不會直接暴露在桌面或某個檔案給你看（但進階玩家可以透過瀏覽器的開發者工具查看）。

🔍 三、瀏覽器與電腦的溝通流程
整個流程大致是這樣的：
1️⃣ 你打開一個網頁，瀏覽器開始執行（這時相當於「啟動」了 sandbox）。
2️⃣ 瀏覽器載入 JavaScript 檔案（通常從 HTML 的 <script> 標籤）。
3️⃣ JavaScript 程式開始執行。
4️⃣ 當程式碼呼叫 localStorage.setItem，就把資料請求交給瀏覽器。
5️⃣ 瀏覽器負責把資料存到它管理的儲存區（sandbox 的 localStorage）。
6️⃣ 下次使用者重新整理或回來時，同一個 domain 的程式碼可以呼叫 localStorage.getItem 把資料取回來。
所以其實電腦本身只是執行「瀏覽器程式」的一個容器，而 localStorage 資料都在瀏覽器的沙盒裡面。

🔍 四、token 的實際儲存方式
🗂️ localStorage 是瀏覽器自己的儲存（底層通常是檔案或資料庫），而且是按「domain」隔離的。
🖥️ 你沒辦法直接在作業系統（像 Finder 或 Windows 檔案總管）裡看到 localStorage 存在哪個檔案（除非你專門去找 browser profile 資料夾，甚至還得拆解資料庫格式）。
🛡️ 這也是一種安全設計，避免不同網頁（不同 domain）互相偷看資料。

🔑 總結一下：
✅ localStorage 是瀏覽器提供的「小型資料庫」。
✅ 你在 JavaScript 用 localStorage.setItem 存資料，資料會被瀏覽器放在它的 sandbox（通常是 IndexedDB 或自己的 localStorage 資料結構）。
✅ JavaScript 在執行時，是跑在「瀏覽器的沙盒」裡面，跟作業系統之間是「安全隔離」的（除非有安全漏洞）。
✅ localStorage 的資料只對同一個 domain 可見，不同網頁互相看不到。
*/