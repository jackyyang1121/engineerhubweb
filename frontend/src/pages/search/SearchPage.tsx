import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

import PostCard from '../../components/posts/PostCard';
import UserCard from '../../components/users/UserCard';
import * as searchApi from '../../api/searchApi';

type SearchTab = 'posts' | 'users' | 'all';

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<SearchTab>(
    (searchParams.get('tab') as SearchTab) || 'all'
  );
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  // 從本地存儲加載搜索歷史
  useEffect(() => {
    const history = localStorage.getItem('search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);
  
  // 保存搜索歷史到本地存儲
  const saveSearchToHistory = (query: string) => {
    if (!query.trim()) return;
    
    const newHistory = [
      query,
      ...searchHistory.filter(item => item !== query)
    ].slice(0, 10); // 只保留最近10條
    
    setSearchHistory(newHistory);
    localStorage.setItem('search_history', JSON.stringify(newHistory));
  };
  
  // 清除搜索歷史
  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('search_history');
    toast.success('搜索歷史已清除');
  };
  
  // 從歷史記錄中刪除單個項目
  const removeFromHistory = (query: string) => {
    const newHistory = searchHistory.filter(item => item !== query);
    setSearchHistory(newHistory);
    localStorage.setItem('search_history', JSON.stringify(newHistory));
  };

  // 搜索所有內容
  const { 
    data: allResults,
    isLoading: isLoadingAll,
  } = useQuery({
    queryKey: ['search', 'all', queryParam],
    queryFn: () => searchApi.searchAll(queryParam),
    enabled: !!queryParam && activeTab === 'all',
  });
  
  // 只搜索貼文
  const { 
    data: postsResults,
    isLoading: isLoadingPosts,
  } = useQuery({
    queryKey: ['search', 'posts', queryParam],
    queryFn: () => searchApi.searchPosts(queryParam),
    enabled: !!queryParam && activeTab === 'posts',
  });
  
  // 只搜索用戶
  const { 
    data: usersResults,
    isLoading: isLoadingUsers,
  } = useQuery({
    queryKey: ['search', 'users', queryParam],
    queryFn: () => searchApi.searchUsers(queryParam),
    enabled: !!queryParam && activeTab === 'users',
  });
  
  // 處理搜索提交
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // 更新 URL 參數
    setSearchParams({ q: searchQuery, tab: activeTab });
    
    // 保存到歷史
    saveSearchToHistory(searchQuery);
  };
  
  // 點擊歷史記錄項
  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    setSearchParams({ q: query, tab: activeTab });
    saveSearchToHistory(query);
  };
  
  // 切換標籤
  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    setSearchParams({ q: queryParam, tab });
  };
  
  // 重設搜索
  const handleResetSearch = () => {
    setSearchQuery('');
    setSearchParams({});
  };
  
  const isLoading = isLoadingAll || isLoadingPosts || isLoadingUsers;
  const hasResults = 
    (activeTab === 'all' && allResults && (allResults.posts.length > 0 || allResults.users.length > 0)) ||
    (activeTab === 'posts' && postsResults && postsResults.length > 0) ||
    (activeTab === 'users' && usersResults && usersResults.length > 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">搜索</h1>
        
        {/* 搜索表單 */}
        <form onSubmit={handleSearch} className="flex items-center">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索貼文、用戶、技能標籤..."
              className="input pl-10 pr-4 py-3 w-full"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={handleResetSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          <button 
            type="submit"
            className="btn-primary ml-2 py-3 px-4"
            disabled={!searchQuery.trim()}
          >
            搜索
          </button>
        </form>
      </div>
      
      {/* 沒有搜索查詢時顯示歷史記錄 */}
      {!queryParam && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-medium">最近搜索</h2>
            {searchHistory.length > 0 && (
              <button
                onClick={clearSearchHistory}
                className="text-sm text-gray-500 hover:text-red-500"
              >
                清除全部
              </button>
            )}
          </div>
          
          {searchHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">尚無搜索記錄</p>
          ) : (
            <ul className="space-y-2">
              {searchHistory.map((query, index) => (
                <li 
                  key={index}
                  className="flex items-center justify-between group"
                >
                  <button
                    onClick={() => handleHistoryClick(query)}
                    className="flex-grow text-left py-2 hover:text-primary-600"
                  >
                    {query}
                  </button>
                  <button
                    onClick={() => removeFromHistory(query)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {/* 有搜索查詢時顯示結果 */}
      {queryParam && (
        <>
          {/* 標籤頁導航 */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex space-x-8">
              <button
                className={`py-4 text-base font-medium border-b-2 ${
                  activeTab === 'all' 
                    ? 'border-primary-600 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => handleTabChange('all')}
              >
                全部
              </button>
              <button
                className={`py-4 text-base font-medium border-b-2 ${
                  activeTab === 'posts' 
                    ? 'border-primary-600 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => handleTabChange('posts')}
              >
                貼文
              </button>
              <button
                className={`py-4 text-base font-medium border-b-2 ${
                  activeTab === 'users' 
                    ? 'border-primary-600 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => handleTabChange('users')}
              >
                用戶
              </button>
            </div>
          </div>
          
          {/* 搜索結果 */}
          <div>
            {isLoading ? (
              <div className="text-center py-10">
                <p className="text-gray-500">正在搜索...</p>
              </div>
            ) : !hasResults ? (
              <div className="text-center py-10 bg-white rounded-lg shadow">
                <p className="text-gray-600">沒有找到符合條件的結果</p>
                <p className="text-gray-500 text-sm mt-2">嘗試不同的關鍵詞或搜索條件</p>
              </div>
            ) : (
              <>
                {/* 全部結果 */}
                {activeTab === 'all' && allResults && (
                  <>
                    {/* 用戶結果 */}
                    {allResults.users.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-medium mb-4">用戶</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {allResults.users.map(user => (
                            <UserCard key={user.id} user={user} />
                          ))}
                        </div>
                        {allResults.users_count > allResults.users.length && (
                          <div className="mt-4 text-center">
                            <button
                              onClick={() => handleTabChange('users')}
                              className="text-primary-600 hover:text-primary-700"
                            >
                              查看所有 {allResults.users_count} 個用戶結果
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 貼文結果 */}
                    {allResults.posts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-4">貼文</h3>
                        <div className="space-y-4">
                          {allResults.posts.map(post => (
                            <PostCard key={post.id} post={post} />
                          ))}
                        </div>
                        {allResults.posts_count > allResults.posts.length && (
                          <div className="mt-4 text-center">
                            <button
                              onClick={() => handleTabChange('posts')}
                              className="text-primary-600 hover:text-primary-700"
                            >
                              查看所有 {allResults.posts_count} 個貼文結果
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {/* 只有貼文結果 */}
                {activeTab === 'posts' && postsResults && (
                  <div className="space-y-4">
                    {postsResults.map(post => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
                
                {/* 只有用戶結果 */}
                {activeTab === 'users' && usersResults && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {usersResults.map(user => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SearchPage; 