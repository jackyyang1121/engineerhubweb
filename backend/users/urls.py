from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet

# 創建路由器
router = DefaultRouter()
router.register(r'', UserViewSet)

urlpatterns = [
    # 使用路由器註冊的 URL
    path('', include(router.urls)),
] 