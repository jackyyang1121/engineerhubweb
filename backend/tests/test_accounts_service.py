"""
用戶帳號服務測試
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from core.services import ServiceRegistry, BusinessLogicError, PermissionError as ServicePermissionError
from accounts.services import UserService, FollowService
from accounts.models import Follow, UserProfile
from tests.base import ServiceTestCase, FactoryMixin

User = get_user_model()


class UserServiceTest(ServiceTestCase, FactoryMixin):
    """用戶服務測試"""
    
    def register_services(self):
        """註冊測試所需的服務"""
        ServiceRegistry.register('user_service', UserService())
        ServiceRegistry.register('follow_service', FollowService())
    
    def setUp(self):
        """設置測試環境"""
        super().setUp()
        self.user_service = self.get_service('user_service')
        self.follow_service = self.get_service('follow_service')
    
    def test_create_user(self):
        """測試創建用戶"""
        user = self.user_service.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.assertIsInstance(user, User)
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('testpass123'))
        
        # 確認創建了用戶個人資料
        self.assertTrue(hasattr(user, 'profile'))
        self.assertIsInstance(user.profile, UserProfile)
    
    def test_create_duplicate_username(self):
        """測試創建重複用戶名"""
        # 創建第一個用戶
        self.user_service.create_user(
            username='testuser',
            email='test1@example.com',
            password='testpass123'
        )
        
        # 嘗試創建相同用戶名
        with self.assertRaises(BusinessLogicError) as cm:
            self.user_service.create_user(
                username='testuser',
                email='test2@example.com',
                password='testpass123'
            )
        
        self.assertEqual(str(cm.exception), '用戶名已被使用')
    
    def test_create_duplicate_email(self):
        """測試創建重複郵箱"""
        # 創建第一個用戶
        self.user_service.create_user(
            username='testuser1',
            email='test@example.com',
            password='testpass123'
        )
        
        # 嘗試創建相同郵箱
        with self.assertRaises(BusinessLogicError) as cm:
            self.user_service.create_user(
                username='testuser2',
                email='test@example.com',
                password='testpass123'
            )
        
        self.assertEqual(str(cm.exception), '電子郵件已被註冊')
    
    def test_authenticate_user_with_username(self):
        """測試使用用戶名認證"""
        # 創建用戶
        user = self.user_service.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # 認證
        authenticated = self.user_service.authenticate_user('testuser', 'testpass123')
        self.assertEqual(authenticated, user)
        
        # 錯誤密碼
        authenticated = self.user_service.authenticate_user('testuser', 'wrongpass')
        self.assertIsNone(authenticated)
    
    def test_authenticate_user_with_email(self):
        """測試使用郵箱認證"""
        # 創建用戶
        user = self.user_service.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # 使用郵箱認證
        authenticated = self.user_service.authenticate_user('test@example.com', 'testpass123')
        self.assertEqual(authenticated, user)
    
    def test_update_profile(self):
        """測試更新用戶個人資料"""
        user = self.create_user(username='testuser')
        
        # 更新個人資料
        updated_user = self.user_service.update_profile(
            user=user,
            first_name='Updated',
            last_name='Name',
            bio='Test bio',
            location='Taiwan'
        )
        
        self.assertEqual(updated_user.first_name, 'Updated')
        self.assertEqual(updated_user.last_name, 'Name')
        self.assertEqual(updated_user.profile.bio, 'Test bio')
        self.assertEqual(updated_user.profile.location, 'Taiwan')
    
    def test_search_users(self):
        """測試搜尋用戶"""
        # 創建測試用戶
        user1 = self.create_user(username='alice', first_name='Alice', last_name='Chen')
        user2 = self.create_user(username='bob', first_name='Bob', last_name='Wang')
        user3 = self.create_user(username='charlie', first_name='Charlie', last_name='Li')
        
        # 搜尋用戶名
        results = self.user_service.search_users('alice')
        self.assertIn(user1, results)
        self.assertNotIn(user2, results)
        
        # 搜尋姓名
        results = self.user_service.search_users('Wang')
        self.assertIn(user2, results)
        self.assertNotIn(user1, results)


class FollowServiceTest(ServiceTestCase, FactoryMixin):
    """關注服務測試"""
    
    def register_services(self):
        """註冊測試所需的服務"""
        ServiceRegistry.register('follow_service', FollowService())
    
    def setUp(self):
        """設置測試環境"""
        super().setUp()
        self.service = self.get_service('follow_service')
        
        # 創建測試用戶
        self.user1 = self.create_user(username='user1')
        self.user2 = self.create_user(username='user2')
        self.user3 = self.create_user(username='user3')
        
        # 確保用戶有 profile
        for user in [self.user1, self.user2, self.user3]:
            if not hasattr(user, 'profile'):
                UserProfile.objects.create(user=user)
    
    def test_follow_user(self):
        """測試關注用戶"""
        follow = self.service.follow_user(self.user1, self.user2)
        
        self.assertIsInstance(follow, Follow)
        self.assertEqual(follow.follower, self.user1)
        self.assertEqual(follow.following, self.user2)
        
        # 確認關注關係存在
        self.assertTrue(self.service.is_following(self.user1, self.user2))
    
    def test_follow_self(self):
        """測試關注自己"""
        with self.assertRaises(BusinessLogicError) as cm:
            self.service.follow_user(self.user1, self.user1)
        
        self.assertEqual(str(cm.exception), '不能關注自己')
    
    def test_follow_twice(self):
        """測試重複關注"""
        # 第一次關注
        self.service.follow_user(self.user1, self.user2)
        
        # 嘗試再次關注
        with self.assertRaises(BusinessLogicError) as cm:
            self.service.follow_user(self.user1, self.user2)
        
        self.assertEqual(str(cm.exception), '您已經關注了此用戶')
    
    def test_unfollow_user(self):
        """測試取消關注"""
        # 先關注
        self.service.follow_user(self.user1, self.user2)
        
        # 取消關注
        self.service.unfollow_user(self.user1, self.user2)
        
        # 確認關注關係不存在
        self.assertFalse(self.service.is_following(self.user1, self.user2))
    
    def test_unfollow_not_following(self):
        """測試取消未關注的用戶"""
        with self.assertRaises(BusinessLogicError) as cm:
            self.service.unfollow_user(self.user1, self.user2)
        
        self.assertEqual(str(cm.exception), '您未關注此用戶')
    
    def test_get_followers(self):
        """測試獲取關注者列表"""
        # user1 和 user3 關注 user2
        self.service.follow_user(self.user1, self.user2)
        self.service.follow_user(self.user3, self.user2)
        
        followers = self.service.get_followers(self.user2)
        self.assertEqual(len(followers), 2)
        self.assertIn(self.user1, followers)
        self.assertIn(self.user3, followers)
    
    def test_get_following(self):
        """測試獲取關注列表"""
        # user1 關注 user2 和 user3
        self.service.follow_user(self.user1, self.user2)
        self.service.follow_user(self.user1, self.user3)
        
        following = self.service.get_following(self.user1)
        self.assertEqual(len(following), 2)
        self.assertIn(self.user2, following)
        self.assertIn(self.user3, following)
    
    def test_get_mutual_follows(self):
        """測試獲取互相關注列表"""
        # user1 和 user2 互相關注
        self.service.follow_user(self.user1, self.user2)
        self.service.follow_user(self.user2, self.user1)
        
        # user1 關注 user3，但 user3 不關注 user1
        self.service.follow_user(self.user1, self.user3)
        
        mutual = self.service.get_mutual_follows(self.user1)
        self.assertEqual(len(mutual), 1)
        self.assertIn(self.user2, mutual)
        self.assertNotIn(self.user3, mutual)