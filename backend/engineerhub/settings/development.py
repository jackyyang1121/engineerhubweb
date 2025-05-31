"""
EngineerHub - 開發環境設置
只覆蓋與基礎設置不同的配置項
"""

from .base import *
from decouple import config

# ==================== 開發環境核心設置 ====================
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# ==================== 開發工具 ====================
# Debug Toolbar (可選)
try:
    import debug_toolbar
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    INTERNAL_IPS = ['127.0.0.1', 'localhost']
    DEBUG_TOOLBAR_CONFIG = {'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG}
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
REST_FRAMEWORK.update({
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
})

# CORS 設置 (開發環境)
CORS_ALLOW_ALL_ORIGINS = True

# ==================== 開發環境數據庫 (可選) ====================
if config('USE_SQLITE', default=False, cast=bool):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    print("✅ 使用 SQLite 數據庫")

# ==================== 開發環境緩存 (可選) ====================
if config('USE_DUMMY_CACHE', default=False, cast=bool):
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }
    print("✅ 使用虛擬緩存")

# ==================== 開發環境日誌 ====================
LOGGING['handlers']['console']['level'] = 'DEBUG'
LOGGING['loggers']['engineerhub']['level'] = 'DEBUG'

# SQL 查詢日誌 (可選)
if config('LOG_SQL', default=False, cast=bool):
    LOGGING['loggers']['django.db.backends'] = {
        'handlers': ['console'],
        'level': 'DEBUG',
        'propagate': False,
    }
    print("✅ SQL 查詢日誌已啟用")

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