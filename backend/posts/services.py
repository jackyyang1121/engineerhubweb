"""
EngineerHub - 貼文服務層

提供貼文相關的所有業務邏輯，包括：
- 貼文查詢與篩選 - 處理各種貼文查詢需求和高效篩選機制
- 貼文創建、更新、刪除 - 管理貼文的完整生命週期
- 貼文互動（點讚、收藏、分享） - 處理用戶與貼文的互動行為
- 貼文推薦算法 - 提供智能的內容推薦系統
- 貼文搜索與分析 - 支援全文搜索和數據分析功能

設計原則：
- Narrowly focused: 每個服務類別只負責特定的業務邏輯
- Flexible: 支援依賴注入和配置化，便於測試和擴展
- Loosely coupled: 最小化模組間依賴，提高代碼的可維護性和重用性
"""

from typing import List, Dict, Optional, Tuple, Union, TYPE_CHECKING
from django.db.models import QuerySet, Q, Count, Avg, F, Prefetch
from django.contrib.auth import get_user_model

if TYPE_CHECKING:
    from accounts.models import User as UserType
else:
    UserType = 'User'
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache
from django.conf import settings

# 導入核心異常類，提供統一的錯誤處理機制
from core.exceptions import ValidationException, PermissionException, NotFoundError
# 導入貼文相關的模型
from .models import Post, Like, PostView, PostShare, Save, Report
# 如果 Tag 模型不存在，則移除標籤功能
try:
    from .models import Tag
except ImportError:
    Tag = None
# 導入貼文分析和推薦相關模組
from .analytics import UserEngagement, RecommendationLog
from .recommendation import RecommendationEngine, RecommendationAnalytics

# 動態獲取 User 模型，確保與自定義用戶模型的兼容性
# 這是 Django 推薦的做法，避免硬編碼用戶模型
User = get_user_model()


class PostQueryService:
    """
    貼文查詢服務
    
    職責：
    - 處理各種貼文查詢需求
    - 提供篩選和排序功能
    - 管理查詢效能優化
    """
    
    @staticmethod
    def get_post_by_id(post_id: int, user: Optional[UserType] = None) -> Post:
        """
        根據 ID 獲取貼文
        
        Args:
            post_id: 貼文 ID
            user: 當前用戶（用於權限檢查）
            
        Returns:
            Post: 貼文實例
            
        Raises:
            NotFoundError: 當貼文不存在時
            PermissionException: 當沒有查看權限時
        """
        try:
            queryset = Post.objects.select_related(
                'author', 
                'category'
            ).prefetch_related(
                'tags',
                'likes',
                'comments'
            )
            
            post = queryset.get(id=post_id)
            
            # 檢查查看權限
            if not PostPermissionService.can_view_post(post, user):
                raise PermissionException("您沒有權限查看此貼文")
                
            return post
            
        except Post.DoesNotExist:
            raise NotFoundError(f"貼文 ID {post_id} 不存在")
    
    @staticmethod
    def get_posts_for_user(
        user: Optional[UserType] = None,
        filters: Optional[Dict] = None,
        ordering: str = '-created_at',
        limit: Optional[int] = None
    ) -> QuerySet[Post]:
        """
        獲取用戶可見的貼文列表
        
        Args:
            user: 當前用戶
            filters: 篩選條件
            ordering: 排序方式
            limit: 限制數量
            
        Returns:
            QuerySet[Post]: 貼文查詢集
        """
        queryset = Post.objects.select_related(
            'author',
            'category'
        ).prefetch_related(
            'tags',
            Prefetch('likes', queryset=Like.objects.select_related('user')),
            'comments__author'
        )
        
        # 只顯示已發布的貼文
        queryset = queryset.filter(status='published')
        
        # 應用篩選條件
        if filters:
            queryset = PostFilterService.apply_filters(queryset, filters)
        
        # 排序
        queryset = queryset.order_by(ordering)
        
        # 限制數量
        if limit:
            queryset = queryset[:limit]
            
        return queryset
    
    @staticmethod
    def get_user_posts(
        author: UserType,
        viewer: Optional[UserType] = None,
        status: Optional[str] = None
    ) -> QuerySet[Post]:
        """
        獲取特定用戶的貼文
        
        Args:
            author: 貼文作者
            viewer: 查看者
            status: 貼文狀態篩選
            
        Returns:
            QuerySet[Post]: 貼文查詢集
        """
        queryset = Post.objects.filter(author=author)
        
        # 如果不是作者本人，只顯示已發布的貼文
        if viewer != author:
            queryset = queryset.filter(status='published')
        elif status:
            queryset = queryset.filter(status=status)
            
        return queryset.select_related('category').prefetch_related('tags')
    
    @staticmethod
    def search_posts(
        query: str,
        user: Optional[UserType] = None,
        filters: Optional[Dict] = None
    ) -> QuerySet[Post]:
        """
        搜索貼文
        
        Args:
            query: 搜索關鍵字
            user: 當前用戶
            filters: 額外篩選條件
            
        Returns:
            QuerySet[Post]: 搜索結果
        """
        from .search_indexes import PostSearchService
        return PostSearchService.search(query, user, filters)


