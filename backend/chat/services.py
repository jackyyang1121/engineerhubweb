"""
EngineerHub - 聊天服務層

提供聊天相關的所有業務邏輯，包括：
- 聊天室管理 - 處理聊天室的創建、更新、刪除操作
- 訊息發送與接收 - 管理訊息的傳送和接收邏輯
- 訊息歷史查詢 - 提供高效的訊息歷史記錄查詢
- 在線狀態管理 - 追蹤和管理用戶的在線狀態
- 聊天權限控制 - 確保聊天功能的安全性和權限管理

設計原則：
- Narrowly focused: 每個服務類別只負責特定的業務邏輯
- Flexible: 支援依賴注入和配置化，便於測試和擴展
- Loosely coupled: 最小化模組間依賴，提高代碼的可維護性
"""

from typing import List, Dict, Optional, Tuple, Union, TYPE_CHECKING
from django.db.models import QuerySet, Q, Count, Prefetch, Max
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache
from django.conf import settings

# 導入核心異常類，提供統一的錯誤處理機制
from core.exceptions import ValidationException, PermissionException, NotFoundError
# 導入聊天相關的模型
from .models import Conversation, Message, UserConversationState, ChatRoom, ChatRoomMember, MessageRead

# 動態獲取 User 模型，確保與自定義用戶模型的兼容性
# 這是 Django 推薦的做法，避免硬編碼用戶模型
User = get_user_model()

if TYPE_CHECKING:
    from accounts.models import User as UserType
else:
    UserType = 'User'


