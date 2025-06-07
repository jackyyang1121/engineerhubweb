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
  
  const { 
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
            disabled={isLoading}
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