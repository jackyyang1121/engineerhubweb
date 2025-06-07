/**
 * 作品集網格顯示組件
 * 用於展示作品集項目列表
 */

import React, { useState } from 'react';
import { 
  LinkIcon,
  CodeBracketIcon,
  PlayIcon,
  StarIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { logger } from '../../utils/logger';
import { usePortfolioStore } from '../../store/portfolioStore';
import type { PortfolioProject } from '../../types';
import { PortfolioModal } from './PortfolioModal';
import { toast } from 'react-toastify';

// 介面定義
interface PortfolioGridProps {
  projects: PortfolioProject[];             // 項目列表
  isLoading?: boolean;                      // 是否加載中
  isOwner?: boolean;                        // 是否為擁有者
  onRefresh?: () => void;                   // 刷新回調
}

export const PortfolioGrid: React.FC<PortfolioGridProps> = ({
  projects,
  isLoading = false,
  isOwner = false,
  onRefresh
}) => {
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  
  const { deleteProject, toggleFeatured, isDeleting } = usePortfolioStore();

  // 處理編輯項目
  const handleEdit = (project: PortfolioProject) => {
    logger.info('portfolio', `編輯項目 ${project.id}`);
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  // 處理刪除項目
  const handleDelete = async (project: PortfolioProject) => {
    if (!confirm(`確定要刪除「${project.title}」嗎？此操作不可恢復。`)) {
      return;
    }
    
    try {
      logger.info('portfolio', `刪除項目 ${project.id}`);
      await deleteProject(project.id);
      toast.success('項目刪除成功');
      onRefresh?.();
    } catch (error) {
      logger.error('portfolio', `刪除項目 ${project.id} 失敗`, error);
      toast.error('刪除失敗，請重試');
    }
  };

  // 處理切換精選狀態
  const handleToggleFeatured = async (project: PortfolioProject) => {
    try {
      logger.info('portfolio', `切換項目 ${project.id} 精選狀態`);
      await toggleFeatured(project.id);
      toast.success(project.is_featured ? '已取消精選' : '已設為精選');
      onRefresh?.();
    } catch (error) {
      logger.error('portfolio', `切換精選狀態失敗`, error);
      toast.error('操作失敗，請重試');
    }
  };

  // 處理圖片加載錯誤
  const handleImageError = (projectId: string) => {
    setImageLoadErrors(prev => new Set(prev).add(projectId));
  };

  // 處理成功回調
  const handleSuccess = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
    onRefresh?.();
  };

  // 加載中狀態
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200"></div>
            <div className="p-4 space-y-3">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              <div className="flex space-x-2">
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 空狀態
  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-12">
        <CodeBracketIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">暫無作品集項目</p>
        {isOwner && (
          <button
            onClick={() => {
              setSelectedProject(null);
              setIsModalOpen(true);
            }}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors duration-200"
          >
            創建第一個項目
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
          >
            {/* 項目圖片 */}
            <div className="relative h-48 bg-gray-100 overflow-hidden">
              {!imageLoadErrors.has(project.id) && project.image ? (
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={() => handleImageError(project.id)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                  <CodeBracketIcon className="h-16 w-16 text-blue-400/50" />
                </div>
              )}
              
              {/* 精選標記 */}
              {project.is_featured && (
                <div className="absolute top-2 right-2 bg-yellow-400/90 backdrop-blur-sm rounded-full p-2">
                  <StarIconSolid className="h-4 w-4 text-white" />
                </div>
              )}
              
              {/* 操作按鈕（擁有者） */}
              {isOwner && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
                  <button
                    onClick={() => handleEdit(project)}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors duration-200"
                    title="編輯項目"
                  >
                    <PencilIcon className="h-5 w-5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => handleToggleFeatured(project)}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors duration-200"
                    title={project.is_featured ? '取消精選' : '設為精選'}
                  >
                    {project.is_featured ? (
                      <StarIconSolid className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <StarIcon className="h-5 w-5 text-gray-700" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(project)}
                    disabled={isDeleting}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors duration-200 disabled:opacity-50"
                    title="刪除項目"
                  >
                    <TrashIcon className="h-5 w-5 text-red-600" />
                  </button>
                </div>
              )}
            </div>
            
            {/* 項目信息 */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                {project.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {project.description}
              </p>
              
              {/* 技術標籤 */}
              <div className="flex flex-wrap gap-1 mb-4">
                {project.technologies.slice(0, 3).map((tech, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {tech}
                  </span>
                ))}
                {project.technologies.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{project.technologies.length - 3}
                  </span>
                )}
              </div>
              
              {/* 連結按鈕 */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-3">
                  {project.project_url && (
                    <a
                      href={project.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-blue-600 transition-colors duration-200"
                      title="查看項目"
                    >
                      <LinkIcon className="h-5 w-5" />
                    </a>
                  )}
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-900 transition-colors duration-200"
                      title="GitHub"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    </a>
                  )}
                  {project.youtube_url && (
                    <a
                      href={project.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-red-600 transition-colors duration-200"
                      title="YouTube"
                    >
                      <PlayIcon className="h-5 w-5" />
                    </a>
                  )}
                </div>
                
                {/* 查看數 */}
                <div className="flex items-center text-gray-400 text-sm">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  {project.views || 0}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 編輯/創建模態 */}
      <PortfolioModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
        onSuccess={handleSuccess}
      />
    </>
  );
};