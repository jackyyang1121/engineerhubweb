import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 布局组件
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// 认证页面
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// 应用页面
import HomePage from './pages/home/HomePage';
import ProfilePage from './pages/profile/ProfilePage';
import SearchPage from './pages/search/SearchPage';
import SettingsPage from './pages/settings/SettingsPage';
import PostDetailPage from './pages/posts/PostDetailPage';

// 类型定义
interface ProtectedRouteProps {
  children: React.ReactNode;
}

interface GuestRouteProps {
  children: React.ReactNode;
}

// 保护路由组件
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

// 访客路由组件
const GuestRoute = ({ children }: GuestRouteProps) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// 页面组件占位符
const ExplorePage = () => <div className="p-4">发现页</div>;
const NotificationsPage = () => <div className="p-4">通知页</div>;
const MessagesPage = () => <div className="p-4">消息页</div>;
const ChatPage = () => <div className="p-4">聊天页</div>;
const SavedPostsPage = () => <div className="p-4">已保存的帖子</div>;
const NotFoundPage = () => <div className="p-4">404 页面未找到</div>;

function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);
  
  // 应用加载时检查身份验证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  return (
    <>
      <Routes>
        {/* 身份验证路由 */}
        <Route path="/" element={<AuthLayout />}>
          <Route path="login" element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          } />
          <Route path="register" element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          } />
          <Route path="forgot-password" element={
            <GuestRoute>
              <ForgotPasswordPage />
            </GuestRoute>
          } />
          <Route path="reset-password" element={
            <GuestRoute>
              <ResetPasswordPage />
            </GuestRoute>
          } />
        </Route>
        
        {/* 应用路由 */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          <Route path="explore" element={
            <ProtectedRoute>
              <ExplorePage />
            </ProtectedRoute>
          } />
          <Route path="notifications" element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          } />
          <Route path="profile/:username" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="messages" element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          } />
          <Route path="messages/:conversationId" element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } />
          <Route path="post/:postId" element={
            <ProtectedRoute>
              <PostDetailPage />
            </ProtectedRoute>
          } />
          <Route path="search" element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          <Route path="saved" element={
            <ProtectedRoute>
              <SavedPostsPage />
            </ProtectedRoute>
          } />
        </Route>
        
        {/* 404 页面 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      
      <ToastContainer position="bottom-right" autoClose={3000} />
    </>
  );
}

export default App;
