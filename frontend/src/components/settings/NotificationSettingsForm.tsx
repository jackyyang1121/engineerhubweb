import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';

// 通知選項類型
interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  value: boolean;
}

const NotificationSettingsForm = () => {
  // 通知設置狀態
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([
    {
      id: 'new_follower',
      title: '新關注者',
      description: '有人開始關注你時收到通知',
      value: true
    },
    {
      id: 'post_like',
      title: '貼文點讚',
      description: '有人點讚你的貼文時收到通知',
      value: true
    },
    {
      id: 'post_comment',
      title: '貼文評論',
      description: '有人評論你的貼文時收到通知',
      value: true
    },
    {
      id: 'comment_reply',
      title: '評論回覆',
      description: '有人回覆你的評論時收到通知',
      value: true
    },
    {
      id: 'comment_like',
      title: '評論點讚',
      description: '有人點讚你的評論時收到通知',
      value: false
    },
    {
      id: 'new_message',
      title: '新私信',
      description: '收到新私信時收到通知',
      value: true
    },
    {
      id: 'post_mention',
      title: '貼文提及',
      description: '有人在貼文中提及你時收到通知',
      value: true
    },
    {
      id: 'comment_mention',
      title: '評論提及',
      description: '有人在評論中提及你時收到通知',
      value: true
    },
    {
      id: 'system_notification',
      title: '系統通知',
      description: '收到系統更新、新功能及重要公告',
      value: true
    }
  ]);
  
  // 模擬更新通知設置
  const updateNotificationsMutation = useMutation({
    mutationFn: async (settings: Record<string, boolean>) => {
      // TODO: 調用實際的API
      console.log('保存的通知設置:', settings);
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success('通知設置已更新');
    },
    onError: () => {
      toast.error('更新通知設置失敗，請重試');
    }
  });
  
  // 處理通知設置變更
  const handleNotificationChange = (id: string, value: boolean) => {
    setNotificationSettings(
      notificationSettings.map(setting => 
        setting.id === id ? { ...setting, value } : setting
      )
    );
  };
  
  // 全選/取消全選
  const handleToggleAll = (value: boolean) => {
    setNotificationSettings(
      notificationSettings.map(setting => ({ ...setting, value }))
    );
  };
  
  // 保存設置
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 轉換成 key-value 格式
    const settings = Object.fromEntries(
      notificationSettings.map(setting => [setting.id, setting.value])
    );
    
    updateNotificationsMutation.mutate(settings);
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">通知設置</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* 全選/取消全選 */}
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="text-sm text-primary-600 hover:text-primary-700 mr-4"
            >
              全選
            </button>
            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              取消全選
            </button>
          </div>
          
          {/* 通知選項列表 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            {notificationSettings.map(setting => (
              <div key={setting.id} className="flex items-start">
                <div className="flex items-center h-6">
                  <input
                    id={setting.id}
                    type="checkbox"
                    checked={setting.value}
                    onChange={(e) => handleNotificationChange(setting.id, e.target.checked)}
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
          
          {/* 接收方式設置 */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium mb-4">接收方式</h3>
            
            {/* Email通知 */}
            <div className="flex items-start mb-4">
              <div className="flex items-center h-6">
                <input
                  id="email_notifications"
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="email_notifications" className="text-sm font-medium text-gray-700">
                  Email通知
                </label>
                <p className="text-xs text-gray-500">
                  將通知發送到您的電子郵件
                </p>
              </div>
            </div>
            
            {/* 瀏覽器推送通知 */}
            <div className="flex items-start mb-4">
              <div className="flex items-center h-6">
                <input
                  id="push_notifications"
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="push_notifications" className="text-sm font-medium text-gray-700">
                  瀏覽器推送通知
                </label>
                <p className="text-xs text-gray-500">
                  在您的瀏覽器顯示推送通知
                </p>
              </div>
            </div>
          </div>
          
          {/* 提交按鈕 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateNotificationsMutation.isPending}
              className="btn-primary py-2 px-4"
            >
              {updateNotificationsMutation.isPending ? '保存中...' : '保存變更'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NotificationSettingsForm; 