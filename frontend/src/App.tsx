// 導入 React 的 useEffect 鉤子，用於在組件渲染後執行副作用（例如檢查認證狀態）
import { useEffect } from 'react';
// 從 react-router-dom 導入路由相關組件：
// - Routes：用於定義應用程式的路由結構。
// - Route：用於定義單一路由，指定路徑和對應的元件。
// - Navigate：用於重定向到指定路徑。
// - useLocation：用於獲取當前路由位置（網址），常用於重定向時保存來源路徑。
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
// 導入自定義的身份驗證狀態管理鉤子 useAuthStore，用於存取和管理用戶認證狀態（例如是否已登入）。
// useAuthStore 是一個 Zustand（狀態管理庫） 的 Hook，用來管理跟認證（Auth）相關的全域狀態。
// 可以把它當作一個「資料倉庫」來管理登入、登出、使用者資料、token 之類的東西。
import { useAuthStore } from './store/authStore';
// 導入 ToastContainer 組件，用於顯示通知訊息（如成功、錯誤提示），提升用戶體驗。
import { ToastContainer } from 'react-toastify';
// 導入 ToastContainer 的預設樣式檔案，確保通知訊息有適當的視覺效果。
import 'react-toastify/dist/ReactToastify.css';


// **布局組件**
// 導入 MainLayout 組件，作為應用程式主要頁面的整體布局（如包含導航欄、側邊欄等）。
import MainLayout from './components/layouts/MainLayout';
// 導入 AuthLayout 組件，作為身份驗證相關頁面的布局（如登錄、註冊頁面）。
import AuthLayout from './components/layouts/AuthLayout';


// **身份驗證頁面**
// 導入 LoginPage 組件，定義用戶登錄頁面。
import LoginPage from './pages/auth/LoginPage';
// 導入 RegisterPage 組件，定義用戶註冊頁面。
import RegisterPage from './pages/auth/RegisterPage';
// 導入 ForgotPasswordPage 組件，定義忘記密碼頁面。
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
// 導入 ResetPasswordPage 組件，定義重置密碼頁面。
import ResetPasswordPage from './pages/auth/ResetPasswordPage';


// **應用頁面**
// 導入 HomePage 組件，定義應用程式的首頁。
import HomePage from './pages/home/HomePage';
// 導入 ProfilePage 組件，定義用戶個人資料頁面。
import ProfilePage from './pages/profile/ProfilePage';
// 導入 SearchPage 組件，定義搜索功能頁面。
import SearchPage from './pages/search/SearchPage';
// 導入 SettingsPage 組件，定義用戶設置頁面。
import SettingsPage from './pages/settings/SettingsPage';
// 導入 PostDetailPage 組件，定義單一貼文的詳細資訊頁面。
import PostDetailPage from './pages/posts/PostDetailPage';
// 導入 NotificationsPage 組件，定義通知頁面。
import NotificationsPage from './pages/notifications/NotificationsPage';
// 導入 MessagesPage 組件，定義訊息總覽頁面。
import MessagesPage from './pages/MessagesPage';
// 導入 ChatPage 組件，定義單一聊天對話頁面。
import ChatPage from './pages/chat/ChatPage';
// 導入 SavedPostsPage 組件，定義用戶保存的貼文頁面。
import SavedPostsPage from './pages/saved/SavedPostsPage';


// **類型定義**

// 定義 ProtectedRouteProps 介面，指定保護路由組件的屬性類型，children 為 React 節點。
interface ProtectedRouteProps {
  children: React.ReactNode;     
  // type ReactNode = ReactChild | ReactFragment | ReactPortal | boolean | null | undefined;
  // React.ReactNode 是一個 型別（type），用來描述 可以放到 JSX 裡面呈現的所有東西
  // 目的是告訴編譯器：
  // 📝「這裡可以放入任何 React 可以接受的內容！」
}

// 定義 GuestRouteProps 介面，指定訪客路由組件的屬性類型，children 為 React 節點。
interface GuestRouteProps {
  children: React.ReactNode;
}


// **保護路由組件**

