"""
EngineerHub - 用戶認證服務層 (重構版)

職責：
- 處理用戶認證業務邏輯 - 管理用戶身份驗證的核心流程
- 管理用戶註冊、登入、登出流程 - 提供完整的用戶生命週期管理
- 處理社交登入整合 - 支援第三方登入服務（Google、GitHub等）
- 用戶資料管理和驗證 - 確保用戶數據的完整性和安全性
- Token 管理 - 處理 JWT 令牌的生成、刷新和驗證

設計原則：
- Narrowly focused: 每個服務類專注單一業務領域，避免功能雜糅
- Flexible: 支援依賴注入和配置化，便於測試和擴展
- Loosely coupled: 與視圖層和模型層解耦，降低系統耦合度

重構重點：
- 統一錯誤處理機制
- 加強類型提示和文檔說明
- 優化性能和安全性
- 提供清晰的 API 接口
"""

from typing import Optional, Dict, Any, Tuple, Union, List, TYPE_CHECKING
from django.contrib.auth import authenticate
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import logging
import re
from datetime import datetime, timedelta

# 確保正確導入用戶模型和序列化器
# 使用 get_user_model() 確保獲取正確的 User 模型，支持自定義用戶模型
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

# 動態獲取 User 模型，這是 Django 推薦的做法，確保與自定義用戶模型兼容
User = get_user_model()

if TYPE_CHECKING:
    from accounts.models import User as UserType
else:
    UserType = 'User'

# 導入其他必要的模型
from .models import Follow, UserSettings

# 設定日誌記錄器，用於追蹤服務層操作
logger = logging.getLogger(__name__)

# 自定義異常類，提供更精確的錯誤處理
class AuthenticationError(Exception):
    """
    認證相關錯誤
    
    用於處理用戶認證過程中的各種異常情況
    提供明確的錯誤類型，便於上層調用者處理
    """
    pass

class UserValidationError(Exception):
    """
    用戶數據驗證錯誤
    
    當用戶提供的數據不符合業務規則時拋出
    包含詳細的驗證失敗原因
    """
    pass

