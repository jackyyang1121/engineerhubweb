"""
EngineerHub - 開發環境設置
只覆蓋與基礎設置不同的配置項
"""

from .base import *
from decouple import config
#decouple 是一個用於管理環境變量的 Python 庫，允許你從 .env 文件中讀取配置，並在運行時動態地設置這些配置。

# ==================== 開發環境核心設置 ====================
DEBUG = True
#DEBUG 是一個 Django 內建的設定變數（預設是 True），用來控制整個專案的除錯模式。
#錯誤頁面是Django內建寫好的，只要出錯就會有這個漂亮頁面，而DEBUG是Django內建的變數，可以把它設為True就可以顯示出錯的漂亮頁面。
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# ==================== 開發工具 ====================
# Debug Toolbar (可選)
try:
    import debug_toolbar
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    INTERNAL_IPS = ['127.0.0.1', 'localhost']
    DEBUG_TOOLBAR_CONFIG = {'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG}
# DEBUG_TOOLBAR_CONFIG 是 Django Debug Toolbar 的設定字典。
# SHOW_TOOLBAR_CALLBACK 是Debug Toolbar內建的參數，功能就是顯示Debug Toolbar，用來決定「是否要顯示 Debug Toolbar」。
# 這裡用了一個匿名函式（lambda），接收一個 request 參數（代表 HTTP 請求），然後直接回傳變數 DEBUG 的值，如果是True就顯示，如果是False就不顯示。
    print("✅ Debug Toolbar 已啟用")
except ImportError:
    print("⚠️  Debug Toolbar 未安裝，跳過")

# ==================== 開發環境認證設置 ====================
# 簡化開發環境的認證流程
MIDDLEWARE = [item for item in MIDDLEWARE if item != 'django.middleware.csrf.CsrfViewMiddleware']  #因為有JWT了所以不需要CSRF

# AllAuth 開發環境設置
ACCOUNT_LOGIN_METHODS = {'username', 'email'}  #可以選擇用username或email登入
ACCOUNT_EMAIL_VERIFICATION = 'none'   #因為是開發環境所以不需要EMAIL驗證可以亂填

# REST Framework 開發環境設置
REST_FRAMEWORK.update({   #update是Python內建的功能，用來更新REST_FRAMEWORK的設定
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],

    #update() 是選擇性覆蓋，不是完全替換
    #原本base.py剩下的設定還會繼續存在
})

# CORS 設置 (開發環境)
CORS_ALLOW_ALL_ORIGINS = True
#CORS_ALLOW_ALL_ORIGINS 是 django-cors-headers 提供的設定，代表允許所有來源存取

# ==================== 開發環境數據庫 (可選) ====================
# 要使用SQLite數據庫，就將USE_SQLITE設為True
if config('USE_SQLITE', default=False, cast=bool):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    print("✅ 使用 SQLite 數據庫")

# ==================== 開發環境緩存 (可選) ====================
# 要使用虛擬緩存，就將USE_DUMMY_CACHE設為True
if config('USE_DUMMY_CACHE', default=False, cast=bool):
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }
    print("✅ 使用虛擬緩存")

# ==================== 開發環境診斷 ====================
def check_development_services():
    """檢查開發環境的關鍵服務"""
    try:
        from django_redis import get_redis_connection
        redis_conn = get_redis_connection("default")
        redis_conn.ping()
        print("✅ Redis 連接正常")
    except Exception as e:
        print(f"⚠️  Redis 連接失敗: {e}")
    
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("✅ 數據庫連接正常")
    except Exception as e:
        print(f"⚠️  數據庫連接失敗: {e}")

if config('CHECK_SERVICES', default=True, cast=bool):
    try:
        check_development_services()
    except Exception as e:
        print(f"⚠️  服務檢查時出現錯誤: {e}")

print("🎯 開發環境設置載入完成") 