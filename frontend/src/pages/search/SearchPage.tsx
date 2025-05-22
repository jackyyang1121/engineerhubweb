/**
 * 搜尋頁面
 * 
 * 功能包括：
 * 1. 即時搜尋建議
 * 2. 用戶和貼文搜尋
 * 3. 搜尋歷史管理
 * 4. 熱門話題顯示
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  FireIcon,
  UserIcon,
  DocumentTextIcon,
  HashtagIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { HeartIcon, ChatBubbleLeftIcon, EyeIcon } from '@heroicons/react/24/solid';

import { searchAPI } from '../../api/search';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

interface SearchUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  avatar: string | null;
  skills: string[];
  followers_count: number;
  posts_count: number;
  is_online: boolean;
}

interface SearchPost {
  id: string;
  content: string;
  code_snippet: string | null;
  code_language: string;
  author: {
    id: number;
    username: string;
    avatar: string | null;
  };
  created_at: string;
  likes_count: number;
  comments_count: number;
  has_media: boolean;
  media_count: number;
}

interface SearchResults {
  query: string;
  type: string;
  users: SearchUser[];
  posts: SearchPost[];
  total_users: number;
  total_posts: number;
  search_time: number;
  suggestions: string[];
}

interface SearchHistory {
  id: string;
  query: string;
  search_type: string;
  results_count: number;
  created_at: string;
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 狀態管理
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState(searchParams.get('type') || 'all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 防抖搜尋建議
  const debouncedGetSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await searchAPI.getSuggestions(searchQuery);
        setSuggestions(response.suggestions);
      } catch (error) {
        console.error('獲取搜尋建議失敗:', error);
        setSuggestions([]);
      }
    }, 300),
    []
  );

  // 執行搜尋
  const performSearch = useCallback(async (searchQuery: string, type: string = 'all') => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await searchAPI.search(searchQuery, type);
      setResults(response);
      
      // 更新URL參數
      setSearchParams({ q: searchQuery, type });
      
      // 刷新搜尋歷史
      loadSearchHistory();
    } catch (error) {
      console.error('搜尋失敗:', error);
      setResults(null);
    } finally {
      setIsLoading(false);
      setShowSuggestions(false);
    }
  }, [setSearchParams]);

  // 載入搜尋歷史
  const loadSearchHistory = useCallback(async () => {
    try {
      const response = await searchAPI.getHistory();
      setHistory(response.history);
    } catch (error) {
      console.error('載入搜尋歷史失敗:', error);
    }
  }, []);

  // 載入熱門話題
  const loadTrendingTopics = useCallback(async () => {
    try {
      const response = await searchAPI.getTrendingTopics();
      setTrendingTopics(response.trending_topics);
    } catch (error) {
      console.error('載入熱門話題失敗:', error);
    }
  }, []);

  // 清除搜尋歷史
  const clearHistory = useCallback(async () => {
    try {
      await searchAPI.clearHistory();
      setHistory([]);
    } catch (error) {
      console.error('清除搜尋歷史失敗:', error);
    }
  }, []);

  // 處理輸入變化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length >= 2) {
      debouncedGetSuggestions(value);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // 處理搜尋提交
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query.trim(), searchType);
    }
  };

  // 處理建議選擇
  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion, searchType);
  };

  // 處理歷史記錄選擇
  const handleHistorySelect = (historyItem: SearchHistory) => {
    setQuery(historyItem.query);
    setSearchType(historyItem.search_type);
    performSearch(historyItem.query, historyItem.search_type);
  };

  // 處理點擊外部關閉建議
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 初始化載入
  useEffect(() => {
    loadSearchHistory();
    loadTrendingTopics();

    // 如果URL中有搜尋參數，執行搜尋
    const urlQuery = searchParams.get('q');
    const urlType = searchParams.get('type') || 'all';
    if (urlQuery) {
      setQuery(urlQuery);
      setSearchType(urlType);
      performSearch(urlQuery, urlType);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 搜尋標題區 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">搜尋</h1>
          
          {/* 搜尋表單 */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => setShowSuggestions(query.length >= 2)}
                placeholder="搜尋用戶、貼文、技能標籤..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* 搜尋建議 */}
            {showSuggestions && (suggestions.length > 0 || history.length > 0) && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
              >
                {/* 搜尋建議 */}
                {suggestions.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 px-3 py-2">搜尋建議</div>
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center space-x-3"
                      >
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 搜尋歷史 */}
                {history.length > 0 && (
                  <div className="p-2 border-t border-gray-100">
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="text-xs font-medium text-gray-500">最近搜尋</div>
                      <button
                        onClick={clearHistory}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        清除
                      </button>
                    </div>
                    {history.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleHistorySelect(item)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center space-x-3"
                      >
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{item.query}</span>
                        <span className="text-xs text-gray-500">({item.results_count} 結果)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>

          {/* 搜尋類型選擇 */}
          <div className="flex items-center space-x-4 mt-4">
            <label className="text-sm font-medium text-gray-700">搜尋類型:</label>
            <div className="flex space-x-2">
              {[
                { value: 'all', label: '全部', icon: SparklesIcon },
                { value: 'users', label: '用戶', icon: UserIcon },
                { value: 'posts', label: '貼文', icon: DocumentTextIcon }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    setSearchType(value);
                    if (query.trim()) {
                      performSearch(query.trim(), value);
                    }
                  }}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    searchType === value
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 主要內容區 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : results ? (
          // 搜尋結果
          <div className="space-y-6">
            {/* 搜尋信息 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    搜尋結果: "{results.query}"
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    找到 {results.total_users} 個用戶, {results.total_posts} 個貼文 
                    (耗時 {results.search_time}s)
                  </p>
                </div>
                {results.suggestions && results.suggestions.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">您可能想搜尋:</p>
                    <div className="flex flex-wrap gap-1">
                      {results.suggestions.slice(0, 3).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 用戶結果 */}
            {(searchType === 'all' || searchType === 'users') && results.users.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2" />
                    用戶 ({results.total_users})
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {results.users.map((user) => (
                    <div key={user.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <img
                          src={user.avatar || '/default-avatar.png'}
                          alt={user.username}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              {user.first_name} {user.last_name}
                            </h4>
                            <span className="text-sm text-gray-600">@{user.username}</span>
                            {user.is_online && (
                              <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
                          {user.skills && user.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {user.skills.slice(0, 3).map((skill, index) => (
                                <span
                                  key={index}
                                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                >
                                  {skill}
                                </span>
                              ))}
                              {user.skills.length > 3 && (
                                <span className="text-xs text-gray-500">+{user.skills.length - 3} 更多</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>{user.followers_count} 關注者</span>
                            <span>{user.posts_count} 貼文</span>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/profile/${user.username}`)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          查看個人檔案
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 貼文結果 */}
            {(searchType === 'all' || searchType === 'posts') && results.posts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    貼文 ({results.total_posts})
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {results.posts.map((post) => (
                    <div key={post.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <img
                          src={post.author.avatar || '/default-avatar.png'}
                          alt={post.author.username}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-semibold text-gray-900">
                              @{post.author.username}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div
                            className="text-sm text-gray-900 mb-3"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                          />
                          {post.code_snippet && (
                            <div className="bg-gray-100 rounded-lg p-3 mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600">
                                  {post.code_language}
                                </span>
                                <button className="text-xs text-blue-600 hover:text-blue-800">
                                  複製程式碼
                                </button>
                              </div>
                              <div
                                className="text-sm font-mono"
                                dangerouslySetInnerHTML={{ __html: post.code_snippet }}
                              />
                            </div>
                          )}
                          <div className="flex items-center space-x-6 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <HeartIcon className="h-4 w-4" />
                              <span>{post.likes_count}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <ChatBubbleLeftIcon className="h-4 w-4" />
                              <span>{post.comments_count}</span>
                            </div>
                            {post.has_media && (
                              <div className="flex items-center space-x-1">
                                <EyeIcon className="h-4 w-4" />
                                <span>{post.media_count} 媒體</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/post/${post.id}`)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          查看貼文
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 無結果 */}
            {results.total_users === 0 && results.total_posts === 0 && (
              <EmptyState
                icon={MagnifyingGlassIcon}
                title="找不到相關結果"
                description={`沒有找到與 "${results.query}" 相關的內容`}
                action={{
                  label: '瀏覽熱門話題',
                  onClick: () => setShowSuggestions(false)
                }}
              />
            )}
          </div>
        ) : hasSearched ? (
          <EmptyState
            icon={MagnifyingGlassIcon}
            title="搜尋出錯"
            description="搜尋服務暫時不可用，請稍後再試"
          />
        ) : (
          // 默認狀態 - 顯示熱門話題和搜尋歷史
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 熱門話題 */}
            {trendingTopics.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <FireIcon className="h-5 w-5 mr-2 text-orange-500" />
                  熱門話題
                </h3>
                <div className="space-y-2">
                  {trendingTopics.slice(0, 10).map((topic, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(topic)}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center space-x-3"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{topic}</span>
                      </div>
                      <HashtagIcon className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 搜尋歷史 */}
            {history.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <ClockIcon className="h-5 w-5 mr-2 text-gray-500" />
                    搜尋歷史
                  </h3>
                  <button
                    onClick={clearHistory}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    清除全部
                  </button>
                </div>
                <div className="space-y-2">
                  {history.slice(0, 10).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleHistorySelect(item)}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{item.query}</span>
                        <span className="text-xs text-gray-500">
                          {item.results_count} 結果
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {item.search_type === 'all' ? '全部' : 
                           item.search_type === 'users' ? '用戶' : '貼文'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage; 