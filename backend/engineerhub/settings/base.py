"""
EngineerHub - 工程師社群平台
Django 基礎設置文件

這個文件包含所有環境通用的設置
具體環境的設置請在 development.py, production.py 等文件中覆蓋
"""

import os
from pathlib import Path
from decouple import config # type: ignore
from datetime import timedelta

# ==================== 基礎路徑設置 ====================
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ==================== 安全設置 ====================
# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='your-secret-key-here')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])

# ==================== 應用程式定義 ====================
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'django.contrib.humanize',
]

THIRD_PARTY_APPS = [
    # DRF 相關
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'drf_spectacular',
    
    # 認證相關
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.github',
    
    # CORS
    'corsheaders',
    
    # WebSocket
    'channels',
    
    # 任務佇列
    'django_celery_beat',
    'django_celery_results',
    
    # 搜尋服務（可能被動態移除）
    'algoliasearch_django',
    
    # 開發工具
    'django_extensions',
    'django_filters',
]

LOCAL_APPS = [
    'core',
    'accounts',
    'posts',
    'comments',
    'chat',
    'notifications',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ==================== 中間件 ====================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # 靜態檔案服務
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ==================== URL 配置 ====================
ROOT_URLCONF = 'engineerhub.urls'

# ==================== 模板設置 ====================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ==================== ASGI/WSGI 配置 ====================
WSGI_APPLICATION = 'engineerhub.wsgi.application'
ASGI_APPLICATION = 'engineerhub.asgi.application'

# ==================== 數據庫配置 ====================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='engineerhub'),
        'USER': config('DB_USER', default='engineerhub_user'),
        'PASSWORD': config('DB_PASSWORD', default='123456789'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        'CONN_MAX_AGE': 600,  # 連接池配置
    }
}

# ==================== Redis 配置 ====================
REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')

# ==================== 緩存設置 ====================
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# ==================== 會話設置 ====================
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# ==================== 密碼驗證 ====================
AUTH_PASSWORD_VALIDATORS = [
    # 已移除所有密碼驗證器，允許任何密碼
]

# ==================== 自定義用戶模型 ====================
AUTH_USER_MODEL = 'accounts.User'

# ==================== 國際化 ====================
LANGUAGE_CODE = 'zh-hant'
TIME_ZONE = 'Asia/Taipei'
USE_I18N = True
USE_TZ = True

# ==================== 靜態文件設置 ====================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# WhiteNoise 配置（生產環境靜態檔案服務）
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ==================== 媒體文件設置 ====================
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ==================== 文件上傳設置 ====================
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# 允許的檔案格式
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.wmv', '.flv']
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

# ==================== 默認主鍵設置 ====================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==================== 網站設置 ====================
SITE_ID = 1

# ==================== 認證後端設置 ====================
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

# ==================== DRF 設置 ====================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    },
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ==================== JWT 設置 ====================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': 'engineerhub',
    'JSON_ENCODER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    
    'JTI_CLAIM': 'jti',
    
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# ==================== CORS 設置 ====================
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React 開發服務器
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # Vite 開發服務器
    "http://127.0.0.1:5173",
    "http://localhost:8000",  # Django 開發服務器
    "http://127.0.0.1:8000",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# ==================== CSRF 配置 ====================
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",  # React 開發服務器
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # Vite 開發服務器
    "http://127.0.0.1:5173",
    "http://localhost:8000",  # Django 開發服務器
    "http://127.0.0.1:8000",
]

# ==================== AllAuth 和社交登入配置 ====================
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
ACCOUNT_CONFIRM_EMAIL_ON_GET = True
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 7
ACCOUNT_LOGIN_ATTEMPTS_LIMIT = 5
ACCOUNT_LOGIN_ATTEMPTS_TIMEOUT = 300
ACCOUNT_LOGOUT_ON_GET = True
ACCOUNT_SESSION_REMEMBER = True
ACCOUNT_SIGNUP_PASSWORD_ENTER_TWICE = False
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USERNAME_MIN_LENGTH = 3

# 社交認證配置
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'OAUTH_PKCE_ENABLED': True,
    },
    'github': {
        'SCOPE': [
            'user:email',
            'read:user',
        ],
    }
}

# ==================== dj-rest-auth 配置 ====================
REST_AUTH = {
    'USE_JWT': True,
    'JWT_AUTH_COOKIE': 'auth-jwt',
    'JWT_AUTH_REFRESH_COOKIE': 'auth-jwt-refresh',
    'JWT_AUTH_HTTPONLY': False,  # 允許前端讀取 JWT cookie
    'USER_DETAILS_SERIALIZER': 'accounts.serializers.UserSerializer',
    'REGISTER_SERIALIZER': 'accounts.serializers.CustomRegisterSerializer',
}

