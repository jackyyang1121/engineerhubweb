/**
 * 空狀態組件
 * 
 * 功能：
 * 1. 顯示空狀態提示
 * 2. 支援自定義圖標和文字
 * 3. 可添加操作按鈕
 */

import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = ExclamationTriangleIcon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`text-center py-16 px-6 ${className}`}>
      <div className="mx-auto max-w-md">
        {/* 圖標 */}
        <div className="mx-auto w-24 h-24 mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-full animate-pulse"></div>
          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-full shadow-lg">
            <Icon className="h-12 w-12 text-slate-400" />
          </div>
        </div>
        
        {/* 標題 */}
        <h3 className="text-xl font-semibold text-slate-900 mb-3">
          {title}
        </h3>
        
        {/* 描述 */}
        {description && (
          <p className="text-slate-600 mb-8 leading-relaxed">
            {description}
          </p>
        )}
        
        {/* 操作按鈕 */}
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState; 