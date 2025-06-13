"""
Posts 應用 - 附加視圖
處理如 feed, recommendations 等非標準 CRUD 的貼文相關視圖
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, F
from django.utils import timezone
from datetime import timedelta

from ..models import Post
from ..serializers import PostSerializer
from core.pagination import CustomPageNumberPagination

class PostFeedAPIView(generics.ListAPIView):
    """
    獲取用戶個人化信息流
    - 包含用戶自己的貼文
    - 包含用戶關注作者的貼文
    - 如果沒有關注任何人，則顯示熱門/最新貼文
    - 按時間倒序排列
    """
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        user = self.request.user
        
        # 獲取用戶關注的作者 ID 列表
        following_user_ids = list(user.following.values_list('id', flat=True))
        
        # 將用戶自己的ID也加入列表
        target_user_ids = following_user_ids + [user.id]
        
        # 如果用戶沒有關注任何人（除了自己），返回所有公開貼文
        if len(following_user_ids) == 0:
            # 新用戶或沒有關注任何人，顯示所有公開貼文
            return Post.objects.filter(is_published=True).order_by('-created_at')
        else:
            # 返回自己和關注用戶的貼文
            return Post.objects.filter(
                author_id__in=target_user_ids,
                is_published=True
            ).order_by('-created_at')

class PostFollowingAPIView(generics.ListAPIView):
    """
    獲取關注用戶的貼文
    - 只顯示用戶關注的人發布的貼文
    - 按時間倒序排列
    """
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        user = self.request.user
        
        # 獲取用戶關注的作者 ID 列表
        following_user_ids = list(user.following.values_list('id', flat=True))
        
        if not following_user_ids:
            # 如果沒有關注任何人，返回空查詢集
            return Post.objects.none()
        
        # 返回關注用戶的貼文
        return Post.objects.filter(
            author_id__in=following_user_ids,
            is_published=True
        ).select_related('author').prefetch_related('likes', 'comments').order_by('-created_at')

class PostTrendingAPIView(generics.ListAPIView):
    """
    獲取熱門貼文
    - 基於點讚數、評論數、瀏覽數等計算熱門度
    - 只顯示最近一周內的貼文
    - 按熱門度排序
    """
    serializer_class = PostSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        # 計算最近一週的日期
        one_week_ago = timezone.now() - timedelta(days=7)
        
        # 計算熱門分數並排序
        return Post.objects.filter(
            is_published=True,
            created_at__gte=one_week_ago
        ).annotate(
            # 熱門分數計算：點讚數 * 2 + 評論數 * 3 + 瀏覽數 * 0.1
            trending_score=F('likes_count') * 2 + F('comments_count') * 3 + F('views_count') * 0.1
        ).select_related('author').prefetch_related('likes', 'comments').order_by('-trending_score', '-created_at')

class PostRecommendationsAPIView(generics.ListAPIView):
    """
    獲取推薦貼文
    - 一個簡單的推薦邏輯：返回最新或最受歡迎的貼文
    - 這裡暫時返回最新的10篇貼文作為示例
    """
    serializer_class = PostSerializer
    permission_classes = [permissions.AllowAny] # 允許任何人查看推薦

    def get_queryset(self):
        # 簡單推薦：返回最新的公開貼文
        return Post.objects.filter(is_published=True).select_related('author').prefetch_related('likes', 'comments').order_by('-created_at') 