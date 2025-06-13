///////////還沒看懂//////////////////////










// 引入 Axios 套件，用於發送 HTTP 請求
import axios from 'axios';

// 輔助函數：從 authStore persist 數據中獲取 token
function getTokenFromAuthStore() {
  try {
    const persistedData = localStorage.getItem('engineerhub-auth-storage');
    if (persistedData) {
      const parsed = JSON.parse(persistedData);
      return {
        accessToken: parsed.state?.token || null,
        refreshToken: parsed.state?.refreshToken || null
      };
    }
  } catch (error) {
    console.error('❌ 解析 authStore persist 數據失敗:', error);
  }
  return { accessToken: null, refreshToken: null };
}

// 創建 Axios 實例 - 純 JWT 認證
// 這裡使用 axios.create 方法創建一個自定義的 Axios 實例，方便設置全局配置
const api = axios.create({
  /*
  當你創建 api = axios.create({...}) 時，api 是一個 Axios 實例，繼承了 Axios 的所有方法和屬性。
  api.interceptors 是一個物件，包含 request 和 response 兩個子物件。
  request 和 response 各自有 .use 方法，用來註冊攔截器。
  */
  // 設置 API 的基礎 URL，從環境變數 VITE_API_BASE_URL 獲取，若未設置則默認為 'http://localhost:8000/api'
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  // 配置預設的 HTTP 請求頭
  headers: {
    // 設置 Content-Type 為 'application/json'，表示請求數據以 JSON 格式傳送
    'Content-Type': 'application/json'
  },
  // 設置 withCredentials 為 false，因為使用 JWT 認證，不需要傳送 cookies（與 CSRF 相關）
  withCredentials: false
});

// 請求攔截器 - 在發送請求前處理配置
// 使用 interceptors.request.use 註冊請求攔截器，處理每個請求發送前的邏輯
api.interceptors.request.use(      //.use 方法是 Axios 提供的 API，讓你註冊回調函數，告訴 Axios：「當收到響應時，執行這些邏輯」。
  // 成功處理請求配置的回調函數，參數 config 是當前請求的配置對象
  (config) => {   //config是自己取的名字，作為回調函數的名稱
    /*
    config 讓我在請求發送之前修改請求的設置。例如，我的程式碼檢查 localStorage 中的 token，並將其添加到 config.headers['Authorization'] 中。
    */
    // 從 authStore persist 數據中獲取 JWT token
    const { accessToken } = getTokenFromAuthStore();
    
    // 記錄請求的相關信息到控制台，方便調試
    console.log('🔐 請求攔截器:', {
      url: config.url, // 請求的目標 URL
      method: config.method, // 請求的方法（例如 GET、POST）
      hasToken: !!accessToken, // 檢查是否有 token，!!token 將值轉為布林值
      token: accessToken ? accessToken.substring(0, 20) + '...' : 'None' // 如果有 token，顯示前 20 字符加 '...'，否則顯示 'None'
    });
    
    // 如果 token 存在，將其添加到請求頭的 'Authorization' 字段，格式為 'Bearer <token>'
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    // 返回修改後的請求配置，繼續執行請求
    return config;
  },
  // 處理請求配置錯誤的回調函數，參數 error 是錯誤對象
  (error) => {
    // 記錄請求配置錯誤到控制台，方便排查問題
    console.error('❌ 請求配置錯誤:', error);
    // 將錯誤拒絕並傳遞給後續處理（Promise 鏈）
    return Promise.reject(error);
  }
);

