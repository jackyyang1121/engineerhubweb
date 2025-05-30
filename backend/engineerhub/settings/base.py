"""
EngineerHub - 工程師社群平台
Django 基礎設置文件

這個文件包含所有環境通用的設置
具體環境的設置請在 development.py, production.py 等文件中覆蓋
"""

import os
from pathlib import Path
from decouple import config  # type: ignore
from datetime import timedelta

# ==================== 基礎路徑設置 ====================
# BASE_DIR: 定義專案的根目錄路徑，使用 Pathlib 確保跨平台兼容性。
# **Django 自動生成**
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ==================== 安全設置 ====================
# SECRET_KEY: 用於加密會話、密碼和其他敏感數據的密鑰。應保密，建議在生產環境中使用環境變量存儲。
# **Django 自動生成**
SECRET_KEY = config('SECRET_KEY', default='your-secret-key-here')

# DEBUG: 啟用或禁用調試模式。True 時顯示詳細錯誤訊息，生產環境應設為 False 以避免洩露敏感信息。
# **Django 自動生成**
DEBUG = config('DEBUG', default=False, cast=bool)

# ALLOWED_HOSTS: 允許訪問此專案的主機名稱或 IP 列表。生產環境需設置實際域名，否則可能導致 400 錯誤。
# **Django 自動生成**
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])

# ==================== 應用程式定義 ====================
# DJANGO_APPS: Django 內建的應用程式，提供核心功能如管理後台、認證、會話管理等。
# **Django 自動生成（部分）**
DJANGO_APPS = [
    'django.contrib.admin',         # 管理後台介面 **Django 自動生成**
    'django.contrib.auth',          # 認證系統 **Django 自動生成**
    'django.contrib.contenttypes',  # 內容類型框架 **Django 自動生成**
    'django.contrib.sessions',      # 會話管理 **Django 自動生成**
    'django.contrib.messages',      # 消息框架 **Django 自動生成**
    'django.contrib.staticfiles',   # 靜態文件管理 **Django 自動生成**
    'django.contrib.sites',         # 網站框架，支援多站點管理
    'django.contrib.humanize',      # 格式化數字、日期等工具
]

# THIRD_PARTY_APPS: 第三方應用程式，擴展 Django 功能，如 REST API、認證、WebSocket 等。
THIRD_PARTY_APPS = [
    # Django REST Framework: 構建 RESTful API 的工具包
    'rest_framework',                   # DRF 核心功能
    'rest_framework.authtoken',         # Token 認證
    'rest_framework_simplejwt',         # JWT 認證
    'rest_framework_simplejwt.token_blacklist',  # JWT 黑名單功能
    'drf_spectacular',                  # API 文檔生成工具
    
    # 認證相關: 用戶認證和社交登入
    'dj_rest_auth',                     # RESTful 認證端點
    'dj_rest_auth.registration',        # 註冊功能
    'allauth',                          # Allauth 核心
    'allauth.account',                  # 帳戶管理
    'allauth.socialaccount',            # 社交帳戶支持
    'allauth.socialaccount.providers.google',  # Google 社交登入
    'allauth.socialaccount.providers.github',  # GitHub 社交登入
    
    # CORS: 處理跨域請求
    'corsheaders',                      # 跨來源資源共享
    
    # WebSocket: 支援即時通訊
    'channels',                         # Django Channels
    
    # 任務佇列: 異步任務處理
    'django_celery_beat',               # 定時任務
    'django_celery_results',            # 任務結果存儲
    
    # 搜尋服務: 全文搜尋功能（可動態移除）
    'algoliasearch_django',             # Algolia 搜尋整合
    
    # 開發工具: 提升開發效率
    'django_extensions',                # 額外管理命令
    'django_filters',                   # 過濾查詢
]

# LOCAL_APPS: 本地開發的自定義應用程式，專案特定功能模組。
LOCAL_APPS = [
    'core',          # 核心功能模組
    'accounts',      # 用戶帳戶管理
    'posts',         # 文章或貼文功能
    'comments',      # 評論功能
    'chat',          # 聊天功能
    'notifications', # 通知系統
]