class PostFilterService:
    """
    貼文篩選服務
    
    職責：
    - 處理各種篩選條件
    - 提供標準化的篩選接口
    """
    
    @staticmethod
    def apply_filters(queryset: QuerySet[Post], filters: Dict) -> QuerySet[Post]:
        """
        應用篩選條件
        
        Args:
            queryset: 原始查詢集
            filters: 篩選條件字典
            
        Returns:
            QuerySet[Post]: 篩選後的查詢集
        """
        # 分類篩選
        if 'category' in filters:
            queryset = queryset.filter(category__slug=filters['category'])
        
        # 標籤篩選
        if 'tags' in filters:
            tag_list = filters['tags'] if isinstance(filters['tags'], list) else [filters['tags']]
            queryset = queryset.filter(tags__slug__in=tag_list).distinct()
        
        # 作者篩選
        if 'author' in filters:
            queryset = queryset.filter(author__username=filters['author'])
        
        # 時間範圍篩選
        if 'date_from' in filters:
            queryset = queryset.filter(created_at__gte=filters['date_from'])
        if 'date_to' in filters:
            queryset = queryset.filter(created_at__lte=filters['date_to'])
        
        # 熱門度篩選
        if 'min_likes' in filters:
            queryset = queryset.annotate(
                likes_count=Count('likes')
            ).filter(likes_count__gte=filters['min_likes'])
        
        return queryset


class PostManagementService:
    """
    貼文管理服務
    
    職責：
    - 處理貼文的創建、更新、刪除
    - 管理貼文狀態變更
    - 處理貼文相關的業務邏輯
    """
    
    @staticmethod
    @transaction.atomic
    def create_post(author: UserType, data: Dict) -> Post:
        """
        創建新貼文
        
        Args:
            author: 貼文作者
            data: 貼文數據
            
        Returns:
            Post: 創建的貼文實例
            
        Raises:
            ValidationException: 數據驗證失敗時
        """
        # 驗證數據
        PostValidationService.validate_post_data(data)
        
        # 處理標籤
        tags_data = data.pop('tags', [])
        
        # 創建貼文
        post = Post.objects.create(
            author=author,
            **data
        )
        
        # 添加標籤
        if tags_data:
            PostTagService.add_tags_to_post(post, tags_data)
        
        # 觸發創建後事件
        PostEventService.on_post_created(post)
        
        return post
    
    @staticmethod
    @transaction.atomic
    def update_post(post: Post, user: UserType, data: Dict) -> Post:
        """
        更新貼文
        
        Args:
            post: 要更新的貼文
            user: 執行更新的用戶
            data: 更新數據
            
        Returns:
            Post: 更新後的貼文
            
        Raises:
            PermissionException: 沒有編輯權限時
            ValidationException: 數據驗證失敗時
        """
        # 檢查編輯權限
        if not PostPermissionService.can_edit_post(post, user):
            raise PermissionException("您沒有權限編輯此貼文")
        
        # 驗證數據
        PostValidationService.validate_post_data(data, is_update=True)
        
        # 處理標籤
        tags_data = data.pop('tags', None)
        
        # 更新貼文字段
        for field, value in data.items():
            setattr(post, field, value)
        
        post.updated_at = timezone.now()
        post.save()
        
        # 更新標籤
        if tags_data is not None:
            PostTagService.update_post_tags(post, tags_data)
        
        # 觸發更新後事件
        PostEventService.on_post_updated(post)
        
        return post
    
    @staticmethod
    @transaction.atomic
    def delete_post(post: Post, user: UserType) -> bool:
        """
        刪除貼文
        
        Args:
            post: 要刪除的貼文
            user: 執行刪除的用戶
            
        Returns:
            bool: 是否成功刪除
            
        Raises:
            PermissionException: 沒有刪除權限時
        """
        # 檢查刪除權限
        if not PostPermissionService.can_delete_post(post, user):
            raise PermissionException("您沒有權限刪除此貼文")
        
        # 觸發刪除前事件
        PostEventService.on_post_before_delete(post)
        
        # 軟刪除或硬刪除
        if hasattr(post, 'is_deleted'):
            post.is_deleted = True
            post.deleted_at = timezone.now()
            post.save()
        else:
            post.delete()
        
        return True


