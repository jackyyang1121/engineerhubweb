/**
 * EngineerHub - 首頁組件 (重構版)
 * 
 * 職責與功能：
 * 1. 顯示個性化推薦貼文信息流 - 根據用戶興趣和行為推薦內容
 * 2. 浮動發文按鈕 - 便於用戶快速創建新貼文
 * 3. 熱門話題側邊欄 - 展示當前熱門討論主題
 * 4. 推薦用戶功能 - 幫助用戶發現感興趣的其他工程師
 * 5. 無限滾動載入 - 提供流暢的瀏覽體驗
 * 6. 虛擬化列表優化 - 提升大量數據時的性能表現
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PlusIcon, SparklesIcon, UserGroupIcon, FireIcon } from '@heroicons/react/24/outline';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

// 組件導入 - 確保路徑正確且功能完整
import PostCard from '../../components/posts/PostCard';
import PostEditor from '../../components/posts/PostEditor';
import EmptyState from '../../components/common/EmptyState';
import { VirtualizedList } from '../../components/ui/VirtualizedList';
import { LazyImage } from '../../components/ui/LazyImage';

// API 服務導入 - 統一的數據獲取接口
import { getFeed, getFollowingPosts, getTrendingPosts, getRecommendedUsers } from '../../api/postApi';
import { getTrendingTopics } from '../../api/searchApi';
import { followUser } from '../../api/userApi';
import { useAuthStore } from '../../store/authStore';
import type { TrendingTopic as ApiTrendingTopic, Post } from '../../types';

// CSS 動畫樣式
const animationStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

// 將動畫樣式注入到頁面
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = animationStyles;
  document.head.appendChild(style);
}

/**
 * 推薦用戶接口定義
 */
interface RecommendedUser {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  followers_count: number;
  is_following?: boolean;
}

/**
 * 熱門話題數據結構
 */
interface TrendingTopic {
  name: string;
  count: number;
  trend?: 'up' | 'down' | 'stable';
}

/**
 * 主頁組件
 */
