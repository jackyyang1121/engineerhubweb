/**
 * EngineerHub - 認證 API 模組
 * 
 * 使用 dj-rest-auth + allauth + SimpleJWT 提供完整的認證功能
 * 
 * 主要端點：
 * - 註冊: POST /api/auth/registration/
 * - 登入: POST /api/auth/login/
 * - 登出: POST /api/auth/logout/
 * - 用戶信息: GET /api/auth/user/
 * - 密碼修改: POST /api/auth/password/change/
 * - 密碼重置: POST /api/auth/password/reset/
 * - Token 刷新: POST /api/auth/token/refresh/
 * - Token 驗證: POST /api/auth/token/verify/
 */

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

// ==================== 用戶註冊 ====================
/**
 * 註冊新用戶
 * 使用 dj-rest-auth 的註冊端點，支援郵箱驗證
 * 
 * @param userData 用戶註冊數據
 * @returns Promise<TokenResponse> 包含 access_token 和 refresh_token
 */
export const register = async (userData: RegisterData): Promise<TokenResponse> => {
  const response = await api.post('/auth/registration/', userData);
  return response.data;
};

// ==================== 用戶登入 ====================
/**
 * 使用用戶名/郵箱和密碼登入
 * 使用 dj-rest-auth 的登入端點，支援 JWT 認證
 * 
 * @param credentials 登入憑證（用戶名/郵箱 + 密碼）
 * @returns Promise<TokenResponse> 包含 access_token 和 refresh_token
 */
export const login = async (credentials: LoginData): Promise<TokenResponse> => {
  const response = await api.post('/auth/login/', credentials);
  return response.data;
};

// ==================== 用戶登出 ====================
/**
 * 登出當前用戶
 * 使用 dj-rest-auth 的登出端點，會將 refresh_token 加入黑名單
 * 
 * @returns Promise<void>
 */
export const logout = async (): Promise<void> => {
  await api.post('/auth/logout/');
};

// ==================== Token 管理 ====================
/**
 * 刷新 JWT Token
 * 使用 refresh_token 獲取新的 access_token
 * 
 * @param refreshToken 刷新令牌
 * @returns Promise<TokenResponse> 新的 token 對
 */
export const refreshToken = async (refreshToken: string): Promise<TokenResponse> => {
  const response = await api.post('/auth/token/refresh/', {
    refresh: refreshToken
  });
  return response.data;
};

/**
 * 驗證 JWT Token
 * 檢查 access_token 是否有效
 * 
 * @param token 訪問令牌
 * @returns Promise<{ valid: boolean }> 驗證結果
 */
export const verifyToken = async (token: string): Promise<{ valid: boolean }> => {
  try {
    await api.post('/auth/token/verify/', { token });
    return { valid: true };
  } catch {
    return { valid: false };
  }
};

// ==================== 密碼管理 ====================
/**
 * 忘記密碼 - 發送重置郵件
 * 使用 dj-rest-auth 的密碼重置端點
 * 
 * @param email 用戶郵箱
 * @returns Promise<{ detail: string }> 操作結果訊息
 */
export const forgotPassword = async (email: string): Promise<{ detail: string }> => {
  const response = await api.post('/auth/password/reset/', { email });
  return response.data;
};

/**
 * 重置密碼 - 使用重置令牌設置新密碼
 * 使用 dj-rest-auth 的密碼重置確認端點
 * 
 * @param data 重置密碼數據
 * @returns Promise<{ detail: string }> 操作結果訊息
 */
export const resetPassword = async (data: { 
  uid: string; 
  token: string; 
  new_password1: string; 
  new_password2: string 
}): Promise<{ detail: string }> => {
  const response = await api.post('/auth/password/reset/confirm/', data);
  return response.data;
};

/**
 * 修改密碼 - 已登入用戶修改密碼
 * 使用 dj-rest-auth 的密碼修改端點
 * 
 * @param passwords 密碼修改數據
 * @returns Promise<{ detail: string }> 操作結果訊息
 */
