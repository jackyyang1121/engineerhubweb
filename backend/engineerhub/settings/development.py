"""
EngineerHub - 開發環境設置
"""

from .base import *
from decouple import config
import logging

# ==================== 開發環境設置 ====================
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# ==================== 開發工具 ====================
# 安全地添加 debug_toolbar，避免導入錯誤
try:
    import debug_toolbar
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    
    # Debug Toolbar 設置
    INTERNAL_IPS = [
        '127.0.0.1',
        'localhost',
    ]
    
    # 防止 debug_toolbar 在生產環境意外啟用
    DEBUG_TOOLBAR_CONFIG = {
        'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG,
    }
    
    print("✅ Debug Toolbar 已啟用")
except ImportError:
    print("⚠️  Debug Toolbar 未安裝，跳過")

# ==================== 開發環境 CSRF 設置 ====================
# 對於開發環境，我們可以放寬 CSRF 檢查以便於前端開發
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_USE_SESSIONS = False

# ==================== DRF 開發環境設置 ====================
# 修改 dj-rest-auth 配置以便於開發
REST_AUTH.update({
    'SESSION_LOGIN': False,  # 禁用會話登入，只使用 JWT
})

# ==================== 郵件設置 ====================
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ==================== CORS 設置（開發環境） ====================
CORS_ALLOW_ALL_ORIGINS = True  # 僅開發環境使用

# ==================== 開發環境數據庫 ====================
# 可以使用 SQLite 進行快速開發
if config('USE_SQLITE', default=False, cast=bool):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    print("✅ 使用 SQLite 數據庫")

# ==================== 開發環境緩存 ====================
# 使用本地記憶體緩存
if config('USE_DUMMY_CACHE', default=False, cast=bool):
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }
    print("✅ 使用虛擬緩存")

# ==================== 靜態文件設置（開發環境） ====================
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# ==================== 媒體文件設置（開發環境） ====================
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# ==================== 開發環境日誌設置 ====================
# 在開發環境中使用更詳細的日誌
LOGGING['handlers']['console']['level'] = 'DEBUG'
LOGGING['loggers']['engineerhub']['level'] = 'DEBUG'

# 添加 SQL 查詢日誌（可選）
if config('LOG_SQL', default=False, cast=bool):
    LOGGING['loggers']['django.db.backends'] = {
        'handlers': ['console'],
        'level': 'DEBUG',
        'propagate': False,
    }
    print("✅ SQL 查詢日誌已啟用")

# ==================== 開發環境診斷 ====================
# 檢查關鍵服務是否可用
def check_development_services():
    """檢查開發環境的關鍵服務"""
    import time
    
    # 檢查 Redis 連接
    try:
        from django_redis import get_redis_connection
        redis_conn = get_redis_connection("default")
        redis_conn.ping()
        print("✅ Redis 連接正常")
    except Exception as e:
        print(f"⚠️  Redis 連接失敗: {e}")
    
    # 檢查數據庫連接
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("✅ 數據庫連接正常")
    except Exception as e:
        print(f"⚠️  數據庫連接失敗: {e}")

# 在開發環境中進行服務檢查（但不阻塞啟動）
if config('CHECK_SERVICES', default=True, cast=bool):
    try:
        check_development_services()
    except Exception as e:
        print(f"⚠️  服務檢查時出現錯誤: {e}")

print("🎯 開發環境設置載入完成") 