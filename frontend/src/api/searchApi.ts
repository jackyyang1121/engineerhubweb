/**
 * 搜尋 API 模塊
 * 
 * 功能：提供全站內容搜尋功能，包括用戶和貼文的搜尋
 * 
 * 設計原則：
 * - Narrowly focused: 專職負責搜尋相關的 API 調用
 * - Flexible: 使用統一的錯誤處理機制，易於配置和擴展
 * - Loosely coupled: 通過類型系統確保搜尋 API 的安全性
 * 
 * 重構重點：
 * - 移除重複的 try-catch 錯誤處理邏輯
 * - 使用統一的 handleApiCall 錯誤處理器
 * - 保留開發環境的模擬數據功能
 * - 提供清晰的類型定義和詳細註釋
 */

import api from './axiosConfig';
import { handleApiCall } from '../utils/api-error-handler';
import type { Post, UserData, SearchResult, TrendingTopicsResponse, TrendingTopic } from '../types';

// 重新導出類型定義供其他模塊使用，提升模塊間的類型一致性
export type { SearchResult, TrendingTopicsResponse, TrendingTopic } from '../types';

/**
 * 生成模擬搜尋結果
 * 
 * @param query - 搜尋關鍵字
 * @returns SearchResult - 包含用戶和貼文的搜尋結果
 * 
 * 功能：用於開發環境或 API 失敗時的備用數據
 * 確保前端功能在後端未完全實現時也能正常運行
 */
const generateMockSearchResult = (query: string): SearchResult => {
  // 生成模擬貼文數據
  const mockPosts: Post[] = [
    {
      id: '1',
      author: '1',
      author_details: {
        id: '1',
        username: 'example_user',
        email: 'example@test.com',
        avatar: `https://ui-avatars.com/api/?name=Example&background=random`,
        is_online: true,
        followers_count: 120,
        following_count: 85,
        posts_count: 45,
        likes_received_count: 320
      },
      content: `這是一個關於 ${query} 的示例貼文，展示搜尋功能的運作`,
      media: [],
      code_snippet: '',
      code_highlighted: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      likes_count: 15,
      comments_count: 3,
      shares_count: 2,
      views_count: 120,
      is_liked: false,
      is_saved: false,
      is_published: true,
      is_featured: false
    },
    {
      id: '2',
      author: '2',
      author_details: {
        id: '2',
        username: 'tech_lover',
        email: 'tech@test.com',
        avatar: `https://ui-avatars.com/api/?name=Tech&background=random`,
        is_online: false,
        followers_count: 230,
        following_count: 156,
        posts_count: 67,
        likes_received_count: 890
      },
      content: `另一個含有 ${query} 關鍵字的技術貼文示例`,
      media: [],
      code_snippet: `// ${query} 相關代碼示例\nconsole.log('Hello ${query}!');`,
      code_highlighted: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      likes_count: 8,
      comments_count: 1,
      shares_count: 0,
      views_count: 85,
      is_liked: false,
      is_saved: false,
      is_published: true,
      is_featured: false
    }
  ];

  // 生成模擬用戶數據
  const mockUsers: UserData[] = [
    {
      id: '1',
      username: 'example_user',
      email: 'example@test.com',
      bio: `資深工程師 | 熱愛 ${query} 和其他前沿技術`,
      avatar: `https://ui-avatars.com/api/?name=Example&background=random`,
      skill_tags: ['JavaScript', 'React', query],
      is_following: false,
      is_online: true,
      followers_count: 120,
      following_count: 85,
      posts_count: 45,
      likes_received_count: 320
    },
    {
      id: '2',
      username: 'tech_lover',
      email: 'tech@test.com',
      bio: `${query} 領域專家和開源項目貢獻者`,
      avatar: `https://ui-avatars.com/api/?name=Tech&background=random`,
      skill_tags: ['Python', query, 'Docker', 'Kubernetes'],
      is_following: true,
      is_online: false,
      followers_count: 230,
      following_count: 156,
      posts_count: 67,
      likes_received_count: 890
    }
  ];

  return {
    posts: mockPosts,
    users: mockUsers,
    total_count: 23,      // 總搜尋結果數量
    posts_count: 15,      // 貼文搜尋結果數量
    users_count: 8        // 用戶搜尋結果數量
  };
};

