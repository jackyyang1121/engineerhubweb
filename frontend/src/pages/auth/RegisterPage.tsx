import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../store/authStore';
import type { RegisterData } from '../../api/authApi';

interface RegisterFormInputs extends RegisterData {
  terms: boolean;
}

const RegisterPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const register = useAuthStore(state => state.register);
  
  const { 
    register: registerField, 
    handleSubmit, 
    watch,
    formState: { errors } 
  } = useForm<RegisterFormInputs>();
  
  const password = watch('password1');
  
  const onSubmit = async (data: RegisterFormInputs) => {
    if (!data.terms) {
      toast.error('请阅读并同意用户协议和隐私政策');
      return;
    }
    
    setIsLoading(true);
    try {
      const { terms, ...registerData } = data;
      await register(registerData);
      toast.success('注册成功！欢迎加入EngineerHub!');
      navigate('/');
    } catch (error) {
      toast.error('注册失败，请检查您的信息');
      console.error('注册错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            用户名
          </label>
          <div className="mt-1">
            <input
              id="username"
              type="text"
              autoComplete="username"
              className={`input ${errors.username ? 'border-red-500' : ''}`}
              {...registerField('username', { 
                required: '请输入用户名',
                minLength: {
                  value: 3,
                  message: '用户名长度至少为3个字符'
                },
                maxLength: {
                  value: 20,
                  message: '用户名长度不能超过20个字符'
                },
                pattern: {
                  value: /^[A-Za-z0-9_]+$/,
                  message: '用户名只能包含字母、数字和下划线'
                }
              })}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>
        </div>
        
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
              {...registerField('email', { 
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
          <label htmlFor="password1" className="block text-sm font-medium text-gray-700">
            密码
          </label>
          <div className="mt-1">
            <input
              id="password1"
              type="password"
              autoComplete="new-password"
              className={`input ${errors.password1 ? 'border-red-500' : ''}`}
              {...registerField('password1', { 
                required: '请输入密码',
                minLength: {
                  value: 8,
                  message: '密码长度至少为8个字符'
                }
              })}
            />
            {errors.password1 && (
              <p className="mt-1 text-sm text-red-600">{errors.password1.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="password2" className="block text-sm font-medium text-gray-700">
            确认密码
          </label>
          <div className="mt-1">
            <input
              id="password2"
              type="password"
              autoComplete="new-password"
              className={`input ${errors.password2 ? 'border-red-500' : ''}`}
              {...registerField('password2', { 
                required: '请确认密码',
                validate: value => value === password || '两次输入的密码不一致'
              })}
            />
            {errors.password2 && (
              <p className="mt-1 text-sm text-red-600">{errors.password2.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="terms"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            {...registerField('terms', { 
              required: '请阅读并同意用户协议和隐私政策'
            })}
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
            我已阅读并同意 
            <a href="#" className="text-primary-600 hover:text-primary-500"> 用户协议 </a>
            和
            <a href="#" className="text-primary-600 hover:text-primary-500"> 隐私政策</a>
          </label>
        </div>
        {errors.terms && (
          <p className="mt-1 text-sm text-red-600">{errors.terms.message}</p>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-2"
          >
            {isLoading ? '注册中...' : '注册'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm">
        <p className="text-gray-600">
          已有账号?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
            立即登录
          </Link>
        </p>
      </div>
    </>
  );
};

export default RegisterPage; 