class PostInteractionService:
    """
    貼文互動服務
    
    職責：
    - 處理點讚、取消點讚
    - 處理收藏、取消收藏
    - 處理分享功能
    - 記錄查看歷史
    """
    
    @staticmethod
    @transaction.atomic
    def toggle_like(post: Post, user: UserType) -> Tuple[bool, int]:
        """
        切換貼文點讚狀態
        
        Args:
            post: 貼文實例
            user: 用戶實例
            
        Returns:
            Tuple[bool, int]: (是否已點讚, 總點讚數)
        """
        like, created = Like.objects.get_or_create(
            post=post,
            user=user
        )
        
        if not created:
            # 已存在，則刪除（取消點讚）
            like.delete()
            liked = False
        else:
            liked = True
        
        # 更新快取中的點讚數
        likes_count = post.likes.count()
        cache_key = f"post_likes_count_{post.id}"
        cache.set(cache_key, likes_count, 3600)  # 快取 1 小時
        
        # 觸發互動事件
        PostEventService.on_post_liked(post, user, liked)
        
        return liked, likes_count
    
    @staticmethod
    def record_view(post: Post, user: Optional[UserType] = None, ip_address: str = None) -> bool:
        """
        記錄貼文查看
        
        Args:
            post: 貼文實例
            user: 用戶實例（可選）
            ip_address: IP 地址
            
        Returns:
            bool: 是否成功記錄
        """
        # 避免重複記錄（同一用戶或IP在短時間內的查看）
        cache_key = f"post_view_{post.id}_{user.id if user else ip_address}"
        if cache.get(cache_key):
            return False
        
        # 記錄查看
        PostView.objects.create(
            post=post,
            user=user,
            ip_address=ip_address
        )
        
        # 設置快取防止重複記錄（5分鐘內）
        cache.set(cache_key, True, 300)
        
        # 觸發查看事件
        PostEventService.on_post_viewed(post, user)
        
        return True
    
    @staticmethod
    def share_post(post: Post, user: UserType, platform: str = 'link') -> PostShare:
        """
        分享貼文
        
        Args:
            post: 貼文實例
            user: 用戶實例
            platform: 分享平台
            
        Returns:
            PostShare: 分享記錄
        """
        share = PostShare.objects.create(
            post=post,
            user=user,
            platform=platform
        )
        
        # 觸發分享事件
        PostEventService.on_post_shared(post, user, platform)
        
        return share