/**
 * 搜尋全部內容（用戶和貼文）
 * 
 * @param query - 搜尋關鍵字
 * @returns Promise<SearchResult> - 包含用戶和貼文的完整搜尋結果
 * 
 * 功能：
 * - 同時搜尋用戶和貼文內容
 * - 按相關性排序搜尋結果
 * - 提供完整的統計信息
 * 
 * 使用範例：
 * ```typescript
 * const searchResult = await searchAll('React');
 * console.log('搜尋到', searchResult.total_count, '個結果');
 * console.log('貼文:', searchResult.posts.length, '個');
 * console.log('用戶:', searchResult.users.length, '個');
 * ```
 */
export const searchAll = async (query: string): Promise<SearchResult> => {
  try {
    // 嘗試調用真實的 API
    return await handleApiCall(
      () => api.get('/search/', {
        params: { q: query } // 使用 params 確保正確的 URL 編碼
      }),
      '搜尋全部內容'
    );
  } catch (error) {
    // 如果 API 調用失敗，記錄錯誤並返回模擬數據
    console.warn('🔄 搜尋 API 暫不可用，使用模擬數據:', error);
    return generateMockSearchResult(query);
  }
};

/**
 * 只搜尋貼文內容
 * 
 * @param query - 搜尋關鍵字
 * @returns Promise<Post[]> - 匹配的貼文列表
 * 
 * 功能：
 * - 專注於貼文內容的搜尋
 * - 搜尋貼文標題、內容和程式碼片段
 * - 按發布時間和相關性排序
 * 
 * 使用範例：
 * ```typescript
 * const posts = await searchPosts('TypeScript');
 * posts.forEach(post => {
 *   console.log(`找到貼文: ${post.content.substring(0, 50)}...`);
 * });
 * ```
 */
export const searchPosts = async (query: string): Promise<Post[]> => {
  try {
    // 嘗試調用真實的 API
    const response = await handleApiCall(
      () => api.get('/search/posts/', {
        params: { q: query }
      }),
      '搜尋貼文'
    );
    // 類型安全的響應處理
    const data = response as { results?: Post[]; [key: string]: unknown };
    return data.results || (response as Post[]); // 兼容不同的響應格式
  } catch (error) {
    // 如果 API 調用失敗，生成模擬的貼文數據
    console.warn('🔄 貼文搜尋 API 暫不可用，使用模擬數據:', error);
    
    // 生成 5 個模擬貼文
    return Array.from({ length: 5 }, (_, i) => ({
      id: `mock_post_${i + 1}`,
      author: `${i + 1}`,
      author_details: {
        id: `${i + 1}`,
        username: `search_user_${i + 1}`,
        email: `user${i + 1}@example.com`,
        avatar: `https://ui-avatars.com/api/?name=User${i+1}&background=random`,
        is_online: i % 2 === 0,        // 交替在線狀態
        followers_count: 50 + i * 10,   // 遞增的關注者數量
        following_count: 30 + i * 5,    // 遞增的關注數量
        posts_count: 20 + i * 5,        // 遞增的貼文數量
        likes_received_count: 100 + i * 20  // 遞增的獲讚數量
      },
      content: `這是第 ${i + 1} 個關於 ${query} 的搜尋結果示例。包含更多相關的技術內容和討論。`,
      media: [],
      // 每三個貼文添加一個程式碼片段
      code_snippet: i % 3 === 0 ? `// ${query} 相關示例代碼\nconsole.log('搜尋結果示例 ${i + 1}');` : '',
      code_highlighted: '',
      created_at: new Date(Date.now() - i * 86400000).toISOString(), // 按天遞減的創建時間
      updated_at: new Date(Date.now() - i * 86400000).toISOString(),
      likes_count: Math.floor(Math.random() * 50),     // 隨機點讚數
      comments_count: Math.floor(Math.random() * 10),  // 隨機評論數
      shares_count: Math.floor(Math.random() * 5),     // 隨機分享數
      views_count: Math.floor(Math.random() * 200),    // 隨機觀看數
      is_liked: false,
      is_saved: false,
      is_published: true,
      is_featured: i === 0  // 第一個貼文標記為精選
    }));
  }
};

