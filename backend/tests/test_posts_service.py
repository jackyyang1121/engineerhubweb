"""
貼文服務測試
測試服務層的業務邏輯
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from core.services import ServiceRegistry, BusinessLogicError, PermissionError as ServicePermissionError
from posts.services import PostService, PostInteractionService
from posts.models import Post, Like, Save
from tests.base import ServiceTestCase, FactoryMixin

User = get_user_model()


class PostServiceTest(ServiceTestCase, FactoryMixin):
    """貼文服務測試"""
    
    def register_services(self):
        """註冊測試所需的服務"""
        # 手動註冊服務以便測試
        ServiceRegistry.register('post_service', PostService())
        ServiceRegistry.register('post_interaction_service', PostInteractionService())
    
    def setUp(self):
        """設置測試環境"""
        super().setUp()
        self.post_service = self.get_service('post_service')
        self.interaction_service = self.get_service('post_interaction_service')
        
        # 創建測試用戶
        self.user1 = self.create_user(username='user1')
        self.user2 = self.create_user(username='user2')
    
    def test_create_post(self):
        """測試創建貼文"""
        post = self.post_service.create_post(
            author=self.user1,
            content='Test post',
            code_snippet='print("test")',
            programming_language='python'
        )
        
        self.assertIsInstance(post, Post)
        self.assertEqual(post.author, self.user1)
        self.assertEqual(post.content, 'Test post')
        self.assertEqual(post.code_snippet, 'print("test")')
    
    def test_update_post_by_author(self):
        """測試作者更新自己的貼文"""
        post = self.create_post(author=self.user1)
        
        updated_post = self.post_service.update_post(
            post=post,
            user=self.user1,
            content='Updated content'
        )
        
        self.assertEqual(updated_post.content, 'Updated content')
    
    def test_update_post_by_non_author(self):
        """測試非作者嘗試更新貼文"""
        post = self.create_post(author=self.user1)
        
        with self.assertRaises(ServicePermissionError) as cm:
            self.post_service.update_post(
                post=post,
                user=self.user2,
                content='Should fail'
            )
        
        self.assertEqual(str(cm.exception), '您沒有權限編輯此貼文')
    
    def test_delete_post_by_author(self):
        """測試作者刪除自己的貼文"""
        post = self.create_post(author=self.user1)
        post_id = post.id
        
        self.post_service.delete_post(post=post, user=self.user1)
        
        # 確認貼文已被刪除
        self.assertFalse(Post.objects.filter(id=post_id).exists())
    
    def test_delete_post_by_non_author(self):
        """測試非作者嘗試刪除貼文"""
        post = self.create_post(author=self.user1)
        
        with self.assertRaises(ServicePermissionError) as cm:
            self.post_service.delete_post(post=post, user=self.user2)
        
        self.assertEqual(str(cm.exception), '您沒有權限刪除此貼文')
    
    def test_search_posts(self):
        """測試搜尋貼文"""
        # 創建測試數據
        post1 = self.create_post(author=self.user1, content='Python programming')
        post2 = self.create_post(author=self.user2, content='JavaScript tutorial')
        post3 = self.create_post(author=self.user1, code_snippet='def python_function():')
        
        # 搜尋包含 "Python" 的貼文
        results = self.post_service.search_posts('Python')
        
        self.assertEqual(results.count(), 2)
        self.assertIn(post1, results)
        self.assertIn(post3, results)
        self.assertNotIn(post2, results)
    
    def test_get_trending_posts(self):
        """測試獲取熱門貼文"""
        # 創建一些貼文
        old_post = self.create_post(author=self.user1)
        new_post = self.create_post(author=self.user2)
        
        # 手動設置創建時間（模擬舊貼文）
        from django.utils import timezone
        from datetime import timedelta
        old_post.created_at = timezone.now() - timedelta(days=2)
        old_post.save()
        
        # 獲取24小時內的熱門貼文
        trending = self.post_service.get_trending_posts(hours=24)
        
        self.assertIn(new_post, trending)
        self.assertNotIn(old_post, trending)


class PostInteractionServiceTest(ServiceTestCase, FactoryMixin):
    """貼文互動服務測試"""
    
    def register_services(self):
        """註冊測試所需的服務"""
        ServiceRegistry.register('post_interaction_service', PostInteractionService())
    
    def setUp(self):
        """設置測試環境"""
        super().setUp()
        self.service = self.get_service('post_interaction_service')
        
        # 創建測試數據
        self.user1 = self.create_user(username='user1')
        self.user2 = self.create_user(username='user2')
        self.post = self.create_post(author=self.user1)
    
    def test_like_post(self):
        """測試點讚貼文"""
        like = self.service.like_post(self.user2, self.post)
        
        self.assertIsInstance(like, Like)
        self.assertEqual(like.user, self.user2)
        self.assertEqual(like.post, self.post)
        
        # 確認點讚數增加
        self.post.refresh_from_db()
        self.assertEqual(self.post.likes_count, 1)
    
    def test_like_post_twice(self):
        """測試重複點讚"""
        # 第一次點讚
        self.service.like_post(self.user2, self.post)
        
        # 嘗試再次點讚
        with self.assertRaises(BusinessLogicError) as cm:
            self.service.like_post(self.user2, self.post)
        
        self.assertEqual(str(cm.exception), '您已經點讚過這篇貼文')
    
    def test_unlike_post(self):
        """測試取消點讚"""
        # 先點讚
        self.service.like_post(self.user2, self.post)
        
        # 取消點讚
        self.service.unlike_post(self.user2, self.post)
        
        # 確認點讚已被刪除
        self.assertFalse(Like.objects.filter(user=self.user2, post=self.post).exists())
        
        # 確認點讚數減少
        self.post.refresh_from_db()
        self.assertEqual(self.post.likes_count, 0)
    
    def test_unlike_without_like(self):
        """測試取消未點讚的貼文"""
        with self.assertRaises(BusinessLogicError) as cm:
            self.service.unlike_post(self.user2, self.post)
        
        self.assertEqual(str(cm.exception), '您未點讚過這篇貼文')
    
    def test_save_post(self):
        """測試收藏貼文"""
        save = self.service.save_post(self.user2, self.post)
        
        self.assertIsInstance(save, Save)
        self.assertEqual(save.user, self.user2)
        self.assertEqual(save.post, self.post)
    
    def test_share_post(self):
        """測試轉發貼文"""
        share = self.service.share_post(self.user2, self.post, 'Great post!')
        
        self.assertEqual(share.user, self.user2)
        self.assertEqual(share.post, self.post)
        self.assertEqual(share.comment, 'Great post!')
        
        # 確認轉發數增加
        self.post.refresh_from_db()
        self.assertEqual(self.post.shares_count, 1)
    
    def test_share_own_post(self):
        """測試轉發自己的貼文"""
        with self.assertRaises(BusinessLogicError) as cm:
            self.service.share_post(self.user1, self.post)
        
        self.assertEqual(str(cm.exception), '不能轉發自己的貼文')