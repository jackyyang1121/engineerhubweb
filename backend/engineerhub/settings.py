"""
EngineerHub 專案 Django 配置

企業級配置，包含開發、測試和生產環境的完整設置
包含安全、性能、日誌和監控的最佳實踐
"""

import os
import logging.config
from pathlib import Path
from datetime import timedelta

# 專案根目錄路徑
BASE_DIR = Path(__file__).resolve().parent.parent

# 環境變數配置
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dev-key-change-in-production')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() == 'true'
ENVIRONMENT = os.environ.get('DJANGO_ENVIRONMENT', 'development')

# 允許的主機配置
ALLOWED_HOSTS = os.environ.get(
    'DJANGO_ALLOWED_HOSTS', 
    'localhost,127.0.0.1,0.0.0.0'
).split(',')

# ==============================================================================
# 應用配置
# ==============================================================================

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
    'drf_yasg',
    
    # 認證相關
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.github',
    
    # 其他工具
    'corsheaders',
    'channels',
    'django_celery_beat',
    'django_celery_results',
    'django_extensions',
    'django_filters',
]

LOCAL_APPS = [
    'users',      # 用戶系統
    'posts',      # 貼文系統
    'comments',   # 評論系統  
    'chat',       # 聊天系統
    'profiles',   # 個人檔案
    'notifications',  # 通知系統
    'core',       # 核心工具
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ==============================================================================
# 中介軟體配置
# ==============================================================================

MIDDLEWARE = [    'corsheaders.middleware.CorsMiddleware',    'django.middleware.security.SecurityMiddleware',    'whitenoise.middleware.WhiteNoiseMiddleware',  # 靜態檔案服務    'django.contrib.sessions.middleware.SessionMiddleware',    'django.middleware.common.CommonMiddleware',    'django.middleware.csrf.CsrfViewMiddleware',    'django.contrib.auth.middleware.AuthenticationMiddleware',    'django.contrib.messages.middleware.MessageMiddleware',    'django.middleware.clickjacking.XFrameOptionsMiddleware',    'allauth.account.middleware.AccountMiddleware',  # AllAuth 中間件    'core.middleware.UserActivityMiddleware',  # 自定義用戶活動追蹤中介軟體    'core.middleware.RequestLoggingMiddleware',  # 自定義請求日誌中介軟體]

ROOT_URLCONF = 'engineerhub.urls'

# ==============================================================================
# 模板配置
# ==============================================================================

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

WSGI_APPLICATION = 'engineerhub.wsgi.application'
ASGI_APPLICATION = 'engineerhub.asgi.application'

# ==============================================================================
# 資料庫配置
# ==============================================================================

if ENVIRONMENT == 'production':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME'),
            'USER': os.environ.get('DB_USER'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'OPTIONS': {
                'sslmode': 'require',
            },
            'CONN_MAX_AGE': 600,  # 連接池配置
        }
    }
else:
    # 開發和測試環境使用 SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ==============================================================================
# Redis 和 Channels 配置
# ==============================================================================

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Channels 配置
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [REDIS_URL],
        },
    },
}

# 開發環境使用內存頻道層
if DEBUG and ENVIRONMENT == 'development':
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer"
        }
    }

# ==============================================================================
# 緩存配置
# ==============================================================================

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# 會話引擎使用緩存
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# ==============================================================================
# Celery 配置
# ==============================================================================

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = 'django-db'
CELERY_CACHE_BACKEND = 'django-cache'
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'Asia/Taipei'
CELERY_ENABLE_UTC = True
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# ==============================================================================
# 密碼驗證配置
# ==============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# ==============================================================================
# 國際化配置
# ==============================================================================

LANGUAGE_CODE = 'zh-hant'
TIME_ZONE = 'Asia/Taipei'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# ==============================================================================
# 靜態檔案和媒體檔案配置
# ==============================================================================

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# WhiteNoise 配置（生產環境靜態檔案服務）
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ==============================================================================
# 自定義用戶模型
# ==============================================================================

AUTH_USER_MODEL = 'users.CustomUser'
SITE_ID = 1

# ==============================================================================
# CORS 配置
# ==============================================================================

CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React 開發服務器
    "http://127.0.0.1:3000",
    "http://localhost:8000",  # Django 開發服務器
    "http://127.0.0.1:8000",
] + os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')

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

# ==============================================================================
# REST Framework 配置
# ==============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.CustomPageNumberPagination',
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
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}

# 開發環境增加瀏覽器 API 渲染器
if DEBUG:
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'].append(
        'rest_framework.renderers.BrowsableAPIRenderer'
    )

# ==============================================================================
# JWT 配置
# ==============================================================================

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

