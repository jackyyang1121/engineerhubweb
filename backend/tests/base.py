"""
測試基礎類
提供通用的測試設置和工具方法
"""

from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from typing import Dict, Any, Optional
import uuid

User = get_user_model()


class BaseTestCase(TestCase):
    """基礎測試類"""
    
    @classmethod
    def setUpTestData(cls):
        """設置測試數據（整個測試類只執行一次）"""
        super().setUpTestData()
        cls.setup_users()
    
    @classmethod
    def setup_users(cls):
        """創建測試用戶"""
        cls.user1 = User.objects.create_user(
            username='testuser1',
            email='test1@example.com',
            password='testpass123',
            display_name='Test User 1'
        )
        
        cls.user2 = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123',
            display_name='Test User 2'
        )
        
        cls.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )


class APIBaseTestCase(APITestCase):
    """API 測試基礎類"""
    
    @classmethod
    def setUpTestData(cls):
        """設置測試數據"""
        super().setUpTestData()
        cls.setup_users()
    
    @classmethod
    def setup_users(cls):
        """創建測試用戶"""
        cls.user1 = User.objects.create_user(
            username='apiuser1',
            email='api1@example.com',
            password='apipass123',
            display_name='API User 1'
        )
        
        cls.user2 = User.objects.create_user(
            username='apiuser2',
            email='api2@example.com',
            password='apipass123',
            display_name='API User 2'
        )
    
    def setUp(self):
        """每個測試方法前執行"""
        super().setUp()
        self.client = APIClient()
    
    def authenticate(self, user: User) -> str:
        """
        認證用戶並返回 token
        
        Args:
            user: 要認證的用戶
            
        Returns:
            str: JWT access token
        """
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        return access_token
    
    def logout(self):
        """登出當前用戶"""
        self.client.credentials()
    
    def create_post(self, user: User, **kwargs) -> Dict[str, Any]:
        """
        創建測試貼文
        
        Args:
            user: 貼文作者
            **kwargs: 其他貼文欄位
            
        Returns:
            Dict: 創建的貼文數據
        """
        from posts.models import Post
        
        defaults = {
            'content': 'Test post content',
            'code_snippet': 'print("Hello, World!")',
            'programming_language': 'python'
        }
        defaults.update(kwargs)
        
        post = Post.objects.create(author=user, **defaults)
        return {
            'id': str(post.id),
            'author': str(post.author.id),
            'content': post.content,
            'code_snippet': post.code_snippet,
            'programming_language': post.programming_language,
            'created_at': post.created_at.isoformat(),
            'updated_at': post.updated_at.isoformat()
        }
    
    def assert_status(self, response, expected_status: int, msg: Optional[str] = None):
        """
        斷言響應狀態碼
        
        Args:
            response: API 響應
            expected_status: 期望的狀態碼
            msg: 錯誤訊息
        """
        if msg is None:
            msg = f"Expected status {expected_status}, got {response.status_code}"
        
        self.assertEqual(response.status_code, expected_status, msg)
    
    def assert_success(self, response, msg: Optional[str] = None):
        """斷言請求成功（2xx）"""
        if msg is None:
            msg = f"Expected success status, got {response.status_code}"
        
        self.assertTrue(200 <= response.status_code < 300, msg)
    
    def assert_error_code(self, response, error_code: str):
        """斷言錯誤代碼"""
        self.assertIn('code', response.data)
        self.assertEqual(response.data['code'], error_code)


class ServiceTestCase(TestCase):
    """服務層測試基礎類"""
    
    def setUp(self):
        """設置測試環境"""
        super().setUp()
        # 清空服務註冊表，避免測試間的干擾
        from core.services import ServiceRegistry
        ServiceRegistry.clear()
        
        # 重新註冊服務
        self.register_services()
    
    def register_services(self):
        """註冊測試所需的服務"""
        # 子類應該覆寫這個方法來註冊需要的服務
        pass
    
    def get_service(self, service_name: str):
        """獲取服務實例"""
        from core.services import ServiceRegistry
        return ServiceRegistry.get(service_name)


class FactoryMixin:
    """工廠方法混入類"""
    
    @staticmethod
    def create_user(**kwargs) -> User:
        """創建用戶的工廠方法"""
        defaults = {
            'username': f'user_{uuid.uuid4().hex[:8]}',
            'email': f'{uuid.uuid4().hex[:8]}@example.com',
            'password': 'testpass123'
        }
        defaults.update(kwargs)
        
        return User.objects.create_user(**defaults)
    
    @staticmethod
    def create_post(author: User, **kwargs):
        """創建貼文的工廠方法"""
        from posts.models import Post
        
        defaults = {
            'content': 'Test post content',
            'code_snippet': 'console.log("test");',
            'programming_language': 'javascript'
        }
        defaults.update(kwargs)
        
        return Post.objects.create(author=author, **defaults)
    
    @staticmethod
    def create_comment(author: User, post, **kwargs):
        """創建評論的工廠方法"""
        from comments.models import Comment
        
        defaults = {
            'content': 'Test comment'
        }
        defaults.update(kwargs)
        
        return Comment.objects.create(
            author=author,
            post=post,
            **defaults
        )