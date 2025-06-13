"""
EngineerHub - 評論服務層

提供評論相關的所有業務邏輯，包括：
- 評論查詢與篩選 - 處理各種評論查詢需求和高效篩選
- 評論創建、更新、刪除 - 管理評論的完整生命週期
- 評論互動（點讚、回覆） - 處理用戶與評論的互動行為
- 評論權限管理 - 確保評論系統的安全性和權限控制
- 評論通知系統 - 提供即時的評論相關通知

設計原則：
- Narrowly focused: 每個服務類別只負責特定的業務邏輯
- Flexible: 支援依賴注入和配置化，便於測試和擴展
- Loosely coupled: 最小化模組間依賴，提高代碼的可維護性和重用性
"""

from typing import List, Dict, Optional, Tuple, TYPE_CHECKING
from django.db.models import QuerySet, Q, Count, Prefetch
from django.contrib.auth import get_user_model

if TYPE_CHECKING:
    from accounts.models import User as UserType
else:
    UserType = 'User'
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache

# 導入核心異常類，提供統一的錯誤處理機制
from core.exceptions import ValidationException, PermissionException, NotFoundError
# 導入評論相關的模型
from .models import Comment, CommentLike, CommentReport
# 導入貼文模型，用於評論與貼文的關聯
from posts.models import Post

# 動態獲取 User 模型，確保與自定義用戶模型的兼容性
# 這是 Django 推薦的做法，避免硬編碼用戶模型
User = get_user_model()


class CommentQueryService:
    """
    評論查詢服務
    
    職責：
    - 處理各種評論查詢需求
    - 提供篩選和排序功能
    - 管理查詢效能優化
    """
    
    @staticmethod
    def get_comment_by_id(comment_id: int, user: Optional[UserType] = None) -> Comment:
        """
        根據 ID 獲取評論
        
        Args:
            comment_id: 評論 ID
            user: 當前用戶（用於權限檢查）
            
        Returns:
            Comment: 評論實例
            
        Raises:
            NotFoundError: 當評論不存在時
            PermissionException: 當沒有查看權限時
        """
        try:
            queryset = Comment.objects.select_related(
                'author',
                'post',
                'parent'
            ).prefetch_related('likes')
            
            comment = queryset.get(id=comment_id)
            
            # 檢查查看權限
            if not CommentPermissionService.can_view_comment(comment, user):
                raise PermissionException("您沒有權限查看此評論")
                
            return comment
            
        except Comment.DoesNotExist:
            raise NotFoundError(f"評論 ID {comment_id} 不存在")
    
    @staticmethod
    def get_post_comments(
        post: Post,
        user: Optional[UserType] = None,
        ordering: str = 'created_at',
        include_replies: bool = True
    ) -> QuerySet[Comment]:
        """
        獲取貼文的評論列表
        
        Args:
            post: 貼文實例
            user: 當前用戶
            ordering: 排序方式
            include_replies: 是否包含回覆
            
        Returns:
            QuerySet[Comment]: 評論查詢集
        """
        queryset = Comment.objects.filter(post=post)
        
        # 是否包含回覆
        if not include_replies:
            queryset = queryset.filter(parent__isnull=True)
        
        # 只顯示已發布的評論
        queryset = queryset.filter(is_deleted=False)
        
        # 預載入相關數據
        queryset = queryset.select_related(
            'author',
            'parent__author'
        ).prefetch_related(
            Prefetch('likes', queryset=CommentLike.objects.select_related('user')),
            'replies'
        )
        
        # 排序
        if ordering == 'popularity':
            queryset = queryset.annotate(
                likes_count=Count('likes')
            ).order_by('-likes_count', '-created_at')
        else:
            queryset = queryset.order_by(ordering)
            
        return queryset
    
    @staticmethod
    def get_user_comments(
        author: UserType,
        viewer: Optional[UserType] = None,
        limit: Optional[int] = None
    ) -> QuerySet[Comment]:
        """
        獲取用戶的評論
        
        Args:
            author: 評論作者
            viewer: 查看者
            limit: 限制數量
            
        Returns:
            QuerySet[Comment]: 評論查詢集
        """
        queryset = Comment.objects.filter(
            author=author,
            is_deleted=False
        ).select_related('post', 'parent')
        
        # 如果不是作者本人，只顯示公開貼文的評論
        if viewer != author:
            queryset = queryset.filter(post__status='published')
        
        queryset = queryset.order_by('-created_at')
        
        if limit:
            queryset = queryset[:limit]
            
        return queryset
    
    @staticmethod
    def get_comment_replies(
        parent_comment: Comment,
        user: Optional[UserType] = None,
        ordering: str = 'created_at'
    ) -> QuerySet[Comment]:
        """
        獲取評論的回覆
        
        Args:
            parent_comment: 父評論
            user: 當前用戶
            ordering: 排序方式
            
        Returns:
            QuerySet[Comment]: 回覆查詢集
        """
        return Comment.objects.filter(
            parent=parent_comment,
            is_deleted=False
        ).select_related('author').prefetch_related('likes').order_by(ordering)