# ==================== 郵件設置 ====================
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@engineerhub.com')

# ==================== Celery 設置 ====================
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = 'django-db'
CELERY_CACHE_BACKEND = 'django-cache'
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'Asia/Taipei'
CELERY_ENABLE_UTC = True
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# ==================== Channels 設置 ====================
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
        },
    },
}

# ==================== API 文檔配置 (Spectacular) ====================
SPECTACULAR_SETTINGS = {
    'TITLE': 'EngineerHub API',
    'DESCRIPTION': 'EngineerHub社群平台的API文檔',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/',
    'SECURITY': [
        {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
        }
    ],
}

# ==================== Algolia 搜索配置 ====================
ALGOLIA_APPLICATION_ID = config('ALGOLIA_APPLICATION_ID', default='')
ALGOLIA_API_KEY = config('ALGOLIA_API_KEY', default='')

# ==================== 安全設置 ====================
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# ==================== 日誌設置 ====================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'engineerhub.log',
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'error.log',
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file', 'mail_admins'],
            'level': 'INFO',
        },
        'engineerhub': {
            'handlers': ['console', 'file', 'error_file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['file', 'error_file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['file', 'error_file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

# 確保日誌目錄存在
log_dir = BASE_DIR / 'logs'
log_dir.mkdir(exist_ok=True)

# ==================== 自定義配置 ====================
# 程式碼高亮配置
CODE_HIGHLIGHT_STYLES = [
    'monokai', 'github', 'vs', 'xcode', 'default'
]
DEFAULT_CODE_STYLE = 'monokai'
MAX_CODE_LENGTH = 10000  # 最大程式碼長度（字符數）

# 搜索配置
SEARCH_RESULTS_PER_PAGE = 20
MAX_SEARCH_QUERY_LENGTH = 200

# 通知配置
NOTIFICATION_BATCH_SIZE = 50
NOTIFICATION_RETENTION_DAYS = 30

# 檔案清理配置
TEMP_FILE_CLEANUP_HOURS = 24
ORPHANED_FILE_CLEANUP_DAYS = 7

# ==================== Algolia 配置檢查和動態載入 ====================
def configure_algolia():
    """
    安全配置 Algolia，避免在配置不完整時卡住
    """
    global INSTALLED_APPS
    
    # 檢查 Algolia 配置是否完整
    if not ALGOLIA_APPLICATION_ID or not ALGOLIA_API_KEY:
        # Algolia 配置不完整，移除 algoliasearch_django 避免卡住
        INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'algoliasearch_django']
        print("⚠️  Algolia 配置不完整，已禁用搜尋功能")
        print("   請設置 ALGOLIA_APPLICATION_ID 和 ALGOLIA_API_KEY 環境變數")
        return False
    
    # 簡化處理：直接跳過連接測試，避免卡住
    try:
        import algoliasearch
        print("⚠️  Algolia 配置存在但跳過連接測試以避免卡住")
        print("   如需啟用搜尋功能，請手動驗證 Algolia 配置")
        INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'algoliasearch_django']
        return False
    except ImportError:
        print("⚠️  algoliasearch 套件未安裝，已禁用搜尋功能")
        INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'algoliasearch_django']
        return False
    except Exception as e:
        print(f"⚠️  Algolia 配置錯誤: {e}")
        INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'algoliasearch_django']
        return False

# 執行 Algolia 配置
try:
    algolia_configured = configure_algolia()
    # 更新 USE_ALGOLIA 設定
    USE_ALGOLIA = algolia_configured
    
    # 設置 Algolia 配置字典
    ALGOLIA = {
        'APPLICATION_ID': ALGOLIA_APPLICATION_ID,
        'API_KEY': ALGOLIA_API_KEY,
        'SEARCH_API_KEY': config('ALGOLIA_SEARCH_API_KEY', default=''),
        'INDEX_PREFIX': config('ALGOLIA_INDEX_PREFIX', default='engineerhub'),
        'ENABLED': USE_ALGOLIA,
    }
except Exception as e:
    print(f"⚠️  Algolia 配置過程發生錯誤: {e}")
    INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'algoliasearch_django']
    USE_ALGOLIA = False
    ALGOLIA = {
        'APPLICATION_ID': '',
        'API_KEY': '',
        'SEARCH_API_KEY': '',
        'INDEX_PREFIX': 'engineerhub',
        'ENABLED': False,
    } 