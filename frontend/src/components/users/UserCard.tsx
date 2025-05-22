import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

// 從統一類型文件導入類型定義
import type { UserData } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface UserCardProps {
  user: UserData;
  onFollow?: () => void;
  onUnfollow?: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ 
  user,
  onFollow,
  onUnfollow
}) => {
  const [isFollowing, setIsFollowing] = useState(user.is_following || false);
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useAuthStore(state => state.user);
  const isCurrentUser = currentUser?.id === user.id;
  
  // 處理關注/取消關注
  const handleFollowToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (isFollowing) {
        // 取消關注
        await onUnfollow?.();
        setIsFollowing(false);
        toast.success(`已取消關注 ${user.username}`);
      } else {
        // 關注
        await onFollow?.();
        setIsFollowing(true);
        toast.success(`已關注 ${user.username}`);
      }
    } catch (error) {
      toast.error('操作失敗，請重試');
      console.error('關注/取消關注錯誤:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100 p-4 flex items-start">
      {/* 用戶頭像 */}
      <Link to={`/profile/${user.username}`} className="shrink-0">
        <img
          src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random&size=128`}
          alt={user.username}
          className="w-16 h-16 rounded-full object-cover"
        />
      </Link>
      
      {/* 用戶信息 */}
      <div className="ml-4 flex-grow">
        <div className="flex justify-between items-start">
          <div>
            <Link 
              to={`/profile/${user.username}`}
              className="text-lg font-medium text-gray-900 hover:text-primary-600"
            >
              {user.username}
            </Link>
            
            {user.is_online && (
              <span className="inline-block ml-2 h-2 w-2 rounded-full bg-green-500" 
                title="在線"
              />
            )}
            
            {/* 用戶的技能標籤 */}
            {user.skill_tags && user.skill_tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {user.skill_tags.slice(0, 3).map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {user.skill_tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{user.skill_tags.length - 3}
                  </span>
                )}
              </div>
            )}
            
            {/* 用戶簡介 */}
            {user.bio && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{user.bio}</p>
            )}
          </div>
          
          {/* 關注按鈕 */}
          {!isCurrentUser && (
            <button
              onClick={handleFollowToggle}
              disabled={isLoading}
              className={`ml-2 px-3 py-1 rounded-md text-sm ${
                isFollowing 
                  ? 'bg-white text-primary-600 border border-primary-600 hover:bg-gray-50' 
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {isLoading ? '處理中...' : isFollowing ? '已關注' : '關注'}
            </button>
          )}
        </div>
        
        {/* 其他統計信息 */}
        <div className="mt-2 flex items-center text-sm text-gray-500 space-x-3">
          {user.stats?.followers_count !== undefined && (
            <span>{user.stats.followers_count} 位關注者</span>
          )}
          {user.stats?.posts_count !== undefined && (
            <span>{user.stats.posts_count} 則貼文</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard; 