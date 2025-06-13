/**
 * EngineerHub - 載入頁面組件
 * 
 * 職責：
 * - 顯示應用程式載入狀態
 * - 提供美觀的載入動畫
 * - 支援自定義載入訊息
 * 
 * 設計原則：
 * - Narrowly focused: 只負責載入狀態展示
 * - Flexible: 支援不同的載入樣式和訊息
 * - Loosely coupled: 無外部依賴，純展示組件
 */

import React from 'react';

/**
 * 載入頁面組件屬性介面
 */
interface LoadingPageProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  showMessage?: boolean;
}

/**
 * 載入動畫組件
 */
const LoadingSpinner: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}>
    </div>
  );
};

/**
 * 脈動動畫組件
 */
const PulsingDots: React.FC = () => (
  <div className="flex space-x-1">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"
        style={{
          animationDelay: `${i * 0.15}s`,
          animationDuration: '1s'
        }}
      />
    ))}
  </div>
);

/**
 * 載入頁面組件
 * 
 * 功能：
 * - 全屏或局部載入狀態
 * - 精美的載入動畫
 * - 自定義載入訊息
 * - 響應式設計
 * 
 * @param message - 自定義載入訊息
 * @param size - 載入動畫大小
 * @param fullScreen - 是否全屏顯示
 * @param showMessage - 是否顯示載入訊息
 */
const LoadingPage: React.FC<LoadingPageProps> = ({
  message = '正在載入...',
  size = 'lg',
  fullScreen = true,
  showMessage = true
}) => {
  const containerClasses = fullScreen
    ? 'min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8">
        <div className="flex flex-col items-center space-y-6">
          {/* 主要載入動畫 */}
          <div className="relative">
            <LoadingSpinner size={size} />
            
            {/* 外圈動畫效果 */}
            <div className="absolute inset-0 border-2 border-blue-200 rounded-full animate-ping opacity-20"></div>
          </div>

          {/* 載入訊息 */}
          {showMessage && (
            <div className="text-center">
              <p className="text-white font-medium text-lg mb-2">
                {message}
              </p>
              
              {/* 脈動點動畫 */}
              <PulsingDots />
            </div>
          )}

          {/* 進度指示器（可選） */}
          <div className="w-48 bg-white/10 rounded-full h-1 overflow-hidden">
            <div className="h-full bg-white/40 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 簡單載入組件
 * 用於局部載入狀態
 */
export const SimpleLoading: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}> = ({ size = 'md', message }) => (
  <div className="flex items-center justify-center space-x-3 p-4">
    <LoadingSpinner size={size} />
    {message && (
      <span className="text-gray-600 text-sm font-medium">
        {message}
      </span>
    )}
  </div>
);

/**
 * 按鈕載入狀態組件
 * 用於按鈕內的載入狀態
 */
export const ButtonLoading: React.FC<{
  message?: string;
}> = ({ message = '處理中...' }) => (
  <div className="flex items-center space-x-2">
    <LoadingSpinner size="sm" />
    <span>{message}</span>
  </div>
);

export default LoadingPage; 