class UserService:
    """
    用戶核心服務類
    
    功能範圍：
    - 用戶註冊和驗證 - 處理新用戶創建和數據驗證
    - 密碼管理 - 包括密碼更改、重置等功能
    - 用戶資料更新 - 安全地更新用戶個人資料
    - 用戶狀態管理 - 處理用戶啟用、停用等狀態變更
    
    設計模式：服務層模式
    職責：封裝用戶相關的業務邏輯，與資料層和視圖層解耦
    """
    
    # 密碼強度驗證規則常量
    MIN_PASSWORD_LENGTH = 8
    PASSWORD_PATTERN = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]')
    
    @classmethod
    def validate_password_strength(cls, password: str) -> bool:
        """
        驗證密碼強度
        
        要求：
        - 至少 8 個字符
        - 包含大小寫字母
        - 包含數字
        - 包含特殊字符
        
        Args:
            password: 待驗證的密碼
            
        Returns:
            bool: 密碼是否符合強度要求
        """
        if len(password) < cls.MIN_PASSWORD_LENGTH:
            return False
        return bool(cls.PASSWORD_PATTERN.match(password))
    
    @classmethod
    def validate_email_format(cls, email: str) -> bool:
        """
        驗證電子郵件格式
        
        Args:
            email: 待驗證的電子郵件地址
            
        Returns:
            bool: 電子郵件格式是否正確
        """
        email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        return bool(email_pattern.match(email))
    
    @classmethod
    def validate_username_format(cls, username: str) -> bool:
        """
        驗證用戶名格式
        
        要求：
        - 3-30 個字符
        - 只能包含字母、數字、下劃線
        - 不能以數字開頭
        
        Args:
            username: 待驗證的用戶名
            
        Returns:
            bool: 用戶名格式是否正確
        """
        if not (3 <= len(username) <= 30):
            return False
        username_pattern = re.compile(r'^[a-zA-Z][a-zA-Z0-9_]*$')
        return bool(username_pattern.match(username))
    
    @staticmethod
    def create_user(
        email: str, 
        username: str, 
        password: str, 
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        **extra_fields
    ) -> UserType:
        """
        創建新用戶
        
        這是用戶註冊的核心方法，處理所有必要的驗證和用戶創建邏輯
        
        Args:
            email: 用戶電子郵件地址（必須唯一）
            username: 用戶名稱（必須唯一）
            password: 用戶密碼（將被加密存儲）
            first_name: 用戶名字（可選）
            last_name: 用戶姓氏（可選）
            **extra_fields: 其他用戶欄位（如頭像、簡介等）
            
        Returns:
            User: 創建成功的用戶實例
            
        Raises:
            UserValidationError: 當用戶資料驗證失敗時
            IntegrityError: 當數據庫約束違反時（如重複的電子郵件或用戶名）
        """
        try:
            # 第一階段：數據格式驗證
            logger.info(f"🔄 開始創建用戶 - 電子郵件: {email}, 用戶名: {username}")
            
            # 驗證電子郵件格式
            if not UserService.validate_email_format(email):
                raise UserValidationError("電子郵件格式不正確")
            
            # 驗證用戶名格式
            if not UserService.validate_username_format(username):
                raise UserValidationError("用戶名格式不正確（3-30字符，字母開頭，只能包含字母數字下劃線）")
            
            # 驗證密碼強度
            if not UserService.validate_password_strength(password):
                raise UserValidationError("密碼強度不足（至少8字符，包含大小寫字母、數字和特殊字符）")
            
            # 第二階段：數據庫事務處理
            with transaction.atomic():
                # 檢查郵件是否已存在
                if User.objects.filter(email=email).exists():
                    raise UserValidationError("該電子郵件已被註冊")
                
                # 檢查用戶名是否已存在
                if User.objects.filter(username=username).exists():
                    raise UserValidationError("該用戶名已被使用")
                
                # 準備用戶數據
                user_data = {
                    'email': email,
                    'username': username,
                    'first_name': first_name or '',
                    'last_name': last_name or '',
                    **extra_fields
                }
                
                # 創建用戶實例
                user = User.objects.create_user(
                    password=password,
                    **user_data
                )
                
                # 創建用戶設置（使用默認值）
                UserSettings.objects.create(user=user)
                
                # 記錄成功日誌
                logger.info(f"✅ 新用戶註冊成功: {user.email} (ID: {user.id})")
                
                return user
                
        except UserValidationError:
            # 重新拋出驗證錯誤，保持錯誤類型
            raise
        except IntegrityError as e:
            # 數據庫完整性錯誤（如並發創建相同用戶）
            logger.error(f"❌ 用戶創建失敗 - 數據庫完整性錯誤: {str(e)}")
            raise UserValidationError("用戶創建失敗：可能是電子郵件或用戶名已被使用")
        except Exception as e:
            # 其他未預期的錯誤
            logger.error(f"❌ 用戶創建過程出現意外錯誤: {str(e)}")
            raise UserValidationError(f"用戶創建失敗: {str(e)}")
    
    @staticmethod
    def authenticate_user(email: str, password: str) -> Optional[UserType]:
        """
        用戶認證
        
        驗證用戶的登入憑證，並更新相關的登入信息
        
        Args:
            email: 用戶電子郵件地址
            password: 用戶密碼
            
        Returns:
            Optional[User]: 認證成功的用戶實例，失敗時返回 None
            
        Raises:
            AuthenticationError: 當認證過程出現嚴重錯誤時
        """
        try:
            logger.info(f"🔐 嘗試認證用戶: {email}")
            
            # 查找用戶（使用電子郵件作為唯一標識）
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                logger.warning(f"❌ 登入失敗 - 用戶不存在: {email}")
                return None
            
            # 檢查用戶賬戶狀態
            if not user.is_active:
                logger.warning(f"❌ 登入失敗 - 用戶賬戶已停用: {email}")
                return None
            
            # 驗證密碼
            if not user.check_password(password):
                logger.warning(f"❌ 登入失敗 - 密碼錯誤: {email}")
                return None
            
            # 認證成功，更新用戶狀態
            with transaction.atomic():
                # 更新最後登入時間
                user.last_login = timezone.now()
                # 設置在線狀態
                user.is_online = True
                user.last_online = timezone.now()
                # 保存更改
                user.save(update_fields=['last_login', 'is_online', 'last_online'])
            
            logger.info(f"✅ 用戶登入成功: {email} (ID: {user.id})")
            return user
            
        except Exception as e:
            logger.error(f"❌ 用戶認證過程出錯: {str(e)}")
            raise AuthenticationError(f"認證服務暫時不可用: {str(e)}")
    
    @staticmethod
    def update_user_profile(user: UserType, **data) -> UserType :
        """
        更新用戶資料
        
        安全地更新用戶個人資料，包括數據驗證和權限檢查
        
        Args:
            user: 要更新的用戶實例
            **data: 要更新的資料字典
            
        Returns:
            User: 更新後的用戶實例
            
        Raises:
            UserValidationError: 當更新資料驗證失敗時
            PermissionError: 當沒有更新權限時
        """
        try:
            logger.info(f"🔄 開始更新用戶資料: {user.email} (ID: {user.id})")
            
            with transaction.atomic():
                # 定義不允許更新的敏感欄位
                protected_fields = {
                    'password', 'is_staff', 'is_superuser', 
                    'user_permissions', 'groups', 'date_joined',
                    'last_login', 'id'
                }
                
                # 過濾掉保護欄位
                safe_data = {k: v for k, v in data.items() if k not in protected_fields}
                
                # 特殊欄位驗證
                if 'email' in safe_data and safe_data['email'] != user.email:
                    new_email = safe_data['email']
                    
                    # 驗證新郵件格式
                    if not UserService.validate_email_format(new_email):
                        raise UserValidationError("新電子郵件格式不正確")
                    
                    # 檢查新郵件是否已被使用
                    if User.objects.filter(email=new_email).exists():
                        raise UserValidationError("該電子郵件已被其他用戶使用")
                
                if 'username' in safe_data and safe_data['username'] != user.username:
                    new_username = safe_data['username']
                    
                    # 驗證新用戶名格式
                    if not UserService.validate_username_format(new_username):
                        raise UserValidationError("新用戶名格式不正確")
                    
                    # 檢查新用戶名是否已被使用
                    if User.objects.filter(username=new_username).exists():
                        raise UserValidationError("該用戶名已被其他用戶使用")
                
                # 更新用戶資料
                for field, value in safe_data.items():
                    setattr(user, field, value)
                
                # 驗證模型完整性
                user.full_clean()
                
                # 保存更改
                user.save()
                
                logger.info(f"✅ 用戶資料更新成功: {user.email}")
                return user
                
        except UserValidationError:
            # 重新拋出驗證錯誤
            raise
        except ValidationError as e:
            # Django 模型驗證錯誤
            logger.error(f"❌ 用戶資料驗證失敗: {str(e)}")
            raise UserValidationError(f"資料驗證失敗: {str(e)}")
        except Exception as e:
            logger.error(f"❌ 用戶資料更新失敗: {str(e)}")
            raise UserValidationError(f"用戶資料更新失敗: {str(e)}")
    
    @staticmethod
    def change_password(user: UserType, old_password: str, new_password: str) -> bool:
        """
        更改用戶密碼
        
        安全地更改用戶密碼，包括舊密碼驗證和新密碼強度檢查
        
        Args:
            user: 用戶實例
            old_password: 當前密碼
            new_password: 新密碼
            
        Returns:
            bool: 更改是否成功
            
        Raises:
            UserValidationError: 當密碼驗證失敗時
        """
        try:
            logger.info(f"🔑 嘗試更改用戶密碼: {user.email}")
            
            # 驗證舊密碼
            if not user.check_password(old_password):
                raise UserValidationError("當前密碼不正確")
            
            # 驗證新密碼強度
            if not UserService.validate_password_strength(new_password):
                raise UserValidationError("新密碼強度不足（至少8字符，包含大小寫字母、數字和特殊字符）")
            
            # 檢查新密碼是否與舊密碼相同
            if user.check_password(new_password):
                raise UserValidationError("新密碼不能與當前密碼相同")
            
            # 更新密碼
            with transaction.atomic():
                user.set_password(new_password)
                user.save(update_fields=['password'])
            
            logger.info(f"✅ 用戶密碼更改成功: {user.email}")
            return True
            
        except UserValidationError:
            # 重新拋出驗證錯誤
            raise
        except Exception as e:
            logger.error(f"❌ 密碼更改失敗: {str(e)}")
            raise UserValidationError(f"密碼更改失敗: {str(e)}")
    
    @staticmethod
    def deactivate_user(user: UserType, reason: Optional[str] = None) -> bool:
        """
        停用用戶賬戶
        
        將用戶賬戶設置為非活躍狀態，用戶將無法登入
        
        Args:
            user: 要停用的用戶實例
            reason: 停用原因（可選，用於記錄）
            
        Returns:
            bool: 停用是否成功
        """
        try:
            logger.info(f"🚫 停用用戶賬戶: {user.email} - 原因: {reason or '未提供'}")
            
            with transaction.atomic():
                user.is_active = False
                user.is_online = False  # 同時設置為離線
                user.save(update_fields=['is_active', 'is_online'])
            
            logger.info(f"✅ 用戶賬戶已停用: {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 停用用戶失敗: {str(e)}")
            return False
    
    @staticmethod
    def activate_user(user: UserType, reason: Optional[str] = None) -> bool:
        """
        啟用用戶賬戶
        
        將用戶賬戶設置為活躍狀態，用戶可以正常登入
        
        Args:
            user: 要啟用的用戶實例
            reason: 啟用原因（可選，用於記錄）
            
        Returns:
            bool: 啟用是否成功
        """
        try:
            logger.info(f"✅ 啟用用戶賬戶: {user.email} - 原因: {reason or '未提供'}")
            
            with transaction.atomic():
                user.is_active = True
                user.save(update_fields=['is_active'])
            
            logger.info(f"✅ 用戶賬戶已啟用: {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 啟用用戶失敗: {str(e)}")
            return False
    
    @staticmethod
    def set_user_online_status(user: UserType, is_online: bool) -> bool:
        """
        設置用戶在線狀態
        
        Args:
            user: 用戶實例
            is_online: 是否在線
            
        Returns:
            bool: 設置是否成功
        """
        try:
            with transaction.atomic():
                user.is_online = is_online
                user.last_online = timezone.now()
                user.save(update_fields=['is_online', 'last_online'])
            
            return True
            
        except Exception as e:
            logger.error(f"❌ 設置用戶在線狀態失敗: {str(e)}")
            return False


