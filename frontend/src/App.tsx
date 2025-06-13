// 導入 React 的 useEffect 鉤子，用於在組件渲染後執行副作用（例如檢查認證狀態）

// 從 react-router-dom 導入路由相關組件：
// - Routes：用於定義應用程式的路由結構。
// - Route：用於定義單一路由，指定路徑和對應的元件。
// - Navigate：用於重定向到指定路徑。
// - useLocation：用於獲取當前路由位置（網址），常用於重定向時保存來源路徑。
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// 導入自定義的身份驗證狀態管理鉤子 useAuthStore，用於存取和管理用戶認證狀態（例如是否已登入）。
// useAuthStore 是一個 Zustand（狀態管理庫） 的 Hook，用來管理跟認證（Auth）相關的全域狀態。
// 可以把它當作一個「資料倉庫」來管理登入、登出、使用者資料、token 之類的東西。
import { useAuthStore, useAuthInitialized } from './store/authStore';
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
// 導入 ExplorePage 組件，定義探索頁面（例如發現新內容的頁面）。
import ExplorePage from './pages/explore/ExplorePage';


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
  // 這邊的state只是自定義變數，可以亂取，重點是拿後面的state.isAuthenticated，看isAuthenticated是否為true
  
  // 使用 useLocation 鉤子獲取當前路由位置，用於重定向時保存來源路徑（例如登入後跳回原頁面）。
  const location = useLocation();
  
  // 如果用戶未認證，重定向到登錄頁面，並將當前位置傳遞給 state（用於登入後跳回），replace 表示替換當前歷史記錄。
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
    //state 是 react-router-dom（React Router）裡 <Navigate> 元件的 一個 prop，並不是 TypeScript 內建的，也不是 JavaScript 內建的。
    //這裡的 state={{ from: location }} 是把目前頁面的 location（也就是目前 URL 狀態）包起來，傳給 /login 頁面，方便 /login 頁面知道用戶從哪裡來。
    //location 是 react-router-dom 提供的一個hook，用於獲取當前路由位置。
    //from是自定義變數，location是react-router-dom提供的一個hook，用於獲取當前路由位置。
  }
  
  // 如果用戶已認證，渲染子組件（即被保護的頁面內容）。
  return <>{children}</>;
  /*
  { children } 是什麼？
  👉 { children } 是 React 的一個很重要的概念，代表 元件內部包裹的 JSX 內容。
  👉 例如：
  <ProtectedRoute>
    <HomePage />
  </ProtectedRoute>
  這裡的 <HomePage /> 就是 children。

  為什麼可以直接用 {children}？
  在 TypeScript（或 JavaScript）裡，當你寫 ({ children })，就是用「解構賦值」從 props 中取出 children。
  JSX 元件的 props 預設就有 children 這個屬性，代表元件包裹的東西。
   
  */
};
/*
hook 是什麼？
👉 Hook 就是「一個能讓你在函式元件中使用 React 功能的工具」。

舉個超簡單的比喻：
🧩 可以把 Hook 想像成 React 給你的一些「便利工具」，讓你在函式元件裡做到以前只能在 class 元件裡做的事（像是：管理狀態、處理副作用、取得 router 資訊…等等）。

hook 有哪些？
最常用的有：
✅ useState → 管理「狀態」，像是表單資料、計數器值。
✅ useEffect → 處理「副作用」，像是向 API 發送請求或監聽事件。
✅ useContext → 讀取全域 context（跨元件共享資料）。
✅ useLocation（react-router 提供）→ 取得目前路由的資料。
✅ useNavigate（react-router 提供）→ 幫你導向到別的頁面。

hook 的白話定義
📝 hook 是一個以 use 開頭的函式，幫助你在函式元件裡做一些「React 特有的事」。
*/


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
  // 使用專用hook等待認證狀態初始化完成
  const isAuthInitialized = useAuthInitialized();
  
  // 在初始化完成前顯示載入狀態
  if (!isAuthInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="text-white font-medium">正在初始化應用...</span>
          </div>
        </div>
      </div>
    );
  }
  
  // 返回應用程式的 JSX 結構。
  return (
    <>
    {/* <>...</> 是 React Fragment，讓我可以在不多產生一個額外 DOM 元素的情況下，return 多個同級元素。 語法需要*/}
    {/* 因為我 vite.config.js 裡面用了 @vitejs/plugin-react，所以我在寫 JSX 的時候可以不用再手動 import React from 'react'。 */}
      {/* 使用 Routes 組件定義應用程式的路由結構 */}
      <Routes>
      {/* Routes作為所有路由定義的容器，負責管理應用程式的路由結構。 */}
        {/* 定義身份驗證相關路由，使用 AuthLayout.tsx 作為外層布局 */}
        <Route path="/" element={<AuthLayout />}>
        {/* <Route>定義單個路由，path：指定 URL 路徑，element：指定該路徑匹配時要渲染的 JSX 元素 */}
          {/* 定義登錄頁面路由，使用 GuestRoute 確保只有未認證用戶可訪問 */}
          <Route path="login" element={
            <GuestRoute>
            {/* <GuestRoute> ... </GuestRoute> 是自定義組件，用於包裹頁面元件。 */}
            {/* GuestRoute：限制只有未認證的用戶可以訪問 */}
              <LoginPage />
              {/* 導入 LoginPage.tsx 頁面 */}
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
          //<Route index> 表示「在父層 <Route> 的 path 剛好完全匹配時，顯示的預設子路由」。也就是它可以幫你在父層路由下，定義「預設頁面」或「首頁內容」。
          /*
          當網址 完全匹配父路由 /，而且沒有再接其他子路徑（例如 /explore、/notifications）時。
          例如：
          / 👉 會跑 <Route index>
          /explore 👉 不會跑 <Route index>，會找 <Route path="explore">。
          */
            <ProtectedRoute>
            {/* <ProtectedRoute> ... </ProtectedRoute> 是自定義組件，用於包裹頁面元件。 */}
            {/* ProtectedRoute：限制只有已認證的用戶可以訪問 */}
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
      {/* 
      ToastContainer 是全局的，只需要在應用的入口（通常是 App.tsx）設定一次。
      之後，只需要在任何地方（不管是 LoginForm.tsx、Dashboard.tsx 或其他元件）呼叫 toast.success()、toast.error() 就可以使用。
      react-toastify 會自動將提示信息渲染到剛才在 App.tsx 中設置好的 ToastContainer 上。
 */}
    </>
  );
}

