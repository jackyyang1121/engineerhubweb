/**
 * 貼文 API 模塊
 * 
 * 功能：提供所有與貼文相關的 API 調用功能
 * 
 * 重構重點：
 * - 使用統一的錯誤處理機制
 * - 清理重複的 try-catch 邏輯
 * - 保持函數職責單一
 * - 提供清晰的類型定義
 */

import api from './axiosConfig';
import { handleApiCall } from '../utils/api-error-handler';
import type { 
  Post,  
  CreatePostData, 
  UpdatePostData,
  PaginatedResponse,
  Comment,
  ReportData
} from '../types';

// 重新導出類型定義供其他模塊使用
export type {
  Post,
  PostMedia,
  CreatePostData,
  UpdatePostData,
  Comment,
  PaginatedResponse
} from '../types';

// 錯誤響應類型定義（暫時保留，可能在後續版本中使用）
// interface PostAPIError {
//   response?: {
//     status?: number;
//     data?: {
//       message?: string;
//       errors?: Record<string, string[]>;
//       [key: string]: unknown;
//     };
//     headers?: Record<string, string>;
//   };
//   request?: XMLHttpRequest;
//   message?: string;
// }

// 推薦用戶響應類型（使用分頁格式以匹配後端 API）
interface RecommendedUsersResponse {
  pagination: {
    count: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    start_index: number;
    end_index: number;
    has_next: boolean;
    has_previous: boolean;
    next: string | null;
    previous: string | null;
  };
  results: Array<{
    id: string;
    username: string;
    display_name: string;
    bio: string;
    avatar_url: string;
    followers_count: number;
    is_following?: boolean;
  }>;
}

/**
 * 獲取貼文列表
 * 
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Post>> - 分頁的貼文數據
 */
export const getPosts = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  return handleApiCall(
    () => api.get('/posts/', {
      params: { page, page_size: pageSize }
    }),
    '獲取貼文列表'
  );
};

/**
 * 獲取關注用戶的貼文
 * 
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Post>> - 關注用戶的貼文數據
 */
export const getFollowingPosts = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  return handleApiCall(
    () => api.get('/posts/following/', {
      params: { page, page_size: pageSize }
    }),
    '獲取關注用戶貼文'
  );
};

/**
 * 獲取熱門貼文
 * 
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Post>> - 熱門貼文數據
 */
export const getTrendingPosts = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  return handleApiCall(
    () => api.get('/posts/trending/', {
      params: { page, page_size: pageSize }
    }),
    '獲取熱門貼文'
  );
};

/**
 * 獲取指定用戶的貼文
 * 
 * @param userId - 用戶 ID
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Post>> - 用戶的貼文數據
 */
export const getUserPosts = async (userId: string, page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  return handleApiCall(
    () => api.get('/posts/', {
      params: { author: userId, page, page_size: pageSize }
    }),
    '獲取用戶貼文'
  );
};

/**
 * 獲取單個貼文詳情
 * 
 * @param postId - 貼文 ID
 * @returns Promise<Post> - 貼文詳情數據
 */
export const getPost = async (postId: string): Promise<Post> => {
  return handleApiCall(
    () => api.get(`/posts/${postId}/`),
    '獲取貼文詳情'
  );
};

/**
 * 別名方法：獲取單個貼文（保持 API 一致性）
 * 
 * @param postId - 貼文 ID
 * @returns Promise<Post> - 貼文詳情數據
 */
export const getPostById = async (postId: string): Promise<Post> => {
  return getPost(postId);
};

/**
 * 創建新貼文
 * 
 * @param postData - 貼文創建數據
 * @returns Promise<Post> - 創建的貼文數據
 * 
 * 功能：
 * - 支援文字內容和程式碼片段
 * - 支援多媒體文件上傳（圖片、影片）
 * - 自動處理 FormData 格式
 */
