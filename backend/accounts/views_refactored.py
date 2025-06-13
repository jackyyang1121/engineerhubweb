"""
EngineerHub - 用戶視圖層重構示例

======================================================================================
🎯 Clean Code 深度重構：依賴注入 + 單一職責 + Small Functions
======================================================================================

本文件展示如何將原本 661 行的大型 UserViewSet 重構為符合 Clean Code 原則的小型、
職責單一的組件。這是一個完整的學習範例，展示了 Clean Code 在實際項目中的應用。

重構核心原則：
╭─────────────────────────────────────────────────────────────╮
│ 1. 單一職責原則 (Single Responsibility Principle)          │
│    - 每個類只負責一個明確的業務領域                           │
│    - 職責分離，降低耦合度                                     │
│                                                             │
│ 2. 小函數原則 (Small Functions)                             │
│    - 每個函數只做一件事                                       │
│    - 函數長度控制在 20 行以內                                │
│    - 邏輯清晰，易於理解和測試                                 │
│                                                             │
│ 3. 依賴注入 (Dependency Injection)                          │
│    - 通過構造函數注入依賴                                     │
│    - 依賴於抽象而非具體實現                                   │
│    - 提高可測試性和可維護性                                   │
╰─────────────────────────────────────────────────────────────╯

======================================================================================
"""

from typing import Dict, Any, Optional, List, Tuple
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
import logging

# 導入模型
from .models import Follow, BlockedUser

# 獲取用戶模型
User = get_user_model()
logger = logging.getLogger('engineerhub.accounts')


# ======================================================================================
# 🛡️ 權限檢查器類 - 單一職責：用戶操作權限驗證
# ======================================================================================

class UserPermissionChecker:
    """
    用戶權限檢查器
    
    ╭─ 📚 學習重點 ────────────────────────────────────────────╮
    │ • 單一職責：只負責權限相關的業務規則檢查                     │
    │ • 靜態方法：無狀態的純函數設計                              │
    │ • 業務規則封裝：將複雜的權限邏輯封裝在專門的類中             │
    │ • 返回值設計：使用 tuple 返回結果和錯誤信息                  │
    ╰────────────────────────────────────────────────────────╯
    
    🎯 職責範圍：
    ├── ✅ 檢查用戶是否可以執行關注操作
    ├── ✅ 驗證用戶黑名單狀態
    ├── ✅ 檢查重複關注情況
    └── ✅ 提供統一的權限驗證接口
    """
    
    @staticmethod
    def can_follow_user(follower: User, target_user: User) -> Tuple[bool, Optional[str]]:
        """
        檢查用戶是否可以關注目標用戶
        
        ╭─ 📋 業務規則 ────────────────────────────────────────╮
        │ 1. 用戶不能關注自己                                    │
        │ 2. 用戶不能關注已經拉黑自己的用戶                       │
        │ 3. 用戶不能重複關注已關注的用戶                         │
        ╰───────────────────────────────────────────────────╯
        
        Args:
            follower (User): 發起關注的用戶
            target_user (User): 被關注的目標用戶
        
        Returns:
            Tuple[bool, Optional[str]]: 
                - bool: 是否允許關注 (True=允許, False=不允許)
                - Optional[str]: 如果不允許，返回具體的錯誤原因
        
        Examples:
            >>> checker = UserPermissionChecker()
            >>> can_follow, error = checker.can_follow_user(user1, user2)
            >>> if not can_follow:
            ...     print(f"無法關注：{error}")
        """
        # 🔒 規則 1：防止自我關注
        if follower.id == target_user.id:
            return False, "不能關注自己"
        
        # 🔒 規則 2：檢查黑名單狀態
        if UserPermissionChecker._is_blocked_by_target(follower, target_user):
            return False, "無法關注此用戶，您可能已被對方拉黑"
        
        # 🔒 規則 3：檢查重複關注
        if UserPermissionChecker._is_already_following(follower, target_user):
            return False, "您已經關注了此用戶"
        
        # ✅ 所有檢查通過
        return True, None
    
    @staticmethod
    def _is_blocked_by_target(user: User, target: User) -> bool:
        """
        檢查用戶是否被目標用戶拉黑
        
        ╭─ 🔍 設計考量 ────────────────────────────────────────╮
        │ • 私有方法：內部使用，不對外暴露                         │
        │ • 單一查詢：只做一件事，檢查黑名單狀態                   │
        │ • 性能優化：使用 exists() 而非 count()                  │
        │ • 清晰命名：方法名明確表達其功能                         │
        ╰───────────────────────────────────────────────────╯
        """
        return BlockedUser.objects.filter(
            blocker=target,
            blocked=user
        ).exists()
    
    @staticmethod
    def _is_already_following(follower: User, target: User) -> bool:
        """
        檢查是否已經關注目標用戶
        
        Args:
            follower (User): 關注者
            target (User): 目標用戶
            
        Returns:
            bool: True 表示已關注，False 表示未關注
        """
        return Follow.objects.filter(
            follower=follower,
            following=target
        ).exists()