/**
 * 只搜尋用戶
 * 
 * @param query - 搜尋關鍵字
 * @returns Promise<UserData[]> - 匹配的用戶列表
 * 
 * 功能：
 * - 專注於用戶資料的搜尋
 * - 搜尋用戶名、簡介和技能標籤
 * - 按活躍度和關注者數量排序
 * 
 * 使用範例：
 * ```typescript
 * const users = await searchUsers('frontend');
 * users.forEach(user => {
 *   console.log(`找到用戶: ${user.username} - ${user.bio}`);
 * });
 * ```
 */
export const searchUsers = async (query: string): Promise<UserData[]> => {
  try {
    // 嘗試調用真實的 API
    const response = await handleApiCall(
      () => api.get('/search/users/', {
        params: { q: query }
      }),
      '搜尋用戶'
    );
    // 類型安全的響應處理
    const data = response as { results?: UserData[]; [key: string]: unknown };
    return data.results || (response as UserData[]); // 兼容不同的響應格式
  } catch (error) {
    // 如果 API 調用失敗，生成模擬的用戶數據
    console.warn('🔄 用戶搜尋 API 暫不可用，使用模擬數據:', error);
    
    // 生成 8 個模擬用戶
    return Array.from({ length: 8 }, (_, i) => ({
      id: `mock_user_${i + 1}`,
      username: `${query}_expert_${i + 1}`,
      email: `user${i + 1}@example.com`,
      bio: `專注於 ${query} 相關技術開發已有 ${i + 1} 年經驗`,
      avatar: `https://ui-avatars.com/api/?name=${query}${i+1}&background=random`,
      // 動態生成技能標籤，包含搜尋關鍵字
      skill_tags: ['JavaScript', 'React', query, 'Node.js', 'TypeScript'].slice(0, 3 + (i % 3)),
      is_following: i % 3 === 0,  // 每三個用戶中有一個已關注
      is_online: i % 2 === 0,     // 交替在線狀態
      last_online: new Date().toISOString(),
      followers_count: 50 + i * 15,    // 遞增的關注者數量
      following_count: 30 + i * 8,     // 遞增的關注數量
      posts_count: 20 + i * 7,         // 遞增的貼文數量
      likes_received_count: 100 + i * 25   // 遞增的獲讚數量
    }));
  }
};

/**
 * 搜尋歷史響應類型
 */
export interface SearchHistoryResponse {
  history: Array<{
    id: string;
    query: string;
    search_type: string;
    results_count: number;
    created_at: string;
  }>;
  total_count: number;
}

/**
 * 獲取用戶搜尋歷史
 * 
 * @returns Promise<SearchHistoryResponse> - 搜尋歷史列表
 */
export const getSearchHistory = async (): Promise<SearchHistoryResponse> => {
  return handleApiCall(
    () => api.get('/search/history/'),
    '獲取搜尋歷史'
  );
};

/**
 * 清除搜尋歷史
 * 
 * @returns Promise<{ detail: string }> - 操作結果
 */
export const clearSearchHistory = async (): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.delete('/search/history/'),
    '清除搜尋歷史'
  );
};

/**
 * 獲取熱門話題
 * 
 * @param timePeriod - 時間週期：24小時、7天或30天
 * @param limit - 返回的話題數量限制，默認10個
 * @returns Promise<TrendingTopicsResponse> - 熱門話題列表和相關統計
 * 
 * 功能：
 * - 獲取指定時間週期內的熱門話題
 * - 包含話題熱度、趨勢方向和增長率
 * - 按照熱度和增長率排序
 * - 提供詳細的話題統計信息
 * 
 * 設計原則：
 * - Narrowly focused: 專職負責熱門話題數據獲取
 * - Flexible: 支援不同時間週期和數量限制的配置
 * - Loosely coupled: 通過類型系統確保數據安全性
 * 
 * 使用範例：
 * ```typescript
 * // 獲取過去24小時的熱門話題
 * const trending = await getTrendingTopics('24h', 10);
 * console.log('熱門話題:', trending.trending_topics.length, '個');
 * 
 * // 顯示話題詳情
 * trending.trending_topics.forEach(topic => {
 *   console.log(`#${topic.hashtag}: ${topic.count} 個相關貼文 (${topic.trend_direction})`);
 * });
 * ```
 */
