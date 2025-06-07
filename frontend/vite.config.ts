import { defineConfig } from 'vite'  //Vite 的 defineConfig 函式，用來定義 Vite 的設定。
import react from '@vitejs/plugin-react'  //引入 Vite 官方提供的 React plugin，讓 Vite 能處理 React (JSX/TSX) 的專案。


// plugins 是 Vite 設定物件中的一個屬性
// defineConfig() 只是 TypeScript的型別輔助，訂好可以設定哪些屬性，以及這些屬性可以接收的東西
// plugins: [react()] 是告訴 Vite：要使用 React Plugin

// defineConfig 是 Vite 套件直接匯出的函式。這個函式在內部，會套用 Vite 的型別定義（Type Definitions）
// 所以當你在 TypeScript 專案裡引用它時，它就會告訴編輯器：「裡面的物件是 Vite 設定，應該按照 Vite 的型別規格去檢查」。

// https://vite.dev/config/
export default defineConfig({   //透過 export default 輸出設定物件，這裡註冊了 plugins: [react()]，告訴 Vite 在編譯時使用 React plugin。
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    }
  },
  build: {
    // 設置 chunk 大小警告限制
    chunkSizeWarningLimit: 600,
    
    // Rollup 選項
    rollupOptions: {
      output: {
        // 手動配置 chunk 分割策略
        manualChunks: {
          // React 相關
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // 狀態管理和工具
          'state-utils': ['zustand', '@tanstack/react-query', 'axios'],
          
          // UI 相關
          'ui-vendor': ['react-toastify', 'react-hook-form', 'react-intersection-observer'],
          
          // 圖標
          'icons': ['@heroicons/react/24/outline', '@heroicons/react/24/solid'],
          
          // 語法高亮（通常很大）
          'syntax-highlighter': ['react-syntax-highlighter'],
          
          // 日期處理
          'date-utils': ['date-fns'],
        },
        
        // 自定義 chunk 命名
        chunkFileNames: () => {
          return `assets/js/[name]-[hash].js`;
        },
        
        // 自定義入口文件命名
        entryFileNames: 'assets/js/[name]-[hash].js',
        
        // 自定義資源文件命名
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const extType = info?.[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name ?? '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (extType === 'css') {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      }
    },
    
    // 壓縮選項
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // 移除 console.log
        drop_debugger: true,     // 移除 debugger
        pure_funcs: ['console.log', 'console.info'],  // 移除特定函數調用
      },
      format: {
        comments: false,         // 移除註釋
      },
    },
    
    // 生成源碼映射（用於生產環境調試）
    sourcemap: false,
  },
  
  // 優化依賴
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@tanstack/react-query',
      'axios',
    ],
  },
  
  // 定義全局常量
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})

//@vitejs/plugin-react 是 Vite 官方提供的 React 插件，主要目的是讓 Vite 可以正確處理 React（包含 JSX、TSX、HMR 等功能）的開發與打包。
// 1️⃣ JSX 和 TSX 支援
// React 使用 JSX（JavaScript XML）來寫 UI 元件。瀏覽器無法直接執行 JSX，因此必須經過轉譯（Babel 轉成純 JavaScript）。
// 👉 @vitejs/plugin-react 就是用來處理這些 JSX（或 TSX）語法，讓 Vite 在開發時能即時編譯。

// 2️⃣ Fast Refresh（熱模組更新）
// 這是 React 開發者的超愛功能！它可以在你修改元件後「不重新整理整個頁面」直接更新畫面，並且保留元件的狀態（例如表單輸入值、按鈕狀態）。
// 👉 讓開發體驗更順暢、更快速。

// 3️⃣ 自動 Babel 設定（包含 React Refresh）
// 這個插件底層直接幫你套用好 Babel 的轉譯設定（像 preset-react），並且啟用 React Refresh。
// 👉 你不需要手動配置 .babelrc。

//4️⃣ TSX（TypeScript with JSX）支援
// 如果你的專案是 TypeScript，也能自動處理 .tsx 檔案，讓你能放心用 TypeScript + React。 



//在 Vite 中，plugins 是一個非常核心的概念，它的目的是 擴充 Vite 的功能，像是處理特殊的檔案類型（例如 Markdown、GraphQL）、自動編譯 JSX、或是開發工具（例如熱更新、Lint）、甚至可以微調 Vite 的內部行為（例如自訂打包流程）。
// 👉 Vite 本身就是一個 plugin-based 的開發工具！
// 可以把 Vite plugins 想成是一個又一個的「工具箱」或「插頭」，只要把它們插進 Vite，就可以自動處理各種事情，例如：
// 幫忙轉譯 JSX（React plugin）
// 幫忙支援舊版瀏覽器（Legacy plugin）
// 幫忙做程式碼格式檢查（ESLint plugin）
// 幫忙生成網頁圖標（vite-plugin-pwa）