class CommentManagementService:
    """
    評論管理服務
    
    職責：
    - 處理評論的創建、更新、刪除
    - 管理評論狀態變更
    - 處理評論相關的業務邏輯
    """
    
    @staticmethod
    @transaction.atomic
    def create_comment(
        author: UserType,
        post: Post,
        content: str,
        parent: Optional[Comment] = None
    ) -> Comment:
        """
        創建新評論
        
        Args:
            author: 評論作者
            post: 關聯貼文
            content: 評論內容
            parent: 父評論（回覆時）
            
        Returns:
            Comment: 創建的評論實例
            
        Raises:
            ValidationException: 數據驗證失敗時
            PermissionException: 沒有評論權限時
        """
        # 檢查評論權限
        if not CommentPermissionService.can_comment_on_post(post, author):
            raise PermissionException("您沒有權限在此貼文下評論")
        
        # 驗證內容
        CommentValidationService.validate_comment_content(content)
        
        # 如果是回覆，檢查父評論是否屬於同一貼文
        if parent and parent.post != post:
            raise ValidationException("回覆的評論必須屬於同一貼文")
        
        # 創建評論
        comment = Comment.objects.create(
            author=author,
            post=post,
            content=content.strip(),
            parent=parent
        )
        
        # 觸發創建後事件
        CommentEventService.on_comment_created(comment)
        
        return comment
    
    @staticmethod
    @transaction.atomic
    def update_comment(comment: Comment, user: UserType, content: str) -> Comment:
        """
        更新評論
        
        Args:
            comment: 要更新的評論
            user: 執行更新的用戶
            content: 新的評論內容
            
        Returns:
            Comment: 更新後的評論
            
        Raises:
            PermissionException: 沒有編輯權限時
            ValidationException: 數據驗證失敗時
        """
        # 檢查編輯權限
        if not CommentPermissionService.can_edit_comment(comment, user):
            raise PermissionException("您沒有權限編輯此評論")
        
        # 驗證內容
        CommentValidationService.validate_comment_content(content)
        
        # 更新評論
        comment.content = content.strip()
        comment.updated_at = timezone.now()
        comment.is_edited = True
        comment.save()
        
        # 觸發更新後事件
        CommentEventService.on_comment_updated(comment)
        
        return comment
    
    @staticmethod
    @transaction.atomic
    def delete_comment(comment: Comment, user: UserType) -> bool:
        """
        刪除評論
        
        Args:
            comment: 要刪除的評論
            user: 執行刪除的用戶
            
        Returns:
            bool: 是否成功刪除
            
        Raises:
            PermissionException: 沒有刪除權限時
        """
        # 檢查刪除權限
        if not CommentPermissionService.can_delete_comment(comment, user):
            raise PermissionException("您沒有權限刪除此評論")
        
        # 觸發刪除前事件
        CommentEventService.on_comment_before_delete(comment)
        
        # 軟刪除
        comment.is_deleted = True
        comment.deleted_at = timezone.now()
        comment.save()
        
        return True


