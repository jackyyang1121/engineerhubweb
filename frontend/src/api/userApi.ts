/**
 * 用戶 API 模塊
 * 
 * 功能：提供所有與用戶相關的 API 調用功能
 * 
 * 重構重點：
 * - 使用統一的錯誤處理機制
 * - 清理重複的 try-catch 邏輯
 * - 提供清晰的類型定義和註釋
 * - 保持函數職責單一
 */

import api from './axiosConfig';
import { handleApiCall } from '../utils/api-error-handler';
import type { 
  UserData, 
  UpdateProfileData,
  PaginatedResponse,
  Post,
  UserStats,
  PortfolioProject,
  NotificationSettings,
  PrivacySettings,
  ChangePasswordData,
  // 認證相關類型
  RegisterData,
  LoginData,
  LoginResponse,
  RefreshTokenData,
  PasswordResetData,
  PasswordResetConfirmData
} from '../types';


// 關注狀態類型
interface FollowStatus {
  is_following: boolean;
  followers_count: number;
}

// ==================== 認證操作 ====================

/**
 * 用戶註冊
 * 
 * @param registerData - 註冊資料
 * @returns Promise<LoginResponse> - 註冊成功後的登入資料
 */
export const registerUser = async (registerData: RegisterData): Promise<LoginResponse> => {
  return handleApiCall(
    () => api.post('/auth/registration/', registerData),
    '用戶註冊'
  );
};

/**
 * 用戶登入
 * 
 * @param loginData - 登入資料
 * @returns Promise<LoginResponse> - 登入成功後的用戶資料和令牌
 */
export const loginUser = async (loginData: LoginData): Promise<LoginResponse> => {
  return handleApiCall(
    () => api.post('/auth/login/', loginData),
    '用戶登入'
  );
};

/**
 * 用戶登出
 * 
 * @returns Promise<{ detail: string }> - 登出確認
 */
export const logoutUser = async (): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post('/auth/logout/'),
    '用戶登出'
  );
};

/**
 * 刷新訪問令牌
 * 
 * @param refreshData - 刷新令牌資料
 * @returns Promise<{ access: string }> - 新的訪問令牌
 */
export const refreshToken = async (refreshData: RefreshTokenData): Promise<{ access: string }> => {
  return handleApiCall(
    () => api.post('/auth/token/refresh/', refreshData),
    '刷新令牌'
  );
};

/**
 * 請求密碼重置
 * 
 * @param resetData - 密碼重置請求資料
 * @returns Promise<{ detail: string }> - 重置請求確認
 */
export const requestPasswordReset = async (resetData: PasswordResetData): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post('/auth/password/reset/', resetData),
    '請求密碼重置'
  );
};

/**
 * 確認密碼重置
 * 
 * @param confirmData - 密碼重置確認資料
 * @returns Promise<{ detail: string }> - 重置確認
 */
export const confirmPasswordReset = async (confirmData: PasswordResetConfirmData): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post('/auth/password/reset/confirm/', confirmData),
    '確認密碼重置'
  );
};

// ==================== 用戶基本操作 ====================

/**
 * 獲取當前用戶資料
 * 
 * @returns Promise<UserData> - 當前用戶的完整資料
 */
export const getCurrentUser = async (): Promise<UserData> => {
  return handleApiCall(
    () => api.get('/users/me/'),
    '獲取當前用戶資料'
  );
};

/**
 * 獲取指定用戶的資料（透過用戶名）
 * 
 * @param username - 用戶名稱
 * @returns Promise<UserData> - 指定用戶的資料
 */
export const getUserByUsername = async (username: string): Promise<UserData> => {
  return handleApiCall(
    () => api.get(`/users/${username}/`),
    '獲取用戶資料'
  );
};

/**
 * 獲取指定用戶的資料
 * 
 * @param userId - 用戶 ID
 * @returns Promise<UserData> - 指定用戶的資料
 */
export const getUserProfile = async (userId: string): Promise<UserData> => {
  return handleApiCall(
    () => api.get(`/users/${userId}/`),
    '獲取用戶資料'
  );
};

/**
 * 更新用戶資料
 * 
 * @param profileData - 要更新的用戶資料
 * @returns Promise<UserData> - 更新後的用戶資料
 * 
 * 支援更新的欄位：
 * - 基本資訊：名字、姓氏、個人簡介
 * - 聯絡資訊：電子郵件
 * - 頭像圖片
 */
