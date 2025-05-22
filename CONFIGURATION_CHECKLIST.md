# 🔐 EngineerHub 配置檢查清單這個文件列出了部署 EngineerHub 工程師社群平台所需的所有配置項目。請按照此清單逐一完成配置。## 📋 必需配置項目### 1. 基礎安全設置 🔒#### Django Secret Key```bashSECRET_KEY=your-super-secret-django-key-here-minimum-50-characters```**獲取方式**: - 使用命令生成：`python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`- 線上生成器：https://djecrety.ir/**注意**: 生產環境必須使用強密碼，至少50個字符#### 環境設置```bashDEBUG=False  # 生產環境設為 FalseDJANGO_SETTINGS_MODULE=engineerhub.settings.production  # 或 developmentALLOWED_HOSTS=yourdomain.com,www.yourdomain.com  # 允許的主機名```### 2. 數據庫配置 🗄️#### PostgreSQL 設置```bashDB_NAME=engineerhubDB_USER=your_db_usernameDB_PASSWORD=your_strong_db_passwordDB_HOST=localhostDB_PORT=5432DATABASE_URL=postgresql://user:password@localhost:5432/engineerhub```**配置步驟**:1. 安裝 PostgreSQL：`sudo apt install postgresql postgresql-contrib`2. 創建數據庫用戶：`sudo -u postgres createuser --interactive`3. 創建數據庫：`sudo -u postgres createdb engineerhub`4. 設置密碼：`sudo -u postgres psql -c "ALTER USER username PASSWORD 'password';"`5. 授予權限：`sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE engineerhub TO username;"`### 3. Redis 配置 ⚡#### Redis 連接設置```bashREDIS_URL=redis://localhost:6379/0REDIS_PASSWORD=your_redis_password  # 如果設置了密碼```**配置步驟**:1. 安裝 Redis：`sudo apt install redis-server`2. 啟動 Redis 服務：`sudo systemctl start redis-server`3. 設置開機自啟：`sudo systemctl enable redis-server`4. 測試連接：`redis-cli ping`### 4. 社交登入設置 🔗#### Google OAuth2 設置```bashGOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.comGOOGLE_CLIENT_SECRET=your-google-client-secret```**配置步驟**:1. 前往 [Google Cloud Console](https://console.cloud.google.com/)2. 創建新項目或選擇現有項目3. 啟用 Google+ API4. 創建 OAuth 2.0 客戶端 ID5. 設置授權重定向 URI：`https://yourdomain.com/auth/google/callback/`#### GitHub OAuth 設置```bashGITHUB_CLIENT_ID=your-github-client-idGITHUB_CLIENT_SECRET=your-github-client-secret```**配置步驟**:1. 前往 [GitHub Developer Settings](https://github.com/settings/developers)2. 點擊 "New OAuth App"3. 填寫應用信息4. 設置 Authorization callback URL：`https://yourdomain.com/auth/github/callback/`### 5. 文件存儲配置 📁#### AWS S3 設置（生產環境推薦）```bashAWS_ACCESS_KEY_ID=your-aws-access-key-idAWS_SECRET_ACCESS_KEY=your-aws-secret-access-keyAWS_STORAGE_BUCKET_NAME=your-s3-bucket-nameAWS_S3_REGION_NAME=us-east-1AWS_S3_CUSTOM_DOMAIN=your-cdn-domain.com  # 可選，如果使用 CDN```**配置步驟**:1. 登入 [AWS Console](https://aws.amazon.com/console/)2. 創建 S3 存儲桶3. 創建 IAM 用戶並分配 S3 權限4. 獲取 Access Key 和 Secret Key5. 配置存儲桶的 CORS 設置#### 本地文件存儲（開發環境）```bashMEDIA_ROOT=/path/to/media/filesSTATIC_ROOT=/path/to/static/files```### 6. 搜索引擎配置 🔍#### Elasticsearch 設置```bashELASTICSEARCH_DSL_HOSTS=localhost:9200ELASTICSEARCH_INDEX_PREFIX=engineerhubELASTICSEARCH_USERNAME=elastic  # 如果啟用安全性ELASTICSEARCH_PASSWORD=your_elastic_password```**配置步驟**:1. 安裝 Elasticsearch2. 啟動 Elasticsearch 服務3. 測試連接：`curl -X GET "localhost:9200/"`4. 創建索引：`python manage.py search_index --rebuild`### 7. 郵件服務配置 📧#### SMTP 設置（用於郵件通知）```bashEMAIL_HOST=smtp.gmail.com  # 或其他 SMTP 服務器EMAIL_PORT=587EMAIL_HOST_USER=your-email@gmail.comEMAIL_HOST_PASSWORD=your-app-passwordEMAIL_USE_TLS=TrueDEFAULT_FROM_EMAIL=noreply@yourdomain.com```**Gmail 配置步驟**:1. 啟用兩步驗證2. 生成應用專用密碼3. 使用應用密碼作為 EMAIL_HOST_PASSWORD#### SendGrid 配置（推薦用於生產環境）```bashSENDGRID_API_KEY=your-sendgrid-api-key```### 8. 監控與日誌配置 📊#### Sentry 錯誤追蹤```bashSENTRY_DSN=https://your-sentry-dsn@sentry.io/project-idSENTRY_ENVIRONMENT=production  # 或 development```**配置步驟**:1. 註冊 [Sentry](https://sentry.io/) 帳戶2. 創建新項目3. 獲取 DSN#### 日誌配置```bashLOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICALLOG_FILE_PATH=/var/log/engineerhub/```### 9. 緩存配置 💾#### Redis 緩存設置```bashCACHE_TTL=300  # 默認緩存時間（秒）CACHE_KEY_PREFIX=engineerhub```### 10. 安全設置 🛡️#### HTTPS 設置```bashSECURE_SSL_REDIRECT=TrueSECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,httpsSECURE_HSTS_SECONDS=31536000SECURE_HSTS_INCLUDE_SUBDOMAINS=TrueSECURE_HSTS_PRELOAD=True```#### CORS 設置```bashCORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.comCORS_ALLOW_CREDENTIALS=True```### 11. 任務隊列配置 ⚙️#### Celery 設置```bashCELERY_BROKER_URL=redis://localhost:6379/1CELERY_RESULT_BACKEND=redis://localhost:6379/1CELERY_TIMEZONE=Asia/Taipei```### 12. 第三方服務配置 🌐#### Algolia 搜索（可選）```bashALGOLIA_APPLICATION_ID=your-algolia-app-idALGOLIA_API_KEY=your-algolia-api-keyALGOLIA_SEARCH_API_KEY=your-algolia-search-key```#### 推送通知服務```bashFCM_SERVER_KEY=your-fcm-server-key  # Firebase Cloud MessagingVAPID_PUBLIC_KEY=your-vapid-public-keyVAPID_PRIVATE_KEY=your-vapid-private-key```## 🚀 部署相關配置### 1. 域名與 SSL```bashDOMAIN_NAME=yourdomain.comSSL_CERT_PATH=/etc/ssl/certs/yourdomain.com.crtSSL_KEY_PATH=/etc/ssl/private/yourdomain.com.key```### 2. Nginx 配置```bashNGINX_CLIENT_MAX_BODY_SIZE=50MNGINX_WORKER_PROCESSES=auto```### 3. Docker 配置```bashDOCKER_REGISTRY=your-registry.comDOCKER_IMAGE_TAG=latest```## 📝 配置文件範例### .env 文件範例```bash# 基礎設置SECRET_KEY=your-secret-key-hereDEBUG=FalseALLOWED_HOSTS=yourdomain.com,www.yourdomain.com# 數據庫DATABASE_URL=postgresql://user:password@localhost:5432/engineerhub# RedisREDIS_URL=redis://localhost:6379/0# 社交登入GOOGLE_CLIENT_ID=your-google-client-idGOOGLE_CLIENT_SECRET=your-google-client-secretGITHUB_CLIENT_ID=your-github-client-idGITHUB_CLIENT_SECRET=your-github-client-secret# AWS S3AWS_ACCESS_KEY_ID=your-aws-access-keyAWS_SECRET_ACCESS_KEY=your-aws-secret-keyAWS_STORAGE_BUCKET_NAME=your-bucket-name# 郵件EMAIL_HOST=smtp.gmail.comEMAIL_HOST_USER=your-email@gmail.comEMAIL_HOST_PASSWORD=your-app-password# 監控SENTRY_DSN=your-sentry-dsn```## ✅ 配置檢查清單### 開發環境- [ ] SECRET_KEY 已設置- [ ] DEBUG=True- [ ] PostgreSQL 數據庫已創建並連接- [ ] Redis 已安裝並運行- [ ] 本地文件存儲路徑已設置- [ ] 郵件配置（可使用控制台後端）### 生產環境- [ ] SECRET_KEY 已設置（不同於開發環境）- [ ] DEBUG=False- [ ] ALLOWED_HOSTS 已正確設置- [ ] PostgreSQL 數據庫已優化- [ ] Redis 已配置密碼保護- [ ] AWS S3 已配置並測試- [ ] 域名已指向服務器- [ ] SSL 證書已安裝- [ ] 社交登入已配置並測試- [ ] 郵件服務已配置並測試- [ ] Sentry 監控已設置- [ ] 備份策略已實施- [ ] 日誌輪替已配置- [ ] 防火牆規則已設置## 🔧 測試配置### 連接測試命令```bash# 測試數據庫連接python manage.py dbshell# 測試 Redis 連接python manage.py shell -c "from django.core.cache import cache; cache.set('test', 'ok'); print(cache.get('test'))"# 測試郵件發送python manage.py sendtestemail your-email@example.com# 測試文件上傳python manage.py collectstatic --noinput# 測試 Celerypython manage.py shell -c "from your_app.tasks import test_task; test_task.delay()"```## 📞 獲取幫助如果在配置過程中遇到問題：1. **檢查日誌**：查看 Django 和系統日誌2. **測試連接**：使用上述測試命令3. **查看文檔**：參考各服務的官方文檔4. **聯繫支援**：創建 GitHub Issue 或聯繫開發團隊---**注意**：請妥善保管所有密鑰和敏感信息，不要將其提交到版本控制系統中。*最後更新：2024年1月*d.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**獲取步驟**:
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新項目或選擇現有項目
3. 啟用 Google+ API
4. 創建 OAuth2 憑證
5. 設置授權重定向 URI: `http://localhost:8000/accounts/google/login/callback/`