# INSTALLED_APPS: 所有啟用的應用程式列表，包含內建、第三方和本地應用。
# **Django 自動生成（基礎部分）**
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ==================== 中間件 ====================
# MIDDLEWARE: 處理請求和響應的鉤子，按順序執行，負責安全、會話、CSRF 等功能。
# **Django 自動生成（部分）**
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',         # 處理跨域請求
    'django.middleware.security.SecurityMiddleware', # 安全功能 **Django 自動生成**
    'whitenoise.middleware.WhiteNoiseMiddleware',    # 靜態文件服務（生產環境）
    'django.contrib.sessions.middleware.SessionMiddleware', # 會話管理 **Django 自動生成**
    'django.middleware.common.CommonMiddleware',     # 通用功能（如 URL 重定向） **Django 自動生成**
    'django.middleware.csrf.CsrfViewMiddleware',     # CSRF 保護 **Django 自動生成**
    'django.contrib.auth.middleware.AuthenticationMiddleware', # 認證支持 **Django 自動生成**
    'allauth.account.middleware.AccountMiddleware',  # Allauth 帳戶管理
    'django.contrib.messages.middleware.MessageMiddleware', # 消息框架 **Django 自動生成**
    'django.middleware.clickjacking.XFrameOptionsMiddleware', # 防止點擊劫持 **Django 自動生成**
]

# ==================== URL 配置 ====================
# ROOT_URLCONF: 指定 URL 路由配置文件的路徑，指向專案的主 URL 配置文件。
# **Django 自動生成**
ROOT_URLCONF = 'engineerhub.urls'

# ==================== 模板設置 ====================
# TEMPLATES: 配置模板引擎，用於渲染 HTML 頁面。
# **Django 自動生成**
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates', # 使用 Django 模板引擎
        'DIRS': [BASE_DIR / 'templates'],  # 自定義模板目錄
        'APP_DIRS': True,                  # 自動查找應用程式中的 templates 資料夾
        'OPTIONS': {
            'context_processors': [        # 模板上下文處理器，注入全局變數
                'django.template.context_processors.debug',      # 調試信息
                'django.template.context_processors.request',    # 請求對象
                'django.contrib.auth.context_processors.auth',   # 認證數據
                'django.contrib.messages.context_processors.messages', # 消息數據
            ],
        },
    },
]

# ==================== ASGI/WSGI 配置 ====================
# WSGI_APPLICATION: 指定 WSGI 應用程式的路徑，用於傳統 HTTP 請求處理。
# **Django 自動生成**
WSGI_APPLICATION = 'engineerhub.wsgi.application'

# ASGI_APPLICATION: 指定 ASGI 應用程式的路徑，支援非同步請求（如 WebSocket）。
# **Django 自動生成（若使用 Channels）**
ASGI_APPLICATION = 'engineerhub.asgi.application'

# ==================== 數據庫配置 ====================
# DATABASES: 配置數據庫連接參數，預設使用 PostgreSQL。
# **Django 自動生成（基礎結構）**
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',  # 使用 PostgreSQL 數據庫
        'NAME': config('DB_NAME', default='engineerhub'),    # 數據庫名稱
        'USER': config('DB_USER', default='engineerhub_user'), # 數據庫用戶名
        'PASSWORD': config('DB_PASSWORD', default='123456789'), # 數據庫密碼
        'HOST': config('DB_HOST', default='localhost'),      # 數據庫主機
        'PORT': config('DB_PORT', default='5432'),           # 數據庫端口
        'CONN_MAX_AGE': 600,  # 連接池最大存活時間（秒）
    }
}

# ==================== Redis 配置 ====================
# REDIS_URL: Redis 服務的連接 URL，用於緩存、會話和異步任務。
REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')

# ==================== 緩存設置 ====================
# CACHES: 配置緩存後端，使用 Redis 作為緩存存儲。
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',  # Redis 緩存後端
        'LOCATION': REDIS_URL,                       # Redis 連接地址
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient', # Redis 客戶端類
        }
    }
}