export const createPost = async (postData: CreatePostData): Promise<Post> => {
  return handleApiCall(
    () => {
      // 記錄創建貼文的調試信息
      console.log('🚀 創建貼文 - 前端數據:', postData);
      
      // 使用 FormData 處理文件上傳
      const formData = new FormData();
      
      // 添加文字內容
      formData.append('content', postData.content);
      
      // 添加程式碼片段（可選）
      if (postData.code_snippet) {
        formData.append('code_snippet', postData.code_snippet);
      }
      
      // 處理媒體文件（可選）
      if (postData.media && postData.media.length > 0) {
        console.log('🚀 添加媒體文件:', postData.media.length, '個');
        postData.media.forEach((file) => {
          formData.append('media_files', file);
          // 根據文件類型設置媒體類型
          formData.append('media_types', file.type.startsWith('image/') ? 'image' : 'video');
        });
      } else {
        console.log('🚀 沒有媒體文件');
      }
      
      // 發送 POST 請求
      return api.post('/posts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    '創建貼文'
  );
};

/**
 * 更新貼文
 * 
 * @param postId - 貼文 ID
 * @param postData - 更新的貼文數據
 * @returns Promise<Post> - 更新後的貼文數據
 * 
 * 功能：
 * - 支援部分更新（只傳遞需要更新的字段）
 * - 支援新增媒體文件
 * - 自動處理 FormData 格式
 */
export const updatePost = async (postId: string, postData: UpdatePostData): Promise<Post> => {
  return handleApiCall(
    () => {
      const formData = new FormData();
      
      // 添加要更新的內容（只添加已定義的字段）
      if (postData.content !== undefined) {
        formData.append('content', postData.content);
      }
      
      if (postData.code_snippet !== undefined) {
        formData.append('code_snippet', postData.code_snippet);
      }
      
      // 添加新媒體文件（如果有的話）
      if (postData.new_media && postData.new_media.length > 0) {
        postData.new_media.forEach((file) => {
          formData.append('media_files', file);
          formData.append('media_types', file.type.startsWith('image/') ? 'image' : 'video');
        });
      }
      
      // 發送 PATCH 請求進行部分更新
      return api.patch(`/posts/${postId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    '更新貼文'
  );
};

/**
 * 刪除貼文
 * 
 * @param postId - 要刪除的貼文 ID
 * @returns Promise<void> - 刪除操作的結果
 */
export const deletePost = async (postId: string): Promise<void> => {
  return handleApiCall(
    () => api.delete(`/posts/${postId}/`),
    '刪除貼文'
  );
};

/**
 * 點讚貼文
 * 
 * @param postId - 要點讚的貼文 ID
 * @returns Promise<{detail: string}> - 點讚操作的結果信息
 */
export const likePost = async (postId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/posts/${postId}/interactions/like/`),
    '點讚貼文'
  );
};

/**
 * 取消點讚貼文
 * 
 * @param postId - 要取消點讚的貼文 ID
 * @returns Promise<{detail: string}> - 取消點讚操作的結果信息
 */
export const unlikePost = async (postId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/posts/${postId}/interactions/unlike/`),
    '取消點讚貼文'
  );
};

/**
 * 收藏貼文
 * 
 * @param postId - 要收藏的貼文 ID
 * @returns Promise<{detail: string}> - 收藏操作的結果信息
 */
export const savePost = async (postId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/posts/${postId}/interactions/save/`),
    '收藏貼文'
  );
};

/**
 * 取消收藏貼文
 * 
 * @param postId - 要取消收藏的貼文 ID
 * @returns Promise<{detail: string}> - 取消收藏操作的結果信息
 */
export const unsavePost = async (postId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/posts/${postId}/interactions/unsave/`),
    '取消收藏貼文'
  );
};

/**
 * 獲取已收藏的貼文列表
 * 
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Post>> - 收藏的貼文數據
 */
export const getSavedPosts = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  return handleApiCall(
    () => api.get('/posts/saved/', {
      params: { page, page_size: pageSize }
    }),
    '獲取收藏貼文'
  );
};

/**
 * 檢舉貼文
 * 
 * @param postId - 要檢舉的貼文 ID
 * @param reportData - 檢舉數據（原因、描述等）
 * @returns Promise<{detail: string}> - 檢舉操作的結果信息
 */
export const reportPost = async (postId: string, reportData: ReportData): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/posts/${postId}/interactions/report/`, reportData),
    '檢舉貼文'
  );
};

