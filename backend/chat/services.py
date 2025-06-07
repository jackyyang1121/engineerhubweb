"""
聊天服務層
處理聊天室和消息相關的業務邏輯
"""

from typing import Optional, List, Dict, Any
from django.db import transaction
from django.db.models import QuerySet, Q, F, Max
from django.contrib.auth import get_user_model
from django.utils import timezone
from channels.db import database_sync_to_async
import json

from core.services import BaseService, register_service, ServiceError, NotFoundError, PermissionError, BusinessLogicError
from .models import Conversation, Message, MessageStatus
import logging

User = get_user_model()


@register_service('chat_service')
class ChatService(BaseService[Conversation]):
    """聊天核心服務"""
    model_class = Conversation
    logger_name = 'engineerhub.chat.service'
    
    def create_or_get_conversation(self, user1: User, user2: User) -> Conversation:
        """
        創建或獲取兩個用戶之間的對話
        
        Args:
            user1: 第一個用戶
            user2: 第二個用戶
            
        Returns:
            Conversation: 對話實例
        """
        if user1 == user2:
            raise BusinessLogicError("不能與自己對話")
        
        # 嘗試找到現有的對話
        conversation = Conversation.objects.filter(
            participants=user1
        ).filter(
            participants=user2
        ).first()
        
        if conversation:
            return conversation
        
        # 創建新對話
        try:
            with transaction.atomic():
                conversation = Conversation.objects.create()
                conversation.participants.add(user1, user2)
                
                self.logger.info(f"Created conversation between {user1.username} and {user2.username}")
                return conversation
                
        except Exception as e:
            self.logger.error(f"Failed to create conversation: {str(e)}")
            raise ServiceError("創建對話失敗", details={"error": str(e)})
    
    def get_user_conversations(self, user: User) -> QuerySet[Conversation]:
        """
        獲取用戶的所有對話
        
        Args:
            user: 用戶
            
        Returns:
            QuerySet[Conversation]: 對話查詢集
        """
        return Conversation.objects.filter(
            participants=user
        ).annotate(
            last_message_time=Max('messages__created_at')
        ).order_by('-last_message_time')
    
    def get_conversation_by_id(self, conversation_id: int, user: User) -> Conversation:
        """
        根據 ID 獲取對話
        
        Args:
            conversation_id: 對話 ID
            user: 請求用戶
            
        Returns:
            Conversation: 對話實例
        """
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            
            # 檢查用戶是否是參與者
            if not conversation.participants.filter(id=user.id).exists():
                raise PermissionError("您沒有權限訪問此對話")
            
            return conversation
            
        except Conversation.DoesNotExist:
            raise NotFoundError("對話不存在")
    
    def mark_conversation_as_read(self, conversation: Conversation, user: User) -> None:
        """
        標記對話中的所有消息為已讀
        
        Args:
            conversation: 對話
            user: 讀取的用戶
        """
        MessageStatus.objects.filter(
            message__conversation=conversation,
            user=user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )


