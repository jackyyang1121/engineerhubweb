import axios from './axiosConfig';

// 從統一類型文件導入類型定義
import type { Comment, CreateCommentData, PaginatedResponse } from '../types';

// 重新導出類型定義供其他模塊使用
export type { Comment, CreateCommentData } from '../types';

// 獲取貼文的評論
export const getCommentsByPostId = async (postId: string, page = 1, limit = 10): Promise<PaginatedResponse<Comment>> => {
  try {
    const response = await axios.get(`/posts/comments/post_comments/?post_id=${postId}&page=${page}&page_size=${limit}`);
    return response.data;
  } catch (error) {
    console.error('獲取評論失敗:', error);
    throw error;
  }
};

// 獲取評論的回覆
export const getCommentReplies = async (commentId: string, page = 1, limit = 10): Promise<PaginatedResponse<Comment>> => {
  try {
    const response = await axios.get(`/posts/comments/${commentId}/replies/?page=${page}&page_size=${limit}`);
    return response.data;
  } catch (error) {
    console.error('獲取回覆失敗:', error);
    throw error;
  }
};

// 創建評論或回覆
export const createComment = async (data: CreateCommentData): Promise<Comment> => {
  try {
    const response = await axios.post('/posts/comments/', data);
    return response.data;
  } catch (error) {
    console.error('創建評論失敗:', error);
    throw error;
  }
};

// 更新評論
export const updateComment = async (commentId: string, content: string): Promise<Comment> => {
  try {
    const response = await axios.put(`/posts/comments/${commentId}/`, { content });
    return response.data;
  } catch (error) {
    console.error('更新評論失敗:', error);
    throw error;
  }
};

// 刪除評論
export const deleteComment = async (commentId: string): Promise<void> => {
  try {
    await axios.delete(`/posts/comments/${commentId}/`);
  } catch (error) {
    console.error('刪除評論失敗:', error);
    throw error;
  }
};

// 點讚評論
export const likeComment = async (commentId: string): Promise<{ detail: string }> => {
  try {
    const response = await axios.post(`/posts/comments/${commentId}/like/`);
    return response.data;
  } catch (error) {
    console.error('點讚評論失敗:', error);
    throw error;
  }
};

// 取消點讚評論
export const unlikeComment = async (commentId: string): Promise<{ detail: string }> => {
  try {
    const response = await axios.delete(`/posts/comments/${commentId}/like/`);
    return response.data;
  } catch (error) {
    console.error('取消點讚評論失敗:', error);
    throw error;
  }
}; 