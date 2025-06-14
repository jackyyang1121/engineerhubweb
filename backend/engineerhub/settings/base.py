"""
EngineerHub - 工程師社群平台
Django 基礎設置文件

這個文件包含所有環境通用的設置
具體環境的設置請在 development.py, production.py 等文件中覆蓋
"""

import os
from pathlib import Path
from decouple import config  #config() 函式會從環境變數或 .env 檔案中讀取我指定的變數名稱的值。
from datetime import timedelta

# ==================== 基礎路徑設置 ====================
# BASE_DIR: 定義專案的根目錄路徑，使用 Pathlib 確保跨平台兼容性(同一個程式可以在不同的作業系統（Windows、Mac、Linux）都能正確執行，不會出現錯誤或相容性問題。)
# 不同作業系統的「路徑符號」不一樣：
# Windows：使用反斜線 \（例如：C:\Users\Tom\file.txt）
# macOS / Linux：使用正斜線 /（例如：/home/tom/file.txt）
# Pathlib 的 .resolve() 方法可以把相對路徑轉成絕對路徑，讓在 Windows/Linux/MacOS 上都可以一樣地讀取檔案。
# _file_是 Python 裡的內建特殊變數（built-in variable），它會儲存「目前執行的 Python 檔案的完整路徑」。
# **Django 自動生成**
BASE_DIR = Path(__file__).resolve().parent.parent.parent
#.parent.parent.parent讓BASE_DIR往上找三層，找到專案的根目錄

# ==================== 安全設置 ====================
# SECRET_KEY: 用於加密會話、密碼和其他敏感數據的密鑰。應保密，建議在生產環境中使用環境變量存儲。
# 例如CSRF使用SECRET_KEY來生成token，這樣可以防止CSRF攻
# **Django 自動生成**
SECRET_KEY = config('SECRET_KEY', default='your-secret-key-here')

# DEBUG: 啟用或禁用調試模式。True 時顯示詳細錯誤訊息，生產環境應設為 False 以避免洩露敏感信息。
# **Django 自動生成**
DEBUG = config('DEBUG', default=False, cast=bool)
# cast=bool 轉成布林值。
# 開發時，你想看到所有錯誤細節幫你快速修錯 → 設 DEBUG=True。
# 產品上線時，不想用戶看到錯誤細節 → 設 DEBUG=False。

# DEBUG=False 時 Django 預設行為：
# 不會顯示詳細的錯誤堆疊頁面（也就是「黃底詳細錯誤頁」）。
# 會顯示一個簡單的錯誤頁面（通常是 500 錯誤頁），但不會詳細透露內部錯誤內容。
# 但是你「還是會看到一些錯誤訊息」，例如 HTTP 錯誤碼或簡短的錯誤說明。
# DEBUG=True	顯示詳細錯誤堆疊和變數資訊


# ALLOWED_HOSTS: 允許訪問此專案的主機名稱或 IP 列表。生產環境需設置實際域名，否則可能導致 400 錯誤。
# **Django 自動生成**
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1',  cast=lambda v: [s.strip() for s in v.split(',')])
#.env 或設定檔裡的 ALLOWED_HOSTS 通常會是一個 字串，像這樣：ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
#但 Django 的 ALLOWED_HOSTS 設定要求是一個 list，也就是一個「清單」： ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']
#所以需要用 cast=lambda v: [s.strip() for s in v.split(',')] 把字串轉成 list。
#lambda 是 Python 裡的一種匿名函數（anonymous function），意思是「沒有名字的函數」。
#v.split(',')：把字串 v 用逗號 , 分割成一個列表。例如 "a, b, c" 變成 ["a", " b", " c"]。
#s.strip()：去除字串前後的空白。例如 " a " 變成 "a"。



