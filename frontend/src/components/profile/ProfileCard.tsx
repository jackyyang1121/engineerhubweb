import { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../store/authStore';
import type { UserData } from '../../api/authApi';

interface ProfileCardProps {
  user: UserData;
  stats: {
    posts_count: number;
    followers_count: number;
    following_count: number;
  };
  isFollowing: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  stats,
  isFollowing,
  onFollow,
  onUnfollow
}) => {
  const [following, setFollowing] = useState(isFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useAuthStore(state => state.user);
  const isCurrentUser = currentUser?.id === user.id;
  
  // 處理關注/取消關注
  const handleFollowToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (following) {
        // 取消關注
        await onUnfollow?.();
        setFollowing(false);
        toast.success(`已取消關注 ${user.username}`);
      } else {
        // 關注
        await onFollow?.();
        setFollowing(true);
        toast.success(`已關注 ${user.username}`);
      }
    } catch (error) {
      toast.error('操作失敗，請重試');
      console.error('關注/取消關注錯誤:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 當前用戶最近上線的顯示文本
  const getLastOnlineText = () => {
    if (user.is_online) {
      return '在線';
    }
    
    if (!user.last_online) {
      return '最近未上線';
    }
    
    // 這裡可以使用 date-fns 格式化時間，但為了簡單起見，直接返回
    return `最後上線於 ${new Date(user.last_online).toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 個人資料頭部 - 背景和頭像 */}
      <div className="relative h-48 bg-gradient-to-r from-primary-500 to-primary-700">
        <div className="absolute -bottom-16 left-8">
          <img
            src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random&size=128`}
            alt={user.username}
            className="w-32 h-32 rounded-full border-4 border-white"
          />
        </div>
      </div>
      
      {/* 個人資料信息 */}
      <div className="pt-20 pb-6 px-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.username}</h1>
            <p className="text-gray-500">{user.email}</p>
            <p className="text-sm text-gray-500 mt-1">{getLastOnlineText()}</p>
          </div>
          
          {/* 關注/編輯按鈕 */}
          {isCurrentUser ? (
            <a 
              href="/settings/profile" 
              className="btn-secondary py-2 px-4"
            >
              編輯個人資料
            </a>
          ) : (
            <button
              onClick={handleFollowToggle}
              disabled={isLoading}
              className={`py-2 px-4 rounded-md ${
                following 
                  ? 'bg-white text-primary-600 border border-primary-600 hover:bg-gray-50' 
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {isLoading ? '處理中...' : following ? '已關注' : '關注'}
            </button>
          )}
        </div>
        
        {/* 個人簡介 */}
        {user.bio && (
          <div className="mb-4">
            <p className="text-gray-800 whitespace-pre-line">{user.bio}</p>
          </div>
        )}
        
        {/* 技能標籤 */}
        {user.skill_tags && user.skill_tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {user.skill_tags.map((tag, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* 統計信息 */}
        <div className="flex space-x-6 mt-6 border-t border-gray-100 pt-4">
          <div className="text-center">
            <div className="text-xl font-bold">{stats.posts_count}</div>
            <div className="text-gray-500 text-sm">貼文</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{stats.followers_count}</div>
            <div className="text-gray-500 text-sm">關注者</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{stats.following_count}</div>
            <div className="text-gray-500 text-sm">正在關注</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard; 