class ConversationService:
    """
    聊天室服務
    
    職責：
    - 管理聊天室的創建、更新、刪除
    - 處理聊天室成員管理
    - 管理聊天室權限
    """
    
    @staticmethod
    @transaction.atomic
    def create_private_chat(user1: UserType, user2: UserType) -> ChatRoom:
        """
        創建私人聊天室
        
        Args:
            user1: 第一個用戶
            user2: 第二個用戶
            
        Returns:
            ChatRoom: 聊天室實例
            
        Raises:
            ValidationException: 如果聊天室已存在
        """
        # 檢查是否已存在私人聊天室
        existing_room = ConversationService.get_private_chat_room(user1, user2)
        if existing_room:
            return existing_room
        
        # 創建新的私人聊天室
        room = ChatRoom.objects.create(
            type='private',
            name=f"私聊 - {user1.username} & {user2.username}",
            created_by=user1
        )
        
        # 添加成員
        ChatRoomMember.objects.bulk_create([
            ChatRoomMember(room=room, user=user1, role='member'),
            ChatRoomMember(room=room, user=user2, role='member')
        ])
        
        # 觸發創建事件
        ChatEventService.on_chat_room_created(room, user1)
        
        return room
    
    @staticmethod
    @transaction.atomic
    def create_group_chat(creator: UserType, name: str, members: List[UserType]) -> ChatRoom:
        """
        創建群組聊天室
        
        Args:
            creator: 創建者
            name: 群組名稱
            members: 群組成員列表
            
        Returns:
            ChatRoom: 聊天室實例
            
        Raises:
            ValidationException: 驗證失敗時
        """
        # 驗證群組名稱
        ChatValidationService.validate_group_name(name)
        
        # 驗證成員數量
        if len(members) > settings.MAX_GROUP_MEMBERS:
            raise ValidationException(f"群組成員不能超過 {settings.MAX_GROUP_MEMBERS} 人")
        
        # 創建群組聊天室
        room = ChatRoom.objects.create(
            type='group',
            name=name,
            created_by=creator
        )
        
        # 添加創建者為管理員
        ChatRoomMember.objects.create(
            room=room,
            user=creator,
            role='admin'
        )
        
        # 添加其他成員
        member_objects = [
            ChatRoomMember(room=room, user=user, role='member')
            for user in members if user != creator
        ]
        ChatRoomMember.objects.bulk_create(member_objects)
        
        # 觸發創建事件
        ChatEventService.on_chat_room_created(room, creator)
        
        return room
    
    @staticmethod
    def get_private_chat_room(user1: UserType, user2: UserType) -> Optional[ChatRoom]:
        """
        獲取兩個用戶之間的私人聊天室
        
        Args:
            user1: 第一個用戶
            user2: 第二個用戶
            
        Returns:
            Optional[ChatRoom]: 聊天室實例或 None
        """
        return ChatRoom.objects.filter(
            type='private'
        ).filter(
            members__user=user1
        ).filter(
            members__user=user2
        ).first()
    
    @staticmethod
    def get_user_chat_rooms(user: UserType) -> QuerySet[ChatRoom]:
        """
        獲取用戶的所有聊天室
        
        Args:
            user: 用戶實例
            
        Returns:
            QuerySet[ChatRoom]: 聊天室查詢集
        """
        return ChatRoom.objects.filter(
            members__user=user
        ).select_related(
            'created_by'
        ).prefetch_related(
            'members__user',
            'messages'
        ).annotate(
            last_message_time=Max('messages__created_at')
        ).order_by('-last_message_time')
    
    @staticmethod
    @transaction.atomic
    def add_member_to_room(room: ChatRoom, user: UserType, added_by: UserType) -> ChatRoomMember:
        """
        添加成員到聊天室
        
        Args:
            room: 聊天室實例
            user: 要添加的用戶
            added_by: 執行添加的用戶
            
        Returns:
            ChatRoomMember: 成員實例
            
        Raises:
            PermissionException: 沒有添加權限時
            ValidationException: 用戶已是成員時
        """
        # 檢查權限
        if not ChatPermissionService.can_add_member(room, added_by):
            raise PermissionException("您沒有權限添加成員")
        
        # 檢查用戶是否已是成員
        if ChatRoomMember.objects.filter(room=room, user=user).exists():
            raise ValidationException("用戶已是聊天室成員")
        
        # 添加成員
        member = ChatRoomMember.objects.create(
            room=room,
            user=user,
            role='member'
        )
        
        # 觸發添加成員事件
        ChatEventService.on_member_added(room, user, added_by)
        
        return member
    
    @staticmethod
    @transaction.atomic
    def remove_member_from_room(room: ChatRoom, user: UserType, removed_by: UserType) -> bool:
        """
        從聊天室移除成員
        
        Args:
            room: 聊天室實例
            user: 要移除的用戶
            removed_by: 執行移除的用戶
            
        Returns:
            bool: 是否成功移除
            
        Raises:
            PermissionException: 沒有移除權限時
        """
        # 檢查權限
        if not ChatPermissionService.can_remove_member(room, removed_by, user):
            raise PermissionException("您沒有權限移除此成員")
        
        # 移除成員
        deleted, _ = ChatRoomMember.objects.filter(room=room, user=user).delete()
        
        if deleted:
            # 觸發移除成員事件
            ChatEventService.on_member_removed(room, user, removed_by)
            return True
        
        return False


