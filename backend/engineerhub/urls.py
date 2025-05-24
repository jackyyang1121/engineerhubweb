from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# 根路径視圖 - 重定向到 API 文檔
def root_view(request):
    """根路径视图，提供项目信息或重定向到API文档"""
    return redirect('/api/docs/')

# 健康檢查視圖
def health_check(request):
    """健康检查端点"""
    return HttpResponse('OK', content_type='text/plain')

# 包裝 dj-rest-auth 的註冊視圖以免除 CSRF
from dj_rest_auth.registration.views import RegisterView
csrf_exempt_register_view = csrf_exempt(RegisterView.as_view())

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
    path('', include('accounts.urls')),
    path('api/posts/', include('posts.urls')),
    path('api/chat/', include('chat.urls')),
    
    # 認證API
    path('api/auth/', include('dj_rest_auth.urls')),
    
    # 自定義註冊端點（免除 CSRF）
    path('api/auth/registration/', csrf_exempt_register_view, name='rest_register'),
    
    # 社交登入 (AllAuth)
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