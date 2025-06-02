import { useState } from 'react';import { useNavigate } from 'react-router-dom';import { toast } from 'react-toastify';
import {
  UserIcon,
  LockClosedIcon,
  BellIcon,
  ShieldCheckIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';

import ProfileSettingsForm from '../../components/settings/ProfileSettingsForm';
import AccountSettingsForm from '../../components/settings/AccountSettingsForm';
import NotificationSettingsForm from '../../components/settings/NotificationSettingsForm';
import PrivacySettingsForm from '../../components/settings/PrivacySettingsForm'; 
import DeleteAccountForm from '../../components/settings/DeleteAccountForm';
import { useAuthStore } from '../../store/authStore';


// 設置頁標籤類型
type SettingsTab = 
  | 'profile' 
  | 'account' 
  | 'notifications' 
  | 'privacy' 
  | 'delete_account';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  
  // 登出功能
  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('已成功登出');
  };
  
  // 如果未登入，重定向到登入頁面
  if (!user) {
    navigate('/login');
    return null;
  }
  
  // 設置頁標籤列表
  const tabs = [
    { id: 'profile', name: '個人資料', icon: UserIcon },
    { id: 'account', name: '帳號設置', icon: LockClosedIcon },
    { id: 'notifications', name: '通知設置', icon: BellIcon },
    { id: 'privacy', name: '隱私設置', icon: ShieldCheckIcon },
    { id: 'delete_account', name: '刪除帳號', icon: ArrowRightStartOnRectangleIcon, danger: true },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">帳號設置</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* 側邊標籤欄 */}
        <div className="md:w-1/4">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <nav className="flex flex-col">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`flex items-center px-4 py-3 text-left ${
                    activeTab === tab.id 
                      ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500' 
                      : tab.danger 
                        ? 'text-red-600 hover:bg-red-50' 
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-3" />
                  <span>{tab.name}</span>
                </button>
              ))}
              
              {/* 登出按鈕 */}
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-3 text-left text-gray-700 hover:bg-gray-50 mt-4 border-t border-gray-200"
              >
                <ArrowRightStartOnRectangleIcon className="h-5 w-5 mr-3" />
                <span>登出</span>
              </button>
            </nav>
          </div>
        </div>
        
        {/* 主要內容區 */}
        <div className="md:w-3/4">
          <div className="bg-white rounded-lg shadow p-6">
            {activeTab === 'profile' && <ProfileSettingsForm />}
            {activeTab === 'account' && <AccountSettingsForm />}
            {activeTab === 'notifications' && <NotificationSettingsForm />}
            {activeTab === 'privacy' && <PrivacySettingsForm />}
            {activeTab === 'delete_account' && <DeleteAccountForm />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 