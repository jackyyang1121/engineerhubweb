"""
貼文服務層
處理所有貼文相關的業務邏輯
"""

from typing import Optional, List, Dict, Any
from django.db import transaction
from django.db.models import QuerySet, Q, F
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from core.services import BaseService, register_service, ServiceError, NotFoundError, PermissionError, BusinessLogicError
from .models import Post, Like, Save, Report, PostView, PostShare
from accounts.models import Follow

User = get_user_model()


@register_service('post_service')
class PostService(BaseService[Post]):
    """貼文核心服務"""
    model_class = Post
    logger_name = 'engineerhub.posts.service'
    
    def create_post(self, author: User, content: str, code_snippet: Optional[str] = None, 
                   media_files: Optional[List] = None, **kwargs) -> Post:
        """
        創建貼文
        
        Args:
            author: 作者
            content: 內容
            code_snippet: 程式碼片段
            media_files: 媒體文件
            
        Returns:
            Post: 創建的貼文
        """
        try:
            with transaction.atomic():
                post = self.create(
                    author=author,
                    content=content,
                    code_snippet=code_snippet,
                    **kwargs
                )
                
                # 處理媒體文件
                if media_files:
                    # TODO: 實現媒體文件處理邏輯
                    pass
                
                self.logger.info(f"User {author.username} created post {post.id}")
                return post
                
        except Exception as e:
            self.logger.error(f"Failed to create post: {str(e)}")
            raise ServiceError("創建貼文失敗", details={"error": str(e)})
    
    def update_post(self, post: Post, user: User, **kwargs) -> Post:
        """更新貼文"""
        # 檢查權限
        if post.author != user:
            raise PermissionError("您沒有權限編輯此貼文")
        
        return self.update(post, **kwargs)
    
    def delete_post(self, post: Post, user: User) -> None:
        """刪除貼文"""
        # 檢查權限
        if post.author != user:
            raise PermissionError("您沒有權限刪除此貼文")
        
        self.delete(post)
    
    def get_user_posts(self, user: User) -> QuerySet[Post]:
        """獲取用戶的貼文"""
        return self.filter(author=user).order_by('-created_at')
    
    def get_following_posts(self, user: User) -> QuerySet[Post]:
        """獲取關注用戶的貼文"""
        following_users = Follow.objects.filter(follower=user).values_list('following', flat=True)
        if not following_users:
            return Post.objects.none()
        
        return self.filter(author__in=following_users).order_by('-created_at')
    
    def get_trending_posts(self, hours: int = 24) -> QuerySet[Post]:
        """獲取熱門貼文"""
        time_threshold = timezone.now() - timedelta(hours=hours)
        return self.filter(
            created_at__gte=time_threshold
        ).order_by('-likes_count', '-comments_count', '-created_at')
    
    def get_recommended_posts(self, user: Optional[User] = None, days: int = 7) -> QuerySet[Post]:
        """
        獲取推薦貼文
        
        Args:
            user: 用戶（如果提供，返回個性化推薦）
            days: 時間範圍（天數）
            
        Returns:
            QuerySet[Post]: 推薦的貼文
        """
        time_threshold = timezone.now() - timedelta(days=days)
        queryset = self.filter(created_at__gte=time_threshold)
        
        if user and user.is_authenticated:
            # TODO: 實現個性化推薦算法
            # 現在簡單返回熱門貼文
            pass
        
        return queryset.order_by('-likes_count', '-comments_count', '-created_at')
    
    def search_posts(self, keyword: str) -> QuerySet[Post]:
        """搜尋貼文"""
        return self.filter(
            Q(content__icontains=keyword) | 
            Q(code_snippet__icontains=keyword)
        ).order_by('-created_at')