class CommentInteractionService:
    """
    評論互動服務
    
    職責：
    - 處理評論點讚、取消點讚
    - 處理評論舉報
    - 記錄評論互動歷史
    """
    
    @staticmethod
    @transaction.atomic
    def toggle_like(comment: Comment, user: UserType) -> Tuple[bool, int]:
        """
        切換評論點讚狀態
        
        Args:
            comment: 評論實例
            user: 用戶實例
            
        Returns:
            Tuple[bool, int]: (是否已點讚, 總點讚數)
        """
        like, created = CommentLike.objects.get_or_create(
            comment=comment,
            user=user
        )
        
        if not created:
            # 已存在，則刪除（取消點讚）
            like.delete()
            liked = False
        else:
            liked = True
        
        # 更新快取中的點讚數
        likes_count = comment.likes.count()
        cache_key = f"comment_likes_count_{comment.id}"
        cache.set(cache_key, likes_count, 3600)  # 快取 1 小時
        
        # 觸發互動事件
        CommentEventService.on_comment_liked(comment, user, liked)
        
        return liked, likes_count
    
    @staticmethod
    @transaction.atomic
    def report_comment(
        comment: Comment,
        reporter: UserType,
        reason: str,
        description: Optional[str] = None
    ) -> CommentReport:
        """
        舉報評論
        
        Args:
            comment: 被舉報的評論
            reporter: 舉報人
            reason: 舉報原因
            description: 詳細描述
            
        Returns:
            CommentReport: 舉報記錄
            
        Raises:
            ValidationException: 重複舉報時
        """
        # 檢查是否已經舉報過
        if CommentReport.objects.filter(
            comment=comment,
            reporter=reporter
        ).exists():
            raise ValidationException("您已經舉報過此評論")
        
        # 創建舉報記錄
        report = CommentReport.objects.create(
            comment=comment,
            reporter=reporter,
            reason=reason,
            description=description
        )
        
        # 觸發舉報事件
        CommentEventService.on_comment_reported(comment, reporter, reason)
        
        return report


class CommentPermissionService:
    """
    評論權限服務
    
    職責：
    - 檢查評論相關權限
    - 提供統一的權限檢查接口
    """
    
    @staticmethod
    def can_view_comment(comment: Comment, user: Optional[UserType]) -> bool:
        """檢查是否可以查看評論"""
        # 已刪除的評論只有作者和管理員可以查看
        if comment.is_deleted:
            if not user:
                return False
            return comment.author == user or user.is_staff
        
        # 其他情況下都可以查看
        return True
    
    @staticmethod
    def can_comment_on_post(post: Post, user: UserType) -> bool:
        """檢查是否可以在貼文下評論"""
        if not user:
            return False
        
        # 檢查貼文是否允許評論
        if hasattr(post, 'allow_comments') and not post.allow_comments:
            return False
        
        # 檢查用戶是否被拉黑
        if hasattr(post, 'author') and hasattr(user, 'blocked_users'):
            if user.blocked_users.filter(id=post.author.id).exists():
                return False
        
        return True
    
    @staticmethod
    def can_edit_comment(comment: Comment, user: UserType) -> bool:
        """檢查是否可以編輯評論"""
        if not user:
            return False
        
        # 作者可以編輯自己的評論
        if comment.author == user:
            return True
        
        # 管理員可以編輯所有評論
        if user.is_staff or user.is_superuser:
            return True
        
        return False
    
    @staticmethod
    def can_delete_comment(comment: Comment, user: UserType) -> bool:
        """檢查是否可以刪除評論"""
        if not user:
            return False
        
        # 作者可以刪除自己的評論
        if comment.author == user:
            return True
        
        # 貼文作者可以刪除自己貼文下的評論
        if comment.post.author == user:
            return True
        
        # 管理員可以刪除所有評論
        if user.is_staff or user.is_superuser:
            return True
        
        return False


