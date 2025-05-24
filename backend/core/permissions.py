"""
EngineerHub 自定義權限類

定義平台的權限控制邏輯
"""

import logging
from rest_framework import permissions
from rest_framework.permissions import BasePermission
from django.core.cache import cache

logger = logging.getLogger('engineerhub.core')


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    管理員可以讀寫，其他用戶只能讀取
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_staff


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    物件所有者可以編輯，其他用戶只能讀取
    """
    
    def has_object_permission(self, request, view, obj):
        # 讀取權限允許任何請求
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 寫入權限只允許物件所有者
        return obj.user == request.user or obj.author == request.user


class IsOwnerOrStaff(permissions.BasePermission):
    """
    物件所有者或管理員可以訪問
    """
    
    def has_object_permission(self, request, view, obj):
        # 管理員有全部權限
        if request.user.is_staff:
            return True
        
        # 所有者有全部權限
        return obj.user == request.user or obj.author == request.user


class IsParticipantOrStaff(permissions.BasePermission):
    """
    對話參與者或管理員可以訪問
    """
    
    def has_object_permission(self, request, view, obj):
        # 管理員有全部權限
        if request.user.is_staff:
            return True
        
        # 檢查是否為對話參與者
        return obj.participants.filter(id=request.user.id).exists()


class CanReportContent(permissions.BasePermission):
    """
    可以舉報內容的權限
    """
    
    def has_permission(self, request, view):
        # 需要是已認證用戶且賬號狀態正常
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_active and
            not getattr(request.user, 'is_banned', False)
        )


class CanModerateContent(permissions.BasePermission):
    """
    可以審核內容的權限
    """
    
    def has_permission(self, request, view):
        # 需要是管理員或版主
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_staff or getattr(request.user, 'is_moderator', False))
        )


class IsActiveUser(permissions.BasePermission):
    """
    活躍用戶權限 - 用戶需要是活躍狀態且未被封禁
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_active and
            not getattr(request.user, 'is_banned', False)
        )


class RateLimitPermission(permissions.BasePermission):
    """
    基於用戶等級的頻率限制權限
    """
    
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # 管理員不受限制
        if request.user.is_staff:
            return True
        
        # 根據用戶等級設置不同的限制
        # 這裡可以根據實際需求實現
        return True


class HasProfilePermission(permissions.BasePermission):
    """
    個人資料權限 - 用戶可以查看所有人的資料，但只能編輯自己的
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # 讀取權限允許所有認證用戶
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 寫入權限只允許資料所有者或管理員
        return obj.user == request.user or request.user.is_staff


class CanAccessPrivateContent(permissions.BasePermission):
    """
    可以訪問私有內容的權限
    """
    
    def has_object_permission(self, request, view, obj):
        # 如果內容是公開的，允許所有人訪問
        if getattr(obj, 'is_public', True):
            return True
        
        # 私有內容只允許所有者、關注者或管理員訪問
        if request.user.is_staff:
            return True
        
        if hasattr(obj, 'author'):
            # 作者可以訪問
            if obj.author == request.user:
                return True
            
            #檢查是否為關注者            
            from accounts.models import Follow            
            if Follow.objects.filter(follower=request.user,following=obj.author).exists():
                return True
        
        return False


class BlockedUserPermission(permissions.BasePermission):
    """
    封鎖用戶權限 - 檢查用戶是否被封鎖
    """
    
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # 檢查用戶是否被臨時或永久封鎖
        if hasattr(request.user, 'is_blocked') and request.user.is_blocked:
            return False
        
        return True


class VerifiedUserPermission(permissions.BasePermission):
    """
    已驗證用戶權限 - 某些功能需要已驗證的用戶
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and
            getattr(request.user, 'is_verified', True)  # 預設為已驗證
        )


