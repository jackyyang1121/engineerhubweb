//研究完畢

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { forgotPassword } from '../../api/authApi';

interface ForgotPasswordFormInputs {
  email: string;
}

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { //解構賦值，把useForm裡面的屬性和函式拿出來用
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<ForgotPasswordFormInputs>();
  
  const onSubmit = async (data: ForgotPasswordFormInputs) => {
    /*
    ✔️ 這裡的 : 是 型別註解，表示 data 這個參數必須符合 ForgotPasswordFormInputs 的型別規則。
    ✔️ 它不會真的賦值，而是讓編譯器「檢查和保護」程式碼的型別正確性。
    ✔️ 也因此可以在後面直接使用 data.email，因為 TypeScript 知道 data 裡面一定有 email 這個屬性。
    */
    setIsLoading(true);
    try {
      await forgotPassword(data.email);  // 呼叫 forgotPassword 函數(來自../../api/authApi.ts，而到這邊又會連後端url，再由後端去操作，並傳入data.email)
      setIsSubmitted(true);
      toast.success('重置密碼連結已發送到您的郵箱');
    } catch (error) {
      toast.error('發送失敗，請檢查郵箱地址');
      console.error('忘記密碼錯誤:', error);
    } finally {
      setIsLoading(false);
    }
  };

/*
以下是當用戶提交表單時，handleSubmit 和 onSubmit 的交互流程：

  用戶提交表單：
    用戶在 <input> 中輸入電子郵箱並點擊 <button type="submit">。
    這會觸發 <form> 的 onSubmit 事件，執行 handleSubmit(onSubmit)。
  執行 handleSubmit：
    handleSubmit 是一個包裝函數，它接收你的 onSubmit 函數作為參數。
    handleSubmit 首先檢查表單的所有驗證規則（例如 email 的 required 和 pattern）。
  如果驗證失敗（例如 email 為空或格式錯誤）：
    handleSubmit 更新 formState.errors，顯示錯誤訊息（例如你的 errors.email.message）。
    不會調用 onSubmit，流程終止。
  如果驗證通過：
    handleSubmit 收集所有已註冊欄位的值，組成一個物件（例如 { email: "user@example.com" }）。
    將這個物件作為參數傳遞給 onSubmit 函數。
  執行 onSubmit：
    你的 onSubmit 函數被調用，接收表單數據作為參數：
    data 是 ForgotPasswordFormInputs 類型的物件，包含 email 屬性（例如 data.email = "user@example.com"）。
    onSubmit 使用 data.email 調用 forgotPassword API，根據結果更新狀態（isSubmitted、isLoading）並顯示提示。
  結果反饋：
    如果 API 請求成功，isSubmitted 設為 true，頁面渲染成功訊息。
    如果失敗，顯示錯誤提示（toast.error）。
    無論成功與否，isLoading 設為 false，按鈕恢復正常。

為什麼需要 handleSubmit 包裝 onSubmit？
  驗證管理：
    handleSubmit 負責檢查表單驗證規則，確保只有有效數據才會傳遞給 onSubmit。
    這避免了你在 onSubmit 中手動檢查驗證邏輯，簡化程式碼。
  阻止預設行為：
    <form> 的原生 onSubmit 事件會導致頁面刷新（瀏覽器預設行為）。
    handleSubmit 自動阻止這種行為（通過 event.preventDefault()），讓你專注於業務邏輯。
  數據收集：
    handleSubmit 自動從表單狀態中收集所有欄位值，組成物件傳遞給 onSubmit。
    你不需要手動從 DOM 或其他地方獲取輸入值。
  一致性：
    handleSubmit 提供統一的 API，適用於所有 React Hook Form 管理的表單，無論表單有多複雜。  
  */

  if (isSubmitted) {
    return (
      <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 w-full max-w-md animate-slide-in-up">
        {/* 成功頭部 */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">郵件已發送</h2>
          <p className="text-indigo-200">我們已將重置密碼連結發送到您的郵箱</p>
        </div>

        <div className="text-center space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-white text-sm">
              請檢查您的郵箱（包括垃圾郵件文件夾），
              點擊連結重置您的密碼。
            </p>
          </div>

          <Link 
            to="/login" 
            className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            返回登錄
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 w-full max-w-md animate-slide-in-up">
      {/* 頭部 */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-xl mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2H7v-2H5v-2l3.257-3.257A6 6 0 0115 7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">忘記密碼？</h2>
        <p className="text-indigo-200">請輸入您的郵箱，我們將發送重置密碼連結</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>   
        {/* onSubmit是被handleSubmit包裝的回調函數，當表單提交時，會調用onSubmit函數 */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
            電子郵箱
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="請輸入您的郵箱"  
              // type="email" 是 HTML5 內建的輸入類型，提供電子郵箱格式的瀏覽器級驗證、鍵盤優化、語義化和自動填充支援。
              className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 ${
                errors.email ? 'border-red-400 ring-2 ring-red-400' : ''
              }`}
              {...register('email', { 
                required: '請輸入電子郵箱', 
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '請輸入有效的電子郵箱地址'
                }
              })}
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-300 animate-slide-in-down">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}   //當設置為 true 時，該按鈕會變成禁用狀態，無法點擊
            className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-orange-600 hover:via-amber-600 hover:to-yellow-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                發送中...
              </div>
            ) : (
              '發送重置連結'
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 text-center text-sm">
        <p className="text-indigo-200">
          記起密碼了？{' '}
          <Link 
            to="/login" 
            className="text-blue-300 hover:text-blue-200 transition-colors duration-200 font-semibold"
          >
            返回登錄
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage; 