/**
 * 獲取貼文的評論列表
 * 
 * @param postId - 貼文 ID
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Comment>> - 評論數據
 */
export const getPostComments = async (postId: string, page = 1, pageSize = 10): Promise<PaginatedResponse<Comment>> => {
  return handleApiCall(
    () => api.get(`/posts/${postId}/comments/`, {
      params: { page, page_size: pageSize }
    }),
    '獲取貼文評論'
  );
};

/**
 * 創建評論
 * 
 * @param commentData - 評論數據（貼文 ID、內容、父評論 ID）
 * @returns Promise<Comment> - 創建的評論數據
 */
export const createComment = async (commentData: { post: string; content: string; parent?: string }): Promise<Comment> => {
  return handleApiCall(
    () => api.post('/comments/', commentData),
    '創建評論'
  );
};

/**
 * 更新評論
 * 
 * @param commentId - 評論 ID
 * @param commentData - 更新的評論數據
 * @returns Promise<Comment> - 更新後的評論數據
 */
export const updateComment = async (commentId: string, commentData: { content: string }): Promise<Comment> => {
  return handleApiCall(
    () => api.patch(`/comments/${commentId}/`, commentData),
    '更新評論'
  );
};

/**
 * 刪除評論
 * 
 * @param commentId - 要刪除的評論 ID
 * @returns Promise<void> - 刪除操作的結果
 */
export const deleteComment = async (commentId: string): Promise<void> => {
  return handleApiCall(
    () => api.delete(`/comments/${commentId}/`),
    '刪除評論'
  );
};

/**
 * 獲取評論的回覆列表
 * 
 * @param commentId - 評論 ID
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Comment>> - 回覆數據
 */
export const getCommentReplies = async (commentId: string, page = 1, pageSize = 10): Promise<PaginatedResponse<Comment>> => {
  return handleApiCall(
    () => api.get(`/comments/${commentId}/replies/`, {
      params: { page, page_size: pageSize }
    }),
    '獲取評論回覆'
  );
};

/**
 * 分享貼文
 * 
 * @param postId - 要分享的貼文 ID
 * @param comment - 分享時的評論（可選）
 * @returns Promise<{detail: string}> - 分享操作的結果信息
 */
export const sharePost = async (postId: string, comment = ''): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/posts/${postId}/interactions/share/`, { comment }),
    '分享貼文'
  );
};

/**
 * 取消分享貼文
 * 
 * @param postId - 要取消分享的貼文 ID
 * @returns Promise<{detail: string}> - 取消分享操作的結果信息
 */
export const unsharePost = async (postId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/posts/${postId}/interactions/unshare/`),
    '取消分享貼文'
  );
};

/**
 * 獲取已分享的貼文列表
 * 
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Post>> - 分享的貼文數據
 */
export const getSharedPosts = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  return handleApiCall(
    () => api.get('/posts/shared_posts/', {
      params: { page, page_size: pageSize }
    }),
    '獲取分享貼文'
  );
};

/**
 * 獲取個人化動態摘要
 * 
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁數量，默認 10 筆
 * @returns Promise<PaginatedResponse<Post>> - 動態摘要數據
 */
export const getFeed = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  return handleApiCall(
    () => api.get('/posts/feed/', {
      params: { page, page_size: pageSize }
    }),
    '獲取動態摘要'
  );
};

/**
 * 獲取推薦用戶列表
 * 
 * @returns Promise<RecommendedUsersResponse> - 推薦用戶數據
 */
export const getRecommendedUsers = async (): Promise<RecommendedUsersResponse> => {
  return handleApiCall(
    () => api.get('/users/recommended/'),
    '獲取推薦用戶'
  );
}; 