export const getTrendingTopics = async (
  timePeriod: '24h' | '7d' | '30d' = '24h',
  limit: number = 10
): Promise<TrendingTopicsResponse> => {
  try {
    // 嘗試調用真實的 API
    return await handleApiCall(
      () => api.get('/trending/topics/', {
        params: { 
          period: timePeriod,
          limit: limit
        }
      }),
      '獲取熱門話題'
    );
  } catch (error) {
    // 如果 API 調用失敗，記錄錯誤並返回高質量的模擬數據
    console.warn('🔄 熱門話題 API 暫不可用，使用模擬數據:', error);
    
    // 生成高質量的模擬熱門話題數據
    const mockTrendingTopics: TrendingTopic[] = [
      {
        name: 'React',
        count: 156,
        trend_direction: 'up',
        hashtag: 'React',
        description: '前端開發框架討論和最佳實踐分享',
        related_posts_count: 156,
        growth_rate: 15.8
      },
      {
        name: 'TypeScript',
        count: 142,
        trend_direction: 'up',
        hashtag: 'TypeScript',
        description: '型別安全的 JavaScript 開發討論',
        related_posts_count: 142,
        growth_rate: 12.3
      },
      {
        name: 'Node.js',
        count: 128,
        trend_direction: 'stable',
        hashtag: 'NodeJS',
        description: '後端 JavaScript 運行環境和技術分享',
        related_posts_count: 128,
        growth_rate: 8.7
      },
      {
        name: 'Python',
        count: 119,
        trend_direction: 'up',
        hashtag: 'Python',
        description: 'Python 程式設計語言和應用開發',
        related_posts_count: 119,
        growth_rate: 18.2
      },
      {
        name: 'JavaScript',
        count: 105,
        trend_direction: 'stable',
        hashtag: 'JavaScript',
        description: '原生 JavaScript 開發技巧和經驗',
        related_posts_count: 105,
        growth_rate: 6.1
      },
      {
        name: 'DevOps',
        count: 98,
        trend_direction: 'up',
        hashtag: 'DevOps',
        description: '開發運維一體化實踐和工具分享',
        related_posts_count: 98,
        growth_rate: 22.4
      },
      {
        name: 'AWS',
        count: 87,
        trend_direction: 'up',
        hashtag: 'AWS',
        description: '亞馬遜雲服務平台使用經驗',
        related_posts_count: 87,
        growth_rate: 14.9
      },
      {
        name: 'Docker',
        count: 76,
        trend_direction: 'stable',
        hashtag: 'Docker',
        description: '容器化技術和微服務架構',
        related_posts_count: 76,
        growth_rate: 4.3
      },
      {
        name: 'AI',
        count: 94,
        trend_direction: 'up',
        hashtag: 'AI',
        description: '人工智慧技術討論和應用案例',
        related_posts_count: 94,
        growth_rate: 28.6
      },
      {
        name: 'Machine Learning',
        count: 68,
        trend_direction: 'up',
        hashtag: 'MachineLearning',
        description: '機器學習算法和實際應用',
        related_posts_count: 68,
        growth_rate: 31.2
      }
    ];

    // 根據限制返回指定數量的話題，保持排序
    const limitedTopics = mockTrendingTopics
      .sort((a, b) => b.count - a.count) // 按熱度排序
      .slice(0, limit);

    return {
      trending_topics: limitedTopics,
      total_count: mockTrendingTopics.length,
      last_updated: new Date().toISOString(),
      time_period: timePeriod
    };
  }
}; 