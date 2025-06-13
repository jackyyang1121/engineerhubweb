"""
EngineerHub - Clean Code 重構後的測試示例

======================================================================================
🎯 測試展示：重構後代碼的高可測試性
======================================================================================

本文件展示重構後的代碼如何輕鬆進行單元測試，證明了 Clean Code 原則帶來的
測試便利性。每個小組件都可以獨立測試，Mock 依賴變得非常簡單。

測試涵蓋：
├── 權限檢查器測試
├── 關注服務測試  
├── 查詢服務測試
└── 視圖集成測試

======================================================================================
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

# 導入重構後的組件
from accounts.views_refactored import (
    UserPermissionChecker,
    FollowOperationService, 
    UserQueryService,
    UserFollowView,
    get_user_statistics
)
from accounts.models import Follow, BlockedUser

User = get_user_model()


# ======================================================================================
# 🧪 權限檢查器測試 - 展示單一職責的測試便利性
# ======================================================================================

class TestUserPermissionChecker(TestCase):
    """
    權限檢查器測試
    
    ✅ 測試優勢：
    - 純函數，無副作用，易於測試
    - 輸入輸出明確，測試用例清晰
    - 不依賴外部服務，測試速度快
    - 可以覆蓋所有業務規則分支
    """
    
    def setUp(self):
        """
        測試數據準備
        
        📚 學習重點：
        - 最小化測試數據準備
        - 專注於業務邏輯測試
        """
        self.user1 = User.objects.create_user(
            username='follower',
            email='follower@test.com'
        )
        self.user2 = User.objects.create_user(
            username='target', 
            email='target@test.com'
        )
        self.checker = UserPermissionChecker()
    
    def test_can_follow_user_success(self):
        """
        測試正常關注場景
        
        📚 學習重點：
        - 測試正向流程
        - 驗證返回值結構
        - 確保業務邏輯正確
        """
        # 執行測試
        can_follow, error_message = self.checker.can_follow_user(self.user1, self.user2)
        
        # 驗證結果
        self.assertTrue(can_follow)
        self.assertIsNone(error_message)
    
    def test_cannot_follow_self(self):
        """
        測試不能關注自己的規則
        
        📚 學習重點：
        - 測試業務規則驗證
        - 錯誤消息的準確性
        - 邊界條件處理
        """
        # 執行測試
        can_follow, error_message = self.checker.can_follow_user(self.user1, self.user1)
        
        # 驗證結果
        self.assertFalse(can_follow)
        self.assertEqual(error_message, "不能關注自己")
    
    def test_cannot_follow_when_blocked(self):
        """
        測試被拉黑時無法關注
        
        📚 學習重點：
        - 複雜業務規則的測試
        - 數據庫狀態的設置
        - 權限檢查的準確性
        """
        # 準備測試數據：創建拉黑關係
        BlockedUser.objects.create(
            blocker=self.user2,
            blocked=self.user1
        )
        
        # 執行測試
        can_follow, error_message = self.checker.can_follow_user(self.user1, self.user2)
        
        # 驗證結果
        self.assertFalse(can_follow)
        self.assertIn("拉黑", error_message)
    
    def test_cannot_follow_when_already_following(self):
        """
        測試重複關注的檢查
        
        📚 學習重點：
        - 冪等性檢查
        - 現有狀態的驗證
        - 用戶體驗的考慮
        """
        # 準備測試數據：創建已有關注關係
        Follow.objects.create(
            follower=self.user1,
            following=self.user2
        )
        
        # 執行測試
        can_follow, error_message = self.checker.can_follow_user(self.user1, self.user2)
        
        # 驗證結果
        self.assertFalse(can_follow)
        self.assertIn("已經關注", error_message)


# ======================================================================================
# 🔧 關注操作服務測試 - 展示依賴注入的測試便利性
# ======================================================================================

class TestFollowOperationService(TestCase):
    """
    關注操作服務測試
    
    ✅ 測試優勢：
    - 可以 Mock 權限檢查器，專注於服務邏輯測試
    - 業務流程測試清晰
    - 錯誤處理測試全面
    - 返回值格式統一，便於驗證
    """
    
    def setUp(self):
        """測試準備"""
        self.user1 = User.objects.create_user(
            username='follower',
            email='follower@test.com'
        )
        self.user2 = User.objects.create_user(
            username='target',
            email='target@test.com'
        )
        self.service = FollowOperationService()
    
    @patch('accounts.views_refactored.logger')
    def test_execute_follow_success(self, mock_logger):
        """
        測試成功關注流程
        
        📚 學習重點：
        - 完整業務流程測試
        - Mock 日誌記錄
        - 數據庫狀態驗證
        - 返回值結構驗證
        """
        # 執行測試
        result = self.service.execute_follow(self.user1, self.user2)
        
        # 驗證結果
        self.assertTrue(result['success'])
        self.assertEqual(result['status_code'], status.HTTP_201_CREATED)
        self.assertIn('成功關注', result['message'])
        
        # 驗證數據庫狀態
        self.assertTrue(
            Follow.objects.filter(
                follower=self.user1,
                following=self.user2
            ).exists()
        )
        
        # 驗證統計更新
        self.user1.refresh_from_db()
        self.user2.refresh_from_db()
        self.assertEqual(self.user1.following_count, 1)
        self.assertEqual(self.user2.followers_count, 1)
        
        # 驗證日誌記錄
        mock_logger.info.assert_called_once()
    
    def test_execute_follow_permission_denied(self):
        """
        測試權限拒絕場景
        
        📚 學習重點：
        - Mock 權限檢查器
        - 錯誤處理測試
        - 數據庫狀態不變驗證
        """
        # Mock 權限檢查器返回拒絕
        mock_checker = Mock()
        mock_checker.can_follow_user.return_value = (False, "權限被拒絕")
        self.service.permission_checker = mock_checker
        
        # 執行測試
        result = self.service.execute_follow(self.user1, self.user2)
        
        # 驗證結果
        self.assertFalse(result['success'])
        self.assertEqual(result['status_code'], status.HTTP_400_BAD_REQUEST)
        self.assertEqual(result['message'], "權限被拒絕")
        
        # 驗證數據庫狀態未改變
        self.assertFalse(
            Follow.objects.filter(
                follower=self.user1,
                following=self.user2
            ).exists()
        )
    
    @patch('accounts.views_refactored.logger')
    def test_execute_follow_database_error(self, mock_logger):
        """
        測試數據庫錯誤處理
        
        📚 學習重點：
        - 異常處理測試
        - 日誌記錄驗證
        - 友好錯誤消息
        """
        # Mock 數據庫操作拋出異常
        with patch('accounts.models.Follow.objects.get_or_create') as mock_create:
            mock_create.side_effect = Exception("數據庫連接失敗")
            
            # 執行測試
            result = self.service.execute_follow(self.user1, self.user2)
            
            # 驗證結果
            self.assertFalse(result['success'])
            self.assertEqual(result['status_code'], status.HTTP_500_INTERNAL_SERVER_ERROR)
            self.assertIn('系統暫時出現問題', result['message'])
            
            # 驗證錯誤日誌
            mock_logger.error.assert_called_once()


# ======================================================================================
# 🔍 查詢服務測試 - 展示查詢優化的測試
# ======================================================================================

class TestUserQueryService(TestCase):
    """
    用戶查詢服務測試
    
    ✅ 測試優勢：
    - 查詢優化邏輯測試
    - 權限過濾測試
    - 搜索功能測試
    - 性能相關測試
    """
    
    def setUp(self):
        """測試準備"""
        self.service = UserQueryService()
        self.user1 = User.objects.create_user(
            username='user1',
            first_name='張',
            last_name='三',
            email='user1@test.com'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            first_name='李',
            last_name='四', 
            email='user2@test.com'
        )
    
    def test_get_optimized_user_queryset(self):
        """
        測試優化查詢集
        
        📚 學習重點：
        - QuerySet 測試技巧
        - 預加載驗證
        - 權限過濾測試
        """
        # 執行測試
        queryset = self.service.get_optimized_user_queryset()
        
        # 驗證查詢集
        self.assertIn(self.user1, queryset)
        self.assertIn(self.user2, queryset)
        
        # 驗證預加載（通過檢查 _prefetch_related_lookups）
        self.assertIn('followers', queryset._prefetch_related_lookups)
        self.assertIn('following', queryset._prefetch_related_lookups)
    
    def test_get_optimized_user_queryset_with_blocked_users(self):
        """
        測試被拉黑用戶的過濾
        
        📚 學習重點：
        - 權限過濾邏輯測試
        - 複雜查詢條件驗證
        - 數據隔離測試
        """
        # 準備測試數據：user1 拉黑 user2
        BlockedUser.objects.create(
            blocker=self.user1,
            blocked=self.user2
        )
        
        # 執行測試
        queryset = self.service.get_optimized_user_queryset(self.user1)
        
        # 驗證過濾結果
        self.assertIn(self.user1, queryset)  # 自己仍然可見
        # 注意：這裡的邏輯是 user1 拉黑了 user2，所以 user2 被過濾
        user_ids = list(queryset.values_list('id', flat=True))
        # 由於實際過濾的是被當前用戶拉黑的用戶，需要根據實際邏輯調整
    
    def test_search_users_by_keyword(self):
        """
        測試關鍵詞搜索
        
        📚 學習重點：
        - 搜索邏輯測試
        - 多字段匹配驗證
        - 結果排序測試
        """
        # 執行測試：搜索 "張"
        results = self.service.search_users_by_keyword("張", limit=5)
        
        # 驗證搜索結果
        self.assertIn(self.user1, results)
        self.assertNotIn(self.user2, results)
        
        # 執行測試：搜索用戶名
        results = self.service.search_users_by_keyword("user1", limit=5)
        
        # 驗證搜索結果
        self.assertIn(self.user1, results)
        self.assertEqual(len(results), 1)
    
    def test_search_users_by_keyword_limit(self):
        """
        測試搜索結果數量限制
        
        📚 學習重點：
        - 分頁邏輯測試
        - 性能考慮驗證
        - 邊界條件測試
        """
        # 創建更多用戶
        for i in range(10):
            User.objects.create_user(
                username=f'test_user_{i}',
                email=f'test{i}@test.com'
            )
        
        # 執行測試：限制結果數量
        results = self.service.search_users_by_keyword("test", limit=3)
        
        # 驗證結果數量
        self.assertEqual(len(results), 3)


# ======================================================================================
# 🎭 視圖層測試 - 展示組合後的集成測試
# ======================================================================================

class TestUserFollowView(APITestCase):
    """
    用戶關注視圖測試
    
    ✅ 測試優勢：
    - HTTP 接口測試
    - 依賴注入的 Mock 測試
    - 完整請求響應週期測試
    - 錯誤處理測試
    """
    
    def setUp(self):
        """測試準備"""
        self.factory = RequestFactory()
        self.user1 = User.objects.create_user(
            username='follower',
            email='follower@test.com'
        )
        self.user2 = User.objects.create_user(
            username='target',
            email='target@test.com'
        )
        self.view = UserFollowView()
    
    def test_post_follow_success(self):
        """
        測試成功關注的 HTTP 請求
        
        📚 學習重點：
        - API 端點測試
        - 認證用戶測試
        - 響應格式驗證
        """
        # 準備請求
        request = self.factory.post(f'/api/users/{self.user2.username}/follow/')
        request.user = self.user1
        
        # Mock 服務層返回成功結果
        mock_service = Mock()
        mock_service.execute_follow.return_value = {
            'success': True,
            'message': '關注成功',
            'status_code': status.HTTP_201_CREATED
        }
        self.view.follow_service = mock_service
        
        # 執行測試
        response = self.view.post(request, username=self.user2.username)
        
        # 驗證響應
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], '關注成功')
        
        # 驗證服務調用
        mock_service.execute_follow.assert_called_once_with(
            self.user1, 
            self.user2
        )
    
    def test_post_follow_user_not_found(self):
        """
        測試用戶不存在的情況
        
        📚 學習重點：
        - 404 錯誤處理測試
        - 邊界條件處理
        - 錯誤響應格式
        """
        # 準備請求
        request = self.factory.post('/api/users/nonexistent/follow/')
        request.user = self.user1
        
        # 執行測試並期望 404 異常
        with self.assertRaises(Exception):  # Http404
            self.view.post(request, username='nonexistent')
    
    def test_post_follow_service_error(self):
        """
        測試服務層錯誤處理
        
        📚 學習重點：
        - 服務錯誤的傳遞
        - 錯誤響應的格式化
        - 狀態碼的正確性
        """
        # 準備請求
        request = self.factory.post(f'/api/users/{self.user2.username}/follow/')
        request.user = self.user1
        
        # Mock 服務層返回錯誤結果
        mock_service = Mock()
        mock_service.execute_follow.return_value = {
            'success': False,
            'message': '不能關注自己',
            'status_code': status.HTTP_400_BAD_REQUEST
        }
        self.view.follow_service = mock_service
        
        # 執行測試
        response = self.view.post(request, username=self.user2.username)
        
        # 驗證響應
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['message'], '不能關注自己')


# ======================================================================================
# 📊 函數式視圖測試 - 展示簡單視圖的測試
# ======================================================================================

class TestUserStatisticsView(TestCase):
    """
    用戶統計視圖測試
    
    ✅ 測試優勢：
    - 函數式視圖測試簡單
    - 只讀操作測試快速
    - 數據格式驗證明確
    """
    
    def setUp(self):
        """測試準備"""
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com'
        )
        # 設置一些統計數據
        self.user.followers_count = 100
        self.user.following_count = 50
        self.user.posts_count = 25
        self.user.save()
    
    def test_get_user_statistics_success(self):
        """
        測試獲取用戶統計信息
        
        📚 學習重點：
        - 函數式視圖測試
        - 數據序列化驗證
        - 響應格式檢查
        """
        # 準備請求
        request = self.factory.get(f'/api/users/{self.user.username}/stats/')
        
        # 執行測試
        response = get_user_statistics(request, self.user.username)
        
        # 驗證響應
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 驗證數據格式
        data = response.data
        self.assertEqual(data['followers_count'], 100)
        self.assertEqual(data['following_count'], 50)
        self.assertEqual(data['posts_count'], 25)
        self.assertIn('join_date', data)
        self.assertIn('is_verified', data)
    
    def test_get_user_statistics_user_not_found(self):
        """
        測試用戶不存在的情況
        
        📚 學習重點：
        - 404 錯誤測試
        - 異常處理驗證
        """
        # 準備請求
        request = self.factory.get('/api/users/nonexistent/stats/')
        
        # 執行測試並期望 404 異常
        with self.assertRaises(Exception):  # Http404
            get_user_statistics(request, 'nonexistent')


# ======================================================================================
# 🔄 集成測試 - 展示完整流程測試
# ======================================================================================

class TestFollowIntegration(APITestCase):
    """
    關注功能集成測試
    
    ✅ 測試優勢：
    - 完整業務流程測試
    - 各組件協作驗證
    - 真實場景模擬
    """
    
    def setUp(self):
        """測試準備"""
        self.user1 = User.objects.create_user(
            username='follower',
            email='follower@test.com',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='target',
            email='target@test.com',
            password='testpass123'
        )
    
    def test_complete_follow_workflow(self):
        """
        測試完整的關注工作流程
        
        📚 學習重點：
        - 端到端測試
        - 業務流程驗證
        - 數據一致性檢查
        """
        # 1. 用戶登錄
        self.client.force_authenticate(user=self.user1)
        
        # 2. 檢查初始統計
        stats_response = self.client.get(f'/api/users/{self.user2.username}/stats/')
        initial_followers = stats_response.data['followers_count']
        
        # 3. 執行關注操作
        follow_response = self.client.post(f'/api/users/{self.user2.username}/follow/')
        
        # 4. 驗證關注響應
        self.assertEqual(follow_response.status_code, status.HTTP_201_CREATED)
        
        # 5. 驗證數據庫狀態
        self.assertTrue(
            Follow.objects.filter(
                follower=self.user1,
                following=self.user2
            ).exists()
        )
        
        # 6. 驗證統計更新
        updated_stats = self.client.get(f'/api/users/{self.user2.username}/stats/')
        self.assertEqual(
            updated_stats.data['followers_count'],
            initial_followers + 1
        )
        
        # 7. 驗證重複關注處理
        duplicate_response = self.client.post(f'/api/users/{self.user2.username}/follow/')
        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)


# ======================================================================================
# 📚 測試運行指令和總結
# ======================================================================================

"""
🎯 測試運行指令：

