/**
 * 已保存貼文頁面
 * 
 * 功能：
 * 1. 顯示用戶收藏的所有貼文
 * 2. 支援篩選和排序
 * 3. 批量管理收藏項目
 * 4. 搜尋已保存的貼文
 */

import React, { useState, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BookmarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useInView } from 'react-intersection-observer';
import { toast } from 'react-toastify';

import PostCard from '../../components/posts/PostCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

// 模擬API - 實際項目中需要替換為真實API
interface SavedPost {
  id: string;
  post: any; // 貼文對象
  saved_at: string;
  tags: string[];
  notes?: string;
}

const savedPostsAPI = {
  getSavedPosts: async (page: number = 1, _search?: string, _sortBy?: string): Promise<{
    results: SavedPost[];
    has_next: boolean;
    total_count: number;
  }> => {
    // 模擬網路延遲
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 模擬資料
    const mockPosts = Array.from({ length: 5 }, (_, i) => ({
      id: `saved-${page}-${i}`,
      post: {
        id: `post-${page}-${i}`,
        content: `這是一個很棒的技術分享貼文 ${page}-${i}。包含了許多實用的程式設計技巧。`,
        code_snippet: page % 2 === 0 ? 'const hello = () => console.log("Hello World!");' : null,
        code_language: 'javascript',
        author_details: {
          username: `engineer${i}`,
          first_name: `Engineer${i}`,
          last_name: 'Dev',
          avatar: null
        },
        media: [],
        likes_count: Math.floor(Math.random() * 100),
        comments_count: Math.floor(Math.random() * 50),
        shares_count: Math.floor(Math.random() * 20),
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_liked: false,
        is_saved: true
      },
      saved_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['React', 'JavaScript', 'Web開發'].slice(0, Math.floor(Math.random() * 3) + 1),
      notes: i % 3 === 0 ? '這篇文章的重點很實用' : undefined
    }));

    return {
      results: mockPosts,
      has_next: page < 3,
      total_count: 15
    };
  },

  unsavePosts: async (_postIds: string[]): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
  },

  addNotesToSavedPost: async (_savedPostId: string, _notes: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
  }
};

const SavedPostsPage: React.FC = () => {
  const queryClient = useQueryClient();
  
  // 狀態管理
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'saved_at' | 'created_at' | 'likes_count'>('saved_at');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // 無限滾動檢測
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  // 獲取已保存貼文
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['savedPosts', searchQuery, sortBy],
    queryFn: async ({ pageParam = 1 }) => {
      return savedPostsAPI.getSavedPosts(pageParam, searchQuery, sortBy);
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.has_next ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });

  // 批量取消收藏
  const unsavePostsMutation = useMutation({
    mutationFn: savedPostsAPI.unsavePosts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedPosts'] });
      setSelectedPosts([]);
      setIsSelectionMode(false);
      toast.success('已從收藏中移除');
    },
    onError: () => {
      toast.error('操作失敗，請重試');
    }
  });

  // 處理搜尋
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  }, [refetch]);

  // 處理排序變更
  const handleSortChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy);
  };

  // 處理貼文選擇
  const handlePostSelect = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  // 處理全選
  const handleSelectAll = () => {
    const allPostIds = savedPosts.map(item => item.id);
    if (selectedPosts.length === allPostIds.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(allPostIds);
    }
  };

  // 處理批量取消收藏
  const handleBatchUnsave = () => {
    if (selectedPosts.length === 0) {
      toast.warning('請先選擇要移除的貼文');
      return;
    }

    const confirmMessage = `確定要從收藏中移除 ${selectedPosts.length} 篇貼文嗎？`;
    if (window.confirm(confirmMessage)) {
      unsavePostsMutation.mutate(selectedPosts);
    }
  };

  // 處理載入更多
  React.useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // 格式化時間
  const formatSavedTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 合併所有頁面的貼文
  const savedPosts = data?.pages.flatMap(page => page.results) ?? [];
  const totalCount = data?.pages[0]?.total_count ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" text="載入收藏內容..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BookmarkSolidIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">已保存的貼文</h1>
              <p className="text-sm text-gray-600">共 {totalCount} 篇收藏</p>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              篩選
            </button>
            
            <button
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                isSelectionMode
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSelectionMode ? (
                <>
                  <XMarkIcon className="h-5 w-5 mr-2" />
                  取消選擇
                </>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5 mr-2" />
                  管理收藏
                </>
              )}
            </button>
          </div>
        </div>

        {/* 搜尋和篩選 */}
        <div className="mb-6 space-y-4">
          {/* 搜尋框 */}
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="搜尋已保存的貼文..."
            />
          </form>

          {/* 篩選和排序選項 */}
          {showFilters && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">排序方式：</span>
                <div className="flex space-x-2">
                  {[
                    { key: 'saved_at', label: '收藏時間' },
                    { key: 'created_at', label: '發布時間' },
                    { key: 'likes_count', label: '點讚數' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => handleSortChange(key as typeof sortBy)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        sortBy === key
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 批量操作欄 */}
        {isSelectionMode && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPosts.length === savedPosts.length && savedPosts.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {selectedPosts.length === savedPosts.length && savedPosts.length > 0 ? '取消全選' : '全選'}
                  </span>
                </label>
                
                {selectedPosts.length > 0 && (
                  <span className="text-sm text-gray-600">
                    已選擇 {selectedPosts.length} 項
                  </span>
                )}
              </div>

              {selectedPosts.length > 0 && (
                <button
                  onClick={handleBatchUnsave}
                  disabled={unsavePostsMutation.isPending}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <TrashIcon className="h-5 w-5 mr-2" />
                  移除收藏
                </button>
              )}
            </div>
          </div>
        )}

        {/* 貼文列表 */}
        <div className="space-y-6">
          {savedPosts.length === 0 ? (
            <EmptyState
              icon={BookmarkIcon}
              title={searchQuery ? "找不到相關收藏" : "尚無收藏貼文"}
              description={
                searchQuery 
                  ? "試試搜尋其他關鍵字"
                  : "開始收藏有價值的技術分享和討論！點擊貼文的書籤圖示即可收藏。"
              }
            />
          ) : (
            <>
              {savedPosts.map((savedPost) => (
                <div key={savedPost.id} className="relative">
                  {/* 收藏信息條 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-t-lg px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {isSelectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedPosts.includes(savedPost.id)}
                          onChange={() => handlePostSelect(savedPost.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      )}
                      
                      <div className="flex items-center text-sm text-blue-700">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        收藏於 {formatSavedTime(savedPost.saved_at)}
                      </div>
                      
                      {savedPost.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          {savedPost.tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {savedPost.notes && (
                      <div className="text-xs text-blue-600">
                        📝 {savedPost.notes}
                      </div>
                    )}
                  </div>

                  {/* 貼文卡片 */}
                  <div className="border-l border-r border-b border-gray-200 rounded-b-lg">
                    <PostCard 
                      post={savedPost.post}
                      onPostUpdated={refetch}
                      onPostDeleted={refetch}
                    />
                  </div>
                </div>
              ))}

              {/* 載入更多觸發器 */}
              <div ref={loadMoreRef} className="py-4">
                {isFetchingNextPage && (
                  <div className="flex justify-center">
                    <LoadingSpinner text="載入更多收藏..." />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 統計信息 */}
        {savedPosts.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            顯示 {savedPosts.length} / {totalCount} 篇收藏
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPostsPage; 