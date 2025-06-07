"""
評論服務層
處理評論相關的業務邏輯
"""

from typing import Optional, List
from django.db import transaction
from django.db.models import QuerySet, F
from django.contrib.auth import get_user_model

from core.services import BaseService, register_service, ServiceError, NotFoundError, PermissionError, BusinessLogicError
from .models import Comment
from posts.models import Post
import logging

User = get_user_model()


@register_service('comment_service')
class CommentService(BaseService[Comment]):
    """評論核心服務"""
    model_class = Comment
    logger_name = 'engineerhub.comments.service'
    
    def create_comment(self, author: User, post: Post, content: str, 
                      parent: Optional[Comment] = None) -> Comment:
        """
        創建評論
        
        Args:
            author: 評論作者
            post: 所屬貼文
            content: 評論內容
            parent: 父評論（用於回覆）
            
        Returns:
            Comment: 創建的評論
        """
        try:
            # 驗證內容長度
            if not content or len(content.strip()) == 0:
                raise BusinessLogicError("評論內容不能為空")
            
            if len(content) > 1000:
                raise BusinessLogicError("評論內容不能超過 1000 個字元")
            
            # 如果是回覆，檢查父評論是否屬於同一貼文
            if parent and parent.post != post:
                raise BusinessLogicError("回覆的評論不屬於此貼文")
            
            with transaction.atomic():
                comment = Comment.objects.create(
                    author=author,
                    post=post,
                    content=content,
                    parent=parent
                )
                
                # 更新貼文評論數
                post.comments_count = F('comments_count') + 1
                post.save(update_fields=['comments_count'])
                
                # 如果是回覆，更新父評論的回覆數
                if parent:
                    parent.replies_count = F('replies_count') + 1
                    parent.save(update_fields=['replies_count'])
                
                self.logger.info(f"User {author.username} created comment on post {post.id}")
                return comment
                
        except BusinessLogicError:
            raise
        except Exception as e:
            self.logger.error(f"Failed to create comment: {str(e)}")
            raise ServiceError("創建評論失敗", details={"error": str(e)})
    
    def update_comment(self, comment: Comment, user: User, content: str) -> Comment:
        """
        更新評論
        
        Args:
            comment: 要更新的評論
            user: 請求用戶
            content: 新內容
            
        Returns:
            Comment: 更新後的評論
        """
        # 檢查權限
        if comment.author != user:
            raise PermissionError("您沒有權限編輯此評論")
        
        # 驗證內容
        if not content or len(content.strip()) == 0:
            raise BusinessLogicError("評論內容不能為空")
        
        if len(content) > 1000:
            raise BusinessLogicError("評論內容不能超過 1000 個字元")
        
        try:
            comment.content = content
            comment.is_edited = True
            comment.save()
            
            self.logger.info(f"User {user.username} updated comment {comment.id}")
            return comment
            
        except Exception as e:
            self.logger.error(f"Failed to update comment: {str(e)}")
            raise ServiceError("更新評論失敗", details={"error": str(e)})
    
    def delete_comment(self, comment: Comment, user: User) -> None:
        """
        刪除評論
        
        Args:
            comment: 要刪除的評論
            user: 請求用戶
        """
        # 檢查權限（評論作者或貼文作者可以刪除）
        if comment.author != user and comment.post.author != user:
            raise PermissionError("您沒有權限刪除此評論")
        
        try:
            with transaction.atomic():
                post = comment.post
                parent = comment.parent
                
                # 如果有子評論，軟刪除
                if comment.replies.exists():
                    comment.is_deleted = True
                    comment.content = "[此評論已被刪除]"
                    comment.save()
                else:
                    # 沒有子評論，硬刪除
                    comment.delete()
                
                # 更新貼文評論數
                post.comments_count = F('comments_count') - 1
                post.save(update_fields=['comments_count'])
                
                # 如果是回覆，更新父評論的回覆數
                if parent:
                    parent.replies_count = F('replies_count') - 1
                    parent.save(update_fields=['replies_count'])
                
                self.logger.info(f"User {user.username} deleted comment {comment.id}")
                
        except Exception as e:
            self.logger.error(f"Failed to delete comment: {str(e)}")
            raise ServiceError("刪除評論失敗", details={"error": str(e)})
    
    def get_post_comments(self, post: Post, include_replies: bool = True) -> QuerySet[Comment]:
        """
        獲取貼文的評論
        
        Args:
            post: 貼文
            include_replies: 是否包含回覆
            
        Returns:
            QuerySet[Comment]: 評論查詢集
        """
        queryset = Comment.objects.filter(post=post)
        
        if not include_replies:
            queryset = queryset.filter(parent__isnull=True)
        
        return queryset.select_related('author', 'parent').order_by('created_at')
    
    def get_comment_replies(self, comment: Comment) -> QuerySet[Comment]:
        """
        獲取評論的回覆
        
        Args:
            comment: 父評論
            
        Returns:
            QuerySet[Comment]: 回覆查詢集
        """
        return comment.replies.select_related('author').order_by('created_at')
    
    def like_comment(self, user: User, comment: Comment) -> None:
        """
        點讚評論
        
        Args:
            user: 用戶
            comment: 評論
        """
        # TODO: 實現評論點讚功能
        # 需要先創建 CommentLike 模型
        pass
    
    def get_user_comments(self, user: User) -> QuerySet[Comment]:
        """
        獲取用戶的所有評論
        
        Args:
            user: 用戶
            
        Returns:
            QuerySet[Comment]: 評論查詢集
        """
        return Comment.objects.filter(
            author=user,
            is_deleted=False
        ).select_related('post', 'parent').order_by('-created_at')
    
    def search_comments(self, query: str, post: Optional[Post] = None) -> QuerySet[Comment]:
        """
        搜尋評論
        
        Args:
            query: 搜尋關鍵字
            post: 限定在特定貼文內搜尋
            
        Returns:
            QuerySet[Comment]: 搜尋結果
        """
        queryset = Comment.objects.filter(
            content__icontains=query,
            is_deleted=False
        )
        
        if post:
            queryset = queryset.filter(post=post)
        
        return queryset.select_related('author', 'post').order_by('-created_at')[:50]