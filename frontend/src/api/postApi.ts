import api from './axiosConfig';

// 從統一類型文件導入類型定義
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

// 獲取貼文列表
export const getPosts = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  try {
    const response = await api.get('/posts/', {
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取貼文列表錯誤:', error);
    throw error;
  }
};

// 獲取關注用戶的貼文
export const getFollowingPosts = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  try {
    const response = await api.get('/posts/following_posts/', {
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取關注用戶貼文錯誤:', error);
    throw error;
  }
};

// 獲取熱門貼文
export const getTrendingPosts = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  try {
    const response = await api.get('/posts/trending/', {
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取熱門貼文錯誤:', error);
    throw error;
  }
};

// 獲取用戶的貼文
export const getUserPosts = async (userId: string, page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  try {
    const response = await api.get('/posts/', {
      params: { author: userId, page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取用戶貼文錯誤:', error);
    throw error;
  }
};

// 獲取單個貼文
export const getPost = async (postId: string): Promise<Post> => {
  try {
    const response = await api.get(`/posts/${postId}/`);
    return response.data;
  } catch (error) {
    console.error('獲取貼文詳情錯誤:', error);
    throw error;
  }
};

// 別名方法，保持API一致性
export const getPostById = async (postId: string): Promise<Post> => {
  return getPost(postId);
};

// 創建貼文
export const createPost = async (postData: CreatePostData): Promise<Post> => {
  try {
    console.log('🚀 創建貼文 - 前端數據:', postData);
    
    // 使用 FormData 上傳文件
    const formData = new FormData();
    formData.append('content', postData.content);
    
    if (postData.code_snippet) {
      formData.append('code_snippet', postData.code_snippet);
    }
    
    // 只在有媒體文件時才添加媒體相關字段
    if (postData.media && postData.media.length > 0) {
      console.log('🚀 添加媒體文件:', postData.media.length, '個');
      postData.media.forEach((file) => {
        formData.append('media_files', file);
        formData.append('media_types', file.type.startsWith('image/') ? 'image' : 'video');
      });
    } else {
      console.log('🚀 沒有媒體文件');
    }
    
    // 調試：打印 FormData 內容
    console.log('🚀 FormData 內容:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
    }
    
    const response = await api.post('/posts/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('創建貼文錯誤:', error);
    
    // 顯示詳細的錯誤信息
    if (error.response) {
      console.error('🚫 後端錯誤響應:', error.response.status, error.response.data);
      console.error('🚫 錯誤詳情:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('🚫 請求沒有響應:', error.request);
    } else {
      console.error('🚫 請求設置錯誤:', error.message);
    }
    
    throw error;
  }
};

// 更新貼文
export const updatePost = async (postId: string, postData: UpdatePostData): Promise<Post> => {
  try {
    const formData = new FormData();
    
    if (postData.content !== undefined) {
      formData.append('content', postData.content);
    }
    
    if (postData.code_snippet !== undefined) {
      formData.append('code_snippet', postData.code_snippet);
    }
    
    // 添加新媒體文件 - 使用後端期待的格式
    if (postData.new_media && postData.new_media.length > 0) {
      postData.new_media.forEach((file) => {
        formData.append('media_files', file);
        formData.append('media_types', file.type.startsWith('image/') ? 'image' : 'video');
      });
    }
    
    const response = await api.patch(`/posts/${postId}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('更新貼文錯誤:', error);
    throw error;
  }
};

// 刪除貼文
export const deletePost = async (postId: string): Promise<void> => {
  try {
    console.log('🗑️ 开始删除贴文:', postId);
    const response = await api.delete(`/posts/${postId}/`);
    console.log('✅ 删除贴文成功:', response);
  } catch (error: any) {
    console.error('❌ 删除贴文错误详情:', {
      message: error.message,
      response: error.response,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });
    console.error('刪除貼文錯誤:', error);
    throw error;
  }
};

// 點讚貼文
export const likePost = async (postId: string): Promise<{ detail: string }> => {
  try {
    const response = await api.post(`/posts/${postId}/like/`);
    return response.data;
  } catch (error) {
    console.error('點讚貼文錯誤:', error);
    throw error;
  }
};

// 取消點讚貼文
export const unlikePost = async (postId: string): Promise<{ detail: string }> => {
  try {
    const response = await api.post(`/posts/${postId}/unlike/`);
    return response.data;
  } catch (error) {
    console.error('取消點讚貼文錯誤:', error);
    throw error;
  }
};

// 收藏貼文
export const savePost = async (postId: string): Promise<{ detail: string }> => {
  try {
    const response = await api.post(`/posts/${postId}/save/`);
    return response.data;
  } catch (error) {
    console.error('收藏貼文錯誤:', error);
    throw error;
  }
};

// 取消收藏貼文
export const unsavePost = async (postId: string): Promise<{ detail: string }> => {
  try {
    const response = await api.post(`/posts/${postId}/unsave/`);
    return response.data;
  } catch (error) {
    console.error('取消收藏貼文錯誤:', error);
    throw error;
  }
};

// 獲取收藏的貼文
export const getSavedPosts = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  try {
    const response = await api.get('/posts/saved/', {
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取收藏貼文錯誤:', error);
    throw error;
  }
};

// 舉報貼文
export const reportPost = async (postId: string, reportData: ReportData): Promise<{ detail: string }> => {
  try {
    const response = await api.post(`/posts/${postId}/report/`, reportData);
    return response.data;
  } catch (error) {
    console.error('舉報貼文錯誤:', error);
    throw error;
  }
};

// 獲取貼文評論
export const getPostComments = async (postId: string, page = 1, pageSize = 10): Promise<PaginatedResponse<Comment>> => {
  try {
    const response = await api.get('/posts/comments/post_comments/', {
      params: { post_id: postId, page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取貼文評論錯誤:', error);
    throw error;
  }
};

// 創建評論
export const createComment = async (commentData: { post: string; content: string; parent?: string }): Promise<Comment> => {
  try {
    const response = await api.post('/posts/comments/', commentData);
    return response.data;
  } catch (error) {
    console.error('創建評論錯誤:', error);
    throw error;
  }
};

// 更新評論
export const updateComment = async (commentId: string, commentData: { content: string }): Promise<Comment> => {
  try {
    const response = await api.patch(`/posts/comments/${commentId}/`, commentData);
    return response.data;
  } catch (error) {
    console.error('更新評論錯誤:', error);
    throw error;
  }
};

// 刪除評論
export const deleteComment = async (commentId: string): Promise<void> => {
  try {
    await api.delete(`/posts/comments/${commentId}/`);
  } catch (error) {
    console.error('刪除評論錯誤:', error);
    throw error;
  }
};

// 獲取評論回覆
export const getCommentReplies = async (commentId: string, page = 1, pageSize = 10): Promise<PaginatedResponse<Comment>> => {
  try {
    const response = await api.get(`/posts/comments/${commentId}/replies/`, {
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取評論回覆錯誤:', error);
    throw error;
  }
};

// 轉發貼文
export const sharePost = async (postId: string, comment = ''): Promise<{ detail: string }> => {
  try {
    const response = await api.post(`/posts/${postId}/share/`, { comment });
    return response.data;
  } catch (error) {
    console.error('轉發貼文錯誤:', error);
    throw error;
  }
};

// 取消轉發貼文
export const unsharePost = async (postId: string): Promise<{ detail: string }> => {
  try {
    const response = await api.post(`/posts/${postId}/unshare/`);
    return response.data;
  } catch (error) {
    console.error('取消轉發貼文錯誤:', error);
    throw error;
  }
};

// 獲取用戶轉發的貼文
export const getSharedPosts = async (page = 1, pageSize = 10): Promise<PaginatedResponse<any>> => {
  try {
    const response = await api.get('/posts/shared_posts/', {
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取轉發貼文錯誤:', error);
    throw error;
  }
};

// 獲取推薦貼文（信息流）
export const getFeed = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Post>> => {
  try {
    const response = await api.get('/posts/recommendations/', {
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('獲取推薦貼文錯誤:', error);
    throw error;
  }
};

// 獲取推薦用戶
export const getRecommendedUsers = async (): Promise<any> => {
  try {
    // 這裡暫時返回空陣列，需要實際的後端 API
    return { users: [] };
  } catch (error) {
    console.error('獲取推薦用戶錯誤:', error);
    throw error;
  }
}; 