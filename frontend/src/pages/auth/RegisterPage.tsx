/**
 * EngineerHub - 用戶註冊頁面
 * 
 * 使用 dj-rest-auth + allauth 提供的註冊功能
 * 支援：
 * - 用戶名/郵箱註冊
 * - 郵箱驗證
 * - 表單驗證
 * - 錯誤處理
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthOperations } from '../../store/auth';

// 註冊表單輸入接口
interface RegisterFormInputs {  
  username: string;      // 用戶名
  email: string;         // 郵箱
  password1: string;     // 密碼
  password2: string;     // 確認密碼
  first_name: string;    // 名字
  last_name: string;     // 姓氏
  terms: boolean;        // 同意條款
}

// dj-rest-auth API 錯誤響應類型
interface RegisterErrorResponse {
  response?: {
    data?: {
      username?: string | string[];           // 用戶名錯誤
      email?: string | string[];              // 郵箱錯誤
      password1?: string | string[];          // 密碼錯誤
      first_name?: string | string[];        // 名字錯誤
      last_name?: string | string[];         // 姓氏錯誤
      non_field_errors?: string | string[];  // 通用錯誤
      detail?: string;                        // 詳細錯誤訊息
      [key: string]: unknown;                // 其他可能的錯誤字段
    };
  };
  message?: string;
}

// 新增錯誤數據類型定義
interface ErrorData {
  username?: string | string[];
  email?: string | string[];
  password1?: string | string[];
  first_name?: string | string[];
  last_name?: string | string[];
  non_field_errors?: string | string[];
  detail?: string;
  [key: string]: unknown;
}

const RegisterPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});
  
  // 從認證 store 獲取註冊方法
  const { register } = useAuthOperations();
  
  // React Hook Form 配置
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    setError,
    watch
  } = useForm<RegisterFormInputs>();

  // 監視密碼字段以進行確認密碼驗證
  const password1 = watch('password1');
  
  // 表單提交處理函數
  const onSubmit = async (data: RegisterFormInputs) => {
    setIsLoading(true);
    setServerErrors({});
    
    try {
      console.log('📝 開始註冊流程...');
      
      // 調用 dj-rest-auth 註冊 API
      await register({
        username: data.username,
        email: data.email,
        password1: data.password1,
        password2: data.password2,
        first_name: data.first_name,
        last_name: data.last_name
      });
      
      console.log('✅ 註冊成功');
      
      // 顯示成功訊息
      toast.success('註冊成功！請查看郵箱確認帳號', {
        position: "top-right",
        autoClose: 5000,
      });
      
      // 重定向到登入頁面或首頁
      navigate('/login');
      
    } catch (error: unknown) {
      console.error('❌ 註冊錯誤:', error);
      
      // 處理 dj-rest-auth 的錯誤響應
      if (isRegisterError(error) && error.response?.data) {
        const errorData = error.response.data;
        
        // 處理字段特定錯誤
        if (hasFieldErrors(errorData)) {
          handleFieldErrors(errorData);
        } else if (errorData.detail) {
          // 處理通用錯誤訊息
          toast.error(errorData.detail);
        } else if (errorData.non_field_errors) {
          // 處理非字段錯誤
          const errorMessage = Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors[0] 
            : errorData.non_field_errors;
          toast.error(errorMessage);
        } else {
          // 未知的 API 錯誤格式
          toast.error('註冊失敗，請檢查您的信息');
        }
      } else {
        // 網絡錯誤或其他類型錯誤
        toast.error('註冊失敗，請稍後再試');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 類型保護函數：檢查是否為註冊錯誤
  const isRegisterError = (err: unknown): err is RegisterErrorResponse => {
    return typeof err === 'object' && err !== null && 'response' in err;
  };

  // 檢查是否有字段特定錯誤
  const hasFieldErrors = (errorData: ErrorData): boolean => {
    return !!(errorData.username || errorData.email || errorData.password1 || 
              errorData.first_name || errorData.last_name);
  };

  // 處理字段特定錯誤
  const handleFieldErrors = (errorData: ErrorData) => {
    const fieldErrors: Record<string, string[]> = {};
    
    // 處理用戶名錯誤
    if (errorData.username) {
      fieldErrors.username = Array.isArray(errorData.username) 
        ? errorData.username 
        : [errorData.username];
      
      setError('username', {
        type: 'server',
        message: fieldErrors.username[0]
      });
    }
    
    // 處理郵箱錯誤
    if (errorData.email) {
      fieldErrors.email = Array.isArray(errorData.email) 
        ? errorData.email 
        : [errorData.email];
        
      setError('email', {
        type: 'server',
        message: fieldErrors.email[0]
      });
    }
    
    // 處理密碼錯誤
    if (errorData.password1) {
      fieldErrors.password1 = Array.isArray(errorData.password1) 
        ? errorData.password1 
        : [errorData.password1];
        
      setError('password1', {
        type: 'server',
        message: fieldErrors.password1[0]
      });
    }
    
    // 處理名字錯誤
    if (errorData.first_name) {
      fieldErrors.first_name = Array.isArray(errorData.first_name) 
        ? errorData.first_name 
        : [errorData.first_name];
        
      setError('first_name', {
        type: 'server',
        message: fieldErrors.first_name[0]
      });
    }
    
    // 處理姓氏錯誤
    if (errorData.last_name) {
      fieldErrors.last_name = Array.isArray(errorData.last_name) 
        ? errorData.last_name 
        : [errorData.last_name];
        
      setError('last_name', {
        type: 'server',
        message: fieldErrors.last_name[0]
      });
    }
    
    // 更新服務器錯誤狀態
    setServerErrors(fieldErrors);
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
          {/* 名字 */}
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-white mb-2">
              名字
            </label>
            <input
              id="first_name"
              type="text"
              autoComplete="given-name"
              placeholder="名字"
              className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 ${
                errors.first_name ? 'border-red-400 ring-2 ring-red-400' : ''
              }`}
              {...registerField('first_name', { 
                required: '請輸入名字',
                minLength: {
                  value: 1,
                  message: '名字不能為空'
                },
                maxLength: {
                  value: 30,
                  message: '名字不能超過30個字符'
                }
              })}
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-300">{errors.first_name.message}</p>
            )}
            {serverErrors.first_name && serverErrors.first_name.map((error, index) => (
              <p key={index} className="mt-1 text-sm text-red-300">{error}</p>
            ))}
          </div>

          {/* 姓氏 */}
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
                errors.last_name ? 'border-red-400 ring-2 ring-red-400' : ''
              }`}
              {...registerField('last_name', { 
                required: '請輸入姓氏',
                minLength: {
                  value: 1,
                  message: '姓氏不能為空'
                },
                maxLength: {
                  value: 30,
                  message: '姓氏不能超過30個字符'
                }
              })}
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-300">{errors.last_name.message}</p>
            )}
            {serverErrors.last_name && serverErrors.last_name.map((error, index) => (
              <p key={index} className="mt-1 text-sm text-red-300">{error}</p>
            ))}
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
              },
              maxLength: {
                value: 30,
                message: '用戶名不能超過30個字符'
              },
              pattern: {
                value: /^[a-zA-Z0-9_]+$/,
                message: '用戶名只能包含字母、數字和下劃線'
              }
            })}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-300">{errors.username.message}</p>
          )}
          {serverErrors.username && serverErrors.username.map((error, index) => (
            <p key={index} className="mt-1 text-sm text-red-300">{error}</p>
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
          {serverErrors.email && serverErrors.email.map((error, index) => (
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
          {serverErrors.password1 && serverErrors.password1.map((error, index) => (
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
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password2 && (
            <p className="mt-1 text-sm text-red-300">{errors.password2.message}</p>
          )}
        </div>

        {/* 服務條款 */}
        <div className="flex items-start">
          <input
            id="terms"
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/30 rounded bg-white/10 mt-1"
            {...registerField('terms', { required: '請同意服務條款' })}
          />
          <label htmlFor="terms" className="ml-3 text-sm text-indigo-200 leading-relaxed">
            我同意{' '}
            <Link to="/terms" className="text-blue-300 hover:text-blue-200 transition-colors duration-200">
              服務條款
            </Link>{' '}
            和{' '}
            <Link to="/privacy" className="text-blue-300 hover:text-blue-200 transition-colors duration-200">
              隱私政策
            </Link>
          </label>
        </div>
        {errors.terms && (
          <p className="text-sm text-red-300">{errors.terms.message}</p>
        )}

        {/* 註冊按鈕 */}
        <div>
          <button
            type="submit"
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