# ==================== 應用程式定義 ====================
# DJANGO_APPS: Django 內建的應用程式，提供核心功能如管理後台、認證、會話管理等。
# **Django 自動生成（部分）**
DJANGO_APPS = [
    'django.contrib.admin',         # 管理後台介面 **Django 自動生成**
    'django.contrib.auth',          # 認證系統 **Django 自動生成**
    'django.contrib.contenttypes',  # 內容類型框架 **Django 自動生成**
# 專業說明 — 內容類型框架（Content Types Framework）
# Django 的 ContentTypes 框架是一種「通用型」的資料模型系統。
# 它讓你能夠在資料庫裡儲存和追蹤不同模型（Model）的類型。
# 換句話說，它能讓你用統一的方式，指向任意一個模型的資料列（不管那個模型是什麼）。
# ContentTypes 框架會幫你把每個模型對應到一個「內容類型（ContentType）」的記錄，包括應用程式名稱和模型名稱。
# GenericForeignKey 是這個框架的核心應用之一。
# 它結合了：
# 一個指向 ContentType 的 ForeignKey（例如 content_type）
# 一個儲存資料行主鍵的欄位（例如 object_id）
# 兩者加起來，讓你用一個欄位就能動態地指向任何模型的任何資料行。
# 這個設計就是所謂的「泛型關聯」。

# 白話舉例
# 假設你有一個網站，有「文章（Article）」和「留言（Comment）」兩種模型：
# 你想做一個「喜歡（Like）」系統，讓用戶能「喜歡」文章或留言。
# 如果你只用一般的 ForeignKey，那就得寫兩個欄位：
# 一個 article 外鍵（指向文章）
# 一個 comment 外鍵（指向留言）
# 但這樣資料表結構又多又亂。
# 你可以改用 ContentTypes + GenericForeignKey，這樣就可以用一個 Like 模型同時紀錄喜歡文章或留言的資料。
# 具體範例:
# from django.contrib.contenttypes.fields import GenericForeignKey
# from django.contrib.contenttypes.models import ContentType
# from django.db import models

# class Like(models.Model):
#     user = models.ForeignKey('auth.User', on_delete=models.CASCADE)
#     content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
#     object_id = models.PositiveIntegerField()
#     content_object = GenericForeignKey('content_type', 'object_id')

# # 原本用法：
# # like = Like.objects.create(user=user, content_object=some_article)
# # like = Like.objects.create(user=user, content_object=some_comment)
#
# #改用 ContentTypes + GenericForeignKey:
# 可以直接寫like.content_object


    'django.contrib.sessions',      # 會話管理 **Django 自動生成**
# 專業說明 — 會話管理（Session Management）
# 會話（Session） 是指在多次 HTTP 請求中，保存同一個用戶的狀態資料。
# 因為 HTTP 協議是「無狀態」的（每次請求都是獨立的），所以會話管理就是讓網站記得同一個用戶的資料，像是登入狀態、購物車內容等。
# Django 的 django.contrib.sessions 模組自動幫你處理這些資料存放在伺服器端，並用一個會話ID存在用戶的瀏覽器 Cookie 裡，讓伺服器能認出用戶。

# 白話舉例
# 假設你在一個網購網站買東西：
# 你第一次進入網站，網站給你一個「會話ID」（存在 Cookie 裡）。
# 你挑選商品放入購物車，這些資料會存在伺服器端，跟你的會話ID綁定。
# 下一頁或下一次請求，網站會用你的會話ID找出你之前放的商品，讓購物車資料不會不見。
    'django.contrib.messages',      # 消息框架 **Django 自動生成**
#假設你在使用者註冊後想告訴他「註冊成功」：
# from django.contrib import messages
# def register(request):
#     # 註冊邏輯
#     messages.success(request, "註冊成功！歡迎加入！")
#     return redirect('home')

#接著在前端的 Template 中：
# {% if messages %}
#   {% for message in messages %}
#     <div class="alert">{{ message }}</div>
#   {% endfor %}
# {% endif %}
#使用者就會看到「註冊成功！歡迎加入！」的訊息，且過一段時間它就會自動消失。
    'django.contrib.staticfiles',   # 靜態文件管理 **Django 自動生成**
# 專業說明：
# django.contrib.staticfiles 是 Django 內建的一個應用程式，專門用來幫助管理「靜態資源」（static files），包括網站的 CSS 樣式表、JavaScript 腳本、圖片、字型等前端檔案。
# 這個框架解決了在開發和部署階段，靜態資源如何組織、查找和提供給用戶端瀏覽器的問題。它提供了方便的方法來收集（collect）所有應用和第三方套件的靜態文件到一個統一的位置，並在生產環境中快速有效地服務這些檔案。
# 主要功能：
# 統一管理靜態資源：讓你能在專案不同地方（不同 app 裡）放置靜態文件，Django 可以找到並集中管理。
# 靜態資源收集 (collectstatic 指令)：將所有 app 和專案的靜態檔案複製到指定的靜態根目錄，方便伺服器一次性服務。
# 開發時快速提供靜態檔案：在本地開發時，Django 會自動幫你提供靜態檔案，不需要自己額外設定 web 伺服器。
# 方便擴充：支持壓縮、合併靜態文件，還能與 CDN 或其他外部資源整合。

# 白話舉例：
# 想像你在建一棟大樓，裡面有很多不同房間（app），每個房間都有自己的工具箱（靜態文件：圖片、CSS、JS）。
# staticfiles 就像是一個總管，他會幫你把所有房間的工具箱裡的東西收集整理，放到一個大倉庫裡，當訪客（瀏覽器）來的時候，能快速找到並拿到他需要的工具，讓整棟大樓運作順暢。

# 典型用法：
# 在 app 目錄下建立 static/ 文件夾，放靜態文件。
# 設定 STATIC_URL 和 STATIC_ROOT，告訴 Django 靜態文件的網址和儲存位置。
# 開發時直接用 Django 內建的靜態文件服務。
# 部署時執行 python manage.py collectstatic，收集所有靜態文件到 STATIC_ROOT，由 web 伺服器（如 nginx）提供靜態資源服務。

# 他只是幫我把前端整理好拿出來顯示比較快
# 如果你沒用它，會怎麼樣？
# 開發時
# Django 內建的開發伺服器會自動幫你服務靜態文件，不用這個功能也能看到東西，但會比較麻煩（你得自己寫很多程式碼告訴 Django 靜態檔在哪）。

# 部署時
# 如果沒用 staticfiles 的 collectstatic 整理，靜態文件分散在各個 app 的資料夾裡，專業的伺服器（Nginx/Apache）找不到該怎麼送給瀏覽器。
# 你會遇到前端樣式不見、圖片載入失敗，頁面跑版或缺圖的情況。
# 你還得自己想辦法把這些靜態檔案整理起來，工作量很大，也容易出錯。

# 此專案前端使用React+vite不使用 Django 模板因此沒用到此工具但在admin、debug_toolbug、DRF...等第三方服務還是有用到staticfiles
    
    'django.contrib.sites',         # 網站框架，支援多站點管理
#此專案目前僅為了和Allauth配合而使用到此工具
    'django.contrib.humanize',      # 格式化數字、日期等工具
# 此專案前端使用React+vite不使用 Django 模板因此沒用到此工具
# 專業說明
# django.contrib.humanize 是 Django 內建的一個應用，提供了一組「人性化（human-friendly）」的模板過濾器和標籤，專門用來格式化數字、日期、時間等資料，使它們看起來更容易理解和親切。
# 這些過濾器能把原本生硬或不易閱讀的數字、日期等轉換成符合日常語言習慣的形式，比如：
# 把大數字變成「1.2萬」或「1.2K」
# 把時間差轉成「3分鐘前」、「1天前」
# 把數字加上千分位逗號，像「1,000,000」
# 這樣使用者看到的資料會更直觀、更貼近人類的認知。

# 白話舉例
# 假設你有個網站要顯示文章的瀏覽次數，如果直接顯示「12345」看起來有點生硬，用 humanize 就可以變成「12,345」或「12K」這樣比較好讀。
# 再比如時間標籤，直接顯示時間戳「2025-05-31 15:00:00」很硬，但用 humanize 可以顯示「5分鐘前」或「昨天」，讓使用者感覺更貼心。
]





