import { create } from 'zustand'; // 導入 zustand 的 create 函數，用於創建 store，store功能是管理用戶認證狀態
import { devtools, persist } from 'zustand/middleware'; // 導入 zustand 的中間件：devtools（用於調試工具集成）和 persist（用於持久化存儲）
import { jwtDecode } from 'jwt-decode'; // 導入 jwt-decode 函數，用於解碼 JWT 令牌
import type { UserData } from '../api/authApi'; // 導入 UserData 類型，從 authApi 文件中
import * as authApi from '../api/authApi'; // 導入 authApi 模塊中的所有導出內容

interface JwtPayload { // 定義 JwtPayload 接口，用於指定 JWT 令牌解碼後的 payload 結構
  exp: number; // 令牌的過期時間（Unix 時間戳）
  user_id: string; // 用戶 ID
}

interface AuthState { // 定義 AuthState 接口，描述認證 store 的狀態和方法
  token: string | null; // 訪問令牌
  refreshToken: string | null; // 刷新令牌
  user: UserData | null; // 用戶數據
  isAuthenticated: boolean; // 是否已認證
  isLoading: boolean; // 是否正在加載
  error: string | null; // 錯誤訊息

  // 登錄
  login: (email: string, password: string) => Promise<void>;   //表示這個函式回傳一個 Promise，裡面不含任何有意義的資料（void）
  // 註冊
  register: (userData: authApi.RegisterData) => Promise<void>;
  // 登出
  logout: () => Promise<void>;
  // 檢查認證狀態
  checkAuth: () => Promise<boolean>;
  // 刷新令牌
  refreshAuth: () => Promise<boolean>;
  // 更新用戶信息
  updateUser: (userData: Partial<UserData>) => Promise<void>;
  // 社交登錄：Google
  loginWithGoogle: (accessToken: string) => Promise<void>;
  // 社交登錄：GitHub
  loginWithGitHub: (code: string) => Promise<void>;
  // 清除錯誤
  clearError: () => void;
  // 設置加載狀態
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()( // 使用 create 函數創建自定義變數 AuthState 類型的 store
  /*
  create 是 Zustand（一個輕量化的 React 狀態管理庫）提供的函數，用來建立一個 store。
  簡單來說：
  我把狀態放進 create，它就幫我產生一個可以在 React 組件裡用的 hook（例如 useAuthStore）。
  做了什麼？
  建立了 useAuthStore 這個 hook。
  讓 React 組件可以呼叫 useAuthStore() 取得和更新狀態。
  */
  devtools( // 使用 devtools 中間件，集成 Redux DevTools
    /*
    devtools 是 Zustand 的中間件，幫助你把 store 和 Redux DevTools（開發者工具）串接起來。
    做了什麼？
    讓我在瀏覽器的 Redux DevTools 外掛裡看到 store 的變化（例如：dispatch action、狀態變化、time travel debugging）。
    */ 
    persist( // 使用 persist 中間件，實現狀態持久化
      /*
      persist 是 Zustand 的另一個中間件，幫助把 store 的狀態存在本地儲存（localStorage）。
      做了什麼？
      每次狀態改變時，就會自動把狀態序列化並存在 localStorage（或 sessionStorage）。
      當頁面重新整理或重新開啟時，自動把狀態從 localStorage 裡讀回來，還原到 store。
      */ 
      (set, get) => ({ // 定義 store 的初始狀態和方法
        // 初始化時從 localStorage 讀取 token
        token: typeof window !== 'undefined' ? localStorage.getItem('engineerhub_token') : null, // 訪問令牌，根據環境從 localStorage 獲取
        //typeof 是 JavaScript 的運算符（operator），用來檢查一個值的類型。它會回傳一個字串（像 "string", "number", "undefined", "object", "function"）。
        /*window 是瀏覽器環境提供的全域物件（Global Object），它代表整個瀏覽器視窗（window）。
        👉 它裡面包含了：
        document（DOM）
        location（網址）
        localStorage
        alert, console 等常用功能
        甚至像 fetch, setTimeout, clearTimeout 也都在這個物件裡。
        簡單來說，在瀏覽器執行 JavaScript 時，window 就是整個全域環境的入口。
        */
        /*
        typeof window !== 'undefined' : 👉 「如果這個程式在瀏覽器執行的話（window 存在），就執行後面的程式碼；否則，就執行 null。」
        localStorage.getItem('engineerhub_token') : 👉 如果在瀏覽器環境中，就去讀取 localStorage 中的 'engineerhub_token'，作為這個 token 的值。
        ? = 三元運算子: 如果typeof window !== 'undefined'這個程式在瀏覽器執行的話就為true，否則為false。若為真則執行localStorage.getItem('engineerhub_token')，否為否則為null。
        */ 
        refreshToken: typeof window !== 'undefined' ? localStorage.getItem('engineerhub_refresh_token') : null, // 刷新令牌，根據環境從 localStorage 獲取
        user: null, // 初始用戶數據為 null
        isAuthenticated: false, // 初始認證狀態為 false
        isLoading: false, // 初始加載狀態為 false
        error: null, // 初始錯誤訊息為 null

        login: async (email, password) => { // 定義 login 方法，處理用戶登錄
          set({ isLoading: true, error: null }); // 設置加載狀態為 true，清除錯誤訊息
          try {
            const response = await authApi.login({ email, password }); // 調用 authApi 的 login 函數進行登錄

            // 同步 token 到 localStorage
            localStorage.setItem('engineerhub_token', response.access_token); // 將訪問令牌存入 localStorage
            localStorage.setItem('engineerhub_refresh_token', response.refresh_token); // 將刷新令牌存入 localStorage

            set({ // 更新 store 狀態
              token: response.access_token,
              refreshToken: response.refresh_token,
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
          } catch (error) { // 捕獲登錄過程中的錯誤
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : '登錄失敗' // 設置錯誤訊息
            });
            throw error; // 重新拋出錯誤，以便調用方處理
          }
        },

        register: async (userData) => { // 定義 register 方法，處理用戶註冊
          set({ isLoading: true, error: null }); // 設置加載狀態為 true，清除錯誤訊息
          try {
            const response = await authApi.register(userData); // 調用 authApi 的 register 函數進行註冊

            // 同步 token 到 localStorage
            localStorage.setItem('engineerhub_token', response.access_token); // 將訪問令牌存入 localStorage
            localStorage.setItem('engineerhub_refresh_token', response.refresh_token); // 將刷新令牌存入 localStorage

            set({ // 更新 store 狀態
              token: response.access_token,
              refreshToken: response.refresh_token,
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
          } catch (error) { // 捕獲註冊過程中的錯誤
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : '註冊失敗' // 設置錯誤訊息
            });
            throw error; // 重新拋出錯誤
          }
        },

        logout: async () => { // 定義 logout 方法，處理用戶登出
          set({ isLoading: true }); // 設置加載狀態為 true
          try {
            await authApi.logout(); // 調用 authApi 的 logout 函數進行登出
          } catch (error) {
            console.error('登出時出錯', error); // 記錄登出錯誤
          } finally {
            // 清除 localStorage 中的 token
            localStorage.removeItem('engineerhub_token'); // 移除訪問令牌
            localStorage.removeItem('engineerhub_refresh_token'); // 移除刷新令牌

            set({ // 更新 store 狀態
              token: null,
              refreshToken: null,
              user: null,
              isAuthenticated: false,
              isLoading: false
            });
          }
        },

        checkAuth: async () => { // 定義 checkAuth 方法，檢查認證狀態
          const { token, refreshAuth } = get(); // 從 store 中獲取 token 和 refreshAuth 方法

          console.log('🔐 檢查認證狀態:', {
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'None'
          }); // 記錄調試信息

          // 如果沒有令牌，則未認證
          if (!token) {
            console.log('❌ 沒有 token，設為未認證');
            set({ isAuthenticated: false }); // 設置認證狀態為 false
            return false;
          }

          // 檢查令牌是否過期
          try {
            const decoded = jwtDecode<JwtPayload>(token); // 解碼 JWT 令牌
            const currentTime = Date.now() / 1000; // 獲取當前時間（Unix 時間戳）

            console.log('🔐 Token 解碼結果:', {
              exp: decoded.exp,
              currentTime,
              isExpired: decoded.exp <= currentTime,
              timeUntilExpiry: decoded.exp - currentTime
            }); // 記錄解碼結果

            // 如果令牌還有效，獲取最新的用戶信息
            if (decoded.exp > currentTime) {
              try {
                console.log('✅ Token 有效，獲取用戶信息...');
                const user = await authApi.getCurrentUser(); // 調用 authApi 獲取當前用戶信息
                console.log('✅ 用戶信息獲取成功:', user.username);
                set({ user, isAuthenticated: true }); // 更新用戶信息和認證狀態
                return true;
              } catch (error) {
                console.error('❌ 獲取用戶信息失敗:', error);
                // 如果獲取用戶信息失敗，嘗試刷新 token
                console.log('🔄 嘗試刷新 token...');
                return refreshAuth(); // 調用 refreshAuth 方法刷新令牌
              }
            } else {
              // 令牌過期，嘗試刷新
              console.log('⏰ Token 已過期，嘗試刷新...');
              return refreshAuth(); // 調用 refreshAuth 方法刷新令牌
            }
          } catch (error) {
            // 解碼令牌出錯，嘗試刷新
            console.error('❌ Token 解碼失敗:', error);
            console.log('🔄 嘗試刷新 token...');
            return refreshAuth(); // 調用 refreshAuth 方法刷新令牌
          }
        },

        refreshAuth: async () => { // 定義 refreshAuth 方法，刷新認證令牌
          const { refreshToken } = get(); // 從 store 中獲取 refreshToken

          console.log('🔄 嘗試刷新認證:', {
            hasRefreshToken: !!refreshToken,
            refreshTokenPreview: refreshToken ? refreshToken.substring(0, 20) + '...' : 'None'
          }); // 記錄調試信息

          if (!refreshToken) { // 如果沒有 refreshToken
            console.log('❌ 沒有 refresh token，清除認證狀態');
            // 清除所有 token
            localStorage.removeItem('engineerhub_token');
            localStorage.removeItem('engineerhub_refresh_token');

            set({ 
              token: null, 
              refreshToken: null, 
              user: null, 
              isAuthenticated: false 
            }); // 更新 store 狀態
            return false;
          }

          try {
            console.log('🔄 調用 refresh token API...');
            // 使用 fetch 調用刷新 token 的 API
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/auth/token/refresh/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                refresh: refreshToken // 傳遞 refreshToken
              })
            });

            if (!response.ok) { // 如果響應不成功
              throw new Error(`HTTP ${response.status}: ${response.statusText}`); // 拋出錯誤
            }

            const data = await response.json(); // 解析響應數據
            console.log('✅ Token 刷新成功');

            // 同步新 token 到 localStorage
            localStorage.setItem('engineerhub_token', data.access); // 存儲新的訪問令牌
            if (data.refresh) {
              localStorage.setItem('engineerhub_refresh_token', data.refresh); // 如果有新的刷新令牌，則存儲
            }

            // 獲取用戶信息
            const user = await authApi.getCurrentUser(); // 調用 authApi 獲取當前用戶信息

            set({ // 更新 store 狀態
              token: data.access,
              refreshToken: data.refresh || refreshToken, // 如果有新的 refreshToken 則使用，否則保持原來的
              user: user,
              isAuthenticated: true
            });
            return true;
          } catch (error) { // 捕獲刷新過程中的錯誤
            console.error('❌ Token 刷新失敗:', error);
            // 清除所有 token
            localStorage.removeItem('engineerhub_token');
            localStorage.removeItem('engineerhub_refresh_token');

            set({ 
              token: null, 
              refreshToken: null, 
              user: null, 
              isAuthenticated: false 
            }); // 更新 store 狀態
            return false;
          }
        },

        updateUser: async (userData) => { // 定義 updateUser 方法，更新用戶信息
          set({ isLoading: true, error: null }); // 設置加載狀態為 true，清除錯誤訊息
          try {
            const updatedUser = await authApi.updateUserProfile(userData); // 調用 authApi 的 updateUserProfile 函數更新用戶信息
            set({ // 更新 store 狀態
              user: updatedUser,
              isLoading: false
            });
          } catch (error) { // 捕獲更新過程中的錯誤
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : '更新用戶信息失敗' // 設置錯誤訊息
            });
            throw error; // 重新拋出錯誤
          }
        },

        loginWithGoogle: async (accessToken) => { // 定義 loginWithGoogle 方法，處理 Google 社交登錄
          set({ isLoading: true, error: null }); // 設置加載狀態為 true，清除錯誤訊息
          try {
            const response = await authApi.loginWithGoogle(accessToken); // 調用 authApi 的 loginWithGoogle 函數
            set({ // 更新 store 狀態
              token: response.access_token,
              refreshToken: response.refresh_token,
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
          } catch (error) { // 捕獲登錄過程中的錯誤
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : 'Google 登錄失敗' // 設置錯誤訊息
            });
            throw error; // 重新拋出錯誤
          }
        },

        loginWithGitHub: async (code) => { // 定義 loginWithGitHub 方法，處理 GitHub 社交登錄
          set({ isLoading: true, error: null }); // 設置加載狀態為 true，清除錯誤訊息
          try {
            const response = await authApi.loginWithGitHub(code); // 調用 authApi 的 loginWithGitHub 函數
            set({ // 更新 store 狀態
              token: response.access_token,
              refreshToken: response.refresh_token,
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
          } catch (error) { // 捕獲登錄過程中的錯誤
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : 'GitHub 登錄失敗' // 設置錯誤訊息
            });
            throw error; // 重新拋出錯誤
          }
        },

        clearError: () => set({ error: null }), // 定義 clearError 方法，清除錯誤訊息

        setLoading: (isLoading) => set({ isLoading }) // 定義 setLoading 方法，設置加載狀態
      }),
      {
        name: 'engineerhub-auth-storage', // 持久化存儲的名稱
        partialize: (state) => ({ // 定義需要持久化的狀態部分
          token: state.token,
          refreshToken: state.refreshToken,
          user: state.user,
          isAuthenticated: state.isAuthenticated
        })
      }
    )
  )
);



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