class MessageService:
    """
    訊息服務
    
    職責：
    - 處理訊息的發送、接收
    - 管理訊息歷史
    - 處理訊息狀態（已讀、未讀）
    """
    
    @staticmethod
    @transaction.atomic
    def send_message(
        sender: UserType,
        room: ChatRoom,
        content: str,
        message_type: str = 'text'
    ) -> Message:
        """
        發送訊息
        
        Args:
            sender: 發送者
            room: 聊天室
            content: 訊息內容
            message_type: 訊息類型
            
        Returns:
            Message: 訊息實例
            
        Raises:
            PermissionException: 沒有發送權限時
            ValidationException: 訊息驗證失敗時
        """
        # 檢查發送權限
        if not ChatPermissionService.can_send_message(room, sender):
            raise PermissionException("您沒有權限在此聊天室發送訊息")
        
        # 驗證訊息內容
        ChatValidationService.validate_message_content(content, message_type)
        
        # 創建訊息
        message = Message.objects.create(
            sender=sender,
            room=room,
            content=content,
            message_type=message_type
        )
        
        # 更新聊天室最後活動時間
        room.last_activity = timezone.now()
        room.save(update_fields=['last_activity'])
        
        # 觸發訊息發送事件
        ChatEventService.on_message_sent(message)
        
        return message
    
    @staticmethod
    def get_room_messages(
        room: ChatRoom,
        user: UserType,
        limit: int = 50,
        before_message_id: Optional[int] = None
    ) -> QuerySet[Message]:
        """
        獲取聊天室訊息
        
        Args:
            room: 聊天室實例
            user: 請求用戶
            limit: 限制數量
            before_message_id: 在指定訊息之前的訊息
            
        Returns:
            QuerySet[Message]: 訊息查詢集
            
        Raises:
            PermissionException: 沒有查看權限時
        """
        # 檢查查看權限
        if not ChatPermissionService.can_view_messages(room, user):
            raise PermissionException("您沒有權限查看此聊天室的訊息")
        
        queryset = Message.objects.filter(room=room).select_related('sender')
        
        # 如果指定了 before_message_id，則只獲取之前的訊息
        if before_message_id:
            queryset = queryset.filter(id__lt=before_message_id)
        
        return queryset.order_by('-created_at')[:limit]
    
    @staticmethod
    @transaction.atomic
    def mark_messages_as_read(
        room: ChatRoom,
        user: UserType,
        up_to_message_id: Optional[int] = None
    ) -> int:
        """
        標記訊息為已讀
        
        Args:
            room: 聊天室實例
            user: 用戶實例
            up_to_message_id: 標記到指定訊息為止
            
        Returns:
            int: 標記為已讀的訊息數量
        """
        # 獲取未讀訊息
        unread_messages = Message.objects.filter(
            room=room
        ).exclude(sender=user)
        
        if up_to_message_id:
            unread_messages = unread_messages.filter(id__lte=up_to_message_id)
        
        # 排除已讀訊息
        read_message_ids = MessageRead.objects.filter(
            user=user,
            message__room=room
        ).values_list('message_id', flat=True)
        
        unread_messages = unread_messages.exclude(id__in=read_message_ids)
        
        # 批量創建已讀記錄
        read_records = [
            MessageRead(user=user, message=message)
            for message in unread_messages
        ]
        
        MessageRead.objects.bulk_create(read_records, ignore_conflicts=True)
        
        # 觸發已讀事件
        if read_records:
            ChatEventService.on_messages_read(room, user, len(read_records))
        
        return len(read_records)
    
    @staticmethod
    def get_unread_count(user: UserType, room: Optional[ChatRoom] = None) -> Dict:
        """
        獲取未讀訊息數量
        
        Args:
            user: 用戶實例
            room: 聊天室實例（可選，如果指定則只統計該聊天室）
            
        Returns:
            Dict: 未讀統計
        """
        if room:
            # 統計指定聊天室的未讀數量
            total_messages = Message.objects.filter(room=room).exclude(sender=user).count()
            read_messages = MessageRead.objects.filter(
                user=user,
                message__room=room
            ).count()
            
            return {
                'room_id': room.id,
                'unread_count': total_messages - read_messages
            }
        else:
            # 統計所有聊天室的未讀數量
            user_rooms = ConversationService.get_user_chat_rooms(user)
            unread_data = {}
            
            for room in user_rooms:
                total_messages = Message.objects.filter(room=room).exclude(sender=user).count()
                read_messages = MessageRead.objects.filter(
                    user=user,
                    message__room=room
                ).count()
                
                unread_data[room.id] = total_messages - read_messages
            
            return {
                'rooms': unread_data,
                'total_unread': sum(unread_data.values())
            }