# THIRD_PARTY_APPS: 第三方應用程式，擴展 Django 功能，如 REST API、認證、WebSocket 等。
THIRD_PARTY_APPS = [
    # Django REST Framework: 構建 RESTful API 的工具包
    'rest_framework',                   # DRF 核心功能
    'rest_framework_simplejwt',         # JWT 認證系統
    'rest_framework_simplejwt.token_blacklist',  # JWT 黑名單功能，用於登出時使 token 失效
    'drf_spectacular',                  # API 文檔生成工具
    
    # 認證相關: 使用 dj-rest-auth + allauth 替代自定義認證系統
    'dj_rest_auth',                     # RESTful 認證端點，提供標準化的認證 API
    'dj_rest_auth.registration',        # 註冊功能，處理用戶註冊流程
    'allauth',                          # Django-allauth 核心，強大的認證框架
    'allauth.account',                  # 帳戶管理，處理用戶帳戶相關功能
    'allauth.socialaccount',            # 社交帳戶支持，啟用第三方登入
    'allauth.socialaccount.providers.google',  # Google OAuth2 社交登入提供者
    'allauth.socialaccount.providers.github',  # GitHub OAuth2 社交登入提供者
    
    # CORS: 處理跨域請求
    'corsheaders',                      # 跨來源資源共享，允許前端跨域訪問 API
    
    # WebSocket: 支援即時通訊
    'channels',                         # Django Channels，支援 WebSocket 和異步處理
    
    # 任務佇列: 異步任務處理
    'django_celery_beat',               # 定時任務調度
    'django_celery_results',            # 任務結果存儲
    
    # 搜尋服務: 全文搜尋功能（可動態移除）
    'algoliasearch_django',             # Algolia 搜尋整合
    
    # 開發工具: 提升開發效率(可在終端機輸入指令但我目前不太會用)
    'django_extensions',                # 額外管理命令和工具
    'django_filters',                   # 過濾查詢功能
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

# 可以想像：
# INSTALLED_APPS 是「你專案有什麼工具箱」。
# MIDDLEWARE 是「你用來檢查和處理每次用工具箱取出的東西的檢查點」。



# ==================== URL 配置 ====================
# ROOT_URLCONF: 指定 URL 路由配置文件的路徑，指向專案的主 URL 配置文件。
# **Django 自動生成**
ROOT_URLCONF = 'engineerhub.urls'

# ==================== 模板設置 ====================
# 這邊我這個專案沒用到，因為我現在是前後端分離，前端使用React+vite，沒用到Django模板，所以沒用到這邊的設定
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
# 用在部署時，Django 會透過環境變數或manage.py裡的 DJANGO_SETTINGS_MODULE 指定要用哪個設定檔
# 開發時，Django 會自動使用 settings.py 裡的設定，Django 會直接透過 runserver 啟動內建的開發伺服器
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
        #這裡的 BACKEND 是指指定背後實作的"引擎"，也就是讓你告訴 Django 該用哪個程式庫或模組來完成特定的任務
        'LOCATION': REDIS_URL,                       # Redis 連接地址
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient', # Redis 客戶端類
        }
    }
}
# Django 本身就有快取機制LocMemCache
# 只是我在這邊透過 CACHES 的設定，把「快取後端」換成 Redis
# 這樣 Django 就會把快取資料寫到 Redis，而不是只存在本機記憶體

