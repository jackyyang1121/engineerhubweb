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

import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon, SparklesIcon, UserGroupIcon } from '@heroicons/react/24/outline';
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

// 熱門話題介面
interface TrendingTopic {
  name: string;
  posts_count: number;
  trend_direction: 'up' | 'down' | 'stable';
}



const HomePage: React.FC = () => {
  const { user } = useAuthStore();
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  
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
        const topics = response.trending_topics.map((topic: any) => ({
          name: typeof topic === 'string' ? topic : topic.name || topic,
          posts_count: topic.posts_count || 0,
          trend_direction: topic.trend_direction || 'stable'
        }));
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
    try {
      const response = await getRecommendedUsers();
      setRecommendedUsers(response.users || []);
    } catch (error) {
      console.error('載入推薦用戶失敗:', error);
      setRecommendedUsers([]);
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

  // 合併所有頁面的貼文
  const posts = data?.pages.flatMap(page => page.posts) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* 主要內容區 */}
          <div className="flex-1 max-w-2xl">
            {/* 歡迎信息 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center space-x-3">
                <img
                  src={user?.avatar || '/default-avatar.png'}
                  alt={user?.username}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    歡迎回來，{user?.first_name || user?.username}！
                  </h1>
                  <p className="text-gray-600">看看今天工程師社群有什麼新動態</p>
                </div>
              </div>
            </div>

            {/* 快速發文 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <button
                onClick={() => setShowPostEditor(true)}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="text-gray-500">分享你的想法、程式碼或經驗...</span>
              </button>
            </div>

            {/* 貼文信息流 */}
            <div className="space-y-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : posts.length > 0 ? (
                <>
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onPostUpdated={refetch}
                      onPostDeleted={refetch}
                    />
                  ))}
                  
                  {/* 載入更多觸發器 */}
                  <div ref={loadMoreRef} className="py-4">
                    {isFetchingNextPage && (
                      <div className="flex justify-center">
                        <LoadingSpinner />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={SparklesIcon}
                  title="尚無貼文"
                  description="成為第一個分享內容的人，或者關注一些工程師來看到更多內容！"
                  action={{
                    label: '立即發文',
                    onClick: () => setShowPostEditor(true)
                  }}
                />
              )}
            </div>
          </div>

          {/* 右側邊欄 */}
          <div className="hidden lg:block w-80 space-y-6">
            {/* 熱門話題 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2 text-yellow-500" />
                熱門話題
              </h3>
              <div className="space-y-3">
                {trendingTopics.slice(0, 5).map((topic, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">#{topic.name}</div>
                      <div className="text-sm text-gray-500">{topic.posts_count} 篇貼文</div>
                    </div>
                    <div className={`text-sm ${
                      topic.trend_direction === 'up' 
                        ? 'text-green-500' 
                        : topic.trend_direction === 'down'
                        ? 'text-red-500'
                        : 'text-gray-500'
                    }`}>
                      {topic.trend_direction === 'up' && '↗️'}
                      {topic.trend_direction === 'down' && '↘️'}
                      {topic.trend_direction === 'stable' && '➡️'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 推薦用戶 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserGroupIcon className="w-5 h-5 mr-2 text-blue-500" />
                推薦關注
              </h3>
              <div className="space-y-4">
                {recommendedUsers.slice(0, 3).map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                        <div className="text-xs text-gray-400">
                          {user.followers_count} 個關注者
                        </div>
                      </div>
                    </div>
                    {!user.is_following && (
                      <button
                        onClick={() => handleFollowUser(user.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        關注
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 開發者資訊 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">EngineerHub</h3>
              <p className="text-sm opacity-90 mb-4">
                專屬於工程師的技術交流社群，分享程式碼、討論技術、展示作品。
              </p>
              <div className="text-xs opacity-75">
                版本 1.0.0 • Made with ❤️ by Engineers
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 浮動發文按鈕 */}
      <button
        onClick={() => setShowPostEditor(true)}
        className="fixed bottom-6 right-6 lg:hidden w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-50"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* 發文模態框 */}
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