export const updateProfile = async (profileData: UpdateProfileData): Promise<UserData> => {
  return handleApiCall(
    () => {
      // 如果包含頭像文件，使用 FormData
      if (profileData.avatar instanceof File) {
        const formData = new FormData();
        
        // 添加文字欄位
        Object.entries(profileData).forEach(([key, value]) => {
          if (key !== 'avatar' && value !== undefined) {
            formData.append(key, String(value));
          }
        });
        
        // 添加頭像文件
        formData.append('avatar', profileData.avatar);
        
        return api.patch('/users/me/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // 只有文字數據，使用 JSON
        return api.patch('/users/me/', profileData);
      }
    },
    '更新用戶資料'
  );
};

/**
 * 上傳用戶頭像
 * 
 * @param avatarFile - 頭像圖片文件
 * @returns Promise<UserData> - 更新後的用戶資料
 */
export const uploadAvatar = async (avatarFile: File): Promise<UserData> => {
  return handleApiCall(
    () => {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      return api.patch('/users/me/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    '上傳頭像'
  );
};

// ==================== 關注系統 ====================

/**
 * 關注用戶
 * 
 * @param userId - 要關注的用戶 ID
 * @returns Promise<FollowStatus> - 關注操作結果和更新後的關注狀態
 */
export const followUser = async (userId: string): Promise<FollowStatus> => {
  return handleApiCall(
    () => api.post(`/users/${userId}/follow/`),
    '關注用戶'
  );
};

/**
 * 取消關注用戶
 * 
 * @param userId - 要取消關注的用戶 ID
 * @returns Promise<FollowStatus> - 取消關注操作結果和更新後的關注狀態
 */
export const unfollowUser = async (userId: string): Promise<FollowStatus> => {
  return handleApiCall(
    () => api.post(`/users/${userId}/unfollow/`),
    '取消關注用戶'
  );
};

/**
 * 獲取用戶的關注者列表
 * 
 * @param userId - 用戶 ID
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 20 筆
 * @returns Promise<PaginatedResponse<UserData>> - 關注者列表
 */
export const getUserFollowers = async (
  userId: string, 
  page = 1, 
  pageSize = 20
): Promise<PaginatedResponse<UserData>> => {
  return handleApiCall(
    () => api.get(`/users/${userId}/followers/`, {
      params: { page, page_size: pageSize }
    }),
    '獲取關注者列表'
  );
};

/**
 * 獲取用戶的關注列表
 * 
 * @param userId - 用戶 ID
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 20 筆
 * @returns Promise<PaginatedResponse<UserData>> - 關注列表
 */
export const getUserFollowing = async (
  userId: string, 
  page = 1, 
  pageSize = 20
): Promise<PaginatedResponse<UserData>> => {
  return handleApiCall(
    () => api.get(`/users/${userId}/following/`, {
      params: { page, page_size: pageSize }
    }),
    '獲取關注列表'
  );
};

// ==================== 作品集管理 ====================

/**
 * 獲取指定用戶的作品集列表
 * 
 * @param userId - 用戶 ID
 * @returns Promise<PortfolioProject[]> - 用戶的作品集項目列表
 * 
 * 使用範例：
 * ```typescript
 * const portfolio = await getPortfolio('123');
 * ```
 */
export const getPortfolio = async (userId: string): Promise<PortfolioProject[]> => {
  return handleApiCall(
    () => api.get(`/users/${userId}/portfolio/`),
    '獲取用戶作品集'
  );
};

/**
 * 添加新的作品集項目
 * 
 * @param projectData - 作品集項目數據（不包含 id 和 created_at）
 * @returns Promise<PortfolioProject> - 創建的作品集項目
 * 
 * 使用範例：
 * ```typescript
 * const project = await addPortfolioProject({
 *   title: '我的專案',
 *   description: '專案描述',
 *   technologies: ['React', 'TypeScript'],
 *   github_url: 'https://github.com/user/project'
 * });
 * ```
 */
export const addPortfolioProject = async (projectData: Omit<PortfolioProject, 'id' | 'created_at'>): Promise<PortfolioProject> => {
  return handleApiCall(
    () => api.post('/users/me/portfolio/', projectData),
    '添加作品集項目'
  );
};

/**
 * 更新作品集項目
 * 
 * @param projectId - 作品集項目 ID
 * @param projectData - 要更新的項目數據（部分字段）
 * @returns Promise<PortfolioProject> - 更新後的作品集項目
 * 
 * 使用範例：
 * ```typescript
 * const updatedProject = await updatePortfolioProject('456', {
 *   title: '更新的專案標題'
 * });
 * ```
 */
export const updatePortfolioProject = async (projectId: string, projectData: Partial<PortfolioProject>): Promise<PortfolioProject> => {
  return handleApiCall(
    () => api.patch(`/portfolio/${projectId}/`, projectData),
    '更新作品集項目'
  );
};

/**
 * 刪除作品集項目
 * 
 * @param projectId - 要刪除的作品集項目 ID
 * @returns Promise<void> - 刪除操作無返回值
 * 
 * 使用範例：
 * ```typescript
 * await deletePortfolioProject('456');
 * ```
 */
export const deletePortfolioProject = async (projectId: string): Promise<void> => {
  return handleApiCall(
    () => api.delete(`/portfolio/${projectId}/`),
    '刪除作品集項目'
  );
};

/**
 * 上傳作品集項目的圖片
 * 
 * @param projectId - 作品集項目 ID
 * @param file - 要上傳的圖片文件
 * @returns Promise<PortfolioProject> - 更新後的作品集項目（包含圖片 URL）
 * 
 * 使用範例：
 * ```typescript
 * const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
 * const file = fileInput.files?.[0];
 * if (file) {
 *   const updatedProject = await uploadProjectImage('456', file);
 * }
 * ```
 */
export const uploadProjectImage = async (projectId: string, file: File): Promise<PortfolioProject> => {
  return handleApiCall(
    () => {
      // 創建 FormData 對象用於文件上傳
      const formData = new FormData();
      formData.append('image', file);
      
      return api.patch(`/portfolio/${projectId}/image/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'  // 設置正確的文件上傳內容類型
        }
      });
    },
    '上傳作品集項目圖片'
  );
};

// ==================== 設置管理 ====================

/**
 * 獲取當前用戶的所有設置
 * 
 * @returns Promise<{notifications: NotificationSettings; privacy: PrivacySettings}> - 用戶的通知和隱私設置
 * 
 * 使用範例：
 * ```typescript
 * const { notifications, privacy } = await getUserSettings();
 * console.log('通知設置:', notifications);
 * console.log('隱私設置:', privacy);
 * ```
 */
export const getUserSettings = async (): Promise<{ notifications: NotificationSettings; privacy: PrivacySettings }> => {
  return handleApiCall(
    () => api.get('/users/me/settings/'),
    '獲取用戶設置'
  );
};

/**
 * 更新用戶的通知設置
 * 
 * @param settings - 新的通知設置
 * @returns Promise<NotificationSettings> - 更新後的通知設置
 * 
 * NotificationSettings 包含的字段：
 * - email_notifications: 是否開啟郵件通知
 * - push_notifications: 是否開啟推送通知
 * - comment_notifications: 評論通知
 * - like_notifications: 點讚通知
 * - follow_notifications: 關注通知
 * 
 * 使用範例：
 * ```typescript
 * const updatedSettings = await updateNotificationSettings({
 *   email_notifications: true,
 *   push_notifications: false,
 *   comment_notifications: true
 * });
 * ```
 */
export const updateNotificationSettings = async (settings: NotificationSettings): Promise<NotificationSettings> => {
  return handleApiCall(
    () => api.patch('/users/me/settings/notifications/', settings),
    '更新通知設置'
  );
};

/**
 * 更新用戶的隱私設置
 * 
 * @param settings - 新的隱私設置
 * @returns Promise<PrivacySettings> - 更新後的隱私設置
 * 
 * PrivacySettings 包含的字段：
 * - profile_visibility: 個人資料可見性（public, friends, private）
 * - show_email: 是否顯示電子郵件
 * - show_phone: 是否顯示電話號碼
 * - allow_messages: 是否允許他人發送訊息
 * 
 * 使用範例：
 * ```typescript
 * const updatedSettings = await updatePrivacySettings({
 *   profile_visibility: 'friends',
 *   show_email: false,
 *   allow_messages: true
 * });
 * ```
 */
export const updatePrivacySettings = async (settings: PrivacySettings): Promise<PrivacySettings> => {
  return handleApiCall(
    () => api.patch('/users/me/settings/privacy/', settings),
    '更新隱私設置'
  );
};

// 更改密碼
export const changePassword = async (passwordData: ChangePasswordData): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post('/users/change-password/', passwordData),
    '修改密碼'
  );
};

// ==================== 帳號管理 ====================

/**
 * 永久刪除用戶帳號
 * 
 * @param data - 包含確認密碼的數據
 * @returns Promise<{detail: string}> - 刪除操作的結果信息
 * 
 * 警告：此操作不可逆，會永久刪除所有用戶數據
 * 
 * 使用範例：
 * ```typescript
 * const result = await deleteAccount({ password: '用戶當前密碼' });
 * console.log(result.detail); // "帳號已永久刪除"
 * ```
 */
export const deleteAccount = async (data: { password: string }): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.delete('/users/me/', { data }),
    '刪除用戶帳號'
  );
};

/**
 * 停用帳號
 * 
 * @param password - 確認密碼
 * @returns Promise<{detail: string}> - 操作結果信息
 */
export const deactivateAccount = async (password: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post('/users/deactivate/', { password }),
    '停用帳號'
  );
};

/**
 * 重新激活停用的帳號
 * 
 * @param data - 包含郵箱和密碼的驗證數據
 * @returns Promise<{detail: string}> - 重新激活操作的結果信息
 * 
 * 使用範例：
 * ```typescript
 * const result = await reactivateAccount({
 *   email: 'user@example.com',
 *   password: '用戶密碼'
 * });
 * console.log(result.detail); // "帳號已重新激活"
 * ```
 */
export const reactivateAccount = async (data: { email: string; password: string }): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post('/users/reactivate/', data),
    '重新激活帳號'
  );
};

// ==================== 用戶統計 ====================

/**
 * 獲取用戶統計數據
 * 
 * @param userId - 用戶 ID（可選，不提供則獲取當前用戶）
 * @returns Promise<UserStats> - 用戶統計數據
 */
export const getUserStats = async (userId?: string): Promise<UserStats> => {
  const endpoint = userId ? `/users/${userId}/stats/` : '/users/me/stats/';
  
  return handleApiCall(
    () => api.get(endpoint),
    '獲取用戶統計'
  );
};

// ==================== 黑名單管理 ====================

/**
 * 獲取當前用戶的黑名單列表
 * 
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁顯示數量，默認 20 條
 * @returns Promise<PaginatedResponse<UserData>> - 包含黑名單用戶的分頁響應
 * 
 * 使用範例：
 * ```typescript
 * const blockedUsers = await getBlockedUsers(1, 10);
 * console.log('黑名單用戶:', blockedUsers.results);
 * ```
 */
export const getBlockedUsers = async (page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<UserData>> => {
  return handleApiCall(
    () => api.get('/users/me/blocked/', {
      params: { 
        page,              // 頁碼參數
        page_size: pageSize // 每頁大小參數
      }
    }),
    '獲取黑名單列表'
  );
};

/**
 * 將指定用戶加入黑名單
 * 
 * @param userId - 要拉黑的用戶 ID
 * @returns Promise<{detail: string}> - 拉黑操作的結果信息
 * 
 * 注意：拉黑用戶後，該用戶將無法與您互動（評論、點讚、關注等）
 * 
 * 使用範例：
 * ```typescript
 * const result = await blockUser('123');
 * console.log(result.detail); // "用戶已拉黑"
 * ```
 */
export const blockUser = async (userId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/users/${userId}/block/`),
    '拉黑用戶'
  );
};

/**
 * 將指定用戶從黑名單中移除
 * 
 * @param userId - 要解除拉黑的用戶 ID
 * @returns Promise<{detail: string}> - 解除拉黑操作的結果信息
 * 
 * 使用範例：
 * ```typescript
 * const result = await unblockUser('123');
 * console.log(result.detail); // "已解除拉黑"
 * ```
 */
export const unblockUser = async (userId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.delete(`/users/${userId}/block/`),
    '解除拉黑用戶'
  );
};

// ==================== 用戶驗證 ====================

/**
 * 發送郵箱驗證鏈接
 * 
 * @returns Promise<{detail: string}> - 發送操作的結果信息
 * 
 * 功能：向當前用戶的註冊郵箱發送驗證鏈接
 * 
 * 使用範例：
 * ```typescript
 * const result = await sendEmailVerification();
 * console.log(result.detail); // "驗證郵件已發送"
 * ```
 */
export const sendEmailVerification = async (): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post('/users/me/verify_email/'),
    '發送郵箱驗證'
  );
};

/**
 * 確認郵箱驗證
 * 
 * @param token - 從驗證郵件中獲取的驗證令牌
 * @returns Promise<{detail: string}> - 驗證操作的結果信息
 * 
 * 使用範例：
 * ```typescript
 * // 從 URL 參數中獲取 token
 * const urlParams = new URLSearchParams(window.location.search);
 * const token = urlParams.get('token');
 * 
 * if (token) {
 *   const result = await confirmEmailVerification(token);
 *   console.log(result.detail); // "郵箱驗證成功"
 * }
 * ```
 */
export const confirmEmailVerification = async (token: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post('/users/verify_email/confirm/', { token }),
    '確認郵箱驗證'
  );
};

