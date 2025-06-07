/**
 * 作品集展示頁面
 * 顯示所有精選作品集項目
 */

import { useState, useEffect } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { PortfolioGrid } from '../../components/portfolio/PortfolioGrid';
import { logger } from '../../utils/logger';
import { 
  StarIcon,
  SparklesIcon,
  CodeBracketIcon,
  FunnelIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

// 篩選選項類型
type FilterType = 'all' | 'featured' | 'recent';
type SortType = 'date' | 'views' | 'title';

const PortfolioPage = () => {
  // 狀態管理
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  
  // 從 store 獲取數據和方法
  const { 
    projects, 
    featuredProjects, 
    isLoading, 
    error,
    fetchProjects,
    fetchFeaturedProjects,
    clearError
  } = usePortfolioStore();

  // 初始加載數據
  useEffect(() => {
    logger.info('portfolio', '加載作品集頁面');
    
    // 根據篩選器加載對應數據
    if (filter === 'featured') {
      fetchFeaturedProjects();
    } else {
      fetchProjects();
    }
  }, [filter, fetchProjects, fetchFeaturedProjects]);

  // 過濾和排序項目
  const getFilteredProjects = () => {
    let filteredProjects = filter === 'featured' ? featuredProjects : projects;
    
    // 搜尋過濾
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredProjects = filteredProjects.filter(project => 
        project.title.toLowerCase().includes(term) ||
        project.description.toLowerCase().includes(term) ||
        project.technologies.some(tech => tech.toLowerCase().includes(term))
      );
    }
    
    // 排序
    const sorted = [...filteredProjects].sort((a, b) => {
      switch (sort) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'views':
          return (b.views || 0) - (a.views || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
    
    return sorted;
  };

  // 處理刷新
  const handleRefresh = () => {
    if (filter === 'featured') {
      fetchFeaturedProjects();
    } else {
      fetchProjects();
    }
  };

  // 錯誤處理
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              clearError();
              handleRefresh();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  const filteredProjects = getFilteredProjects();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 頁面標題 */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <CodeBracketIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">作品集展示</h1>
        </div>
        <p className="text-gray-600">
          探索社群成員的優秀項目，獲得靈感並分享您的作品
        </p>
      </div>

      {/* 篩選和搜尋欄 */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        {/* 搜尋框 */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋項目名稱、描述或技術..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
            />
          </div>
        </div>

        {/* 篩選器切換 */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
        >
          <FunnelIcon className="h-5 w-5" />
          <span>{showFilters ? '隱藏篩選器' : '顯示篩選器'}</span>
        </button>

        {/* 篩選選項 */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 類型篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                項目類型
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    filter === 'all'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="flex items-center space-x-1">
                    <SparklesIcon className="h-4 w-4" />
                    <span>全部</span>
                  </span>
                </button>
                <button
                  onClick={() => setFilter('featured')}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    filter === 'featured'
                      ? 'bg-yellow-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="flex items-center space-x-1">
                    <StarIcon className="h-4 w-4" />
                    <span>精選</span>
                  </span>
                </button>
              </div>
            </div>

            {/* 排序方式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                排序方式
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortType)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              >
                <option value="date">最新發布</option>
                <option value="views">瀏覽最多</option>
                <option value="title">標題排序</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 統計信息 */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-600">
          找到 <span className="font-semibold text-gray-900">{filteredProjects.length}</span> 個項目
        </p>
        <button
          onClick={handleRefresh}
          className="text-blue-600 hover:text-blue-700 transition-colors duration-200"
        >
          刷新
        </button>
      </div>

      {/* 項目網格 */}
      <PortfolioGrid
        projects={filteredProjects}
        isLoading={isLoading}
        isOwner={false}
        onRefresh={handleRefresh}
      />
    </div>
  );
};

export default PortfolioPage;