// 定義 ProtectedRoute 組件，用於保護需要認證的路由，只有已認證用戶才能訪問。
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // 從 useAuthStore 中獲取 isAuthenticated 狀態，判斷用戶是否已認證。
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  // 使用 useLocation 鉤子獲取當前路由位置，用於重定向時保存來源路徑（例如登入後跳回原頁面）。
  const location = useLocation();
  
  // 如果用戶未認證，重定向到登錄頁面，並將當前位置傳遞給 state（用於登入後跳回），replace 表示替換當前歷史記錄。
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // 如果用戶已認證，渲染子組件（即被保護的頁面內容）。
  return <>{children}</>;
};


// **訪客路由組件**

// 定義 GuestRoute 組件，用於限制僅未認證用戶訪問的路由（例如登錄頁面）。
const GuestRoute = ({ children }: GuestRouteProps) => {
  // 從 useAuthStore 中獲取 isAuthenticated 狀態，判斷用戶是否已認證。
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  
  // 如果用戶已認證，重定向到首頁，replace 表示替換當前歷史記錄。
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  // 如果用戶未認證，渲染子組件（即訪客可訪問的頁面內容）。
  return <>{children}</>;
};

// 導入 ExplorePage 組件，定義探索頁面（例如發現新內容的頁面）。
import ExplorePage from './pages/explore/ExplorePage';


// **404 頁面**

// 定義 NotFoundPage 組件，當用戶訪問不存在的路由時顯示 404 頁面。
const NotFoundPage = () => (
  // 外層 div 設置最小高度為螢幕高度，使用灰色背景並置中內容。
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    {/* 內層 div 設置文字置中 */}
    <div className="text-center">
      {/* 顯示 "404" 大標題，文字大小為 6xl，顏色為灰黑色 */}
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      {/* 顯示 "頁面未找到" 的提示文字，大小為 xl，顏色為灰色 */}
      <p className="text-xl text-gray-600 mb-8">頁面未找到</p>
      {/* 提供返回首頁的鏈接，按鈕樣式為藍色，懸停時變深 */}
      <a 
        href="/" 
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        返回首頁
      </a>
    </div>
  </div>
);


// **主應用組件**

