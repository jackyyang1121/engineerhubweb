/**
 * EngineerHub - 錯誤邊界組件
 * 
 * 職責：
 * - 捕獲 React 組件錯誤
 * - 提供錯誤回饋介面
 * - 記錄錯誤資訊用於調試
 * - 提供錯誤恢復機制
 * 
 * 設計原則：
 * - Narrowly focused: 只負責錯誤捕獲和處理
 * - Flexible: 支援自定義錯誤介面和回調
 * - Loosely coupled: 最小化對外部依賴
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * 錯誤資訊介面
 */
interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
}

/**
 * 錯誤邊界組件屬性介面
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  retryText?: string;
}

/**
 * 錯誤邊界組件狀態介面
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorDetails: ErrorDetails | null;
}

/**
 * 預設錯誤回饋組件
 */
const DefaultErrorFallback: React.FC<{ 
  error: Error; 
  retry: () => void;
  enableRetry: boolean;
  retryText: string;
}> = ({ error, retry, enableRetry, retryText }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
      {/* 錯誤圖示 */}
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <svg 
          className="h-6 w-6 text-red-600" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
      </div>

      {/* 錯誤標題 */}
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        哎呀，出現錯誤了！
      </h2>

      {/* 錯誤描述 */}
      <p className="text-gray-600 mb-6">
        應用程式遇到了一個未預期的錯誤。我們已經記錄了這個問題，稍後會進行修復。
      </p>

      {/* 錯誤詳情（開發環境） */}
      {process.env.NODE_ENV === 'development' && (
        <details className="text-left bg-gray-100 rounded p-3 mb-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
            錯誤詳情（開發模式）
          </summary>
          <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-x-auto">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}

      {/* 操作按鈕 */}
      <div className="flex space-x-3 justify-center">
        {enableRetry && (
          <button
            onClick={retry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {retryText}
          </button>
        )}
        
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          返回首頁
        </button>
      </div>
    </div>
  </div>
);

/**
 * 錯誤邊界組件
 * 
 * React 類別組件，用於捕獲子組件樹中的 JavaScript 錯誤，
 * 記錄錯誤並顯示備用 UI 而非崩潰的組件樹
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null
    };
  }

  /**
   * 錯誤捕獲生命週期方法
   * 當子組件拋出錯誤時調用
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新 state 以顯示錯誤 UI
    return {
      hasError: true,
      error
    };
  }

  /**
   * 錯誤處理生命週期方法
   * 用於記錄錯誤資訊和執行錯誤回調
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 記錄錯誤詳情
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.setState({
      errorInfo,
      errorDetails
    });

    // 執行自定義錯誤處理
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 在開發環境中輸出錯誤資訊
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 React Error Boundary');
      console.error('錯誤:', error);
      console.error('錯誤資訊:', errorInfo);
      console.error('錯誤詳情:', errorDetails);
      console.groupEnd();
    }

    // 在生產環境中可以發送錯誤到監控服務
    if (process.env.NODE_ENV === 'production') {
      // 這裡可以整合錯誤監控服務，如 Sentry
      // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  /**
   * 重試方法
   * 重置錯誤狀態，嘗試重新渲染組件
   */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // 如果提供了自定義錯誤組件，使用它
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} retry={this.handleRetry} />;
      }

      // 使用預設錯誤組件
      return (
        <DefaultErrorFallback
          error={this.state.error}
          retry={this.handleRetry}
          enableRetry={this.props.enableRetry ?? true}
          retryText={this.props.retryText ?? '重試'}
        />
      );
    }

    // 沒有錯誤時，正常渲染子組件
    return this.props.children;
  }
}

export default ErrorBoundary; 