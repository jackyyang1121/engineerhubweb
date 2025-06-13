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
 * 
 * 設計原則：
 * - Narrowly focused: 專注於首頁展示和用戶互動邏輯
 * - Flexible: 支援多種內容展示模式和篩選條件
 * - Loosely coupled: 使用模組化的 API 服務，最小化組件間依賴
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
import { useAuthStore } from '../../store/authStore';
import type { TrendingTopic as ApiTrendingTopic, Post } from '../../types';

/**
 * 推薦用戶數據結構
 * 匹配後端 API 返回的用戶資料格式
 */
interface RecommendedUser {
  /** 用戶唯一識別符 */
  id: string;
  /** 用戶名（用於 @ 提及和 URL） */
  username: string;
  /** 顯示名稱（可能與用戶名不同） */
  display_name: string;
  /** 個人簡介 */
  bio: string;
  /** 頭像圖片 URL */
  avatar_url: string;
  /** 關注者數量 */
  followers_count: number;
  /** 當前用戶是否已關注此用戶 */
  is_following?: boolean;
}

/**
 * 熱門話題數據結構
 */
interface TrendingTopic {
  /** 話題名稱 */
  name: string;
  /** 話題熱度（討論次數） */
  count: number;
  /** 話題成長趨勢 */
  trend?: 'up' | 'down' | 'stable';
}

/**
 * 主頁組件
 * 整合了所有首頁相關功能的核心組件
 */
