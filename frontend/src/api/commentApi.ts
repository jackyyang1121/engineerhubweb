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
    // 返回模擬數據用於開發
    return {
      results: Array.from({ length: 3 }, (_, i) => ({
        id: `comment-${postId}-${i}`,
        content: `這是第 ${i + 1} 條測試評論。評論內容可以非常豐富，包括代碼分享、技術討論等。`,
        created_at: new Date(Date.now() - i * 3600000).toISOString(),
        updated_at: i % 3 === 0 ? new Date(Date.now() - i * 1800000).toISOString() : undefined,
        likes_count: Math.floor(Math.random() * 10),
        replies_count: i === 0 ? 2 : 0,
        is_liked: Math.random() > 0.5,
        is_deleted: false,
        is_edited: i % 3 === 0,
        user: {
          id: `user-${i}`,
          username: `test_user_${i}`,
          display_name: `Test User ${i}`,
          avatar: `https://ui-avatars.com/api/?name=User${i}&background=random`
        },
        post: postId
      })),
      count: 3,
      next: null,
      previous: null
    };
  }
};

// 獲取評論的回覆
export const getCommentReplies = async (commentId: string, page = 1, limit = 10): Promise<PaginatedResponse<Comment>> => {
  try {
    const response = await axios.get(`/posts/comments/${commentId}/replies/?page=${page}&page_size=${limit}`);
    return response.data;
  } catch (error) {
    console.error('獲取回覆失敗:', error);
    // 返回模擬數據用於開發
    return {
      results: Array.from({ length: 2 }, (_, i) => ({
        id: `reply-${commentId}-${i}`,
        content: `這是對評論的第 ${i + 1} 條回覆。`,
        created_at: new Date(Date.now() - i * 1800000).toISOString(),
        likes_count: Math.floor(Math.random() * 5),
        replies_count: 0,
        is_liked: Math.random() > 0.5,
        is_deleted: false,
        is_edited: false,
        user: {
          id: `user-reply-${i}`,
          username: `reply_user_${i}`,
          display_name: `Reply User ${i}`,
          avatar: `https://ui-avatars.com/api/?name=Reply${i}&background=random`
        },
        post: 'mock-post-id',
        parent: commentId
      })),
      count: 2,
      next: null,
      previous: null
    };
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