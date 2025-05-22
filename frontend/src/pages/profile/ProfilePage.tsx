import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import ProfileCard from '../../components/profile/ProfileCard';
import ProjectCard from '../../components/profile/ProjectCard';
import PostCard from '../../components/posts/PostCard';
import type { Project } from '../../components/profile/ProjectCard';
import { useAuthStore } from '../../store/authStore';
import * as postApi from '../../api/postApi';
import type { UserData } from '../../api/authApi';

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

// 模擬獲取用戶項目
const fetchUserProjects = async (username: string): Promise<Project[]> => {
  // 模擬網絡延遲
  await new Promise(resolve => setTimeout(resolve, 700));
  
  // 返回模擬數據
  return [
    {
      id: '1',
      title: '智能任務管理系統',
      description: '基於React和Node.js的智能任務管理應用，支持AI任務分類和優先級排序',
      image_url: 'https://via.placeholder.com/400x200?text=Task+Manager',
      github_url: 'https://github.com/example/task-manager',
      demo_url: 'https://task-manager-demo.example.com',
      tech_stack: ['React', 'Node.js', 'MongoDB', 'Express']
    },
    {
      id: '2',
      title: '程式碼分析工具',
      description: '分析代碼質量和性能的工具，提供改進建議和可視化報告',
      image_url: 'https://via.placeholder.com/400x200?text=Code+Analyzer',
      github_url: 'https://github.com/example/code-analyzer',
      tech_stack: ['Python', 'Django', 'D3.js', 'PostgreSQL']
    },
    {
      id: '3',
      title: '即時聊天應用',
      description: '支持文本、圖片和視頻的端到端加密聊天應用',
      image_url: 'https://via.placeholder.com/400x200?text=Chat+App',
      github_url: 'https://github.com/example/chat-app',
      demo_url: 'https://chat-app-demo.example.com',
      tech_stack: ['React', 'Firebase', 'WebRTC', 'Tailwind CSS']
    }
  ];
};

// 模擬關注用戶API
const followUser = async (userId: string): Promise<void> => {
  // 模擬網絡延遲
  await new Promise(resolve => setTimeout(resolve, 300));
  // 實際項目中應調用實際API
};

// 模擬取消關注用戶API
const unfollowUser = async (userId: string): Promise<void> => {
  // 模擬網絡延遲
  await new Promise(resolve => setTimeout(resolve, 300));
  // 實際項目中應調用實際API
};

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'posts' | 'projects'>('posts');
  const currentUser = useAuthStore(state => state.user);
  
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
  
  // 獲取用戶項目
  const { 
    data: projects, 
    isLoading: isLoadingProjects, 
    isError: isProjectsError 
  } = useQuery({
    queryKey: ['userProjects', username],
    queryFn: () => fetchUserProjects(username || ''),
    enabled: !!username && activeTab === 'projects',
  });
  
  // 獲取用戶貼文
  const { 
    data: postsData, 
    isLoading: isLoadingPosts, 
    isError: isPostsError 
  } = useQuery({
    queryKey: ['userPosts', username],
    queryFn: () => postApi.getUserPosts(profileData?.user.id || '', 1, 10),
    enabled: !!profileData?.user.id && activeTab === 'posts',
  });
  
  // 處理關注用戶
  const handleFollow = async () => {
    if (!profileData) return;
    
    try {
      await followUser(profileData.user.id);
    } catch (error) {
      toast.error('關注用戶失敗，請重試');
      console.error('關注用戶錯誤:', error);
    }
  };
  
  // 處理取消關注用戶
  const handleUnfollow = async () => {
    if (!profileData) return;
    
    try {
      await unfollowUser(profileData.user.id);
    } catch (error) {
      toast.error('取消關注用戶失敗，請重試');
      console.error('取消關注用戶錯誤:', error);
    }
  };
  
  // 處理刷新貼文
  const handleRefreshPosts = () => {
    // 刷新貼文查詢
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
            <PostCard key={post.id} post={post} onPostUpdated={handleRefreshPosts} />
          ))}
        </div>
      )}
      
      {/* 項目標籤頁 */}
      {activeTab === 'projects' && (
        <div>
          {isLoadingProjects && (
            <div className="text-center py-8">
              <p className="text-gray-500">加載項目中...</p>
            </div>
          )}
          
          {isProjectsError && (
            <div className="text-center py-8">
              <p className="text-red-500">加載項目失敗</p>
            </div>
          )}
          
          {!isLoadingProjects && !isProjectsError && projects?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-600">暫無作品集</p>
            </div>
          )}
          
          {!isLoadingProjects && !isProjectsError && projects && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage; 