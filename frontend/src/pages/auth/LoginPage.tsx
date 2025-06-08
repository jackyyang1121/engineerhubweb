import { useState } from 'react'; // 從 React 庫中導入 useState 鉤子，用於管理組件狀態
import { Link, useNavigate, useLocation } from 'react-router-dom'; // 從 react-router-dom 導入 Link（用於頁面鏈接）、useNavigate（用於頁面跳轉）和 useLocation（用於獲取當前位置信息）
import { useForm } from 'react-hook-form'; // 從 react-hook-form 導入 useForm 鉤子，用於表單管理和驗證
import { toast } from 'react-toastify'; // 從 react-toastify 導入 toast 函數，用於顯示提示消息
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'; // 從 @heroicons/react 導入 EyeIcon（眼睛圖標）和 EyeSlashIcon（隱藏眼睛圖標），用於密碼顯示切換
import { useAuthStore } from '../../store/authStore'; // 從自定義的 authStore 文件中導入 useAuthStore，用於管理認證狀態

interface LoginFormInputs { // 定義 LoginFormInputs 接口，用於指定表單數據的類型
  username: string; // 用戶名字段，必須是字符串類型
  password: string; // 密碼字段，必須是字符串類型
}

const LoginPage = () => { // 定義 LoginPage 組件，這是一個函數式組件，用於渲染登錄頁面
  const navigate = useNavigate(); // 獲取 navigate 函數，用於在程式中控制頁面跳轉
  const location = useLocation(); // 獲取 location 對象，用於獲取當前頁面的路徑信息
  const [isLoading, setIsLoading] = useState(false); // 定義 isLoading 狀態，初始值為 false，用於控制表單提交時的加載狀態
  const [showPassword, setShowPassword] = useState(false); // 定義 showPassword 狀態，初始值為 false，用於控制密碼是否可見
  
  
  
  const login = useAuthStore(state => state.login); // 從 useAuthStore 中提取 login 函數，用於執行登錄操作
  
  // 用戶之前想要訪問的頁面，如果沒有指定則默認為首頁（根路徑 '/'）
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
  /*
  from?：表示 from 屬性是可選的（undefined 或 { pathname: string }）。
  而這邊的from是我在App.tsx中的<Navigate>裡自定義的變數，儲存的是location
  pathname：是 from 物件中的一個字串屬性，表示路徑（這邊是根路徑 '/'）。

  這裡用了兩個 ?.（Optional Chaining），用於安全地存取深層屬性，避免出現 undefined 或 null 導致的錯誤。
  第一個 ?.from：
  如果 location.state as { from?: { pathname: string } } 是 undefined 或沒有 from 屬性，就直接返回 undefined，不繼續往下存取。
  第二個 ?.pathname：
  同理，如果 from 是 undefined 或 null，就直接返回 undefined。

  || '/'
  這部分是 邏輯或（Logical OR）：
  如果左邊的值是「真值」（truthy），就直接回傳左邊的值。
  如果左邊的值是「假值」（falsy），就去看右邊的值。
  如果左邊的結果是 undefined 或 null 或其他 falsy 值（像 ''），就會回退到 '/'（首頁）。

  總結：
  1. 如果 location.state 有 from 屬性，且 from 有 pathname 屬性，就回傳 from.pathname。
  2. 如果 location.state 沒有 from 屬性，或者 from 沒有 pathname 屬性，就回傳 '/'。
  */
  
  const { 
    register, // register 函數，用於註冊表單字段
    handleSubmit, // handleSubmit 函數，用於處理表單提交
    formState: { errors } // formState 中的 errors 對象，用於存儲表單驗證錯誤信息
  } = useForm<LoginFormInputs>(); // 使用 useForm 鉤子，指定表單數據類型為 LoginFormInputs
  /*
  這裡的 useForm<LoginFormInputs>() 之所以使用 < >（尖括號），是因為 TypeScript 的泛型語法。
  泛型是 TypeScript（和其他許多語言）的一種語法，讓函數、類別或介面可以在宣告時不指定具體的型別，而是在使用時再傳入具體的型別。這樣能提高程式的靈活性和型別安全。
  LoginFormInputs 是我訂的介面（interface），裡面定義了表單的欄位與型別
  我把這個介面當作泛型參數給 useForm，就是告訴它：
  「這個表單的輸入資料結構長這樣，我希望 TypeScript 幫我根據這個結構來做型別檢查和自動補全。」
  */
  
  const onSubmit = async (data: LoginFormInputs) => { // 定義 onSubmit 函數，處理表單提交邏輯，data 包含表單數據
    setIsLoading(true); // 設置 isLoading 為 true，表示開始加載
    try { // 嘗試執行登錄操作
      await login(data.username, data.password); // 調用 login 函數，傳入用戶名和密碼，執行登錄
      toast.success('登錄成功！'); // 登錄成功時顯示成功提示
      navigate(from, { replace: true }); // 跳轉到用戶之前想要訪問的頁面，並替換當前歷史記錄
    } catch (error) { // 如果登錄失敗，捕獲錯誤
      toast.error('登錄失敗，請檢查用戶名和密碼'); // 顯示登錄失敗的錯誤提示
      console.error('登錄錯誤:', error); // 在控制台輸出詳細錯誤信息
    } finally { // 無論成功或失敗，最終都會執行的代碼
      setIsLoading(false); // 設置 isLoading 為 false，表示加載結束
    }
  };
  
  // 社交登錄處理函數（目前僅顯示提示，功能尚未完全實現）
  const handleGoogleLogin = () => { // 定義 handleGoogleLogin 函數，處理 Google 登錄
    toast.info('Google 登錄功能即將推出'); // 顯示資訊提示，表明功能尚未實現
  };
  
  const handleGithubLogin = () => { // 定義 handleGithubLogin 函數，處理 GitHub 登錄
    toast.info('GitHub 登錄功能即將推出'); // 顯示資訊提示，表明功能尚未實現
  };

  return ( // 開始渲染組件的 JSX 內容
    <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 w-full max-w-md animate-slide-in-up"> {/* 登錄頁面的主容器，具有背景、模糊效果、圓角、陰影和邊框 */}
      {/* 頭部區域 */}
      <div className="text-center mb-8"> {/* 頭部區域，居中顯示，底部有間距 */}
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl mb-4"> {/* 圖標容器，具有漸變背景、圓角和陰影 */}
          <span className="text-white font-black text-xl">EH</span> {/* 圖標文本，顯示為粗體白色 "EH" */}
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">歡迎回來</h2> {/* 標題，顯示為粗體白色大字 */}
        <p className="text-indigo-200">登錄到你的 EngineerHub 帳號</p> {/* 描述文字，顯示為淺紫色 */}
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}> {/* 登錄表單，字段間有垂直間距，提交時觸發 onSubmit */}
        <div> {/* 用戶名輸入區域 */}
          <label htmlFor="username" className="block text-sm font-medium text-white mb-2"> {/* 用戶名標籤，白色中等字體 */}
           {/* 這邊的htmlFor是與input的id屬性相對應，用於建立表單元素之間的關聯，這樣當點擊標籤時，會自動聚焦到對應的輸入框 */}
            用戶名
          </label>
          <div className="relative"> {/* 用戶名輸入框的相對定位容器 */}
            <input
              id="username" // 輸入框的 ID
              type="text" // 輸入類型為文字
              autoComplete="username" // 啟用瀏覽器自動填充用戶名
              placeholder="請輸入您的用戶名" // 輸入框的占位符文字
              className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 ${errors.username ? 'border-red-400 ring-2 ring-red-400' : ''}`} // 輸入框樣式，包含背景、邊框、圓角、文字顏色等，若有錯誤則顯示紅色邊框
              {...register('username', { // 將該字段註冊到表單中，並設置驗證規則
                required: '請輸入用戶名', // 必填字段，若未填寫則顯示此錯誤訊息
                minLength: { // 最小長度驗證
                  value: 3, // 最小長度為3個字符
                  message: '用戶名至少需要3個字符' // 長度不足時的錯誤訊息
                },
                pattern: { // 使用正則表達式驗證用戶名格式
                  value: /^[a-zA-Z0-9_]+$/, // 用戶名格式的正則表達式（字母、數字、下劃線）
                  message: '用戶名只能包含字母、數字和下劃線' // 格式無效時的錯誤訊息
                }
              })}
            />
            {errors.username && ( // 如果用戶名字段有錯誤，顯示錯誤訊息
              <p className="mt-2 text-sm text-red-300 animate-slide-in-down">{errors.username.message}</p> // 錯誤訊息，顯示為紅色小字並帶有動畫
            )}
          </div>
        </div>

        <div> {/* 密碼輸入區域 */}
          <label htmlFor="password" className="block text-sm font-medium text-white mb-2"> {/* 密碼標籤，白色中等字體 */}
            密碼
          </label>
          <div className="relative"> {/* 密碼輸入框的相對定位容器 */}
            <input
              id="password" // 輸入框的 ID
              type={showPassword ? 'text' : 'password'} // 根據 showPassword 狀態動態設置輸入類型（可見文字或隱藏密碼）
              autoComplete="current-password" // 啟用瀏覽器自動填充當前密碼
              placeholder="請輸入您的密碼" // 輸入框的占位符文字
              className={`w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 ${errors.password ? 'border-red-400 ring-2 ring-red-400' : ''}`} // 輸入框樣式，若有錯誤則顯示紅色邊框
              {...register('password', {required: '請輸入密碼'})} // 將該字段註冊到表單中，設置必填驗證
            />
            <button
              type="button" // 按鈕類型為普通按鈕，不觸发表單提交
              onClick={() => setShowPassword(!showPassword)} // 點擊時切換 showPassword 狀態
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200" // 切換按鈕的樣式，位於輸入框右側，垂直居中
            >
              {showPassword ? ( // 根據 showPassword 狀態顯示不同的圖標
                <EyeSlashIcon className="h-5 w-5" /> // 若密碼可見，顯示隱藏圖標
              ) : (
                <EyeIcon className="h-5 w-5" /> // 若密碼隱藏，顯示眼睛圖標
              )}
            </button>
            {errors.password && ( // 如果密碼字段有錯誤，顯示錯誤訊息
              <p className="mt-2 text-sm text-red-300 animate-slide-in-down">{errors.password.message}</p> // 錯誤訊息，顯示為紅色小字並帶有動畫
            )}
          </div>
        </div>

        <div className="flex items-center justify-between"> {/* 記住我和忘記密碼區域，水平排列 */}
          <div className="flex items-center"> {/* 記住我選項區域 */}
            <input
              id="remember-me" // 複選框的 ID
              name="remember-me" // 複選框的名稱
              type="checkbox" // 輸入類型為複選框
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/30 rounded bg-white/10" // 複選框樣式，包含大小、顏色和邊框
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-indigo-200"> {/* 記住我標籤，淺紫色小字 */}
              記住我
            </label>
          </div>

          <div className="text-sm"> {/* 忘記密碼鏈接區域 */}
            <Link 
              to="/forgot-password" // 鏈接目標為忘記密碼頁面
              className="text-blue-300 hover:text-blue-200 transition-colors duration-200 font-medium" // 鏈接樣式，包含顏色和懸停效果
            >
              忘記密碼？
            </Link>
          </div>
        </div>

        <div> {/* 登錄按鈕區域 */}
          <button
            type="submit" // 按鈕類型為提交，觸發表單提交
            disabled={isLoading} // 當 isLoading 為 true 時禁用按鈕
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" // 按鈕樣式，包含漸變背景、圓角、陰影和動畫效果
          >
            {isLoading ? ( // 根據 isLoading 狀態顯示不同內容
              <div className="flex items-center justify-center"> {/* 加載時的內容容器 */}
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> {/* 加載動畫，旋轉的圓環 */}
                登錄中...
              </div>
            ) : (
              '登錄' // 未加載時顯示的文字
            )}
          </button>
        </div>
      </form>

      <div className="mt-8"> {/* 社交登錄區域 */}
        <div className="relative"> {/* 分隔線容器 */}
          <div className="absolute inset-0 flex items-center"> {/* 分隔線的絕對定位容器 */}
            <div className="w-full border-t border-white/20" /> {/* 白色透明的分隔線 */}
          </div>
          <div className="relative flex justify-center text-sm"> {/* 分隔線中的文字容器 */}
            <span className="px-2 bg-transparent text-white/70">或使用社交帳號</span> {/* 分隔線上的文字 */}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3"> {/* 社交登錄按鈕容器，使用網格佈局 */}
          <button
            onClick={handleGoogleLogin} // 點擊時觸發 Google 登錄處理函數
            className="w-full flex items-center justify-center px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 hover:scale-105" // Google 登錄按鈕樣式
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"> {/* Google 圖標 */}
              <path
                fill="#4285f4" // 藍色填充
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" // 圖標路徑
              />
              <path
                fill="#34a853" // 綠色填充
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" // 圖標路徑
              />
              <path
                fill="#fbbc05" // 黃色填充
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" // 圖標路徑
              />
              <path
                fill="#ea4335" // 紅色填充
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" // 圖標路徑
              />
            </svg>
            Google 
          </button>
          <button
            onClick={handleGithubLogin} // 點擊時觸發 GitHub 登錄處理函數
            className="w-full flex items-center justify-center px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 hover:scale-105" // GitHub 登錄按鈕樣式
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"> {/* GitHub 圖標 */}
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/> {/* 圖標路徑 */}
            </svg>
            GitHub 
          </button>
        </div>
      </div>

      <div className="mt-8 text-center text-sm"> {/* 註冊鏈接區域 */}
        <p className="text-indigo-200"> {/* 描述文字，淺紫色 */}
          還沒有帳號？{' '} {/* 文字間的空格 */}
          <Link 
            to="/register" // 鏈接目標為註冊頁面
            className="text-blue-300 hover:text-blue-200 transition-colors duration-200 font-semibold" // 鏈接樣式，包含顏色和懸停效果
          >
            立即註冊
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage; // 導出 LoginPage 組件，使其可以在其他文件中被導入和使用