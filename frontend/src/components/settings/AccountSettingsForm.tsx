import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

import { useAuthStore } from '../../store/authStore';
import * as userApi from '../../api/userApi';

const AccountSettingsForm = () => {
  const { user } = useAuthStore();
  
  // 密碼相關狀態
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 電子郵件相關狀態
  const [email, setEmail] = useState(user?.email || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  
  // 更改密碼的mutation
  const changePasswordMutation = useMutation({
    mutationFn: userApi.changePassword,
    onSuccess: () => {
      toast.success('密碼已成功更新');
      // 清空表單
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('更改密碼失敗，請重試');
      }
    }
  });
  
  // 發送驗證碼的模擬mutation
  const sendVerificationMutation = useMutation({
    mutationFn: async () => {
      // 實際情況下，這裡會調用API發送驗證碼
      return Promise.resolve();
    },
    onSuccess: () => {
      setIsVerifying(true);
      toast.success(`驗證碼已發送至 ${email}`);
    },
    onError: () => {
      toast.error('發送驗證碼失敗，請重試');
    }
  });
  
  // 驗證電子郵件的模擬mutation
  const verifyEmailMutation = useMutation({
    mutationFn: async () => {
      // 實際情況下，這裡會調用API驗證電子郵件
      return Promise.resolve();
    },
    onSuccess: () => {
      setIsVerifying(false);
      setVerificationCode('');
      toast.success('電子郵件已成功驗證');
    },
    onError: () => {
      toast.error('驗證碼錯誤，請重試');
    }
  });
  
  // 處理密碼表單提交
  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 基本驗證
    if (!currentPassword) {
      toast.error('請輸入目前的密碼');
      return;
    }
    
    if (!newPassword) {
      toast.error('請輸入新密碼');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('新密碼長度必須至少為8個字符');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('新密碼和確認密碼不匹配');
      return;
    }
    
    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
  };
  
  // 處理電子郵件變更
  const handleSendVerification = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('請輸入電子郵件地址');
      return;
    }
    
    // 簡單的電子郵件驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('請輸入有效的電子郵件地址');
      return;
    }
    
    sendVerificationMutation.mutate();
  };
  
  // 處理驗證碼提交
  const handleVerifyEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!verificationCode) {
      toast.error('請輸入驗證碼');
      return;
    }
    
    verifyEmailMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold mb-4">帳號設置</h2>
      
      {/* 更改密碼部分 */}
      <div>
        <h3 className="text-lg font-medium mb-4">更改密碼</h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {/* 當前密碼 */}
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
              當前密碼
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input w-full pr-10"
                placeholder="輸入當前密碼"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showCurrentPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
          
          {/* 新密碼 */}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
              新密碼
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input w-full pr-10"
                placeholder="輸入新密碼"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showNewPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">密碼必須至少包含8個字符</p>
          </div>
          
          {/* 確認新密碼 */}
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              確認新密碼
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input w-full pr-10"
                placeholder="確認新密碼"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
          
          {/* 提交按鈕 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="btn-primary py-2 px-4"
            >
              {changePasswordMutation.isPending ? '處理中...' : '更改密碼'}
            </button>
          </div>
        </form>
      </div>
      
      {/* 電子郵件部分 */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium mb-4">電子郵件</h3>
        {!isVerifying ? (
          <form onSubmit={handleSendVerification} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                電子郵件地址
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                placeholder="your@email.com"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sendVerificationMutation.isPending || !email || email === user?.email}
                className="btn-primary py-2 px-4"
              >
                {sendVerificationMutation.isPending ? '發送中...' : '發送驗證碼'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div>
              <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-1">
                驗證碼
              </label>
              <input
                id="verification-code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="input w-full"
                placeholder="輸入驗證碼"
              />
              <p className="mt-1 text-xs text-gray-500">
                驗證碼已發送至 {email}
              </p>
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setIsVerifying(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                返回
              </button>
              <button
                type="submit"
                disabled={verifyEmailMutation.isPending || !verificationCode}
                className="btn-primary py-2 px-4"
              >
                {verifyEmailMutation.isPending ? '驗證中...' : '驗證'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AccountSettingsForm; 