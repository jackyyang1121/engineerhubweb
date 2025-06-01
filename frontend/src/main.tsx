// 匯入 React 套件，用來撰寫 React 元件。
import React from 'react';

// 匯入 ReactDOM 套件（使用新版的 root API），用來將 React 元件掛載到 DOM 上。
import ReactDOM from 'react-dom/client';

// 匯入 react-router-dom 套件中的 BrowserRouter 元件，用來建立前端路由（SPA），
// 功能是：
// 把你的 React 應用包起來，讓它能監控網址列（瀏覽器地址欄）的路徑變化，
// 根據不同的網址路徑決定要顯示哪個頁面（元件），
// 讓你的網站看起來像是多頁面應用，但實際上是在同一頁面動態切換內容，
// 使用者點連結時不會重新載入整個頁面，體驗更順暢、速度更快。
import { BrowserRouter } from 'react-router-dom';

// 匯入 @tanstack/react-query 套件中的 QueryClient 與 QueryClientProvider。
// QueryClient 是 React Query 的核心實例，用來管理快取、狀態等。
// QueryClientProvider 是用來提供全域的 QueryClient 給 React App。
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// 👉 這行是把 React Query 這個第三方函式庫裡的兩個東西叫出來，放進你的程式碼裡：


// 匯入 React Query Devtools，用來在開發時除錯 React Query 的資料狀態（例如 cache）。
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// 匯入App.tsx
import App from './App';

// 匯入index.css
import './index.css';



// 創建一個新的 React Query 的客戶端（queryClient）。
// 這個客戶端會設定全域的預設行為，例如 staleTime、refetchOnWindowFocus、retry 次數等。
const queryClient = new QueryClient({
  //當我用 <QueryClientProvider> 把它包在應用外層，整個應用就能透過 useQuery、useMutation 等 Hook 使用 React Query 的功能。
  defaultOptions: {
  // defaultOptions:設定 React Query 的全域預設行為，這樣就不用每次使用 useQuery 都重複設定相同選項。
    queries: {  //針對「查詢（useQuery）」的設定。
      staleTime: 1000 * 60 * 5, // 設定查詢的資料在 5 分鐘內都算是「新鮮的」，不會重新 fetch。
      //設定資料的新鮮度（毫秒）。在這段時間內，資料會被視為「新鮮的」，React Query 不會自動重新發送請求。
      refetchOnWindowFocus: false, // 當視窗重新 focus（從背景切換回來）時，不自動重新 fetch 資料。
      retry: 1, // 失敗時最多重試 1 次。
    },
  },
});
// 為什麼要這段查資料的code？
// 因為資料通常不是寫死在前端的，而是放在伺服器的資料庫裡面（後端 API）。
// 所以每次畫面要顯示資料（例如產品列表），就必須「去查一次」才能把最新資料拿到前端顯示。
// 就像你開冰箱拿東西吃，如果冰箱沒東西就要跑去超市（後端）買新的放進來。

// 如果「不查」會怎樣？
// 如果畫面完全不查資料（例如不發送 API），畫面就不會顯示最新的後端資料。
// 例如：
// 你打開購物車，但資料停留在舊的狀態，沒更新庫存或價格。
// 你打開留言區，但留言都還是上次看到的，沒更新最新留言。
// 也就是說，資料就不會跟後端保持同步。




// 使用 React 18 提供的 createRoot API，將 React App 掛載到 HTML 中 id="root" 的元素上。
  //在 HTML 中找不到 id="root" 的元素，這個方法就會回傳 null，而編輯器會提醒我可能是null而跑出一個提醒。 
  //因此如果保證有id="root"的話就可以加!，功能是:告訴編輯器我保證這個值絕對不會是 null 或 undefined，所以請不要報錯。
ReactDOM.createRoot(document.getElementById('root')!).render(
  // 呼叫 render() 來開始渲染整個 React 應用程式。


  // 使用 React.StrictMode 包裹 App 元件：
  // 這個模式只在開發環境下額外執行檢查（例如找出不安全的生命週期），不會影響正式環境。
  // import React from 'react';是因為我有寫這行
  // 所以我可以用來源於React的<React.StrictMode>，而它的功能是幫忙找潛在錯誤如檢查不安全的生命週期、過時 API等一些bug
  <React.StrictMode>
    {/* 使用 QueryClientProvider 包裹整個應用，讓 App 可以使用 React Query 的功能。 */}
    <QueryClientProvider client={queryClient}>
    {/* QueryClient：幫我管理資料查詢和快取的「大管家」。 */}
    {/* QueryClientProvider：一個 React 元件，負責把這個「大管家」放到 React App 的上下文（Context）裡，讓所有子元件都能用它。 */}

      {/* 使用 BrowserRouter 包裹 App，提供前端路由的功能（SPA）。 */}
      <BrowserRouter
        // future 屬性用來啟用 react-router-dom v7 的一些新功能（可選）。
        future={{
          v7_startTransition: true, // 啟用 startTransition 支援（效能優化）。
          // 功能：啟用對 React 18 的 startTransition() 支援，幫助在路由切換時分割任務，讓 UI 保持流暢（例如載入畫面、資料請求）。
          // 技術重點：如果資料在切換頁面時還在載入，React 可以把它排成「低優先」任務，不會阻塞其他互動（例如點擊、輸入）。
          // 幫忙在切換頁面或載入資料的時候，讓網頁不卡、更流暢顯示（畫面不會一瞬間卡住）。
          v7_relativeSplatPath: true, // 相對路徑支援。
          // 功能：啟用對 * （splat route）的相對路徑解析支援。
          // 技術重點：在路由設定裡的 path="*"（萬用匹配）會在 v7 被解釋成相對路徑而不是絕對路徑，讓巢狀路由更靈活、結構更清晰。
          // 讓路由裡的「*」符號可以更聰明地依照父路由設定（巢狀路由）去決定路徑，讓設定起來更方便。
        }}
      >
        {/* 導入App.tsx */}
        <App />
      </BrowserRouter>
      {/* React Query Devtools：除錯工具，初始狀態設為關閉。 */}
      <ReactQueryDevtools initialIsOpen={false} />
      {/* 這一行： */}
      {/* 是專門給開發者使用的「除錯工具」 */}
      {/* 讓你在瀏覽器裡看到快取的資料狀態（比如：現在有幾個 query？資料是 fresh 還是 stale？fetching 狀態、error 狀態等等） */}
      {/* 如果資料快取或查詢有問題，就能直接從 Devtools 面板觀察和除錯。 */}
      {/* 呼應QueryClient建立的資料快取功能 */}
    </QueryClientProvider>
  </React.StrictMode>,
);