class CommentValidationService:
    """
    評論驗證服務
    
    職責：
    - 驗證評論數據
    - 提供統一的驗證邏輯
    """
    
    @staticmethod
    def validate_comment_content(content: str) -> None:
        """
        驗證評論內容
        
        Args:
            content: 評論內容
            
        Raises:
            ValidationException: 驗證失敗時
        """
        if not content or not content.strip():
            raise ValidationException("評論內容不能為空")
        
        if len(content.strip()) < 2:
            raise ValidationException("評論內容至少需要 2 個字符")
        
        if len(content) > 2000:
            raise ValidationException("評論內容不能超過 2000 個字符")
        
        # 檢查是否包含敏感詞（這裡可以集成敏感詞過濾系統）
        CommentValidationService._check_sensitive_words(content)
    
    @staticmethod
    def _check_sensitive_words(content: str) -> None:
        """
        檢查敏感詞
        
        Args:
            content: 要檢查的內容
            
        Raises:
            ValidationException: 包含敏感詞時
        """
        # 這裡可以集成第三方敏感詞檢測服務
        # 暫時使用簡單的關鍵詞檢查
        sensitive_words = ['垃圾', '廣告', 'spam']
        
        content_lower = content.lower()
        for word in sensitive_words:
            if word in content_lower:
                raise ValidationException(f"評論內容包含不當詞彙: {word}")


class CommentEventService:
    """
    評論事件服務
    
    職責：
    - 處理評論相關事件
    - 觸發通知和其他副作用
    """
    
    @staticmethod
    def on_comment_created(comment: Comment) -> None:
        """評論創建後的處理"""
        # 發送通知給貼文作者
        if comment.author != comment.post.author:
            from notifications.services import NotificationService
            NotificationService.create_comment_notification(
                actor=comment.author,
                recipient=comment.post.author,
                target_object=comment
            )
        
        # 如果是回覆，發送通知給被回覆的用戶
        if comment.parent and comment.author != comment.parent.author:
            from notifications.services import NotificationService
            NotificationService.create_reply_notification(
                actor=comment.author,
                recipient=comment.parent.author,
                target_object=comment
            )
    
    @staticmethod
    def on_comment_updated(comment: Comment) -> None:
        """評論更新後的處理"""
        # 清除相關快取
        cache_keys = [
            f"comment_detail_{comment.id}",
            f"comment_likes_count_{comment.id}",
            f"post_comments_{comment.post.id}",
        ]
        cache.delete_many(cache_keys)
    
    @staticmethod
    def on_comment_liked(comment: Comment, user: UserType, liked: bool) -> None:
        """評論被點讚/取消點讚後的處理"""
        if liked and comment.author != user:
            # 發送通知給評論作者
            from notifications.services import NotificationService
            NotificationService.create_like_notification(
                actor=user,
                recipient=comment.author,
                target_object=comment
            )
    
    @staticmethod
    def on_comment_reported(comment: Comment, reporter: UserType, reason: str) -> None:
        """評論被舉報後的處理"""
        # 發送通知給管理員
        from notifications.services import NotificationService
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # 獲取所有管理員
        admins = User.objects.filter(is_staff=True)
        for admin in admins:
            NotificationService.create_notification(
                recipient=admin,
                notification_type='system',
                title='評論舉報',
                message=f'用戶 {reporter.username} 舉報了評論，原因：{reason}',
                actor=reporter,
                target_object=comment,
                priority='high'
            )
    
    @staticmethod
    def on_comment_before_delete(comment: Comment) -> None:
        """評論刪除前的處理"""
        # 清除相關快取
        cache_keys = [
            f"comment_detail_{comment.id}",
            f"comment_likes_count_{comment.id}",
            f"post_comments_{comment.post.id}",
        ]
        cache.delete_many(cache_keys)


