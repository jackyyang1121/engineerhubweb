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
router.register(r'follows', views.FollowViewSet, basename='follow')
router.register(r'portfolio', views.PortfolioProjectViewSet, basename='portfolio')

app_name = 'accounts'

urlpatterns = [
    # DRF路由
    path('api/v1/', include(router.urls)),
    
    # 用戶認證相關
    path('api/v1/auth/profile/', views.UserProfileView.as_view(), name='user-profile'),
    path('api/v1/auth/profile/update/', views.UserProfileUpdateView.as_view(), name='user-profile-update'),
    path('api/v1/auth/settings/', views.UserSettingsView.as_view(), name='user-settings'),
    path('api/v1/auth/change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    
    # 關注相關
    path('api/v1/users/<str:username>/follow/', views.FollowUserView.as_view(), name='follow-user'),
    path('api/v1/users/<str:username>/unfollow/', views.UnfollowUserView.as_view(), name='unfollow-user'),
    path('api/v1/users/<str:username>/followers/', views.UserFollowersView.as_view(), name='user-followers'),
    path('api/v1/users/<str:username>/following/', views.UserFollowingView.as_view(), name='user-following'),
    
    # 黑名單相關
    path('api/v1/users/<str:username>/block/', views.BlockUserView.as_view(), name='block-user'),
    path('api/v1/users/<str:username>/unblock/', views.UnblockUserView.as_view(), name='unblock-user'),
    path('api/v1/blocked-users/', views.BlockedUsersView.as_view(), name='blocked-users'),
    
    # 用戶搜索
    path('api/v1/search/users/', views.UserSearchView.as_view(), name='search-users'),
    
    # 統計信息
    path('api/v1/users/<str:username>/stats/', views.UserStatsView.as_view(), name='user-stats'),
] 