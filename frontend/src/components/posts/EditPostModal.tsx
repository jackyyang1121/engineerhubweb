/**
 * 編輯貼文模態組件
 * 支援編輯文字內容、新增/刪除媒體檔案、編輯程式碼
 */

import React, { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { 
  XMarkIcon, 
  PhotoIcon, 
  CodeBracketIcon, 
  PencilIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { logger } from '../../utils/logger';
import { errorManager, AppError, ErrorType } from '../../utils/errorHandler';
import { apiClient } from '../../api/client';
import CodeEditor from './CodeEditor';
import type { Post } from '../../types';

// 介面定義
interface EditPostModalProps {
  post: Post;                           // 要編輯的貼文
  isOpen: boolean;                      // 是否顯示模態
  onClose: () => void;                  // 關閉回調
  onPostUpdated: (post: Post) => void;  // 更新成功回調
  onSuccess?: () => void;                // 成功回調
}

interface FormData {
  content: string;                      // 貼文內容
}

interface MediaFile {
  id?: string;                          // 已存在媒體的ID
  file?: File;                          // 新上傳的檔案
  url: string;                          // 預覽URL
  type: 'image' | 'video';              // 媒體類型
  isNew: boolean;                       // 是否為新上傳
}

// 常數定義
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
const MAX_MEDIA_COUNT = 10;             // 最多10個媒體檔案
const MAX_CODE_LENGTH = 2000;           // 程式碼最大長度
const MAX_CONTENT_LENGTH = 500;         // 內容最大長度

export const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  isOpen,
  onClose,
  onPostUpdated,
  onSuccess
}) => {
  // 狀態管理
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('javascript');
  const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]); // 記錄要刪除的媒體ID
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 表單管理
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<FormData>({
    defaultValues: {
      content: post.content
    }
  });
  
  const content = watch('content', '');

  // 初始化數據
  useEffect(() => {
    if (isOpen) {
      // 初始化內容
      setValue('content', post.content);
      
      // 初始化程式碼
      if (post.code_snippet) {
        setCode(post.code_snippet);
        setShowCodeEditor(true);
        // TODO: 自動檢測語言
        setLanguage('javascript');
      }
      
      // 初始化媒體檔案
      const existingMedia: MediaFile[] = [];
      if (post.media && post.media.length > 0) {
        post.media.forEach((mediaItem) => {
          existingMedia.push({
            id: mediaItem.id,
            url: mediaItem.file,
            type: mediaItem.media_type === 'video' ? 'video' : 'image',
            isNew: false
          });
        });
      }
      setMediaFiles(existingMedia);
      
      logger.debug('post', '初始化編輯貼文', {
        postId: post.id,
        hasCode: !!post.code_snippet,
        mediaCount: existingMedia.length
      });
    }
  }, [isOpen, post, setValue]);

  // 處理媒體檔案上傳
  const handleMediaUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // 檢查是否超過最大數量
    if (mediaFiles.length + files.length > MAX_MEDIA_COUNT) {
      toast.error(`最多只能上傳 ${MAX_MEDIA_COUNT} 個媒體檔案`);
      return;
    }
    
    const newFiles: MediaFile[] = [];
    
    Array.from(files).forEach(file => {
      // 檢查檔案類型
      if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
        toast.error(`不支援的檔案類型：${file.type}`);
        return;
      }
      
      // 創建預覽URL
      const url = URL.createObjectURL(file);
      
      newFiles.push({
        file,
        url,
        type: file.type.startsWith('video') ? 'video' : 'image',
        isNew: true
      });
    });
    
    setMediaFiles([...mediaFiles, ...newFiles]);
    logger.info('user', `新增 ${newFiles.length} 個媒體檔案`);
  };

  // 移除媒體檔案
  const removeMediaFile = (index: number) => {
    const media = mediaFiles[index];
    
    // 如果是新上傳的檔案，釋放URL資源
    if (media.isNew) {
      URL.revokeObjectURL(media.url);
    } else if (media.id) {
      // 如果是已存在的媒體，記錄要刪除的ID
      setDeletedMediaIds([...deletedMediaIds, media.id]);
    }
    
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    logger.info('user', '移除媒體檔案', { index, isNew: media.isNew });
  };

  // 切換程式碼編輯器顯示
  const toggleCodeEditor = () => {
    setShowCodeEditor(!showCodeEditor);
    if (!showCodeEditor && !code) {
      // 如果打開編輯器且沒有程式碼，設置預設值
      setCode('// 在此輸入程式碼...');
    }
  };

  // 提交編輯
  const onSubmit = async (data: FormData) => {
    // 驗證輸入
    if (!data.content.trim() && !code && mediaFiles.length === 0) {
      toast.error('請輸入貼文內容、程式碼或上傳媒體檔案');
      return;
    }

    if (code && code.length > MAX_CODE_LENGTH) {
      toast.error(`程式碼長度不能超過 ${MAX_CODE_LENGTH} 個字元`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 準備表單數據
      const formData = new FormData();
      formData.append('content', data.content);
      
      // 添加程式碼（如果有）
      if (showCodeEditor && code) {
        formData.append('code_snippet', code);
      } else if (!showCodeEditor && post.code_snippet) {
        // 如果關閉了程式碼編輯器，清空程式碼
        formData.append('code_snippet', '');
      }
      
      // 處理媒體檔案
      const newMediaFiles: File[] = [];
      mediaFiles.forEach(media => {
        if (media.isNew && media.file) {
          newMediaFiles.push(media.file);
        }
      });
      
      // 添加新媒體檔案
      newMediaFiles.forEach((file, index) => {
        formData.append(`media_file_${index}`, file);
      });
      
      // 添加要刪除的媒體ID
      if (deletedMediaIds.length > 0) {
        formData.append('deleted_media_ids', JSON.stringify(deletedMediaIds));
      }
      
      logger.info('post', '提交編輯貼文', {
        postId: post.id,
        hasNewMedia: newMediaFiles.length > 0,
        deletedMedia: deletedMediaIds.length
      });
      
      // 發送更新請求
      const updatedPost = await apiClient.patch<Post>(
        `/posts/${post.id}/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      toast.success('貼文更新成功！');
      logger.info('success', '貼文更新成功', { postId: post.id });
      
      // 清理資源
      mediaFiles.forEach(media => {
        if (media.isNew) {
          URL.revokeObjectURL(media.url);
        }
      });
      
      // 調用回調
      onPostUpdated(updatedPost);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('post', '更新貼文失敗', error);
      const appError = error instanceof AppError 
        ? error 
        : new AppError('更新貼文失敗', ErrorType.API);
      errorManager.handle(appError);
      toast.error('更新貼文失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 如果不顯示，不渲染任何內容
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slide-in-up">
        {/* 頭部 */}
        <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
          <div className="flex items-center space-x-3">
            <PencilIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">編輯貼文</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* 內容編輯區 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    貼文內容
                  </label>
                  <textarea
                    {...register('content', {
                      maxLength: {
                        value: MAX_CONTENT_LENGTH,
                        message: `內容不能超過 ${MAX_CONTENT_LENGTH} 個字元`
                      }
                    })}
                    rows={4}
                    placeholder="分享你的想法..."
                    className="w-full p-4 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 resize-none text-slate-800 placeholder-slate-500"
                  />
                  {errors.content && (
                    <p className="mt-2 text-sm text-red-500">{errors.content.message}</p>
                  )}
                  <div className="mt-2 text-xs text-slate-500 text-right">
                    {content.length}/{MAX_CONTENT_LENGTH} 字元
                  </div>
                </div>
                
                {/* 程式碼編輯器 */}
                {showCodeEditor && (
                  <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 flex justify-between items-center border-b border-slate-200">
                      <div className="flex items-center space-x-3">
                        <CodeBracketIcon className="h-5 w-5 text-slate-600" />
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1 text-slate-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="typescript">TypeScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="csharp">C#</option>
                          <option value="cpp">C++</option>
                          <option value="go">Go</option>
                          <option value="rust">Rust</option>
                          <option value="html">HTML</option>
                          <option value="css">CSS</option>
                          <option value="sql">SQL</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCodeEditor(false);
                          setCode('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all duration-200"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <CodeEditor
                      language={language}
                      value={code}
                      onChange={setCode}
                      placeholder="// 在此輸入程式碼..."
                    />
                    <div className="bg-slate-50 px-4 py-2 text-xs text-right text-slate-500 border-t border-slate-200">
                      {code.length}/{MAX_CODE_LENGTH} 字元
                    </div>
                  </div>
                )}
                
                {/* 媒體預覽區 */}
                {mediaFiles.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      媒體檔案 ({mediaFiles.length}/{MAX_MEDIA_COUNT})
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {mediaFiles.map((media, index) => (
                        <div key={index} className="relative group">
                          {media.type === 'image' ? (
                            <img 
                              src={media.url} 
                              alt={`媒體 ${index + 1}`} 
                              className="h-32 w-full object-cover rounded-xl border border-slate-200"
                            />
                          ) : (
                            <video 
                              src={media.url} 
                              className="h-32 w-full object-cover rounded-xl border border-slate-200" 
                              controls
                            />
                          )}
                          
                          {/* 新增標記 */}
                          {media.isNew && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                              新增
                            </div>
                          )}
                          
                          {/* 刪除按鈕 */}
                          <button
                            type="button"
                            onClick={() => removeMediaFile(index)}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                          
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-all duration-200"></div>
                        </div>
                      ))}
                      
                      {/* 新增媒體按鈕 */}
                      {mediaFiles.length < MAX_MEDIA_COUNT && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                        >
                          <PlusIcon className="h-8 w-8 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 底部工具欄 */}
          <div className="px-6 py-4 border-t border-white/20 bg-gradient-to-r from-slate-50/80 via-white/80 to-slate-50/80 backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <div className="flex space-x-3">
                {/* 媒體上傳按鈕 */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={mediaFiles.length >= MAX_MEDIA_COUNT}
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    mediaFiles.length >= MAX_MEDIA_COUNT 
                    ? 'text-slate-400 cursor-not-allowed bg-slate-100' 
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title={mediaFiles.length >= MAX_MEDIA_COUNT ? `最多上傳 ${MAX_MEDIA_COUNT} 個媒體檔案` : '上傳媒體'}
                >
                  <PhotoIcon className="h-5 w-5" />
                </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept={ALLOWED_MEDIA_TYPES.join(',')}
                  multiple
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                
                {/* 程式碼按鈕 */}
                {!showCodeEditor && (
                  <button
                    type="button"
                    onClick={toggleCodeEditor}
                    className="p-3 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                    title="添加程式碼"
                  >
                    <CodeBracketIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              {/* 操作按鈕 */}
              <div className="flex items-center space-x-3">
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
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform ${
                    isSubmitting
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>更新中...</span>
                    </div>
                  ) : (
                    '更新貼文'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};