/**
 * EngineerHub - 404 錯誤頁面組件
 * 
 * 職責：
 * - 顯示 404 錯誤狀態
 * - 提供導航建議
 * - 美觀的錯誤體驗
 * 
 * 設計原則：
 * - Narrowly focused: 只負責 404 錯誤展示
 * - Flexible: 支援自定義錯誤訊息和導航
 * - Loosely coupled: 最小化外部依賴
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 404 錯誤頁面組件屬性介面
 */
interface NotFoundPageProps {
  title?: string;
  message?: string;
  showSearchSuggestion?: boolean;
}

/**
 * 404 錯誤頁面組件
 * 
 * 功能：
 * - 友好的 404 錯誤展示
 * - 導航建議和快捷操作
 * - 搜尋建議
 * - 響應式設計
 * 
 * @param title - 自定義標題
 * @param message - 自定義錯誤訊息
 * @param showSearchSuggestion - 是否顯示搜尋建議
 */
const NotFoundPage: React.FC<NotFoundPageProps> = ({
  title = '頁面未找到',
  message = '抱歉，您訪問的頁面不存在或已被移除。',
  showSearchSuggestion = true
}) => {
  const navigate = useNavigate();

  /**
   * 返回上一頁
   */
  const handleGoBack = (): void => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  /**
   * 導航到首頁
   */
  const handleGoHome = (): void => {
    navigate('/');
  };

  /**
   * 導航到搜尋頁面
   */
  const handleGoToSearch = (): void => {
    navigate('/search');
  };

  /**
   * 導航到探索頁面
   */
  const handleGoToExplore = (): void => {
    navigate('/explore');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 動畫圖示 */}
        <div className="mb-8">
          <div className="relative mx-auto w-32 h-32">
            {/* 主要 404 數字 */}
            <div className="text-6xl font-bold text-gray-300 select-none">
              404
            </div>
            
            {/* 動畫效果 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin opacity-20"></div>
            </div>
          </div>
        </div>

        {/* 錯誤標題 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {title}
        </h1>

        {/* 錯誤描述 */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          {message}
        </p>

        {/* 建議操作區域 */}
        <div className="space-y-6">
          {/* 主要操作按鈕 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGoBack}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              返回上頁
            </button>
            
            <button
              onClick={handleGoHome}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              回到首頁
            </button>
          </div>

          {/* 搜尋建議 */}
          {showSearchSuggestion && (
            <div className="border-t pt-6">
              <p className="text-sm text-gray-500 mb-4">
                或者嘗試以下操作：
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={handleGoToSearch}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                >
                  🔍 搜尋內容
                </button>
                
                <button
                  onClick={handleGoToExplore}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                >
                  🌟 探索推薦
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 幫助連結 */}
        <div className="mt-12 pt-6 border-t">
          <p className="text-xs text-gray-400">
            如果您認為這是一個錯誤，請
            <a 
              href="mailto:support@engineerhub.com" 
              className="text-blue-600 hover:underline mx-1"
            >
              聯繫我們
            </a>
            或回報問題。
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 