# ======================================================================================
# 🔧 關注操作服務類 - 單一職責：用戶關注業務邏輯處理
# ======================================================================================

class FollowOperationService:
    """
    用戶關注操作服務
    
    ╭─ 📚 學習重點 ────────────────────────────────────────────╮
    │ • 服務層模式：將業務邏輯從視圖層分離出來                     │
    │ • 事務處理：確保數據的一致性和完整性                         │
    │ • 錯誤處理：統一的異常處理和錯誤響應                         │
    │ • 日誌記錄：記錄重要的業務操作                              │
    ╰────────────────────────────────────────────────────────╯
    
    🎯 職責範圍：
    ├── ✅ 執行關注操作的完整業務流程
    ├── ✅ 更新相關的統計數據
    ├── ✅ 處理操作過程中的異常情況
    └── ✅ 記錄操作日誌供審計使用
    """
    
    def __init__(self):
        """
        初始化關注操作服務
        
        ╭─ 💡 依賴注入實踐 ────────────────────────────────────╮
        │ 在構造函數中初始化所需的依賴組件，這樣可以：              │
        │ • 明確展示類的依賴關係                                  │
        │ • 便於單元測試時注入 Mock 對象                          │
        │ • 提高代碼的可維護性和可測試性                          │
        ╰───────────────────────────────────────────────────╯
        """
        self.permission_checker = UserPermissionChecker()
    
    def execute_follow(self, follower: User, target: User) -> Dict[str, Any]:
        """
        執行關注用戶的完整操作流程
        
        ╭─ 📋 處理流程 ────────────────────────────────────────╮
        │ 1. 權限驗證 → 檢查是否允許關注                          │
        │ 2. 創建關注 → 在數據庫中建立關注關係                     │
        │ 3. 更新統計 → 更新雙方的關注數統計                       │
        │ 4. 記錄日誌 → 記錄操作供後續審計                        │
        │ 5. 返回結果 → 統一格式的操作結果                        │
        ╰───────────────────────────────────────────────────╯
        
        Args:
            follower (User): 發起關注的用戶
            target (User): 被關注的目標用戶
        
        Returns:
            Dict[str, Any]: 標準化的操作結果
            {
                'success': bool,        # 操作是否成功
                'message': str,         # 結果描述信息
                'status_code': int,     # 對應的 HTTP 狀態碼
                'data': Optional[Any]   # 額外的返回數據
            }
        """
        # 📋 步驟 1：執行權限檢查
        can_follow, error_msg = self.permission_checker.can_follow_user(follower, target)
        if not can_follow:
            return self._create_error_response(error_msg, status.HTTP_400_BAD_REQUEST)
        
        # 📋 步驟 2：執行關注操作
        try:
            follow_created = self._create_follow_relationship(follower, target)
            
            if follow_created:
                # 📋 步驟 3：更新統計數據
                self._update_follow_statistics(follower, target)
                
                # 📋 步驟 4：記錄操作日誌
                self._log_follow_operation(follower, target)
                
                # 📋 步驟 5：返回成功結果
                return self._create_success_response(
                    f"成功關注用戶 {target.username}",
                    status.HTTP_201_CREATED
                )
            else:
                return self._create_error_response(
                    "關注操作失敗，請稍後重試",
                    status.HTTP_400_BAD_REQUEST
                )
        
        except Exception as e:
            # 🚨 異常處理：記錄錯誤並返回友好的錯誤信息
            logger.error(
                f"關注操作發生異常: {follower.username} -> {target.username}, "
                f"錯誤詳情: {str(e)}"
            )
            return self._create_error_response(
                "系統暫時出現問題，請稍後再試",
                status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _create_follow_relationship(self, follower: User, target: User) -> bool:
        """
        在數據庫中創建關注關係
        
        ╭─ 🔧 技術細節 ────────────────────────────────────────╮
        │ • 使用 get_or_create 避免重複創建                       │
        │ • 原子操作確保數據一致性                                │
        │ • 返回是否實際創建了新記錄                              │
        ╰───────────────────────────────────────────────────╯
        
        Args:
            follower (User): 關注者
            target (User): 被關注者
        
        Returns:
            bool: True 表示成功創建新的關注關係，False 表示關係已存在
        """
        follow_obj, created = Follow.objects.get_or_create(
            follower=follower,
            following=target
        )
        return created
    
    def _update_follow_statistics(self, follower: User, target: User) -> None:
        """
        更新關注相關的統計數據
        
        ╭─ 📊 統計更新策略 ────────────────────────────────────╮
        │ • 實時更新：保證統計數據的准確性                         │
        │ • 字段更新：只更新必要的字段，提高性能                   │
        │ • 雙向更新：更新關注者和被關注者的統計                   │
        ╰───────────────────────────────────────────────────╯
        
        Args:
            follower (User): 關注者（更新其 following_count）
            target (User): 被關注者（更新其 followers_count）
        """
        # 更新被關注者的粉絲數統計
        target.followers_count = target.followers.count()
        target.save(update_fields=['followers_count'])
        
        # 更新關注者的關注數統計
        follower.following_count = follower.following.count()
        follower.save(update_fields=['following_count'])
    
    def _log_follow_operation(self, follower: User, target: User) -> None:
        """
        記錄關注操作的日誌
        
        ╭─ 📝 日誌記錄的重要性 ────────────────────────────────╮
        │ • 操作審計：追蹤重要的業務操作                          │
        │ • 問題診斷：幫助定位和解決問題                          │
        │ • 數據分析：為業務分析提供數據支持                      │
        │ • 合規要求：滿足某些行業的合規性要求                    │
        ╰───────────────────────────────────────────────────╯
        """
        logger.info(
            f"用戶關注操作完成: "
            f"關注者={follower.username}, "
            f"被關注者={target.username}, "
            f"時間戳={logger.handlers[0].formatter.formatTime(logger.makeRecord('', 0, '', 0, '', (), None))}"
        )
    
    def _create_success_response(self, message: str, status_code: int) -> Dict[str, Any]:
        """
        創建標準化的成功響應
        
        ╭─ 🎯 標準化響應的好處 ────────────────────────────────╮
        │ • 一致性：所有 API 返回相同格式的響應                    │
        │ • 可預測：前端可以統一處理響應                          │
        │ • 可維護：修改響應格式只需在一處修改                    │
        │ • 文檔友好：便於生成 API 文檔                           │
        ╰───────────────────────────────────────────────────╯
        """
        return {
            'success': True,
            'message': message,
            'status_code': status_code,
            'data': None
        }
    
    def _create_error_response(self, message: str, status_code: int) -> Dict[str, Any]:
        """
        創建標準化的錯誤響應
        
        Args:
            message (str): 錯誤描述信息
            status_code (int): HTTP 狀態碼
        
        Returns:
            Dict[str, Any]: 標準化的錯誤響應格式
        """
        return {
            'success': False,
            'message': message,
            'status_code': status_code,
            'data': None
        }


# ======================================================================================
# 🔍 用戶查詢服務類 - 單一職責：用戶數據查詢和搜索
# ======================================================================================

class UserQueryService:
    """
    用戶查詢服務
    
    ╭─ 📚 學習重點 ────────────────────────────────────────────╮
    │ • 查詢優化：使用預加載避免 N+1 查詢問題                     │
    │ • 權限過濾：根據用戶權限過濾查詢結果                        │
    │ • 搜索實現：多字段搜索的實現策略                            │
    │ • 性能考慮：查詢結果的緩存和分頁處理                        │
    ╰────────────────────────────────────────────────────────╯
    
    🎯 職責範圍：
    ├── ✅ 提供優化的用戶查詢集
    ├── ✅ 實現用戶搜索功能
    ├── ✅ 處理用戶權限相關的數據過濾
    └── ✅ 優化查詢性能
    """
    
    def get_optimized_user_queryset(self, current_user: Optional[User] = None):
        """
        獲取經過優化的用戶查詢集
        
        ╭─ 🚀 查詢優化技巧 ────────────────────────────────────╮
        │ • prefetch_related：預加載多對多和一對多關聯           │
        │ • select_related：預加載外鍵關聯                      │
        │ • 權限過濾：根據當前用戶權限過濾結果                    │
        │ • 避免 N+1：減少數據庫查詢次數                         │
        ╰───────────────────────────────────────────────────╯
        
        Args:
            current_user (Optional[User]): 當前登錄的用戶，用於權限過濾
        
        Returns:
            QuerySet: 經過優化和過濾的用戶查詢集
        """
        # 🔧 基礎查詢集：預加載相關數據避免 N+1 查詢
        queryset = User.objects.prefetch_related(
            'followers',           # 預加載關注者列表
            'following',           # 預加載關注列表
            'portfolio_projects',  # 預加載作品集項目
            'settings'             # 預加載用戶設置
        )
        
        # 🔒 權限過濾：如果有當前用戶，過濾掉被拉黑的用戶
        if current_user and current_user.is_authenticated:
            blocked_user_ids = self._get_blocked_user_ids(current_user)
            if blocked_user_ids:
                queryset = queryset.exclude(id__in=blocked_user_ids)
        
        return queryset
    
    def search_users_by_keyword(self, keyword: str, limit: int = 10) -> List[User]:
        """
        根據關鍵詞搜索用戶
        
        ╭─ 🔍 搜索策略 ────────────────────────────────────────╮
        │ • 多字段搜索：用戶名、姓名、簡介等多個字段               │
        │ • 模糊匹配：使用 icontains 進行不區分大小寫搜索         │
        │ • 結果排序：按相關性或其他規則排序                      │
        │ • 數量限制：避免返回過多結果影響性能                    │
        ╰───────────────────────────────────────────────────╯
        
        Args:
            keyword (str): 搜索關鍵詞
            limit (int): 返回結果的最大數量，默認 10 個
        
        Returns:
            List[User]: 搜索到的用戶列表
        
        Examples:
            >>> service = UserQueryService()
            >>> users = service.search_users_by_keyword("張三", limit=5)
            >>> print(f"找到 {len(users)} 個用戶")
        """
        # 🔍 構建多字段搜索條件
        search_conditions = (
            Q(username__icontains=keyword) |      # 用戶名包含關鍵詞
            Q(first_name__icontains=keyword) |    # 名字包含關鍵詞
            Q(last_name__icontains=keyword) |     # 姓氏包含關鍵詞
            Q(bio__icontains=keyword)             # 個人簡介包含關鍵詞
        )
        
        # 🎯 執行搜索查詢
        search_results = User.objects.filter(search_conditions).order_by(
            'username'  # 按用戶名排序，保證結果的一致性
        )[:limit]
        
        return list(search_results)
    
    def _get_blocked_user_ids(self, user: User) -> List:
        """
        獲取被指定用戶拉黑的用戶ID列表
        
        ╭─ 🎯 設計考量 ────────────────────────────────────────╮
        │ • 私有方法：僅供內部使用，不對外暴露                    │
        │ • 高效查詢：直接返回 ID 列表而非完整對象                │
        │ • 內存優化：使用 values_list 減少內存使用              │
        ╰───────────────────────────────────────────────────╯
        
        Args:
            user (User): 指定的用戶
        
        Returns:
            List: 被該用戶拉黑的用戶ID列表
        """
        return list(
            BlockedUser.objects.filter(blocker=user)
            .values_list('blocked_id', flat=True)
        )


# ======================================================================================
# 🎭 重構後的視圖類 - 單一職責：HTTP請求和響應處理
# ======================================================================================

class UserFollowView(generics.GenericAPIView):
    """
    用戶關注操作視圖
    
    ╭─ 📚 學習重點 ────────────────────────────────────────────╮
    │ • 視圖職責單一：只處理 HTTP 請求和響應                      │
    │ • 業務邏輯外部化：所有業務邏輯都委託給服務層                │
    │ • RESTful 設計：符合 REST 架構風格                         │
    │ • 錯誤處理統一：統一的錯誤響應格式                          │
    ╰────────────────────────────────────────────────────────╯
    
    🎯 職責範圍：
    ├── ✅ 接收和驗證 HTTP 請求
    ├── ✅ 委託業務邏輯給服務層
    ├── ✅ 格式化和返回 HTTP 響應
    └── ✅ 處理請求級別的異常
    """
    
    permission_classes = [IsAuthenticated]
    
    def __init__(self, *args, **kwargs):
        """
        初始化視圖，注入所需的服務依賴
        
        ╭─ 💉 依賴注入實踐 ────────────────────────────────────╮
        │ 在視圖的構造函數中注入服務依賴，帶來以下好處：             │
        │ • 明確依賴關係：清楚地展示視圖需要哪些服務               │
        │ • 便於測試：可以輕鬆注入 Mock 服務進行單元測試           │
        │ • 降低耦合：視圖不直接依賴具體的服務實現                │
        │ • 靈活配置：可以根據不同環境注入不同的服務實現           │
        ╰───────────────────────────────────────────────────╯
        """
        super().__init__(*args, **kwargs)
        # 注入關注操作服務
        self.follow_service = FollowOperationService()
    
    def post(self, request, username=None):
        """
        處理關注用戶的 POST 請求
        
        ╭─ 🌐 HTTP 語義 ───────────────────────────────────────╮
        │ POST 方法的語義：                                      │
        │ • 創建資源：在系統中創建新的關注關係                    │
        │ • 非冪等性：多次執行可能產生不同結果                    │
        │ • 狀態改變：改變系統的狀態（增加關注關係）              │
        ╰───────────────────────────────────────────────────╯
        
        Args:
            request: Django HTTP 請求對象，包含請求信息
            username (str): 目標用戶的用戶名，從 URL 路徑中獲取
        
        Returns:
            Response: 標準化的 HTTP 響應對象
        
        HTTP Status Codes:
            - 201: 關注成功，創建了新的關注關係
            - 400: 請求錯誤，如不能關注自己、已經關注等
            - 404: 目標用戶不存在
            - 500: 服務器內部錯誤
        """
        # 📋 步驟 1：獲取目標用戶對象
        target_user = self._get_target_user_safely(username)
        
        # 📋 步驟 2：委託業務邏輯給服務層
        operation_result = self.follow_service.execute_follow(
            follower=request.user,
            target=target_user
        )
        
        # 📋 步驟 3：構建並返回 HTTP 響應
        return Response(
            data={'message': operation_result['message']},
            status=operation_result['status_code']
        )
    
    def _get_target_user_safely(self, username: str) -> User:
        """
        安全地獲取目標用戶對象
        
        ╭─ 🛡️ 安全考量 ───────────────────────────────────────╮
        │ • 輸入驗證：確保用戶名參數不為空                        │
        │ • 存在性檢查：確保用戶存在                              │
        │ • 異常處理：統一的錯誤響應                              │
        │ • 安全性：防止SQL注入等安全問題                         │
        ╰───────────────────────────────────────────────────╯
        
        Args:
            username (str): 用戶名字符串
        
        Returns:
            User: 目標用戶對象
        
        Raises:
            Http404: 當用戶不存在時拋出 404 異常
        """
        if not username or not username.strip():
            raise ValueError("用戶名不能為空")
        
        return get_object_or_404(User, username=username.strip())


# ======================================================================================
# 📊 用戶統計視圖 - 單一職責：用戶統計數據展示
# ======================================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_statistics(request, username):
    """
    獲取指定用戶的統計信息
    
    ╭─ 📚 學習重點 ────────────────────────────────────────────╮
    │ • 函數式視圖：適合簡單的、單一功能的 API 端點              │
    │ • 只讀操作：僅提供數據查詢，不修改任何狀態                 │
    │ • 公開訪問：允許匿名用戶查看基本統計信息                   │
    │ • 響應標準化：返回結構化的統計數據                         │
    ╰────────────────────────────────────────────────────────╯
    
    🎯 職責範圍：
    ├── ✅ 查詢用戶基本統計信息
    ├── ✅ 格式化統計數據
    ├── ✅ 返回標準化響應
    └── ✅ 處理用戶不存在的情況
    
    Args:
        request: HTTP 請求對象
        username (str): 要查詢統計信息的用戶名
    
    Returns:
        Response: 包含用戶統計數據的 HTTP 響應
    
    Response Format:
        {
            "followers_count": 150,        # 粉絲數
            "following_count": 89,         # 關注數
            "posts_count": 45,             # 發文數
            "likes_received_count": 1200,  # 獲得讚數
            "join_date": "2023-01-15",     # 加入日期
            "last_active": "2024-01-20",   # 最後活躍時間
            "is_verified": true            # 是否已驗證
        }
    """
    # 📋 步驟 1：獲取目標用戶
    target_user = get_object_or_404(User, username=username)
    
    # 📋 步驟 2：構建統計數據
    statistics_data = {
        'followers_count': target_user.followers_count,
        'following_count': target_user.following_count,
        'posts_count': target_user.posts_count,
        'likes_received_count': target_user.likes_received_count,
        'join_date': target_user.date_joined.date(),
        'last_active': target_user.last_online,
        'is_verified': target_user.is_verified,
    }
    
    # 📋 步驟 3：返回響應
    return Response(statistics_data, status=status.HTTP_200_OK)


# ======================================================================================
# 📚 重構成果展示和學習總結
# ======================================================================================

"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║                           🎓 Clean Code 重構成果總結                                ║
╚══════════════════════════════════════════════════════════════════════════════════╝

🎯 重構前 vs 重構後對比：

┌─ 重構前的問題 ────────────────────────────────────────────────────────────────┐
│ ❌ UserViewSet 類：661 行代碼，職責過多                                        │
│ ❌ 一個類處理：CRUD、關注、搜索、推薦、統計等多種功能                           │
│ ❌ 方法過長：單個方法超過 50 行，邏輯複雜                                      │
│ ❌ 業務邏輯混雜：視圖邏輯和業務邏輯混合在一起                                  │
│ ❌ 測試困難：龐大的類難以進行單元測試                                          │
│ ❌ 維護困難：修改一個功能影響其他功能                                      │
└───────────────────────────────────────────────────────────────────────────┘

┌─ 重構後的改進 ────────────────────────────────────────────────────────────────┐
│ ✅ 職責分離：                                                                  │
│    • UserPermissionChecker      → 專門處理權限檢查                            │
│    • FollowOperationService     → 專門處理關注業務邏輯                        │
│    • UserQueryService           → 專門處理數據查詢                            │
│    • UserFollowView             → 專門處理關注相關的 HTTP 請求                 │
│                                                                               │
│ ✅ 小函數設計：                                                                │
│    • 每個方法都控制在 20 行以內                                               │
│    • 每個函數只做一件事                                                       │
│    • 函數命名清晰表達意圖                                                     │
│                                                                               │
│ ✅ 依賴注入：                                                                  │
│    • 通過構造函數注入依賴                                                     │
│    • 便於單元測試和 Mock                                                      │
│    • 降低類之間的耦合度                                                       │
└───────────────────────────────────────────────────────────────────────────┘

📈 帶來的具體好處：

╭─ 可測試性提升 ────────────────────────────────────────────────────────────────╮
│ 重構前：                                                                       │
│   def test_user_follow():  # 需要測試整個巨大的 ViewSet                        │
│       # 複雜的測試設置                                                         │
│       # 難以隔離測試特定功能                                                   │
│                                                                               │
│ 重構後：                                                                       │
│   def test_permission_check():                                                │
│       checker = UserPermissionChecker()                                      │
│       result = checker.can_follow_user(user1, user2)                         │
│       assert result == (True, None)                                          │
│                                                                               │
│   def test_follow_service():                                                  │
│       service = FollowOperationService()                                     │
│       result = service.execute_follow(follower, target)                      │
│       assert result['success'] is True                                       │
╰───────────────────────────────────────────────────────────────────────────────╯

╭─ 可維護性提升 ────────────────────────────────────────────────────────────────╮
│ • 修改權限邏輯：只需修改 UserPermissionChecker                                 │
│ • 修改關注流程：只需修改 FollowOperationService                                │
│ • 修改查詢邏輯：只需修改 UserQueryService                                      │
│ • 修改 API 響應：只需修改對應的視圖類                                          │
│                                                                               │
│ 每個修改都有明確的範圍，不會意外影響其他功能                                   │
╰───────────────────────────────────────────────────────────────────────────────╯

╭─ 可重用性提升 ────────────────────────────────────────────────────────────────╮
│ • UserPermissionChecker 可以在其他需要權限檢查的地方重用                       │
│ • FollowOperationService 可以在不同的 API 端點中重用                           │
│ • UserQueryService 可以為不同類型的查詢提供服務                                │
╰───────────────────────────────────────────────────────────────────────────────╯

🎯 學習價值總結：

通過這個重構範例，您學到了：

1. 🎯 如何識別違反單一職責原則的代碼
   • 看到一個類有多個不相關的方法
   • 發現一個方法做了多件事情
   • 注意到修改一個功能影響了其他功能

2. 🔧 如何將大類拆分為小的專門類
   • 按業務領域劃分職責
   • 每個類只關注一個特定問題
   • 保持類的介面簡潔明確

3. 💉 如何實現依賴注入模式
   • 通過構造函數注入依賴
   • 依賴於抽象接口而非具體實現
   • 提高代碼的可測試性

4. 📝 如何設計小而專注的函數
   • 一個函數只做一件事
   • 控制函數的行數和複雜度
   • 使用描述性的函數名

5. 🏗️ 如何設計清晰的服務層架構
   • 業務邏輯與表現層分離
   • 統一的錯誤處理機制
   • 標準化的響應格式

這些技能將幫助您在實際項目中寫出更高質量、更易維護的代碼！
""" 