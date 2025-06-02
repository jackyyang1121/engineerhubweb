import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { GlobalToast } from '../common/Toast';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import Loading from '../common/Loading';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoading: globalLoading } = useUIStore();
  const { checkAuth, isLoading } = useAuthStore();

  // 初始化應用
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 如果應用還在初始化中，顯示載入畫面
  if (isLoading) {
    return (
      <Loading 
        fullScreen={true}
        size="lg"
        text="正在載入 EngineerHub..."
        color="primary"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* 全局載入遮罩 */}
      {globalLoading && (
        <Loading 
          fullScreen={true}
          size="lg"
          color="primary"
        />
      )}

      {/* 頭部導航 */}
      <Header />

      {/* 主要內容區域 */}
      <main className="flex-1">
        {children || <Outlet />}
      </main>

      {/* 全局 Toast 通知 */}
      <GlobalToast />
    </div>
  );
};

// 受保護的佈局（需要登入）
export const ProtectedLayout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const { showToast } = useUIStore();

  useEffect(() => {
    if (!isAuthenticated) {
      showToast('請先登入以訪問此頁面', 'warning');
    }
  }, [isAuthenticated, showToast]);

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              需要登入
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              您需要登入才能訪問此頁面
            </p>
            <a
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              前往登入
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
};

// 公開佈局（不需要登入）
export const PublicLayout: React.FC<LayoutProps> = ({ children }) => {
  return <Layout>{children}</Layout>;
};

// 認證佈局（用於登入/註冊頁面）
export const AuthLayout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  // 如果已經登入，重定向到首頁
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/';
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <GlobalToast />
      {children}
    </div>
  );
};

// 錯誤邊界佈局
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundaryLayout extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('錯誤邊界捕獲錯誤:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              應用程式發生錯誤
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              很抱歉，應用程式遇到了意外錯誤。請重新整理頁面或聯繫技術支援。
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                重新整理頁面
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-md transition-colors"
              >
                重試
              </button>
            </div>
            {typeof window !== 'undefined' && window.location.hostname === 'localhost' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  錯誤詳情 (開發模式)
                </summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default Layout; 