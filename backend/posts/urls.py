"""
貼文應用 URL 配置
按功能分組組織路由
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, PostInteractionViewSet, PostFeedViewSet, CommentViewSet

# 創建路由器
router = DefaultRouter()

# 註冊基本貼文視圖集
router.register(r'posts', PostViewSet, basename='post')

# 註冊評論視圖集
router.register(r'comments', CommentViewSet, basename='comment')

# 創建互動視圖集的路由
interaction_router = DefaultRouter()
interaction_router.register(r'posts', PostInteractionViewSet, basename='post-interaction')

# 創建動態視圖集的路由
feed_router = DefaultRouter()
feed_router.register(r'feed', PostFeedViewSet, basename='post-feed')

# URL 模式
urlpatterns = [
    # 基本路由
    path('', include(router.urls)),
    
    # 互動路由（點讚、收藏、轉發等）
    path('interaction/', include(interaction_router.urls)),
    
    # 動態路由（關注、熱門、推薦等）
    path('', include(feed_router.urls)),
    
    # 為了兼容性，保留一些舊的路由別名
    path('posts/<uuid:pk>/like/', PostInteractionViewSet.as_view({'post': 'like'}), name='post-like'),
    path('posts/<uuid:pk>/unlike/', PostInteractionViewSet.as_view({'post': 'unlike'}), name='post-unlike'),
    path('posts/<uuid:pk>/save/', PostInteractionViewSet.as_view({'post': 'save'}), name='post-save'),
    path('posts/<uuid:pk>/unsave/', PostInteractionViewSet.as_view({'post': 'unsave'}), name='post-unsave'),
    path('posts/<uuid:pk>/share/', PostInteractionViewSet.as_view({'post': 'share'}), name='post-share'),
    path('posts/<uuid:pk>/unshare/', PostInteractionViewSet.as_view({'post': 'unshare'}), name='post-unshare'),
    path('posts/<uuid:pk>/report/', PostInteractionViewSet.as_view({'post': 'report'}), name='post-report'),
    
    # 動態路由別名
    path('posts/following/', PostFeedViewSet.as_view({'get': 'following'}), name='posts-following'),
    path('posts/trending/', PostFeedViewSet.as_view({'get': 'trending'}), name='posts-trending'),
    path('posts/recommendations/', PostFeedViewSet.as_view({'get': 'recommendations'}), name='posts-recommendations'),
    path('posts/saved/', PostFeedViewSet.as_view({'get': 'saved'}), name='posts-saved'),
    path('posts/shared/', PostFeedViewSet.as_view({'get': 'shared'}), name='posts-shared'),
    
    # 評論路由別名
    path('posts/<uuid:post_id>/comments/', CommentViewSet.as_view({'get': 'post_comments'}), name='post-comments'),
]

app_name = 'posts' 