# ==================== 會話設置 ====================
# SESSION_ENGINE: 定義會話存儲引擎，使用緩存後端（Redis）。
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

# SESSION_CACHE_ALIAS: 指定會話使用的緩存別名。
SESSION_CACHE_ALIAS = 'default'

# ==================== 密碼驗證 ====================
# AUTH_PASSWORD_VALIDATORS: 密碼驗證規則，現已移除所有驗證器，允許任何密碼。
AUTH_PASSWORD_VALIDATORS = []

# ==================== 自定義用戶模型 ====================
# AUTH_USER_MODEL: 指定自定義用戶模型，替換 Django 預設的 User 模型。
AUTH_USER_MODEL = 'accounts.User'

# ==================== 國際化 ====================
# LANGUAGE_CODE: 設置語言代碼，zh-hant 表示繁體中文。
# **Django 自動生成（預設 en-us）**
LANGUAGE_CODE = 'zh-hant'

# TIME_ZONE: 設置時區，Asia/Taipei 表示台北時間。
# **Django 自動生成（預設 UTC）**
TIME_ZONE = 'Asia/Taipei'

# USE_I18N: 啟用國際化，支援多語言翻譯。
# **Django 自動生成**
USE_I18N = True

# USE_TZ: 啟用時區支持，確保時間處理一致。
# **Django 自動生成**
USE_TZ = True

# ==================== 靜態文件設置 ====================
# STATIC_URL: 靜態文件的 URL 前綴，用於瀏覽器訪問。
# **Django 自動生成**
STATIC_URL = '/static/'

# STATIC_ROOT: 收集靜態文件的目标目錄，供生產環境使用。
# **Django 自動生成**
STATIC_ROOT = BASE_DIR / 'staticfiles'

# STATICFILES_DIRS: 額外的靜態文件目錄，開發時使用。
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# STATICFILES_STORAGE: 靜態文件存儲引擎，使用 WhiteNoise 壓縮並服務靜態文件。
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ==================== 媒體文件設置 ====================
# MEDIA_URL: 媒體文件的 URL 前綴，用於上傳文件的瀏覽器訪問。
MEDIA_URL = '/media/'

# MEDIA_ROOT: 媒體文件存儲的本地目錄，上傳文件保存於此。
MEDIA_ROOT = BASE_DIR / 'media'

# ==================== 文件上傳設置 ====================
# FILE_UPLOAD_MAX_MEMORY_SIZE: 內存中處理的文件上傳最大大小（10MB）。
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# DATA_UPLOAD_MAX_MEMORY_SIZE: 請求體數據的最大大小（10MB）。
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# ALLOWED_IMAGE_EXTENSIONS: 允許上傳的圖片格式。
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

# ALLOWED_VIDEO_EXTENSIONS: 允許上傳的影片格式。
ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.wmv', '.flv']

# MAX_IMAGE_SIZE: 圖片文件最大大小（5MB）。
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

# MAX_VIDEO_SIZE: 影片文件最大大小（50MB）。
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

# ==================== 默認主鍵設置 ====================
# DEFAULT_AUTO_FIELD: 模型主鍵的默認類型，使用 BigAutoField（64 位整數）。
# **Django 自動生成**
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==================== 網站設置 ====================
# SITE_ID: 網站 ID，用於 django.contrib.sites 框架。
SITE_ID = 1

# ==================== 認證後端設置 ====================
# AUTHENTICATION_BACKENDS: 定義認證後端，支援 Django 內建和 Allauth。
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',       # Django 預設認證
    'allauth.account.auth_backends.AuthenticationBackend', # Allauth 認證
]