class CommentModerationService:
    """
    評論審核服務
    
    職責：
    - 處理評論審核
    - 管理評論舉報
    - 自動化內容過濾
    """
    
    @staticmethod
    def get_pending_reports() -> QuerySet[CommentReport]:
        """獲取待處理的舉報"""
        return CommentReport.objects.filter(
            status='pending'
        ).select_related('comment', 'reporter').order_by('-created_at')
    
    @staticmethod
    @transaction.atomic
    def handle_report(
        report: CommentReport,
        moderator: UserType,
        action: str,
        reason: Optional[str] = None
    ) -> bool:
        """
        處理舉報
        
        Args:
            report: 舉報記錄
            moderator: 處理人
            action: 處理動作 ('approve', 'reject', 'delete_comment')
            reason: 處理原因
            
        Returns:
            bool: 是否處理成功
        """
        if action == 'approve':
            # 確認舉報有效，刪除評論
            CommentModerationService.delete_comment_by_moderation(
                report.comment, 
                moderator, 
                f"舉報確認: {reason}"
            )
            report.status = 'approved'
        elif action == 'reject':
            # 拒絕舉報
            report.status = 'rejected'
        else:
            raise ValidationException(f"無效的處理動作: {action}")
        
        report.moderator = moderator
        report.handled_at = timezone.now()
        report.moderator_note = reason
        report.save()
        
        return True
    
    @staticmethod
    @transaction.atomic
    def delete_comment_by_moderation(
        comment: Comment,
        moderator: UserType,
        reason: str
    ) -> None:
        """
        管理員刪除評論
        
        Args:
            comment: 要刪除的評論
            moderator: 執行刪除的管理員
            reason: 刪除原因
        """
        comment.is_deleted = True
        comment.deleted_at = timezone.now()
        comment.deleted_by = moderator
        comment.deletion_reason = reason
        comment.save()
        
        # 發送通知給評論作者
        from notifications.services import NotificationService
        NotificationService.create_notification(
            recipient=comment.author,
            notification_type='system',
            title='評論已被管理員刪除',
            message=f'您的評論因為以下原因被管理員刪除：{reason}',
            actor=moderator,
            target_object=comment,
            priority='high'
        )


class CommentStatisticsService:
    """
    評論統計服務
    
    職責：
    - 提供評論統計數據
    - 分析評論趨勢
    """
    
    @staticmethod
    def get_comment_stats(comment: Comment) -> Dict:
        """
        獲取評論統計數據
        
        Args:
            comment: 評論實例
            
        Returns:
            Dict: 統計數據
        """
        return {
            'likes_count': comment.likes.count(),
            'replies_count': comment.replies.filter(is_deleted=False).count(),
            'reports_count': getattr(comment, 'reports', Comment.objects.none()).count(),
        }
    
    @staticmethod
    def get_post_comment_stats(post: Post) -> Dict:
        """
        獲取貼文的評論統計
        
        Args:
            post: 貼文實例
            
        Returns:
            Dict: 統計數據
        """
        comments = Comment.objects.filter(post=post, is_deleted=False)
        
        return {
            'total_comments': comments.count(),
            'top_level_comments': comments.filter(parent__isnull=True).count(),
            'replies': comments.filter(parent__isnull=False).count(),
            'total_likes': CommentLike.objects.filter(comment__post=post).count(),
        }
    
    @staticmethod
    def get_user_comment_stats(user: UserType, days: int = 30) -> Dict:
        """
        獲取用戶評論統計
        
        Args:
            user: 用戶實例
            days: 統計天數
            
        Returns:
            Dict: 統計數據
        """
        from datetime import timedelta
        start_date = timezone.now() - timedelta(days=days)
        
        comments = Comment.objects.filter(
            author=user,
            created_at__gte=start_date,
            is_deleted=False
        )
        
        return {
            'comments_count': comments.count(),
            'likes_received': CommentLike.objects.filter(
                comment__author=user,
                comment__created_at__gte=start_date
            ).count(),
            'replies_count': comments.filter(parent__isnull=False).count(),
            'top_comments': comments.annotate(
                likes_count=Count('likes')
            ).order_by('-likes_count')[:5],
        } 