# ==============================================================================# AllAuth 和社交登入配置# ==============================================================================# 新版 django-allauth 設置ACCOUNT_LOGIN_METHODS = {'email'}ACCOUNT_EMAIL_VERIFICATION = 'optional'ACCOUNT_SIGNUP_FIELDS = ['email*', 'username*', 'password1*', 'password2*']ACCOUNT_USER_MODEL_USERNAME_FIELD = 'username'ACCOUNT_USER_MODEL_EMAIL_FIELD = 'email'# 移除已廢棄的設置以避免警告# ACCOUNT_EMAIL_REQUIRED = True  # 已廢棄，使用 ACCOUNT_SIGNUP_FIELDS 替代# ACCOUNT_AUTHENTICATION_METHOD = 'email'  # 已廢棄，使用 ACCOUNT_LOGIN_METHODS 替代# ACCOUNT_USERNAME_REQUIRED = True  # 已廢棄，使用 ACCOUNT_SIGNUP_FIELDS 替代

# 社交賬號提供者配置
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
        ],
    }
}

# ==============================================================================
# 電子郵件配置
# ==============================================================================

if ENVIRONMENT == 'production':
    # 生產環境使用真實的郵件服務
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ.get('EMAIL_HOST')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
    EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
    DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@engineerhub.com')
else:
    # 開發環境使用控制台輸出
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ==============================================================================
# 安全配置
# ==============================================================================

if ENVIRONMENT == 'production':
    # HTTPS 設定
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    
    # HSTS 設定
    SECURE_HSTS_SECONDS = 31536000  # 1 年
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # 其他安全設定
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

# ==============================================================================
# 檔案上傳配置
# ==============================================================================

FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000

# 允許的檔案格式
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.wmv', '.flv']
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

# ==============================================================================
# 日誌配置
# ==============================================================================

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
            'level': 'DEBUG' if DEBUG else 'INFO',
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

# ==============================================================================
# API 文檔配置 (Swagger)
# ==============================================================================

SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'Bearer': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header'
        }
    },
    'USE_SESSION_AUTH': False,
    'JSON_EDITOR': True,
    'SUPPORTED_SUBMIT_METHODS': [
        'get',
        'post',
        'put',
        'delete',
        'patch'
    ],
    'OPERATIONS_SORTER': 'alpha',
    'TAGS_SORTER': 'alpha',
    'DOC_EXPANSION': 'none',
    'DEEP_LINKING': True,
    'SHOW_EXTENSIONS': True,
    'DEFAULT_MODEL_RENDERING': 'example'
}

REDOC_SETTINGS = {
    'LAZY_RENDERING': False,
}

# ==============================================================================
# 自定義配置
# ==============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

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

# ==============================================================================
# 效能監控配置
# ==============================================================================

if ENVIRONMENT == 'production':
    # Sentry 配置（需要安裝 sentry-sdk）
    SENTRY_DSN = os.environ.get('SENTRY_DSN')
    if SENTRY_DSN:
        try:
            import sentry_sdk # type: ignore
            from sentry_sdk.integrations.django import DjangoIntegration # type: ignore
            from sentry_sdk.integrations.celery import CeleryIntegration # type: ignore
            
            sentry_sdk.init(
                dsn=SENTRY_DSN,
                integrations=[
                    DjangoIntegration(),
                    CeleryIntegration(),
                ],
                traces_sample_rate=0.1,
                send_default_pii=True
            )
        except ImportError:
            pass  # Sentry SDK not installed

# 資料庫查詢調試（僅開發環境）
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    
    INTERNAL_IPS = [
        '127.0.0.1',
        'localhost',
    ]
    
    DEBUG_TOOLBAR_CONFIG = {
        'DISABLE_PANELS': [
            'debug_toolbar.panels.redirects.RedirectsPanel',
        ],
        'SHOW_TEMPLATE_CONTEXT': True,
    }

# ==============================================================================
# 測試配置
# ==============================================================================

if 'test' in os.environ.get('DJANGO_MANAGEMENT_COMMAND', ''):
    # 測試環境使用內存資料庫
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:'
    }
    
    # 關閉密碼驗證加速測試
    AUTH_PASSWORD_VALIDATORS = []
    
    # 使用內存緩存
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }
    
        # 關閉電子郵件發送    EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'# ==============================================================================# Algolia 搜索配置# ==============================================================================# 檢查是否配置了 AlgoliaALGOLIA_APPLICATION_ID = os.environ.get('ALGOLIA_APPLICATION_ID', '')ALGOLIA_API_KEY = os.environ.get('ALGOLIA_API_KEY', '')# 如果未配置 Algolia，將使用數據庫搜索作為備用方案USE_ALGOLIA = bool(ALGOLIA_APPLICATION_ID and ALGOLIA_API_KEY)ALGOLIA = {    'APPLICATION_ID': ALGOLIA_APPLICATION_ID,    'API_KEY': ALGOLIA_API_KEY,    'SEARCH_API_KEY': os.environ.get('ALGOLIA_SEARCH_API_KEY', ''),    'ENABLED': USE_ALGOLIA,}