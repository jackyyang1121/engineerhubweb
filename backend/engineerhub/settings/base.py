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
]

THIRD_PARTY_APPS = [
    # DRF
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    
    # CORS
    'corsheaders',
    
    # 認證
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.github',
    
    # WebSocket
    'channels',
    
    # API 文檔
    'drf_spectacular',
    
    # 搜尋服務
    'algoliasearch_django',
    
    # 開發工具
    'django_extensions',
]

LOCAL_APPS = [
    'core',
    'accounts',
    'posts',
    'comments',
    'chats',
    'notifications',
    'search',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ==================== 中間件 ====================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
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
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='password'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
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

# ==================== 媒體文件設置 ====================
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ==================== 文件上傳設置 ====================
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# ==================== 默認主鍵設置 ====================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==================== 網站設置 ====================
SITE_ID = 1

# ==================== DRF 設置 ====================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}

# ==================== JWT 設置 ====================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# ==================== CORS 設置 ====================
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

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

# ==================== 社交登入設置 ====================
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'APP': {
            'client_id': config('GOOGLE_CLIENT_ID', default=''),
            'secret': config('GOOGLE_CLIENT_SECRET', default=''),
        }
    },
    'github': {
        'SCOPE': [
            'user:email',
        ],
        'APP': {
            'client_id': config('GITHUB_CLIENT_ID', default=''),
            'secret': config('GITHUB_CLIENT_SECRET', default=''),
        }
    }
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
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# ==================== Channels 設置 ====================
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
        },
    },
}

# ==================== API 文檔設置 ====================
SPECTACULAR_SETTINGS = {
    'TITLE': 'EngineerHub API',
    'DESCRIPTION': '工程師社群平台 API 文檔',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/',
}

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
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'engineerhub': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# ==================== 安全設置 ====================
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# ==================== 自定義設置 ====================
# 文件上傳限制
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']

# 程式碼高亮設置
PYGMENTS_STYLES = [
    'default', 'emacs', 'friendly', 'colorful', 'autumn', 'murphy', 'manni', 
    'monokai', 'perldoc', 'pastie', 'borland', 'trac', 'native', 'fruity', 
    'bw', 'vim', 'vs', 'tango', 'rrt', 'xcode', 'igor', 'paraiso-light', 
    'paraiso-dark', 'lovelace', 'algol', 'algol_nu', 'arduino', 'rainbow_dash', 
    'abap'
]

# 搜索設置 - Algolia
ALGOLIA = {
    'APPLICATION_ID': config('ALGOLIA_APPLICATION_ID', default=''),
    'API_KEY': config('ALGOLIA_API_KEY', default=''),
    'INDEX_PREFIX': config('ALGOLIA_INDEX_PREFIX', default='engineerhub'),
    'AUTO_INDEXING': config('ALGOLIA_AUTO_INDEXING', default=True, cast=bool),
}

# 搜尋配置
SEARCH_RESULTS_PER_PAGE = 20
MAX_SEARCH_QUERY_LENGTH = 200
SEARCH_CACHE_TIMEOUT = 300  # 5分鐘

# Sentry 設置 (生產環境監控)
SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN:
    import sentry_sdk # type: ignore
    from sentry_sdk.integrations.django import DjangoIntegration # type: ignore
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=1.0,
        send_default_pii=True
    ) 