// 響應攔截器 - 處理伺服器返回的響應和錯誤
// 使用 interceptors.response.use 註冊響應攔截器，處理每個響應或錯誤
api.interceptors.response.use(     
  // 成功接收響應的回調函數，參數 response 是伺服器返回的響應對象
  (response) => {
    // 記錄成功響應的相關信息到控制台，方便調試
    console.log('✅ 響應成功:', {
      url: response.config.url, // 響應對應的請求 URL
      status: response.status, // 響應的 HTTP 狀態碼（例如 200）
      method: response.config.method // 響應對應的請求方法
    });
    // 返回響應對象，供後續代碼使用
    return response;
  },
  // 處理響應錯誤的回調函數，參數 error 是錯誤對象，async 表示異步處理
  async (error) => {
    // 獲取導致錯誤的原始請求配置，方便後續重試
    const originalRequest = error.config;
    
    // 記錄響應錯誤的相關信息到控制台，方便排查問題
    console.log('❌ 響應錯誤:', {
      url: originalRequest?.url, // 原始請求的 URL，使用 ?. 避免 undefined 錯誤
      status: error.response?.status, // 錯誤響應的 HTTP 狀態碼（例如 401）
      method: originalRequest?.method, // 原始請求的方法
      hasRetried: originalRequest?._retry // 檢查是否已經重試過，_retry 是自定義屬性
    });
    
    // 處理 401 未授權錯誤（通常表示 token 過期），且該請求尚未重試
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 將原始請求標記為已重試，防止無限循環
      originalRequest._retry = true;
      
      // 從 authStore persist 數據中獲取 refresh token
      const { refreshToken } = getTokenFromAuthStore();
      
      // 如果 refresh token 存在，嘗試刷新 access token
      if (refreshToken) {
        // 記錄正在嘗試刷新 token 的信息
        console.log('🔄 嘗試刷新 token...');
        // 使用 try-catch 處理刷新過程中的潛在錯誤
        try {
          // 使用 axios.post 發送刷新請求到後端的 '/auth/token/refresh/' 端點
          const response = await axios.post(`${api.defaults.baseURL}/auth/token/refresh/`, {
            refresh: refreshToken // 傳遞 refresh token 作為請求數據
          });
          
          // 從響應數據中提取新的 access token
          const newAccessToken = response.data.access;
          
          // 更新 authStore persist 數據中的 token
          try {
            const persistedData = localStorage.getItem('engineerhub-auth-storage');
            if (persistedData) {
              const parsed = JSON.parse(persistedData);
              if (parsed.state) {
                parsed.state.token = newAccessToken;
                // 如果後端返回新的 refresh token，也要更新
                if (response.data.refresh) {
                  parsed.state.refreshToken = response.data.refresh;
                }
                localStorage.setItem('engineerhub-auth-storage', JSON.stringify(parsed));
              }
            }
          } catch (updateError) {
            console.error('❌ 更新 authStore persist 數據失敗:', updateError);
          }
          
          // 記錄 token 刷新成功的消息
          console.log('✅ Token 刷新成功');
          
          // 更新原始請求的 headers，加入新的 access token
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          // 使用更新後的配置重新發送原始請求
          return api(originalRequest);
          
        } catch (refreshError) {
          // 如果刷新 token 失敗，記錄錯誤信息
          console.error('❌ Token 刷新失敗:', refreshError);
          
          // 清除 authStore persist 數據中的認證信息
          try {
            const persistedData = localStorage.getItem('engineerhub-auth-storage');
            if (persistedData) {
              const parsed = JSON.parse(persistedData);
              if (parsed.state) {
                parsed.state.token = null;
                parsed.state.refreshToken = null;
                parsed.state.user = null;
                parsed.state.isAuthenticated = false;
                localStorage.setItem('engineerhub-auth-storage', JSON.stringify(parsed));
              }
            }
          } catch (clearError) {
            console.error('❌ 清除 authStore persist 數據失敗:', clearError);
          }
          
          // 檢查當前頁面是否為登入頁，若不是則重定向到登入頁
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        // 如果沒有 refresh token，記錄相關信息
        console.log('❌ 沒有 refresh token，重定向到登入頁');
        
        // 清除 authStore persist 數據中的認證信息
        try {
          const persistedData = localStorage.getItem('engineerhub-auth-storage');
          if (persistedData) {
            const parsed = JSON.parse(persistedData);
            if (parsed.state) {
              parsed.state.token = null;
              parsed.state.refreshToken = null;
              parsed.state.user = null;
              parsed.state.isAuthenticated = false;
              localStorage.setItem('engineerhub-auth-storage', JSON.stringify(parsed));
            }
          }
        } catch (clearError) {
          console.error('❌ 清除 authStore persist 數據失敗:', clearError);
        }
        
        // 檢查當前頁面是否為登入頁，若不是則重定向到登入頁
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    // 如果不是 401 錯誤或已重試過，則拒絕 Promise，將錯誤傳遞給後續處理
    return Promise.reject(error);
  }
);

// 導出配置好的 Axios 實例，供其他模組使用
export default api;