#### GitHub OAuth2 設置
```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

**獲取步驟**:
1. 前往 [GitHub Developer Settings](https://github.com/settings/developers)
2. 點擊 "New OAuth App"
3. 填寫應用資訊
4. 設置 Authorization callback URL: `http://localhost:8000/accounts/github/login/callback/`
5. 獲取 Client ID 和 Client Secret

### 5. 郵件服務設置 📧

#### SMTP 設置（Gmail 範例）
```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@engineerhub.com
```

**Gmail 設置步驟**:
1. 啟用兩步驟驗證
2. 生成應用專用密碼
3. 使用應用密碼而非帳戶密碼

#### SendGrid 設置（推薦用於生產環境）
```bash
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your-sendgrid-api-key
```

**獲取步驟**:
1. 註冊 [SendGrid](https://sendgrid.com/)
2. 驗證發送者身份
3. 創建 API Key
4. 記錄 API Key

#### Mailgun 設置
```bash
EMAIL_SERVICE=mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_SENDER_DOMAIN=your-domain.com
```

### 6. 文件存儲設置 💾

#### 本地存儲（開發環境）
```bash
USE_S3=False
```

#### AWS S3 設置（生產環境推薦）
```bash
USE_S3=True
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_STORAGE_BUCKET_NAME=your-s3-bucket-name
AWS_S3_REGION_NAME=us-east-1
```

**獲取步驟**:
1. 創建 AWS 帳戶
2. 創建 S3 存儲桶
3. 創建 IAM 用戶
4. 附加 S3 權限策略
5. 獲取 Access Key 和 Secret Key

### 7. 搜索引擎設置 🔍

#### Elasticsearch 設置
```bash
ELASTICSEARCH_URL=localhost:9200
```

**配置步驟**:
1. 安裝 Elasticsearch
2. 啟動 Elasticsearch 服務
3. 測試連接

### 8. 監控與日誌設置 📊

#### Sentry 設置（錯誤監控）
```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

**獲取步驟**:
1. 註冊 [Sentry](https://sentry.io/)
2. 創建新項目
3. 選擇 Django 平台
4. 獲取 DSN

### 9. 安全設置 🛡️

#### HTTPS 設置（生產環境）
```bash
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
```

#### CORS 設置
```bash
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 10. 域名設置 🌐

#### 允許的主機
```bash
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

## 📁 環境變數文件範例

### .env.development
```bash
# 開發環境設置
DEBUG=True
SECRET_KEY=your-development-secret-key

# 數據庫
DB_NAME=engineerhub_dev
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0

# 社交登入
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# 郵件
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# 其他
USE_SQLITE=False
USE_S3=False
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### .env.production
```bash
# 生產環境設置
DEBUG=False
SECRET_KEY=your-super-strong-production-secret-key

# 數據庫
DB_NAME=engineerhub_prod
DB_USER=engineerhub_user
DB_PASSWORD=super-strong-database-password
DB_HOST=your-db-host.com
DB_PORT=5432

# Redis
REDIS_URL=redis://your-redis-host:6379/0

# 社交登入
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# 郵件
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your-sendgrid-api-key

# 文件存儲
USE_S3=True
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=engineerhub-media
AWS_S3_REGION_NAME=us-east-1

# 搜索
ELASTICSEARCH_URL=your-elasticsearch-url:9200

# 監控
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# 安全
SECURE_SSL_REDIRECT=True
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 🚀 快速設置指南

### 1. 複製環境變數文件
```bash
cp .env.example .env
```

### 2. 編輯環境變數
```bash
nano .env  # 或使用你喜歡的編輯器
```

### 3. 安裝依賴
```bash
pip install -r requirements.txt
```

### 4. 運行遷移
```bash
python manage.py migrate
```

### 5. 創建超級用戶
```bash
python manage.py createsuperuser
```

### 6. 收集靜態文件（生產環境）
```bash
python manage.py collectstatic
```

### 7. 啟動服務
```bash
# 開發環境
python manage.py runserver

# 生產環境
gunicorn engineerhub.wsgi:application
```

## ⚠️ 安全注意事項

1. **絕不要**將 `.env` 文件提交到版本控制系統
2. **定期更換**所有 API 金鑰和密碼
3. **使用強密碼**，包含大小寫字母、數字和特殊字符
4. **限制 API 金鑰權限**，只授予必要的權限
5. **監控 API 使用情況**，及時發現異常活動
6. **備份重要配置**，但不要存儲敏感信息

## 🔍 驗證配置

### 檢查數據庫連接
```bash
python manage.py dbshell
```

### 檢查 Redis 連接
```bash
python manage.py shell
>>> from django.core.cache import cache
>>> cache.set('test', 'value')
>>> cache.get('test')
```

### 檢查郵件設置
```bash
python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])
```

### 檢查社交登入
訪問：`http://localhost:8000/accounts/google/login/` 和 `http://localhost:8000/accounts/github/login/`

---

**📞 需要協助？**
如果在配置過程中遇到問題，請參考：
- Django 官方文檔
- 各服務提供商的文檔
- 專案的 GitHub Issues 頁面 