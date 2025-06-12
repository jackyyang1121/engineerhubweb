"""
EngineerHub - 用戶模块URL配置
定義用戶相關的API端點
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# 創建DRF路由器
router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'portfolio', views.PortfolioProjectViewSet, basename='portfolio')

app_name = 'accounts'

urlpatterns = [
    # DRF路由 - 直接包含，不需要 v1 前綴
    path('', include(router.urls)),
    
    # 用戶認證相關
    path('auth/register/', views.UserRegistrationView.as_view(), name='user-register'),
    path('auth/login/', views.CustomLoginTokenObtainPairView.as_view(), name='user-login'),
    path('auth/settings/', views.UserSettingsView.as_view(), name='user-settings'),
    path('simple-auth/logout/', views.SimpleLogoutView.as_view(), name='simple-logout'),
] 