# ==================== 會話設置 ====================
# SESSION_ENGINE: 定義會話存儲引擎，使用緩存後端（Redis）。
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

# SESSION_CACHE_ALIAS: 指定會話使用的緩存別名。
SESSION_CACHE_ALIAS = 'default'

# SESSION_ENGINE = 'django.contrib.sessions.backends.cache'會去找Django內建緩存位置，
# 但我CACHES又設定緩存位置在Redis上，所以session會自動儲存在Redis上

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

# 注意：由於本專案主要為 API 後端，不需要自定義靜態文件
# STATICFILES_DIRS 已移除，只使用第三方套件的靜態文件（Admin、DRF等）

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
# 這個會讓我專案內models.py裡的模型創建時自動生成id，且是遞增
# **Django 自動生成**
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==================== 網站設置 ====================
# SITE_ID: 網站 ID，用於 django.contrib.sites 框架。
# 這個是為了和Allauth整合，讓Allauth知道我的網站是哪個
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
# 以上也只是從INSTALL_APPS安裝的 'rest_framework','rest_framework.authtoken',  'rest_framework_simplejwt', 裡面的工具拿出來用
# 就好比安裝pandas用pandas裡面的工具一樣

# ==================== JWT 設置 ====================
# SIMPLE_JWT: 配置 Simple JWT 的參數，用於生成和管理 JWT。
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),     # Access Token 有效期（1 小時）
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),     # Refresh Token 有效期（7 天）
#Access Token 是短期的，一直更換避免token被盜用，不會重新刷新頁面不需要重新登入，避免用戶一直登入
#Refresh Token 是長期的，用來換取新的Access Token，會重新刷新頁面需要重新登入
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
# 安裝了 'corsheaders' 這個 app → 在這邊，才能用 CORS_ALLOWED_ORIGINS 這個被定義好的變數來設定哪些域名可以跨域訪問。
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
# 決定「用什麼找用戶」，這邊我選擇用email找用戶
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
# REST_AUTH: dj-rest-auth 的配置，用於 RESTful 認證系統
REST_AUTH = {
    # JWT 相關設置
    'USE_JWT': True,                         # 啟用 JWT 認證，替代傳統的 Token 認證
    'JWT_AUTH_COOKIE': 'engineerhub-jwt',    # JWT Access Token 的 Cookie 名稱
    'JWT_AUTH_REFRESH_COOKIE': 'engineerhub-jwt-refresh', # JWT Refresh Token 的 Cookie 名稱
    'JWT_AUTH_HTTPONLY': False,              # 允許前端 JavaScript 讀取 Cookie（設為 True 更安全但需調整前端）
    'JWT_AUTH_SECURE': False,                # 開發環境設為 False，生產環境應設為 True（僅 HTTPS）
    'JWT_AUTH_SAMESITE': 'Lax',             # Cookie 的 SameSite 屬性，防止 CSRF 攻擊
    
    # 序列化器配置 - 使用 dj-rest-auth 的預設序列化器
    'USER_DETAILS_SERIALIZER': 'dj_rest_auth.serializers.UserDetailsSerializer', # 用戶詳情序列化器
    'LOGIN_SERIALIZER': 'dj_rest_auth.serializers.LoginSerializer',              # 登入序列化器
    'PASSWORD_RESET_SERIALIZER': 'dj_rest_auth.serializers.PasswordResetSerializer', # 密碼重置序列化器
    'PASSWORD_RESET_CONFIRM_SERIALIZER': 'dj_rest_auth.serializers.PasswordResetConfirmSerializer', # 密碼重置確認序列化器
    'PASSWORD_CHANGE_SERIALIZER': 'dj_rest_auth.serializers.PasswordChangeSerializer', # 密碼修改序列化器
    
    # 註冊相關配置
    'REGISTER_SERIALIZER': 'accounts.serializers.CustomRegisterSerializer', # 自定義註冊序列化器，包含額外字段
    
    # 會話相關設置
    'SESSION_LOGIN': False,                  # 禁用會話登入，僅使用 JWT
    'OLD_PASSWORD_FIELD_ENABLED': True,     # 修改密碼時需要提供舊密碼
    
    # Token 相關設置
    'TOKEN_MODEL': None,                     # 不使用 DRF Token，僅使用 JWT
}
# | 設定名稱                   | 說明                                                                                               |
# | ------------------------- | ------------------------------------------------------------------------------------------------- |
# | `USE_JWT`                 | 設定為 True 時，使用 JWT 作為身份驗證方式（更現代、支援前後端分離）。如果關掉，會用 Session 認證（傳統）。 |
# | `JWT_AUTH_COOKIE`         | 指定 JWT 存放在 Cookie 中的名稱（例如 `'auth-jwt'`）。方便前端自動帶 Token。                          |
# | `JWT_AUTH_REFRESH_COOKIE` | 指定 Refresh Token 存放在 Cookie 中的名稱（例如 `'auth-jwt-refresh'`）。用於更新過期的 Access Token。 |
# | `JWT_AUTH_HTTPONLY`       | True 代表瀏覽器無法用 JS 讀取 Cookie（只能後端用），False 則可以。視乎前端需求（安全性考量）。           |
# | `USER_DETAILS_SERIALIZER` | 指定序列化器，用來控制使用者詳細資料的 API 格式（例如返回 email、name 等）。                           |
# | `REGISTER_SERIALIZER`     | 指定註冊序列化器，用來自定義註冊時要哪些欄位（例如 email、password、nickname 等）。                   |

