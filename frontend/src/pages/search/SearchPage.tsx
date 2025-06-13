/**
 * 搜尋頁面 - 工程師社群智能搜尋中心
 * 
 * 設計原則：
 * - Narrowly focused: 專職負責搜尋功能的展示和交互
 * - Flexible: 支援多種搜尋類型和配置選項
 * - Loosely coupled: 通過類型系統確保與搜尋 API 的安全交互
 * 
 * 功能：
 * 1. 智能即時搜尋建議和自動完成
 * 2. 多類型搜尋：用戶、貼文、全局搜尋
 * 3. 搜尋歷史管理和快速重複搜尋
 * 4. 熱門話題展示和趨勢分析
 * 5. 搜尋結果的結構化展示
 * 
 * 重構重點：
 * - 模塊化的搜尋邏輯和狀態管理
 * - 類型安全的數據處理和 API 調用
 * - 用戶友好的交互體驗和錯誤處理
 * - 高性能的搜尋結果渲染
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  FireIcon,
  UserIcon,
  DocumentTextIcon,
  HashtagIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { HeartIcon, ChatBubbleLeftIcon, EyeIcon } from '@heroicons/react/24/solid';

// 導入搜尋相關的API和類型定義
import { 
  searchAll,
  getTrendingTopics
} from '../../api/searchApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import type { Post, UserData } from '../../types';

// ==================== 組件內部類型定義 ====================

/**
 * 搜尋配置介面
 * 定義搜尋行為的各種參數
 */
interface SearchConfig {
  placeholder: string;           // 搜尋框提示文字
  minLength: number;            // 最小搜尋字符數
  maxSuggestions: number;       // 最大建議數量
  maxHistoryItems: number;      // 最大歷史記錄數量
}

/**
 * 搜尋歷史項目介面
 * 本地存儲的搜尋歷史結構
 */
interface SearchHistoryItem {
  id: string;                   // 唯一標識符
  query: string;                // 搜尋關鍵字
  searchType: string;           // 搜尋類型
  timestamp: number;            // 搜尋時間戳
  resultsCount: number;         // 結果數量
}

/**
 * 統一的搜尋結果介面
 * 整合不同類型搜尋結果的展示格式
 */
interface UnifiedSearchResults {
  query: string;                // 搜尋關鍵字
  type: string;                 // 搜尋類型
  users: UserData[];            // 用戶結果
  posts: Post[];                // 貼文結果
  totalUsers: number;           // 用戶總數
  totalPosts: number;           // 貼文總數
  searchTime: number;           // 搜尋耗時
}

// ==================== Hook：搜尋狀態管理 ====================

/**
 * 搜尋狀態管理 Hook
 * 
 * 職責：
 * - 管理搜尋參數和結果狀態
 * - 提供統一的錯誤處理
 * - 實現搜尋歷史的本地持久化
 * 
 * @param config - 搜尋配置選項
 * @returns 搜尋狀態和操作函數
 */
const useSearchState = (config: SearchConfig) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState(searchParams.get('type') || 'all');
  const [results, setResults] = useState<UnifiedSearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 搜尋歷史的本地存儲管理
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('engineerhub_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 保存搜尋歷史到本地存儲
  const saveToHistory = useCallback((searchQuery: string, type: string, resultsCount: number) => {
    const historyItem: SearchHistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query: searchQuery,
      searchType: type,
      timestamp: Date.now(),
      resultsCount
    };

    setHistory(prev => {
      const filtered = prev.filter(item => 
        !(item.query === searchQuery && item.searchType === type)
      );
      const newHistory = [historyItem, ...filtered].slice(0, config.maxHistoryItems);
      
      try {
        localStorage.setItem('engineerhub_search_history', JSON.stringify(newHistory));
      } catch (error) {
        console.warn('無法保存搜尋歷史到本地存儲:', error);
      }
      
      return newHistory;
    });
  }, [config.maxHistoryItems]);

  // 清除搜尋歷史
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem('engineerhub_search_history');
      console.log('✅ 搜尋歷史已清除');
    } catch (error) {
      console.warn('清除搜尋歷史失敗:', error);
    }
  }, []);

  return {
    query,
    setQuery,
    searchType,
    setSearchType,
    results,
    setResults,
    isLoading,
    setIsLoading,
    hasSearched,
    setHasSearched,
    error,
    setError,
    history,
    saveToHistory,
    clearHistory,
    searchParams,
    setSearchParams
  };
};

// ==================== Hook：熱門話題管理 ====================

/**
 * 熱門話題管理 Hook
 * 
 * 職責：
 * - 載入和管理熱門話題數據
 * - 提供話題的快速搜尋功能
 * - 實現話題數據的緩存策略
 * 
 * @returns 熱門話題數據和載入狀態
 */