// 導出 App 組件作為應用程式的預設導出，使其可在其他地方（如入口文件）導入並渲染。
export default App;

// ✅ <Route path="/" element={<AuthLayout />}> 和 <Route path="/" element={<MainLayout />}> 的 / 代表匹配所有以 / 開頭的路由（例如 /login、/register、/home），並作為它們的父層 Layout。
// ✅ 它們的真正目的是「決定某個路徑下要套用哪個 Layout（外框）」，所以不是直接指向一個特定的「/」網頁，而是作為包含子路由的 Layout 容器。
// ✅ React Router 只會選擇一個符合的父層 Route（根據子路由路徑做匹配），所以不會同時渲染兩個 Layout。
// ✅ 因為 path="/" 是最上層的起點，真正的 URL 是靠下面的 <Route path="login" ... />（相對於父層）來組成，例如 /login，這樣就會渲染 <AuthLayout>（父） + <LoginPage>（子）。
// ✅ 這樣的設計可以避免 Layout 重複、同時渲染問題，而且可以幫助結構清晰，方便管理各個區域的認證或樣式。
// 所以<Route path="/" element={<AuthLayout />}>內的/並不是實際路由，而是要搭配下面的例如login才會形成完整路由

// 如果要用一句話總結：
// path="/" 是路由結構的起點，真正的路徑要靠子路由來決定，Layout 只負責包裝和控制子路由的顯示，不會同時渲染兩個 Layout。


/*
📱 1. 首次開啟應用
假設你是一個尚未註冊或登入的用戶，打開了 http://localhost:5173/（或類似網址）：
進入 <App /> 組件時，useEffect(() => { checkAuth() }, [checkAuth]) 會執行：
這段程式碼會呼叫 useAuthStore 內的 checkAuth()，確認你是否持有有效的 token（例如從 localStorage 或 cookie）。
如果沒有（因為你尚未登入），isAuthenticated 會是 false。
接著，程式進入 <Routes>，開始判斷路由。

🚫 2. 你想去首頁 /
因為程式碼設定首頁路由（index）需要認證：
<Route index element={
  <ProtectedRoute>
    <HomePage />
  </ProtectedRoute>
} />
<ProtectedRoute> 會執行：
讀取 useAuthStore 的 isAuthenticated，判斷你沒登入（false）。
這時就會執行：
return <Navigate to="/login" state={{ from: location }} replace />;
也就是把你重導到 /login 頁面，並把你本來要去的頁面存在 location.state.from 中（方便未來登入完成後跳回）。

📝 3. 你到 /login
進到 /login：
<Route path="login" element={
  <GuestRoute>
    <LoginPage />
  </GuestRoute>
} />
<GuestRoute> 會執行：
讀取 isAuthenticated，還是 false。
你沒登入，所以正常顯示 <LoginPage />。
但你其實還沒註冊帳號，所以你點選了「註冊」按鈕，跳轉到 /register。

📝 4. 你到 /register
程式會跑到：
<Route path="register" element={
  <GuestRoute>
    <RegisterPage />
  </GuestRoute>
} />
<GuestRoute> 一樣執行：
檢查 isAuthenticated，仍然 false。
讓你看到 <RegisterPage />。
在 <RegisterPage />：
你填完表單（email、password）。
按下「註冊」。
這個動作大概會呼叫：
POST /api/register 或類似的後端 API。
註冊成功後，後端會回傳一個 token（假設 JWT）。
在 RegisterPage 裡，通常會呼叫 useAuthStore().setAuth(token) 之類的 function，存下 token 並把 isAuthenticated 設為 true。

🔑 5. 註冊完成、成功拿到 token
此時：
useAuthStore 裡面的 isAuthenticated 變成 true。
你可能會直接呼叫 navigate("/")（或 history.push("/")），程式碼把你跳轉到首頁 /。
<Routes> 再次執行：
進到 <Route index element={<ProtectedRoute>...</ProtectedRoute>}>。
<ProtectedRoute> 讀到 isAuthenticated 是 true。
這次直接 return <>{children}</>，所以 HomePage 就會渲染了，恭喜你看到首頁。

🔄 如果在 /login 登入
如果一開始就有帳號，你在 /login：
填表登入（類似 POST /api/login）。
API 成功後同樣會返回一個 token。
呼叫 useAuthStore().setAuth(token)。
isAuthenticated 變成 true。
useLocation().state.from 如果有的話（例如剛剛被 ProtectedRoute redirect 過來的），你就會被 navigate(state.from.pathname) 送回去；否則預設可以送到 /。

🔄 如果在已登入狀態下到 /login
如果你本來就登入（isAuthenticated 是 true）：
<GuestRoute> 直接執行：
return <Navigate to="/" replace />;
直接把你丟回首頁，不讓你看登入畫面。
*/