/**
 * 搜尋用戶
 * 
 * @param query - 搜尋關鍵字（用戶名、姓名等）
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 20 筆
 * @returns Promise<PaginatedResponse<UserData>> - 符合條件的用戶列表
 */
export const searchUsers = async (
  query: string, 
  page = 1, 
  pageSize = 20
): Promise<PaginatedResponse<UserData>> => {
  return handleApiCall(
    () => api.get('/users/search/', {
      params: { q: query, page, page_size: pageSize }
    }),
    '搜尋用戶'
  );
};

/**
 * 獲取推薦用戶列表
 * 
 * @param limit - 推薦用戶數量限制，默認 10 個
 * @returns Promise<UserData[]> - 推薦用戶列表
 */
export const getRecommendedUsers = async (limit = 10): Promise<UserData[]> => {
  return handleApiCall(
    () => api.get('/users/recommended/', {
      params: { limit }
    }),
    '獲取推薦用戶'
  );
};

/**
 * 檢查關注狀態
 * 
 * @param userId - 要檢查的用戶 ID
 * @returns Promise<FollowStatus> - 關注狀態信息
 */
export const checkFollowStatus = async (userId: string): Promise<FollowStatus> => {
  return handleApiCall(
    () => api.get(`/users/${userId}/follow-status/`),
    '檢查關注狀態'
  );
};

