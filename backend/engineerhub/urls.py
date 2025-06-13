"""
EngineerHub - 主 URL 配置文件
使用 dj-rest-auth + allauth + SimpleJWT 提供完整的認證系統

URL 結構說明：
- /api/auth/: dj-rest-auth 提供的標準認證端點
- /api/auth/registration/: 用戶註冊端點
- /api/auth/social/: 社交登入端點
- /accounts/: allauth 提供的傳統認證頁面（主要用於管理後台）
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.http import HttpResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from core import views as core_views
# SpectacularAPIView 是 drf-spectacular（一個針對 Django REST Framework 的 OpenAPI 3 規格生成器）提供的視圖，用來 產生整個 API 的 OpenAPI schema（也就是 JSON 格式的規格文件）。
# 簡單講：
# 產生一份完整的 API 文件（OpenAPI 格式）給 Swagger 或 Redoc 使用。
# 在 /api/schema/ 這個路由上。
# 根據路徑視圖，提供項目信息或重定向到API文檔

# SpectacularSwaggerView 是一個前端介面，使用 Swagger UI 呈現 SpectacularAPIView 產生的 OpenAPI schema，讓你可以 在網頁上互動式測試 API（例如直接發送 GET、POST 測試）。
# 簡單講：
# 一個提供漂亮的互動式 API 文件頁面。
# 可以直接在頁面上測試 API。

# SpectacularRedocView 同樣也是一個前端介面，但這次用的是 ReDoc，另一個比 Swagger UI 更簡潔的 API 文件頁面。
# 它一樣使用 SpectacularAPIView 產生的 OpenAPI schema，幫助開發者閱讀 API 文件。
# 簡單講：
# 另一種更簡潔的 API 文件介面。
# 也能讓開發者快速瀏覽 API 規格。

# SpectacularRedocView 和 SpectacularSwaggerView 都是 API 文件的可視化前端介面，讓開發者（或前端、測試人員）直接瀏覽 API、查看欄位格式、以及進行互動式測試（例如發送 GET、POST 請求），而不需要自己拼 URL 或看 JSON 檔。
# 簡單說：
# SpectacularSwaggerView（Swagger UI）：支援互動式測試，按鈕可以直接發送 API 請求。
# SpectacularRedocView（ReDoc）：主要用來瀏覽 API 文件，設計更簡潔美觀，但互動測試稍微沒那麼方便。

#-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------#

def root_view(request):
    """根路徑視圖，重定向到 API 文檔"""
    return redirect('/api/docs/')

def health_check(request):
    """健康檢查端點，用於監控服務狀態"""
    return HttpResponse('OK', content_type='text/plain')

urlpatterns = [
    # ==================== 基礎路由 ====================
    path('', root_view, name='root'),                    # 根路徑重定向到 API 文檔
    path('health/', health_check, name='health-check'), # 健康檢查端點
    
    # ==================== 管理後台 ====================
    path('admin/', admin.site.urls),                    # Django 管理後台
    
    # ==================== API 文檔 ====================
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),           # OpenAPI 3.0 規格文件
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'), # Swagger UI 文檔
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),       # ReDoc 文檔
    
    # ==================== 認證系統 (dj-rest-auth) ====================
    # 標準認證端點 - 替代自定義認證系統
    path('api/auth/', include('dj_rest_auth.urls')),           # 標準認證端點
    # 包含的端點：
    # POST /api/auth/login/          - 登入
    # POST /api/auth/logout/         - 登出
    # GET  /api/auth/user/           - 獲取當前用戶信息
    # PUT  /api/auth/user/           - 更新用戶信息
    # POST /api/auth/password/change/ - 修改密碼
    # POST /api/auth/password/reset/  - 密碼重置請求
    # POST /api/auth/password/reset/confirm/ - 密碼重置確認
    # POST /api/auth/token/refresh/   - 刷新 JWT Token
    # POST /api/auth/token/verify/    - 驗證 JWT Token
    
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')), # 註冊端點
    # 包含的端點：
    # POST /api/auth/registration/           - 用戶註冊
    # POST /api/auth/registration/verify-email/ - 郵箱驗證
    # POST /api/auth/registration/resend-email/ - 重新發送驗證郵件
    
    # ==================== 社交登入 ====================
    # Allauth 社交登入端點（用於管理後台和傳統頁面）
    path('accounts/', include('allauth.urls')),            # Allauth 傳統認證頁面
    
    # ==================== 業務 API ====================
    path('api/', include('accounts.urls')),                # 用戶相關 API（非認證部分）
    path('api/posts/', include('posts.urls')),             # 文章相關 API
    path('api/chat/', include('chat.urls')),               # 聊天相關 API
    path('api/core/', include('core.urls')),               # 核心功能 API
    path('api/notifications/', include('notifications.urls')), # 通知相關 API
    path('api/trending/topics/', core_views.trending_topics, name='trending-topics'),
]

# ==================== 開發環境配置 ====================
if settings.DEBUG:
    # 媒體文件服務（開發環境）
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Django Debug Toolbar（開發工具）
    try:
        import debug_toolbar
        urlpatterns += [
            path('__debug__/', include(debug_toolbar.urls)),
        ]
    except ImportError:
        # debug_toolbar 未安裝時忽略
                 pass 