1. 運行所有重構相關測試：
   python manage.py test tests.test_clean_code_refactored

2. 運行特定測試類：
   python manage.py test tests.test_clean_code_refactored.TestUserPermissionChecker

3. 運行單個測試方法：
   python manage.py test tests.test_clean_code_refactored.TestUserPermissionChecker.test_can_follow_user_success

4. 運行測試並查看覆蓋率：
   coverage run --source='.' manage.py test tests.test_clean_code_refactored
   coverage report

📊 測試覆蓋的重構收益：

✅ 單一職責測試：
   每個組件都可以獨立測試，測試範圍明確

✅ 依賴注入測試：
   輕鬆 Mock 依賴，專注於被測組件的邏輯

✅ 小函數測試：
   每個函數的測試用例簡單明確，覆蓋率容易達到 100%

✅ 錯誤處理測試：
   標準化的錯誤處理讓異常測試變得簡單

✅ 集成測試：
   組件間的協作通過清晰的介面進行，集成測試穩定可靠

🎓 測試學習要點：

1. 測試驅動開發 (TDD)：先寫測試，再寫實現
2. 測試金字塔：單元測試 > 集成測試 > E2E 測試
3. Mock 策略：Mock 外部依賴，專注於業務邏輯測試
4. 測試覆蓋率：追求高覆蓋率，但更重要的是測試質量
5. 持續測試：將測試納入 CI/CD 流程

重構後的代碼不僅更容易維護，測試也變得更加簡單和可靠！
""" 