# 簡單講就是設定好JWT的配置，例如Access Token和Refresh Token的命名以及存放位置，讓Django Rest Framework可以正常使用JWT
# REST_AUTH（或更廣義的 SIMPLE_JWT）的配置，就是設定好 JWT 的使用方式（包括存放位置、有效期、是否用 Cookie），讓 Django REST Framework（或 dj-rest-auth）可以正常運作 JWT 驗證

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


#只要有設定好這些，就可以用 Django 寄信，通常跟使用者驗證（像是 dj-rest-auth）或註冊流程綁在一起，寄驗證信、重設密碼信等。

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

# 這段 LOGGING 配置的「實際功能」包含：
# 記錄訊息的分類和格式化
# 你設定了不同的格式器 (verbose, simple)，決定日誌訊息長得怎樣（時間、級別、模組、訊息內容等）。
# 不同訊息等級（INFO, DEBUG, ERROR）會用不同格式顯示。
# 多種輸出管道（Handler）
# 訊息會同時輸出到：
# 控制台(console)：開發時直接看到。
# 文件(file)：保存到硬碟裡的 .log 檔，方便事後追蹤錯誤和行為紀錄。
# 錯誤文件(error_file)：專門記錄 ERROR 級別以上的錯誤。
# 郵件通知(mail_admins)：當錯誤發生且是生產環境（DEBUG=False）時，系統會自動寄郵件通知管理員。
# 環境感知（Filters）
# require_debug_true 和 require_debug_false 讓你可以針對開發環境（DEBUG=True）和正式環境（DEBUG=False）分別處理日誌行為，例如開發時只輸出控制台，生產時才發郵件。
# 不同日誌器（Logger）針對不同模組
# django、django.request、django.security、還有自定義的 engineerhub，分別有不同的處理器和日誌等級，方便你依需求調整哪裡要寫哪些日誌。
# 日誌輪替（RotatingFileHandler）
# 日誌檔會自動輪替，不會一直長大佔硬碟空間，設定了最大大小（10MB）和備份數（5個檔案）。
# 建立日誌目錄
# log_dir.mkdir(exist_ok=True) 確保目錄存在，防止寫日誌時發生錯誤。

