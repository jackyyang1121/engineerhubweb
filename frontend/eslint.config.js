//可以用npm run lint來檢查
//或是安裝 ESLint 擴展就可以背景即時檢查

import js from '@eslint/js' // 導入 ESLint 官方的 JavaScript 規則配置
import globals from 'globals' // 導入 globals 模塊，提供全域變數的定義，例如瀏覽器環境中的 window、document 等，簡單講就是把瀏覽器環境的變數定義出來，讓ESLint知道
import reactHooks from 'eslint-plugin-react-hooks' // 導入 React Hooks 的 ESLint 插件，確保 Hooks 的正確使用
import reactRefresh from 'eslint-plugin-react-refresh' // 導入 React Refresh 的 ESLint 插件，支援 React Fast Refresh (熱重載)功能
import tseslint from 'typescript-eslint' // 導入 TypeScript ESLint 插件，提供 TypeScript 特定的 linting 規則。
// Linting 是指使用工具（例如 ESLint、TSLint 等）自動檢查程式碼，以發現潛在的錯誤、不一致的風格、潛在的性能問題或不符合最佳實踐的寫法。
// 而 Linting 規則 是一組定義好的標準或條件，下面extends繼承tseslint.configs.recommended內的規則像是:
//@typescript-eslint/no-unused-vars：檢查程式碼中是否有未使用的變數。預設嚴重性：通常為 'error'，報錯以提醒修正。
//@typescript-eslint/no-explicit-any：禁止使用 any 類型，除非絕對必要。預設嚴重性：通常為 'warn'，發出警告以鼓勵改進。
//@typescript-eslint/no-non-null-assertion：禁止使用非空斷言運算子（!），例如 value!。預設嚴重性：通常為 'warn'，提醒開發者添加回傳類型。
//@typescript-eslint/no-empty-functio：禁止定義空的函數（無任何內容）。預設嚴重性：通常為 'error'，要求修正。

export default tseslint.config( // 使用 tseslint.config 函數來創建 ESLint 配置
  // tseslint.config 用途：幫我設定 ESLint，定義規則和檔案範圍，專為 TypeScript 優化，生成檢查配置。
  // tseslint.config 是從 typescript-eslint 套件中導入的一個函數，不直接驗證程式碼中的屬性或資料，它只設定規則，後續由ESLint 根據這些規則檢查程式碼（例如變數、屬性是否未使用）。
  // defineConfig 直接驗證配置物件的屬性，透過 TypeScript 型別確保其正確性。
  { ignores: ['dist'] }, // 忽略 dist 目錄，不對其進行 linting（通常是編譯後的輸出目錄）
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended], // 繼承 ESLint 官方推薦的 JavaScript 規則和 TypeScript ESLint 推薦的規則
    //在 ESLint 配置中，extends 是一個屬性，用於繼承預定義的規則集或配置，這樣你就不用從頭定義所有規則。
