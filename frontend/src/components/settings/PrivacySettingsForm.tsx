import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { logger } from '../../utils/logger';

// 隱私選項類型
interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  value: boolean;
}

// 隱私可見度類型
type Visibility = 'public' | 'followers' | 'none';

interface VisibilitySetting {
  id: string;
  title: string;
  description: string;
  value: Visibility;
}

// 隱私設置數據類型
interface PrivacySettingsData {
  privacy: Record<string, boolean>;
  visibility: Record<string, Visibility>;
}

const PrivacySettingsForm = () => {
  // 隱私設置狀態
  const [privacySettings, setPrivacySettings] = useState<PrivacySetting[]>([
    {
      id: 'account_private',
      title: '私密帳號',
      description: '只有您批准的關注者才能看到您的貼文和資料',
      value: false
    },
    {
      id: 'hide_online_status',
      title: '隱藏在線狀態',
      description: '不顯示您的在線狀態',
      value: false
    },
    {
      id: 'hide_activity_status',
      title: '隱藏活動狀態',
      description: '不顯示您最近的活動狀態',
      value: false
    },
    {
      id: 'disable_mention',
      title: '禁止他人提及我',
      description: '其他用戶將無法在貼文和評論中提及您',
      value: false
    }
  ]);
  
  // 可見度設置狀態
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySetting[]>([
    {
      id: 'profile_visibility',
      title: '個人資料可見性',
      description: '誰可以看到您的個人資料',
      value: 'public'
    },
    {
      id: 'email_visibility',
      title: '郵箱地址可見性',
      description: '誰可以看到您的郵箱地址',
      value: 'none'
    },
    {
      id: 'portfolio_visibility',
      title: '作品集可見性',
      description: '誰可以看到您的作品集項目',
      value: 'public'
    }
  ]);
  
  // 黑名單用戶（演示數據）
  const [blockedUsers] = useState([
    { id: '1', username: 'blocked_user1', avatar: 'https://ui-avatars.com/api/?name=B1&background=random' },
    { id: '2', username: 'blocked_user2', avatar: 'https://ui-avatars.com/api/?name=B2&background=random' }
  ]);
  
  // 模擬更新隱私設置
  const updatePrivacyMutation = useMutation({
    mutationFn: async (settings: PrivacySettingsData) => {
      // 這裡應該調用實際的API
      logger.info('settings', '保存的隱私設置', settings);
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success('隱私設置已更新');
    },
    onError: () => {
      toast.error('更新隱私設置失敗，請重試');
    }
  });
  
  // 處理布爾值隱私選項變更
  const handlePrivacyChange = (id: string, value: boolean) => {
    setPrivacySettings(
      privacySettings.map(setting => 
        setting.id === id ? { ...setting, value } : setting
      )
    );
  };
  
  // 處理可見度選項變更
  const handleVisibilityChange = (id: string, value: Visibility) => {
    setVisibilitySettings(
      visibilitySettings.map(setting => 
        setting.id === id ? { ...setting, value } : setting
      )
    );
  };
  
  // 處理解除黑名單
  const handleUnblockUser = (userId: string) => {
    if (window.confirm('確定要將此用戶從黑名單中移除嗎？')) {
      unblockUserMutation.mutate(userId);
    }
  };
  
  // 保存設置
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 合併所有設置
    const settings = {
      privacy: Object.fromEntries(
        privacySettings.map(setting => [setting.id, setting.value])
      ),
      visibility: Object.fromEntries(
        visibilitySettings.map(setting => [setting.id, setting.value])
      )
    };
    
    updatePrivacyMutation.mutate(settings);
  };

  // 模擬解除黑名單操作
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // 這裡應該調用實際的API
      logger.info('settings', '解除黑名單用戶', { userId });
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success('已從黑名單中移除用戶');
    },
    onError: () => {
      toast.error('操作失敗，請重試');
    }
  });

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold mb-4">隱私設置</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
          {/* 基本隱私設置 */}
          <div>
            <h3 className="text-lg font-medium mb-4">基本隱私</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {privacySettings.map(setting => (
                <div key={setting.id} className="flex items-start">
                  <div className="flex items-center h-6">
                    <input
                      id={setting.id}
                      type="checkbox"
                      checked={setting.value}
                      onChange={(e) => handlePrivacyChange(setting.id, e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor={setting.id} className="text-sm font-medium text-gray-700">
                      {setting.title}
                    </label>
                    <p className="text-xs text-gray-500">
                      {setting.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 可見度設置 */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium mb-4">資料可見度</h3>
            
            <div className="space-y-6">
              {visibilitySettings.map(setting => (
                <div key={setting.id} className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {setting.title}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    {setting.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={setting.id}
                        checked={setting.value === 'public'}
                        onChange={() => handleVisibilityChange(setting.id, 'public')}
                        className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">所有人</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={setting.id}
                        checked={setting.value === 'followers'}
                        onChange={() => handleVisibilityChange(setting.id, 'followers')}
                        className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">僅我的關注者</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={setting.id}
                        checked={setting.value === 'none'}
                        onChange={() => handleVisibilityChange(setting.id, 'none')}
                        className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">不公開</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 黑名單管理 */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium mb-4">黑名單管理</h3>
            
            {blockedUsers.length > 0 ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  您已將以下用戶添加到黑名單。被您屏蔽的用戶將無法查看您的貼文、資料或向您發送私信。
                </p>
                
                <div className="space-y-3">
                  {blockedUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center">
                        <img 
                          src={user.avatar} 
                          alt={user.username} 
                          className="w-10 h-10 rounded-full mr-3"
                        />
                        <span className="text-sm font-medium">{user.username}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnblockUser(user.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        解除黑名單
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                您的黑名單中沒有用戶。
              </p>
            )}
          </div>
          
          {/* 提交按鈕 */}
          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={updatePrivacyMutation.isPending}
              className="btn-primary py-2 px-4"
            >
              {updatePrivacyMutation.isPending ? '保存中...' : '保存變更'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PrivacySettingsForm; 