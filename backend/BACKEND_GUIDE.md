# 🔧 後端專案導覽 - Django REST API

> **企業級後端開發學習指南**

## 📖 後端概述

本後端專案採用 Django 4.2 + Django REST Framework 架構，實現了現代化的 RESTful API 服務。專案遵循 Django 的 MVT (Model-View-Template) 設計模式，提供完整的企業級後端開發學習範例。

## 🏗️ 目錄結構詳解

```
backend/
├── 📁 engineerhub/                  # Django 主項目配置
│   ├── __init__.py                  # Python 包標識
│   ├── settings.py                  # Django 設置
│   ├── urls.py                      # URL 路由配置
│   ├── wsgi.py                      # WSGI 部署配置
│   └── asgi.py                      # ASGI 異步配置
├── 📁 accounts/                     # 用戶認證模組
│   ├── models.py                    # 用戶模型
│   ├── serializers.py               # 數據序列化器
│   ├── views.py                     # 視圖函數
│   ├── urls.py                      # 模組路由
│   └── permissions.py               # 權限控制
├── 📁 users/                        # 用戶資料模組
│   ├── models.py                    # 用戶資料模型
│   ├── serializers.py               # 資料序列化器
│   ├── views.py                     # 用戶相關視圖
│   └── urls.py                      # 用戶路由
├── 📁 profiles/                     # 用戶檔案模組
│   ├── models.py                    # 檔案模型
│   ├── serializers.py               # 檔案序列化器
│   ├── views.py                     # 檔案視圖
│   └── urls.py                      # 檔案路由
├── 📁 posts/                        # 貼文系統模組
│   ├── models.py                    # 貼文模型
│   ├── serializers.py               # 貼文序列化器
│   ├── views.py                     # 貼文視圖
│   ├── urls.py                      # 貼文路由
│   └── filters.py                   # 搜索過濾器
├── 📁 comments/                     # 留言系統模組
│   ├── models.py                    # 留言模型
│   ├── serializers.py               # 留言序列化器
│   ├── views.py                     # 留言視圖
│   └── urls.py                      # 留言路由
├── 📁 notifications/                # 通知系統模組
│   ├── models.py                    # 通知模型
│   ├── serializers.py               # 通知序列化器
│   ├── views.py                     # 通知視圖
│   ├── urls.py                      # 通知路由
│   └── consumers.py                 # WebSocket 消費者
├── 📁 chat/                         # 聊天系統模組
│   ├── models.py                    # 聊天模型
│   ├── serializers.py               # 聊天序列化器
│   ├── views.py                     # 聊天視圖
│   ├── urls.py                      # 聊天路由
│   └── consumers.py                 # 聊天 WebSocket
├── 📁 core/                         # 核心功能模組
│   ├── models.py                    # 基礎模型
│   ├── serializers.py               # 基礎序列化器
│   ├── permissions.py               # 權限類
│   ├── pagination.py                # 分頁配置
│   ├── exceptions.py                # 異常處理
│   └── utils.py                     # 工具函數
├── 📋 requirements.txt              # Python 依賴
├── 🐳 Dockerfile                    # Docker 配置
├── 🔧 manage.py                     # Django 管理腳本
└── 📖 BACKEND_GUIDE.md             # 本導覽文件
```

## 🛠️ 技術棧深度解析

### 🎯 核心框架

#### Django 4.2
- **功能**：Web 框架核心
- **特色**：ORM、Admin 界面、中間件系統
- **學習重點**：模型設計、視圖編寫、URL 配置

#### Django REST Framework (DRF)
- **功能**：RESTful API 開發
- **特色**：序列化器、視圖集、權限系統
- **學習重點**：API 設計、序列化、權限控制

### 🗄️ 數據庫系統

#### PostgreSQL
- **功能**：主數據庫
- **優勢**：ACID 兼容、擴展性強
- **用途**：用戶數據、貼文內容、關係數據

#### Redis
- **功能**：緩存和會話存儲
- **優勢**：高性能、持久化
- **用途**：緩存、會話、任務隊列

