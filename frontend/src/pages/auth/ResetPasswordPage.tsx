import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as authApi from '../../api/authApi';

interface ResetPasswordInputs {
  new_password1: string;
  new_password2: string;
}

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});
  
  // 从URL参数获取uid和token
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  
  const { 
    register, 
    handleSubmit, 
    watch,
    formState: { errors },
    setError
  } = useForm<ResetPasswordInputs>();
  
  const password = watch('new_password1');
  
  const onSubmit = async (data: ResetPasswordInputs) => {
    if (!uid || !token) {
      toast.error('无效的密码重置链接');
      return;
    }
    
    setIsLoading(true);
    setServerErrors({});
    try {
      await authApi.resetPassword({
        uid,
        token,
        new_password1: data.new_password1,
        new_password2: data.new_password2
      });
      toast.success('密码重置成功！');
      setIsCompleted(true);
    } catch (error: any) {
      console.error('密码重置错误:', error);
      
      // 處理後端返回的詳細錯誤信息
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // 如果有字段特定的錯誤
        if (errorData.new_password1 || errorData.new_password2) {
          const fieldErrors: Record<string, string[]> = {};
          
          // 新密碼錯誤
          if (errorData.new_password1) {
            fieldErrors.new_password1 = Array.isArray(errorData.new_password1) 
              ? errorData.new_password1 
              : [errorData.new_password1];
            
            setError('new_password1', {
              type: 'server',
              message: fieldErrors.new_password1[0]
            });
          }
          
          // 確認密碼錯誤
          if (errorData.new_password2) {
            fieldErrors.new_password2 = Array.isArray(errorData.new_password2) 
              ? errorData.new_password2 
              : [errorData.new_password2];
              
            setError('new_password2', {
              type: 'server',
              message: fieldErrors.new_password2[0]
            });
          }
          
          setServerErrors(fieldErrors);
        } else if (errorData.non_field_errors) {
          toast.error(Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors[0] 
            : errorData.non_field_errors);
        } else if (errorData.detail) {
          toast.error(errorData.detail);
        } else {
          toast.error('密码重置失败，请重试或获取新的重置链接');
        }
      } else {
        toast.error('密码重置失败，请重试或获取新的重置链接');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">无效的密码重置链接</h3>
        <p className="text-sm text-gray-600 mb-4">
          您点击的链接已失效或已过期。请尝试重新获取一个密码重置链接。
        </p>
        <Link 
          to="/forgot-password" 
          className="btn-primary py-2 px-4 inline-block"
        >
          重新获取密码重置链接
        </Link>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-medium text-green-600 mb-2">密码重置成功!</h3>
        <p className="text-sm text-gray-600 mb-4">
          您的密码已成功重置。现在可以使用新密码登录您的账号。
        </p>
        <Link 
          to="/login" 
          className="btn-primary py-2 px-4 inline-block"
        >
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h3 className="text-lg font-medium text-gray-900">重置密码</h3>
        <p className="mt-2 text-sm text-gray-600">
          请设置您的新密码
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="new_password1" className="block text-sm font-medium text-gray-700">
            新密码
          </label>
          <div className="mt-1">
            <input
              id="new_password1"
              type="password"
              autoComplete="new-password"
              className={`input ${errors.new_password1 ? 'border-red-500' : ''}`}
                            {...register('new_password1', {                 required: '请输入新密码'              })}
            />
            {errors.new_password1 && (
              <p className="mt-1 text-sm text-red-600">{errors.new_password1.message}</p>
            )}
            {serverErrors.new_password1 && serverErrors.new_password1.map((error, index) => (
              <p key={index} className="mt-1 text-sm text-red-600">{error}</p>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="new_password2" className="block text-sm font-medium text-gray-700">
            确认新密码
          </label>
          <div className="mt-1">
            <input
              id="new_password2"
              type="password"
              autoComplete="new-password"
              className={`input ${errors.new_password2 ? 'border-red-500' : ''}`}
              {...register('new_password2', { 
                required: '请确认新密码',
                validate: value => value === password || '两次输入的密码不一致'
              })}
            />
            {errors.new_password2 && (
              <p className="mt-1 text-sm text-red-600">{errors.new_password2.message}</p>
            )}
            {serverErrors.new_password2 && serverErrors.new_password2.map((error, index) => (
              <p key={index} className="mt-1 text-sm text-red-600">{error}</p>
            ))}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-2"
          >
            {isLoading ? '重置中...' : '重置密码'}
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

export default ResetPasswordPage; 