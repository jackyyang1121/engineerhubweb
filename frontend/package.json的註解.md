{
  "name": "frontend",                         *專案名稱*
  "private": true,                            *表示這個專案不會被發佈到 npm（安全防呆）*
  "version": "0.0.0",                         *專案的版本號*
  "type": "module",                           *讓 Node.js 知道要用 ES module 格式（支援 import/export）*

  "scripts": {                                *定義常用的 npm 指令（快捷執行）*
    "dev": "vite",                            *啟動開發伺服器（vite）*
    "build": "tsc -b && vite build",          *先用 TypeScript 編譯專案（tsc -b），再進行 Vite 的正式打包*
    "lint": "eslint .",                       *執行 ESLint，檢查整個專案的程式碼風格*
    "preview": "vite preview"                 *啟動 Vite 的預覽模式（預覽打包後的網頁）*
  },

  "dependencies": {                           *專案執行時需要的依賴（Production Dependencies）*
    "@headlessui/react": "^2.2.4",            *Headless UI，提供無樣式的 React 元件（常用於 Tailwind）*
    "@heroicons/react": "^2.1.1",             *Heroicons，Tailwind 的圖示庫*
    "@tailwindcss/forms": "^0.5.10",          *Tailwind CSS 的表單樣式插件*
    "@tailwindcss/postcss": "^4.1.7",         *Tailwind CSS 的 PostCSS 整合*
    "@tanstack/react-query": "^5.22.2",       *React Query，資料快取與同步化工具*
    "@tanstack/react-query-devtools": "^5.24.1", *React Query 的開發工具*
    "@types/lodash": "^4.17.17",              *lodash 的型別定義檔（TypeScript）*
    "@types/react-syntax-highlighter": "^15.5.13", *react-syntax-highlighter 的型別定義檔*
    "autoprefixer": "^10.4.21",               *自動補上 CSS 前綴（PostCSS）*
    "axios": "^1.6.7",                        *HTTP 請求工具*
    "date-fns": "^3.3.1",                     *日期處理函式庫*
    "jwt-decode": "^4.0.0",                   *解碼 JWT（JSON Web Token）*
    "lodash": "^4.17.21",                     *JavaScript 工具庫*
    "postcss": "^8.5.3",                      *CSS 處理器（Tailwind 用）*
    "react": "^18.2.0",                       *React 主程式庫*
    "react-dom": "^18.2.0",                   *React DOM（瀏覽器端渲染）*
    "react-hook-form": "^7.50.1",             *React 表單處理工具*
    "react-intersection-observer": "^9.8.0",  *監聽元素進入/離開視窗的工具（Lazy Loading）*
    "react-router-dom": "^6.22.1",            *React 路由套件*
    "react-syntax-highlighter": "^15.5.0",    *程式碼區塊高亮顯示*
    "react-toastify": "^10.0.4",              *React Toast 提示訊息*
    "tailwindcss": "^4.1.7",                  *Tailwind CSS 框架*
    "zustand": "^4.5.1"                       *React 的輕量狀態管理工具*
  },

  "devDependencies": {                        *開發時需要的依賴（Development Dependencies）*
    "@eslint/js": "^9.25.0",                  *ESLint 的核心程式*
    "@types/react": "^19.1.2",                *React 的型別定義檔（TypeScript）*
    "@types/react-dom": "^19.1.2",            *React DOM 的型別定義檔*
    "@vitejs/plugin-react": "^4.4.1",         *Vite 官方的 React 插件*
    "eslint": "^9.25.0",                      *ESLint（程式碼檢查工具）*
    "eslint-plugin-react-hooks": "^5.2.0",    *ESLint Plugin：檢查 React Hooks 規則*
    "eslint-plugin-react-refresh": "^0.4.19", *ESLint Plugin：支援 React HMR（Hot Module Replacement）*
    "globals": "^16.0.0",                     *ESLint 用的全域變數定義*
    "typescript": "~5.8.3",                   *TypeScript 編譯器*
    "typescript-eslint": "^8.30.1",           *ESLint 的 TypeScript 整合工具*
    "vite": "^6.3.5"                          *Vite 本體（開發伺服器與打包工具）*
  }
}
