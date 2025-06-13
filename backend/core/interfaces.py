"""
EngineerHub - 依賴注入接口定義

======================================================================================
🎯 設計目標：實現依賴注入架構，提升代碼可測試性和可維護性
======================================================================================

什麼是依賴注入？
- 依賴注入(Dependency Injection, DI)是一種設計模式
- 它將對象的創建和使用分離，由外部容器負責注入依賴
- 這樣可以降低類之間的耦合度，提升代碼的可測試性

為什麼需要依賴注入？
1. 可測試性：可以輕鬆注入 Mock 對象進行單元測試
2. 可配置性：可以在不修改代碼的情況下替換實現
3. 可維護性：降低類之間的直接依賴關係
4. 可擴展性：便於添加新的實現或裝飾器

設計原則：
- Interface Segregation：接口隔離，每個接口只包含相關的方法
- Dependency Inversion：依賴倒置，依賴於抽象而非具體實現
- Open/Closed：對擴展開放，對修改封閉

======================================================================================
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple, Union
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import UploadedFile

# 動態獲取用戶模型 - 支持自定義用戶模型
User = get_user_model()

# ======================================================================================
# 🔐 認證相關接口 (Authentication Interfaces)
# ======================================================================================

class IUserValidator(ABC):
    """
    用戶數據驗證器接口
    
    📚 學習重點：
    - 抽象基類 (ABC) 的使用
    - 接口隔離原則的實現
    - 驗證邏輯的標準化
    
    🎯 單一職責：專門負責用戶數據驗證
    """
    
    @abstractmethod
    def validate_registration_data(self, email: str, username: str, password: str) -> None:
        """
        驗證用戶註冊數據
        
        Args:
            email (str): 用戶電子郵件
            username (str): 用戶名稱
            password (str): 用戶密碼
        
        Raises:
            ValidationError: 當數據驗證失敗時
        """
        pass
    
    @abstractmethod
    def validate_email_format(self, email: str) -> bool:
        """
        驗證電子郵件格式
        
        Args:
            email (str): 電子郵件地址
        
        Returns:
            bool: 格式是否正確
        """
        pass
    
    @abstractmethod
    def validate_password_strength(self, password: str) -> bool:
        """
        驗證密碼強度
        
        Args:
            password (str): 密碼字符串
        
        Returns:
            bool: 密碼是否符合強度要求
        """
        pass


class ITokenManager(ABC):
    """
    Token 管理器接口
    
    📚 學習重點：
    - JWT Token 的生命週期管理
    - 安全性考慮（黑名單機制）
    - 接口設計的一致性
    
    🎯 單一職責：專門負責 Token 的生成、驗證和管理
    """
    
    @abstractmethod
    def generate_tokens(self, user: User) -> Dict[str, str]:
        """
        為用戶生成訪問令牌和刷新令牌
        
        Args:
            user (User): 用戶實例
        
        Returns:
            Dict[str, str]: 包含 access 和 refresh token 的字典
        """
        pass
    
    @abstractmethod
    def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """
        使用刷新令牌獲取新的訪問令牌
        
        Args:
            refresh_token (str): 刷新令牌
        
        Returns:
            Dict[str, str]: 新的令牌對
        """
        pass
    
    @abstractmethod
    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        驗證令牌有效性
        
        Args:
            token (str): 要驗證的令牌
        
        Returns:
            Optional[Dict[str, Any]]: 令牌有效則返回解碼後的數據，否則返回 None
        """
        pass
    
    @abstractmethod
    def blacklist_token(self, refresh_token: str) -> bool:
        """
        將令牌加入黑名單
        
        Args:
            refresh_token (str): 要加入黑名單的刷新令牌
        
        Returns:
            bool: 操作是否成功
        """
        pass


class IImageProcessor(ABC):
    """
    圖片處理器接口
    
    📚 學習重點：
    - 文件處理的抽象化
    - 圖片處理的常見操作
    - 錯誤處理的標準化
    
    🎯 單一職責：專門負責圖片的處理和優化
    """
    
    @abstractmethod
    def compress_image(self, image_file: UploadedFile, max_size: Tuple[int, int]) -> UploadedFile:
        """
        壓縮圖片到指定尺寸
        
        Args:
            image_file (UploadedFile): 原始圖片文件
            max_size (Tuple[int, int]): 最大尺寸 (寬度, 高度)
        
        Returns:
            UploadedFile: 壓縮後的圖片文件
        """
        pass
    
    @abstractmethod
    def generate_thumbnail(self, image_file: UploadedFile, size: Tuple[int, int]) -> UploadedFile:
        """
        生成縮略圖
        
        Args:
            image_file (UploadedFile): 原始圖片文件
            size (Tuple[int, int]): 縮略圖尺寸
        
        Returns:
            UploadedFile: 縮略圖文件
        """
        pass
    
    @abstractmethod
    def validate_image_format(self, image_file: UploadedFile) -> bool:
        """
        驗證圖片格式
        
        Args:
            image_file (UploadedFile): 圖片文件
        
        Returns:
            bool: 格式是否支持
        """
        pass