### 🔐 認證與安全

#### JWT (JSON Web Token)
- **功能**：無狀態認證
- **優勢**：跨域支持、可擴展
- **實現**：djangorestframework-simplejwt

#### Django AllAuth
- **功能**：第三方登入
- **支持**：Google、GitHub、Facebook
- **特色**：社交認證、郵件驗證

### 🔍 搜索與分析

#### Elasticsearch
- **功能**：全文搜索引擎
- **優勢**：快速搜索、分析功能
- **用途**：內容搜索、用戶搜索、數據分析

#### Pygments
- **功能**：程式碼語法高亮
- **支持**：多種編程語言
- **特色**：自動語言檢測

### ⚡ 異步處理

#### Celery
- **功能**：分布式任務隊列
- **用途**：郵件發送、圖片處理、數據分析
- **優勢**：可擴展、容錯機制

#### Django Channels
- **功能**：WebSocket 支持
- **用途**：即時聊天、實時通知
- **特色**：異步處理、事件驅動

## 🎯 核心模組設計

### 👤 用戶系統 (accounts/users/profiles)

#### 模型設計
```python
# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """擴展用戶模型"""
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

# profiles/models.py
class Profile(models.Model):
    """用戶資料模型"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    website = models.URLField(blank=True)
    location = models.CharField(max_length=100, blank=True)
    skills = models.ManyToManyField('Skill', blank=True)
    followers = models.ManyToManyField(User, related_name='following', blank=True)
    reputation_score = models.IntegerField(default=0)
```

#### 序列化器設計
```python
# profiles/serializers.py
from rest_framework import serializers
from .models import Profile

class ProfileSerializer(serializers.ModelSerializer):
    """用戶資料序列化器"""
    user = serializers.StringRelatedField(read_only=True)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    
    class Meta:
        model = Profile
        fields = [
            'id', 'user', 'bio', 'avatar', 'website', 
            'location', 'skills', 'followers_count', 
            'following_count', 'is_following', 'reputation_score'
        ]
        read_only_fields = ['reputation_score']
    
    def get_followers_count(self, obj):
        return obj.followers.count()
    
    def get_following_count(self, obj):
        return obj.user.following.count()
    
    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.followers.filter(id=request.user.id).exists()
        return False
```

#### 視圖設計
```python
# profiles/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Profile
from .serializers import ProfileSerializer

class ProfileViewSet(viewsets.ModelViewSet):
    """用戶資料視圖集"""
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """根據權限過濾查詢集"""
        if self.action == 'list':
            return Profile.objects.select_related('user').prefetch_related('skills')
        return super().get_queryset()
    
    @action(detail=True, methods=['post'])
    def follow(self, request, pk=None):
        """關注用戶"""
        profile = self.get_object()
        user = request.user
        
        if profile.user == user:
            return Response(
                {'error': '不能關注自己'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if profile.followers.filter(id=user.id).exists():
            profile.followers.remove(user)
            is_following = False
        else:
            profile.followers.add(user)
            is_following = True
        
        return Response({
            'is_following': is_following,
            'followers_count': profile.followers.count()
        })
```

### 📝 貼文系統 (posts)

#### 模型設計
```python
# posts/models.py
class Post(models.Model):
    """貼文模型"""
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    images = models.JSONField(default=list, blank=True)
    code_blocks = models.JSONField(default=list, blank=True)
    tags = models.ManyToManyField('Tag', blank=True)
    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True)
    views_count = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['author', '-created_at']),
        ]

class CodeBlock(models.Model):
    """程式碼區塊模型"""
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='code_snippets')
    code = models.TextField()
    language = models.CharField(max_length=50, blank=True)
    filename = models.CharField(max_length=255, blank=True)
    line_numbers = models.BooleanField(default=True)
    
    def save(self, *args, **kwargs):
        """自動檢測程式語言"""
        if not self.language and self.code:
            from pygments.lexers import guess_lexer
            try:
                lexer = guess_lexer(self.code)
                self.language = lexer.aliases[0] if lexer.aliases else 'text'
            except:
                self.language = 'text'
        super().save(*args, **kwargs)
```