class TokenService:
    """
    JWT Token 服務類
    
    功能：
    - Token 生成和驗證 - 創建和檢查 JWT 令牌的有效性
    - Token 刷新機制 - 實現無縫的令牌更新
    - Token 黑名單管理 - 處理令牌的撤銷和失效
    
    設計原則：
    - 安全優先：所有令牌操作都經過嚴格的安全檢查
    - 性能優化：使用緩存和批量操作提升性能
    """
    
    @staticmethod
    def generate_tokens(user: UserType) -> Dict[str, str]:
        """
        為用戶生成 JWT 令牌對（Access Token 和 Refresh Token）
        
        Args:
            user: 用戶實例
            
        Returns:
            Dict[str, str]: 包含 access 和 refresh 令牌的字典
            
        Raises:
            TokenError: 當令牌生成失敗時
        """
        try:
            logger.info(f"🎫 為用戶生成 Token: {user.email}")
            
            # 創建 Refresh Token
            refresh = RefreshToken.for_user(user)
            
            # 在 Token 中添加自定義聲明
            refresh['email'] = user.email
            refresh['username'] = user.username
            refresh['user_id'] = str(user.id)  # 確保 UUID 被轉換為字符串
            refresh['is_staff'] = user.is_staff
            refresh['is_superuser'] = user.is_superuser
            
            # 生成 Access Token
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            logger.info(f"✅ Token 生成成功: {user.email}")
            
            return {
                'access': access_token,
                'refresh': refresh_token,
                'access_expires': str(refresh.access_token.payload['exp']),
                'refresh_expires': str(refresh.payload['exp']),
            }
            
        except Exception as e:
            logger.error(f"❌ Token 生成失敗: {str(e)}")
            raise TokenError(f"Token 生成失敗: {str(e)}")
    
    @staticmethod
    def refresh_access_token(refresh_token: str) -> Dict[str, str]:
        """
        使用 Refresh Token 生成新的 Access Token
        
        Args:
            refresh_token: 有效的 Refresh Token
            
        Returns:
            Dict[str, str]: 包含新 Access Token 的字典
            
        Raises:
            InvalidToken: 當 Refresh Token 無效時
        """
        try:
            logger.info("🔄 刷新 Access Token")
            
            # 驗證 Refresh Token
            refresh = RefreshToken(refresh_token)
            
            # 生成新的 Access Token
            new_access_token = str(refresh.access_token)
            
            logger.info("✅ Access Token 刷新成功")
            
            return {
                'access': new_access_token,
                'access_expires': str(refresh.access_token.payload['exp']),
            }
            
        except InvalidToken as e:
            logger.warning(f"❌ Refresh Token 無效: {str(e)}")
            raise InvalidToken("Refresh Token 已過期或無效")
        except Exception as e:
            logger.error(f"❌ Token 刷新失敗: {str(e)}")
            raise TokenError(f"Token 刷新失敗: {str(e)}")
    
    @staticmethod
    def blacklist_token(refresh_token: str) -> bool:
        """
        將 Refresh Token 加入黑名單（用於登出）
        
        Args:
            refresh_token: 要加入黑名單的 Refresh Token
            
        Returns:
            bool: 操作是否成功
        """
        try:
            logger.info("🚫 將 Token 加入黑名單")
            
            # 創建 RefreshToken 實例並加入黑名單
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            logger.info("✅ Token 已加入黑名單")
            return True
            
        except InvalidToken:
            logger.warning("❌ 嘗試將無效 Token 加入黑名單")
            return False
        except Exception as e:
            logger.error(f"❌ Token 黑名單操作失敗: {str(e)}")
            return False
    
    @staticmethod
    def validate_token(token: str) -> Optional[Dict[str, Any]]:
        """
        驗證 Token 有效性並返回載荷
        
        Args:
            token: 要驗證的 Token
            
        Returns:
            Optional[Dict[str, Any]]: Token 載荷，無效時返回 None
        """
        try:
            # 使用 UntypedToken 來驗證任何類型的 Token
            validated_token = UntypedToken(token)
            return validated_token.payload
            
        except (InvalidToken, TokenError):
            return None