# ======================================================================================
# 💾 數據存取接口 (Data Access Interfaces)
# ======================================================================================

class IUserRepository(ABC):
    """
    用戶數據存取接口
    
    📚 學習重點：
    - Repository 模式的實現
    - 數據存取層的抽象化
    - 查詢優化的考慮
    
    🎯 單一職責：專門負責用戶數據的 CRUD 操作
    """
    
    @abstractmethod
    def create_user(self, user_data: Dict[str, Any]) -> User:
        """
        創建新用戶
        
        Args:
            user_data (Dict[str, Any]): 用戶數據
        
        Returns:
            User: 創建的用戶實例
        """
        pass
    
    @abstractmethod
    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        根據電子郵件獲取用戶
        
        Args:
            email (str): 電子郵件地址
        
        Returns:
            Optional[User]: 用戶實例或 None
        """
        pass
    
    @abstractmethod
    def get_user_by_username(self, username: str) -> Optional[User]:
        """
        根據用戶名獲取用戶
        
        Args:
            username (str): 用戶名
        
        Returns:
            Optional[User]: 用戶實例或 None
        """
        pass
    
    @abstractmethod
    def update_user(self, user: User, update_data: Dict[str, Any]) -> User:
        """
        更新用戶資料
        
        Args:
            user (User): 用戶實例
            update_data (Dict[str, Any]): 更新數據
        
        Returns:
            User: 更新後的用戶實例
        """
        pass
    
    @abstractmethod
    def delete_user(self, user: User) -> bool:
        """
        刪除用戶
        
        Args:
            user (User): 要刪除的用戶實例
        
        Returns:
            bool: 刪除是否成功
        """
        pass


# ======================================================================================
# 📧 通知相關接口 (Notification Interfaces)
# ======================================================================================

class INotificationSender(ABC):
    """
    通知發送器接口
    
    📚 學習重點：
    - 通知系統的抽象化
    - 多種通知渠道的統一接口
    - 異步處理的考慮
    
    🎯 單一職責：專門負責各種通知的發送
    """
    
    @abstractmethod
    def send_email_notification(self, recipient: str, subject: str, content: str) -> bool:
        """
        發送電子郵件通知
        
        Args:
            recipient (str): 收件人郵箱
            subject (str): 郵件主題
            content (str): 郵件內容
        
        Returns:
            bool: 發送是否成功
        """
        pass
    
    @abstractmethod
    def send_push_notification(self, user_id: str, title: str, body: str) -> bool:
        """
        發送推送通知
        
        Args:
            user_id (str): 用戶ID
            title (str): 通知標題
            body (str): 通知內容
        
        Returns:
            bool: 發送是否成功
        """
        pass


# ======================================================================================
# 🔍 搜索相關接口 (Search Interfaces)
# ======================================================================================

class ISearchEngine(ABC):
    """
    搜索引擎接口
    
    📚 學習重點：
    - 搜索功能的抽象化
    - 不同搜索引擎的統一接口
    - 搜索結果的標準化
    
    🎯 單一職責：專門負責各種搜索功能
    """
    
    @abstractmethod
    def search_users(self, query: str, limit: int = 10) -> List[User]:
        """
        搜索用戶
        
        Args:
            query (str): 搜索關鍵詞
            limit (int): 結果數量限制
        
        Returns:
            List[User]: 搜索結果列表
        """
        pass
    
    @abstractmethod
    def search_posts(self, query: str, limit: int = 10) -> List[Any]:
        """
        搜索貼文
        
        Args:
            query (str): 搜索關鍵詞
            limit (int): 結果數量限制
        
        Returns:
            List[Any]: 搜索結果列表
        """
        pass


# ======================================================================================
# 📊 快取相關接口 (Cache Interfaces)
# ======================================================================================

class ICacheManager(ABC):
    """
    快取管理器接口
    
    📚 學習重點：
    - 快取系統的抽象化
    - 不同快取後端的統一接口
    - 快取策略的標準化
    
    🎯 單一職責：專門負責數據快取的管理
    """
    
    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        """
        獲取快取值
        
        Args:
            key (str): 快取鍵
        
        Returns:
            Optional[Any]: 快取值或 None
        """
        pass
    
    @abstractmethod
    def set(self, key: str, value: Any, timeout: Optional[int] = None) -> bool:
        """
        設置快取值
        
        Args:
            key (str): 快取鍵
            value (Any): 快取值
            timeout (Optional[int]): 過期時間（秒）
        
        Returns:
            bool: 設置是否成功
        """
        pass
    
    @abstractmethod
    def delete(self, key: str) -> bool:
        """
        刪除快取值
        
        Args:
            key (str): 快取鍵
        
        Returns:
            bool: 刪除是否成功
        """
        pass 