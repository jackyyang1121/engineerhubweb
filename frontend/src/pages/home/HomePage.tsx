/**
 * 首頁組件
 * 
 * 功能：
 * 1. 顯示個性化推薦貼文信息流
 * 2. 浮動發文按鈕
 * 3. 熱門話題側邊欄
 * 4. 推薦用戶
 * 5. 無限滾動載入
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlusIcon, SparklesIcon, UserGroupIcon, FireIcon } from '@heroicons/react/24/outline';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

import PostCard from '../../components/posts/PostCard';
import PostEditor from '../../components/posts/PostEditor';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { getFeed, getRecommendedUsers } from '../../api/postApi';
import { searchAPI } from '../../api/search';
import { useAuthStore } from '../../store/authStore';

// 推薦用戶介面
interface RecommendedUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  bio: string;
  followers_count: number;
  is_following: boolean;
}

// 熱門話題項目類型
interface TrendingTopicItem {
  name: string;
  count?: number;
  [key: string]: unknown;
}

const HomePage: React.FC = () => {
  const { user, isAuthenticated, token } = useAuthStore();
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  
  // 防止重複調用的ref
  const isLoadingRecommendedUsers = useRef(false);
  const lastLoadTime = useRef<number>(0);

  // 無限滾動載入檢測
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  // 獲取推薦貼文信息流
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getFeed(pageParam as number);
      return {
        posts: response.results || [],
        has_next: response.next !== null,
        page: pageParam as number,
        count: response.count
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_next ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5分鐘
  });

  // 載入熱門話題
  const loadTrendingTopics = useCallback(async () => {
    try {
      const response = await searchAPI.getTrendingTopics();
      // 確保 response.trending_topics 是正確的格式
      if (Array.isArray(response.trending_topics)) {
        const topics = response.trending_topics.map((topic: string | TrendingTopicItem) => 
          typeof topic === 'string' ? topic : (topic.name || String(topic))
        );
        setTrendingTopics(topics);
      } else {
        setTrendingTopics([]);
      }
    } catch (error) {
      console.error('載入熱門話題失敗:', error);
      setTrendingTopics([]);
    }
  }, []);

  // 載入推薦用戶
  const loadRecommendedUsers = useCallback(async () => {
    const now = Date.now();
    
    // 防止重複調用或短時間內重複載入（5分鐘緩存）
    if (isLoadingRecommendedUsers.current || (now - lastLoadTime.current < 5 * 60 * 1000)) {
      return;
    }
    
    isLoadingRecommendedUsers.current = true;
    console.log('🔄 開始載入推薦用戶...');
    
    try {
      const response = await getRecommendedUsers();
      console.log('✅ 推薦用戶載入成功:', response.users.length, '個用戶');
      setRecommendedUsers(response.users || []);
      lastLoadTime.current = now;
    } catch (error) {
      console.error('❌ 載入推薦用戶失敗:', error);
      setRecommendedUsers([]);
    } finally {
      isLoadingRecommendedUsers.current = false;
    }
  }, []);

  // 處理關注用戶
  const handleFollowUser = async (userId: number) => {
    try {
      // 這裡需要實現關注API
      console.log('關注用戶:', userId);
      // await followAPI.followUser(userId);
      // 更新推薦用戶列表
      setRecommendedUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, is_following: true, followers_count: user.followers_count + 1 }
            : user
        )
      );
    } catch (error) {
      console.error('關注用戶失敗:', error);
    }
  };

  // 處理貼文創建成功
  const handlePostCreated = () => {
    setShowPostEditor(false);
    refetch(); // 重新載入信息流
  };

  // 處理貼文刪除成功
  const handlePostDeleted = () => {
    refetch(); // 重新載入信息流
  };

  // 監聽滾動載入更多
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // 初始化載入
  useEffect(() => {
    loadTrendingTopics();
    loadRecommendedUsers();
  }, [loadTrendingTopics, loadRecommendedUsers]);

  // 添加調試信息
  useEffect(() => {
    console.log('🏠 HomePage 調試信息:', {
      isAuthenticated,
      hasUser: !!user,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'None',
      userId: user?.id,
      username: user?.username
    });
  }, [isAuthenticated, user, token]);

  // 合併所有頁面的貼文
  const posts = data?.pages.flatMap(page => page.posts) ?? [];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* 主要內容區 */}
          <div className="flex-1 max-w-2xl">
            {/* 歡迎信息 */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 mb-8 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src={user?.avatar || '/default-avatar.png'}
                    alt={user?.username}
                    className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-lg"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-4 border-white animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
                    歡迎回來，{user?.first_name || user?.username}！
                  </h1>
                  <p className="text-slate-600 flex items-center">
                    <SparklesIcon className="h-4 w-4 mr-2 text-yellow-500" />
                    看看今天工程師社群有什麼新動態
                  </p>
                </div>
              </div>
            </div>

            {/* 快速發文 */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-8 hover:shadow-2xl transition-all duration-300">
              <button
                onClick={() => setShowPostEditor(true)}
                className="w-full text-left px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl transition-all duration-300 border border-blue-200/50 group"
              >
                <div className="flex items-center space-x-3">
                  <PlusIcon className="h-5 w-5 text-blue-500 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="text-slate-500 group-hover:text-slate-700 transition-colors">
                    分享你的想法、程式碼或經驗...
                  </span>
                </div>
              </button>
            </div>

            {/* 貼文信息流 */}
            <div className="space-y-8">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 shadow-xl">
                    <LoadingSpinner size="lg" />
                    <p className="text-slate-600 mt-4 text-center">正在載入精彩內容...</p>
                  </div>
                </div>
              ) : posts.length > 0 ? (
                <>
                  {posts.map((post) => (
                    <div key={post.id} className="transform hover:scale-[1.02] transition-all duration-300">
                      <PostCard
                        post={post}
                        onPostDeleted={handlePostDeleted}
                      />
                    </div>
                  ))}
                  
                  {/* 載入更多 */}
                  <div ref={loadMoreRef} className="flex justify-center py-8">
                    {isFetchingNextPage && (
                      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl">
                        <LoadingSpinner size="md" />
                        <p className="text-slate-600 mt-2 text-center text-sm">載入更多內容...</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 shadow-xl">
                  <EmptyState
                    title="還沒有貼文"
                    description="成為第一個分享精彩內容的人！"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 側邊欄 */}
          <div className="w-80 space-y-6">
            {/* 熱門話題 */}
            {trendingTopics.length > 0 && (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                <h3 className="text-lg font-bold text-slate-900 flex items-center mb-4">
                  <FireIcon className="h-5 w-5 mr-2 text-orange-500" />
                  熱門話題
                </h3>
                <div className="space-y-3">
                  {trendingTopics.slice(0, 8).map((topic, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl hover:from-orange-100 hover:to-red-100 transition-all duration-300 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800 group-hover:text-slate-900">
                          #{topic}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 推薦用戶 */}
            {recommendedUsers.length > 0 && (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                <h3 className="text-lg font-bold text-slate-900 flex items-center mb-4">
                  <UserGroupIcon className="h-5 w-5 mr-2 text-blue-500" />
                  推薦工程師
                </h3>
                <div className="space-y-4">
                  {recommendedUsers.slice(0, 5).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl hover:from-blue-100 hover:to-purple-100 transition-all duration-300 group"
                    >
                      <img
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.username}
                        className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-md group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-slate-500 text-xs truncate">@{user.username}</p>
                        <p className="text-slate-400 text-xs">{user.followers_count} 關注者</p>
                      </div>
                      <button
                        onClick={() => handleFollowUser(user.id)}
                        disabled={user.is_following}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-300 ${
                          user.is_following
                            ? 'bg-green-100 text-green-700 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
                        }`}
                      >
                        {user.is_following ? '已關注' : '關注'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 發布貼文編輯器模態框 */}
      {showPostEditor && (
        <PostEditor
          onClose={() => setShowPostEditor(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
};

export default HomePage; 