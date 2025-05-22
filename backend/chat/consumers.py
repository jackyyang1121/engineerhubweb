import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Conversation, Message, UserConversationState

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.chat')

class ChatConsumer(AsyncWebsocketConsumer):
    """
    聊天 WebSocket 消費者
    
    處理聊天相關的 WebSocket 連接與訊息傳輸
    """
    async def connect(self):
        """
        建立 WebSocket 連接
        """
        self.user = self.scope['user']
        
        # 未登入用戶不允許連接
        if self.user.is_anonymous:
            logger.warning("匿名用戶嘗試連接聊天 WebSocket")
            await self.close()
            return
        
        # 獲取對話 ID
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        
        # 檢查用戶是否是對話的參與者
        is_participant = await self.is_conversation_participant(self.user.id, self.conversation_id)
        if not is_participant:
            logger.warning(f"用戶 {self.user.username} 嘗試連接不屬於他的對話 {self.conversation_id}")
            await self.close()
            return
        
        # 將用戶添加到對話組
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # 更新用戶在線狀態
        await self.update_user_online_status(self.user.id, True)
        
        # 發送用戶在線狀態給組內其他成員
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_online',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'is_online': True
            }
        )
        
        logger.info(f"用戶 {self.user.username} 連接到對話 {self.conversation_id}")
        await self.accept()
    
    async def disconnect(self, close_code):
        """
        關閉 WebSocket 連接
        """
        if hasattr(self, 'room_group_name'):
            # 將用戶從對話組中移除
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            # 更新用戶在線狀態
            await self.update_user_online_status(self.user.id, False)
            
            # 發送用戶離線狀態給組內其他成員
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_online',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'is_online': False
                }
            )
            
            logger.info(f"用戶 {self.user.username} 斷開與對話 {self.conversation_id} 的連接")
    
    async def receive(self, text_data):
        """
        接收 WebSocket 訊息
        """
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'chat_message':
                # 處理聊天訊息
                content = text_data_json.get('content', '').strip()
                if not content:
                    logger.warning(f"用戶 {self.user.username} 嘗試發送空訊息")
                    return
                
                # 創建訊息
                message = await self.create_message(
                    self.user.id,
                    self.conversation_id,
                    content
                )
                
                # 發送訊息給組內所有成員
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message_id': str(message['id']),
                        'sender_id': str(self.user.id),
                        'sender_username': self.user.username,
                        'content': content,
                        'created_at': message['created_at'].isoformat()
                    }
                )
                
                logger.info(f"用戶 {self.user.username} 在對話 {self.conversation_id} 發送了訊息")
            
            elif message_type == 'read_message':
                # 處理訊息已讀
                message_id = text_data_json.get('message_id')
                if not message_id:
                    logger.warning(f"用戶 {self.user.username} 嘗試標記訊息為已讀但未提供訊息ID")
                    return
                
                # 標記訊息為已讀
                success = await self.mark_message_as_read(
                    message_id,
                    self.user.id,
                    self.conversation_id
                )
                
                if success:
                    # 發送訊息已讀狀態給組內所有成員
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'message_read',
                            'message_id': message_id,
                            'reader_id': str(self.user.id),
                            'reader_username': self.user.username
                        }
                    )
                    
                    logger.info(f"用戶 {self.user.username} 標記訊息 {message_id} 為已讀")
            
            elif message_type == 'typing':
                # 處理正在輸入狀態
                is_typing = text_data_json.get('is_typing', False)
                
                # 發送正在輸入狀態給組內其他成員
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_typing',
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'is_typing': is_typing
                    }
                )
                
                if is_typing:
                    logger.debug(f"用戶 {self.user.username} 正在輸入...")
            
            else:
                logger.warning(f"未知的訊息類型: {message_type}")
        except json.JSONDecodeError:
            logger.error(f"無效的 JSON 格式: {text_data}")
        except Exception as e:
            logger.error(f"處理訊息時發生錯誤: {str(e)}")
    
    async def chat_message(self, event):
        """
        發送聊天訊息給 WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message_id': event['message_id'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'content': event['content'],
            'created_at': event['created_at']
        }))
    
    async def message_read(self, event):
        """
        發送訊息已讀狀態給 WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_id': event['message_id'],
            'reader_id': event['reader_id'],
            'reader_username': event['reader_username']
        }))
    
    async def user_online(self, event):
        """
        發送用戶在線狀態給 WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': 'user_online',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_online': event['is_online']
        }))
    
    async def user_typing(self, event):
        """
        發送用戶正在輸入狀態給 WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': 'user_typing',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_typing': event['is_typing']
        }))
    
    @database_sync_to_async
    def is_conversation_participant(self, user_id, conversation_id):
        """
        檢查用戶是否是對話的參與者
        """
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            return conversation.participants.filter(id=user_id).exists()
        except Conversation.DoesNotExist:
            logger.error(f"對話不存在: {conversation_id}")
            return False
        except Exception as e:
            logger.error(f"檢查對話參與者時發生錯誤: {str(e)}")
            return False
    
    @database_sync_to_async
    def create_message(self, user_id, conversation_id, content):
        """
        創建訊息
        """
        try:
            User = get_user_model()
            user = User.objects.get(id=user_id)
            conversation = Conversation.objects.get(id=conversation_id)
            
            # 創建訊息
            message = Message.objects.create(
                conversation=conversation,
                sender=user,
                content=content,
                message_type=Message.MessageType.TEXT
            )
            
            # 更新對話的更新時間
            conversation.updated_at = timezone.now()
            conversation.save(update_fields=['updated_at'])
            
            # 更新其他參與者的未讀消息數
            for participant in conversation.participants.exclude(id=user_id):
                state, created = UserConversationState.objects.get_or_create(
                    user=participant,
                    conversation=conversation
                )
                state.unread_count += 1
                state.save(update_fields=['unread_count'])
            
            return {
                'id': message.id,
                'created_at': message.created_at
            }
        except Exception as e:
            logger.error(f"創建訊息時發生錯誤: {str(e)}")
            raise
    
    @database_sync_to_async
    def mark_message_as_read(self, message_id, user_id, conversation_id):
        """
        將訊息標記為已讀
        """
        try:
            User = get_user_model()
            user = User.objects.get(id=user_id)
            message = Message.objects.get(
                id=message_id,
                conversation_id=conversation_id
            )
            
            # 只能標記別人發送的訊息為已讀
            if message.sender.id == user_id:
                logger.warning(f"用戶 {user.username} 嘗試將自己發送的訊息標記為已讀")
                return False
            
            # 標記訊息為已讀
            if not message.is_read:
                message.is_read = True
                message.read_at = timezone.now()
                message.save(update_fields=['is_read', 'read_at'])
                
                # 更新用戶對話狀態
                state, created = UserConversationState.objects.get_or_create(
                    user=user,
                    conversation_id=conversation_id
                )
                state.update_unread_count()
            
            return True
        except Message.DoesNotExist:
            logger.error(f"訊息不存在: {message_id}")
            return False
        except Exception as e:
            logger.error(f"標記訊息為已讀時發生錯誤: {str(e)}")
            return False
    
    @database_sync_to_async
    def update_user_online_status(self, user_id, is_online):
        """
        更新用戶在線狀態
        """
        try:
            User = get_user_model()
            user = User.objects.get(id=user_id)
            user.is_online = is_online
            user.last_online = timezone.now()
            user.save(update_fields=['is_online', 'last_online'])
            return True
        except Exception as e:
            logger.error(f"更新用戶在線狀態時發生錯誤: {str(e)}")
            return False 