### 💬 聊天系統 (chat)

#### WebSocket 消費者
```python
# chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatRoom, Message

class ChatConsumer(AsyncWebsocketConsumer):
    """聊天 WebSocket 消費者"""
    
    async def connect(self):
        """建立連接"""
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        
        # 加入聊天室群組
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """斷開連接"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """接收消息"""
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        
        # 保存消息到數據庫
        await self.save_message(message)
        
        # 發送消息到群組
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'user': self.scope['user'].username,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    async def chat_message(self, event):
        """發送消息到 WebSocket"""
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'user': event['user'],
            'timestamp': event['timestamp']
        }))
    
    @database_sync_to_async
    def save_message(self, message):
        """保存消息到數據庫"""
        chat_room = ChatRoom.objects.get(id=self.room_id)
        Message.objects.create(
            room=chat_room,
            user=self.scope['user'],
            content=message
        )
```

## 🔐 權限系統設計

### 自定義權限類
```python
# core/permissions.py
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """只有擁有者可以修改"""
    
    def has_object_permission(self, request, view, obj):
        # 讀取權限對所有請求開放
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 寫入權限只給擁有者
        return obj.author == request.user

class IsProfileOwnerOrReadOnly(permissions.BasePermission):
    """資料擁有者權限"""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user

class IsVerifiedUser(permissions.BasePermission):
    """已驗證用戶權限"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_verified
        )
```

## 📡 API 設計模式

### RESTful API 設計
```python
# URL 設計範例
# posts/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, CommentViewSet

router = DefaultRouter()
router.register(r'posts', PostViewSet)
router.register(r'comments', CommentViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/posts/<int:post_id>/like/', PostViewSet.as_view({'post': 'like'})),
    path('api/posts/<int:post_id>/share/', PostViewSet.as_view({'post': 'share'})),
]
```

### 分頁配置
```python
# core/pagination.py
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class StandardResultsSetPagination(PageNumberPagination):
    """標準分頁配置"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response({
            'pagination': {
                'links': {
                    'next': self.get_next_link(),
                    'previous': self.get_previous_link()
                },
                'count': self.page.paginator.count,
                'current_page': self.page.number,
                'total_pages': self.page.paginator.num_pages,
                'page_size': self.page_size
            },
            'results': data
        })
```

## 🔍 搜索系統實現

### Elasticsearch 整合
```python
# posts/search.py
from elasticsearch_dsl import Document, Text, Keyword, Integer, Date
from elasticsearch_dsl.connections import connections

# 建立連接
connections.create_connection(hosts=['localhost:9200'])

class PostDocument(Document):
    """貼文搜索文檔"""
    author = Keyword()
    content = Text(analyzer='standard')
    tags = Keyword()
    created_at = Date()
    likes_count = Integer()
    
    class Index:
        name = 'posts'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0
        }

def search_posts(query, page=1, size=20):
    """搜索貼文"""
    search = PostDocument.search()
    
    if query:
        search = search.query(
            'multi_match',
            query=query,
            fields=['content^2', 'tags']
        )
    
    # 分頁
    start = (page - 1) * size
    search = search[start:start + size]
    
    # 高亮搜索結果
    search = search.highlight('content', fragment_size=150)
    
    return search.execute()
```

## 🧪 測試策略

### 單元測試
```python
# tests/test_posts.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from posts.models import Post

User = get_user_model()

class PostAPITestCase(TestCase):
    """貼文 API 測試"""
    
    def setUp(self):
        """測試設置"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_post(self):
        """測試創建貼文"""
        data = {
            'content': '這是一個測試貼文',
            'tags': ['python', 'django']
        }
        response = self.client.post('/api/posts/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Post.objects.count(), 1)
        self.assertEqual(Post.objects.first().content, data['content'])
    
    def test_list_posts(self):
        """測試獲取貼文列表"""
        Post.objects.create(author=self.user, content='測試貼文 1')
        Post.objects.create(author=self.user, content='測試貼文 2')
        
        response = self.client.get('/api/posts/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
```