class PostTagService:
    """
    貼文標籤服務
    
    職責：
    - 管理貼文標籤關聯
    - 處理標籤的創建和更新
    """
    
    @staticmethod
    def add_tags_to_post(post: Post, tag_names: List[str]) -> None:
        """
        為貼文添加標籤
        
        Args:
            post: 貼文實例
            tag_names: 標籤名稱列表
        """
        if Tag is None:
            # 如果沒有 Tag 模型，則跳過標籤功能
            return
            
        tags = []
        for tag_name in tag_names:
            tag, created = Tag.objects.get_or_create(
                name=tag_name.strip(),
                defaults={'slug': tag_name.strip().lower().replace(' ', '-')}
            )
            tags.append(tag)
        
        post.tags.add(*tags)
    
    @staticmethod
    def update_post_tags(post: Post, tag_names: List[str]) -> None:
        """
        更新貼文標籤
        
        Args:
            post: 貼文實例
            tag_names: 新的標籤名稱列表
        """
        if Tag is None:
            # 如果沒有 Tag 模型，則跳過標籤功能
            return
            
        # 清除現有標籤
        post.tags.clear()
        
        # 添加新標籤
        if tag_names:
            PostTagService.add_tags_to_post(post, tag_names)


class PostPermissionService:
    """
    貼文權限服務
    
    職責：
    - 檢查貼文相關權限
    - 提供統一的權限檢查接口
    """
    
    @staticmethod
    def can_view_post(post: Post, user: Optional[UserType]) -> bool:
        """檢查是否可以查看貼文"""
        # 已發布的貼文所有人都可以查看
        if post.status == 'published':
            return True
        
        # 未登入用戶無法查看未發布的貼文
        if not user:
            return False
        
        # 作者可以查看自己的所有貼文
        if post.author == user:
            return True
        
        # 管理員可以查看所有貼文
        if user.is_staff or user.is_superuser:
            return True
        
        return False
    
    @staticmethod
    def can_edit_post(post: Post, user: UserType) -> bool:
        """檢查是否可以編輯貼文"""
        if not user:
            return False
        
        # 作者可以編輯自己的貼文
        if post.author == user:
            return True
        
        # 管理員可以編輯所有貼文
        if user.is_staff or user.is_superuser:
            return True
        
        return False
    
    @staticmethod
    def can_delete_post(post: Post, user: UserType) -> bool:
        """檢查是否可以刪除貼文"""
        return PostPermissionService.can_edit_post(post, user)


class PostValidationService:
    """
    貼文驗證服務
    
    職責：
    - 驗證貼文數據
    - 提供統一的驗證邏輯
    """
    
    @staticmethod
    def validate_post_data(data: Dict, is_update: bool = False) -> None:
        """
        驗證貼文數據
        
        Args:
            data: 要驗證的數據
            is_update: 是否為更新操作
            
        Raises:
            ValidationException: 驗證失敗時
        """
        # 標題驗證
        if 'title' in data:
            title = data['title'].strip() if data['title'] else ''
            if not title:
                raise ValidationException("標題不能為空")
            if len(title) > 200:
                raise ValidationException("標題長度不能超過 200 個字符")
        
        # 內容驗證
        if 'content' in data:
            content = data['content'].strip() if data['content'] else ''
            if not content:
                raise ValidationException("內容不能為空")
            if len(content) > 50000:
                raise ValidationException("內容長度不能超過 50000 個字符")
        
        # 摘要驗證
        if 'summary' in data and data['summary']:
            if len(data['summary']) > 500:
                raise ValidationException("摘要長度不能超過 500 個字符")
        
        # 標籤驗證
        if 'tags' in data and data['tags']:
            if len(data['tags']) > 10:
                raise ValidationException("標籤數量不能超過 10 個")


