/**
 * 評論 API 模塊
 * 
 * 功能：提供所有與評論相關的 API 調用功能
 * 
 * 設計原則：
 * - Narrowly focused: 專職負責評論相關的 API 調用
 * - Flexible: 使用統一的錯誤處理機制，易於配置和擴展
 * - Loosely coupled: 通過類型系統確保 API 調用的安全性
 * 
 * 重構重點：
 * - 移除所有重複的 try-catch 錯誤處理邏輯
 * - 使用統一的 handleApiCall 錯誤處理器
 * - 提供清晰的類型定義和詳細註釋
 * - 保持函數職責單一，便於測試和維護
 */

import api from './axiosConfig';
import { handleApiCall } from '../utils/api-error-handler';
import type { Comment, CreateCommentData, PaginatedResponse } from '../types';

// 重新導出類型定義供其他模塊使用，提升模塊間的類型一致性
export type { Comment, CreateCommentData } from '../types';

/**
 * 獲取指定貼文的評論列表
 * 
 * @param postId - 貼文 ID，用於篩選該貼文下的評論
 * @param page - 頁碼，默認為第 1 頁（從 1 開始計數）
 * @param pageSize - 每頁顯示的評論數量，默認 10 條
 * @returns Promise<PaginatedResponse<Comment>> - 包含評論列表和分頁信息的響應
 * 
 * 使用範例：
 * ```typescript
 * // 獲取第一頁評論
 * const comments = await getCommentsByPostId('123');
 * 
 * // 獲取第二頁，每頁 20 條評論
 * const moreComments = await getCommentsByPostId('123', 2, 20);
 * ```
 */
export const getCommentsByPostId = async (
  postId: string, 
  page: number = 1, 
  pageSize: number = 10
): Promise<PaginatedResponse<Comment>> => {
  return handleApiCall(
    () => api.get('/posts/comments/post_comments/', {
      params: { 
        post_id: postId,  // 貼文 ID 參數
        page,             // 頁碼參數
        page_size: pageSize // 每頁大小參數
      }
    }),
    '獲取貼文評論列表'
  );
};

/**
 * 獲取指定評論的回覆列表
 * 
 * @param commentId - 父評論 ID，用於獲取該評論的所有回覆
 * @param page - 頁碼，默認為第 1 頁
 * @param pageSize - 每頁顯示的回覆數量，默認 10 條
 * @returns Promise<PaginatedResponse<Comment>> - 包含回覆列表和分頁信息的響應
 * 
 * 使用範例：
 * ```typescript
 * // 獲取評論的回覆
 * const replies = await getCommentReplies('456');
 * ```
 */
export const getCommentReplies = async (
  commentId: string, 
  page: number = 1, 
  pageSize: number = 10
): Promise<PaginatedResponse<Comment>> => {
  return handleApiCall(
    () => api.get(`/posts/comments/${commentId}/replies/`, {
      params: { 
        page,               // 頁碼參數
        page_size: pageSize // 每頁大小參數
      }
    }),
    '獲取評論回覆列表'
  );
};

/**
 * 創建新的評論或回覆
 * 
 * @param data - 評論創建數據，包含內容、貼文 ID 等信息
 * @returns Promise<Comment> - 創建成功後返回的評論對象
 * 
 * CreateCommentData 包含的字段：
 * - content: 評論內容（必填）
 * - post: 貼文 ID（評論時必填）
 * - parent: 父評論 ID（回覆時必填）
 * 
 * 使用範例：
 * ```typescript
 * // 創建評論
 * const comment = await createComment({
 *   content: '這是一條評論',
 *   post: '123'
 * });
 * 
 * // 創建回覆
 * const reply = await createComment({
 *   content: '這是一條回覆',
 *   parent: '456'
 * });
 * ```
 */
export const createComment = async (data: CreateCommentData): Promise<Comment> => {
  return handleApiCall(
    () => api.post('/posts/comments/', data),
    '創建評論'
  );
};

/**
 * 更新指定評論的內容
 * 
 * @param commentId - 要更新的評論 ID
 * @param content - 新的評論內容
 * @returns Promise<Comment> - 更新後的評論對象
 * 
 * 注意：只有評論作者才能更新自己的評論
 * 
 * 使用範例：
 * ```typescript
 * const updatedComment = await updateComment('456', '更新後的評論內容');
 * ```
 */
export const updateComment = async (commentId: string, content: string): Promise<Comment> => {
  return handleApiCall(
    () => api.put(`/posts/comments/${commentId}/`, { content }),
    '更新評論內容'
  );
};

/**
 * 刪除指定的評論
 * 
 * @param commentId - 要刪除的評論 ID
 * @returns Promise<void> - 刪除操作無返回值
 * 
 * 注意：
 * - 只有評論作者或管理員才能刪除評論
 * - 刪除父評論不會刪除其回覆，回覆會成為孤立評論
 * 
 * 使用範例：
 * ```typescript
 * await deleteComment('456');
 * console.log('評論已刪除');
 * ```
 */
export const deleteComment = async (commentId: string): Promise<void> => {
  return handleApiCall(
    () => api.delete(`/posts/comments/${commentId}/`),
    '刪除評論'
  );
};

/**
 * 對指定評論進行點讚
 * 
 * @param commentId - 要點讚的評論 ID
 * @returns Promise<{detail: string}> - 點讚操作的結果信息
 * 
 * 使用範例：
 * ```typescript
 * const result = await likeComment('456');
 * console.log(result.detail); // "點讚成功"
 * ```
 */
export const likeComment = async (commentId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/posts/comments/${commentId}/like/`),
    '點讚評論'
  );
};

/**
 * 取消對指定評論的點讚
 * 
 * @param commentId - 要取消點讚的評論 ID
 * @returns Promise<{detail: string}> - 取消點讚操作的結果信息
 * 
 * 使用範例：
 * ```typescript
 * const result = await unlikeComment('456');
 * console.log(result.detail); // "取消點讚成功"
 * ```
 */
export const unlikeComment = async (commentId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.delete(`/posts/comments/${commentId}/like/`),
    '取消點讚評論'
  );
}; 