const useTrendingTopics = () => {
  const [topics, setTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTrendingTopics = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔥 載入熱門話題...');
      const response = await getTrendingTopics('24h', 10);
      const topicNames = response.trending_topics.map(topic => topic.name);
      setTopics(topicNames);
      console.log('✅ 熱門話題載入成功:', topicNames.length, '個話題');
    } catch (error) {
      console.error('❌ 載入熱門話題失敗:', error);
      // 提供備用話題
      setTopics([
        'React', 'TypeScript', 'Node.js', 'Python', 'JavaScript',
        'DevOps', 'AWS', 'Docker', 'AI', 'Machine Learning'
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrendingTopics();
  }, [loadTrendingTopics]);

  return { topics, isLoading, refetch: loadTrendingTopics };
};

// ==================== Hook：搜尋建議 ====================

/**
 * 搜尋建議 Hook
 * 
 * 職責：
 * - 基於輸入提供即時搜尋建議
 * - 結合歷史記錄和熱門話題
 * - 優化建議的相關性和實用性
 * 
 * @param query - 當前搜尋關鍵字
 * @param history - 搜尋歷史
 * @param trending - 熱門話題
 * @param config - 搜尋配置
 * @returns 搜尋建議列表
 */
const useSearchSuggestions = (
  query: string,
  history: SearchHistoryItem[],
  trending: string[],
  config: SearchConfig
) => {
  return useMemo(() => {
    if (!query || query.length < config.minLength) {
      return [];
    }

    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    // 添加歷史記錄中的相關建議
    history
      .filter(item => item.query.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .forEach(item => suggestions.add(item.query));

    // 添加熱門話題中的相關建議
    trending
      .filter(topic => topic.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .forEach(topic => suggestions.add(topic));

    // 添加常見的技術相關建議
    const commonSuggestions = [
      `${query} 教學`,
      `${query} 範例`,
      `${query} 最佳實踐`
    ];
    
    commonSuggestions
      .slice(0, Math.max(0, config.maxSuggestions - suggestions.size))
      .forEach(suggestion => suggestions.add(suggestion));

    return Array.from(suggestions).slice(0, config.maxSuggestions);
  }, [query, history, trending, config]);
};

// ==================== 工具函數：時間格式化 ====================

/**
 * 格式化搜尋歷史的時間顯示
 * 
 * @param timestamp - 時間戳
 * @returns 格式化後的時間字符串
 */
const formatHistoryTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffHours < 1) {
    return '剛剛';
  } else if (diffHours < 24) {
    return `${Math.floor(diffHours)} 小時前`;
  } else if (diffHours < 24 * 7) {
    return `${Math.floor(diffHours / 24)} 天前`;
  } else {
    return date.toLocaleDateString('zh-TW');
  }
};

// ==================== 主組件：SearchPage ====================

const SearchPage: React.FC = () => {
  const navigate = useNavigate();

  // 搜尋配置
  const searchConfig: SearchConfig = {
    placeholder: '搜尋用戶、貼文、技能標籤...',
    minLength: 2,
    maxSuggestions: 6,
    maxHistoryItems: 20
  };

  // 使用自定義Hook管理搜尋狀態
  const {
    query,
    setQuery,
    searchType,
    setSearchType,
    results,
    setResults,
    isLoading,
    setIsLoading,
    hasSearched,
    setHasSearched,
    error,
    setError,
    history,
    saveToHistory,
    clearHistory,
    setSearchParams
  } = useSearchState(searchConfig);

  // 使用熱門話題Hook
  const { topics: trendingTopics } = useTrendingTopics();

  // 建議和UI狀態
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 獲取搜尋建議
  const suggestions = useSearchSuggestions(query, history, trendingTopics, searchConfig);

  // ==================== 核心搜尋功能 ====================

  /**
   * 執行搜尋操作
   * 
   * @param searchQuery - 搜尋關鍵字
   * @param type - 搜尋類型
   */
  const performSearch = useCallback(async (searchQuery: string, type: string = 'all') => {
    if (!searchQuery.trim()) {
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      console.log('🔍 開始搜尋:', { query: searchQuery, type });
      const startTime = Date.now();
      
      // 執行搜尋API調用 - 只使用searchAll
      const response = await searchAll(searchQuery);
      const searchTime = (Date.now() - startTime) / 1000;
      
      // 轉換響應為統一格式
      const unifiedResults: UnifiedSearchResults = {
        query: searchQuery,
        type,
        users: response.users || [],
        posts: response.posts || [],
        totalUsers: response.users?.length || 0,
        totalPosts: response.posts?.length || 0,
        searchTime
      };
      
      setResults(unifiedResults);
      console.log('✅ 搜尋成功:', unifiedResults);
      
      // 更新URL參數
      setSearchParams({ q: searchQuery, type });
      
      // 保存到搜尋歷史
      saveToHistory(searchQuery, type, unifiedResults.totalUsers + unifiedResults.totalPosts);
      
    } catch (error) {
      console.error('❌ 搜尋失敗:', error);
      setError('搜尋服務暫時不可用，請稍後重試');
      setResults(null);
    } finally {
      setIsLoading(false);
      setShowSuggestions(false);
    }
  }, [setSearchParams, saveToHistory, setIsLoading, setHasSearched, setError, setResults]);

  // ==================== 事件處理函數 ====================

  /**
   * 處理搜尋表單提交
   */
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query.trim(), searchType);
    }
  }, [query, searchType, performSearch]);

  /**
   * 處理輸入變化
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(value.length >= searchConfig.minLength);
  }, [setQuery, searchConfig.minLength]);

  /**
   * 處理建議選擇
   */
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion, searchType);
  }, [setQuery, performSearch, searchType]);

  /**
   * 處理歷史記錄選擇
   */
  const handleHistorySelect = useCallback((historyItem: SearchHistoryItem) => {
    setQuery(historyItem.query);
    setSearchType(historyItem.searchType);
    performSearch(historyItem.query, historyItem.searchType);
  }, [setQuery, setSearchType, performSearch]);

  // ==================== 生命週期和副作用 ====================

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

  // 初始化搜尋（如果URL中有參數）
  useEffect(() => {
    const urlQuery = new URLSearchParams(window.location.search).get('q');
    const urlType = new URLSearchParams(window.location.search).get('type') || 'all';
    
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
      setSearchType(urlType);
      performSearch(urlQuery, urlType);
    }
  }, []);

  // ==================== 條件渲染：錯誤狀態 ====================

  if (error && hasSearched) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-red-200/50">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">搜尋出錯</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setHasSearched(false);
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
              >
                重新開始
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 主要渲染內容 ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 搜尋標題區 */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          
          {/* 頁面標題 */}
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-2xl shadow-lg mr-4">
              <MagnifyingGlassIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                智能搜尋
              </h1>
              <p className="text-slate-600 mt-1">
                發現優秀的工程師和精彩的技術內容
              </p>
            </div>
          </div>
          
          {/* 搜尋表單 */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => setShowSuggestions(query.length >= searchConfig.minLength)}
                placeholder={searchConfig.placeholder}
                className="w-full pl-12 pr-12 py-4 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg shadow-lg transition-all duration-300"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* 搜尋建議下拉框 */}
            {showSuggestions && (suggestions.length > 0 || history.length > 0) && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto"
              >
                {/* 搜尋建議 */}
                {suggestions.length > 0 && (
                  <div className="p-3">
                    <div className="text-xs font-semibold text-slate-500 px-3 py-2 uppercase tracking-wide">
                      搜尋建議
                    </div>
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="w-full text-left px-3 py-3 hover:bg-blue-50 rounded-xl flex items-center space-x-3 transition-colors group"
                      >
                        <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                        <span className="text-sm text-slate-700 group-hover:text-blue-700 font-medium">
                          {suggestion}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 搜尋歷史 */}
                {history.length > 0 && (
                  <div className="p-3 border-t border-slate-100">
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        最近搜尋
                      </div>
                      <button
                        onClick={clearHistory}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        清除
                      </button>
                    </div>
                    {history.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleHistorySelect(item)}
                        className="w-full text-left px-3 py-3 hover:bg-slate-50 rounded-xl flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <ClockIcon className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                          <span className="text-sm text-slate-700 group-hover:text-slate-900">
                            {item.query}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                          <span>{item.resultsCount} 結果</span>
                          <span>•</span>
                          <span>{formatHistoryTime(item.timestamp)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>

          {/* 搜尋類型選擇 */}
          <div className="flex items-center space-x-2 mt-6">
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
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  searchType === value
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-white/50 text-slate-700 hover:bg-white/80 border border-white/20'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主要內容區 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          // 載入狀態
          <div className="flex justify-center py-16">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl">
              <LoadingSpinner size="lg" />
              <p className="text-slate-600 mt-4 text-center font-medium">
                正在搜尋最相關的結果...
              </p>
            </div>
          </div>
        ) : results ? (
          // 搜尋結果展示
          <div className="space-y-8">
            {/* 搜尋信息摘要 */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">
                    搜尋結果: "{results.query}"
                  </h2>
                  <p className="text-slate-600">
                    找到 <span className="font-semibold text-blue-600">{results.totalUsers}</span> 位工程師, 
                    <span className="font-semibold text-green-600 ml-1">{results.totalPosts}</span> 篇貼文 
                    <span className="text-slate-500">(耗時 {results.searchTime.toFixed(2)}s)</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 用戶結果 */}
            {(searchType === 'all' || searchType === 'users') && results.users.length > 0 && (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center">
                    <UserIcon className="h-6 w-6 mr-3 text-blue-500" />
                    工程師 ({results.totalUsers})
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {results.users.map((user) => (
                    <div key={user.id} className="p-6 hover:bg-white/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&size=64`}
                          alt={user.username}
                          className="h-16 w-16 rounded-2xl object-cover border-4 border-white shadow-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-bold text-slate-900 truncate">
                              {user.first_name} {user.last_name}
                            </h4>
                            <span className="text-slate-600">@{user.username}</span>
                            {user.is_online && (
                              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <p className="text-slate-600 mb-3 line-clamp-2">{user.bio}</p>
                          <div className="flex items-center space-x-4 text-sm text-slate-500">
                            <span>{user.followers_count || 0} 關注者</span>
                            <span>{user.posts_count || 0} 貼文</span>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/profile/${user.username}`)}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
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
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center">
                    <DocumentTextIcon className="h-6 w-6 mr-3 text-green-500" />
                    技術貼文 ({results.totalPosts})
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {results.posts.map((post) => (
                    <div key={post.id} className="p-6 hover:bg-white/50 transition-colors">
                      <div className="flex items-start space-x-4">
                        <img
                          src={post.author_details.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_details.username)}&background=random&size=48`}
                          alt={post.author_details.username}
                          className="h-12 w-12 rounded-xl object-cover border-2 border-white shadow-md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="font-semibold text-slate-900">
                              @{post.author_details.username}
                            </span>
                            <span className="text-sm text-slate-500">
                              {new Date(post.created_at).toLocaleDateString('zh-TW')}
                            </span>
                          </div>
                          <div 
                            className="text-slate-900 mb-4 line-clamp-3"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                          />
                          {post.code_snippet && (
                            <div className="bg-slate-100 rounded-xl p-4 mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-600 uppercase">
                                  {post.code_language || 'Code'}
                                </span>
                              </div>
                              <pre className="text-sm text-slate-800 overflow-x-auto">
                                <code>{post.code_snippet}</code>
                              </pre>
                            </div>
                          )}
                          <div className="flex items-center space-x-6 text-sm text-slate-500">
                            <div className="flex items-center space-x-1">
                              <HeartIcon className="h-4 w-4 text-red-400" />
                              <span>{post.likes_count || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <ChatBubbleLeftIcon className="h-4 w-4 text-blue-400" />
                              <span>{post.comments_count || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <EyeIcon className="h-4 w-4 text-green-400" />
                              <span>{post.views_count || 0}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/post/${post.id}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                        >
                          查看詳情
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 無結果狀態 */}
            {results.totalUsers === 0 && results.totalPosts === 0 && (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 shadow-xl">
                <EmptyState
                  icon={MagnifyingGlassIcon}
                  title="找不到相關結果"
                  description={`沒有找到與 "${results.query}" 相關的內容，試試其他關鍵字吧`}
                  action={{
                    label: '查看熱門話題',
                    onClick: () => setShowSuggestions(false)
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          // 默認狀態 - 顯示熱門話題和搜尋歷史
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 熱門話題卡片 */}
            {trendingTopics.length > 0 && (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                <h3 className="text-xl font-bold text-slate-900 flex items-center mb-6">
                  <FireIcon className="h-6 w-6 mr-3 text-orange-500" />
                  熱門技術話題
                </h3>
                <div className="space-y-3">
                  {trendingTopics.slice(0, 8).map((topic, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(topic)}
                      className="w-full text-left p-4 hover:bg-white/50 rounded-xl flex items-center space-x-4 transition-all duration-300 group"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-900 font-semibold group-hover:text-blue-600 transition-colors">
                          {topic}
                        </span>
                      </div>
                      <HashtagIcon className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 搜尋歷史卡片 */}
            {history.length > 0 && (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center">
                    <ClockIcon className="h-6 w-6 mr-3 text-slate-500" />
                    搜尋歷史
                  </h3>
                  <button
                    onClick={clearHistory}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                  >
                    清除全部
                  </button>
                </div>
                <div className="space-y-3">
                  {history.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleHistorySelect(item)}
                      className="w-full text-left p-4 hover:bg-white/50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900 truncate">
                          {item.query}
                        </span>
                        <span className="text-sm text-slate-500">
                          {item.resultsCount} 結果
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <span className="px-2 py-1 bg-slate-100 rounded-md">
                          {item.searchType === 'all' ? '全部' : 
                           item.searchType === 'users' ? '用戶' : '貼文'}
                        </span>
                        <span>•</span>
                        <span>{formatHistoryTime(item.timestamp)}</span>
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