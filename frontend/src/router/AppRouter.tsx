/**
 * EngineerHub - 應用程式路由配置
 * 
 * 職責：
 * - 定義應用程式的路由結構
 * - 管理路由保護邏輯
 * - 提供路由相關的配置
 * 
 * 設計原則：
 * - Narrowly focused: 只負責路由配置和導航
 * - Flexible: 支援動態路由配置
 * - Loosely coupled: 最小化對其他模組的依賴
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';

// 布局組件
import MainLayout from '../components/layouts/MainLayout';
import AuthLayout from '../components/layouts/AuthLayout';

// 路由守衛
import ProtectedRoute from '../components/guards/ProtectedRoute';
import GuestRoute from '../components/guards/GuestRoute';

// 頁面組件 - 使用懶載入優化性能
import LoadingPage from '../components/common/LoadingPage';

// 認證相關頁面
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('../pages/auth/ResetPasswordPage'));

// 應用程式頁面
const HomePage = React.lazy(() => import('../pages/home/HomePage'));
const ProfilePage = React.lazy(() => import('../pages/profile/ProfilePage'));
const SearchPage = React.lazy(() => import('../pages/search/SearchPage'));
const SettingsPage = React.lazy(() => import('../pages/settings/SettingsPage'));
const PostDetailPage = React.lazy(() => import('../pages/posts/PostDetailPage'));
const NotificationsPage = React.lazy(() => import('../pages/notifications/NotificationsPage'));
const MessagesPage = React.lazy(() => import('../pages/MessagesPage'));
const ChatPage = React.lazy(() => import('../pages/chat/ChatPage'));
const SavedPostsPage = React.lazy(() => import('../pages/saved/SavedPostsPage'));
const ExplorePage = React.lazy(() => import('../pages/explore/ExplorePage'));

// 404 頁面
const NotFoundPage = React.lazy(() => import('../pages/error/NotFoundPage'));

/**
 * 路由配置類型定義
 */
interface RouteConfig {
  path: string;
  component: React.ComponentType;
  protected?: boolean;
  guestOnly?: boolean;
  layout?: 'main' | 'auth' | 'none';
}

/**
 * 應用程式路由定義
 * 
 * 結構化配置所有路由，支援：
 * - 保護路由（需要認證）
 * - 訪客路由（僅未認證用戶）
 * - 不同的布局配置
 */
const routeConfigs: RouteConfig[] = [
  // 認證相關路由（訪客專用）
  {
    path: '/login',
    component: LoginPage,
    guestOnly: true,
    layout: 'auth'
  },
  {
    path: '/register',
    component: RegisterPage,
    guestOnly: true,
    layout: 'auth'
  },
  {
    path: '/forgot-password',
    component: ForgotPasswordPage,
    guestOnly: true,
    layout: 'auth'
  },
  {
    path: '/reset-password',
    component: ResetPasswordPage,
    guestOnly: true,
    layout: 'auth'
  },

  // 主要應用程式路由（需要認證）
  {
    path: '/',
    component: HomePage,
    protected: true,
    layout: 'main'
  },
  {
    path: '/profile/:username',
    component: ProfilePage,
    protected: true,
    layout: 'main'
  },
  {
    path: '/search',
    component: SearchPage,
    protected: true,
    layout: 'main'
  },
  {
    path: '/settings',
    component: SettingsPage,
    protected: true,
    layout: 'main'
  },
  {
    path: '/post/:id',
    component: PostDetailPage,
    protected: true,
    layout: 'main'
  },
  {
    path: '/notifications',
    component: NotificationsPage,
    protected: true,
    layout: 'main'
  },
  {
    path: '/messages',
    component: MessagesPage,
    protected: true,
    layout: 'main'
  },
  {
    path: '/chat/:conversationId',
    component: ChatPage,
    protected: true,
    layout: 'main'
  },
  {
    path: '/saved',
    component: SavedPostsPage,
    protected: true,
    layout: 'main'
  },
  {
    path: '/explore',
    component: ExplorePage,
    protected: true,
    layout: 'main'
  }
];

/**
 * 路由包裝器元件
 * 
 * 根據路由配置自動應用：
 * - 適當的布局
 * - 路由保護
 * - 錯誤邊界
 */
const RouteWrapper: React.FC<{
  config: RouteConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  // 應用路由保護
  let protectedContent = children;

  if (config.protected) {
    protectedContent = (
      <ProtectedRoute>
        {children}
      </ProtectedRoute>
    );
  } else if (config.guestOnly) {
    protectedContent = (
      <GuestRoute>
        {children}
      </GuestRoute>
    );
  }

  // 應用布局
  switch (config.layout) {
    case 'main':
      return <MainLayout>{protectedContent}</MainLayout>;
    case 'auth':
      return <AuthLayout>{protectedContent}</AuthLayout>;
    case 'none':
    default:
      return <>{protectedContent}</>;
  }
};

/**
 * 應用程式路由元件
 * 
 * 統一管理所有路由配置，提供：
 * - 路由定義
 * - 懶載入支援
 * - 載入狀態處理
 * - 404 頁面處理
 */
const AppRouter: React.FC = () => {
  return (
    <React.Suspense fallback={<LoadingPage />}>
      <Routes>
        {/* 動態生成路由 */}
        {routeConfigs.map((config) => (
          <Route
            key={config.path}
            path={config.path}
            element={
              <RouteWrapper config={config}>
                <config.component />
              </RouteWrapper>
            }
          />
        ))}

        {/* 404 頁面 - 捕獲所有未匹配的路由 */}
        <Route
          path="*"
          element={
            <React.Suspense fallback={<LoadingPage />}>
              <NotFoundPage />
            </React.Suspense>
          }
        />
      </Routes>
    </React.Suspense>
  );
};

export default AppRouter; 