/**
 * 搜尋相關API接口
 */

import api from './axiosConfig';

// 搜尋結果類型定義
export interface SearchUser {
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

export interface SearchPost {
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

export interface SearchResults {
  query: string;
  type: string;
  users: SearchUser[];
  posts: SearchPost[];
  total_users: number;
  total_posts: number;
  search_time: number;
  suggestions: string[];
}

export interface SearchHistory {
  id: string;
  query: string;
  search_type: string;
  results_count: number;
  created_at: string;
}

export interface SearchSuggestions {
  suggestions: string[];
}

export interface TrendingTopics {
  trending_topics: string[];
}

export const searchAPI = {
  /**
   * 執行搜尋
   */
  async search(query: string, type: string = 'all', limit: number = 20): Promise<SearchResults> {
    const response = await api.get('/core/search/', {
      params: { q: query, type, limit }
    });
    return response.data;
  },

  /**
   * 獲取搜尋建議
   */
  async getSuggestions(query: string): Promise<SearchSuggestions> {
    const response = await api.get('/core/search/suggestions/', {
      params: { q: query }
    });
    return response.data;
  },

  /**
   * 獲取搜尋歷史
   */
  async getHistory(): Promise<{ history: SearchHistory[] }> {
    const response = await api.get('/core/search/history/');
    return response.data;
  },

  /**
   * 清除搜尋歷史
   */
  async clearHistory(): Promise<{ message: string }> {
    const response = await api.delete('/core/search/history/');
    return response.data;
  },

  /**
   * 獲取熱門話題
   */
  async getTrendingTopics(): Promise<TrendingTopics> {
    const response = await api.get('/core/trending/');
    return response.data;
  },
}; 