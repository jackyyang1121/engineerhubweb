"""
EngineerHub - 開發環境設置
"""

from .base import *

# ==================== 開發環境設置 ====================
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# ==================== 開發工具 ====================
INSTALLED_APPS += [
    'django_extensions',
    'debug_toolbar',
]

MIDDLEWARE += [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

# ==================== Debug Toolbar 設置 ====================
INTERNAL_IPS = [
    '127.0.0.1',
    'localhost',
]

# ==================== 郵件設置 ====================
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ==================== 日誌設置 ====================
LOGGING['loggers']['engineerhub']['level'] = 'DEBUG'

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

# ==================== 開發環境緩存 ====================
# 使用本地記憶體緩存
if config('USE_DUMMY_CACHE', default=False, cast=bool):
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }

# ==================== 靜態文件設置（開發環境） ====================
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# ==================== 媒體文件設置（開發環境） ====================
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage' 