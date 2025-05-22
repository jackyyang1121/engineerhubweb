import api from './axiosConfig';

// 從統一類型文件導入類型定義
import type {
  UserData,
  UserStats,
  PaginatedResponse,
  PortfolioProject,
  NotificationSettings,
  PrivacySettings,
  ChangePasswordData
} from '../types';

// 重新導出類型定義供其他模塊使用
export type {
  UserData,
  UserStats,
  PortfolioProject,
  NotificationSettings,
  PrivacySettings,
  ChangePasswordData
} from '../types';

// ==================== 用戶基本操作 ====================

// 獲取用戶資料
export const getUserProfile = async (userId: string): Promise<UserData> => {
  try {
    const response = await api.get(`/users/${userId}/`);
    return response.data;
  } catch (error) {
    console.error('獲取用戶資料錯誤:', error);
    throw error;
  }
};

// 獲取當前用戶資料
export const getCurrentUserProfile = async (): Promise<UserData> => {
  try {
    const response = await api.get('/users/me/');
    return response.data;
  } catch (error) {
    console.error('獲取當前用戶資料錯誤:', error);
    throw error;
  }
};

// 更新用戶資料
export const updateUserProfile = async (userData: Partial<UserData>): Promise<UserData> => {
  try {
    const response = await api.patch('/users/me/', userData);
    return response.data;
  } catch (error) {
    console.error('更新用戶資料錯誤:', error);
    throw error;
  }
};

// 上傳用戶頭像
export const uploadAvatar = async (file: File): Promise<UserData> => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.patch('/users/me/avatar/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('上傳頭像錯誤:', error);
    throw error;
  }
};

// ==================== 關注系統 ====================

// 關注用戶
export const followUser = async (userId: string): Promise<{ detail: string }> => {
  try {
    const response = await api.post(`/users/${userId}/follow/`);
    return response.data;
  } catch (error) {
    console.error('關注用戶錯誤:', error);
    throw error;
  }
};

// 取消關注用戶
export const unfollowUser = async (userId: string): Promise<{ detail: string }> => {
  try {
    const response = await api.delete(`/users/${userId}/follow/`);
    return response.data;
  } catch (error) {
    console.error('取消關注用戶錯誤:', error);
    throw error;
  }
};