@register_service('post_interaction_service')
class PostInteractionService(BaseService):
    """貼文互動服務（點讚、收藏、轉發等）"""
    logger_name = 'engineerhub.posts.interaction'
    
    def __init__(self):
        # 不需要 model_class，因為我們處理多個模型
        self.logger = logging.getLogger(self.logger_name)
    
    def like_post(self, user: User, post: Post) -> Like:
        """點讚貼文"""
        # 檢查是否已經點讚
        if Like.objects.filter(user=user, post=post).exists():
            raise BusinessLogicError("您已經點讚過這篇貼文")
        
        try:
            with transaction.atomic():
                like = Like.objects.create(user=user, post=post)
                self.logger.info(f"User {user.username} liked post {post.id}")
                return like
        except Exception as e:
            self.logger.error(f"Failed to like post: {str(e)}")
            raise ServiceError("點讚失敗", details={"error": str(e)})
    
    def unlike_post(self, user: User, post: Post) -> None:
        """取消點讚"""
        try:
            like = Like.objects.get(user=user, post=post)
            like.delete()
            self.logger.info(f"User {user.username} unliked post {post.id}")
        except Like.DoesNotExist:
            raise BusinessLogicError("您未點讚過這篇貼文")
        except Exception as e:
            self.logger.error(f"Failed to unlike post: {str(e)}")
            raise ServiceError("取消點讚失敗", details={"error": str(e)})
    
    def save_post(self, user: User, post: Post) -> Save:
        """收藏貼文"""
        # 檢查是否已經收藏
        if Save.objects.filter(user=user, post=post).exists():
            raise BusinessLogicError("您已經收藏過這篇貼文")
        
        try:
            with transaction.atomic():
                save = Save.objects.create(user=user, post=post)
                self.logger.info(f"User {user.username} saved post {post.id}")
                return save
        except Exception as e:
            self.logger.error(f"Failed to save post: {str(e)}")
            raise ServiceError("收藏失敗", details={"error": str(e)})
    
    def unsave_post(self, user: User, post: Post) -> None:
        """取消收藏"""
        try:
            save = Save.objects.get(user=user, post=post)
            save.delete()
            self.logger.info(f"User {user.username} unsaved post {post.id}")
        except Save.DoesNotExist:
            raise BusinessLogicError("您未收藏過這篇貼文")
        except Exception as e:
            self.logger.error(f"Failed to unsave post: {str(e)}")
            raise ServiceError("取消收藏失敗", details={"error": str(e)})
    
    def share_post(self, user: User, post: Post, comment: str = '') -> PostShare:
        """轉發貼文"""
        # 檢查是否已經轉發
        if PostShare.objects.filter(user=user, post=post).exists():
            raise BusinessLogicError("您已經轉發過這篇貼文")
        
        # 檢查是否試圖轉發自己的貼文
        if post.author == user:
            raise BusinessLogicError("不能轉發自己的貼文")
        
        try:
            with transaction.atomic():
                share = PostShare.objects.create(
                    user=user,
                    post=post,
                    comment=comment
                )
                self.logger.info(f"User {user.username} shared post {post.id}")
                return share
        except Exception as e:
            self.logger.error(f"Failed to share post: {str(e)}")
            raise ServiceError("轉發失敗", details={"error": str(e)})
    
    def unshare_post(self, user: User, post: Post) -> None:
        """取消轉發"""
        try:
            share = PostShare.objects.get(user=user, post=post)
            share.delete()
            self.logger.info(f"User {user.username} unshared post {post.id}")
        except PostShare.DoesNotExist:
            raise BusinessLogicError("您未轉發過這篇貼文")
        except Exception as e:
            self.logger.error(f"Failed to unshare post: {str(e)}")
            raise ServiceError("取消轉發失敗", details={"error": str(e)})
    
    def report_post(self, reporter: User, post: Post, reason: str, description: str = '') -> Report:
        """舉報貼文"""
        # 檢查是否已經舉報過
        if Report.objects.filter(reporter=reporter, post=post).exists():
            raise BusinessLogicError("您已經舉報過這篇貼文")
        
        try:
            with transaction.atomic():
                report = Report.objects.create(
                    reporter=reporter,
                    post=post,
                    reason=reason,
                    description=description
                )
                self.logger.info(f"User {reporter.username} reported post {post.id}")
                return report
        except Exception as e:
            self.logger.error(f"Failed to report post: {str(e)}")
            raise ServiceError("舉報失敗", details={"error": str(e)})
    
    def get_user_saved_posts(self, user: User) -> QuerySet[Post]:
        """獲取用戶收藏的貼文"""
        return Post.objects.filter(saved_by__user=user).order_by('-saved_by__created_at')
    
    def get_user_shared_posts(self, user: User) -> QuerySet[PostShare]:
        """獲取用戶轉發的貼文"""
        return PostShare.objects.filter(user=user).order_by('-created_at')


import logging  # 需要這個導入