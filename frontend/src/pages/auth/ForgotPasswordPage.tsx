import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as authApi from '../../api/authApi';

interface ForgotPasswordInputs {
  email: string;
}

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<ForgotPasswordInputs>();
  
  const onSubmit = async (data: ForgotPasswordInputs) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      toast.success('密码重置邮件已发送，请检查您的邮箱');
      setIsSubmitted(true);
    } catch (error) {
      toast.error('发送密码重置邮件失败，请检查您的邮箱地址');
      console.error('忘记密码错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">密码重置邮件已发送</h3>
        <p className="text-sm text-gray-600 mb-4">
          我们已向您的邮箱发送了一封包含密码重置链接的邮件。请检查您的邮箱并点击链接重置密码。
        </p>
        <p className="text-sm text-gray-600">
          如果您在几分钟内没有收到邮件，请检查垃圾邮件文件夹，或
          <button 
            onClick={() => setIsSubmitted(false)} 
            className="text-primary-600 hover:text-primary-500 font-medium ml-1"
          >
            重新尝试
          </button>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h3 className="text-lg font-medium text-gray-900">忘记密码?</h3>
        <p className="mt-2 text-sm text-gray-600">
          请输入您的电子邮箱，我们将向您发送重置密码的链接。
        </p>
      </div>

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
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-2"
          >
            {isLoading ? '发送中...' : '发送重置链接'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm">
        <p className="text-gray-600">
          记起密码了?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
            返回登录
          </Link>
        </p>
      </div>
    </>
  );
};

export default ForgotPasswordPage; 