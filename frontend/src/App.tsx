/**
 * EngineerHub - 主應用程式組件
 * 
 * 職責：
 * - 初始化應用程式
 * - 管理全域狀態
 * - 提供錯誤邊界
 * - 集成路由系統
 * 
 * 設計原則：
 * - Narrowly focused: 只負責應用程式初始化和全域配置
 * - Flexible: 支援依賴注入和配置化
 * - Loosely coupled: 最小化直接依賴，通過模組化實現功能
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastContainer } from 'react-toastify';

// 核心組件
import AppRouter from './router/AppRouter';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingPage from './components/common/LoadingPage';
import { useAuthInitialization, useAuthSync } from './store/auth';

// 樣式
import 'react-toastify/dist/ReactToastify.css';

/**
 * React Query 客戶端配置
 * 
 * 提供全域的資料獲取、快取和同步功能
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 查詢預設配置
      staleTime: 1000 * 60 * 5, // 5 分鐘後數據被視為過期
      gcTime: 1000 * 60 * 30,   // 30 分鐘後從快取中移除
      retry: 3,                  // 失敗時重試 3 次
      refetchOnWindowFocus: false, // 視窗聚焦時不自動重新獲取
    },
    mutations: {
      // 變更預設配置
      retry: 1, // 變更失敗時重試 1 次
    },
  },
});

/**
 * 應用程式初始化組件
 * 
 * 處理應用程式載入狀態和初始化邏輯
 */
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 等待認證狀態初始化完成
  const { isInitialized } = useAuthInitialization();
  
  // 啟用認證狀態同步
  useAuthSync();
  
  // 在初始化完成前顯示載入頁面
  if (!isInitialized) {
    return <LoadingPage message="正在初始化應用程式..." />;
  }
  
  return <>{children}</>;
};

/**
 * 全域通知配置組件
 * 
 * 配置應用程式的通知系統
 */
const NotificationProvider: React.FC = () => (
  <ToastContainer
    position="top-right"
    autoClose={5000}
    hideProgressBar={false}
    newestOnTop={false}
    closeOnClick
    rtl={false}
    pauseOnFocusLoss
    draggable
    pauseOnHover
    theme="light"
    toastClassName="custom-toast"
    bodyClassName="custom-toast-body"
  />
);

/**
 * 主應用程式組件
 * 
 * 應用程式的根組件，負責：
 * - 初始化全域提供者（Router、QueryClient）
 * - 配置錯誤邊界
 * - 管理應用程式載入狀態
 * - 集成路由系統
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // 在生產環境中，這裡可以發送錯誤到監控服務
        console.error('應用程式錯誤:', error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AppInitializer>
          <AppRouter />
          <NotificationProvider />
        </AppInitializer>
        
        {/* React Query 開發工具（僅在開發環境） */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;