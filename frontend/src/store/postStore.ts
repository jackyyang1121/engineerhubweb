/**
 * 貼文狀態管理 Store
 * 統一管理所有貼文相關的狀態和操作
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../api/client';
import { logger } from '../utils/logger';
import { errorManager, AppError } from '../utils/errorHandler';
import type { Post, CreatePostData, UpdatePostData } from '../api/postApi';

// Store 狀態介面
interface PostState {
  // 貼文列表
  posts: Post[];                      // 所有貼文
  followingPosts: Post[];             // 關注用戶的貼文
  trendingPosts: Post[];              // 熱門貼文
  savedPosts: Post[];                 // 收藏的貼文
  userPosts: Map<string, Post[]>;     // 用戶貼文映射（用於個人頁面）
  
  // 分頁信息
  currentPage: number;                // 當前頁數
  hasMore: boolean;                   // 是否還有更多
  totalCount: number;                 // 總數量
  
  // 加載狀態
  isLoading: boolean;                 // 是否正在加載
  isRefreshing: boolean;              // 是否正在刷新
  isCreating: boolean;                // 是否正在創建
  
  // 錯誤狀態
  error: string | null;               // 錯誤信息
  
  // 操作方法
  // 貼文列表操作
  fetchPosts: (page?: number) => Promise<void>;                    // 獲取貼文列表
  fetchFollowingPosts: (page?: number) => Promise<void>;           // 獲取關注用戶貼文
  fetchTrendingPosts: (page?: number) => Promise<void>;            // 獲取熱門貼文
  fetchSavedPosts: (page?: number) => Promise<void>;               // 獲取收藏貼文
  fetchUserPosts: (userId: string, page?: number) => Promise<void>; // 獲取用戶貼文
  refreshPosts: () => Promise<void>;                               // 刷新貼文列表
  
  // 單個貼文操作
  createPost: (data: CreatePostData) => Promise<Post>;              // 創建貼文
  updatePost: (postId: string, data: UpdatePostData) => Promise<void>; // 更新貼文
  deletePost: (postId: string) => Promise<void>;                   // 刪除貼文
  
  // 互動操作
  likePost: (postId: string) => Promise<void>;                     // 點讚貼文
  unlikePost: (postId: string) => Promise<void>;                   // 取消點讚
  savePost: (postId: string) => Promise<void>;                     // 收藏貼文
  unsavePost: (postId: string) => Promise<void>;                   // 取消收藏
  sharePost: (postId: string, comment?: string) => Promise<void>;  // 轉發貼文
  
  // 工具方法
  getPostById: (postId: string) => Post | undefined;               // 根據ID獲取貼文
  clearPosts: () => void;                                          // 清空貼文列表
  clearError: () => void;                                          // 清除錯誤
  updateLocalPost: (postId: string, updates: Partial<Post>) => void; // 本地更新貼文
}

export const usePostStore = create<PostState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始狀態
        posts: [],
        followingPosts: [],
        trendingPosts: [],
        savedPosts: [],
        userPosts: new Map(),
        currentPage: 1,
        hasMore: true,
        totalCount: 0,
        isLoading: false,
        isRefreshing: false,
        isCreating: false,
        error: null,

        // 獲取貼文列表
        fetchPosts: async (page = 1) => {
          set({ isLoading: true, error: null });
          
          try {
            logger.info('post', `獲取貼文列表，頁數: ${page}`);
            
            const response = await apiClient.get<{
              count: number;
              results: Post[];
              next: string | null;
            }>('/posts/', {
              params: { page, page_size: 20 }
            });
            
            set(state => ({
              posts: page === 1 
                ? response.results 
                : [...state.posts, ...response.results],
              currentPage: page,
              hasMore: !!response.next,
              totalCount: response.count,
              isLoading: false
            }));
            
            logger.info('success', `成功獲取 ${response.results.length} 篇貼文`);
          } catch (error) {
            logger.error('post', '獲取貼文列表失敗', error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '載入失敗',
              isLoading: false 
            });
            errorManager.handle(error as Error);
          }
        },

        // 獲取關注用戶貼文
        fetchFollowingPosts: async (page = 1) => {
          set({ isLoading: true, error: null });
          
          try {
            logger.info('post', '獲取關注用戶貼文');
            
            const response = await apiClient.get<{
              count: number;
              results: Post[];
              next: string | null;
            }>('/posts/following/', {
              params: { page, page_size: 20 }
            });
            
            set(state => ({
              followingPosts: page === 1 
                ? response.results 
                : [...state.followingPosts, ...response.results],
              currentPage: page,
              hasMore: !!response.next,
              isLoading: false
            }));
            
            logger.info('success', `成功獲取 ${response.results.length} 篇關注用戶貼文`);
          } catch (error) {
            logger.error('post', '獲取關注用戶貼文失敗', error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '載入失敗',
              isLoading: false 
            });
            errorManager.handle(error as Error);
          }
        },

        // 獲取熱門貼文
        fetchTrendingPosts: async (page = 1) => {
          set({ isLoading: true, error: null });
          
          try {
            logger.info('post', '獲取熱門貼文');
            
            const response = await apiClient.get<{
              count: number;
              results: Post[];
              next: string | null;
            }>('/posts/trending/', {
              params: { page, page_size: 20 }
            });
            
            set(state => ({
              trendingPosts: page === 1 
                ? response.results 
                : [...state.trendingPosts, ...response.results],
              currentPage: page,
              hasMore: !!response.next,
              isLoading: false
            }));
            
            logger.info('success', `成功獲取 ${response.results.length} 篇熱門貼文`);
          } catch (error) {
            logger.error('post', '獲取熱門貼文失敗', error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '載入失敗',
              isLoading: false 
            });
            errorManager.handle(error as Error);
          }
        },

        // 獲取收藏貼文
        fetchSavedPosts: async (page = 1) => {
          set({ isLoading: true, error: null });
          
          try {
            logger.info('post', '獲取收藏貼文');
            
            const response = await apiClient.get<{
              count: number;
              results: Post[];
              next: string | null;
            }>('/posts/saved/', {
              params: { page, page_size: 20 }
            });
            
            set(state => ({
              savedPosts: page === 1 
                ? response.results 
                : [...state.savedPosts, ...response.results],
              currentPage: page,
              hasMore: !!response.next,
              isLoading: false
            }));
            
            logger.info('success', `成功獲取 ${response.results.length} 篇收藏貼文`);
          } catch (error) {
            logger.error('post', '獲取收藏貼文失敗', error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '載入失敗',
              isLoading: false 
            });
            errorManager.handle(error as Error);
          }
        },

        // 獲取用戶貼文
        fetchUserPosts: async (userId: string, page = 1) => {
          set({ isLoading: true, error: null });
          
          try {
            logger.info('post', `獲取用戶 ${userId} 的貼文`);
            
            const response = await apiClient.get<{
              count: number;
              results: Post[];
              next: string | null;
            }>(`/users/${userId}/posts/`, {
              params: { page, page_size: 20 }
            });
            
            const { userPosts } = get();
            const currentUserPosts = userPosts.get(userId) || [];
            
            userPosts.set(
              userId,
              page === 1 
                ? response.results 
                : [...currentUserPosts, ...response.results]
            );
            
            set({
              userPosts: new Map(userPosts),
              currentPage: page,
              hasMore: !!response.next,
              isLoading: false
            });
            
            logger.info('success', `成功獲取用戶 ${userId} 的 ${response.results.length} 篇貼文`);
          } catch (error) {
            logger.error('post', `獲取用戶 ${userId} 貼文失敗`, error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '載入失敗',
              isLoading: false 
            });
            errorManager.handle(error as Error);
          }
        },

        // 刷新貼文列表
        refreshPosts: async () => {
          set({ isRefreshing: true, error: null });
          
          try {
            logger.info('post', '刷新貼文列表');
            
            const response = await apiClient.get<{
              count: number;
              results: Post[];
              next: string | null;
            }>('/posts/', {
              params: { page: 1, page_size: 20 }
            });
            
            set({
              posts: response.results,
              currentPage: 1,
              hasMore: !!response.next,
              totalCount: response.count,
              isRefreshing: false
            });
            
            logger.info('success', '貼文列表刷新成功');
          } catch (error) {
            logger.error('post', '刷新貼文列表失敗', error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '刷新失敗',
              isRefreshing: false 
            });
            errorManager.handle(error as Error);
          }
        },

        // 創建貼文
        createPost: async (data: CreatePostData) => {
          set({ isCreating: true, error: null });
          
          try {
            logger.info('post', '創建新貼文');
            
            // 準備表單數據
            const formData = new FormData();
            formData.append('content', data.content);
            
            if (data.code_snippet) {
              formData.append('code_snippet', data.code_snippet);
            }
            
            if (data.media) {
              data.media.forEach((file, index) => {
                formData.append(`media_file_${index}`, file);
              });
            }
            
            const newPost = await apiClient.post<Post>('/posts/', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
            
            // 將新貼文添加到列表頂部
            set(state => ({
              posts: [newPost, ...state.posts],
              totalCount: state.totalCount + 1,
              isCreating: false
            }));
            
            logger.info('success', '貼文創建成功', { postId: newPost.id });
            return newPost;
          } catch (error) {
            logger.error('post', '創建貼文失敗', error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '發布失敗',
              isCreating: false 
            });
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 更新貼文
        updatePost: async (postId: string, data: UpdatePostData) => {
          set({ error: null });
          
          try {
            logger.info('post', `更新貼文 ${postId}`);
            
            // 準備表單數據
            const formData = new FormData();
            
            if (data.content !== undefined) {
              formData.append('content', data.content);
            }
            
            if (data.code_snippet !== undefined) {
              formData.append('code_snippet', data.code_snippet);
            }
            
            if (data.new_media) {
              data.new_media.forEach((file, index) => {
                formData.append(`new_media_${index}`, file);
              });
            }
            
            if (data.remove_media) {
              formData.append('remove_media', JSON.stringify(data.remove_media));
            }
            
            const updatedPost = await apiClient.patch<Post>(
              `/posts/${postId}/`,
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data'
                }
              }
            );
            
            // 更新本地貼文
            get().updateLocalPost(postId, updatedPost);
            
            logger.info('success', `貼文 ${postId} 更新成功`);
          } catch (error) {
            logger.error('post', `更新貼文 ${postId} 失敗`, error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '更新失敗'
            });
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 刪除貼文
        deletePost: async (postId: string) => {
          set({ error: null });
          
          try {
            logger.info('post', `刪除貼文 ${postId}`);
            
            await apiClient.delete(`/posts/${postId}/`);
            
            // 從所有列表中移除貼文
            set(state => ({
              posts: state.posts.filter(p => p.id !== postId),
              followingPosts: state.followingPosts.filter(p => p.id !== postId),
              trendingPosts: state.trendingPosts.filter(p => p.id !== postId),
              savedPosts: state.savedPosts.filter(p => p.id !== postId),
              totalCount: state.totalCount - 1
            }));
            
            // 從用戶貼文映射中移除
            const { userPosts } = get();
            userPosts.forEach((posts, userId) => {
              const filtered = posts.filter(p => p.id !== postId);
              if (filtered.length !== posts.length) {
                userPosts.set(userId, filtered);
              }
            });
            
            logger.info('success', `貼文 ${postId} 刪除成功`);
          } catch (error) {
            logger.error('post', `刪除貼文 ${postId} 失敗`, error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '刪除失敗'
            });
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 點讚貼文
        likePost: async (postId: string) => {
          try {
            logger.info('user', `點讚貼文 ${postId}`);
            
            await apiClient.post(`/posts/${postId}/like/`);
            
            // 更新本地貼文狀態
            get().updateLocalPost(postId, {
              is_liked: true,
              likes_count: (get().getPostById(postId)?.likes_count || 0) + 1
            });
            
            logger.info('success', `貼文 ${postId} 點讚成功`);
          } catch (error) {
            logger.error('post', `點讚貼文 ${postId} 失敗`, error);
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 取消點讚
        unlikePost: async (postId: string) => {
          try {
            logger.info('user', `取消點讚貼文 ${postId}`);
            
            await apiClient.delete(`/posts/${postId}/unlike/`);
            
            // 更新本地貼文狀態
            get().updateLocalPost(postId, {
              is_liked: false,
              likes_count: Math.max((get().getPostById(postId)?.likes_count || 1) - 1, 0)
            });
            
            logger.info('success', `貼文 ${postId} 取消點讚成功`);
          } catch (error) {
            logger.error('post', `取消點讚貼文 ${postId} 失敗`, error);
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 收藏貼文
        savePost: async (postId: string) => {
          try {
            logger.info('user', `收藏貼文 ${postId}`);
            
            await apiClient.post(`/posts/${postId}/save/`);
            
            // 更新本地貼文狀態
            const post = get().getPostById(postId);
            if (post) {
              get().updateLocalPost(postId, { is_saved: true });
              
              // 添加到收藏列表
              set(state => ({
                savedPosts: [post, ...state.savedPosts]
              }));
            }
            
            logger.info('success', `貼文 ${postId} 收藏成功`);
          } catch (error) {
            logger.error('post', `收藏貼文 ${postId} 失敗`, error);
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 取消收藏
        unsavePost: async (postId: string) => {
          try {
            logger.info('user', `取消收藏貼文 ${postId}`);
            
            await apiClient.delete(`/posts/${postId}/unsave/`);
            
            // 更新本地貼文狀態
            get().updateLocalPost(postId, { is_saved: false });
            
            // 從收藏列表中移除
            set(state => ({
              savedPosts: state.savedPosts.filter(p => p.id !== postId)
            }));
            
            logger.info('success', `貼文 ${postId} 取消收藏成功`);
          } catch (error) {
            logger.error('post', `取消收藏貼文 ${postId} 失敗`, error);
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 轉發貼文
        sharePost: async (postId: string, comment?: string) => {
          try {
            logger.info('user', `轉發貼文 ${postId}`);
            
            await apiClient.post(`/posts/${postId}/share/`, {
              comment
            });
            
            // 更新本地貼文狀態
            get().updateLocalPost(postId, {
              shares_count: (get().getPostById(postId)?.shares_count || 0) + 1
            });
            
            logger.info('success', `貼文 ${postId} 轉發成功`);
          } catch (error) {
            logger.error('post', `轉發貼文 ${postId} 失敗`, error);
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 根據ID獲取貼文
        getPostById: (postId: string) => {
          const state = get();
          
          // 在所有列表中查找
          return state.posts.find(p => p.id === postId) ||
                 state.followingPosts.find(p => p.id === postId) ||
                 state.trendingPosts.find(p => p.id === postId) ||
                 state.savedPosts.find(p => p.id === postId) ||
                 Array.from(state.userPosts.values())
                   .flat()
                   .find(p => p.id === postId);
        },

        // 清空貼文列表
        clearPosts: () => {
          set({
            posts: [],
            followingPosts: [],
            trendingPosts: [],
            savedPosts: [],
            userPosts: new Map(),
            currentPage: 1,
            hasMore: true,
            totalCount: 0,
            error: null
          });
          
          logger.info('store', '清空所有貼文列表');
        },

        // 清除錯誤
        clearError: () => {
          set({ error: null });
        },

        // 本地更新貼文
        updateLocalPost: (postId: string, updates: Partial<Post>) => {
          set(state => {
            // 更新所有列表中的貼文
            const updatePostInList = (posts: Post[]) =>
              posts.map(p => p.id === postId ? { ...p, ...updates } : p);
            
            // 更新用戶貼文映射
            const newUserPosts = new Map(state.userPosts);
            newUserPosts.forEach((posts, userId) => {
              newUserPosts.set(userId, updatePostInList(posts));
            });
            
            return {
              posts: updatePostInList(state.posts),
              followingPosts: updatePostInList(state.followingPosts),
              trendingPosts: updatePostInList(state.trendingPosts),
              savedPosts: updatePostInList(state.savedPosts),
              userPosts: newUserPosts
            };
          });
          
          logger.debug('store', `本地更新貼文 ${postId}`, updates);
        }
      }),
      {
        name: 'engineerhub-post-storage',  // 持久化存儲名稱
        partialize: (state) => ({           // 只持久化部分狀態
          savedPosts: state.savedPosts      // 只保存收藏貼文
        })
      }
    ),
    {
      name: 'PostStore'                     // DevTools 中顯示的名稱
    }
  )
);