# ==================== DRF 設置 ====================
# REST_FRAMEWORK: Django REST Framework 的全局配置。
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [  # 預設認證類
        'rest_framework_simplejwt.authentication.JWTAuthentication', # JWT 認證
        'rest_framework.authentication.SessionAuthentication',       # 會話認證
    ],
    'DEFAULT_PERMISSION_CLASSES': [      # 預設權限類
        'rest_framework.permissions.IsAuthenticated', # 需認證才能訪問
    ],
    'DEFAULT_RENDERER_CLASSES': [        # 預設渲染器
        'rest_framework.renderers.JSONRenderer', # 回應 JSON 格式
    ],
    'DEFAULT_PARSER_CLASSES': [          # 預設解析器
        'rest_framework.parsers.JSONParser',     # 解析 JSON
        'rest_framework.parsers.FormParser',     # 解析表單數據
        'rest_framework.parsers.MultiPartParser', # 解析多部分數據（如文件）
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination', # 分頁類
    'PAGE_SIZE': 20,                     # 每頁顯示數量
    'DEFAULT_FILTER_BACKENDS': [         # 預設過濾器
        'django_filters.rest_framework.DjangoFilterBackend', # 過濾查詢
        'rest_framework.filters.SearchFilter',               # 搜尋過濾
        'rest_framework.filters.OrderingFilter',             # 排序過濾
    ],
    'DEFAULT_THROTTLE_CLASSES': [        # 預設限流類
        'rest_framework.throttling.AnonRateThrottle', # 匿名用戶限流
        'rest_framework.throttling.UserRateThrottle', # 認證用戶限流
    ],
    'DEFAULT_THROTTLE_RATES': {          # 限流速率
        'anon': '100/hour',              # 匿名用戶每小時 100 次
        'user': '1000/hour',             # 認證用戶每小時 1000 次
    },
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler', # 自定義異常處理
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',    # API 文檔生成類
}

# ==================== JWT 設置 ====================
# SIMPLE_JWT: 配置 Simple JWT 的參數，用於生成和管理 JWT。
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),     # Access Token 有效期（1 小時）
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),     # Refresh Token 有效期（7 天）
    'ROTATE_REFRESH_TOKENS': True,                   # 刷新時生成新 Refresh Token
    'BLACKLIST_AFTER_ROTATION': True,                # 舊 Refresh Token 加入黑名單
    'UPDATE_LAST_LOGIN': True,                       # 更新最後登入時間
    
    'ALGORITHM': 'HS256',                            # 加密演算法
    'SIGNING_KEY': SECRET_KEY,                       # 簽名密鑰
    'VERIFYING_KEY': None,                           # 驗證密鑰（預設 None）
    'AUDIENCE': None,                                # 接收者（可選）
    'ISSUER': 'engineerhub',                         # 發行者
    'JSON_ENCODER': None,                            # JSON 編碼器
    'JWK_URL': None,                                 # JWK URL（可選）
    'LEEWAY': 0,                                     # 時間寬限（秒）
    
    'AUTH_HEADER_TYPES': ('Bearer',),                # 認證頭類型
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',        # 認證頭名稱
    'USER_ID_FIELD': 'id',                           # 用戶 ID 欄位
    'USER_ID_CLAIM': 'user_id',                      # JWT 中的用戶 ID 名稱
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule', # 認證規則
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',), # Token 類型
    'TOKEN_TYPE_CLAIM': 'token_type',                # Token 類型聲明
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser', # Token 用戶類
    
    'JTI_CLAIM': 'jti',                              # 唯一標識符聲明
    
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp', # 滑動 Token 刷新聲明
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),  # 滑動 Token 有效期
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1), # 滑動 Token 刷新有效期
}

# ==================== CORS 設置 ====================
# CORS_ALLOWED_ORIGINS: 允許跨域請求的來源列表。
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React 開發服務器
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # Vite 開發服務器
    "http://127.0.0.1:5173",
    "http://localhost:8000",  # Django 開發服務器
    "http://127.0.0.1:8000",
]

# CORS_ALLOW_CREDENTIALS: 允許跨域請求攜帶憑證（如 Cookie）。
CORS_ALLOW_CREDENTIALS = True

# CORS_ALLOW_HEADERS: 允許的跨域請求頭。
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
# CSRF_TRUSTED_ORIGINS: 信任的 CSRF 來源，防止跨站請求偽造。
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",  # React 開發服務器
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # Vite 開發服務器
    "http://127.0.0.1:5173",
    "http://localhost:8000",  # Django 開發服務器
    "http://127.0.0.1:8000",
]