/**
 * 獲取用戶的貼文列表
 * 
 * @param userId - 用戶 ID
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Post>> - 用戶的貼文列表
 */
export const getUserPosts = async (
  userId: string, 
  page = 1, 
  pageSize = 10
): Promise<PaginatedResponse<Post>> => {
  return handleApiCall(
    () => api.get(`/users/${userId}/posts/`, {
      params: { page, page_size: pageSize }
    }),
    '獲取用戶貼文'
  );
};

/**
 * 獲取用戶的收藏貼文列表
 * 
 * @param userId - 用戶 ID（可選，不提供則獲取當前用戶）
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Post>> - 收藏的貼文列表
 */
export const getUserSavedPosts = async (
  userId?: string, 
  page = 1, 
  pageSize = 10
): Promise<PaginatedResponse<Post>> => {
  const endpoint = userId ? `/users/${userId}/saved-posts/` : '/users/me/saved-posts/';
  
  return handleApiCall(
    () => api.get(endpoint, {
      params: { page, page_size: pageSize }
    }),
    '獲取收藏貼文'
  );
};

/**
 * 獲取用戶的點讚貼文列表
 * 
 * @param userId - 用戶 ID（可選，不提供則獲取當前用戶）
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Post>> - 點讚的貼文列表
 */
export const getUserLikedPosts = async (
  userId?: string, 
  page = 1, 
  pageSize = 10
): Promise<PaginatedResponse<Post>> => {
  const endpoint = userId ? `/users/${userId}/liked-posts/` : '/users/me/liked-posts/';
  
  return handleApiCall(
    () => api.get(endpoint, {
      params: { page, page_size: pageSize }
    }),
    '獲取點讚貼文'
  );
};

/**
 * 檢查用戶名是否可用
 * 
 * @param username - 要檢查的用戶名
 * @returns Promise<{available: boolean}> - 用戶名是否可用
 */
export const checkUsernameAvailability = async (username: string): Promise<{ available: boolean }> => {
  return handleApiCall(
    () => api.get('/users/check-username/', {
      params: { username }
    }),
    '檢查用戶名可用性'
  );
};

/**
 * 檢查電子郵件是否可用
 * 
 * @param email - 要檢查的電子郵件
 * @returns Promise<{available: boolean}> - 電子郵件是否可用
 */
export const checkEmailAvailability = async (email: string): Promise<{ available: boolean }> => {
  return handleApiCall(
    () => api.get('/users/check-email/', {
      params: { email }
    }),
    '檢查電子郵件可用性'
  );
}; 