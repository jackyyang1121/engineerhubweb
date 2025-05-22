/**
 * 探索頁面
 * 
 * 功能：
 * 1. 熱門技術話題展示
 * 2. 推薦工程師
 * 3. 精選開源項目
 * 4. 技術趨勢分析
 */

import React, { useState } from 'react';
import { 
  FireIcon,
  SparklesIcon,
  UserGroupIcon,
  TagIcon,
  TrophyIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { EyeIcon } from '@heroicons/react/24/solid';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import LoadingSpinner from '../../components/common/LoadingSpinner';


// 類型定義
interface TrendingTopic {
  id: string;
  name: string;
  posts_count: number;
  followers_count: number;
  growth_rate: number;
  description?: string;
}

interface PopularUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  avatar: string | null;
  followers_count: number;
  posts_count: number;
  skills: string[];
  is_following: boolean;
  reputation_score: number;
}

interface FeaturedProject {
  id: string;
  title: string;
  description: string;
  author: {
    username: string;
    avatar: string | null;
  };
  image_url: string;
  github_url?: string;
  demo_url?: string;
  tech_stack: string[];
  stars_count: number;
  views_count: number;
}

// 模擬API服務
const exploreAPI = {
  /**
   * 獲取熱門技術話題
   */
  getTrendingTopics: async (): Promise<TrendingTopic[]> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      return [
        {
          id: '1',
          name: 'React',
          posts_count: 1234,
          followers_count: 5678,
          growth_rate: 12.5,
          description: '現代前端開發框架'
        },
        {
          id: '2',
          name: 'TypeScript',
          posts_count: 987,
          followers_count: 3456,
          growth_rate: 18.2,
          description: 'JavaScript的超集'
        },
        {
          id: '3',
          name: 'AI/ML',
          posts_count: 856,
          followers_count: 4321,
          growth_rate: 25.7,
          description: '人工智慧與機器學習'
        },
        {
          id: '4',
          name: 'DevOps',
          posts_count: 743,
          followers_count: 2987,
          growth_rate: 15.3,
          description: '開發運維自動化'
        },
        {
          id: '5',
          name: 'Web3',
          posts_count: 621,
          followers_count: 2145,
          growth_rate: 31.8,
          description: '去中心化網路技術'
        }
      ];
    } catch (error) {
      console.error('獲取熱門話題失敗:', error);
      throw new Error('無法獲取熱門話題');
    }
  },

  /**
   * 獲取推薦用戶
   */
  getPopularUsers: async (): Promise<PopularUser[]> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      return Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        username: `engineer${i + 1}`,
        first_name: `Engineer${i + 1}`,
        last_name: 'Dev',
        bio: `資深${['前端', '後端', '全端', 'AI', 'DevOps', 'Mobile'][i]}工程師，熱愛技術分享`,
        avatar: null,
        followers_count: Math.floor(Math.random() * 5000) + 500,
        posts_count: Math.floor(Math.random() * 200) + 50,
        skills: [
          ['React', 'TypeScript', 'Node.js'],
          ['Python', 'Django', 'PostgreSQL'],
          ['JavaScript', 'Vue.js', 'Express'],
          ['TensorFlow', 'PyTorch', 'Python'],
          ['Docker', 'Kubernetes', 'AWS'],
          ['React Native', 'Flutter', 'Swift']
        ][i],
        is_following: false,
        reputation_score: Math.floor(Math.random() * 1000) + 500
      }));
    } catch (error) {
      console.error('獲取推薦用戶失敗:', error);
      throw new Error('無法獲取推薦用戶');
    }
  },

  /**
   * 獲取精選項目
   */
  getFeaturedProjects: async (): Promise<FeaturedProject[]> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 700));
      return [
        {
          id: '1',
          title: '智能程式碼審查工具',
          description: '基於AI的程式碼品質分析和建議系統，支援多種程式語言',
          author: {
            username: 'techmaster',
            avatar: null
          },
          image_url: 'https://via.placeholder.com/400x200?text=Code+Review+AI',
          github_url: 'https://github.com/example/code-review-ai',
          demo_url: 'https://demo.example.com',
          tech_stack: ['Python', 'TensorFlow', 'React', 'FastAPI'],
          stars_count: 2341,
          views_count: 15673
        },
        {
          id: '2',
          title: '開源任務管理平台',
          description: '企業級項目管理工具，支援敏捷開發和團隊協作',
          author: {
            username: 'projectguru',
            avatar: null
          },
          image_url: 'https://via.placeholder.com/400x200?text=Task+Manager',
          github_url: 'https://github.com/example/task-manager',
          tech_stack: ['Vue.js', 'Node.js', 'MongoDB', 'Socket.io'],
          stars_count: 1876,
          views_count: 12445
        },
        {
          id: '3',
          title: '區塊鏈投票系統',
          description: '基於以太坊的去中心化投票平台，確保投票透明和安全',
          author: {
            username: 'blockchain_dev',
            avatar: null
          },
          image_url: 'https://via.placeholder.com/400x200?text=Voting+DApp',
          github_url: 'https://github.com/example/voting-dapp',
          tech_stack: ['Solidity', 'React', 'Web3.js', 'IPFS'],
          stars_count: 1523,
          views_count: 9876
        }
      ];
    } catch (error) {
      console.error('獲取精選項目失敗:', error);
      throw new Error('無法獲取精選項目');
    }
  }
};