class SocialAuthService:
    """
    社交登入服務類
    
    功能：
    - 處理第三方登入整合 - 支援 Google、GitHub 等平台
    - 用戶資料同步 - 從第三方平台獲取用戶資料並同步
    - 賬戶綁定管理 - 處理社交賬戶與本地賬戶的綁定關係
    
    設計原則：
    - 可擴展性：支援多種第三方登入提供商
    - 數據一致性：確保社交登入用戶數據的一致性
    """
    
    @staticmethod
    def handle_google_auth(user_data: Dict[str, Any]) -> Tuple[UserType, bool]:
        """
        處理 Google 社交登入
        
        Args:
            user_data: Google 返回的用戶資料
            
        Returns:
            Tuple[User, bool]: (用戶實例, 是否為新創建的用戶)
            
        Raises:
            UserValidationError: 當用戶數據處理失敗時
        """
        try:
            logger.info(f"🔗 處理 Google 社交登入: {user_data.get('email')}")
            
            email = user_data.get('email')
            google_id = user_data.get('id')
            
            if not email or not google_id:
                raise UserValidationError("Google 用戶數據不完整")
            
            with transaction.atomic():
                # 嘗試通過 email 查找現有用戶
                try:
                    user = User.objects.get(email=email)
                    is_new_user = False
                    
                    # 如果用戶存在但沒有綁定 Google ID，則綁定
                    if not hasattr(user, 'google_id') or not user.google_id:
                        user.google_id = google_id
                    
                    # 更新用戶資料（如果 Google 提供了更新的資料）
                    if user_data.get('name') and not user.first_name:
                        user.first_name = user_data.get('given_name', '')
                        user.last_name = user_data.get('family_name', '')
                    
                    # 更新頭像（如果用戶沒有頭像且 Google 提供了）
                    if not user.avatar and user_data.get('picture'):
                        # 這裡可以添加下載並保存 Google 頭像的邏輯
                        pass
                    
                    user.save()
                    logger.info(f"✅ 現有用戶 Google 登入成功: {email}")
                    
                except User.DoesNotExist:
                    # 創建新用戶
                    username = user_data.get('name', email.split('@')[0])
                    
                    # 確保用戶名唯一
                    base_username = username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{base_username}_{counter}"
                        counter += 1
                    
                    user = User.objects.create_user(
                        email=email,
                        username=username,
                        first_name=user_data.get('given_name', ''),
                        last_name=user_data.get('family_name', ''),
                        google_id=google_id,
                        is_verified=True,  # Google 用戶視為已驗證
                    )
                    
                    # 創建用戶設置
                    UserSettings.objects.create(user=user)
                    
                    is_new_user = True
                    logger.info(f"✅ 新 Google 用戶創建成功: {email}")
                
                return user, is_new_user
                
        except Exception as e:
            logger.error(f"❌ Google 登入處理失敗: {str(e)}")
            raise UserValidationError(f"Google 登入失敗: {str(e)}")
    
    @staticmethod
    def handle_github_auth(user_data: Dict[str, Any]) -> Tuple[UserType, bool]:
        """
        處理 GitHub 社交登入
        
        Args:
            user_data: GitHub 返回的用戶資料
            
        Returns:
            Tuple[User, bool]: (用戶實例, 是否為新創建的用戶)
            
        Raises:
            UserValidationError: 當用戶數據處理失敗時
        """
        try:
            logger.info(f"🔗 處理 GitHub 社交登入: {user_data.get('email')}")
            
            email = user_data.get('email')
            github_id = user_data.get('id')
            github_username = user_data.get('login')
            
            if not email or not github_id:
                raise UserValidationError("GitHub 用戶數據不完整")
            
            with transaction.atomic():
                # 嘗試通過 email 查找現有用戶
                try:
                    user = User.objects.get(email=email)
                    is_new_user = False
                    
                    # 綁定 GitHub 資料
                    if not hasattr(user, 'github_id') or not user.github_id:
                        user.github_id = github_id
                    
                    # 更新 GitHub URL
                    if user_data.get('html_url') and not user.github_url:
                        user.github_url = user_data.get('html_url')
                    
                    # 更新簡介
                    if user_data.get('bio') and not user.bio:
                        user.bio = user_data.get('bio')
                    
                    user.save()
                    logger.info(f"✅ 現有用戶 GitHub 登入成功: {email}")
                    
                except User.DoesNotExist:
                    # 創建新用戶
                    username = github_username or email.split('@')[0]
                    
                    # 確保用戶名唯一
                    base_username = username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{base_username}_{counter}"
                        counter += 1
                    
                    user = User.objects.create_user(
                        email=email,
                        username=username,
                        first_name=user_data.get('name', '').split(' ')[0] if user_data.get('name') else '',
                        last_name=' '.join(user_data.get('name', '').split(' ')[1:]) if user_data.get('name') else '',
                        bio=user_data.get('bio', ''),
                        github_id=github_id,
                        github_url=user_data.get('html_url', ''),
                        location=user_data.get('location', ''),
                        website=user_data.get('blog', ''),
                        is_verified=True,  # GitHub 用戶視為已驗證
                    )
                    
                    # 創建用戶設置
                    UserSettings.objects.create(user=user)
                    
                    is_new_user = True
                    logger.info(f"✅ 新 GitHub 用戶創建成功: {email}")
                
                return user, is_new_user
                
        except Exception as e:
            logger.error(f"❌ GitHub 登入處理失敗: {str(e)}")
            raise UserValidationError(f"GitHub 登入失敗: {str(e)}")