export const changePassword = async (passwords: { 
  old_password: string; 
  new_password1: string; 
  new_password2: string 
}): Promise<{ detail: string }> => {
  const response = await api.post('/auth/password/change/', passwords);
  return response.data;
};

// ==================== 用戶信息管理 ====================
/**
 * 獲取當前用戶信息
 * 使用 dj-rest-auth 的用戶詳情端點
 * 
 * @returns Promise<UserData> 當前用戶數據
 */
export const getCurrentUser = async (): Promise<UserData> => {
  const response = await api.get('/auth/user/');
  return response.data;
};

/**
 * 更新用戶信息
 * 使用 dj-rest-auth 的用戶更新端點
 * 
 * @param userData 要更新的用戶數據
 * @returns Promise<UserData> 更新後的用戶數據
 */
export const updateUserProfile = async (userData: Partial<UserData>): Promise<UserData> => {
  const response = await api.put('/auth/user/', userData);
  return response.data;
};

/**
 * 部分更新用戶信息
 * 使用 PATCH 方法進行部分更新
 * 
 * @param userData 要更新的用戶數據
 * @returns Promise<UserData> 更新後的用戶數據
 */
export const patchUserProfile = async (userData: Partial<UserData>): Promise<UserData> => {
  const response = await api.patch('/auth/user/', userData);
  return response.data;
};

// ==================== 郵箱驗證 ====================
/**
 * 重新發送驗證郵件
 * 使用 dj-rest-auth 的郵箱驗證端點
 * 
 * @param email 用戶郵箱
 * @returns Promise<{ detail: string }> 操作結果訊息
 */
export const resendEmailVerification = async (email: string): Promise<{ detail: string }> => {
  const response = await api.post('/auth/registration/resend-email/', { email });
  return response.data;
};

/**
 * 驗證郵箱
 * 使用郵件中的驗證鏈接進行郵箱驗證
 * 
 * @param key 驗證密鑰
 * @returns Promise<{ detail: string }> 驗證結果訊息
 */
export const verifyEmail = async (key: string): Promise<{ detail: string }> => {
  const response = await api.post('/auth/registration/verify-email/', { key });
  return response.data;
};

// ==================== 社交登入 ====================
/**
 * Google 社交登入
 * 使用 Google OAuth2 進行登入
 * 
 * @param accessToken Google 訪問令牌
 * @returns Promise<TokenResponse> JWT token 對
 */
export const loginWithGoogle = async (accessToken: string): Promise<TokenResponse> => {
  const response = await api.post('/auth/google/', { access_token: accessToken });
  return response.data;
};

/**
 * GitHub 社交登入
 * 使用 GitHub OAuth2 進行登入
 * 
 * @param code GitHub 授權碼
 * @returns Promise<TokenResponse> JWT token 對
 */
export const loginWithGitHub = async (code: string): Promise<TokenResponse> => {
  const response = await api.post('/auth/github/', { code });
  return response.data;
};

// ==================== 用戶管理相關 API ====================
/**
 * 獲取用戶列表
 * 使用自定義的用戶管理端點
 * 
 * @returns Promise<UserData[]> 用戶列表
 */
export const getUsers = async (): Promise<UserData[]> => {
  const response = await api.get('/users/');
  return response.data;
};

/**
 * 獲取特定用戶信息
 * 使用自定義的用戶詳情端點
 * 
 * @param userId 用戶 ID
 * @returns Promise<UserData> 用戶數據
 */
export const getUserById = async (userId: string): Promise<UserData> => {
  const response = await api.get(`/users/${userId}/`);
  return response.data;
};

/**
 * 獲取當前用戶的詳細信息
 * 使用自定義的 "me" 端點
 * 
 * @returns Promise<UserData> 當前用戶的詳細數據
 */
export const getMyProfile = async (): Promise<UserData> => {
  const response = await api.get('/users/me/');
  return response.data;
}; 