const ExplorePage: React.FC = () => {
  // 狀態管理
  const [activeTab, setActiveTab] = useState<'trending' | 'users' | 'projects' | 'analysis'>('trending');

  // 獲取熱門話題
  const {
    data: trendingTopics = [],
    isLoading: isLoadingTopics,
    error: topicsError
  } = useQuery({
    queryKey: ['trendingTopics'],
    queryFn: exploreAPI.getTrendingTopics,
    staleTime: 10 * 60 * 1000, // 10分鐘緩存
    retry: 2,
    retryDelay: 1000,
  });

  // 獲取推薦用戶
  const {
    data: popularUsers = [],
    isLoading: isLoadingUsers,
    error: usersError
  } = useQuery({
    queryKey: ['popularUsers'],
    queryFn: exploreAPI.getPopularUsers,
    staleTime: 15 * 60 * 1000, // 15分鐘緩存
    retry: 2,
    retryDelay: 1000,
  });

  // 獲取精選項目
  const {
    data: featuredProjects = [],
    isLoading: isLoadingProjects,
    error: projectsError
  } = useQuery({
    queryKey: ['featuredProjects'],
    queryFn: exploreAPI.getFeaturedProjects,
    staleTime: 20 * 60 * 1000, // 20分鐘緩存
    retry: 2,
    retryDelay: 1000,
  });

  // 業務邏輯處理函數
  /**
   * 處理關注用戶
   */
  const handleFollowUser = async (userId: number) => {
    try {
      // TODO: 實現關注API調用
      console.log('關注用戶:', userId);
      toast.success('已關注用戶');
    } catch (error) {
      console.error('關注用戶失敗:', error);
      toast.error('關注失敗，請重試');
    }
  };

  /**
   * 處理話題關注
   */
  const handleFollowTopic = (topicName: string) => {
    try {
      // TODO: 實現話題關注API調用
      console.log('關注話題:', topicName);
      toast.info(`關注話題：${topicName}`);
    } catch (error) {
      console.error('關注話題失敗:', error);
      toast.error('關注話題失敗，請重試');
    }
  };

  /**
   * 格式化數字顯示
   */
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // 標籤頁配置
  const tabs = [
    { key: 'trending', label: '熱門話題', icon: FireIcon },
    { key: 'users', label: '推薦用戶', icon: UserGroupIcon },
    { key: 'projects', label: '精選項目', icon: TrophyIcon },
    { key: 'analysis', label: '技術分析', icon: ChartBarIcon }
  ] as const;

  // 渲染載入狀態
  const renderLoadingState = (text: string) => (
    <div className="flex justify-center py-12">
      <LoadingSpinner text={text} />
    </div>
  );

  // 渲染錯誤狀態
  const renderErrorState = (message: string, onRetry?: () => void) => (
    <div className="text-center py-12">
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重新載入
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">探索技術世界</h1>
          <p className="text-lg text-gray-600">發現最新的技術趨勢、優秀的工程師和精彩的項目</p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FireIcon className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">熱門話題</p>
                <p className="text-2xl font-bold text-gray-900">{trendingTopics.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">推薦工程師</p>
                <p className="text-2xl font-bold text-gray-900">{popularUsers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrophyIcon className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">精選項目</p>
                <p className="text-2xl font-bold text-gray-900">{featuredProjects.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <SparklesIcon className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">活躍用戶</p>
                <p className="text-2xl font-bold text-gray-900">2.5K</p>
              </div>
            </div>
          </div>
        </div>

        {/* 標籤頁導航 */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 text-base font-medium border-b-2 flex items-center space-x-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 內容區域 */}
        <div className="space-y-8">
          {/* 熱門話題標籤頁 */}
          {activeTab === 'trending' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">熱門技術話題</h2>
              {isLoadingTopics ? (
                renderLoadingState('載入熱門話題...')
              ) : topicsError ? (
                renderErrorState('載入熱門話題失敗，請重試')
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingTopics.map((topic) => (
                    <div key={topic.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <TagIcon className="h-6 w-6 text-blue-500 mr-2" />
                          <h3 className="text-lg font-semibold text-gray-900">#{topic.name}</h3>
                        </div>
                        <div className="flex items-center text-green-500">
                          <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">+{topic.growth_rate}%</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4">{topic.description}</p>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{formatNumber(topic.posts_count)} 貼文</span>
                          <span>{formatNumber(topic.followers_count)} 關注</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleFollowTopic(topic.name)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        關注話題
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 推薦用戶標籤頁 */}
          {activeTab === 'users' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">推薦關注的工程師</h2>
              {isLoadingUsers ? (
                renderLoadingState('載入推薦用戶...')
              ) : usersError ? (
                renderErrorState('載入推薦用戶失敗，請重試')
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {popularUsers.map((user) => (
                    <div key={user.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                      <div className="text-center mb-4">
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random&size=80`}
                          alt={user.username}
                          className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
                        />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">@{user.username}</p>
                      </div>
                      
                      <p className="text-gray-700 text-sm mb-4 text-center line-clamp-2">{user.bio}</p>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {user.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span>{formatNumber(user.followers_count)} 關注者</span>
                        <span>{user.posts_count} 貼文</span>
                        <span>⭐ {user.reputation_score}</span>
                      </div>
                      
                      <button
                        onClick={() => handleFollowUser(user.id)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        關注
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 精選項目標籤頁 */}
          {activeTab === 'projects' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">精選開源項目</h2>
              {isLoadingProjects ? (
                renderLoadingState('載入精選項目...')
              ) : projectsError ? (
                renderErrorState('載入精選項目失敗，請重試')
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {featuredProjects.map((project) => (
                    <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                      <img
                        src={project.image_url}
                        alt={project.title}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/400x200?text=Project+Image';
                        }}
                      />
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-xl font-semibold text-gray-900">{project.title}</h3>
                          <div className="flex items-center text-yellow-500">
                            <span className="text-sm font-medium">{formatNumber(project.stars_count)}</span>
                            <span className="ml-1">⭐</span>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                        
                        <div className="flex items-center mb-4">
                          <img
                            src={project.author.avatar || `https://ui-avatars.com/api/?name=${project.author.username}&background=random&size=32`}
                            alt={project.author.username}
                            className="w-6 h-6 rounded-full mr-2 object-cover"
                          />
                          <span className="text-sm text-gray-600">by @{project.author.username}</span>
                          <span className="ml-auto text-sm text-gray-500 flex items-center">
                            <EyeIcon className="h-4 w-4 mr-1" />
                            {formatNumber(project.views_count)}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-4">
                          {project.tech_stack.map((tech, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {project.github_url && (
                            <a
                              href={project.github_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                            >
                              GitHub
                            </a>
                          )}
                          {project.demo_url && (
                            <a
                              href={project.demo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              Live Demo
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 技術分析標籤頁 */}
          {activeTab === 'analysis' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">技術趨勢分析</h2>
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">技術趨勢圖表</h3>
                <p className="text-gray-600 mb-6">深度分析當前技術發展趨勢和未來方向</p>
                <div className="text-sm text-gray-500">
                  此功能正在開發中，將提供詳細的技術趨勢數據和可視化圖表
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorePage; 