class ChatPermissionService:
    """
    聊天權限服務
    
    職責：
    - 檢查聊天相關權限
    - 提供統一的權限檢查接口
    """
    
    @staticmethod
    def can_send_message(room: ChatRoom, user: UserType) -> bool:
        """檢查是否可以發送訊息"""
        # 檢查用戶是否是聊天室成員
        return ChatRoomMember.objects.filter(room=room, user=user).exists()
    
    @staticmethod
    def can_view_messages(room: ChatRoom, user: UserType) -> bool:
        """檢查是否可以查看訊息"""
        return ChatPermissionService.can_send_message(room, user)
    
    @staticmethod
    def can_add_member(room: ChatRoom, user: UserType) -> bool:
        """檢查是否可以添加成員"""
        if room.type == 'private':
            return False  # 私人聊天室不能添加成員
        
        # 檢查用戶是否是管理員
        member = ChatRoomMember.objects.filter(room=room, user=user).first()
        return member and member.role in ['admin', 'owner']
    
    @staticmethod
    def can_remove_member(room: ChatRoom, remover: UserType, target_user: UserType) -> bool:
        """檢查是否可以移除成員"""
        if room.type == 'private':
            return False  # 私人聊天室不能移除成員
        
        # 用戶可以移除自己
        if remover == target_user:
            return True
        
        # 檢查移除者的權限
        remover_member = ChatRoomMember.objects.filter(room=room, user=remover).first()
        if not remover_member or remover_member.role not in ['admin', 'owner']:
            return False
        
        # 檢查目標用戶的角色
        target_member = ChatRoomMember.objects.filter(room=room, user=target_user).first()
        if not target_member:
            return False
        
        # 管理員不能移除擁有者
        if target_member.role == 'owner':
            return remover_member.role == 'owner'
        
        return True
    
    @staticmethod
    def can_delete_message(message: Message, user: UserType) -> bool:
        """檢查是否可以刪除訊息"""
        # 用戶可以刪除自己的訊息
        if message.sender == user:
            return True
        
        # 聊天室管理員可以刪除任何訊息
        member = ChatRoomMember.objects.filter(room=message.room, user=user).first()
        return member and member.role in ['admin', 'owner']


class ChatValidationService:
    """
    聊天驗證服務
    
    職責：
    - 驗證聊天相關數據
    - 提供統一的驗證邏輯
    """
    
    @staticmethod
    def validate_message_content(content: str, message_type: str) -> None:
        """
        驗證訊息內容
        
        Args:
            content: 訊息內容
            message_type: 訊息類型
            
        Raises:
            ValidationException: 驗證失敗時
        """
        if not content or not content.strip():
            raise ValidationException("訊息內容不能為空")
        
        if message_type == 'text':
            if len(content) > 2000:
                raise ValidationException("文字訊息不能超過 2000 個字符")
        elif message_type == 'image':
            # 這裡可以添加圖片驗證邏輯
            pass
        elif message_type == 'file':
            # 這裡可以添加文件驗證邏輯
            pass
    
    @staticmethod
    def validate_group_name(name: str) -> None:
        """
        驗證群組名稱
        
        Args:
            name: 群組名稱
            
        Raises:
            ValidationException: 驗證失敗時
        """
        if not name or not name.strip():
            raise ValidationException("群組名稱不能為空")
        
        if len(name.strip()) < 2:
            raise ValidationException("群組名稱至少需要 2 個字符")
        
        if len(name) > 100:
            raise ValidationException("群組名稱不能超過 100 個字符")


class ChatEventService:
    """
    聊天事件服務
    
    職責：
    - 處理聊天相關事件
    - 觸發通知和其他副作用
    """
    
    @staticmethod
    def on_chat_room_created(room: ChatRoom, creator: UserType) -> None:
        """聊天室創建後的處理"""
        # 這裡可以發送通知或記錄日誌
        pass
    
    @staticmethod
    def on_message_sent(message: Message) -> None:
        """訊息發送後的處理"""
        # 使用 WebSocket 廣播訊息給聊天室成員
        from .consumers import ChatConsumer
        ChatConsumer.broadcast_message(message)
        
        # 發送推送通知給離線用戶
        from notifications.services import NotificationService
        
        # 獲取聊天室成員並發送通知給離線用戶
        for member in message.room.members.all():
            if member.user != message.sender and not OnlineStatusService.is_user_online(member.user):
                NotificationService.create_message_notification(
                    actor=message.sender,
                    recipient=member.user,
                    target_object=message
                )
    
    @staticmethod
    def on_member_added(room: ChatRoom, user: UserType, added_by: UserType) -> None:
        """成員添加後的處理"""
        # 發送系統訊息
        MessageService.send_message(
            sender=added_by,
            room=room,
            content=f"{user.username} 已加入聊天室",
            message_type='system'
        )
    
    @staticmethod
    def on_member_removed(room: ChatRoom, user: UserType, removed_by: UserType) -> None:
        """成員移除後的處理"""
        # 發送系統訊息
        if user != removed_by:
            MessageService.send_message(
                sender=removed_by,
                room=room,
                content=f"{user.username} 已離開聊天室",
                message_type='system'
            )
    
    @staticmethod
    def on_messages_read(room: ChatRoom, user: UserType, count: int) -> None:
        """訊息已讀後的處理"""
        # 使用 WebSocket 通知其他用戶
        from .consumers import ChatConsumer
        ChatConsumer.broadcast_read_status(room, user, count)