const HomePage: React.FC = () => {
  // ==================== 狀態管理 ====================
  /** 認證狀態和用戶資料 */
  const { user, isAuthenticated, token } = useAuthStore();
  /** React Query 客戶端，用於緩存管理 */
  const queryClient = useQueryClient();
  
  /** 控制貼文編輯器的顯示狀態 */
  const [showPostEditor, setShowPostEditor] = useState<boolean>(false);
  /** 熱門話題列表 */
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  /** 推薦用戶列表 */
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  /** 當前選擇的內容標籤 */
  const [activeTab, setActiveTab] = useState<'latest' | 'following' | 'trending'>('latest');
  
  // 防止重複調用的控制標誌
  const isLoadingRecommendedUsers = useRef<boolean>(false);
  const isLoadingTrendingTopics = useRef<boolean>(false);

  // ==================== 無限滾動設置 ====================
  /** 
   * 無限滾動載入檢測器
   * 當用戶滾動到頁面底部時觸發載入更多內容
   */
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0, // 觸發閾值，0 表示目標元素一進入視窗就觸發
    rootMargin: '100px', // 提前 100px 開始載入，提升用戶體驗
  });

  // ==================== 貼文數據管理 ====================
  /**
   * 使用 React Query 的無限查詢獲取推薦貼文
   * 提供自動緩存、背景更新和錯誤處理功能
   */
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingPosts,
    error: postsError,
    refetch: refetchPosts
  } = useInfiniteQuery({
    queryKey: ['feed', activeTab], // 查詢鍵，包含當前標籤以便切換時重新獲取
    queryFn: async ({ pageParam = 1 }) => {
      console.log(`🔄 載入第 ${pageParam} 頁貼文 (${activeTab} 模式)`);
      
      try {
        let response;
        
        // 根據標籤類型調用不同的 API 函數
        switch (activeTab) {
          case 'following':
            response = await getFollowingPosts(pageParam as number, 10);
            break;
          case 'trending':
            response = await getTrendingPosts(pageParam as number, 10);
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
        throw error;
      }
    },
    getNextPageParam: (lastPage) => {
      // 決定下一頁的頁碼，如果沒有更多內容則返回 undefined
      return lastPage.has_next ? lastPage.next_page : undefined;
    },
    initialPageParam: 1, // 初始頁碼
    staleTime: 5 * 60 * 1000, // 數據保鮮時間：5分鐘
    gcTime: 10 * 60 * 1000,   // 垃圾回收時間：10分鐘
    retry: 2, // 失敗重試次數
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // 指數退避重試
  });

  // ==================== 輔助功能載入 ====================
  /**
   * 載入熱門話題
   * 獲取當前 24 小時內的熱門討論話題
   */
  const loadTrendingTopics = useCallback(async (): Promise<void> => {
    // 防止重複調用
    if (isLoadingTrendingTopics.current) {
      console.log('🔄 熱門話題正在載入中，跳過重複請求');
      return;
    }
    
    isLoadingTrendingTopics.current = true;
    console.log('🔥 開始載入熱門話題...');
    
    try {
      const response = await getTrendingTopics('24h', 10);
      
      // 轉換數據格式並計算趨勢
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
      // 載入失敗時設置空數組，避免界面錯誤
      setTrendingTopics([]);
    } finally {
      isLoadingTrendingTopics.current = false;
    }
  }, []);

  /**
   * 載入推薦用戶
   * 基於用戶興趣和行為推薦相關的工程師
   */
  const loadRecommendedUsers = useCallback(async (): Promise<void> => {
    // 防止重複調用
    if (isLoadingRecommendedUsers.current) {
      console.log('🔄 推薦用戶正在載入中，跳過重複請求');
      return;
    }
    
    isLoadingRecommendedUsers.current = true;
    console.log('👥 開始載入推薦用戶...');
    
    try {
      const response = await getRecommendedUsers();
      const users = response.results || [];
      
      setRecommendedUsers(users);
      console.log(`✅ 推薦用戶載入成功: ${users.length} 位用戶`);
    } catch (error) {
      console.error('❌ 載入推薦用戶失敗:', error);
      // 載入失敗時設置空數組
      setRecommendedUsers([]);
    } finally {
      isLoadingRecommendedUsers.current = false;
    }
  }, []);

  // ==================== 用戶互動處理 ====================
  /**
   * 處理關注用戶操作
   * @param userId 要關注的用戶 ID
   */
  const handleFollowUser = useCallback(async (userId: string): Promise<void> => {
    try {
      console.log(`👥 嘗試關注用戶: ${userId}`);
      
      // TODO: 實現關注 API 調用
      // await followAPI.followUser(userId);
      
      // 樂觀更新 UI - 先更新界面，再等待服務器確認
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
      
      console.log(`✅ 成功關注用戶: ${userId}`);
    } catch (error) {
      console.error(`❌ 關注用戶失敗: ${userId}`, error);
      // TODO: 顯示錯誤提示給用戶
    }
  }, []);

  /**
   * 處理貼文創建成功
   * 新貼文發布後刷新貼文列表
   */
  const handlePostCreated = useCallback((): void => {
    console.log('📝 新貼文創建成功，刷新列表');
    
    // 關閉編輯器
    setShowPostEditor(false);
    
    // 強制重新獲取貼文數據，確保新貼文立即顯示
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    
    // 滾動到頁面頂部，讓用戶看到新發布的貼文
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [queryClient]);

  /**
   * 處理貼文刪除成功
   * 貼文刪除後刷新列表
   */
  const handlePostDeleted = useCallback((): void => {
    console.log('🗑️ 貼文刪除成功，刷新列表');
    
    // 強制重新獲取貼文數據
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  }, [queryClient]);

  /**
   * 處理標籤切換
   * @param tab 新選擇的標籤
   */
  const handleTabChange = useCallback((tab: typeof activeTab): void => {
    console.log(`🏷️ 切換到標籤: ${tab}`);
    setActiveTab(tab);
    // 切換標籤時自動滾動到頂部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ==================== 副作用處理 ====================
  /**
   * 監聽滾動，實現無限載入
   * 當用戶滾動到底部時自動載入更多貼文
   */
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      console.log('🔄 觸發無限滾動，載入更多貼文');
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  /**
   * 組件初始化時載入輔助數據
   * 載入熱門話題和推薦用戶
   */
  useEffect(() => {
    loadTrendingTopics();
    if (isAuthenticated) {
      loadRecommendedUsers();
    }
  }, [loadTrendingTopics, loadRecommendedUsers, isAuthenticated]);

  /**
   * 調試信息輸出
   * 在開發環境中幫助追蹤認證狀態
   */
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
  /**
   * 合併所有頁面的貼文數據
   * 使用 useMemo 優化性能，避免不必要的重新計算
   */
  const allPosts = useMemo(() => {
    const posts = postsData?.pages.flatMap(page => page.posts) ?? [];
    console.log(`📊 當前總共載入 ${posts.length} 篇貼文`);
    return posts;
  }, [postsData]);

  /**
   * 標籤配置
   * 定義可用的內容篩選標籤
   */
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
            
            {/* 歡迎區域 - 顯示用戶資訊和快速操作 */}
            {isAuthenticated && user && (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 mb-8 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center space-x-4">
                  {/* 用戶頭像 */}
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
                    {/* 在線狀態指示器 */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-4 border-white animate-pulse"></div>
                  </div>
                  
                  {/* 用戶資訊 */}
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
                      歡迎回來，{user.first_name || user.username}！
                    </h1>
                    <p className="text-slate-600 flex items-center">
                      <SparklesIcon className="h-4 w-4 mr-2 text-yellow-500" />
                      準備分享今天的技術心得了嗎？
                    </p>
                  </div>
                  
                  {/* 快速發文按鈕 */}
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
                    return (
                      <button
                        key={tab.key}
                        onClick={() => !tab.disabled && handleTabChange(tab.key)}
                        disabled={tab.disabled}
                        title={tab.description}
                        className={`group relative py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                          activeTab === tab.key
                            ? 'border-blue-500 text-blue-600'
                            : tab.disabled
                            ? 'border-transparent text-gray-400 cursor-not-allowed'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </div>
                        
                        {/* 禁用標籤的提示 */}
                        {tab.disabled && (
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            需要登入才能查看
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
              // 載入中狀態
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
              // 錯誤狀態
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                <div className="text-red-500 text-4xl mb-4">❌</div>
                <h3 className="text-lg font-medium text-red-800 mb-2">載入失敗</h3>
                <p className="text-red-600 mb-4">無法載入貼文，請檢查網路連接</p>
                <button
                  onClick={() => refetchPosts()}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  重新載入
                </button>
              </div>
            ) : allPosts.length === 0 ? (
                             // 空狀態
               <EmptyState
                 title="暫無貼文"
                 description="目前沒有貼文可顯示，成為第一個分享的人吧！"
                 action={
                   isAuthenticated ? {
                     label: "發布第一篇貼文",
                     onClick: () => setShowPostEditor(true)
                   } : {
                     label: "登入後開始分享",
                     onClick: () => console.log('導向登入頁面')
                   }
                 }
               />
            ) : (
              // 使用虛擬化列表渲染貼文
              <VirtualizedList
                items={allPosts}
                getItemId={(post: Post) => post.id}
                config={{
                  itemHeight: 320, // 預估貼文卡片高度
                  containerHeight: 800, // 容器高度
                  overscan: 3, // 預渲染項目數，提升滾動體驗
                  enableDynamicHeight: true, // 啟用動態高度適應不同內容
                  gap: 20 // 項目間距
                }}
                renderItem={({ item: post, isVisible, index }) => (
                  <div 
                    key={post.id}
                    className="transition-all duration-200"
                    style={{
                      // 為每個貼文添加輕微的交錯動畫
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
                       // 不可見時顯示骨架屏
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

            {/* 無限滾動觸發器 */}
            <div ref={loadMoreRef} className="h-10" />
            
          </main>

          {/* ==================== 側邊欄區域 ==================== */}
          <aside className="hidden lg:block lg:w-80 space-y-6">
            
            {/* 推薦用戶卡片 */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <UserGroupIcon className="h-5 w-5 mr-2 text-blue-500" />
                  推薦關注
                </h3>
                {recommendedUsers.length > 0 && (
                  <button
                    onClick={loadRecommendedUsers}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    刷新
                  </button>
                )}
              </div>
              
              {recommendedUsers.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <UserGroupIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm">暫無推薦用戶</p>
                  {!isAuthenticated && (
                    <p className="text-xs mt-2 text-gray-400">登入後查看推薦</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendedUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center space-x-3 group">
                      <LazyImage
                        src={user.avatar_url || '/default-avatar.png'}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                        placeholder={
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {user.username?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.display_name || user.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.followers_count} 位關注者
                        </p>
                      </div>
                      <button
                        onClick={() => handleFollowUser(user.id)}
                        disabled={user.is_following}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                          user.is_following
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                        }`}
                      >
                        {user.is_following ? '已關注' : '關注'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 熱門話題卡片 */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <FireIcon className="h-5 w-5 mr-2 text-orange-500" />
                  熱門話題
                </h3>
                {trendingTopics.length > 0 && (
                  <button
                    onClick={loadTrendingTopics}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    刷新
                  </button>
                )}
              </div>
              
              {trendingTopics.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <FireIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm">暫無熱門話題</p>
                  <p className="text-xs mt-2 text-gray-400">成為第一個發起討論的人</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trendingTopics.slice(0, 8).map((topic, index) => (
                    <div 
                      key={topic.name} 
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-600">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            #{topic.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {topic.count} 次討論
                          </p>
                        </div>
                      </div>
                      {/* 趨勢指示器 */}
                      {topic.trend && (
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          topic.trend === 'up' 
                            ? 'bg-green-100 text-green-600' 
                            : topic.trend === 'down' 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {topic.trend === 'up' ? '↗' : topic.trend === 'down' ? '↘' : '→'}
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