class IsOwnerOnly(BasePermission):
    """
    物件級權限：只有擁有者才能訪問
    
    適用於私人資料、私人訊息等
    """
    
    def has_object_permission(self, request, view, obj):
        """
        檢查物件級權限
        """
        if hasattr(obj, 'author'):
            return obj.author == request.user
        elif hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class IsAuthorOrReadOnly(BasePermission):
    """
    貼文作者權限：只有作者才能編輯貼文
    """
    
    def has_object_permission(self, request, view, obj):
        """
        檢查貼文作者權限
        """
        # 讀取權限允許任何請求
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 寫入權限只給作者
        return obj.author == request.user


class IsCommentAuthorOrPostAuthor(BasePermission):
    """
    評論權限：評論作者或貼文作者才能編輯/刪除評論
    """
    
    def has_object_permission(self, request, view, obj):
        """
        檢查評論權限
        """
        # 讀取權限允許任何請求
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 評論作者可以編輯/刪除
        if obj.author == request.user:
            return True
        
        # 貼文作者可以刪除評論（但不能編輯）
        if hasattr(obj, 'post') and obj.post.author == request.user:
            return request.method == 'DELETE'
        
        return False


class IsChatParticipant(BasePermission):
    """
    聊天權限：只有聊天參與者才能訪問
    """
    
    def has_object_permission(self, request, view, obj):
        """
        檢查聊天參與者權限
        """
        if hasattr(obj, 'participants'):
            return request.user in obj.participants.all()
        elif hasattr(obj, 'sender') and hasattr(obj, 'receiver'):
            return request.user in [obj.sender, obj.receiver]
        elif hasattr(obj, 'conversation'):
            return request.user in obj.conversation.participants.all()
        
        return False


class IsProfileOwnerOrReadOnly(BasePermission):
    """
    個人檔案權限：只有檔案擁有者才能編輯
    """
    
    def has_object_permission(self, request, view, obj):
        """
        檢查個人檔案權限
        """
        # 讀取權限允許任何請求
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 寫入權限只給檔案擁有者
        return obj.user == request.user


class IsSuperUserOnly(BasePermission):
    """
    超級用戶權限：只有超級用戶才能訪問
    """
    
    def has_permission(self, request, view):
        """
        檢查超級用戶權限
        """
        return request.user.is_authenticated and request.user.is_superuser


class ThrottledPermission(BasePermission):
    """
    帶限流的權限：基於用戶等級的請求限制
    """
    
    def has_permission(self, request, view):
        """
        檢查限流權限
        """
        if not request.user.is_authenticated:
            return False
        
        # 根據用戶等級設置不同的限制
        cache_key = f"throttle_{request.user.id}_{view.__class__.__name__}"
        current_requests = cache.get(cache_key, 0)
        
        # 設置不同用戶等級的限制
        if request.user.is_superuser:
            max_requests = 1000  # 超級用戶
        elif request.user.is_staff:
            max_requests = 500   # 管理員
        else:
            max_requests = 100   # 一般用戶
        
        if current_requests >= max_requests:
            logger.warning(
                f"用戶 {request.user.username} 超出請求限制: "
                f"{current_requests}/{max_requests}"
            )
            return False
        
        # 增加請求計數
        cache.set(cache_key, current_requests + 1, 3600)  # 1小時
        return True


class FeaturePermission(BasePermission):
    """
    功能權限：基於功能開關的權限控制
    """
    
    def __init__(self, feature_name):
        self.feature_name = feature_name
    
    def has_permission(self, request, view):
        """
        檢查功能權限
        """
        if not request.user.is_authenticated:
            return False
        
        # 檢查功能開關
        feature_enabled = cache.get(f"feature_{self.feature_name}", True)
        if not feature_enabled:
            logger.info(f"功能 {self.feature_name} 已停用")
            return False
        
        return True


class BetaFeaturePermission(BasePermission):
    """
    Beta功能權限：只有Beta用戶才能訪問
    """
    
    def has_permission(self, request, view):
        """
        檢查Beta用戶權限
        """
        if not request.user.is_authenticated:
            return False
        
        # 檢查用戶是否為Beta用戶
        is_beta_user = cache.get(f"beta_user_{request.user.id}")
        if is_beta_user is None:
            # 從資料庫檢查（這裡假設用戶模型有beta_user欄位）
            is_beta_user = getattr(request.user, 'is_beta_user', False)
            cache.set(f"beta_user_{request.user.id}", is_beta_user, 3600)
        
        return is_beta_user


