import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import ProfileCard from '../../components/profile/ProfileCard';
import PostCard from '../../components/posts/PostCard';
import { useAuthStore } from '../../store/authStore';
import { usePortfolioStore } from '../../store/portfolioStore';
import { PortfolioGrid } from '../../components/portfolio/PortfolioGrid';
import { PortfolioModal } from '../../components/portfolio/PortfolioModal';
import type { UserData } from '../../api/authApi';
import * as postApi from '../../api/postApi';
import { PlusIcon } from '@heroicons/react/24/outline';

// 模擬的API調用函數，實際項目中應替換為真實API
const fetchUserProfile = async (username: string): Promise<{
  user: UserData;
  stats: {
    posts_count: number;
    followers_count: number;
    following_count: number;
  };
  is_following: boolean;
}> => {
  // 這裡應該調用實際的API
  // 模擬網絡延遲
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 返回模擬數據
  return {
    user: {
      id: '1',
      username,
      email: `${username}@example.com`,
      avatar: `https://ui-avatars.com/api/?name=${username}&background=random&size=256`,
      followers_count: 128,
      following_count: 97,
      posts_count: 42,
      likes_received_count: 0,
      bio: '工程師 | 技術愛好者 | 開源貢獻者\n熱愛解決問題和創建優秀的用戶體驗。',
      skill_tags: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Docker'],
      is_online: true,
      last_online: new Date().toISOString()
    },
    stats: {
      posts_count: 42,
      followers_count: 128,
      following_count: 97
    },
    is_following: false
  };
};

// 模擬關注用戶API
const followUser = async (): Promise<void> => {
  // 模擬網絡延遲
  await new Promise(resolve => setTimeout(resolve, 300));
  // 將來會使用 userId 參數調用實際API
};

// 模擬取消關注用戶API
const unfollowUser = async (): Promise<void> => {
  // 模擬網絡延遲
  await new Promise(resolve => setTimeout(resolve, 300));
  // 將來會使用 userId 參數調用實際API
};

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);
  const { fetchUserProjects, userProjects } = usePortfolioStore();
  const [activeTab, setActiveTab] = useState<'posts' | 'projects'>('posts');
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const isCurrentUser = currentUser?.username === username;
  const queryClient = useQueryClient();
  
  // 如果沒有用戶名參數，跳轉到自己的個人資料頁
  useEffect(() => {
    if (!username && currentUser) {
      navigate(`/profile/${currentUser.username}`);
    }
  }, [username, currentUser, navigate]);
  
  // 獲取用戶資料
  const { 
    data: profileData, 
    isLoading: isLoadingProfile, 
    isError: isProfileError 
  } = useQuery({
    queryKey: ['userProfile', username],
    queryFn: () => fetchUserProfile(username || ''),
    enabled: !!username,
  });
  
  // 取得用戶作品集
  const {
    data: projects,
    isLoading: isLoadingProjects,
    refetch: refetchProjects
  } = useQuery({
    queryKey: ['userProjects', username],
    queryFn: async () => {
      if (!username || !profileData?.user.id) return [];
      await fetchUserProjects(profileData.user.id);
      return userProjects.get(profileData.user.id) || [];
    },
    enabled: !!username && !!profileData && activeTab === 'projects',
    staleTime: 5 * 60 * 1000
  });
  
  // 獲取用戶貼文
  const { 
    data: postsData, 
    isLoading: isLoadingPosts, 
    isError: isPostsError 
  } = useQuery({
    queryKey: ['userPosts', username],
    queryFn: () => {
      // 如果是當前用戶的個人頁面，使用 currentUser.id
      if (username === currentUser?.username && currentUser?.id) {
        return postApi.getUserPosts(currentUser.id, 1, 10);
      }
      // 否則使用 profileData 中的用戶 ID
      return postApi.getUserPosts(profileData?.user.id || '', 1, 10);
    },
    enabled: !!(
      (username === currentUser?.username && currentUser?.id) || 
      (profileData?.user.id && activeTab === 'posts')
    ),
  });
  
  // 處理關注用戶
  const handleFollow = async () => {
    if (!profileData) return;
    
    try {
      await followUser();
    } catch (error) {
      toast.error('關注用戶失敗，請重試');
      console.error('關注用戶錯誤:', error);
    }
  };
  
  // 處理取消關注用戶
  const handleUnfollow = async () => {
    if (!profileData) return;
    
    try {
      await unfollowUser();
    } catch (error) {
      toast.error('取消關注用戶失敗，請重試');
      console.error('取消關注用戶錯誤:', error);
    }
  };
  
  // 處理刷新貼文
  const handleRefreshPosts = () => {
    queryClient.invalidateQueries({ queryKey: ['userPosts', username] });
  };

  // 處理貼文刪除成功
  const handlePostDeleted = () => {
    handleRefreshPosts(); // 刷新貼文列表
  };

  // 加載中或錯誤狀態
  if (isLoadingProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">正在加載用戶資料...</p>
      </div>
    );
  }
  
  if (isProfileError || !profileData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">無法加載用戶資料</p>
        <button 
          onClick={() => navigate('/')} 
          className="mt-4 btn-primary py-2 px-4"
        >
          返回首頁
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 個人資料卡片 */}
      <div className="mb-8">
        <ProfileCard 
          user={profileData.user}
          stats={profileData.stats}
          isFollowing={profileData.is_following}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
        />
      </div>
      
      {/* 標籤頁導航 */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            className={`py-4 text-base font-medium border-b-2 ${
              activeTab === 'posts' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('posts')}
          >
            貼文
          </button>
          <button
            className={`py-4 text-base font-medium border-b-2 ${
              activeTab === 'projects' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('projects')}
          >
            作品集
          </button>
        </div>
      </div>
      
      {/* 貼文標籤頁 */}
      {activeTab === 'posts' && (
        <div>
          {isLoadingPosts && (
            <div className="text-center py-8">
              <p className="text-gray-500">加載貼文中...</p>
            </div>
          )}
          
          {isPostsError && (
            <div className="text-center py-8">
              <p className="text-red-500">加載貼文失敗</p>
              <button 
                onClick={handleRefreshPosts} 
                className="mt-4 btn-primary py-2 px-4"
              >
                重試
              </button>
            </div>
          )}
          
          {!isLoadingPosts && !isPostsError && postsData?.results.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-600">暫無貼文</p>
            </div>
          )}
          
          {!isLoadingPosts && !isPostsError && postsData?.results.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              onPostDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}
      
      {/* 項目標籤頁 */}
      {activeTab === 'projects' && (
        <div>
          {/* 新增按鈕 */}
          {isCurrentUser && (
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setIsPortfolioModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all duration-300"
              >
                <PlusIcon className="h-5 w-5" />
                <span>新增項目</span>
              </button>
            </div>
          )}
          
          {/* 作品集網格 */}
          <PortfolioGrid
            projects={projects || []}
            isLoading={isLoadingProjects}
            isOwner={isCurrentUser}
            onRefresh={refetchProjects}
          />
        </div>
      )}

      {/* 作品集模態 */}
      {isCurrentUser && (
        <PortfolioModal
          isOpen={isPortfolioModalOpen}
          onClose={() => setIsPortfolioModalOpen(false)}
          onSuccess={() => {
            setIsPortfolioModalOpen(false);
            refetchProjects();
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage; 