const HomePage: React.FC = () => {
  // ==================== 狀態管理 ====================
  const { user, isAuthenticated, token } = useAuthStore();
  const queryClient = useQueryClient();
  
  // 貼文相關狀態
  const [showPostEditor, setShowPostEditor] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'latest' | 'following' | 'trending'>('latest');
  
  // 側邊欄相關狀態
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  
  // 防止重複調用的控制標誌
  const isLoadingTopics = useRef<boolean>(false);

  // ==================== 無限滾動設置 ====================
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // ==================== 貼文數據管理 ====================
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingPosts,
    error: postsError,
    refetch: refetchPosts
  } = useInfiniteQuery({
    queryKey: ['feed', activeTab],
    queryFn: async ({ pageParam = 1 }) => {
      console.log(`🔄 載入第 ${pageParam} 頁貼文 (${activeTab} 模式)`);
      
      try {
        let response;
        
        switch (activeTab) {
          case 'following':
            response = await getFollowingPosts(pageParam as number, 10);
            break;
          case 'trending':
            try {
              response = await getTrendingPosts(pageParam as number, 10);
            } catch (trendingError) {
              console.warn('⚠️ 熱門貼文 API 失敗，回退到最新貼文:', trendingError);
              // 如果熱門 API 失敗，回退到最新貼文
              response = await getFeed(pageParam as number, 10);
            }
            break;
          default:
            response = await getFeed(pageParam as number, 10);
            break;
        }
        
        console.log(`✅ 成功載入 ${response.results?.length || 0} 篇貼文`);
        
        return {
          posts: response.results || [],
          has_next: response.next !== null,
          page: pageParam as number,
          count: response.count,
          next_page: response.next ? pageParam + 1 : undefined,
        };
      } catch (error) {
        console.error(`❌ 載入第 ${pageParam} 頁貼文失敗:`, error);
        
        // 如果是第一頁且不是 latest 模式，嘗試回退到 latest 模式
        if (pageParam === 1 && activeTab !== 'latest') {
          console.log('🔄 嘗試回退到最新貼文模式');
          try {
            const fallbackResponse = await getFeed(pageParam as number, 10);
            console.log(`✅ 回退成功，載入 ${fallbackResponse.results?.length || 0} 篇貼文`);
            return {
              posts: fallbackResponse.results || [],
              has_next: fallbackResponse.next !== null,
              page: pageParam as number,
              count: fallbackResponse.count,
              next_page: fallbackResponse.next ? pageParam + 1 : undefined,
            };
          } catch (fallbackError) {
            console.error('❌ 回退也失敗了:', fallbackError);
          }
        }
        
        throw error;
      }
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_next ? lastPage.next_page : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      // 對於伺服器錯誤，減少重試次數
      const errorMessage = error?.message || '';
      if (errorMessage.includes('500') || errorMessage.includes('伺服器')) {
        return failureCount < 1; // 只重試一次
      }
      return failureCount < 2; // 其他錯誤重試兩次
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });

  // ==================== 輔助功能載入 ====================
  const loadTrendingTopics = useCallback(async (): Promise<void> => {
    if (isLoadingTopics.current) {
      console.log('🔄 熱門話題正在載入中，跳過重複請求');
      return;
    }
    
    isLoadingTopics.current = true;
    console.log('🔥 開始載入熱門話題...');
    
    try {
      const response = await getTrendingTopics('24h', 10);
      
      const topics: TrendingTopic[] = response.trending_topics.map((topic: ApiTrendingTopic) => ({
        name: topic.name,
        count: topic.count || 0,
        trend: topic.growth_rate && topic.growth_rate > 0 ? 'up' : 
               topic.growth_rate && topic.growth_rate < 0 ? 'down' : 'stable',
      }));
      
      setTrendingTopics(topics);
      console.log(`✅ 熱門話題載入成功: ${topics.length} 個話題`);
    } catch (error) {
      console.error('❌ 載入熱門話題失敗:', error);
      setTrendingTopics([]);
    } finally {
      isLoadingTopics.current = false;
    }
  }, []);

  const loadRecommendedUsers = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      console.log('👤 用戶未登入，載入模擬推薦用戶');
      setRecommendedUsers(generateMockUsers());
      return;
    }

    try {
      console.log('👥 開始載入推薦用戶...');
      setIsLoadingUsers(true);

      const response = await getRecommendedUsers();
      const realUsers = response.results || [];
      console.log(`✅ 成功載入 ${realUsers.length} 個真實推薦用戶`);

      let combinedUsers = [...realUsers];
      if (combinedUsers.length < 8) {
        const mockUsers = generateMockUsers();
        const additionalUsers = mockUsers.slice(0, 12 - combinedUsers.length);
        combinedUsers = [...combinedUsers, ...additionalUsers];
        console.log(`📝 添加了 ${additionalUsers.length} 個模擬用戶，總共 ${combinedUsers.length} 個推薦用戶`);
      }

      const shuffledUsers = combinedUsers.sort(() => Math.random() - 0.5);
      
      setRecommendedUsers(shuffledUsers);
      console.log(`✅ 推薦用戶載入完成，總數: ${shuffledUsers.length}`);

    } catch (error) {
      console.error('❌ 載入推薦用戶失敗:', error);
      
      console.log('🔄 回退到模擬推薦用戶');
      setRecommendedUsers(generateMockUsers());
      
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAuthenticated]);

  /**
   * 生成模擬推薦用戶（臨時使用，直到有更多真實用戶）
   */
  const generateMockUsers = useCallback((): RecommendedUser[] => {
    const mockUsers: RecommendedUser[] = [
      {
        id: 'mock-1',
        username: 'alex_frontend',
        display_name: 'Alex Chen',
        bio: '前端工程師，專精 React 和 TypeScript 開發',
        avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=alex',
        followers_count: 1234,
        is_following: false
      },
      {
        id: 'mock-2',
        username: 'sarah_backend',
        display_name: 'Sarah Liu',
        bio: '後端架構師，Python 和 Django 專家',
        avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=sarah',
        followers_count: 856,
        is_following: false
      },
      {
        id: 'mock-3',
        username: 'mike_devops',
        display_name: 'Mike Wang',
        bio: 'DevOps 工程師，專注於 AWS 和容器化技術',
        avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=mike',
        followers_count: 1567,
        is_following: false
      },
      {
        id: 'mock-4',
        username: 'linda_ai',
        display_name: 'Linda Zhang',
        bio: 'AI/ML 工程師，深度學習研究者',
        avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=linda',
        followers_count: 2341,
        is_following: false
      },
      {
        id: 'mock-5',
        username: 'david_mobile',
        display_name: 'David Lee',
        bio: 'iOS/Android 開發者，React Native 愛好者',
        avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=david',
        followers_count: 987,
        is_following: false
      },
      {
        id: 'mock-6',
        username: 'emma_design',
        display_name: 'Emma Taylor',
        bio: 'UI/UX 設計師，專注於用戶體驗設計',
        avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=emma',
        followers_count: 1456,
        is_following: false
      },
      {
        id: 'mock-7',
        username: 'kevin_security',
        display_name: 'Kevin Chen',
        bio: '資安專家，網路安全顧問',
        avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=kevin',
        followers_count: 1789,
        is_following: false
      },
      {
        id: 'mock-8',
        username: 'jane_data',
        display_name: 'Jane Wu',
        bio: '資料科學家，大數據分析專家',
        avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=jane',
        followers_count: 1123,
        is_following: false
      }
    ];
    
    return mockUsers;
  }, []);

  // ==================== 用戶互動處理 ====================
  const handleFollowUser = useCallback(async (userId: string): Promise<void> => {
    try {
      console.log(`👥 嘗試關注用戶: ${userId}`);
      
      const targetUser = recommendedUsers.find(user => user.id === userId);
      if (!targetUser) {
        console.error('❌ 找不到目標用戶');
        return;
      }
      
      setRecommendedUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                is_following: true, 
                followers_count: user.followers_count + 1 
              }
            : user
        )
      );
      
      await followUser(userId);
      
      console.log(`✅ 成功關注用戶: ${userId}`);
      
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`已關注 ${targetUser.display_name || targetUser.username}`);
      }
    } catch (error) {
      console.error(`❌ 關注用戶失敗: ${userId}`, error);
      
      setRecommendedUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                is_following: false, 
                followers_count: Math.max(0, user.followers_count - 1)
              }
            : user
        )
      );
      
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('關注失敗，請重試');
      }
    }
  }, [recommendedUsers]);

  const handlePostCreated = useCallback((): void => {
    console.log('📝 新貼文創建成功，刷新列表');
    
    setShowPostEditor(false);
    
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [queryClient]);

  const handlePostDeleted = useCallback((): void => {
    console.log('🗑️ 貼文刪除成功，刷新列表');
    
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  }, [queryClient]);

  const handleTabChange = useCallback((tab: typeof activeTab): void => {
    console.log(`🏷️ 切換到標籤: ${tab}`);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ==================== 副作用處理 ====================
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      console.log('🔄 觸發無限滾動，載入更多貼文');
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    loadTrendingTopics();
    if (isAuthenticated) {
      loadRecommendedUsers();
    }
  }, [loadTrendingTopics, loadRecommendedUsers, isAuthenticated]);

  useEffect(() => {
    console.log('🏠 HomePage 組件狀態:', {
      isAuthenticated,
      hasUser: !!user,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'None',
      userId: user?.id,
      username: user?.username,
      activeTab,
    });
  }, [isAuthenticated, user, token, activeTab]);

  // ==================== 數據處理 ====================
  const allPosts = useMemo(() => {
    const posts = postsData?.pages.flatMap(page => page.posts) ?? [];
    console.log(`📊 當前總共載入 ${posts.length} 篇貼文`);
    return posts;
  }, [postsData]);

  const tabs = useMemo(() => [
    { 
      key: 'latest' as const, 
      label: '最新', 
      icon: SparklesIcon,
      description: '查看最新發布的貼文' 
    },
    { 
      key: 'following' as const, 
      label: '關注', 
      icon: UserGroupIcon,
      disabled: !isAuthenticated,
      description: '查看您關注的用戶的貼文' 
    },
    { 
      key: 'trending' as const, 
      label: '熱門', 
      icon: FireIcon,
      description: '查看當前熱門的貼文' 
    },
  ], [isAuthenticated]);

  // ==================== 渲染邏輯 ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          
          {/* ==================== 主要內容區域 ==================== */}
          <main className="flex-1 max-w-2xl">
            
            {/* 歡迎區域 */}
            {isAuthenticated && user && (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 mb-8 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <LazyImage
                      src={user.avatar || '/default-avatar.png'}
                      alt={user.username}
                      className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-lg"
                      placeholder={
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 border-4 border-white shadow-lg flex items-center justify-center">
                          <span className="text-white text-xl font-bold">
                            {user.username?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      }
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-4 border-white animate-pulse"></div>
                  </div>
                  
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
                      歡迎回來，{user.first_name || user.username}！
                    </h1>
                    <p className="text-slate-600 flex items-center">
                      <SparklesIcon className="h-4 w-4 mr-2 text-yellow-500" />
                      準備分享今天的技術心得了嗎？
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setShowPostEditor(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>發布貼文</span>
                  </button>
                </div>
              </div>
            )}

            {/* 內容標籤切換 */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 mb-6">
              <div className="border-b border-gray-200/50">
                <nav className="flex space-x-8 px-6" aria-label="內容篩選標籤">
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const hasError = postsError && activeTab === tab.key;
                    
                    return (
                      <button
                        key={tab.key}
                        onClick={() => !tab.disabled && handleTabChange(tab.key)}
                        disabled={tab.disabled}
                        title={tab.description}
                        className={`group relative py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                          activeTab === tab.key
                            ? hasError 
                              ? 'border-red-500 text-red-600'
                              : 'border-blue-500 text-blue-600'
                            : tab.disabled
                            ? 'border-transparent text-gray-400 cursor-not-allowed'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{tab.label}</span>
                          {hasError && tab.key === 'trending' && (
                            <span className="text-xs text-red-500">⚠️</span>
                          )}
                        </div>
                        
                        {tab.disabled && (
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            需要登入才能查看
                          </div>
                        )}
                        
                        {hasError && tab.key === 'trending' && (
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                            服務暫時不可用
                          </div>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* 貼文列表渲染 */}
            {isLoadingPosts ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, index) => (
                  <div 
                    key={index} 
                    className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 animate-pulse"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : postsError ? (
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200/50 rounded-2xl p-8 text-center shadow-lg">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-bold text-red-800 mb-2">載入失敗</h3>
                <p className="text-red-600 mb-6 max-w-md mx-auto">
                  {activeTab === 'trending' ? 
                    '熱門貼文服務暫時不可用，請嘗試其他標籤或稍後再試' : 
                    activeTab === 'following' ? 
                    '無法載入關注用戶的貼文，請檢查網路連接' :
                    '無法載入貼文，請檢查網路連接'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => refetchPosts()}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    重新載入
                  </button>
                  {activeTab !== 'latest' && (
                    <button
                      onClick={() => handleTabChange('latest')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      查看最新貼文
                    </button>
                  )}
                </div>
              </div>
            ) : allPosts.length === 0 ? (
              <EmptyState
                title={
                  activeTab === 'following' ? '尚未關注任何人' :
                  activeTab === 'trending' ? '暫無熱門貼文' :
                  '暫無貼文'
                }
                description={
                  activeTab === 'following' ? 
                    '關注一些感興趣的工程師，查看他們的最新動態！' :
                  activeTab === 'trending' ? 
                    '目前沒有熱門貼文，或許可以創建一篇爆款內容？' :
                    '目前沒有貼文可顯示，成為第一個分享的人吧！'
                }
                action={
                  activeTab === 'following' && isAuthenticated ? {
                    label: "探索推薦用戶",
                    onClick: () => {
                      // 滾動到推薦用戶區域
                      const sidebar = document.querySelector('[data-sidebar="recommendations"]');
                      if (sidebar) {
                        sidebar.scrollIntoView({ behavior: 'smooth' });
                      }
                    }
                  } : isAuthenticated ? {
                    label: "發布第一篇貼文",
                    onClick: () => setShowPostEditor(true)
                  } : {
                    label: "登入後開始分享",
                    onClick: () => console.log('導向登入頁面')
                  }
                }
              />
            ) : (
              <VirtualizedList
                items={allPosts}
                getItemId={(post: Post) => post.id}
                config={{
                  itemHeight: 320,
                  containerHeight: 800,
                  overscan: 3,
                  enableDynamicHeight: true,
                  gap: 20
                }}
                renderItem={({ item: post, isVisible, index }) => (
                  <div 
                    key={post.id}
                    className="transition-all duration-200"
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {isVisible ? (
                      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                        <PostCard
                          post={post}
                          onPostDeleted={handlePostDeleted}
                        />
                      </div>
                    ) : (
                      <div className="bg-gray-100/50 rounded-2xl animate-pulse h-80 border border-gray-200/50" />
                    )}
                  </div>
                )}
                onLoadMore={() => {
                  if (hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                  }
                }}
                hasMore={hasNextPage}
                isLoading={isFetchingNextPage}
                loadingComponent={
                  <div className="flex items-center justify-center space-x-3 text-blue-600 p-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="font-medium">載入更多精彩內容...</span>
                  </div>
                }
                className="space-y-6"
              />
            )}

            <div ref={loadMoreRef} className="h-10" />
            
          </main>

          {/* ==================== 側邊欄區域 ==================== */}
          <aside className="hidden lg:block lg:w-80 space-y-6">
            
            {/* 推薦用戶卡片 */}
            <div 
              data-sidebar="recommendations"
              className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UserGroupIcon className="h-5 w-5 text-gray-600 mr-2" />
                  推薦關注
                </h3>
                {recommendedUsers.length > 0 && (
                  <button
                    onClick={loadRecommendedUsers}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    刷新
                  </button>
                )}
              </div>
              
              {isLoadingUsers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-500">載入中...</p>
                </div>
              ) : recommendedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-3">暫無推薦用戶</p>
                  <button
                    onClick={loadRecommendedUsers}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    重新載入
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendedUsers.slice(0, 6).map((user) => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* 簡化頭像 - 只使用字母頭像 */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-semibold">
                            {(user.display_name || user.username)?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.followers_count.toLocaleString()} 關注者
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleFollowUser(user.id)}
                        disabled={user.is_following}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex-shrink-0 ${
                          user.is_following
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                        }`}
                      >
                        {user.is_following ? '已關注' : '關注'}
                      </button>
                    </div>
                  ))}
                  
                  {recommendedUsers.length > 6 && (
                    <div className="text-center pt-2">
                      <button className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                        查看更多推薦
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 熱門話題卡片 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FireIcon className="h-5 w-5 text-gray-600 mr-2" />
                  熱門話題
                </h3>
                {trendingTopics.length > 0 && (
                  <button
                    onClick={loadTrendingTopics}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    刷新
                  </button>
                )}
              </div>
            
              {trendingTopics.length === 0 ? (
                <div className="text-center py-8">
                  <FireIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">暫無熱門話題</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trendingTopics.slice(0, 8).map((topic, index) => (
                    <div 
                      key={topic.name} 
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-semibold">
                            {index + 1}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            #{topic.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {topic.count.toLocaleString()} 次討論
                          </p>
                        </div>
                      </div>
                      
                      {topic.trend && topic.trend === 'up' && (
                        <div className="text-xs text-green-600 flex-shrink-0">
                          ↗ 上升
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </aside>
        </div>
      </div>

      {/* ==================== 浮動發文按鈕 ==================== */}
      {isAuthenticated && !showPostEditor && (
        <button
          onClick={() => setShowPostEditor(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 flex items-center justify-center z-40"
          title="發布新貼文"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      )}

      {/* ==================== 貼文編輯器模態框 ==================== */}
      {showPostEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <PostEditor
              onPostCreated={handlePostCreated}
              onClose={() => setShowPostEditor(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage; 