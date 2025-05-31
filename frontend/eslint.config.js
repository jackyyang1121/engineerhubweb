import js from '@eslint/js' // 導入 ESLint 官方的 JavaScript 規則配置
import globals from 'globals' // 導入 globals 模塊，提供全域變數的定義，例如瀏覽器環境中的 window、document 等
import reactHooks from 'eslint-plugin-react-hooks' // 導入 React Hooks 的 ESLint 插件，確保 Hooks 的正確使用
import reactRefresh from 'eslint-plugin-react-refresh' // 導入 React Refresh 的 ESLint 插件，支援 React Fast Refresh 功能
import tseslint from 'typescript-eslint' // 導入 TypeScript ESLint 插件，提供 TypeScript 特定的 linting 規則

export default tseslint.config( // 使用 tseslint.config 函數來創建 ESLint 配置
  { ignores: ['dist'] }, // 忽略 dist 目錄，不對其進行 linting（通常是編譯後的輸出目錄）
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended], // 繼承 ESLint 官方推薦的 JavaScript 規則和 TypeScript ESLint 推薦的規則
    files: ['**/*.{ts,tsx}'], // 指定 linting 的文件類型為 .ts 和 .tsx 檔案
    languageOptions: { // 設定語言選項
      ecmaVersion: 2020, // 指定 ECMAScript 版本為 2020，支持 ES2020 的語法
      globals: globals.browser, // 使用瀏覽器環境的全域變數，例如 window、document 等
    },
    plugins: { // 定義要使用的 ESLint 插件
      'react-hooks': reactHooks, // 啟用 React Hooks 插件
      'react-refresh': reactRefresh, // 啟用 React Refresh 插件
    },
    rules: { // 定義自訂的 linting 規則
      ...reactHooks.configs.recommended.rules, // 繼承 React Hooks 插件推薦的規則
      'react-refresh/only-export-components': [ // 設定 React Refresh 插件的規則
        'warn', // 違反規則時發出警告
        { allowConstantExport: true }, // 允許導出常量（例如函數組件）
      ],
    },
  },
)


////////////////////////////////////////////////////////這邊還沒讀/////////////////////////////