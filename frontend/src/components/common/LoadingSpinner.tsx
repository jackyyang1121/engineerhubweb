/**
 * 載入動畫組件
 * 
 * 功能：
 * 1. 顯示載入狀態的動畫
 * 2. 支援不同大小和顏色
 * 3. 可添加載入文字提示
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'gray' | 'white' | 'green' | 'red';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'blue',
  text,
  className = '' 
}) => {
  // 尺寸對應的CSS類
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  // 顏色對應的CSS類
  const colorClasses = {
    blue: 'text-blue-500',
    gray: 'text-slate-400',
    white: 'text-white',
    green: 'text-green-500',
    red: 'text-red-500'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        {/* 外圈動畫 */}
        <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}>
          <svg 
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        
        {/* 發光效果 */}
        <div className={`absolute inset-0 ${sizeClasses[size]} ${colorClasses[color]} animate-ping opacity-20`}>
          <div className="w-full h-full bg-current rounded-full"></div>
        </div>
      </div>
      
      {text && (
        <div className="mt-4 text-center">
          <p className={`text-sm font-medium ${colorClasses[color]} animate-pulse`}>
            {text}
          </p>
          <div className="flex justify-center mt-2 space-x-1">
            <div className={`w-1 h-1 ${colorClasses[color]} bg-current rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`w-1 h-1 ${colorClasses[color]} bg-current rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`w-1 h-1 ${colorClasses[color]} bg-current rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner; 