import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';


interface HeaderProps {
  className?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  mobile?: boolean;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { 
    theme, 
    setTheme, 
    setSearchQuery,
    notifications,
    toggleNotifications
  } = useUIStore();
  
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 導航項目
  const navigation: NavigationItem[] = [
    { name: '首頁', href: '/' },
    { name: '探索', href: '/explore' },
    { name: '關注', href: '/following' },
    { name: '收藏', href: '/saved' },
  ];

  // 主題選項
  const themeOptions = [
    { key: 'light' as const, name: '淺色主題', icon: SunIcon },
    { key: 'dark' as const, name: '深色主題', icon: MoonIcon },
    { key: 'auto' as const, name: '跟隨系統', icon: ComputerDesktopIcon },
  ];

  // 點擊外部關閉菜單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 搜索處理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setSearchQuery(searchValue.trim());
      navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
      searchInputRef.current?.blur();
    }
  };

  // 登出處理
  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  // 是否是當前頁面
  const isCurrentPage = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  // 獲取當前主題圖標
  const getCurrentThemeIcon = () => {
    const option = themeOptions.find(opt => opt.key === theme);
    return option ? option.icon : ComputerDesktopIcon;
  };

  const CurrentThemeIcon = getCurrentThemeIcon();

  return (
    <header className={`sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* 左側：Logo 和導航 */}
          <div className="flex items-center space-x-8">
            {/* 移動端菜單按鈕 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="打開菜單"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>

            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center space-x-2 font-bold text-xl text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">EH</span>
              </div>
              <span className="hidden sm:block">EngineerHub</span>
            </Link>

            {/* 桌面端導航 */}
            <nav className="hidden md:flex space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isCurrentPage(item.href)
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* 中間：搜索框 */}
          <div className="flex-1 max-w-lg mx-4">
            <form onSubmit={handleSearch} className="relative">
              <div className={`relative transition-all duration-200 ${
                isSearchFocused ? 'transform scale-105' : ''
              }`}>
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="搜索貼文、用戶或標籤..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-full text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </form>
          </div>

          {/* 右側：用戶操作 */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {/* 創建貼文按鈕 */}
                <Link
                  to="/create"
                  className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors font-medium"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>發文</span>
                </Link>

                {/* 通知按鈕 */}
                <button 
                  onClick={toggleNotifications}
                  className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  aria-label="通知"
                >
                  <BellIcon className="h-6 w-6" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.length > 99 ? '99+' : notifications.length}
                    </span>
                  )}
                </button>

                {/* 聊天按鈕 */}
                <Link
                  to="/messages"
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  aria-label="聊天"
                >
                  <ChatBubbleLeftRightIcon className="h-6 w-6" />
                </Link>

                {/* 主題切換 */}
                <div className="relative" ref={themeMenuRef}>
                  <button
                    onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="切換主題"
                  >
                    <CurrentThemeIcon className="h-6 w-6" />
                  </button>

                  {/* 主題選擇菜單 */}
                  {isThemeMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      {themeOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <button
                            key={option.key}
                            onClick={() => {
                              setTheme(option.key);
                              setIsThemeMenuOpen(false);
                            }}
                            className={`flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              theme === option.key ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <IconComponent className="h-4 w-4 mr-3" />
                            {option.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 用戶菜單 */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center space-x-2 p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="用戶菜單"
                  >
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name || user.username}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="h-8 w-8" />
                    )}
                  </button>

                  {/* 用戶菜單下拉 */}
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      {/* 用戶信息 */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                          {user?.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.display_name || user.username}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <UserCircleIcon className="h-10 w-10 text-gray-400" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {user?.display_name || user?.first_name || user?.username}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.username}</p>
                          </div>
                        </div>
                      </div>

                      {/* 菜單項 */}
                      <div className="py-1">
                        <Link
                          to={`/profile/${user?.username}`}
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <UserCircleIcon className="h-4 w-4 mr-3" />
                          個人資料
                        </Link>
                        
                        <Link
                          to="/settings"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Cog6ToothIcon className="h-4 w-4 mr-3" />
                          設置
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                          登出
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* 未登入狀態 */
              <div className="flex items-center space-x-3">
                {/* 主題切換（未登入時也可用） */}
                <div className="relative" ref={themeMenuRef}>
                  <button
                    onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="切換主題"
                  >
                    <CurrentThemeIcon className="h-6 w-6" />
                  </button>

                  {isThemeMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      {themeOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <button
                            key={option.key}
                            onClick={() => {
                              setTheme(option.key);
                              setIsThemeMenuOpen(false);
                            }}
                            className={`flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              theme === option.key ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <IconComponent className="h-4 w-4 mr-3" />
                            {option.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Link
                  to="/auth/login"
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  登入
                </Link>
                <Link
                  to="/auth/register"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors font-medium"
                >
                  註冊
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 移動端菜單 */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isCurrentPage(item.href)
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              {isAuthenticated && (
                <Link
                  to="/create"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>發文</span>
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header; 