### API 測試
```python
# tests/test_authentication.py
class AuthenticationTestCase(TestCase):
    """認證系統測試"""
    
    def test_user_registration(self):
        """測試用戶註冊"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password1': 'complexpass123',
            'password2': 'complexpass123'
        }
        response = self.client.post('/api/auth/registration/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email=data['email']).exists())
    
    def test_jwt_authentication(self):
        """測試 JWT 認證"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # 獲取 JWT token
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
```

## 🚀 部署配置

### Docker 配置
```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 安裝 Python 依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製專案文件
COPY . .

# 設置環境變量
ENV PYTHONPATH=/app
ENV DJANGO_SETTINGS_MODULE=engineerhub.settings

# 暴露端口
EXPOSE 8000

# 啟動命令
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "engineerhub.wsgi:application"]
```

### 生產環境設置
```python
# settings/production.py
from .base import *
import os

DEBUG = False
ALLOWED_HOSTS = ['your-domain.com', 'www.your-domain.com']

# 數據庫配置
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Redis 配置
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# 靜態文件配置
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# 媒體文件配置
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# 安全設置
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

## 🎓 學習建議

### 🎯 新手學習路徑

#### 第一階段：Django 基礎
1. **理解 MVT 架構**
   - 學習模型設計
   - 理解視圖概念
   - 掌握 URL 配置

2. **數據庫操作**
   - ORM 查詢語法
   - 模型關係設計
   - 數據遷移管理

#### 第二階段：REST API 開發
1. **DRF 核心概念**
   - 序列化器使用
   - 視圖集開發
   - 權限系統設計

2. **API 設計**
   - RESTful 設計原則
   - 錯誤處理機制
   - 分頁和過濾

#### 第三階段：進階功能
1. **實時功能**
   - WebSocket 實現
   - Channels 使用
   - 異步處理

2. **效能優化**
   - 查詢優化
   - 緩存策略
   - 索引設計

### 💡 實踐建議

#### 1. 從簡單開始
- 創建基本的 CRUD API
- 實現用戶認證
- 添加基本權限

#### 2. 逐步增加複雜度
- 實現搜索功能
- 添加實時通知
- 集成第三方服務

#### 3. 優化和測試
- 編寫單元測試
- 進行效能測試
- 實施安全檢查

## 🔧 開發工具

### 管理命令
```bash
# 創建遷移
python manage.py makemigrations

# 執行遷移
python manage.py migrate

# 創建超級用戶
python manage.py createsuperuser

# 運行開發服務器
python manage.py runserver

# 運行測試
python manage.py test

# 收集靜態文件
python manage.py collectstatic
```

### 調試工具
- **Django Debug Toolbar**：性能分析
- **Django Extensions**：額外管理命令
- **ipdb**：交互式調試器

## 🆘 常見問題

### Q: 數據庫連接失敗？
**A**: 檢查數據庫設置、確認服務運行、驗證連接參數。

### Q: CORS 錯誤？
**A**: 配置 `django-cors-headers`，添加前端域名到允許列表。

### Q: 靜態文件無法載入？
**A**: 檢查 `STATIC_URL` 和 `STATIC_ROOT` 設置，運行 `collectstatic`。

### Q: WebSocket 連接失敗？
**A**: 確認 Channels 配置、Redis 服務狀態、防火牆設置。

## 📚 延伸學習

### 📖 推薦資源
- [Django 官方文檔](https://docs.djangoproject.com/)
- [DRF 官方文檔](https://www.django-rest-framework.org/)
- [Channels 文檔](https://channels.readthedocs.io/)
- [Celery 文檔](https://docs.celeryproject.org/)

### 🎯 進階主題
- 微服務架構
- GraphQL API
- 容器化部署
- 監控和日誌

---

**🎉 掌握這些知識，你就能開發出強大的後端系統了！** 