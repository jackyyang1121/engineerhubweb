"""
用戶帳號服務層
處理用戶認證、個人資料管理等業務邏輯
"""

from typing import Optional, Dict, Any, List
from django.db import transaction, models
from django.db.models import F, Q
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import timedelta
import logging

from core.services import BaseService, register_service, ServiceError, NotFoundError, BusinessLogicError
from .models import Follow, UserProfile
from posts.models import Post

User = get_user_model()


@register_service('user_service')
class UserService(BaseService[User]):
    """用戶核心服務"""
    model_class = User
    logger_name = 'engineerhub.accounts.service'
    
    def create_user(self, username: str, email: str, password: str, **kwargs) -> User:
        """
        創建新用戶
        
        Args:
            username: 用戶名
            email: 電子郵件
            password: 密碼
            **kwargs: 其他用戶欄位
            
        Returns:
            User: 創建的用戶
        """
        try:
            # 檢查用戶名是否已存在
            if User.objects.filter(username=username).exists():
                raise BusinessLogicError("用戶名已被使用")
            
            # 檢查郵箱是否已存在
            if User.objects.filter(email=email).exists():
                raise BusinessLogicError("電子郵件已被註冊")
            
            with transaction.atomic():
                # 創建用戶
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    **kwargs
                )
                
                # 創建用戶個人資料
                UserProfile.objects.create(user=user)
                
                self.logger.info(f"Created new user: {username}")
                return user
                
        except Exception as e:
            self.logger.error(f"Failed to create user: {str(e)}")
            if isinstance(e, BusinessLogicError):
                raise
            raise ServiceError("創建用戶失敗", details={"error": str(e)})
    
    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """
        用戶認證
        
        Args:
            username: 用戶名或電子郵件
            password: 密碼
            
        Returns:
            User: 認證成功的用戶，失敗返回 None
        """
        # 嘗試使用用戶名認證
        user = authenticate(username=username, password=password)
        
        # 如果失敗，嘗試使用郵箱認證
        if not user and '@' in username:
            try:
                user_obj = User.objects.get(email=username)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass
        
        if user:
            # 更新最後登錄時間
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            self.logger.info(f"User authenticated: {user.username}")
        else:
            self.logger.warning(f"Authentication failed for: {username}")
        
        return user
    
    def update_profile(self, user: User, **kwargs) -> User:
        """
        更新用戶個人資料
        
        Args:
            user: 用戶實例
            **kwargs: 要更新的欄位
            
        Returns:
            User: 更新後的用戶
        """
        try:
            with transaction.atomic():
                # 更新用戶基本信息
                user_fields = ['first_name', 'last_name', 'email']
                for field in user_fields:
                    if field in kwargs:
                        setattr(user, field, kwargs.pop(field))
                
                user.full_clean()
                user.save()
                
                # 更新用戶個人資料
                if kwargs:
                    profile = user.profile
                    for key, value in kwargs.items():
                        if hasattr(profile, key):
                            setattr(profile, key, value)
                    profile.full_clean()
                    profile.save()
                
                self.logger.info(f"Updated profile for user: {user.username}")
                return user
                
        except DjangoValidationError as e:
            self.logger.warning(f"Validation error updating profile: {str(e)}")
            raise BusinessLogicError("個人資料更新失敗", details={"errors": str(e)})
        except Exception as e:
            self.logger.error(f"Failed to update profile: {str(e)}")
            raise ServiceError("更新個人資料失敗", details={"error": str(e)})
    
    def get_user_statistics(self, user: User) -> Dict[str, int]:
        """
        獲取用戶統計數據
        
        Args:
            user: 用戶實例
            
        Returns:
            Dict: 統計數據
        """
        try:
            stats = {
                'posts_count': Post.objects.filter(author=user).count(),
                'followers_count': user.followers.count(),
                'following_count': user.following.count(),
                'likes_received': Post.objects.filter(author=user).aggregate(
                    total=models.Sum('likes_count')
                )['total'] or 0
            }
            return stats
        except Exception as e:
            self.logger.error(f"Failed to get user statistics: {str(e)}")
            return {
                'posts_count': 0,
                'followers_count': 0,
                'following_count': 0,
                'likes_received': 0
            }
    
    def search_users(self, query: str, limit: int = 20) -> List[User]:
        """
        搜尋用戶
        
        Args:
            query: 搜尋關鍵字
            limit: 結果數量限制
            
        Returns:
            List[User]: 搜尋結果
        """
        queryset = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        ).exclude(is_active=False)[:limit]
        
        return list(queryset)


@register_service('follow_service')
class FollowService(BaseService[Follow]):
    """用戶關注服務"""
    model_class = Follow
    logger_name = 'engineerhub.accounts.follow'
    
    def follow_user(self, follower: User, following: User) -> Follow:
        """
        關注用戶
        
        Args:
            follower: 關注者
            following: 被關注者
            
        Returns:
            Follow: 關注關係
        """
        # 檢查是否是自己
        if follower == following:
            raise BusinessLogicError("不能關注自己")
        
        # 檢查是否已經關注
        if Follow.objects.filter(follower=follower, following=following).exists():
            raise BusinessLogicError("您已經關注了此用戶")
        
        try:
            with transaction.atomic():
                follow = Follow.objects.create(
                    follower=follower,
                    following=following
                )
                
                # 更新用戶統計
                follower.profile.following_count = F('following_count') + 1
                follower.profile.save(update_fields=['following_count'])
                
                following.profile.followers_count = F('followers_count') + 1
                following.profile.save(update_fields=['followers_count'])
                
                self.logger.info(f"User {follower.username} followed {following.username}")
                return follow
                
        except Exception as e:
            self.logger.error(f"Failed to follow user: {str(e)}")
            raise ServiceError("關注失敗", details={"error": str(e)})
    
    def unfollow_user(self, follower: User, following: User) -> None:
        """
        取消關注用戶
        
        Args:
            follower: 關注者
            following: 被關注者
        """
        try:
            follow = Follow.objects.get(follower=follower, following=following)
            
            with transaction.atomic():
                follow.delete()
                
                # 更新用戶統計
                follower.profile.following_count = F('following_count') - 1
                follower.profile.save(update_fields=['following_count'])
                
                following.profile.followers_count = F('followers_count') - 1
                following.profile.save(update_fields=['followers_count'])
                
                self.logger.info(f"User {follower.username} unfollowed {following.username}")
                
        except Follow.DoesNotExist:
            raise BusinessLogicError("您未關注此用戶")
        except Exception as e:
            self.logger.error(f"Failed to unfollow user: {str(e)}")
            raise ServiceError("取消關注失敗", details={"error": str(e)})
    
    def get_followers(self, user: User) -> List[User]:
        """獲取用戶的關注者列表"""
        return User.objects.filter(following__following=user).distinct()
    
    def get_following(self, user: User) -> List[User]:
        """獲取用戶關注的人列表"""
        return User.objects.filter(followers__follower=user).distinct()
    
    def is_following(self, follower: User, following: User) -> bool:
        """檢查是否關注了某用戶"""
        return Follow.objects.filter(follower=follower, following=following).exists()
    
    def get_mutual_follows(self, user: User) -> List[User]:
        """獲取互相關注的用戶列表"""
        following = set(self.get_following(user))
        followers = set(self.get_followers(user))
        mutual = following.intersection(followers)
        return list(mutual)