import api from './axiosConfig';

// 從統一類型文件導入類型定義
import type {
  RegisterData,
  LoginData,
  TokenResponse,
  UserData
} from '../types';  //在types裡面的index.ts定義了許多類型並標註typehint，這邊導入

// 重新導出類型定義供其他模塊使用
export type {
  RegisterData,
  LoginData,
  TokenResponse,
  UserData,
  UserStats
} from '../types';

// 註冊新用戶
export const register = async (userData: RegisterData): Promise<TokenResponse> => {
  /*
  Promise<TokenResponse>:
  指定返回類型：Promise<TokenResponse> 告訴 TypeScript 編譯器，login 函數的返回值是一個 Promise，當這個 Promise 解析（resolved）時，會得到一個 TokenResponse 類型的物件。這確保了調用 login 的代碼能正確處理返回數據。
  類型安全：如果函數實現中返回的數據不符合 TokenResponse 的結構（例如缺少 accessToken），TypeScript 會在編譯時報錯。    
  */
  const response = await api.post('/auth/register/', userData);
  return response.data;
};

// 使用用戶名和密碼登入
export const login = async (credentials: LoginData): Promise<TokenResponse> => {
  const response = await api.post('/auth/login/', credentials);
  //對應到後端backend/engineerhub/urls.py的路由path('api/auth/login/', CustomLoginTokenObtainPairView.as_view(), name='simple_login')
  //對應到後端backend/accounts/views.py的CustomLoginTokenObtainPairView視圖
  return response.data;    //回傳response.data就是後端拿到的access_token和refresh_token
};

// 登出
export const logout = async (): Promise<void> => {
  await api.post('/simple-auth/logout/');
};

// 刷新令牌
export const refreshToken = async (): Promise<TokenResponse> => {
  const response = await api.post('/auth/token/refresh/');
  return response.data;
};

// 忘記密碼
export const forgotPassword = async (email: string): Promise<{ detail: string }> => {
  const response = await api.post('/auth/password/reset/', { email });
  return response.data;
};

// 重置密碼
export const resetPassword = async (data: { 
  uid: string; 
  token: string; 
  new_password1: string; 
  new_password2: string 
}): Promise<{ detail: string }> => {
  const response = await api.post('/auth/password/reset/confirm/', data);
  return response.data;
};

// 獲取當前用戶信息
export const getCurrentUser = async (): Promise<UserData> => {
  const response = await api.get('/users/me/');
  return response.data;
};

// 修改用戶信息
export const updateUserProfile = async (userData: Partial<UserData>): Promise<UserData> => {
  const response = await api.patch('/users/me/', userData);
  return response.data;
};

// 修改密碼
export const changePassword = async (passwords: { 
  old_password: string; 
  new_password1: string; 
  new_password2: string 
}): Promise<{ detail: string }> => {
  const response = await api.post('/auth/password/change/', passwords);
  return response.data;
};

// 社交登入: Google
export const loginWithGoogle = async (accessToken: string): Promise<TokenResponse> => {
  const response = await api.post('/auth/google/', { access_token: accessToken });
  return response.data;
};

// 社交登入: GitHub
export const loginWithGitHub = async (code: string): Promise<TokenResponse> => {
  const response = await api.post('/auth/github/', { code });
  return response.data;
}; 