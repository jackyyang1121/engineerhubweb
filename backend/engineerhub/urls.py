from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.http import HttpResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view # type: ignore
from drf_yasg import openapi # type: ignore

# 根路径視圖 - 重定向到 API 文檔
def root_view(request):
    """根路径视图，提供项目信息或重定向到API文档"""
    return redirect('/swagger/')

# 健康檢查視圖
def health_check(request):
    """健康检查端点"""
    return HttpResponse('OK', content_type='text/plain')

# 創建Swagger視圖
schema_view = get_schema_view(
    openapi.Info(
        title="EngineerHub API",
        default_version='v1',
        description="EngineerHub社群平台的API文檔",
        terms_of_service="https://www.engineerhub.com/terms/",
        contact=openapi.Contact(email="contact@engineerhub.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    # 根路径 - 重定向到 API 文檔
    path('', root_view, name='root'),
    
    # 健康檢查
    path('health/', health_check, name='health-check'),
    
    # 管理員界面
    path('admin/', admin.site.urls),
    
    # API文檔
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # 應用API
    path('', include('accounts.urls')),
    path('api/posts/', include('posts.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/profiles/', include('profiles.urls')),
    
    # 認證API
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    
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