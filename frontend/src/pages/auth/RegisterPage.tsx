import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';

interface RegisterFormInputs {  
  username: string;  
  email: string;  
  password1: string;  
  password2: string;  
  first_name: string;  
  last_name: string;  
  terms: boolean;}

// API 錯誤響應類型
interface RegisterErrorResponse {
  response?: {
    data?: {
      username?: string | string[];
      email?: string | string[];
      password1?: string | string[];
      error?: string;
      [key: string]: unknown;
      /*
      在 data 物件中，[key: string]: unknown 表示 data 可以包含除了明確定義的屬性
     （username、email、password1、error）之外的其他任意鍵值對，且這些值的型別未知（unknown）。
      */
     //但因為後端沒寫其他返回值所以基本用不到
    };
  };
  message?: string;
  /*
   ? 就是 TypeScript 的可選屬性（Optional Property），它的意思是：
  ✅ 這個 message 屬性可以「有」或「沒有」。
  ✅ 如果有的話，它的值必須是 string。
  ✅ 如果沒有的話，那就不會出現在這個物件裡（等於 undefined）。
  */
}

const RegisterPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({}); // ({})初始值是「空物件」
  /*
  Record<string, string[]> 是 TypeScript 的一個泛型工具型別（Utility Type），意思是：
  這個物件的「鍵」（key）是字串 (string)，
  對應的「值」（value）是字串陣列 (string[])。
  */
  const register = useAuthStore(state => state.register);   //調用後端去拿token
  
  const { //const {} 是解構賦值，把 useForm 的屬性解構出來，方便使用
    register: registerField, //把 register 函數改名成 registerField 函數，避免和上面那行useAuthStore的register衝突
    //register（來自 React Hook Form）
    //在物件解構時，在{}內用":"代表改名的功能而不是typehint
    handleSubmit, //handleSubmit 是 React Hook Form 的一個內建函數，用於處理所有表單提交事件。
    /*
    自動收集表單中所有欄位的值（透過 register 註冊的欄位）。
    執行前端驗證（根據 register 設定的規則，例如 required、minLength）。
    如果驗證通過，將收集的表單數據傳遞給您提供的回調函數（例如 onSubmit）。
    如果驗證失敗，更新 formState.errors 並阻止回調函數執行，顯示錯誤訊息。

    也是因為handleSubmit才有辦法處理用戶點擊「提交」按鈕時啟用onSubmit
    */
    formState: { errors },  //從useForm裡面解構出formState，再從formState裡面解構出errors(formState裡面有很多不只errors的屬性，所以要拿errors就好時需要再解構)
    setError,    //可以設置錯誤訊息，並儲存在formState.errors裡面
    watch
    //以上都是useForm這個HOOK裡面內建的屬性
  } = useForm<RegisterFormInputs>();//這邊的 <> 就是 TypeScript 的 型別提示（type hint）功能

  const password1 = watch('password1'); // 這行的作用是「監視表單中 password1 這個欄位的值變化」，它會即時反映用戶輸入的密碼。
  
  const onSubmit = async (data: RegisterFormInputs) => {  //要提交時用戶輸入的資料都已經存在RegisterFormInputs的裡面並傳給data了
    //這個函式是當用戶按下註冊按鈕時，就會觸發的函式
    setIsLoading(true);
    setServerErrors({});
    
    //以下測的錯誤就是後端API 回應的實際錯誤(例如：username已經被註冊過、HTTP 400 響應...)
    try {
      await register({
        username: data.username,
        email: data.email,
        password1: data.password1,
        password2: data.password2,
        first_name: data.first_name,
        last_name: data.last_name
      });
      /*
      為什麼可以 data.username？
      在實際執行時：
      我在表單上使用了 useForm()（通常是 react-hook-form）。
      當使用者填完表單並按下「提交」按鈕時，useForm 會把表單的資料組成一個 JavaScript 物件，並呼叫 onSubmit 把這個物件作為參數傳進去。
      這個物件同時被 TypeScript 確認型別是 RegisterFormInputs（這只是型別註記，編譯時使用，但執行時它其實就是一個普通的物件）。
      因此，執行到 data.username 時，JavaScript 只是存取物件屬性，就像一般的物件一樣。
      */
      toast.success('註冊成功！請查看郵箱確認帳號');
      navigate('/login');
    } catch (error: unknown) {
      console.error('註冊錯誤:', error);
      
      // 類型保護函數
      const isRegisterError = (err: unknown): err is RegisterErrorResponse => {
        /*
        err 是傳進來的錯誤物件，型別是 unknown。
        unknown 是 TypeScript 的安全型別，表示「我不確定它是什麼」。
        TypeScript 不知道 err 是什麼型別（可能是 Error、string、number，通通都可能）。
        所以如果我寫 err.response，TypeScript 會報錯：「我不知道這個東西有沒有 response 屬性啊！」
        err is RegisterErrorResponse就是型別保護，就是幫 TypeScript 說「我幫你檢查好了！」
        如果回傳 true，TypeScript 會把 err 視為 RegisterErrorResponse。(基本上都會回傳true除非RegisterErrorResponse的型別設置有誤)
        這樣我可以在後續程式裡就可以使用 err.response.data 等屬性。
        */
        return typeof err === 'object' && err !== null && 'response' in err;
        /*
        typeof err === 'object' && err !== null && 'response' in err;
        這行是 TypeScript 的型別檢查，確保 err 是物件，不是 null，並且有 response 屬性。
        */

        /*
        可以這樣理解：
        typeof err === 'object' → 這是問：「你是不是一個盒子？」
        err !== null → 這是問：「你不是空的盒子？」
        'response' in err → 這是問：「盒子裡有沒有一個叫 response 的東西？」

        最後，如果這三個條件都成立，TypeScript 會說：「好，我確定 err 是 RegisterErrorResponse 型別的物件。」並回傳true
        */

        /*
        typeof err === 'object'：
        檢查 err 是否是一個物件（因為 RegisterErrorResponse 是一個物件型別）。
        排除非物件型別（例如 string、number、undefined 等）。
        err !== null：
        確保 err 不是 null，因為 null 雖然滿足 typeof null === 'object'，但它沒有任何屬性，無法有 response。
        'response' in err：
        檢查 err 是否有 response 屬性，這是 RegisterErrorResponse 的核心特徵（根據您的介面定義，response 是可選屬性，但這裡假設有 response 才算符合）。
        */

        /*
        err: unknown 表示輸入的 err 是未知型別，TypeScript 無法假設它有任何屬性（例如 err.response）。
        err is RegisterErrorResponse 表示：如果 isRegisterError 回傳 true
        TypeScript 會將 err 的型別訂為 RegisterErrorResponse，這樣後續代碼可以安全存取 err.response.data 等屬性。
        err is RegisterErrorResponse 是 TypeScript 的型別層面，告訴編譯器「如果這個函數回傳 true，就把 err 當作 RegisterErrorResponse」。
        return 的檢查是實際的運行時邏輯，確保 err 在執行時真的符合預期的結構。
       */
      };
      
      // 處理後端返回的詳細錯誤信息
      if (isRegisterError(error) && error.response?.data) { // 這邊的error是上面catch抓到的error
        /*
        先確認 error 是「帶有 response 的錯誤物件」 （用 isRegisterError(error) 判斷）
        如果是，才嘗試拿 error.response.data 的內容
        如果不是，整個判斷就是 false，不會繼續拿 response.data
        */
        /*
        用?來避免報錯
        如果 error.response 存在，就會拿到 data 的值。
        如果 error.response 不存在，整個表達式回傳 undefined，不會報錯。
        */
        const errorData = error.response.data;
        
        // 如果有字段特定的錯誤
        if (errorData.password1 || errorData.username || errorData.email) {
          const fieldErrors: Record<string, string[]> = {};
          
          // 目前尚未實施後端password1的驗證，所以這邊目前不管怎麼驗證都是對的，
          // 甚至根本沒有errorData.password1，所以這邊根本不會觸發
          // 但密碼最好是有驗證機制因此這邊還是保留，之後可以在後端新增驗證
          if (errorData.password1) {
            fieldErrors.password1 = Array.isArray(errorData.password1) 
              ? errorData.password1 
              : [errorData.password1];
              /*
                如果 Array.isArray(errorData.password1) 為 true（即 errorData.password1 是陣列）：
                就把 errorData.password1 直接賦值給 fieldErrors.password1
                如果 Array.isArray(errorData.password1) 為 false（即 errorData.password1 不是陣列）：
                就把它包裝成一個陣列，並賦值給 fieldErrors.password1
                這樣做是為了確保 fieldErrors.password1 總是一個陣列，方便後續處理。
              */
            
            // 設置表單錯誤訊息
            setError('password1', {
              type: 'server',   // type是自訂的，用來區分錯誤類型
              message: fieldErrors.password1[0] //fieldErrors.password1[0] 是取第一個錯誤訊息
            });
          }
          
          // 用戶名錯誤
          if (errorData.username) {
            fieldErrors.username = Array.isArray(errorData.username) //Array.isArray是 JavaScript 內建的函數，用來檢查一個值是否是陣列
              ? errorData.username 
              : [errorData.username];
              
            setError('username', {
              type: 'server',
              message: fieldErrors.username[0]
            });
          }
          
          // 郵箱錯誤
          if (errorData.email) {
            fieldErrors.email = Array.isArray(errorData.email) 
              ? errorData.email 
              : [errorData.email];
              
            setError('email', {
              type: 'server',
              message: fieldErrors.email[0]
            });
          }
          
          setServerErrors(fieldErrors);  
          // 這行對應上面const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});
          // 把錯誤訊息儲存在serverErrors裡面，底下渲染時會把它顯示出來
        } else if (errorData.error) {  // 🆕 新增：處理後端的 error 字段
          toast.error(errorData.error);
        } else {
          // 以上錯誤都沒匹配，但是data還是有錯，可能返回其他錯誤的響應，所以顯示錯誤訊息
          toast.error('註冊失敗，請檢查您的信息');
        }
      } else {   
          // 錯誤情況：
          // 1. 類型不符合 RegisterErrorResponse（如網絡錯誤、普通 Error 對象）
          // 2. HTTP 響應存在但沒有 data（如某些 HTTP 500 響應）
          // 3. 網絡層面的錯誤（超時、DNS 失敗等）
        toast.error('註冊失敗，請稍後再試');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 w-full max-w-md animate-slide-in-up">
      {/* 頭部 */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl mb-4">
          <span className="text-white font-black text-xl">EH</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">加入 EngineerHub</h2>
        <p className="text-indigo-200">創建你的工程師社群帳號</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {/* 姓名欄位 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-white mb-2">
              名字
            </label>
            <input
              id="first_name" //這個 id 用來讓 <label for="first_name"> 連結到這個輸入框，方便點擊 label 時聚焦 input。
              type="text"
              autoComplete="given-name"  //
              placeholder="名字"
              className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 ${
                errors.first_name ? 'border-red-400 ring-2 ring-red-400' : ''  //這裡的 errors 是從 formState: { errors } 解構出來的 errors，儲存的是前端驗證錯誤 + setError儲存的後端驗證錯誤(例如：username已經被註冊過、HTTP 400 響應...)
                // 動態添加 CSS 樣式到輸入框，當 errors.first_name 存在時，應用紅色邊框（border-red-400）和紅色光環（ring-2 ring-red-400）。
              }`}
              {...registerField('first_name', { required: '請輸入名字' })}   //檢查欄位是否為空。
              // 'first_name'只是字串，並不是變數或被限制只能用 RegisterFormInputs 裡的欄位，理論上你可以放任意字串，但通常會對應 interface 裡的 key，以確保型別安全。
              // registerField 繼承register，是useform內建的函式
              /*
              這邊"..."要展開的是React Hook Form(registerField)綁定 input 的屬性和事件，例如：
              {
                name: 'first_name',
                onChange: function,
                onBlur: function,
                ref: function,
                // 可能還有其他屬性
              }
              */
              /*
             　值是存在於 useForm Hook 管理的「表單狀態」中，也就是在上面的:
             　const { 
              　register: registerField,
              　handleSubmit, 
              　formState: { errors },
              　setError,
              　watch
            　　} = useForm<RegisterFormInputs>();
             　送出時，透過 handleSubmit 的回呼拿到（例如 handleSubmit(onSubmit)）
             　隨時取得時，可以用 watch() 看（例如 watch('first_name')）
             */
             // 如果驗證失敗，錯誤信息會被存儲在 formState 的 errors 物件中，例如 errors.username。
             // 驗證成功：值儲存在 React Hook Form 的內部狀態，可通過 watch、 getValues 或 handleSubmit 的 data 物件存取。
            />
            {errors.first_name && (    //顯示前端驗證錯誤，這邊顯示'請輸入名字'的錯誤訊息
              <p className="mt-1 text-sm text-red-300">{errors.first_name.message}</p>   //文字錯誤訊息和樣式
            )}
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-white mb-2">
              姓氏
            </label>
            <input
              id="last_name"
              type="text"
              autoComplete="family-name"
              placeholder="姓氏"
              className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 ${
                errors.last_name ? 'border-red-400 ring-2 ring-red-400' : ''  //這邊讓錯誤的欄位有紅色邊框和紅色光環
              }`}
              {...registerField('last_name', { required: '請輸入姓氏' })}
            />
            {errors.last_name && (    //顯示前端驗證錯誤，這邊顯示文字'請輸入姓氏'的錯誤訊息和樣式
              <p className="mt-1 text-sm text-red-300">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        {/* 用戶名 */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
            用戶名
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="請輸入用戶名"
            className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 ${
              errors.username ? 'border-red-400 ring-2 ring-red-400' : ''
            }`}
            {...registerField('username', { 
              required: '請輸入用戶名',
              minLength: {
                value: 3,
                message: '用戶名至少需要3個字符'
              } //這邊只是驗證規則而已，不會被展開送入useForm的表單狀態
              // required和minLength......都是React Hook Form的內建驗證規則
            })}
          />
          {errors.username && (    //顯示上面驗證規則未通過的錯誤訊息，errors.username是從useForm裡面解構出來的
            <p className="mt-1 text-sm text-red-300">{errors.username.message}</p>
          )}
          {serverErrors.username && serverErrors.username.map((error, index) => (
            <p key={index} className="mt-1 text-sm text-red-300">{error}</p>
            /*
            serverErrors 是一個物件，key 是欄位名（這裡是 "username"），value 是錯誤訊息陣列（string[]）
            serverErrors.username：如果存在（不是 undefined 或 null），代表有 username 的錯誤訊息
            .map((error, index) => (...))：把這些錯誤訊息用 .map 一條條列出來
            每一條錯誤訊息被渲染成一個 <p> 標籤，
            key={index} 是 React 要求的列表唯一 key，避免重複渲染問題
            className="mt-1 text-sm text-red-300" 是用來美化文字顏色和間距
            {error} 是每條錯誤訊息的文字內容
            */
          ))}
        </div>

        {/* 電子郵箱 */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
            電子郵箱
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="請輸入您的郵箱"
            className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 ${
              errors.email ? 'border-red-400 ring-2 ring-red-400' : ''
            }`}
            {...registerField('email', { 
              required: '請輸入電子郵箱', 
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: '請輸入有效的電子郵箱地址'
              }
            })}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-300">{errors.email.message}</p>
          )}
          {serverErrors.email && serverErrors.email.map((error, index) => (   //這邊把後端驗證的錯誤訊息顯示出來
            <p key={index} className="mt-1 text-sm text-red-300">{error}</p>
          ))}
        </div>

        {/* 密碼 */}
        <div>
          <label htmlFor="password1" className="block text-sm font-medium text-white mb-2">
            密碼
          </label>
          <div className="relative">
            <input
              id="password1"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="請輸入密碼"
              className={`w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 ${
                errors.password1 ? 'border-red-400 ring-2 ring-red-400' : ''
              }`}
              {...registerField('password1', {
                required: '請輸入密碼',
                minLength: {
                  value: 8,
                  message: '密碼至少需要8個字符'
                }
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password1 && (
            <p className="mt-1 text-sm text-red-300">{errors.password1.message}</p>
          )}
          {/* 後端尚未實施密碼驗證，所以這邊不會觸發，但可以留著之後觸發 */}
          {serverErrors.password1 && serverErrors.password1.map((error, index) => (   //這邊把後端驗證的錯誤訊息顯示出來
            <p key={index} className="mt-1 text-sm text-red-300">{error}</p>
          ))}
        </div>

        {/* 確認密碼 */}
        <div>
          <label htmlFor="password2" className="block text-sm font-medium text-white mb-2">
            確認密碼
          </label>
          <div className="relative">
            <input
              id="password2"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="請再次輸入密碼"
              className={`w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 ${
                errors.password2 ? 'border-red-400 ring-2 ring-red-400' : ''
              }`}
              {...registerField('password2', {
                required: '請確認密碼',
                validate: value => value === password1 || '密碼不匹配'
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5" />    //EyeSlashIcon是從react-icons/fa裡面import來的眼睛圖示
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password2 && (    //顯示前端驗證失敗訊息，這邊顯示文字'密碼不匹配'的錯誤訊息和樣式
            <p className="mt-1 text-sm text-red-300">{errors.password2.message}</p>
          )}
        </div>

        {/* 服務條款 */}
        <div className="flex items-start">
          <input
            id="terms"
            type="checkbox"    // 這個 type="checkbox" 就是把它變成可以勾選的小方格，只要沒勾選就會傳false
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/30 rounded bg-white/10 mt-1"
            {...registerField('terms', { required: '請同意服務條款' })}
          />
          <label htmlFor="terms" className="ml-3 text-sm text-indigo-200 leading-relaxed">
            我同意{' '}
            <Link to="/terms" className="text-blue-300 hover:text-blue-200 transition-colors duration-200">  
            {/* 還沒有做terms和privacy的頁面 */}
              服務條款   
            </Link>{' '}
            和{' '}
            <Link to="/privacy" className="text-blue-300 hover:text-blue-200 transition-colors duration-200">
              隱私政策
            </Link>
          </label>
        </div>
        {errors.terms && (   //顯示前端驗證失敗訊息，這邊顯示文字'請同意服務條款'的錯誤訊息和樣式
          <p className="text-sm text-red-300">{errors.terms.message}</p>
        )}

        {/* 註冊按鈕 */}
        <div>
          <button
            type="submit"   //這個 type="submit" 很重要，因為它告訴瀏覽器：「當按下這個按鈕時，觸發 <form> 的 onSubmit 事件」。
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                註冊中...
              </div>
            ) : (
              '創建帳號'
            )}
          </button>
        </div>
      </form>

      {/* 登錄連結 */}
      <div className="mt-8 text-center text-sm">
        <p className="text-indigo-200">
          已有帳號？{' '}
          <Link 
            to="/login" 
            className="text-blue-300 hover:text-blue-200 transition-colors duration-200 font-semibold"
          >
            立即登錄
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage; 