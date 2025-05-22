import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../store/authStore';

interface LoginFormInputs {
  email: string;
  password: string;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
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
    <>
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            电子邮箱
          </label>
          <div className="mt-1">
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`input ${errors.email ? 'border-red-500' : ''}`}
              {...register('email', { 
                required: '请输入电子邮箱', 
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '请输入有效的电子邮箱地址'
                }
              })}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            密码
          </label>
          <div className="mt-1">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={`input ${errors.password ? 'border-red-500' : ''}`}
              {...register('password', { 
                required: '请输入密码', 
                minLength: {
                  value: 6,
                  message: '密码长度至少为6个字符'
                } 
              })}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              记住我
            </label>
          </div>

          <div className="text-sm">
            <Link to="/forgot-password" className="text-primary-600 hover:text-primary-500">
              忘记密码?
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-2"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">或使用社交账号</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={handleGoogleLogin}
            className="w-full btn-secondary py-2 flex justify-center"
          >
            <span>Google 登录</span>
          </button>
          <button
            onClick={handleGithubLogin}
            className="w-full btn-secondary py-2 flex justify-center"
          >
            <span>GitHub 登录</span>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-sm">
        <p className="text-gray-600">
          还没有账号?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-500 font-medium">
            立即注册
          </Link>
        </p>
      </div>
    </>
  );
};

export default LoginPage; 