class UserRelationshipService:
    """
    用戶關係服務類
    
    功能：
    - 用戶關注/取消關注 - 處理用戶之間的關注關係
    - 用戶黑名單管理 - 處理用戶屏蔽功能
    - 關係狀態查詢 - 提供高效的關係狀態檢查
    
    設計原則：
    - 性能優化：使用數據庫索引和緩存提升查詢性能
    - 數據一致性：確保關係數據的一致性
    """
    
    @staticmethod
    def follow_user(follower: UserType, following: UserType) -> bool:
        """
        用戶關注操作
        
        Args:
            follower: 關注者
            following: 被關注者
            
        Returns:
            bool: 關注是否成功
            
        Raises:
            UserValidationError: 當關注操作違反業務規則時
        """
        try:
            # 業務規則檢查
            if follower == following:
                raise UserValidationError("用戶不能關注自己")
            
            # 檢查是否已經關注
            if Follow.objects.filter(follower=follower, following=following).exists():
                logger.warning(f"用戶 {follower.username} 已經關注了 {following.username}")
                return True  # 已經關注，視為成功
            
            logger.info(f"👥 用戶關注: {follower.username} -> {following.username}")
            
            with transaction.atomic():
                # 創建關注關係
                Follow.objects.create(follower=follower, following=following)
                
                # 更新關注者的關注數量
                follower.following_count = Follow.objects.filter(follower=follower).count()
                follower.save(update_fields=['following_count'])
                
                # 更新被關注者的粉絲數量
                following.followers_count = Follow.objects.filter(following=following).count()
                following.save(update_fields=['followers_count'])
            
            logger.info(f"✅ 關注成功: {follower.username} -> {following.username}")
            return True
            
        except UserValidationError:
            raise
        except Exception as e:
            logger.error(f"❌ 關注操作失敗: {str(e)}")
            return False
    
    @staticmethod
    def unfollow_user(follower: UserType, following: UserType) -> bool:
        """
        用戶取消關注操作
        
        Args:
            follower: 關注者
            following: 被關注者
            
        Returns:
            bool: 取消關注是否成功
        """
        try:
            logger.info(f"👥 取消關注: {follower.username} -> {following.username}")
            
            with transaction.atomic():
                # 刪除關注關係
                deleted_count, _ = Follow.objects.filter(
                    follower=follower, 
                    following=following
                ).delete()
                
                if deleted_count == 0:
                    logger.warning(f"用戶 {follower.username} 並未關注 {following.username}")
                    return True  # 本來就沒關注，視為成功
                
                # 更新關注者的關注數量
                follower.following_count = Follow.objects.filter(follower=follower).count()
                follower.save(update_fields=['following_count'])
                
                # 更新被關注者的粉絲數量
                following.followers_count = Follow.objects.filter(following=following).count()
                following.save(update_fields=['followers_count'])
            
            logger.info(f"✅ 取消關注成功: {follower.username} -> {following.username}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 取消關注操作失敗: {str(e)}")
            return False
    
    @staticmethod
    def is_following(follower: UserType, following: UserType) -> bool:
        """
        檢查用戶是否關注另一個用戶
        
        Args:
            follower: 關注者
            following: 被關注者
            
        Returns:
            bool: 是否已關注
        """
        try:
            return Follow.objects.filter(follower=follower, following=following).exists()
        except Exception as e:
            logger.error(f"❌ 檢查關注狀態失敗: {str(e)}")
            return False
    
    @staticmethod
    def get_followers(user: UserType, limit: Optional[int] = None) -> List[UserType]:
        """
        獲取用戶的關注者列表
        
        Args:
            user: 目標用戶
            limit: 返回數量限制
            
        Returns:
            List[User]: 關注者列表
        """
        try:
            queryset = User.objects.filter(
                following_set__following=user
            ).select_related().order_by('-following_set__created_at')
            
            if limit:
                queryset = queryset[:limit]
            
            return list(queryset)
            
        except Exception as e:
            logger.error(f"❌ 獲取關注者列表失敗: {str(e)}")
            return []
    
    @staticmethod
    def get_following(user: UserType, limit: Optional[int] = None) -> List[UserType]:
        """
        獲取用戶關注的人列表
        
        Args:
            user: 目標用戶
            limit: 返回數量限制
            
        Returns:
            List[User]: 關注的人列表
        """
        try:
            queryset = User.objects.filter(
                followers_set__follower=user
            ).select_related().order_by('-followers_set__created_at')
            
            if limit:
                queryset = queryset[:limit]
            
            return list(queryset)
            
        except Exception as e:
            logger.error(f"❌ 獲取關注列表失敗: {str(e)}")
            return [] 