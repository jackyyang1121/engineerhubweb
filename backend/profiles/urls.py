from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PortfolioViewSet

# 創建路由器
router = DefaultRouter()
router.register(r'portfolios', PortfolioViewSet, basename='portfolio')

urlpatterns = [
    # 使用路由器註冊的 URL
    path('', include(router.urls)),
] 