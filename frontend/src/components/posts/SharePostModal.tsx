/**
 * 轉發貼文模態組件
 * 支援快速轉發和引用轉發
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { 
  XMarkIcon, 
  ShareIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { logger } from '../../utils/logger';
import { errorManager, AppError, ErrorType } from '../../utils/errorHandler';
import { apiClient } from '../../api/client';
import type { Post } from '../../types';
import { useAuthStore } from '../../store/authStore';

// 介面定義
interface SharePostModalProps {
  post: Post;                          // 要轉發的貼文
  isOpen: boolean;                     // 是否顯示模態
  onClose: () => void;                 // 關閉回調
  onShared: () => void;                // 轉發成功回調
  onSuccess?: () => void;              // 成功回調
}

interface FormData {
  comment: string;                     // 轉發時的評論
}

// 轉發類型
type ShareType = 'quick' | 'quote';    // 快速轉發 | 引用轉發

export const SharePostModal: React.FC<SharePostModalProps> = ({
  post,
  isOpen,
  onClose,
  onShared,
  onSuccess
}) => {
  const [shareType, setShareType] = useState<ShareType>('quick');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  
  const { register, handleSubmit, watch, reset } = useForm<FormData>({
    defaultValues: {
      comment: ''
    }
  });
  
  const comment = watch('comment', '');

  // 執行快速轉發
  const handleQuickShare = async () => {
    setIsSubmitting(true);
    
    try {
      logger.info('post', '執行快速轉發', { postId: post.id });
      
      // 發送轉發請求
      await apiClient.post(`/posts/${post.id}/share/`);
      
      toast.success('轉發成功！');
      logger.info('success', '貼文轉發成功', { postId: post.id });
      
      // 調用回調
      onShared();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('post', '轉發失敗', error);
      const appError = error instanceof AppError 
        ? error 
        : new AppError('轉發失敗', ErrorType.API);
      errorManager.handle(appError);
      toast.error('轉發失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 執行引用轉發
  const handleQuoteShare = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      logger.info('post', '執行引用轉發', { 
        postId: post.id,
        hasComment: !!data.comment 
      });
      
      // 發送引用轉發請求
      await apiClient.post(`/posts/${post.id}/share/`, {
        comment: data.comment
      });
      
      toast.success('引用轉發成功！');
      logger.info('success', '引用轉發成功', { postId: post.id });
      
      // 重置表單
      reset();
      
      // 調用回調
      onShared();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('post', '引用轉發失敗', error);
      const appError = error instanceof AppError 
        ? error 
        : new AppError('引用轉發失敗', ErrorType.API);
      errorManager.handle(appError);
      toast.error('引用轉發失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 關閉模態時重置狀態
  const handleClose = () => {
    setShareType('quick');
    reset();
    onClose();
  };

  // 如果不顯示，不渲染任何內容
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-lg animate-slide-in-up">
        {/* 頭部 */}
        <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <ShareIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">轉發貼文</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* 轉發類型選擇 */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setShareType('quick')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 ${
                shareType === 'quick'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
              }`}
            >
              <ArrowPathIcon className="h-5 w-5" />
              <span className="font-medium">快速轉發</span>
            </button>
            
            <button
              onClick={() => setShareType('quote')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 ${
                shareType === 'quote'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
              }`}
            >
              <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
              <span className="font-medium">引用轉發</span>
            </button>
          </div>
        </div>
        
        {/* 內容區 */}
        <div className="px-6 py-4">
          {shareType === 'quick' ? (
            // 快速轉發預覽
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                將直接轉發此貼文到你的動態
              </p>
              
              {/* 原貼文預覽 */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-start space-x-3">
                  <img
                    src={post.author_details.avatar || `https://ui-avatars.com/api/?name=${post.author_details.username}`}
                    alt={post.author_details.username}
                    className="h-10 w-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-900">
                        {post.author_details.display_name || post.author_details.username}
                      </span>
                      <span className="text-xs text-slate-500">
                        @{post.author_details.username}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 line-clamp-3">
                      {post.content}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // 引用轉發表單
            <form onSubmit={handleSubmit(handleQuoteShare)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  添加你的評論
                </label>
                <textarea
                  {...register('comment', {
                    maxLength: {
                      value: 280,
                      message: '評論不能超過 280 個字元'
                    }
                  })}
                  rows={3}
                  placeholder="分享你的想法..."
                  className="w-full p-3 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 resize-none text-slate-800 placeholder-slate-500"
                />
                <div className="mt-2 text-xs text-slate-500 text-right">
                  {comment.length}/280 字元
                </div>
              </div>
              
              {/* 原貼文預覽 */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-start space-x-3">
                  <img
                    src={post.author_details.avatar || `https://ui-avatars.com/api/?name=${post.author_details.username}`}
                    alt={post.author_details.username}
                    className="h-8 w-8 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {post.author_details.display_name || post.author_details.username}
                      </span>
                      <span className="text-xs text-slate-500">
                        @{post.author_details.username}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 line-clamp-2">
                      {post.content}
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
        
        {/* 底部操作欄 */}
        <div className="px-6 py-4 border-t border-white/20 bg-gradient-to-r from-slate-50/80 via-white/80 to-slate-50/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            {/* 轉發者信息 */}
            <div className="flex items-center space-x-2">
              <img
                src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.username}`}
                alt={currentUser?.username}
                className="h-8 w-8 rounded-full"
              />
              <div className="text-sm">
                <span className="text-slate-600">轉發為 </span>
                <span className="font-medium text-slate-900">
                  @{currentUser?.username}
                </span>
              </div>
            </div>
            
            {/* 操作按鈕 */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200"
              >
                取消
              </button>
              
              {shareType === 'quick' ? (
                <button
                  onClick={handleQuickShare}
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                    isSubmitting
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>轉發中...</span>
                    </div>
                  ) : (
                    '轉發'
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  form="quote-share-form"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit(handleQuoteShare)();
                  }}
                  className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                    isSubmitting
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>發布中...</span>
                    </div>
                  ) : (
                    '發布'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};