# 如果沒有這套日誌系統：
# 你只能看控制台輸出，或不小心漏掉錯誤。
# 也沒辦法自動發郵件通知管理員。
# 追蹤歷史問題就變得非常困難。

#是一個蠻重要的功能尤其是和別人協作的時候，可以很清楚的知道哪裡出了問題，以及是什麼問題，以及之前發生過什麼問題
#但我目前還沒熟悉這個，不太清楚如何觀察紀錄

# ==================== 自定義配置 ====================
# CODE_HIGHLIGHT_STYLES: 程式碼高亮支援的樣式。
CODE_HIGHLIGHT_STYLES = ['monokai', 'github', 'vs', 'xcode', 'default']
# DEFAULT_CODE_STYLE: 預設程式碼高亮樣式。
DEFAULT_CODE_STYLE = 'monokai'
# MAX_CODE_LENGTH: 程式碼最大長度（字符數）。
MAX_CODE_LENGTH = 10000
# 以上是設定程式碼高亮樣式(Pygments相關)

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
# Celery 會透過 django-celery-results，將任務結果以 ORM 形式儲存在 Django 的資料庫。
# 由於我的 DATABASES 設定指向 PostgreSQL，所以任務結果最終會被寫入 PostgreSQL。
# 因為我已經在 INSTALLED_APPS 裡安裝了 'django_celery_results'，所以可以使用 'django-db' 作為 Celery 的結果後端。


# CELERY_CACHE_BACKEND: 緩存後端，使用 Django 緩存。
CELERY_CACHE_BACKEND = 'django-cache'
#'django-cache' 是 Celery 官方提供的 backend 之一，Celery 的 backend 是負責「儲存任務執行結果」的東西，可以選擇 Redis、Django Database（django-db）、或者其他系統。
# 允許 Celery 透過 Django 的快取系統（也就是 CACHES 設定）來作為快取存放區，而我把CACHES設定為Redis，所以結果就會寫進Redis。

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
        #這裡的 BACKEND 是指指定背後實作的"引擎"，也就是讓你告訴 Django Channels（或 Celery）該用哪個程式庫或模組來完成特定的任務
        #只要在INSTALLED_APPS安裝了 channels和在requirements.txt安裝了channels_redis就可以使用 channels_redis.core.RedisChannelLayer 當作 Channel Layer 的 backend。
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
            'type': 'http',    #http 是 HTTP 授權
            'scheme': 'bearer',   #bearer 是 JWT 的授權方式
            'bearerFormat': 'JWT',  #JWT 的格式
        }
    ],
}