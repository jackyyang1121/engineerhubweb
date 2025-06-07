/**
 * 作品集管理模態組件
 * 用於創建和編輯作品集項目
 */

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { 
  XMarkIcon, 
  PhotoIcon,
  LinkIcon,
  CodeBracketIcon,
  PlayIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { logger } from '../../utils/logger';
import { usePortfolioStore } from '../../store/portfolioStore';
import type { PortfolioProject } from '../../types';

// 介面定義
interface PortfolioModalProps {
  isOpen: boolean;                          // 是否顯示模態
  onClose: () => void;                      // 關閉回調
  project?: PortfolioProject | null;        // 編輯的項目（新增時為 null）
  onSuccess?: () => void;                   // 成功回調
}

interface FormData {
  title: string;                            // 項目標題
  description: string;                      // 項目描述
  project_url: string;                      // 項目網址
  github_url: string;                       // GitHub 網址
  youtube_url: string;                      // YouTube 網址
  technologies: string;                     // 技術棧（逗號分隔）
  is_featured: boolean;                     // 是否精選
}

// 常用技術標籤
const COMMON_TECHNOLOGIES = [
  'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express',
  'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker',
  'TypeScript', 'JavaScript', 'Python', 'Java', 'Go',
  'AWS', 'GCP', 'Azure', 'Kubernetes', 'GraphQL'
];

export const PortfolioModal: React.FC<PortfolioModalProps> = ({
  isOpen,
  onClose,
  project,
  onSuccess
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedTechs, setSelectedTechs] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createProject, updateProject, isCreating, isUpdating } = usePortfolioStore();
  
  // 表單管理
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      project_url: '',
      github_url: '',
      youtube_url: '',
      technologies: '',
      is_featured: false
    }
  });
  
  const isEditMode = !!project;
  const isSubmitting = isCreating || isUpdating;
  const watchedTechs = watch('technologies');

  // 初始化表單數據
  useEffect(() => {
    if (isOpen && project) {
      // 編輯模式：填充現有數據
      setValue('title', project.title);
      setValue('description', project.description);
      setValue('project_url', project.project_url || '');
      setValue('github_url', project.github_url || '');
      setValue('youtube_url', project.youtube_url || '');
      setValue('technologies', project.technologies.join(', '));
      setValue('is_featured', project.is_featured);
      
      // 設置技術標籤
      setSelectedTechs(new Set(project.technologies));
      
      // 設置圖片預覽
      if (project.image) {
        setImagePreview(project.image);
      }
    } else if (isOpen && !project) {
      // 新增模式：重置表單
      reset();
      setImageFile(null);
      setImagePreview('');
      setSelectedTechs(new Set());
    }
  }, [isOpen, project, setValue, reset]);

  // 處理圖片選擇
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 驗證文件類型
    if (!file.type.startsWith('image/')) {
      toast.error('請選擇圖片文件');
      return;
    }
    
    // 驗證文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.error('圖片大小不能超過 5MB');
      return;
    }
    
    setImageFile(file);
    
    // 創建預覽
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 處理技術標籤選擇
  const toggleTech = (tech: string) => {
    const newTechs = new Set(selectedTechs);
    if (newTechs.has(tech)) {
      newTechs.delete(tech);
    } else {
      newTechs.add(tech);
    }
    setSelectedTechs(newTechs);
    setValue('technologies', Array.from(newTechs).join(', '));
  };

  // 同步輸入框的技術標籤到選中狀態
  useEffect(() => {
    const techs = watchedTechs
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    setSelectedTechs(new Set(techs));
  }, [watchedTechs]);

  // 提交表單
  const onSubmit = async (data: FormData) => {
    try {
      // 解析技術標籤
      const technologies = data.technologies
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      if (technologies.length === 0) {
        toast.error('請至少添加一個技術標籤');
        return;
      }
      
      logger.info('portfolio', isEditMode ? '更新作品集項目' : '創建作品集項目');
      
      if (isEditMode && project) {
        // 更新項目
        await updateProject({
          id: project.id,
          title: data.title,
          description: data.description,
          image: imageFile || undefined,
          project_url: data.project_url || undefined,
          github_url: data.github_url || undefined,
          youtube_url: data.youtube_url || undefined,
          technologies,
          is_featured: data.is_featured
        });
        
        toast.success('作品集項目更新成功！');
      } else {
        // 創建項目
        if (!imageFile && !imagePreview) {
          toast.error('請上傳項目圖片');
          return;
        }
        
        await createProject({
          title: data.title,
          description: data.description,
          image: imageFile || undefined,
          project_url: data.project_url || undefined,
          github_url: data.github_url || undefined,
          youtube_url: data.youtube_url || undefined,
          technologies,
          is_featured: data.is_featured
        });
        
        toast.success('作品集項目創建成功！');
      }
      
      logger.info('success', '作品集操作成功');
      
      // 調用成功回調
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('portfolio', '作品集操作失敗', error);
      toast.error(isEditMode ? '更新失敗，請重試' : '創建失敗，請重試');
    }
  };

  // 如果不顯示，不渲染任何內容
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* 頭部 */}
        <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10">
          <div className="flex items-center space-x-3">
            <CodeBracketIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              {isEditMode ? '編輯作品集項目' : '新增作品集項目'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* 項目圖片 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  項目圖片 *
                </label>
                <div className="relative">
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="項目預覽"
                        className="w-full h-48 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                      >
                        <PhotoIcon className="h-8 w-8 text-white" />
                        <span className="ml-2 text-white">更換圖片</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                    >
                      <PhotoIcon className="h-12 w-12 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-600">點擊上傳項目圖片</span>
                      <span className="text-xs text-slate-500 mt-1">支援 JPG、PNG、GIF，最大 5MB</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 項目標題 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    項目標題 *
                  </label>
                  <input
                    {...register('title', {
                      required: '請輸入項目標題',
                      maxLength: {
                        value: 100,
                        message: '標題不能超過 100 個字元'
                      }
                    })}
                    type="text"
                    placeholder="例如：工程師社群平台"
                    className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
                  )}
                </div>

                {/* 精選項目 */}
                <div className="flex items-end">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      {...register('is_featured')}
                      type="checkbox"
                      className="sr-only"
                    />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-200 transition-colors duration-200 flex items-center justify-center">
                        {watch('is_featured') ? (
                          <StarIconSolid className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <StarIcon className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-slate-700">設為精選項目</span>
                  </label>
                </div>
              </div>

              {/* 項目描述 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  項目描述 *
                </label>
                <textarea
                  {...register('description', {
                    required: '請輸入項目描述',
                    maxLength: {
                      value: 500,
                      message: '描述不能超過 500 個字元'
                    }
                  })}
                  rows={4}
                  placeholder="描述這個項目的功能、特色和技術亮點..."
                  className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 resize-none"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* 項目連結 */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-700">項目連結</h4>
                
                {/* 項目網址 */}
                <div>
                  <label className="flex items-center space-x-2 text-sm text-slate-600 mb-1">
                    <LinkIcon className="h-4 w-4" />
                    <span>項目網址</span>
                  </label>
                  <input
                    {...register('project_url', {
                      pattern: {
                        value: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
                        message: '請輸入有效的網址'
                      }
                    })}
                    type="url"
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                  />
                  {errors.project_url && (
                    <p className="mt-1 text-sm text-red-500">{errors.project_url.message}</p>
                  )}
                </div>

                {/* GitHub 網址 */}
                <div>
                  <label className="flex items-center space-x-2 text-sm text-slate-600 mb-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span>GitHub 倉庫</span>
                  </label>
                  <input
                    {...register('github_url', {
                      pattern: {
                        value: /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/?$/,
                        message: '請輸入有效的 GitHub 倉庫網址'
                      }
                    })}
                    type="url"
                    placeholder="https://github.com/username/repository"
                    className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                  />
                  {errors.github_url && (
                    <p className="mt-1 text-sm text-red-500">{errors.github_url.message}</p>
                  )}
                </div>

                {/* YouTube 網址 */}
                <div>
                  <label className="flex items-center space-x-2 text-sm text-slate-600 mb-1">
                    <PlayIcon className="h-4 w-4" />
                    <span>YouTube 演示影片</span>
                  </label>
                  <input
                    {...register('youtube_url', {
                      pattern: {
                        value: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
                        message: '請輸入有效的 YouTube 網址'
                      }
                    })}
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                  />
                  {errors.youtube_url && (
                    <p className="mt-1 text-sm text-red-500">{errors.youtube_url.message}</p>
                  )}
                </div>
              </div>

              {/* 技術標籤 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  技術棧 *
                </label>
                
                {/* 快速選擇 */}
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-2">快速選擇：</p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_TECHNOLOGIES.map(tech => (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => toggleTech(tech)}
                        className={`px-3 py-1 text-sm rounded-full transition-all duration-200 ${
                          selectedTechs.has(tech)
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 自定義輸入 */}
                <input
                  {...register('technologies', {
                    required: '請添加至少一個技術標籤'
                  })}
                  type="text"
                  placeholder="輸入技術名稱，用逗號分隔（例如：React, Node.js, PostgreSQL）"
                  className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                />
                {errors.technologies && (
                  <p className="mt-1 text-sm text-red-500">{errors.technologies.message}</p>
                )}
                
                {/* 已選擇的標籤預覽 */}
                {selectedTechs.size > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from(selectedTechs).map(tech => (
                      <span
                        key={tech}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 底部操作欄 */}
          <div className="px-6 py-4 border-t border-white/20 bg-gradient-to-r from-slate-50/80 via-white/80 to-slate-50/80 backdrop-blur-sm">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                  isSubmitting
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isEditMode ? '更新中...' : '創建中...'}</span>
                  </div>
                ) : (
                  <span>{isEditMode ? '更新項目' : '創建項目'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};