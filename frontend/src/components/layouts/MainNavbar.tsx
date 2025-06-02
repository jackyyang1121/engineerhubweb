import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import CreatePostModal from '../posts/CreatePostModal';
import {
  HomeIcon,
  HashtagIcon,
  BellIcon,
  EnvelopeIcon,
  UserIcon,
  Cog6ToothIcon,
  BookmarkIcon,
  ArrowRightStartOnRectangleIcon,
  DocumentPlusIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  HashtagIcon as HashtagIconSolid,
  BellIcon as BellIconSolid,
  EnvelopeIcon as EnvelopeIconSolid,
  UserIcon as UserIconSolid,
  BookmarkIcon as BookmarkIconSolid,
} from '@heroicons/react/24/solid';

const MainNavbar = () => {
  const location = useLocation();
  const [showPostModal, setShowPostModal] = useState(false);
  const { user, logout } = useAuthStore(state => ({
    user: state.user,
    logout: state.logout
  }));
  
  // 是否當前路徑激活
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  // 導航項配置
  const navItems = [
    {
      name: '首頁',
      path: '/',
      icon: isActive('/') ? <HomeIconSolid className="h-5 w-5" /> : <HomeIcon className="h-5 w-5" />,
    },
    {
      name: '發現',
      path: '/explore',
      icon: isActive('/explore') ? <HashtagIconSolid className="h-5 w-5" /> : <HashtagIcon className="h-5 w-5" />,
    },
    {
      name: '通知',
      path: '/notifications',
      icon: isActive('/notifications') ? <BellIconSolid className="h-5 w-5" /> : <BellIcon className="h-5 w-5" />,
    },
    {
      name: '消息',
      path: '/messages',
      icon: isActive('/messages') ? <EnvelopeIconSolid className="h-5 w-5" /> : <EnvelopeIcon className="h-5 w-5" />,
    },
    {
      name: '個人資料',
      path: user ? `/profile/${user.username}` : '/profile',
      icon: isActive(`/profile/${user?.username}`) ? <UserIconSolid className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />,
    },
    {
      name: '已保存',
      path: '/saved',
      icon: isActive('/saved') ? <BookmarkIconSolid className="h-5 w-5" /> : <BookmarkIcon className="h-5 w-5" />,
    }
  ];

  return (
    <div className="fixed h-full w-72 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 backdrop-blur-xl border-r border-slate-700/50 py-6 px-4 shadow-2xl">
      {/* Logo 區域 */}
      <div className="mb-10 px-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-lg">EH</span>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              EngineerHub
            </h1>
            <p className="text-xs text-slate-400">工程師專屬社群</p>
          </div>
        </div>
      </div>
      
      {/* 導航菜單 */}
      <nav className="space-y-2 mb-8">
        {navItems.map((item) => {
          const isItemActive = item.path === location.pathname;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105 ${
                isItemActive 
                  ? 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 text-white shadow-lg backdrop-blur-sm border border-blue-500/30' 
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {/* 激活狀態的發光效果 */}
              {isItemActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-xl blur-xl"></div>
              )}
              
              <span className={`relative z-10 mr-4 transition-all duration-300 ${
                isItemActive ? 'text-blue-400 scale-110' : 'group-hover:scale-110'
              }`}>
                {item.icon}
              </span>
              
              <span className="relative z-10 transition-all duration-300">
                {item.name}
              </span>
              
              {/* 激活狀態的側邊指示器 */}
              {isItemActive && (
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-l-full"></div>
              )}
            </Link>
          );
        })}
        
        {/* 發布貼文按鈕 */}
        <button
          onClick={() => setShowPostModal(true)}
          className="w-full mt-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white py-4 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg group"
        >
          <DocumentPlusIcon className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform duration-300" />
          <span className="font-semibold">發布貼文</span>
        </button>
      </nav>
      
      {/* 底部區域 */}
      <div className="absolute bottom-6 left-4 right-4">
        {/* 設置和登出按鈕 */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <Link
            to="/settings"
            className="p-3 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </Link>
          
          <button
            onClick={() => logout()}
            className="p-3 text-slate-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-xl transition-all duration-300 hover:scale-110"
          >
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* 用戶信息卡片 */}
        {user && (
          <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=gradient`}
                  alt={user.username}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-white/20"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{user.username}</p>
                <p className="text-slate-400 text-xs truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 發布貼文模態框 */}
      <CreatePostModal 
        isOpen={showPostModal} 
        onClose={() => setShowPostModal(false)} 
      />
    </div>
  );
};

export default MainNavbar; 