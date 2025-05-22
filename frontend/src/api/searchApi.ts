import axios from './axiosConfig';

// 從統一類型文件導入類型定義
import type { Post, UserData, SearchAllResult } from '../types';

// 重新導出類型定義供其他模塊使用
export type { SearchAllResult } from '../types';

// 搜索全部內容（用戶和貼文）
export const searchAll = async (query: string): Promise<SearchAllResult> => {
  try {
    const response = await axios.get(`/search?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.error('搜索全部內容錯誤:', error);
    // 返回模擬數據用於開發
    return {
      posts: [
        {
          id: '1',
          author: '1',
          author_details: {
            id: '1',
            username: 'example_user',
            email: 'example@test.com',
            avatar: `https://ui-avatars.com/api/?name=Example&background=random`,
            is_online: true
          },
          content: `這是一個關於 ${query} 的示例貼文`,
          media: [],
          code_snippet: '',
          code_highlighted: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          likes_count: 15,
          comments_count: 3,
          shares_count: 2,
          is_liked: false,
          is_saved: false
        },
        {
          id: '2',
          author: '2',
          author_details: {
            id: '2',
            username: 'tech_lover',
            email: 'tech@test.com',
            avatar: `https://ui-avatars.com/api/?name=Tech&background=random`,
            is_online: false
          },
          content: `另一個含有 ${query} 的貼文示例`,
          media: [],
          code_snippet: `// ${query} 相關代碼示例\nconsole.log('Hello ${query}');`,
          code_highlighted: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          likes_count: 8,
          comments_count: 1,
          shares_count: 0,
          is_liked: false,
          is_saved: false
        }
      ],
      users: [
        {
          id: '1',
          username: 'example_user',
          email: 'example@test.com',
          bio: `工程師 | 熱愛 ${query} 和其他技術`,
          avatar: `https://ui-avatars.com/api/?name=Example&background=random`,
          skill_tags: ['JavaScript', 'React', query],
          is_following: false,
          is_online: true,
          stats: {
            followers_count: 120,
            following_count: 85,
            posts_count: 45,
            likes_received_count: 320
          }
        },
        {
          id: '2',
          username: 'tech_lover',
          email: 'tech@test.com',
          bio: `${query} 專家和開源貢獻者`,
          avatar: `https://ui-avatars.com/api/?name=Tech&background=random`,
          skill_tags: ['Python', query, 'Docker'],
          is_following: true,
          is_online: false,
          stats: {
            followers_count: 230,
            following_count: 156,
            posts_count: 67,
            likes_received_count: 890
          }
        }
      ],
      posts_count: 15,
      users_count: 8
    };
  }
};

// 只搜索貼文
export const searchPosts = async (query: string): Promise<Post[]> => {
  try {
    const response = await axios.get(`/search/posts?q=${encodeURIComponent(query)}`);
    return response.data.results;
  } catch (error) {
    console.error('搜索貼文錯誤:', error);
    // 返回模擬數據用於開發
    return Array.from({ length: 5 }, (_, i) => ({
      id: `${i + 1}`,
      author: `${i + 1}`,
      author_details: {
        id: `${i + 1}`,
        username: `user_${i + 1}`,
        email: `user${i + 1}@example.com`,
        avatar: `https://ui-avatars.com/api/?name=User${i+1}&background=random`,
        is_online: i % 2 === 0
      },
      content: `這是一個關於 ${query} 的第 ${i + 1} 個示例貼文。包含更多相關內容。`,
      media: [],
      code_snippet: i % 3 === 0 ? `// 示例代碼\nconsole.log('${query} 示例 ${i + 1}');` : '',
      code_highlighted: '',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 86400000).toISOString(),
      likes_count: Math.floor(Math.random() * 50),
      comments_count: Math.floor(Math.random() * 10),
      shares_count: Math.floor(Math.random() * 5),
      is_liked: false,
      is_saved: false
    }));
  }
};

// 只搜索用戶
export const searchUsers = async (query: string): Promise<UserData[]> => {
  try {
    const response = await axios.get(`/search/users?q=${encodeURIComponent(query)}`);
    return response.data.results;
  } catch (error) {
    console.error('搜索用戶錯誤:', error);
    // 返回模擬數據用於開發
    return Array.from({ length: 8 }, (_, i) => ({
      id: `${i + 1}`,
      username: `${query}_user_${i + 1}`,
      email: `user${i + 1}@example.com`,
      bio: `專注於 ${query} 相關技術開發 ${i + 1} 年`,
      avatar: `https://ui-avatars.com/api/?name=${query}${i+1}&background=random`,
      skill_tags: ['JavaScript', 'React', query, 'Node.js', 'TypeScript'].slice(0, 3 + (i % 3)),
      is_following: i % 3 === 0,
      is_online: i % 2 === 0,
      last_online: new Date().toISOString(),
      stats: {
        followers_count: 50 + i * 10,
        following_count: 30 + i * 5,
        posts_count: 20 + i * 5,
        likes_received_count: 100 + i * 20
      }
    }));
  }
}; 