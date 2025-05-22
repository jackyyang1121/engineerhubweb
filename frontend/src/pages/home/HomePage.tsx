import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { toast } from 'react-toastify';

import PostCard from '../../components/posts/PostCard';
import CreatePostModal from '../../components/posts/CreatePostModal';
import * as postApi from '../../api/postApi';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState<'following' | 'trending'>('following');
  const [showPostModal, setShowPostModal] = useState(false);
  const { ref, inView } = useInView();
  
  // 獲取貼文數據
  const { 
    data, 
    isLoading, 
    isError, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['posts', activeTab],
    queryFn: async ({ pageParam = 1 }) => {
      if (activeTab === 'following') {
        return await postApi.getFollowingPosts(pageParam);
      } else {
        return await postApi.getTrendingPosts(pageParam);
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        // 從URL中提取頁碼
        const nextUrl = new URL(lastPage.next);
        return parseInt(nextUrl.searchParams.get('page') || '1');
      }
      return undefined;
    },
    initialPageParam: 1,
  });
  
  // 當用戶滾動到底部時加載更多貼文
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);
  
  // 刷新貼文列表
  const handleRefresh = () => {
    refetch();
    toast.success('貼文已刷新');
  };
  
  // 切換標籤
  const handleTabChange = (tab: 'following' | 'trending') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };
  
  // 處理發布新貼文
  const handleNewPost = () => {
    setShowPostModal(true);
  };
  
  // 處理貼文發布成功
  const handlePostCreated = () => {
    refetch();
    toast.success('貼文已發布');
  };

  return (
    <div>
      {/* 頭部導航欄 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-6">
          <button
            className={`text-lg font-medium ${
              activeTab === 'following' 
                ? 'text-primary-600 border-b-2 border-primary-600' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => handleTabChange('following')}
          >
            關注
          </button>
          <button
            className={`text-lg font-medium ${
              activeTab === 'trending' 
                ? 'text-primary-600 border-b-2 border-primary-600' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => handleTabChange('trending')}
          >
            熱門
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={handleRefresh}
            className="btn-secondary py-2 px-3"
          >
            刷新
          </button>
          <button 
            onClick={handleNewPost}
            className="btn-primary py-2 px-3"
          >
            發布貼文
          </button>
        </div>
      </div>
      
      {/* 貼文列表 */}
      <div className="max-w-2xl mx-auto">
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-gray-500">加載中...</p>
          </div>
        )}
        
        {isError && (
          <div className="text-center py-8">
            <p className="text-red-500">加載失敗，請檢查網絡連接</p>
            <button 
              onClick={() => refetch()} 
              className="mt-4 btn-primary py-2 px-4"
            >
              重試
            </button>
          </div>
        )}
        
        {data?.pages.map((page, i) => (
          <div key={i}>
            {page.results.map(post => (
              <PostCard key={post.id} post={post} onPostUpdated={() => refetch()} />
            ))}
          </div>
        ))}
        
        {data?.pages[0]?.results.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'following' ? '還沒有關注任何人' : '暫無熱門貼文'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {activeTab === 'following' 
                ? '開始關注一些用戶，以便在這裡查看他們的貼文' 
                : '暫時還沒有熱門貼文，請稍後再來查看'}
            </p>
            {activeTab === 'following' && (
              <button 
                onClick={() => handleTabChange('trending')}
                className="btn-primary py-2 px-4"
              >
                瀏覽熱門貼文
              </button>
            )}
          </div>
        )}
        
        {/* 無限滾動加載指示器 */}
        {hasNextPage && (
          <div ref={ref} className="py-4 text-center">
            {isFetchingNextPage ? '加載更多...' : ''}
          </div>
        )}
        
        {!hasNextPage && (data?.pages[0]?.results?.length ?? 0) > 0 && (
          <div className="py-4 text-center text-gray-500">
            已經到底了
          </div>
        )}
      </div>
      
      {/* 發布貼文模態框 */}
      <CreatePostModal 
        isOpen={showPostModal} 
        onClose={() => setShowPostModal(false)} 
        onPostCreated={handlePostCreated}
      />
    </div>
  );
};

export default HomePage; 