# ==================== AllAuth 和社交登入配置 ====================
# ACCOUNT_LOGIN_METHODS: 定義登入方式，僅支援 email。
ACCOUNT_LOGIN_METHODS = {'email'}

# ACCOUNT_SIGNUP_FIELDS: 註冊表單必填字段，帶 * 表示必填。
ACCOUNT_SIGNUP_FIELDS = ['username*', 'email*', 'password1*', 'password2*']

# ACCOUNT_EMAIL_REQUIRED: 註冊時是否要求提供電子郵件。
ACCOUNT_EMAIL_REQUIRED = True

# ACCOUNT_USERNAME_REQUIRED: 註冊時是否要求提供用戶名。
ACCOUNT_USERNAME_REQUIRED = True

# ACCOUNT_EMAIL_VERIFICATION: 電子郵件驗證模式，mandatory 表示必須驗證。
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'

# ACCOUNT_CONFIRM_EMAIL_ON_GET: 允許通過 GET 請求確認電子郵件。
ACCOUNT_CONFIRM_EMAIL_ON_GET = True

# ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS: 電子郵件確認鏈接有效期（天）。
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 7

# ACCOUNT_LOGOUT_ON_GET: 允許通過 GET 請求登出。
ACCOUNT_LOGOUT_ON_GET = True

# ACCOUNT_SESSION_REMEMBER: 是否記住會話（保持登入狀態）。
ACCOUNT_SESSION_REMEMBER = True

# ACCOUNT_UNIQUE_EMAIL: 電子郵件是否必須唯一。
ACCOUNT_UNIQUE_EMAIL = True

# ACCOUNT_USERNAME_MIN_LENGTH: 用戶名最小長度。
ACCOUNT_USERNAME_MIN_LENGTH = 3

# ACCOUNT_RATE_LIMITS: 速率限制，防止濫用。
ACCOUNT_RATE_LIMITS = {
    "login_failed": "5/5m",      # 5 次失敗登入 / 5 分鐘
    "signup": "20/m",            # 20 次註冊 / 分鐘
    "add_email": "5/h",          # 5 次添加郵件 / 小時
    "confirm_email": "5/h",      # 5 次確認郵件 / 小時
}

# SOCIALACCOUNT_PROVIDERS: 社交登入提供者的配置。
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],         # 請求的權限範圍
        'AUTH_PARAMS': {'access_type': 'online'}, # 授權參數
        'OAUTH_PKCE_ENABLED': True,            # 啟用 PKCE 安全機制
    },
    'github': {
        'SCOPE': ['user:email', 'read:user'],  # 請求的權限範圍
    }
}

# ==================== dj-rest-auth 配置 ====================
# REST_AUTH: dj-rest-auth 的配置，用於 RESTful 認證。
REST_AUTH = {
    'USE_JWT': True,                         # 使用 JWT 認證
    'JWT_AUTH_COOKIE': 'auth-jwt',           # JWT Cookie 名稱
    'JWT_AUTH_REFRESH_COOKIE': 'auth-jwt-refresh', # Refresh Token Cookie 名稱
    'JWT_AUTH_HTTPONLY': False,              # 允許前端讀取 Cookie
    'USER_DETAILS_SERIALIZER': 'accounts.serializers.UserSerializer', # 用戶詳情序列化器
    'REGISTER_SERIALIZER': 'accounts.serializers.CustomRegisterSerializer', # 註冊序列化器
}

# ==================== 郵件設置 ====================
# EMAIL_BACKEND: 郵件發送後端，預設使用控制台輸出。
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')

# EMAIL_HOST: 郵件伺服器主機，預設使用 Gmail SMTP。
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')

# EMAIL_PORT: 郵件伺服器端口，587 表示 TLS。
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)

# EMAIL_USE_TLS: 是否使用 TLS 加密。
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)

# EMAIL_HOST_USER: 郵件伺服器用戶名。
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')

# EMAIL_HOST_PASSWORD: 郵件伺服器密碼。
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

# DEFAULT_FROM_EMAIL: 預設發件人地址。
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@engineerhub.com')

