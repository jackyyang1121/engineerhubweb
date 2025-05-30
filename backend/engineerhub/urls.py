from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.http import HttpResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# 根路径視圖 - 重定向到 API 文檔
def root_view(request):
    """根路径视图，提供项目信息或重定向到API文档"""
    return redirect('/api/docs/')

# 健康檢查視圖
def health_check(request):
    """健康检查端点"""
    return HttpResponse('OK', content_type='text/plain')

# 簡化的認證視圖（現在不需要 CSRF 豁免）
from accounts.views import SimpleRegistrationView, SimpleLoginView, SimpleLogoutView

urlpatterns = [
    # 根路径 - 重定向到 API 文檔
    path('', root_view, name='root'),
    
    # 健康檢查
    path('health/', health_check, name='health-check'),
    
    # 管理員界面
    path('admin/', admin.site.urls),
    
    # API文檔 (drf-spectacular)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # 應用API
    path('api/', include('accounts.urls')),
    path('api/posts/', include('posts.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/core/', include('core.urls')),
    path('api/notifications/', include('notifications.urls')),
    
    # 簡化的認證端點（純 JWT，無需 CSRF）
    path('api/simple-auth/login/', SimpleLoginView.as_view(), name='simple_login'),
    path('api/simple-auth/register/', SimpleRegistrationView.as_view(), name='simple_register'),
    path('api/simple-auth/logout/', SimpleLogoutView.as_view(), name='simple_logout'),
    
    # 其他認證API (dj-rest-auth) - 現在也無需 CSRF
    path('api/auth/', include('dj_rest_auth.urls')),
    
    # 社交登入 (AllAuth) - Admin 使用
    path('accounts/', include('allauth.urls')),
]

# 在開發環境中添加媒體文件的URL
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Django Debug Toolbar URLs
    import debug_toolbar
    urlpatterns += [
        path('__debug__/', include(debug_toolbar.urls)),
    ] 