// 定義 App 組件，作為應用程式的根組件，管理路由和全局狀態。
function App() {
  // 從 useAuthStore 中獲取 checkAuth 函數，用於檢查用戶的認證狀態（例如是否已登入）。
  const checkAuth = useAuthStore(state => state.checkAuth);
  // useAuthStore 是一個 hook，呼叫時可以傳一個函式（selector）。
  // state 就是整個 store 的狀態（物件）。
  // state => state.checkAuth 表示「我要拿到 store 裡面的 checkAuth 函式」。
  
  // 使用 useEffect 鉤子，在組件掛載時執行 checkAuth 檢查認證狀態，依賴項為 checkAuth。
  // 功能：確保應用啟動時自動檢查用戶是否已登入。
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
//   語法解析
// ✅ useEffect 是 React 的 副作用（Side Effect）Hook
// 用來在元件「渲染後」執行某些程式碼，例如：
// 資料取得（API 請求）
// 設置訂閱、監聽
// 操作 DOM
// 清理（返回一個清理函式）

// ✅ () => { checkAuth(); }
// 這裡是一個 callback function，會在特定時機被呼叫。
// 它的內容就是執行 checkAuth() 這個函式。

// ✅ [checkAuth]（依賴陣列）
// 告訴 React：只有在 checkAuth 函式改變時（例如由父層重新建立）才要重新執行 useEffect。
// 如果沒有寫依賴陣列，useEffect 每次渲染都會執行。
// 如果寫成空陣列（[]），就只在「第一次 render」執行一次（相當於 componentDidMount）。
// 寫 [checkAuth]，就是：
// 第一次渲染時執行一次
// 之後只要 checkAuth 這個函式有變化（通常不太會），就重新執行一次


  
  // 返回應用程式的 JSX 結構。
  return (
    <>
    {/* <>...</> 是 React Fragment，讓我可以在不多產生一個額外 DOM 元素的情況下，return 多個同級元素。 語法需要*/}
    {/* 因為我 vite.config.js 裡面用了 @vitejs/plugin-react，所以我在寫 JSX 的時候可以不用再手動 import React from 'react'。 */}
      {/* 使用 Routes 組件定義應用程式的路由結構 */}
      <Routes>
        {/* 定義身份驗證相關路由，使用 AuthLayout 作為外層布局 */}
        <Route path="/" element={<AuthLayout />}>
          {/* AuthLayout功能是 */}
          {/* 定義登錄頁面路由，使用 GuestRoute 確保只有未認證用戶可訪問 */}
          <Route path="login" element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          } />
          {/* 定義註冊頁面路由，使用 GuestRoute 確保只有未認證用戶可訪問 */}
          <Route path="register" element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          } />
          {/* 定義忘記密碼頁面路由，使用 GuestRoute 確保只有未認證用戶可訪問 */}
          <Route path="forgot-password" element={
            <GuestRoute>
              <ForgotPasswordPage />
            </GuestRoute>
          } />
          {/* 定義重置密碼頁面路由，使用 GuestRoute 確保只有未認證用戶可訪問 */}
          <Route path="reset-password" element={
            <GuestRoute>
              <ResetPasswordPage />
            </GuestRoute>
          } />
        </Route>
        
        {/* 定義應用程式主要路由，使用 MainLayout 作為外層布局 */}
        <Route path="/" element={<MainLayout />}>
          {/* 定義首頁路由（根路徑），使用 ProtectedRoute 確保只有已認證用戶可訪問 */}
          <Route index element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          {/* 定義探索頁面路由，使用 ProtectedRoute 確保只有已認證用戶可訪問 */}
          <Route path="explore" element={
            <ProtectedRoute>
              <ExplorePage />
            </ProtectedRoute>
          } />
          {/* 定義通知頁面路由，使用 ProtectedRoute 確保只有已認證用戶可訪問 */}
          <Route path="notifications" element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          } />
          {/* 定義個人資料頁面路由（動態路徑 :username），使用 ProtectedRoute 確保只有已認證用戶可訪問 */}
          <Route path="profile/:username" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          {/* 定義訊息總覽頁面路由，使用 ProtectedRoute 確保只有已認證用戶可訪問 */}
          <Route path="messages" element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          } />
          {/* 定義單一聊天頁面路由（動態路徑 :conversationId），使用 ProtectedRoute 確保只有已認證用戶可訪問 */}
          <Route path="messages/:conversationId" element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } />
          {/* 定義貼文詳情頁面路由（動態路徑 :postId），使用 ProtectedRoute 確保只有已認證用戶可訪問 */}
          <Route path="post/:postId" element={
            <ProtectedRoute>
              <PostDetailPage />
            </ProtectedRoute>
          } />
          {/* 定義搜索頁面路由，使用 ProtectedRoute 確保只有已認證用戶可訪問 */}
          <Route path="search" element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          } />
          {/* 定義設置頁面路由，使用 ProtectedRoute 確保只有已認證用戶可訪問 */}
          <Route path="settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          {/* 定義保存的貼文頁面路由，使用 ProtectedRoute 確保只有已認證用戶可訪問 */}
          <Route path="saved" element={
            <ProtectedRoute>
              <SavedPostsPage />
            </ProtectedRoute>
          } />
        </Route>
        
        {/* 定義 404 頁面路由，匹配所有未定義的路徑，顯示 NotFoundPage */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      
      {/* 配置 ToastContainer 組件，用於顯示全局通知訊息 */}
      <ToastContainer 
        position="bottom-right" // 通知顯示在右下角
        autoClose={3000} // 通知自動關閉時間為 3 秒
        hideProgressBar={false} // 顯示進度條
        newestOnTop={false} // 新通知不置頂
        closeOnClick // 點擊通知可關閉
        rtl={false} // 文字方向從左到右（非右到左）
        pauseOnFocusLoss // 失去焦點時暫停通知
        draggable // 允許拖動通知
        pauseOnHover // 鼠標懸停時暫停通知
        theme="colored" // 使用彩色主題
      />
    </>
  );
}

// 導出 App 組件作為應用程式的預設導出，使其可在其他地方（如入口文件）導入並渲染。
export default App;