class TimeBasedPermission(BasePermission):
    """
    時間基礎權限：在特定時間段內才允許訪問
    """
    
    def __init__(self, start_hour=9, end_hour=18):
        self.start_hour = start_hour
        self.end_hour = end_hour
    
    def has_permission(self, request, view):
        """
        檢查時間權限
        """
        from django.utils import timezone
        
        current_hour = timezone.now().hour
        
        # 管理員不受時間限制
        if request.user.is_authenticated and request.user.is_staff:
            return True
        
        # 檢查是否在允許的時間範圍內
        if self.start_hour <= current_hour < self.end_hour:
            return True
        
        logger.info(f"訪問被拒絕：當前時間 {current_hour} 不在允許範圍內")
        return False


class ConditionalPermission(BasePermission):
    """
    條件權限：基於多個條件的複合權限
    """
    
    def __init__(self, conditions):
        """
        conditions: 權限條件列表
        """
        self.conditions = conditions
    
    def has_permission(self, request, view):
        """
        檢查所有條件
        """
        for condition in self.conditions:
            if not condition.has_permission(request, view):
                return False
        return True
    
    def has_object_permission(self, request, view, obj):
        """
        檢查物件級權限的所有條件
        """
        for condition in self.conditions:
            if hasattr(condition, 'has_object_permission'):
                if not condition.has_object_permission(request, view, obj):
                    return False
        return True


# 常用權限組合
class PostPermissions(ConditionalPermission):
    """
    貼文權限組合
    """
    
    def __init__(self):
        super().__init__([
            permissions.IsAuthenticated(),
            IsAuthorOrReadOnly(),
        ])


class CommentPermissions(ConditionalPermission):
    """
    評論權限組合
    """
    
    def __init__(self):
        super().__init__([
            permissions.IsAuthenticated(),
            IsCommentAuthorOrPostAuthor(),
        ])


class ChatPermissions(ConditionalPermission):
    """
    聊天權限組合
    """
    
    def __init__(self):
        super().__init__([
            permissions.IsAuthenticated(),
            IsChatParticipant(),
        ])


# 權限工具函數
def check_permission(user, permission_class, obj=None):
    """
    檢查用戶是否有特定權限
    
    Args:
        user: 用戶物件
        permission_class: 權限類
        obj: 要檢查的物件（可選）
    
    Returns:
        bool: 是否有權限
    """
    permission = permission_class()
    
    # 模擬request物件
    class MockRequest:
        def __init__(self, user):
            self.user = user
            self.method = 'GET'
    
    request = MockRequest(user)
    
    # 檢查基本權限
    if not permission.has_permission(request, None):
        return False
    
    # 檢查物件權限
    if obj and hasattr(permission, 'has_object_permission'):
        return permission.has_object_permission(request, None, obj)
    
    return True


def get_user_permissions(user):
    """
    獲取用戶的所有權限
    
    Args:
        user: 用戶物件
    
    Returns:
        dict: 權限字典
    """
    permissions_dict = {
        'is_authenticated': user.is_authenticated,
        'is_staff': user.is_staff if user.is_authenticated else False,
        'is_superuser': user.is_superuser if user.is_authenticated else False,
        'can_create_post': user.is_authenticated,
        'can_comment': user.is_authenticated,
        'can_chat': user.is_authenticated,
        'can_follow': user.is_authenticated,
    }
    
    if user.is_authenticated:
        # 檢查特殊權限
        permissions_dict['is_beta_user'] = getattr(user, 'is_beta_user', False)
        permissions_dict['can_moderate'] = user.is_staff
        permissions_dict['can_admin'] = user.is_superuser
    
    return permissions_dict 