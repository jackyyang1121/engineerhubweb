import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import ProfileCard from '../../components/profile/ProfileCard';
import ProjectCard from '../../components/profile/ProjectCard';
import PostCard from '../../components/posts/PostCard';
import type { Project } from '../../components/profile/ProjectCard';
import { useAuthStore } from '../../store/authStore';
import * as postApi from '../../api/postApi';
import { getUserByUsername } from '../../api/userApi';

// 模擬獲取用戶項目
const fetchUserProjects = async (): Promise<Project[]> => {
  // 模擬網絡延遲
  await new Promise(resolve => setTimeout(resolve, 700));
  
  // 返回模擬數據 - 將來會使用 username 參數從API獲取實際數據
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
const followUser = async (): Promise<void> => {
  // 模擬網絡延遲
  await new Promise(resolve => setTimeout(resolve, 300));
  // 將來會調用實際API
};

// 模擬取消關注用戶API
const unfollowUser = async (): Promise<void> => {
  // 模擬網絡延遲
  await new Promise(resolve => setTimeout(resolve, 300));
  // 將來會調用實際API
};

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'posts' | 'projects'>('posts');
  const currentUser = useAuthStore(state => state.user);
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
    queryFn: () => getUserByUsername(username || ''),
    enabled: !!username,
  });
  
  // 獲取用戶項目
  const { 
    data: projects, 
    isLoading: isLoadingProjects, 
    isError: isProjectsError 
  } = useQuery({
    queryKey: ['userProjects', username],
    queryFn: () => fetchUserProjects(),
    enabled: !!username && activeTab === 'projects',
  });
  
  // 獲取用戶貼文
  const { 
    data: postsData, 
    isLoading: isLoadingPosts, 
    isError: isPostsError 
  } = useQuery({
    queryKey: ['userPosts', username],
    queryFn: () => postApi.getUserPosts(profileData?.id || '', 1, 10),
    enabled: !!profileData?.id && activeTab === 'posts',
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

  const posts = postsData?.results || [];

  return (
    <div>
      {/* 個人資料卡片 */}
      <div className="mb-8">
        <ProfileCard 
          user={profileData}
          stats={{
            posts_count: profileData.posts_count,
            followers_count: profileData.followers_count,
            following_count: profileData.following_count
          }}
          isFollowing={profileData.is_following || false}
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
            項目
          </button>
        </div>
      </div>
      
      {/* 內容區域 */}
      <div>
        {activeTab === 'posts' && (
          <div>
            {isLoadingPosts && <p>正在加載貼文...</p>}
            {isPostsError && <p className="text-red-500">無法加載貼文</p>}
            {posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post}
                    onPostDeleted={handlePostDeleted}
                  />
                ))}
              </div>
            ) : (
              !isLoadingPosts && <p>這位用戶還沒有發布任何貼文。</p>
            )}
          </div>
        )}
        
        {activeTab === 'projects' && (
          <div>
            {isLoadingProjects && <p>正在加載項目...</p>}
            {isProjectsError && <p className="text-red-500">無法加載項目</p>}
            {projects && projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              !isLoadingProjects && <p>這位用戶還沒有添加任何項目。</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage; 