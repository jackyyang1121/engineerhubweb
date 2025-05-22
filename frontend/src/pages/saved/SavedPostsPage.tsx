/**
 * 已儲存貼文頁面
 * 
 * 功能：
 * 1. 顯示用戶收藏的所有貼文
 * 2. 支援搜尋已儲存的貼文
 * 3. 按日期、類型篩選
 * 4. 批量取消收藏
 * 5. 無限滾動載入
 */

import React, { useState, useEffect } from 'react';
import { 
  BookmarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  CheckIcon,
  CodeBracketIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { toast } from 'react-toastify';

import PostCard from '../../components/posts/PostCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { getSavedPosts, unsavePost } from '../../api/postApi';



const SavedPostsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'code' | 'media' | 'text'>('all');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'saved_date' | 'post_date' | 'likes'>('saved_date');

  // 無限滾動載入檢測
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  // 獲取已儲存的貼文
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['savedPosts', searchQuery, selectedFilter, sortBy],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getSavedPosts(pageParam as number, 10);
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

  // 取消收藏(尚未實現此功能)


  // 批量取消收藏
  const batchUnsaveMutation = useMutation({
    mutationFn: async (postIds: string[]) => {
      await Promise.all(postIds.map(id => unsavePost(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedPosts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setSelectedPosts([]);
      toast.success('已批量取消收藏');
    },
    onError: () => {
      toast.error('批量操作失敗，請重試');
    }
  });

  // 合併所有頁面的貼文
  const posts = data?.pages.flatMap(page => page.posts) ?? [];
  const totalCount = data?.pages[0]?.count ?? 0;

  // 過濾貼文
  const filteredPosts = posts.filter(post => {
    // 搜尋過濾
    if (searchQuery) {
      const searchTarget = `${post.content} ${post.code_snippet || ''}`.toLowerCase();
      if (!searchTarget.includes(searchQuery.toLowerCase())) {
        return false;
      }
    }

    // 類型過濾
    switch (selectedFilter) {
      case 'code':
        return post.code_snippet && post.code_snippet.trim().length > 0;
      case 'media':
        return post.media && post.media.length > 0;
      case 'text':
        return (!post.code_snippet || post.code_snippet.trim().length === 0) && 
               (!post.media || post.media.length === 0);
      default:
        return true;
    }
  });

  // 監聽滾動載入更多
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // 處理貼文選擇
  const handlePostSelect = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  // 全選/取消全選
  const handleSelectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map(post => post.id));
    }
  };

  // 批量取消收藏
  const handleBatchUnsave = () => {
    if (selectedPosts.length === 0) {
      toast.warning('請先選擇要取消收藏的貼文');
      return;
    }

    if (window.confirm(`確定要取消收藏 ${selectedPosts.length} 篇貼文嗎？`)) {
      batchUnsaveMutation.mutate(selectedPosts);
    }
  };

  // 格式化數量
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" text="載入已儲存的貼文..." />
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
              <h1 className="text-2xl font-bold text-gray-900">已儲存的貼文</h1>
              <p className="text-sm text-gray-600">
                共收藏了 {formatCount(totalCount)} 篇貼文
                {selectedPosts.length > 0 && (
                  <span className="ml-2">• 已選擇 {selectedPosts.length} 篇</span>
                )}
              </p>
            </div>
          </div>

          {/* 篩選按鈕 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            篩選
          </button>
        </div>

        {/* 搜尋和篩選區域 */}
        <div className="space-y-4 mb-6">
          {/* 搜尋框 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="搜尋已儲存的貼文..."
            />
          </div>

          {/* 篩選選項 */}
          {showFilters && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              {/* 內容類型篩選 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">內容類型</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: '全部', icon: null },
                    { key: 'code', label: '包含程式碼', icon: CodeBracketIcon },
                    { key: 'media', label: '包含圖片/影片', icon: PhotoIcon },
                    { key: 'text', label: '純文字', icon: null }
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedFilter(filter.key as any)}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedFilter === filter.key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {filter.icon && <filter.icon className="h-4 w-4 mr-1" />}
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 排序選項 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">排序方式</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'saved_date', label: '收藏時間' },
                    { key: 'post_date', label: '發布時間' },
                    { key: 'likes', label: '點讚數' }
                  ].map((sort) => (
                    <button
                      key={sort.key}
                      onClick={() => setSortBy(sort.key as any)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        sortBy === sort.key
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {sort.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 批量操作欄 */}
        {selectedPosts.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm text-blue-800">
                  已選擇 {selectedPosts.length} 篇貼文
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  {selectedPosts.length === filteredPosts.length ? '取消全選' : '全選'}
                </button>
                <button
                  onClick={handleBatchUnsave}
                  disabled={batchUnsaveMutation.isPending}
                  className="flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  取消收藏
                </button>
                <button
                  onClick={() => setSelectedPosts([])}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                >
                  清除選擇
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 貼文列表 */}
        <div className="space-y-6">
          {filteredPosts.length === 0 ? (
            <EmptyState
              icon={BookmarkIcon}
              title={searchQuery ? "找不到相關貼文" : "尚未收藏任何貼文"}
              description={
                searchQuery 
                  ? "試試搜尋其他關鍵字或調整篩選條件"
                  : "開始收藏你感興趣的貼文，方便日後查看！"
              }
              action={
                searchQuery || selectedFilter !== 'all' ? {
                  label: "清除篩選",
                  onClick: () => {
                    setSearchQuery('');
                    setSelectedFilter('all');
                  }
                } : undefined
              }
            />
          ) : (
            <>
              {filteredPosts.map((post) => (
                <div key={post.id} className="relative">
                  {/* 選擇框 */}
                  <div className="absolute top-4 left-4 z-10">
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(post.id)}
                      onChange={() => handlePostSelect(post.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* 貼文卡片 */}
                  <div className="ml-8">
                    <PostCard
                      post={post}
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
                    <LoadingSpinner />
                  </div>
                )}
              </div>

              {/* 統計信息 */}
              <div className="text-center text-sm text-gray-500 pt-4">
                {searchQuery || selectedFilter !== 'all' ? (
                  <p>
                    搜尋結果：{filteredPosts.length} 篇貼文
                    {totalCount > filteredPosts.length && (
                      <span className="ml-2">（共 {formatCount(totalCount)} 篇收藏）</span>
                    )}
                  </p>
                ) : (
                  <p>
                    已顯示 {filteredPosts.length} / {formatCount(totalCount)} 篇貼文
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPostsPage; 