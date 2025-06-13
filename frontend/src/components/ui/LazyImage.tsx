/**
 * EngineerHub - 懶載入圖片組件
 * 
 * 職責：
 * - 提供高性能的圖片懶載入功能
 * - 支援載入動畫和錯誤處理
 * - 優化頁面載入性能
 * 
 * 設計原則：
 * - Narrowly focused: 專注於圖片載入優化
 * - Flexible: 支援多種配置和自定義樣式
 * - Loosely coupled: 可獨立使用，不依賴特定業務邏輯
 */

import React, { useState, useCallback } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { useLazyLoad } from '../../hooks/useIntersectionObserver';

/**
 * 懶載入圖片組件屬性
 */
interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'loading'> {
  /** 圖片來源 URL */
  src: string;
  /** 圖片替代文字 */
  alt: string;
  /** 載入中的佔位符組件 */
  placeholder?: React.ReactNode;
  /** 錯誤時的後備組件 */
  fallback?: React.ReactNode;
  /** 是否顯示載入動畫 */
  showLoadingAnimation?: boolean;
  /** 預載入距離（像素） */
  rootMargin?: string;
  /** 載入完成回調 */
  onLoad?: () => void;
  /** 載入錯誤回調 */
  onError?: () => void;
  /** 容器樣式類名 */
  containerClassName?: string;
  /** 圖片樣式類名 */
  imageClassName?: string;
}

/**
 * 載入狀態枚舉
 */
enum LoadingState {
  IDLE = 'idle',      // 閒置（未開始載入）
  LOADING = 'loading', // 載入中
  SUCCESS = 'success', // 載入成功
  ERROR = 'error'      // 載入失敗
}

/**
 * 懶載入圖片組件
 * 
 * 功能：
 * - 當圖片進入視窗時才開始載入
 * - 提供載入狀態和錯誤處理
 * - 支援自定義佔位符和動畫
 * - 優化頁面初始載入性能
 * 
 * @example
 * ```tsx
 * <LazyImage
 *   src="/images/large-photo.jpg"
 *   alt="大型照片"
 *   placeholder={<div className="w-full h-48 bg-gray-200 animate-pulse" />}
 *   fallback={<div className="text-red-500">圖片載入失敗</div>}
 *   onLoad={() => console.log('圖片載入完成')}
 *   rootMargin="100px"
 * />
 * ```
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  fallback,
  showLoadingAnimation = true,
  rootMargin = '50px',
  onLoad,
  onError,
  containerClassName = '',
  imageClassName = '',
  className,
  ...imgProps
}) => {
  // 載入狀態管理
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  
  // 懶載入檢測
  const { ref, shouldLoad } = useLazyLoad({
    rootMargin,
    threshold: 0.1,
    triggerOnce: true,
  });

  // 圖片載入成功處理
  const handleImageLoad = useCallback(() => {
    setLoadingState(LoadingState.SUCCESS);
    onLoad?.();
  }, [onLoad]);

  // 圖片載入錯誤處理
  const handleImageError = useCallback(() => {
    setLoadingState(LoadingState.ERROR);
    onError?.();
  }, [onError]);

  // 開始載入圖片
  const handleStartLoading = useCallback(() => {
    if (loadingState === LoadingState.IDLE) {
      setLoadingState(LoadingState.LOADING);
    }
  }, [loadingState]);

  // 當需要載入時，開始載入圖片
  React.useEffect(() => {
    if (shouldLoad) {
      handleStartLoading();
    }
  }, [shouldLoad, handleStartLoading]);

  // 預設佔位符
  const defaultPlaceholder = (
    <div 
      className={`flex items-center justify-center bg-gray-200 ${showLoadingAnimation ? 'animate-pulse' : ''}`}
      style={{ width: '100%', height: '100%', minHeight: '100px' }}
    >
      <svg 
        className="w-8 h-8 text-gray-400" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
          clipRule="evenodd" 
        />
      </svg>
    </div>
  );

  // 預設錯誤後備組件
  const defaultFallback = (
    <div className="flex items-center justify-center bg-red-50 text-red-500 p-4">
      <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path 
          fillRule="evenodd" 
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
          clipRule="evenodd" 
        />
      </svg>
      <span className="text-sm">圖片載入失敗</span>
    </div>
  );

  return (
    <div 
      ref={ref} 
      className={`relative overflow-hidden ${containerClassName}`}
    >
      {/* 載入狀態：閒置或載入中 */}
      {(loadingState === LoadingState.IDLE || loadingState === LoadingState.LOADING) && (
        <div className="absolute inset-0">
          {placeholder || defaultPlaceholder}
        </div>
      )}

      {/* 載入狀態：載入中且應該載入 */}
      {loadingState === LoadingState.LOADING && shouldLoad && (
        <img
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 opacity-0 ${imageClassName} ${className || ''}`}
          {...imgProps}
        />
      )}

      {/* 載入狀態：成功 */}
      {loadingState === LoadingState.SUCCESS && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 opacity-100 ${imageClassName} ${className || ''}`}
          {...imgProps}
        />
      )}

      {/* 載入狀態：錯誤 */}
      {loadingState === LoadingState.ERROR && (
        <div className="absolute inset-0">
          {fallback || defaultFallback}
        </div>
      )}
    </div>
  );
};

/**
 * 帶進度的懶載入圖片組件
 * 
 * 功能：
 * - 顯示圖片載入進度
 * - 支援載入進度回調
 * - 提供更詳細的載入反饋
 */
interface ProgressiveLazyImageProps extends Omit<LazyImageProps, 'onProgress'> {
  /** 載入進度回調 */
  onProgress?: (progress: number) => void;
  /** 是否顯示進度條 */
  showProgress?: boolean;
}

export const ProgressiveLazyImage: React.FC<ProgressiveLazyImageProps> = ({
  onProgress,
  showProgress = false,
  ...props
}) => {
  const [progress, setProgress] = useState(0);

  // 模擬載入進度（實際應用中可能需要更精確的進度計算）
  React.useEffect(() => {
    if (props.src) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + 10, 90);
          onProgress?.(newProgress);
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [props.src, onProgress]);

  const handleLoad = () => {
    setProgress(100);
    onProgress?.(100);
    props.onLoad?.();
  };

  return (
    <div className="relative">
      <LazyImage
        {...props}
        onLoad={handleLoad}
      />
      
      {/* 進度條 */}
      {showProgress && progress < 100 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
          <div className="w-full bg-gray-300 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white text-xs mt-1 text-center">
            載入中 {progress}%
          </p>
        </div>
      )}
    </div>
  );
};

export default LazyImage; 