// 獲取關注者列表
export const getFollowers = async (userId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<UserData>> => {
  try {
    const response = await api.get(`/users/${userId}/followers/`, {
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取關注者列表錯誤:', error);
    throw error;
  }
};

// 獲取關注列表
export const getFollowing = async (userId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<UserData>> => {
  try {
    const response = await api.get(`/users/${userId}/following/`, {
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取關注列表錯誤:', error);
    throw error;
  }
};

// ==================== 作品集管理 ====================

// 獲取用戶作品集
export const getPortfolio = async (userId: string): Promise<PortfolioProject[]> => {
  try {
    const response = await api.get(`/users/${userId}/portfolio/`);
    return response.data;
  } catch (error) {
    console.error('獲取作品集錯誤:', error);
    throw error;
  }
};

// 添加作品集項目
export const addPortfolioProject = async (projectData: Omit<PortfolioProject, 'id' | 'created_at'>): Promise<PortfolioProject> => {
  try {
    const response = await api.post('/users/me/portfolio/', projectData);
    return response.data;
  } catch (error) {
    console.error('添加作品集項目錯誤:', error);
    throw error;
  }
};

// 更新作品集項目
export const updatePortfolioProject = async (projectId: string, projectData: Partial<PortfolioProject>): Promise<PortfolioProject> => {
  try {
    const response = await api.patch(`/portfolio/${projectId}/`, projectData);
    return response.data;
  } catch (error) {
    console.error('更新作品集項目錯誤:', error);
    throw error;
  }
};

// 刪除作品集項目
export const deletePortfolioProject = async (projectId: string): Promise<void> => {
  try {
    await api.delete(`/portfolio/${projectId}/`);
  } catch (error) {
    console.error('刪除作品集項目錯誤:', error);
    throw error;
  }
};

// 上傳作品集項目圖片
export const uploadProjectImage = async (projectId: string, file: File): Promise<PortfolioProject> => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await api.patch(`/portfolio/${projectId}/image/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('上傳作品集圖片錯誤:', error);
    throw error;
  }
};

// ==================== 設置管理 ====================

// 獲取用戶設置
export const getUserSettings = async (): Promise<{ notifications: NotificationSettings; privacy: PrivacySettings }> => {
  try {
    const response = await api.get('/users/me/settings/');
    return response.data;
  } catch (error) {
    console.error('獲取用戶設置錯誤:', error);
    throw error;
  }
};

// 更新通知設置
export const updateNotificationSettings = async (settings: NotificationSettings): Promise<NotificationSettings> => {
  try {
    const response = await api.patch('/users/me/settings/notifications/', settings);
    return response.data;
  } catch (error) {
    console.error('更新通知設置錯誤:', error);
    throw error;
  }
};

// 更新隱私設置
export const updatePrivacySettings = async (settings: PrivacySettings): Promise<PrivacySettings> => {
  try {
    const response = await api.patch('/users/me/settings/privacy/', settings);
    return response.data;
  } catch (error) {
    console.error('更新隱私設置錯誤:', error);
    throw error;
  }
};

// 更改密碼
export const changeUserPassword = async (passwordData: ChangePasswordData): Promise<{ detail: string }> => {
  try {
    const response = await api.post('/users/me/change_password/', passwordData);
    return response.data;
  } catch (error) {
    console.error('更改密碼錯誤:', error);
    throw error;
  }
};

// ==================== 帳號管理 ====================

// 刪除帳號
export const deleteAccount = async (data: { password: string }): Promise<{ detail: string }> => {
  try {
    const response = await api.delete('/users/me/', { data });
    return response.data;
  } catch (error) {
    console.error('刪除帳號錯誤:', error);
    throw error;
  }
};

// 停用帳號
export const deactivateAccount = async (data: { password: string }): Promise<{ detail: string }> => {
  try {
    const response = await api.post('/users/me/deactivate/', data);
    return response.data;
  } catch (error) {
    console.error('停用帳號錯誤:', error);
    throw error;
  }
};

// 重新激活帳號
export const reactivateAccount = async (data: { email: string; password: string }): Promise<{ detail: string }> => {
  try {
    const response = await api.post('/users/reactivate/', data);
    return response.data;
  } catch (error) {
    console.error('重新激活帳號錯誤:', error);
    throw error;
  }
};

// ==================== 用戶統計 ====================

// 獲取用戶統計數據
export const getUserStats = async (userId: string): Promise<UserStats> => {
  try {
    const response = await api.get(`/users/${userId}/stats/`);
    return response.data;
  } catch (error) {
    console.error('獲取用戶統計錯誤:', error);
    throw error;
  }
};

// ==================== 黑名單管理 ====================

// 獲取黑名單列表
export const getBlockedUsers = async (page = 1, pageSize = 20): Promise<PaginatedResponse<UserData>> => {
  try {
    const response = await api.get('/users/me/blocked/', {
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取黑名單列表錯誤:', error);
    throw error;
  }
};

// 拉黑用戶
export const blockUser = async (userId: string): Promise<{ detail: string }> => {
  try {
    const response = await api.post(`/users/${userId}/block/`);
    return response.data;
  } catch (error) {
    console.error('拉黑用戶錯誤:', error);
    throw error;
  }
};

// 解除拉黑
export const unblockUser = async (userId: string): Promise<{ detail: string }> => {
  try {
    const response = await api.delete(`/users/${userId}/block/`);
    return response.data;
  } catch (error) {
    console.error('解除拉黑錯誤:', error);
    throw error;
  }
};

// ==================== 用戶驗證 ====================

// 發送郵箱驗證
export const sendEmailVerification = async (): Promise<{ detail: string }> => {
  try {
    const response = await api.post('/users/me/verify_email/');
    return response.data;
  } catch (error) {
    console.error('發送郵箱驗證錯誤:', error);
    throw error;
  }
};

// 確認郵箱驗證
export const confirmEmailVerification = async (token: string): Promise<{ detail: string }> => {
  try {
    const response = await api.post('/users/verify_email/confirm/', { token });
    return response.data;
  } catch (error) {
    console.error('確認郵箱驗證錯誤:', error);
    throw error;
  }
}; 