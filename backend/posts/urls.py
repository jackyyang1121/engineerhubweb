from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, CommentViewSet

# 創建路由器
router = DefaultRouter()

# 先註冊評論路由（更具體的路由）
router.register(r'comments', CommentViewSet, basename='comment')

# 然後註冊貼文路由（使用空路徑保持原有的 URL 結構）
router.register(r'', PostViewSet, basename='post')

urlpatterns = [
    # 使用路由器註冊的 URL
    path('', include(router.urls)),
] 