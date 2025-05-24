import api from './axiosConfig';

// 從統一類型文件導入類型定義
import type {
  RegisterData,
  LoginData,
  TokenResponse,
  UserData
} from '../types';

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
  const response = await api.post('/simple-auth/register/', userData);
  return response.data;
};

// 使用電子郵件和密碼登入
export const login = async (credentials: LoginData): Promise<TokenResponse> => {
  // 將 email 轉換為 username，因為 SimpleLoginView 期望 username 字段
  const loginData = {
    username: credentials.email,  // 後端用戶名字段可以接受郵箱
    password: credentials.password
  };
  const response = await api.post('/simple-auth/login/', loginData);
  return response.data;
};

// 登出
export const logout = async (): Promise<void> => {
  await api.post('/auth/logout/');
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