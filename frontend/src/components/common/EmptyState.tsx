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
    <div className={`text-center py-12 ${className}`}>
      <div className="flex justify-center mb-4">
        <Icon className="w-16 h-16 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState; 