class ChatStatisticsService:
    """
    聊天統計服務
    
    職責：
    - 提供聊天統計數據
    - 分析聊天活動
    """
    
    @staticmethod
    def get_room_stats(room: ChatRoom) -> Dict:
        """
        獲取聊天室統計數據
        
        Args:
            room: 聊天室實例
            
        Returns:
            Dict: 統計數據
        """
        return {
            'members_count': room.members.count(),
            'messages_count': room.messages.count(),
            'active_members': ChatStatisticsService._get_active_members_count(room),
            'last_activity': room.last_activity,
        }
    
    @staticmethod
    def get_user_chat_stats(user: UserType, days: int = 30) -> Dict:
        """
        獲取用戶聊天統計
        
        Args:
            user: 用戶實例
            days: 統計天數
            
        Returns:
            Dict: 統計數據
        """
        from datetime import timedelta
        start_date = timezone.now() - timedelta(days=days)
        
        messages_sent = Message.objects.filter(
            sender=user,
            created_at__gte=start_date
        ).count()
        
        rooms_count = ChatRoomMember.objects.filter(user=user).count()
        
        return {
            'messages_sent': messages_sent,
            'chat_rooms_count': rooms_count,
            'average_messages_per_day': messages_sent / days if days > 0 else 0,
        }
    
    @staticmethod
    def _get_active_members_count(room: ChatRoom, hours: int = 24) -> int:
        """獲取活躍成員數量"""
        from datetime import timedelta
        cutoff_time = timezone.now() - timedelta(hours=hours)
        
        return Message.objects.filter(
            room=room,
            created_at__gte=cutoff_time
        ).values('sender').distinct().count()


class OnlineStatusService:
    """
    在線狀態服務
    
    職責：
    - 管理用戶在線狀態
    - 處理用戶活動追蹤
    """
    
    @staticmethod
    def set_user_online(user: UserType) -> None:
        """設置用戶為在線狀態"""
        cache_key = f"user_online_{user.id}"
        cache.set(cache_key, True, 300)  # 5 分鐘過期
    
    @staticmethod
    def set_user_offline(user: UserType) -> None:
        """設置用戶為離線狀態"""
        cache_key = f"user_online_{user.id}"
        cache.delete(cache_key)
    
    @staticmethod
    def is_user_online(user: UserType) -> bool:
        """檢查用戶是否在線"""
        cache_key = f"user_online_{user.id}"
        return cache.get(cache_key, False)
    
    @staticmethod
    def get_online_users_in_room(room: ChatRoom) -> List[UserType]:
        """獲取聊天室中的在線用戶"""
        room_members = room.members.select_related('user').all()
        online_users = []
        
        for member in room_members:
            if OnlineStatusService.is_user_online(member.user):
                online_users.append(member.user)
        
        return online_users
    
    @staticmethod
    def update_last_seen(user: UserType) -> None:
        """更新用戶最後活動時間"""
        cache_key = f"user_last_seen_{user.id}"
        cache.set(cache_key, timezone.now(), 86400)  # 24 小時過期
    
    @staticmethod
    def get_last_seen(user: UserType) -> Optional[timezone.datetime]:
        """獲取用戶最後活動時間"""
        cache_key = f"user_last_seen_{user.id}"
        return cache.get(cache_key) 