class PostEventService:
    """
    貼文事件服務
    
    職責：
    - 處理貼文相關事件
    - 觸發通知和其他副作用
    """
    
    @staticmethod
    def on_post_created(post: Post) -> None:
        """貼文創建後的處理"""
        # 發送通知給關注者
        from notifications.services import NotificationService
        # 獲取所有關注者並發送通知
        followers = post.author.followers.all()
        for follower in followers:
            NotificationService.create_notification(
                recipient=follower,
                notification_type='post',
                title=f'{post.author.username} 發布了新貼文',
                message=f'{post.author.username} 發布了新貼文：{post.title}',
                actor=post.author,
                target_object=post
            )
    
    @staticmethod
    def on_post_updated(post: Post) -> None:
        """貼文更新後的處理"""
        # 清除相關快取
        cache_keys = [
            f"post_detail_{post.id}",
            f"post_likes_count_{post.id}",
            f"user_posts_{post.author.id}",
        ]
        cache.delete_many(cache_keys)
    
    @staticmethod
    def on_post_liked(post: Post, user: UserType, liked: bool) -> None:
        """貼文被點讚/取消點讚後的處理"""
        if liked and post.author != user:
            # 發送通知給作者（不對自己的貼文點讚發通知）
            from notifications.services import NotificationService
            NotificationService.create_like_notification(
                actor=user,
                recipient=post.author,
                target_object=post
            )
    
    @staticmethod
    def on_post_viewed(post: Post, user: Optional[UserType]) -> None:
        """貼文被查看後的處理"""
        # 可以在這裡添加分析邏輯
        pass
    
    @staticmethod
    def on_post_shared(post: Post, user: UserType, platform: str) -> None:
        """貼文被分享後的處理"""
        if post.author != user:
            # 發送通知給作者（不對自己的貼文分享發通知）
            from notifications.services import NotificationService
            NotificationService.create_share_notification(
                actor=user,
                recipient=post.author,
                target_object=post
            )
    
    @staticmethod
    def on_post_before_delete(post: Post) -> None:
        """貼文刪除前的處理"""
        # 清除相關快取
        cache_keys = [
            f"post_detail_{post.id}",
            f"post_likes_count_{post.id}",
            f"user_posts_{post.author.id}",
        ]
        cache.delete_many(cache_keys)


class PostRecommendationService:
    """
    貼文推薦服務
    
    職責：
    - 為用戶推薦相關貼文
    - 基於用戶興趣和行為推薦
    """
    
    def __init__(self):
        self.recommendation_engine = RecommendationEngine()
    
    def get_recommended_posts(
        self, 
        user: Optional[UserType], 
        limit: int = 10,
        exclude_posts: Optional[List[int]] = None
    ) -> QuerySet[Post]:
        """
        獲取推薦貼文
        
        Args:
            user: 目標用戶
            limit: 推薦數量
            exclude_posts: 排除的貼文 ID 列表
            
        Returns:
            QuerySet[Post]: 推薦貼文列表
        """
        return self.recommendation_engine.get_recommendations(
            user=user,
            limit=limit,
            exclude_posts=exclude_posts
        )
    
    def get_related_posts(self, post: Post, limit: int = 5) -> QuerySet[Post]:
        """
        獲取相關貼文
        
        Args:
            post: 目標貼文
            limit: 推薦數量
            
        Returns:
            QuerySet[Post]: 相關貼文列表
        """
        return self.recommendation_engine.get_similar_posts(post, limit)


class PostAnalyticsService:
    """
    貼文分析服務
    
    職責：
    - 提供貼文統計數據
    - 分析貼文表現
    """
    
    def get_post_stats(self, post: Post) -> Dict:
        """
        獲取貼文統計數據
        
        Args:
            post: 貼文實例
            
        Returns:
            Dict: 統計數據
        """
        return {
            'views_count': post.views.count(),
            'likes_count': post.likes.count(),
            'shares_count': post.shares.count(),
            'comments_count': getattr(post, 'comments', []).count() if hasattr(post, 'comments') else 0,
        }
    
    def get_user_post_analytics(self, user: UserType, days: int = 30) -> Dict:
        """
        獲取用戶貼文分析數據
        
        Args:
            user: 用戶實例
            days: 分析天數
            
        Returns:
            Dict: 分析數據
        """
        from datetime import timedelta
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        user_posts = Post.objects.filter(
            author=user,
            created_at__range=[start_date, end_date]
        )
        
        return {
            'posts_count': user_posts.count(),
            'total_views': sum(post.views.count() for post in user_posts),
            'total_likes': sum(post.likes.count() for post in user_posts),
            'avg_engagement': 0,  # 可以後續計算平均互動率
        } 