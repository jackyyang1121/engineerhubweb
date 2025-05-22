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
  ArrowLeftOnRectangleIcon,
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
      icon: isActive('/') ? <HomeIconSolid className="h-6 w-6" /> : <HomeIcon className="h-6 w-6" />,
    },
    {
      name: '發現',
      path: '/explore',
      icon: isActive('/explore') ? <HashtagIconSolid className="h-6 w-6" /> : <HashtagIcon className="h-6 w-6" />,
    },
    {
      name: '通知',
      path: '/notifications',
      icon: isActive('/notifications') ? <BellIconSolid className="h-6 w-6" /> : <BellIcon className="h-6 w-6" />,
    },
    {
      name: '消息',
      path: '/messages',
      icon: isActive('/messages') ? <EnvelopeIconSolid className="h-6 w-6" /> : <EnvelopeIcon className="h-6 w-6" />,
    },
    {
      name: '個人資料',
      path: user ? `/profile/${user.username}` : '/profile',
      icon: isActive(`/profile/${user?.username}`) ? <UserIconSolid className="h-6 w-6" /> : <UserIcon className="h-6 w-6" />,
    },
    {
      name: '已保存',
      path: '/saved',
      icon: isActive('/saved') ? <BookmarkIconSolid className="h-6 w-6" /> : <BookmarkIcon className="h-6 w-6" />,
    }
  ];

  return (
    <div className="fixed h-full w-64 border-r border-gray-200 bg-white py-4 px-2">
      <div className="mb-8 px-4">
        <h1 className="text-2xl font-bold text-primary-600">EngineerHub</h1>
      </div>
      
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-3 text-base font-medium rounded-full hover:bg-gray-100 ${
              item.path === location.pathname ? 'text-primary-600' : 'text-gray-700'
            }`}
          >
            <span className="mr-4">{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        ))}
        
        <button
          onClick={() => setShowPostModal(true)}
          className="w-full mt-4 btn-primary py-3 rounded-full flex items-center justify-center"
        >
          <DocumentPlusIcon className="h-5 w-5 mr-2" />
          <span>發布貼文</span>
        </button>
      </nav>
      
      <div className="absolute bottom-8 w-full px-2">
        <div className="flex items-center justify-between px-4 py-2">
          <Link
            to="/settings"
            className="text-gray-700 hover:text-primary-600 flex items-center"
          >
            <Cog6ToothIcon className="h-6 w-6" />
          </Link>
          
          <button
            onClick={() => logout()}
            className="text-gray-700 hover:text-primary-600 flex items-center"
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-6" />
          </button>
        </div>
        
        {user && (
          <div className="mt-4 flex items-center p-4 bg-gray-50 rounded-lg">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
              alt={user.username}
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <p className="font-medium text-sm">{user.username}</p>
              <p className="text-gray-500 text-xs">{user.email}</p>
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