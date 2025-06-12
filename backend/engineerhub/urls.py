from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.http import HttpResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
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
    """根據路徑視圖，提供項目信息或重定向到API文檔"""
    return redirect('/api/docs/')   #redirect() 是 Python 內建的函式，用來重定向到指定的 URL。

# 健康檢查視圖
def health_check(request):
    """健康檢查端點"""
    return HttpResponse('OK', content_type='text/plain')  #content_type='text/plain' 是告訴瀏覽器，這個回應的內容是純文字，不是 HTML 或 JSON 等其他格式。
    #HttpResponse 是 Django 內建的函式，用來生成 HTTP 回應。

# 簡化的認證視圖（現在不需要 CSRF 豁免）
from accounts.views import UserRegistrationView,CustomLoginTokenObtainPairView, SimpleLogoutView

urlpatterns = [
    # 根路径 - 重定向到 API 文檔
    path('', root_view, name='root'),
    
    # 健康檢查
    path('health/', health_check, name='health-check'),
    
    # 管理員界面
    path('admin/', admin.site.urls),  # admin.site.urls是集合路由，簡單講就是進去admin管理頁面後，可以到各個頁面隨便操作因為已經把所有路由都寫好了
    
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
    
    # 認證端點(可選簡化版或是正規版，差別在後者會送到serializer做驗證，前者直接在view做驗證)
    path('api/auth/login/', CustomLoginTokenObtainPairView.as_view(), name='login'),
    path('api/auth/register/', UserRegistrationView.as_view(), name='register'),
    path('api/simple-auth/logout/', SimpleLogoutView.as_view(), name='simple_logout'),
    
    # 其他認證API (dj-rest-auth) 
    path('api/auth/', include('dj_rest_auth.urls')),
    # dj_rest_auth.urls包含其他路由包括:
    # /dj-rest-auth/login/   # POST
    # /dj-rest-auth/logout/  # POST
    # /dj-rest-auth/user/  # GET, PUT, PATCH
    # /dj-rest-auth/password/change/  # POST
    # /dj-rest-auth/password/reset/  # POST
    # /dj-rest-auth/password/reset/confirm/  # POST
    # /dj-rest-auth/token/refresh/  # POST (JWT)
    # /dj-rest-auth/token/verify/  # POST (JWT)
    
    # 社交登入 (AllAuth) - Admin 使用
    path('accounts/', include('allauth.urls')),
]

# 在開發環境中添加媒體文件的URL
if settings.DEBUG:  #如果settings.DEBUG是True，代表是開發環境，就會執行以下程式碼
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    #這幾行功能是讓我在開發階段也能PO有圖片的文
    #static() 會根據設定的 URL（ /media/）和資料夾（ MEDIA_ROOT），自動生成一組 URL route，讓開發伺服器可以直接回傳檔案。
    
    # Django Debug Toolbar URLs
    #以下這段其實可以刪掉，因為debug_toolbar已經在MIDDLEWARE中設定好並會顯示了，這段只是讓我可以輸入http://localhost:8000/__debug__/網址可以看到而已
    import debug_toolbar
    urlpatterns += [
        path('__debug__/', include(debug_toolbar.urls)),
    #讓我可以在後端網頁右手邊看到debug_toolbar
    #Django Debug Toolbar 的工作原理:
    #中間件是關鍵 MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    #這個中間件會：
    #攔截每個 HTTP 回應
    #檢查是否為 HTML 頁面
    #自動在 </body> 標籤前注入 JavaScript 和 CSS
    #這樣就可以在例如admin等頁面中顯示 Debug Toolbar(因為admin頁面是Django內建的頁面，是HTML頁面，所以會被注入)

# debug_toolbar.urls 是 Django Debug Toolbar 套件內建的一組 URL patterns（路由集合）。
# 簡單說，它就是 Debug Toolbar 提供的那個獨立「詳細診斷介面」的 URL 路由集合。
# debug_toolbar.urls 是 Debug Toolbar 套件幫你定義好的一組 URL 路由清單，讓你能透過 http://localhost:8000/__debug__/ 進入 Debug Toolbar 的獨立頁面。
# 如果你不加這段路由，Debug Toolbar 依然會在頁面右側注入工具條，但你無法訪問那些獨立的詳細介面頁面。
    ] 