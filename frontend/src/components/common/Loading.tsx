import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  color = 'primary',
  text,
  fullScreen = false,
  overlay = false
}) => {
  // 大小配置
  const sizeConfig = {
    sm: {
      spinner: 'h-4 w-4',
      text: 'text-sm'
    },
    md: {
      spinner: 'h-6 w-6',
      text: 'text-base'
    },
    lg: {
      spinner: 'h-8 w-8',
      text: 'text-lg'
    },
    xl: {
      spinner: 'h-12 w-12',
      text: 'text-xl'
    }
  };

  // 顏色配置
  const colorConfig = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    white: 'text-white'
  };

  // Spinner 組件
  const Spinner = () => (
    <svg
      className={`animate-spin ${sizeConfig[size].spinner} ${colorConfig[color]}`}
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
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        fill="currentColor"
      />
    </svg>
  );

  // 內容組件
  const Content = () => (
    <div className="flex flex-col items-center space-y-2">
      <Spinner />
      {text && (
        <p className={`${sizeConfig[size].text} ${colorConfig[color]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  // 全屏載入
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
        <Content />
      </div>
    );
  }

  // 覆蓋層載入
  if (overlay) {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <Content />
      </div>
    );
  }

  // 內聯載入
  return <Content />;
};

// 骨架屏組件
interface SkeletonProps {
  className?: string;
  lines?: number;
  avatar?: boolean;
  button?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  lines = 3,
  avatar = false,
  button = false
}) => {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {avatar && (
        <div className="flex items-center space-x-3">
          <div className="rounded-full bg-gray-300 dark:bg-gray-700 h-10 w-10"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`h-3 bg-gray-300 dark:bg-gray-700 rounded ${
              index === lines - 1 ? 'w-3/4' : 'w-full'
            }`}
          />
        ))}
      </div>
      
      {button && (
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
      )}
    </div>
  );
};

// 頁面載入骨架
export const PageSkeleton: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* 頭部骨架 */}
      <Skeleton avatar={true} lines={2} />
      
      {/* 內容骨架 */}
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <Skeleton avatar={true} lines={4} button={true} />
        </div>
      ))}
    </div>
  );
};

// 貼文骨架
export const PostSkeleton: React.FC = () => {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      {/* 用戶信息骨架 */}
      <div className="flex items-center space-x-3">
        <div className="rounded-full bg-gray-300 dark:bg-gray-700 h-10 w-10"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
        </div>
      </div>
      
      {/* 內容骨架 */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
      </div>
      
      {/* 媒體骨架 */}
      <div className="h-48 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
      
      {/* 操作按鈕骨架 */}
      <div className="flex items-center space-x-4">
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
      </div>
    </div>
  );
};

export default Loading; 