@register_service('message_service')
class MessageService(BaseService[Message]):
    """消息服務"""
    model_class = Message
    logger_name = 'engineerhub.chat.message'
    
    def send_message(self, sender: User, conversation: Conversation, 
                    content: str, message_type: str = 'text') -> Message:
        """
        發送消息
        
        Args:
            sender: 發送者
            conversation: 對話
            content: 消息內容
            message_type: 消息類型
            
        Returns:
            Message: 創建的消息
        """
        # 檢查發送者是否是對話參與者
        if not conversation.participants.filter(id=sender.id).exists():
            raise PermissionError("您不是此對話的參與者")
        
        # 驗證消息內容
        if not content or len(content.strip()) == 0:
            raise BusinessLogicError("消息內容不能為空")
        
        if len(content) > 5000:
            raise BusinessLogicError("消息內容不能超過 5000 個字元")
        
        try:
            with transaction.atomic():
                # 創建消息
                message = Message.objects.create(
                    conversation=conversation,
                    sender=sender,
                    content=content,
                    message_type=message_type
                )
                
                # 為每個參與者創建消息狀態
                for participant in conversation.participants.all():
                    MessageStatus.objects.create(
                        message=message,
                        user=participant,
                        is_read=(participant == sender),
                        read_at=timezone.now() if participant == sender else None
                    )
                
                # 更新對話的最後消息時間
                conversation.last_message_at = timezone.now()
                conversation.save(update_fields=['last_message_at'])
                
                self.logger.info(f"User {sender.username} sent message in conversation {conversation.id}")
                return message
                
        except Exception as e:
            self.logger.error(f"Failed to send message: {str(e)}")
            raise ServiceError("發送消息失敗", details={"error": str(e)})
    
    def get_conversation_messages(self, conversation: Conversation, user: User, 
                                 limit: int = 50, before: Optional[int] = None) -> List[Message]:
        """
        獲取對話的消息歷史
        
        Args:
            conversation: 對話
            user: 請求用戶
            limit: 消息數量限制
            before: 在此 ID 之前的消息
            
        Returns:
            List[Message]: 消息列表
        """
        # 檢查用戶是否是參與者
        if not conversation.participants.filter(id=user.id).exists():
            raise PermissionError("您不是此對話的參與者")
        
        queryset = Message.objects.filter(conversation=conversation)
        
        if before:
            queryset = queryset.filter(id__lt=before)
        
        messages = queryset.order_by('-created_at')[:limit]
        return list(reversed(messages))
    
    def delete_message(self, message: Message, user: User) -> None:
        """
        刪除消息
        
        Args:
            message: 要刪除的消息
            user: 請求用戶
        """
        # 只有發送者可以刪除自己的消息
        if message.sender != user:
            raise PermissionError("您只能刪除自己的消息")
        
        # 檢查消息是否太舊（超過24小時）
        if (timezone.now() - message.created_at).days >= 1:
            raise BusinessLogicError("消息發送超過24小時，無法刪除")
        
        try:
            message.is_deleted = True
            message.content = "[此消息已被刪除]"
            message.save()
            
            self.logger.info(f"User {user.username} deleted message {message.id}")
            
        except Exception as e:
            self.logger.error(f"Failed to delete message: {str(e)}")
            raise ServiceError("刪除消息失敗", details={"error": str(e)})
    
    def get_unread_count(self, user: User) -> int:
        """
        獲取用戶的未讀消息數
        
        Args:
            user: 用戶
            
        Returns:
            int: 未讀消息數
        """
        return MessageStatus.objects.filter(
            user=user,
            is_read=False
        ).count()
    
    def search_messages(self, user: User, query: str, 
                       conversation: Optional[Conversation] = None) -> QuerySet[Message]:
        """
        搜尋消息
        
        Args:
            user: 用戶
            query: 搜尋關鍵字
            conversation: 限定在特定對話內搜尋
            
        Returns:
            QuerySet[Message]: 搜尋結果
        """
        # 獲取用戶參與的對話
        user_conversations = Conversation.objects.filter(participants=user)
        
        queryset = Message.objects.filter(
            conversation__in=user_conversations,
            content__icontains=query,
            is_deleted=False
        )
        
        if conversation:
            queryset = queryset.filter(conversation=conversation)
        
        return queryset.select_related('sender', 'conversation').order_by('-created_at')[:100]
    
    # 異步方法（用於 WebSocket）
    @database_sync_to_async
    def async_send_message(self, sender: User, conversation: Conversation, 
                          content: str, message_type: str = 'text') -> Message:
        """異步發送消息（用於 WebSocket）"""
        return self.send_message(sender, conversation, content, message_type)
    
    @database_sync_to_async
    def async_mark_as_read(self, message: Message, user: User) -> None:
        """異步標記消息為已讀"""
        MessageStatus.objects.filter(
            message=message,
            user=user
        ).update(
            is_read=True,
            read_at=timezone.now()
        )