# ==================== 日誌設置 ====================
# LOGGING: 配置日誌記錄，支援控制台、文件和郵件通知。
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,       # 不禁用現有日誌
    'formatters': {                          # 日誌格式
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {                             # 日誌過濾器
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue', # 僅在 DEBUG=True 時記錄
        },
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse', # 僅在 DEBUG=False 時記錄
        },
    },
    'handlers': {                            # 日誌處理器
        'console': {                         # 控制台輸出
            'level': 'INFO',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {                            # 普通日誌文件
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'engineerhub.log',
            'maxBytes': 1024*1024*10,        # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'error_file': {                      # 錯誤日誌文件
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'error.log',
            'maxBytes': 1024*1024*10,        # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'mail_admins': {                     # 發送郵件給管理員
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
            'formatter': 'verbose',
        },
    },
    'root': {                                # 根日誌配置
        'handlers': ['console'],
    },
    'loggers': {                             # 特定日誌記錄器
        'django': {                          # Django 核心日誌
            'handlers': ['console', 'file', 'mail_admins'],
            'level': 'INFO',
        },
        'engineerhub': {                     # 自定義應用日誌
            'handlers': ['console', 'file', 'error_file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'django.request': {                  # 請求相關日誌
            'handlers': ['file', 'error_file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {                 # 安全相關日誌
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
# CODE_HIGHLIGHT_STYLES: 程式碼高亮支援的樣式。
CODE_HIGHLIGHT_STYLES = ['monokai', 'github', 'vs', 'xcode', 'default']

# DEFAULT_CODE_STYLE: 預設程式碼高亮樣式。
DEFAULT_CODE_STYLE = 'monokai'

# MAX_CODE_LENGTH: 程式碼最大長度（字符數）。
MAX_CODE_LENGTH = 10000

# SEARCH_RESULTS_PER_PAGE: 每頁搜尋結果數量。
SEARCH_RESULTS_PER_PAGE = 20

# MAX_SEARCH_QUERY_LENGTH: 搜尋查詢最大長度（字符數）。
MAX_SEARCH_QUERY_LENGTH = 200

# NOTIFICATION_BATCH_SIZE: 通知批次處理數量。
NOTIFICATION_BATCH_SIZE = 50

# NOTIFICATION_RETENTION_DAYS: 通知保留天數。
NOTIFICATION_RETENTION_DAYS = 30

# TEMP_FILE_CLEANUP_HOURS: 臨時文件清理間隔（小時）。
TEMP_FILE_CLEANUP_HOURS = 24

# ORPHANED_FILE_CLEANUP_DAYS: 孤立文件清理間隔（天）。
ORPHANED_FILE_CLEANUP_DAYS = 7

# ==================== Algolia 搜索配置 ====================
# ALGOLIA_APPLICATION_ID: Algolia 應用程式 ID。
ALGOLIA_APPLICATION_ID = config('ALGOLIA_APPLICATION_ID', default='')

# ALGOLIA_API_KEY: Algolia API 密鑰。
ALGOLIA_API_KEY = config('ALGOLIA_API_KEY', default='')

# ==================== 安全設置 ====================
# SECURE_BROWSER_XSS_FILTER: 啟用瀏覽器 XSS 過濾。
SECURE_BROWSER_XSS_FILTER = True

# SECURE_CONTENT_TYPE_NOSNIFF: 防止 MIME 類型嗅探。
SECURE_CONTENT_TYPE_NOSNIFF = True

# X_FRAME_OPTIONS: 防止點擊劫持，DENY 表示禁止嵌入框架。
X_FRAME_OPTIONS = 'DENY'

# ==================== Algolia 配置檢查和動態載入 ====================
def configure_algolia():
    """
    動態配置 Algolia 搜尋服務，包含連接測試。
    """
    global INSTALLED_APPS
    
    # 檢查 Algolia 配置是否完整
    if not ALGOLIA_APPLICATION_ID or not ALGOLIA_API_KEY:
        INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'algoliasearch_django']
        print("⚠️  Algolia 配置不完整，已禁用搜尋功能")
        print("   請設置 ALGOLIA_APPLICATION_ID 和 ALGOLIA_API_KEY 環境變數")
        return False
    
    try:
        from algoliasearch.search_client import SearchClient
        client = SearchClient.create(ALGOLIA_APPLICATION_ID, ALGOLIA_API_KEY)
        print("🔍 正在測試 Algolia 連接...")
        indices = client.list_indices()
        print(f"✅ Algolia 連接成功！應用 ID: {ALGOLIA_APPLICATION_ID}")
        print(f"   現有索引數量: {len(indices['items'])}")
        
        if 'algoliasearch_django' not in INSTALLED_APPS:
            INSTALLED_APPS.append('algoliasearch_django')
        return True
        
    except ImportError:
        print("⚠️  algoliasearch 套件未安裝，已禁用搜尋功能")
        INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'algoliasearch_django']
        return False
    except Exception as e:
        print(f"❌ Algolia 連接測試失敗: {e}")
        print("   請檢查您的 ALGOLIA_APPLICATION_ID 和 ALGOLIA_API_KEY 是否正確")
        INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'algoliasearch_django']
        return False

# 執行 Algolia 配置
try:
    algolia_configured = configure_algolia()
    USE_ALGOLIA = algolia_configured
    
    ALGOLIA = {
        'APPLICATION_ID': ALGOLIA_APPLICATION_ID,
        'API_KEY': ALGOLIA_API_KEY,
        'SEARCH_API_KEY': config('ALGOLIA_SEARCH_API_KEY', default=''),
        'INDEX_PREFIX': config('ALGOLIA_INDEX_PREFIX', default='engineerhub'),
        'ENABLED': algolia_configured,
    }
    
    if algolia_configured:
        ALGOLIA_INDEX_PREFIX = config('ALGOLIA_INDEX_PREFIX', default='engineerhub')
        print(f"🔍 Algolia 搜尋功能已啟用，索引前綴: {ALGOLIA_INDEX_PREFIX}")
    
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

# ==================== Celery 設置 ====================
# CELERY_BROKER_URL: Celery 消息代理 URL，使用 Redis。
CELERY_BROKER_URL = REDIS_URL

# CELERY_RESULT_BACKEND: 任務結果存儲後端，使用 Django 數據庫。
CELERY_RESULT_BACKEND = 'django-db'

# CELERY_CACHE_BACKEND: 緩存後端，使用 Django 緩存。
CELERY_CACHE_BACKEND = 'django-cache'

# CELERY_TASK_SERIALIZER: 任務序列化格式。
CELERY_TASK_SERIALIZER = 'json'

# CELERY_RESULT_SERIALIZER: 結果序列化格式。
CELERY_RESULT_SERIALIZER = 'json'

# CELERY_ACCEPT_CONTENT: 接受的內容類型。
CELERY_ACCEPT_CONTENT = ['json']

# CELERY_TIMEZONE: Celery 時區。
CELERY_TIMEZONE = 'Asia/Taipei'

# CELERY_ENABLE_UTC: 啟用 UTC 時間。
CELERY_ENABLE_UTC = True

# CELERY_BEAT_SCHEDULER: 定時任務調度器。
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# ==================== Channels 設置 ====================
# CHANNEL_LAYERS: 配置 Channels 層，使用 Redis 作為後端。
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
        },
    },
}

# ==================== API 文檔配置 (Spectacular) ====================
# SPECTACULAR_SETTINGS: DRF Spectacular 的配置，用於生成 API 文檔。
SPECTACULAR_SETTINGS = {
    'TITLE': 'EngineerHub API',              # API 文檔標題
    'DESCRIPTION': 'EngineerHub社群平台的API文檔', # API 文檔描述
    'VERSION': '1.0.0',                      # API 版本
    'SERVE_INCLUDE_SCHEMA': False,           # 是否包含模式
    'COMPONENT_SPLIT_REQUEST': True,         # 分離請求元件
    'SCHEMA_PATH_PREFIX': '/api/',           # API 路徑前綴
    'SECURITY': [                            # 安全配置
        {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
        }
    ],
}