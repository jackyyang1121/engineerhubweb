/**
 * 作品集狀態管理 Store
 * 統一管理所有作品集相關的狀態和操作
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../api/client';
import { logger } from '../utils/logger';
import { errorManager, AppError, ErrorType } from '../utils/errorHandler';
import type { PortfolioProject } from '../types';

// 創建作品集數據介面
interface CreateProjectData {
  title: string;                        // 項目標題
  description: string;                  // 項目描述
  image?: File;                         // 項目圖片
  project_url?: string;                 // 項目網址
  github_url?: string;                  // GitHub 網址
  youtube_url?: string;                 // YouTube 網址
  technologies: string[];               // 技術棧
  is_featured?: boolean;                // 是否精選
}

// 更新作品集數據介面
interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string;                           // 項目ID
}

// Store 狀態介面
interface PortfolioState {
  // 作品集列表
  projects: PortfolioProject[];         // 所有作品集項目
  userProjects: Map<string, PortfolioProject[]>; // 用戶作品集映射
  featuredProjects: PortfolioProject[]; // 精選項目
  
  // 加載狀態
  isLoading: boolean;                   // 是否正在加載
  isCreating: boolean;                  // 是否正在創建
  isUpdating: boolean;                  // 是否正在更新
  isDeleting: boolean;                  // 是否正在刪除
  
  // 錯誤狀態
  error: string | null;                 // 錯誤信息
  
  // 操作方法
  // 項目列表操作
  fetchProjects: () => Promise<void>;                              // 獲取所有項目
  fetchUserProjects: (userId: string) => Promise<void>;            // 獲取用戶項目
  fetchFeaturedProjects: () => Promise<void>;                     // 獲取精選項目
  
  // 單個項目操作
  createProject: (data: CreateProjectData) => Promise<PortfolioProject>;    // 創建項目
  updateProject: (data: UpdateProjectData) => Promise<void>;                // 更新項目
  deleteProject: (projectId: string) => Promise<void>;                      // 刪除項目
  
  // 項目操作
  toggleFeatured: (projectId: string) => Promise<void>;            // 切換精選狀態
  reorderProjects: (projectIds: string[]) => Promise<void>;        // 重新排序項目
  
  // 工具方法
  getProjectById: (projectId: string) => PortfolioProject | undefined;      // 根據ID獲取項目
  clearProjects: () => void;                                                // 清空項目列表
  clearError: () => void;                                                   // 清除錯誤
}

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始狀態
        projects: [],
        userProjects: new Map(),
        featuredProjects: [],
        isLoading: false,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        error: null,

        // 獲取所有項目
        fetchProjects: async () => {
          set({ isLoading: true, error: null });
          
          try {
            logger.info('portfolio', '獲取所有作品集項目');
            
            const response = await apiClient.get<PortfolioProject[]>('/portfolio/projects/');
            
            set({
              projects: response,
              isLoading: false
            });
            
            logger.info('success', `成功獲取 ${response.length} 個作品集項目`);
          } catch (error) {
            logger.error('portfolio', '獲取作品集項目失敗', error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '載入失敗',
              isLoading: false 
            });
            errorManager.handle(error as Error);
          }
        },

        // 獲取用戶項目
        fetchUserProjects: async (userId: string) => {
          set({ isLoading: true, error: null });
          
          try {
            logger.info('portfolio', `獲取用戶 ${userId} 的作品集項目`);
            
            const response = await apiClient.get<PortfolioProject[]>(`/users/${userId}/portfolio/`);
            
            const { userProjects } = get();
            userProjects.set(userId, response);
            
            set({
              userProjects: new Map(userProjects),
              isLoading: false
            });
            
            logger.info('success', `成功獲取用戶 ${userId} 的 ${response.length} 個作品集項目`);
          } catch (error) {
            logger.error('portfolio', `獲取用戶 ${userId} 作品集項目失敗`, error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '載入失敗',
              isLoading: false 
            });
            errorManager.handle(error as Error);
          }
        },

        // 獲取精選項目
        fetchFeaturedProjects: async () => {
          set({ isLoading: true, error: null });
          
          try {
            logger.info('portfolio', '獲取精選作品集項目');
            
            const response = await apiClient.get<PortfolioProject[]>('/portfolio/featured/');
            
            set({
              featuredProjects: response,
              isLoading: false
            });
            
            logger.info('success', `成功獲取 ${response.length} 個精選項目`);
          } catch (error) {
            logger.error('portfolio', '獲取精選項目失敗', error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '載入失敗',
              isLoading: false 
            });
            errorManager.handle(error as Error);
          }
        },

        // 創建項目
        createProject: async (data: CreateProjectData) => {
          set({ isCreating: true, error: null });
          
          try {
            logger.info('portfolio', '創建新的作品集項目');
            
            // 準備表單數據
            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('description', data.description);
            
            if (data.image) {
              formData.append('image', data.image);
            }
            
            if (data.project_url) {
              formData.append('project_url', data.project_url);
            }
            
            if (data.github_url) {
              formData.append('github_url', data.github_url);
            }
            
            if (data.youtube_url) {
              formData.append('youtube_url', data.youtube_url);
            }
            
            if (data.technologies && data.technologies.length > 0) {
              formData.append('technologies', JSON.stringify(data.technologies));
            }
            
            if (data.is_featured !== undefined) {
              formData.append('is_featured', String(data.is_featured));
            }
            
            const newProject = await apiClient.post<PortfolioProject>('/portfolio/projects/', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
            
            // 將新項目添加到列表
            set(state => ({
              projects: [newProject, ...state.projects],
              isCreating: false
            }));
            
            logger.info('success', '作品集項目創建成功', { projectId: newProject.id });
            return newProject;
          } catch (error) {
            logger.error('portfolio', '創建作品集項目失敗', error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '創建失敗',
              isCreating: false 
            });
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 更新項目
        updateProject: async (data: UpdateProjectData) => {
          set({ isUpdating: true, error: null });
          
          try {
            logger.info('portfolio', `更新作品集項目 ${data.id}`);
            
            // 準備表單數據
            const formData = new FormData();
            
            if (data.title !== undefined) {
              formData.append('title', data.title);
            }
            
            if (data.description !== undefined) {
              formData.append('description', data.description);
            }
            
            if (data.image) {
              formData.append('image', data.image);
            }
            
            if (data.project_url !== undefined) {
              formData.append('project_url', data.project_url);
            }
            
            if (data.github_url !== undefined) {
              formData.append('github_url', data.github_url);
            }
            
            if (data.youtube_url !== undefined) {
              formData.append('youtube_url', data.youtube_url);
            }
            
            if (data.technologies !== undefined) {
              formData.append('technologies', JSON.stringify(data.technologies));
            }
            
            if (data.is_featured !== undefined) {
              formData.append('is_featured', String(data.is_featured));
            }
            
            const updatedProject = await apiClient.patch<PortfolioProject>(
              `/portfolio/projects/${data.id}/`,
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data'
                }
              }
            );
            
            // 更新本地項目
            set(state => ({
              projects: state.projects.map(p => 
                p.id === data.id ? updatedProject : p
              ),
              featuredProjects: state.featuredProjects.map(p => 
                p.id === data.id ? updatedProject : p
              ),
              isUpdating: false
            }));
            
            // 更新用戶項目映射
            const { userProjects } = get();
            userProjects.forEach((projects, userId) => {
              userProjects.set(
                userId,
                projects.map(p => p.id === data.id ? updatedProject : p)
              );
            });
            
            logger.info('success', `作品集項目 ${data.id} 更新成功`);
          } catch (error) {
            logger.error('portfolio', `更新作品集項目 ${data.id} 失敗`, error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '更新失敗',
              isUpdating: false 
            });
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 刪除項目
        deleteProject: async (projectId: string) => {
          set({ isDeleting: true, error: null });
          
          try {
            logger.info('portfolio', `刪除作品集項目 ${projectId}`);
            
            await apiClient.delete(`/portfolio/projects/${projectId}/`);
            
            // 從所有列表中移除項目
            set(state => ({
              projects: state.projects.filter(p => p.id !== projectId),
              featuredProjects: state.featuredProjects.filter(p => p.id !== projectId),
              isDeleting: false
            }));
            
            // 從用戶項目映射中移除
            const { userProjects } = get();
            userProjects.forEach((projects, userId) => {
              const filtered = projects.filter(p => p.id !== projectId);
              if (filtered.length !== projects.length) {
                userProjects.set(userId, filtered);
              }
            });
            
            logger.info('success', `作品集項目 ${projectId} 刪除成功`);
          } catch (error) {
            logger.error('portfolio', `刪除作品集項目 ${projectId} 失敗`, error);
            set({ 
              error: error instanceof AppError ? error.userMessage : '刪除失敗',
              isDeleting: false 
            });
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 切換精選狀態
        toggleFeatured: async (projectId: string) => {
          try {
            logger.info('portfolio', `切換項目 ${projectId} 的精選狀態`);
            
            const project = get().getProjectById(projectId);
            if (!project) {
              throw new AppError('項目不存在', ErrorType.NOT_FOUND);
            }
            
            const updatedProject = await apiClient.patch<PortfolioProject>(
              `/portfolio/projects/${projectId}/`,
              { is_featured: !project.is_featured }
            );
            
            // 更新本地狀態
            set(state => ({
              projects: state.projects.map(p => 
                p.id === projectId ? updatedProject : p
              )
            }));
            
            // 更新精選列表
            if (updatedProject.is_featured) {
              set(state => ({
                featuredProjects: [...state.featuredProjects, updatedProject]
              }));
            } else {
              set(state => ({
                featuredProjects: state.featuredProjects.filter(p => p.id !== projectId)
              }));
            }
            
            logger.info('success', `項目 ${projectId} 精選狀態切換成功`);
          } catch (error) {
            logger.error('portfolio', `切換項目 ${projectId} 精選狀態失敗`, error);
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 重新排序項目
        reorderProjects: async (projectIds: string[]) => {
          try {
            logger.info('portfolio', '重新排序作品集項目');
            
            await apiClient.post('/portfolio/projects/reorder/', {
              project_ids: projectIds
            });
            
            // 根據新順序重新排列本地項目
            const { projects } = get();
            const reorderedProjects = projectIds
              .map(id => projects.find(p => p.id === id))
              .filter(Boolean) as PortfolioProject[];
            
            set({ projects: reorderedProjects });
            
            logger.info('success', '作品集項目重新排序成功');
          } catch (error) {
            logger.error('portfolio', '重新排序失敗', error);
            errorManager.handle(error as Error);
            throw error;
          }
        },

        // 根據ID獲取項目
        getProjectById: (projectId: string) => {
          const state = get();
          
          // 在所有列表中查找
          return state.projects.find(p => p.id === projectId) ||
                 state.featuredProjects.find(p => p.id === projectId) ||
                 Array.from(state.userProjects.values())
                   .flat()
                   .find(p => p.id === projectId);
        },

        // 清空項目列表
        clearProjects: () => {
          set({
            projects: [],
            userProjects: new Map(),
            featuredProjects: [],
            error: null
          });
          
          logger.info('store', '清空所有作品集項目');
        },

        // 清除錯誤
        clearError: () => {
          set({ error: null });
        }
      }),
      {
        name: 'engineerhub-portfolio-storage',  // 持久化存儲名稱
        partialize: (state) => ({               // 只持久化部分狀態
          projects: state.projects.slice(0, 10) // 只保存前10個項目
        })
      }
    ),
    {
      name: 'PortfolioStore'                    // DevTools 中顯示的名稱
    }
  )
);