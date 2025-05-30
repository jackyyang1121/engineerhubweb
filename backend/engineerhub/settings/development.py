"""
EngineerHub - 開發環境設置
"""

from .base import *  #from .base import * 這行是把同一個資料夾底下的 base.py 模組裡所有東西全部匯入進來。
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
# 對於前後端分離的 JWT 架構，我們完全禁用 CSRF 保護
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_USE_SESSIONS = False

# 完全禁用 CSRF 中間件的檢查（僅開發環境）
# 移除 CSRF 中間件
MIDDLEWARE = [item for item in MIDDLEWARE if item != 'django.middleware.csrf.CsrfViewMiddleware']

# 或者設置 CSRF 豁免所有請求（替代方案）
# CSRF_COOKIE_NAME = None  # 禁用 CSRF cookie

# ==================== AllAuth 開發環境設置 ====================
# 在開發環境中使用用戶名或郵件登入，並禁用郵件驗證以便於測試
ACCOUNT_LOGIN_METHODS = {'username', 'email'}  # 支持用戶名或郵件登入
ACCOUNT_SIGNUP_FIELDS = ['username*', 'email*', 'password1*']  # 開發環境簡化註冊
ACCOUNT_EMAIL_VERIFICATION = 'none'  # 禁用郵件驗證
ACCOUNT_EMAIL_REQUIRED = True        # 保持郵件要求（因為要支持郵件登入）
ACCOUNT_USERNAME_REQUIRED = True     # 保持用戶名要求

# ==================== DRF 開發環境設置 ====================
# 修改 dj-rest-auth 配置以便於開發
REST_AUTH.update({
    'SESSION_LOGIN': False,  # 禁用會話登入，只使用 JWT
    'JWT_AUTH_HTTPONLY': False,  # 允許前端讀取 JWT
})

# 修改 REST_FRAMEWORK 設置，純 JWT 認證
REST_FRAMEWORK.update({
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # 只使用 JWT
        # 移除 SessionAuthentication 以避免 CSRF 要求
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # 開發環境允許匿名訪問
    ],
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