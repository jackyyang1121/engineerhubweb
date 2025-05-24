import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';

interface LoginFormInputs {
  email: string;
  password: string;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore(state => state.login);
  
  // 获取用户之前想要访问的页面，没有则默认为首页
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<LoginFormInputs>();
  
  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('登录成功！');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error('登录失败，请检查邮箱和密码');
      console.error('登录错误:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 社交登录处理函数（暂未实现完全）
  const handleGoogleLogin = () => {
    toast.info('Google登录功能即将推出');
  };
  
  const handleGithubLogin = () => {
    toast.info('GitHub登录功能即将推出');
  };

  return (
    <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 w-full max-w-md animate-slide-in-up">
      {/* 頭部 */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl mb-4">
          <span className="text-white font-black text-xl">EH</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">歡迎回來</h2>
        <p className="text-indigo-200">登錄到你的 EngineerHub 帳號</p>
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
          <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
            密碼
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="請輸入您的密碼"
              className={`w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 ${
                errors.password ? 'border-red-400 ring-2 ring-red-400' : ''
              }`}
              {...register('password', {required: '請輸入密碼'})}
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
            {errors.password && (
              <p className="mt-2 text-sm text-red-300 animate-slide-in-down">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/30 rounded bg-white/10"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-indigo-200">
              記住我
            </label>
          </div>

          <div className="text-sm">
            <Link 
              to="/forgot-password" 
              className="text-blue-300 hover:text-blue-200 transition-colors duration-200 font-medium"
            >
              忘記密碼？
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                登錄中...
              </div>
            ) : (
              '登錄'
            )}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-transparent text-white/70">或使用社交帳號</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285f4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34a853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#fbbc05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#ea4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
          <button
            onClick={handleGithubLogin}
            className="w-full flex items-center justify-center px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>
      </div>

      <div className="mt-8 text-center text-sm">
        <p className="text-indigo-200">
          還沒有帳號？{' '}
          <Link 
            to="/register" 
            className="text-blue-300 hover:text-blue-200 transition-colors duration-200 font-semibold"
          >
            立即註冊
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage; 