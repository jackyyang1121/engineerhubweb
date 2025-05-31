import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';

// API 錯誤響應類型
interface APIErrorResponse {
  response?: {
    data?: {
      message?: string;
      detail?: string;
    };
  };
  message?: string;
}

const DeleteAccountForm = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  
  const [password, setPassword] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  // 刪除帳號的 mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (data: { password: string; reason?: string }) => {
      // 實際上會調用刪除帳號 API
      console.log('刪除帳號:', data);
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success('帳號已成功刪除');
      // 這裡可能會跳轉到登出頁面或首頁
      logout(); // 假設有登出函數
    },
    onError: (error: APIErrorResponse) => {
      const message = error.response?.data?.message || error.response?.data?.detail || '刪除帳號失敗，請重試';
      toast.error(message);
    }
  });
  
  // 處理第一步表單提交
  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!password) {
      toast.error('請輸入密碼');
      return;
    }
    
    // 進入確認步驟
    setIsConfirming(true);
  };
  
  // 處理確認步驟表單提交
  const handleConfirmSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (confirmText !== 'DELETE') {
      toast.error('請輸入正確的確認文字');
      return;
    }
    
    // 執行刪除帳號操作
    deleteAccountMutation.mutate({ password });
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-red-600">刪除帳號</h2>
      
      {/* 警告信息 */}
      <div className="bg-red-50 border border-red-100 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
          <div>
            <h3 className="text-red-800 font-medium">警告：此操作無法撤銷</h3>
            <p className="mt-2 text-sm text-red-700">
              刪除帳號後，您的所有數據將被永久刪除，包括：
            </p>
            <ul className="mt-1 text-sm text-red-700 list-disc pl-5 space-y-1">
              <li>所有個人資料</li>
              <li>發布的貼文和評論</li>
              <li>作品集項目</li>
              <li>關注和被關注關係</li>
              <li>所有其他相關數據</li>
            </ul>
            <p className="mt-2 text-sm text-red-700">
              一旦刪除，這些數據將無法恢復。
            </p>
          </div>
        </div>
      </div>
      
      {!isConfirming ? (
        // 第一步：輸入密碼
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              確認密碼
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              placeholder="輸入您的密碼以確認身份"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="btn-secondary py-2 px-4"
            >
              取消
            </button>
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md"
            >
              下一步
            </button>
          </div>
        </form>
      ) : (
        // 第二步：確認刪除
        <form onSubmit={handleConfirmSubmit} className="space-y-4">
          <div>
            <label htmlFor="confirm-text" className="block text-sm font-medium text-gray-700 mb-1">
              確認刪除
            </label>
            <p className="text-sm text-gray-600 mb-2">
              請輸入 <span className="font-bold">DELETE</span> 以確認您要永久刪除您的帳號
            </p>
            <input
              id="confirm-text"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="input w-full"
              placeholder="請輸入 DELETE"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              className="btn-secondary py-2 px-4"
            >
              返回
            </button>
            <button
              type="submit"
              disabled={confirmText !== 'DELETE' || deleteAccountMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              {deleteAccountMutation.isPending ? '處理中...' : '永久刪除帳號'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default DeleteAccountForm; 