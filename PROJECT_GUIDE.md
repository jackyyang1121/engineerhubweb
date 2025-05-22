# 🚀 EngineerHub 專案導覽

歡迎來到 EngineerHub 工程師社群平台！這是一個完整的企業級專案導覽，將幫助您快速理解專案架構、開發流程和最佳實踐。

## 📋 目錄

- [專案概述](#-專案概述)
- [技術架構](#-技術架構)
- [項目結構](#-項目結構)
- [開發環境設置](#-開發環境設置)
- [API 文檔](#-api-文檔)
- [資料庫設計](#-資料庫設計)
- [前端架構](#-前端架構)
- [後端架構](#-後端架構)
- [部署指南](#-部署指南)
- [開發規範](#-開發規範)
- [測試策略](#-測試策略)
- [性能優化](#-性能優化)
- [安全考量](#-安全考量)
- [故障排除](#-故障排除)

## 🎯 專案概述

### 專案理念
EngineerHub 是專為工程師打造的社群平台，提供：
- 技術討論與分享
- 程式碼片段展示（支援100多種語言高亮）
- 多媒體內容分享（圖片/影片）
- 即時聊天通訊
- 個人作品集展示
- 社交關注功能

### 核心特色
- 🎨 **簡約美觀的UI設計**
- 📱 **完全響應式設計**
- ⚡ **高性能與快速載入**
- 🔒 **企業級安全性**
- 🌐 **多語言支援**
- 🔍 **強大的搜索功能**

## 🏗️ 技術架構

### 整體架構圖
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (React)   │ ←→│  後端 (Django)   │ ←→ │ 資料庫 (PostgreSQL) │
│                 │    │                 │    │                 │
│ • TypeScript    │    │ • REST API      │    │ • Redis (緩存)   │
│ • Tailwind CSS  │    │ • WebSocket     │    │ • Elasticsearch │
│ • React Query   │    │ • Celery        │    │ • 文件存儲       │
│ • Zustand       │    │ • JWT 認證      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技術棧詳細

#### 前端技術
- **框架**: React 18 + TypeScript
- **構建工具**: Vite
- **樣式**: Tailwind CSS
- **狀態管理**: Zustand
- **數據獲取**: React Query (TanStack Query)
- **路由**: React Router
- **表單處理**: React Hook Form
- **程式碼高亮**: Prism.js
- **圖標**: Heroicons

#### 後端技術
- **框架**: Django 4.2 + Django REST Framework
- **資料庫**: PostgreSQL 15
- **緩存**: Redis
- **搜索**: Elasticsearch
- **任務隊列**: Celery
- **認證**: JWT + OAuth2 (Google, GitHub)
- **文件存儲**: AWS S3 (生產環境) / 本地存儲 (開發環境)
- **程式碼高亮**: Pygments
- **即時通訊**: Django Channels + WebSocket

#### 基礎設施
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **WSGI服務器**: Gunicorn
- **監控**: Sentry
- **日誌**: 結構化日誌 + ELK Stack
- **CI/CD**: GitHub Actions

## 📁 項目結構

```
engineerhubweb/
├── backend/                    # Django 後端
│   ├── engineerhub/           # Django 專案設置
│   │   ├── settings/          # 分環境設置
│   │   │   ├── base.py       # 基礎設置
│   │   │   ├── development.py # 開發環境
│   │   │   └── production.py  # 生產環境
│   │   ├── urls.py           # 主URL配置
│   │   ├── wsgi.py          # WSGI入口
│   │   └── asgi.py          # ASGI入口（WebSocket）
│   ├── accounts/             # 用戶模塊
│   │   ├── models.py        # 用戶模型
│   │   ├── serializers.py   # 序列化器
│   │   ├── views.py         # API視圖
│   │   └── urls.py          # URL路由
│   ├── posts/               # 貼文模塊
│   ├── comments/            # 評論模塊
│   ├── chats/              # 聊天模塊
│   ├── notifications/       # 通知模塊
│   ├── search/             # 搜索模塊
│   ├── core/               # 核心工具
│   │   ├── pagination.py   # 分頁設置
│   │   ├── permissions.py  # 權限類
│   │   ├── exceptions.py   # 異常處理
│   │   └── utils.py        # 工具函數
│   ├── requirements.txt     # Python依賴
│   └── manage.py           # Django管理腳本
├── frontend/               # React 前端
│   ├── src/
│   │   ├── components/     # 可復用組件
│   │   │   ├── common/    # 通用組件
│   │   │   ├── forms/     # 表單組件
│   │   │   ├── posts/     # 貼文組件
│   │   │   └── users/     # 用戶組件
│   │   ├── pages/         # 頁面組件
│   │   ├── hooks/         # 自定義Hooks
│   │   ├── store/         # Zustand狀態管理
│   │   ├── api/           # API調用
│   │   ├── types/         # TypeScript類型定義
│   │   ├── utils/         # 工具函數
│   │   └── styles/        # 樣式文件
│   ├── public/            # 靜態資源
│   ├── package.json       # Node.js依賴
│   └── vite.config.ts     # Vite配置
├── docs/                  # 文檔
├── docker/               # Docker配置
├── nginx/                # Nginx配置
└── scripts/              # 部署腳本
```

## 🛠️ 開發環境設置

### 先決條件
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 6+
- Git

### 快速開始

#### 1. 克隆專案
```bash
git clone https://github.com/your-org/engineerhubweb.git
cd engineerhubweb
```

#### 2. 後端設置
```bash
cd backend

# 創建虛擬環境
python -m venv venv

# 激活虛擬環境
# Windows
venv\Scripts\activate
# macOS/Linux  
source venv/bin/activate

# 安裝依賴
pip install -r requirements.txt

# 複製環境變數文件
cp .env.example .env
# 編輯 .env 文件配置必要參數

# 執行遷移
python manage.py migrate

# 創建超級用戶
python manage.py createsuperuser

# 啟動開發服務器
python manage.py runserver
```

#### 3. 前端設置
```bash
cd frontend

# 安裝依賴
npm install

# 啟動開發服務器
npm run dev
```

#### 4. 額外服務設置
```bash
# 啟動 Redis
redis-server

# 啟動 Celery Worker（新終端）
cd backend
celery -A engineerhub worker -l info

# 啟動 Celery Beat（新終端）
cd backend
celery -A engineerhub beat -l info
```

## 📚 API 文檔

### API 端點概覽

#### 認證相關
- `POST /auth/registration/` - 用戶註冊
- `POST /auth/login/` - 用戶登入
- `POST /auth/logout/` - 用戶登出
- `POST /auth/token/refresh/` - 刷新Token
- `POST /auth/google/` - Google OAuth登入
- `POST /auth/github/` - GitHub OAuth登入

#### 用戶管理
- `GET /users/me/` - 獲取當前用戶信息
- `PATCH /users/me/` - 更新用戶資料
- `POST /users/{id}/follow/` - 關注用戶
- `DELETE /users/{id}/follow/` - 取消關注

#### 貼文系統
- `GET /posts/` - 獲取貼文列表
- `POST /posts/` - 創建貼文
- `GET /posts/{id}/` - 獲取貼文詳情
- `PATCH /posts/{id}/` - 更新貼文
- `DELETE /posts/{id}/` - 刪除貼文
- `POST /posts/{id}/like/` - 點讚貼文

#### 評論系統
- `GET /posts/{id}/comments/` - 獲取貼文評論
- `POST /posts/comments/` - 創建評論
- `GET /comments/{id}/replies/` - 獲取評論回覆

### API 使用範例

#### 創建貼文
```javascript
const createPost = async (postData) => {
  const formData = new FormData();
  formData.append('content', postData.content);
  
  if (postData.code_snippet) {
    formData.append('code_snippet', postData.code_snippet);
  }
  
  if (postData.media) {
    postData.media.forEach((file, index) => {
      formData.append(`media[${index}]`, file);
    });
  }
  
  const response = await fetch('/api/posts/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData
  });
  
  return response.json();
};
```

## 🗄️ 資料庫設計

### 核心實體關係圖
```
用戶 (User)
├── 貼文 (Post) ────┐
├── 評論 (Comment) ─┤
├── 關注 (Follow) ──┤
├── 作品集 (Portfolio) ──┤
└── 設置 (UserSettings) ──┤
                         │
貼文 (Post)              │
├── 媒體 (PostMedia) ────┤
├── 點讚 (Like) ────────┤
├── 收藏 (Save) ────────┤
└── 舉報 (Report) ──────┘
```

### 關鍵模型說明

#### User 模型
```python
class User(AbstractUser):
    id = UUIDField(primary_key=True)  # 使用UUID作為主鍵
    email = EmailField(unique=True)   # 郵箱登入
    bio = TextField(max_length=500)   # 個人簡介
    avatar = ImageField()             # 頭像
    skill_tags = JSONField()          # 技能標籤
    is_online = BooleanField()        # 在線狀態
    # 統計數據（非規範化設計提升性能）
    followers_count = PositiveIntegerField()
    posts_count = PositiveIntegerField()
```

#### Post 模型
```python
class Post(models.Model):
    id = UUIDField(primary_key=True)
    author = ForeignKey(User)
    content = TextField()             # 文字內容
    code_snippet = TextField()       # 程式碼片段
    code_language = CharField()      # 程式語言（自動檢測）
    code_highlighted = TextField()   # 高亮HTML
    # 統計數據
    likes_count = PositiveIntegerField()
    comments_count = PositiveIntegerField()
    views_count = PositiveIntegerField()
```

### 索引策略
```sql
-- 用戶相關索引
CREATE INDEX idx_user_email ON accounts_user(email);
CREATE INDEX idx_user_username ON accounts_user(username);
CREATE INDEX idx_user_online ON accounts_user(is_online);

-- 貼文相關索引
CREATE INDEX idx_post_author_created ON posts_post(author_id, created_at DESC);
CREATE INDEX idx_post_created ON posts_post(created_at DESC);
CREATE INDEX idx_post_likes ON posts_post(likes_count DESC);

-- 關注關係索引
CREATE INDEX idx_follow_follower ON accounts_follow(follower_id, created_at);
CREATE INDEX idx_follow_following ON accounts_follow(following_id, created_at);
```

## 🎨 前端架構

### 組件架構
```
App
├── Layout
│   ├── Header
│   ├── Sidebar
│   └── Footer
├── Pages
│   ├── Home
│   ├── Profile
│   ├── Post
│   └── Settings
└── Components
    ├── Common (按鈕、輸入框、模態框等)
    ├── Forms (表單組件)
    ├── Posts (貼文相關組件)
    └── Users (用戶相關組件)
```

### 狀態管理策略

#### Zustand Store 結構
```typescript
// authStore.ts - 認證狀態
interface AuthState {
  user: UserData | null;
  isAuthenticated: boolean;
  login: (credentials: LoginData) => Promise<void>;
  logout: () => void;
}

// uiStore.ts - UI狀態
interface UIState {
  theme: 'light' | 'dark' | 'auto';
  sidebar: { isOpen: boolean };
  modal: { isOpen: boolean; content?: ReactNode };
}
```

#### React Query 使用
```typescript
// 貼文查詢
const usePosts = (page = 1) => {
  return useQuery({
    queryKey: ['posts', page],
    queryFn: () => postApi.getPosts(page),
    staleTime: 5 * 60 * 1000, // 5分鐘
  });
};

// 貼文突變
const useCreatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: postApi.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
    },
  });
};
```

### 路由設計
```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'profile/:username', element: <Profile /> },
      { path: 'post/:id', element: <PostDetail /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
    ],
  },
]);
```

## ⚙️ 後端架構

### Django 應用結構

#### 核心應用
- **accounts** - 用戶管理、認證、個人資料
- **posts** - 貼文系統、媒體處理、程式碼高亮
- **comments** - 評論系統、多層級回覆
- **chats** - 即時聊天、WebSocket處理
- **notifications** - 通知系統、推送服務
- **search** - 搜索功能、Elasticsearch集成
- **core** - 核心工具、通用組件

### API 設計原則

#### RESTful API 規範
```python
# 資源命名
GET    /api/posts/           # 獲取貼文列表
POST   /api/posts/           # 創建貼文
GET    /api/posts/{id}/      # 獲取單個貼文
PATCH  /api/posts/{id}/      # 部分更新貼文
DELETE /api/posts/{id}/      # 刪除貼文

# 嵌套資源
GET    /api/posts/{id}/comments/     # 獲取貼文的評論
POST   /api/posts/{id}/comments/     # 對貼文創建評論
```

#### 響應格式標準化
```python
# 成功響應
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}

# 錯誤響應
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "數據驗證失敗",
    "details": {
      "field_name": ["錯誤描述"]
    }
  }
}
```

### 中間件與權限

#### 自定義中間件
```python
class OnlineStatusMiddleware:
    """更新用戶在線狀態的中間件"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if request.user.is_authenticated:
            request.user.update_online_status()
        
        response = self.get_response(request)
        return response
```

#### 權限類
```python
class IsOwnerOrReadOnly(BasePermission):
    """只有作者可以編輯，其他人只能讀取"""
    
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.author == request.user
```

### WebSocket 處理

#### 聊天消費者
```python
class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        
        # 保存消息到資料庫
        await self.save_message(message)
        
        # 廣播消息
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
            }
        )
```

## 🚀 部署指南

### Docker 部署

#### docker-compose.yml
```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: engineerhub
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/engineerhub
      - REDIS_URL=redis://redis:6379

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf

volumes:
  postgres_data:
```

### 生產環境部署

#### 1. 服務器準備
```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安裝 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. 部署腳本
```bash
#!/bin/bash
# deploy.sh

set -e

echo "開始部署 EngineerHub..."

# 拉取最新代碼
git pull origin main

# 構建並啟動服務
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 執行資料庫遷移
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 收集靜態文件
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

echo "部署完成！"
```

#### 3. SSL 證書設置
```bash
# 安裝 Certbot
sudo apt install certbot python3-certbot-nginx

# 獲取證書
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 設置自動續期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 📝 開發規範

### 代碼風格

#### Python (後端)
```python
# 使用 Black 格式化
pip install black
black .

# 使用 isort 整理導入
pip install isort
isort .

# 使用 flake8 檢查
pip install flake8
flake8 .
```

#### TypeScript (前端)
```json
// .eslintrc.json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### Git 工作流

#### 分支策略
```
main (主分支)
├── develop (開發分支)
├── feature/user-authentication (功能分支)
├── feature/post-system (功能分支)
├── hotfix/critical-bug-fix (緊急修復)
└── release/v1.0.0 (發版分支)
```

#### 提交訊息規範
```
<type>(<scope>): <description>

[optional body]

[optional footer]

範例：
feat(auth): add Google OAuth integration
fix(posts): resolve code highlighting issue
docs(api): update authentication endpoints
```

### 代碼審查檢查清單

#### 功能檢查
- [ ] 功能是否按需求正確實現
- [ ] 邊界情況是否處理
- [ ] 錯誤處理是否完善
- [ ] 性能是否可接受

#### 代碼品質
- [ ] 命名是否清晰
- [ ] 代碼是否遵循 DRY 原則
- [ ] 是否有適當的註釋
- [ ] 是否遵循項目規範

#### 安全檢查
- [ ] 是否有SQL注入風險
- [ ] 輸入驗證是否充分
- [ ] 權限檢查是否正確
- [ ] 敏感數據是否保護

## 🧪 測試策略

### 後端測試

#### 單元測試
```python
# tests/test_models.py
class UserModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_user_creation(self):
        self.assertEqual(self.user.username, 'testuser')
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertTrue(self.user.check_password('testpass123'))
    
    def test_avatar_url_property(self):
        expected_url = f"https://ui-avatars.com/api/?name={self.user.username}&background=random&size=400"
        self.assertEqual(self.user.avatar_url, expected_url)
```

#### API 測試
```python
# tests/test_apis.py
class PostAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_post(self):
        data = {
            'content': 'Test post content',
            'code_snippet': 'print("Hello World")'
        }
        response = self.client.post('/api/posts/', data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['content'], 'Test post content')
```

### 前端測試

#### 組件測試
```typescript
// __tests__/PostCard.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PostCard from '../components/posts/PostCard';

const mockPost = {
  id: '1',
  author: 'testuser',
  content: 'Test post content',
  likes_count: 5,
  created_at: '2023-01-01T00:00:00Z'
};

describe('PostCard', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });
  
  it('renders post content correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PostCard post={mockPost} />
      </QueryClientProvider>
    );
    
    expect(screen.getByText('Test post content')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });
});
```

#### E2E 測試
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can login successfully', async ({ page }) => {
  await page.goto('/auth/login');
  
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});
```

### 測試執行

#### 後端測試
```bash
# 執行所有測試
python manage.py test

# 執行特定應用測試
python manage.py test accounts

# 生成覆蓋率報告
coverage run --source='.' manage.py test
coverage report
coverage html
```

#### 前端測試
```bash
# 執行單元測試
npm test

# 執行E2E測試
npm run test:e2e

# 生成覆蓋率報告
npm run test:coverage
```

## ⚡ 性能優化

### 後端優化

#### 資料庫優化
```python
# 使用 select_related 減少查詢次數
posts = Post.objects.select_related('author').all()

# 使用 prefetch_related 優化多對多查詢
users = User.objects.prefetch_related('posts', 'followers_set').all()

# 使用索引
class Post(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['author', '-created_at']),
            models.Index(fields=['-created_at']),
        ]
```

#### 緩存策略
```python
# Redis 緩存
from django.core.cache import cache

def get_trending_posts():
    cache_key = 'trending_posts'
    posts = cache.get(cache_key)
    
    if posts is None:
        posts = Post.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-likes_count')[:10]
        cache.set(cache_key, posts, timeout=300)  # 5分鐘
    
    return posts
```

#### 異步任務
```python
# Celery 任務
@shared_task
def send_notification_email(user_id, notification_type):
    user = User.objects.get(id=user_id)
    # 發送郵件邏輯
    send_email(user.email, notification_type)

# 在視圖中使用
def create_post(request):
    post = Post.objects.create(...)
    # 異步發送通知
    send_notification_email.delay(post.author.id, 'new_post')
    return Response(...)
```

### 前端優化

#### 代碼分割
```typescript
// 路由級別的代碼分割
const Home = lazy(() => import('../pages/Home'));
const Profile = lazy(() => import('../pages/Profile'));

const App = () => (
  <Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile/:username" element={<Profile />} />
    </Routes>
  </Suspense>
);
```

#### 圖片優化
```typescript
// 圖片懶加載
const LazyImage = ({ src, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef} {...props}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`transition-opacity ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};
```

#### React Query 優化
```typescript
// 預載入資料
const usePostsWithPrefetch = (page: number) => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['posts', page],
    queryFn: () => postApi.getPosts(page),
  });
  
  // 預載入下一頁
  useEffect(() => {
    if (query.data?.next) {
      queryClient.prefetchQuery({
        queryKey: ['posts', page + 1],
        queryFn: () => postApi.getPosts(page + 1),
      });
    }
  }, [query.data, page, queryClient]);
  
  return query;
};
```

## 🔒 安全考量

### 認證與授權

#### JWT 安全配置
```python
# settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}
```

#### 權限檢查
```python
class PostViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]
```

### 輸入驗證

#### 後端驗證
```python
class PostSerializer(serializers.ModelSerializer):
    content = serializers.CharField(
        max_length=5000,
        validators=[
            RegexValidator(
                regex=r'^[^<>]*$',
                message='內容不能包含HTML標籤'
            )
        ]
    )
    
    def validate_code_snippet(self, value):
        if value and len(value.split('\n')) > 100:
            raise serializers.ValidationError('程式碼不能超過100行')
        return value
```

#### 前端驗證
```typescript
const postSchema = z.object({
  content: z.string()
    .min(1, '內容不能為空')
    .max(5000, '內容不能超過5000字符')
    .refine(value => !/<[^>]*>/.test(value), '內容不能包含HTML標籤'),
  code_snippet: z.string()
    .optional()
    .refine(value => !value || value.split('\n').length <= 100, '程式碼不能超過100行')
});
```

### 文件上傳安全

#### 文件類型檢查
```python
def validate_image_file(file):
    # 檢查文件擴展名
    valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in valid_extensions:
        raise ValidationError('不支援的圖片格式')
    
    # 檢查 MIME 類型
    if not file.content_type.startswith('image/'):
        raise ValidationError('文件不是有效的圖片')
    
    # 檢查文件大小
    if file.size > 10 * 1024 * 1024:  # 10MB
        raise ValidationError('圖片大小不能超過10MB')
    
    return file
```

### CORS 與 CSRF 保護

#### CORS 設置
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'x-csrftoken',
]
```

## 🔧 故障排除

### 常見問題

#### 1. 資料庫連接問題
```bash
# 檢查 PostgreSQL 服務狀態
sudo systemctl status postgresql

# 檢查連接
psql -h localhost -U postgres -d engineerhub

# 檢查 Django 資料庫設置
python manage.py dbshell
```

#### 2. Redis 連接問題
```bash
# 檢查 Redis 服務
redis-cli ping

# 檢查 Django 緩存設置
python manage.py shell
>>> from django.core.cache import cache
>>> cache.set('test', 'value')
>>> cache.get('test')
```

#### 3. 前端編譯問題
```bash
# 清除 node_modules 和重新安裝
rm -rf node_modules package-lock.json
npm install

# 檢查 TypeScript 錯誤
npm run type-check

# 檢查 ESLint 錯誤
npm run lint
```

### 日誌分析

#### 後端日誌
```python
# 在 views.py 中添加日誌
import logging

logger = logging.getLogger('engineerhub.posts')

class PostViewSet(viewsets.ModelViewSet):
    def create(self, request):
        logger.info(f'用戶 {request.user.username} 嘗試創建貼文')
        try:
            # 創建貼文邏輯
            logger.info(f'貼文創建成功: {post.id}')
            return Response(...)
        except Exception as e:
            logger.error(f'貼文創建失敗: {str(e)}')
            raise
```

#### 前端錯誤追蹤
```typescript
// 全局錯誤處理
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error);
  // 發送到錯誤追蹤服務
  errorTracker.captureException(event.error);
});

// React Query 錯誤處理
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        console.error('Query Error:', error);
        toast.error('數據載入失敗，請重試');
      },
    },
  },
});
```

### 性能監控

#### 後端性能
```python
# 使用 Django Debug Toolbar 監控查詢
INSTALLED_APPS += ['debug_toolbar']

# 使用 django-silk 分析性能
INSTALLED_APPS += ['silk']

# 自定義中間件監控響應時間
class ResponseTimeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time
        
        response['X-Response-Time'] = str(duration)
        
        if duration > 1.0:  # 超過1秒記錄警告
            logger.warning(f'慢查詢: {request.path} - {duration:.2f}s')
        
        return response
```

#### 前端性能
```typescript
// 使用 Web Vitals 監控
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  console.log(metric);
  // 發送到分析服務
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

---

## 📞 支援與聯繫

如果您在開發過程中遇到問題，請參考：

1. **文檔**: 查看本導覽和相關技術文檔
2. **Issue 追蹤**: 在 GitHub 上創建 Issue
3. **團隊溝通**: 通過 Slack/Teams 聯繫開發團隊
4. **代碼審查**: 提交 Pull Request 獲得同事幫助

---

**祝您開發愉快！🚀**

*最後更新：2024年1月* 