// 這裡的 ... 展開運算子將 tseslint.configs.recommended 陣列中的所有配置物件展開，併入 extends 的陣列中。
// 為什麼需要展開？
// tseslint.configs.recommended 本身是一個陣列（例如 [config1, config2, config3]）。
// 如果直接寫 extends: [js.configs.recommended, tseslint.configs.recommended]，結果會是 [jsConfig, [config1, config2, config3]]，這是一個巢狀陣列，ESLint 無法正確解析。
// 使用 ... 展開後，變成 extends: [js.configs.recommended, config1, config2, config3]，這樣 ESLint 能正確繼承所有配置。
    files: ['**/*.{ts,tsx}'], // 指定 linting 的文件類型為 .ts 和 .tsx 所有檔案
    languageOptions: { // 設定語言選項
      ecmaVersion: 2020, // 指定 ECMAScript 版本為 2020，支持 ES2020 的語法
      globals: globals.browser, // 使用瀏覽器環境的全域變數，例如 window、document 等
      // globals.browser 讓 ESLint 知道我的程式碼跑在瀏覽器，認識 window、document 之類的東西。
      // 告訴 ESLint 哪些變數是環境自帶的，不用特別定義，這樣它不會誤以為這些變數「不存在」而報錯。
    },
    plugins: { // 定義要使用的 ESLint 插件
      'react-hooks': reactHooks, // 啟用 React Hooks 插件
// 鍵 'react-hooks'：
// 這是插件的名稱，ESLint 用這個名稱來識別和引用插件。
// 按照慣例，插件名稱通常與其套件名稱相關，但去掉前綴 eslint-plugin-（例如 eslint-plugin-react-hooks 簡化為 react-hooks）。
// 值 reactHooks：
// 這是從 eslint-plugin-react-hooks 導入的插件物件，包含了該插件的規則和邏輯。
// 含義：
// 這行告訴 ESLint 載入 eslint-plugin-react-hooks 插件，並將其命名為 react-hooks，以便在配置中引用其規則。
// 而eslint-plugin-react-hooks功能是:
// 它確保 Hooks（如 useState、useEffect）遵循特定規則，例如只能在函數組件或自訂 Hooks 中調用，
// 且必須在頂層使用（不在迴圈、條件或巢狀函數中），並檢查依賴陣列的完整性，
// 避免因誤用 Hooks 導致運行時錯誤，提升 React 代碼的穩定性和可維護性。
      'react-refresh': reactRefresh, // 啟用 React Refresh 插件
// 鍵 'react-refresh'：
// 這是插件的名稱，ESLint 用這個名稱來識別和引用插件。
// 按照慣例，名稱通常與套件名相關，去掉前綴 eslint-plugin-（例如 eslint-plugin-react-refresh 簡化為 react-refresh）。
// 值 reactRefresh：
// 這是從 eslint-plugin-react-refresh 導入的插件物件，包含該插件的規則和邏輯。
// 含義：
// 這行告訴 ESLint 載入 eslint-plugin-react-refresh 插件，並命名為 react-refresh，以便在配置中引用其規則。
// 而eslint-plugin-react-refresh功能是:
// 它確保只有 React 組件被導出，並支援 React Fast Refresh（熱重載功能），
// 提升開發體驗，確保熱重載等功能正常運作。
    },
    rules: { // 前面extends已經繼承了reactHooks.configs.recommended，這邊可以再自訂規則，像是react-refresh/only-export-components
      ...reactHooks.configs.recommended.rules, // 繼承 React Hooks 插件推薦的規則
      'react-refresh/only-export-components': [ // 這條規則來自 eslint-plugin-react-refresh 插件，該插件專為支援 React Fast Refresh 設計。
// 功能：
// 檢查檔案中導出的內容，確保只導出 React 組件（例如函數組件或類組件）。
// React Fast Refresh 是一種熱重載技術（常用於 Vite、Webpack、Next.js），允許在開發時修改 React 組件，頁面能快速更新並保留狀態（例如表單輸入值）。
// 為什麼只導出組件？Fast Refresh 依賴模組主要導出 React 組件來正確追踪和更新，導出非組件內容（例如普通函數、變數）可能干擾其行為，導致熱重載失敗或狀態丟失。
        'warn', // 違反規則時發出警告
        { allowConstantExport: true }, // 允許導出常量（例如函數組件）
// 含義：
// 這是規則的配置選項，具體調整 react-refresh/only-export-components 的行為。
// allowConstantExport: true 允許檔案導出常量值，例如字串、數字、物件或陣列，即使它們不是 React 組件。
// 目的：
// 預設情況下，react-refresh/only-export-components 希望檔案只導出 React 組件，限制其他類型的導出。
// 設定 allowConstantExport: true 放寬限制，允許導出常量（例如配置值、常數定義），以適應項目中常見的需求。
      ],
    },
  },
)

//此檔案目的:
//1.檢查代碼錯誤
// 透過繼承的規則（js.configs.recommended 和 tseslint.configs.recommended），檢查潛在的錯誤，例如：
// 未使用的變數（no-unused-vars 或 @typescript-eslint/no-unused-vars）。
// 未定義的變數（no-undef）。
// 不安全的 TypeScript 做法（例如使用 any 類型，@typescript-eslint/no-explicit-any）。
// 作用：及早發現 bug，減少運行時錯誤。

//2.強制執行代碼風格和一致性
// 規則確保代碼遵循一致的寫法，例如：
// 命名慣例、縮進、分號等（部分由推薦規則隱含控制）。
// 作用：讓代碼可讀性更好，特別在團隊合作時，確保所有人的程式碼風格統一。

//3.遵循框架和工具的最佳實踐
// React 相關：
// 透過 react-hooks 插件，檢查 React Hooks 的使用是否正確：
// react-hooks/rules-of-hooks：確保 Hooks 只在函數組件或自訂 Hooks 中調用，且在頂層使用。
// react-hooks/exhaustive-deps：檢查 useEffect 等 Hooks 的依賴陣列，避免遺漏依賴導致 bug。
// TypeScript 相關：
// tseslint.configs.recommended 提供 TypeScript 特定的規則，利用類型資訊檢查代碼，例如要求函數明確回傳類型。
// 作用：確保代碼遵循 React 和 TypeScript 的最佳實踐，減少潛在問題。

//4.支援開發工具和工作流程
// React Refresh：
// react-refresh/only-export-components 規則要求只導出 React 組件，支援 React Fast Refresh（熱重載功能），提升開發體驗。
// 設定為 'warn' 並允許常量導出（allowConstantExport: true），提供靈活性。
// 作用：與現代工具（如 Vite、Webpack）整合，確保熱重載等功能正常運作。

//5.定義檢查範圍和環境
// 範圍：
// files: ['**/*.{ts,tsx}']：僅檢查 .ts 和 .tsx 檔案，適用於 TypeScript 和 React 項目。
// ignores: ['dist']：忽略 dist 目錄（通常是編譯輸出），避免檢查不必要的檔案。
// 環境：
// languageOptions 指定 ECMAScript 版本（ecmaVersion: 2020）和瀏覽器環境（globals: globals.browser），確保 ESLint 理解代碼的上下文（例如認識 window、document）。
// 作用：精確控制 linting 的目標和環境，避免誤報或不必要的檢查。