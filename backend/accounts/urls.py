"""
EngineerHub - 用戶模組 URL 配置
定義用戶相關的 API 端點（非認證功能）

認證功能已遷移到 dj-rest-auth：
- 登入/登出/註冊: /api/auth/
- 密碼重置: /api/auth/password/
- 社交登入: /accounts/ (allauth)

此模組專注於：
- 用戶資料管理
- 用戶作品集
- 用戶統計信息
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# 創建 DRF 路由器，用於自動生成 RESTful API 端點
router = DefaultRouter()

# 註冊用戶相關的 ViewSet
router.register(r'users', views.UserViewSet, basename='user')
# 生成的端點：
# GET    /api/users/          - 獲取用戶列表
# POST   /api/users/          - 創建新用戶（通常不開放）
# GET    /api/users/{id}/     - 獲取特定用戶詳情
# PUT    /api/users/{id}/     - 更新用戶信息
# PATCH  /api/users/{id}/     - 部分更新用戶信息
# DELETE /api/users/{id}/     - 刪除用戶（通常不開放）
# GET    /api/users/me/       - 獲取當前用戶信息（自定義端點）

router.register(r'portfolio', views.PortfolioProjectViewSet, basename='portfolio')
# 生成的端點：
# GET    /api/portfolio/      - 獲取作品集列表
# POST   /api/portfolio/      - 創建新作品
# GET    /api/portfolio/{id}/ - 獲取特定作品詳情
# PUT    /api/portfolio/{id}/ - 更新作品信息
# PATCH  /api/portfolio/{id}/ - 部分更新作品信息
# DELETE /api/portfolio/{id}/ - 刪除作品

app_name = 'accounts'

urlpatterns = [
    # ==================== DRF 路由器端點 ====================
    path('', include(router.urls)),  # 包含所有 ViewSet 生成的端點
    
    # ==================== 自定義用戶端點 ====================
    # 注意：認證相關端點已遷移到 dj-rest-auth
    # 原有的認證端點：
    # - auth/register/ -> /api/auth/registration/
    # - auth/login/ -> /api/auth/login/
    # - simple-auth/logout/ -> /api/auth/logout/
    # - auth/settings/ -> /api/auth/user/ (GET/PUT)
    
    # 保留的自定義端點（如果需要額外功能）
    # path('profile/settings/', views.UserSettingsView.as_view(), name='user-settings'),
    # path('profile/stats/', views.UserStatsView.as_view(), name='user-stats'),
] 