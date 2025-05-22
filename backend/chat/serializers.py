import logging
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import Conversation, Message, UserConversationState
from users.serializers import UserSerializer

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.chat')

class MessageSerializer(serializers.ModelSerializer):
    """
    訊息序列化器
    """
    sender_details = UserSerializer(source='sender', read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_details', 'content',
            'message_type', 'file', 'created_at', 'is_read', 'read_at'
        ]
        read_only_fields = [
            'id', 'sender_details', 'created_at', 'is_read', 'read_at'
        ]
    
    def validate_file(self, value):
        """
        驗證文件大小
        """
        if value and value.size > 10 * 1024 * 1024:  # 10MB
            logger.warning(f"文件大小超過限制: {value.size} bytes")
            raise serializers.ValidationError("文件大小不能超過 10MB")
        return value
    
    def validate(self, data):
        """
        驗證訊息數據
        """
        # 檢查訊息類型與內容是否匹配
        message_type = data.get('message_type')
        content = data.get('content', '').strip()
        file = data.get('file')
        
        if message_type == Message.MessageType.TEXT and not content:
            logger.warning("文字訊息內容為空")
            raise serializers.ValidationError("文字訊息內容不能為空")
        
        if message_type in [Message.MessageType.IMAGE, Message.MessageType.VIDEO, Message.MessageType.FILE] and not file:
            logger.warning(f"{message_type} 訊息缺少文件")
            raise serializers.ValidationError(f"{message_type} 訊息必須上傳文件")
        
        # 檢查發送者是否是對話的參與者
        conversation = data.get('conversation')
        sender = self.context['request'].user
        
        if not conversation.participants.filter(id=sender.id).exists():
            logger.warning(f"用戶 {sender.username} 不是對話 {conversation.id} 的參與者")
            raise serializers.ValidationError("您不是該對話的參與者")
        
        return data
    
    def create(self, validated_data):
        """
        創建訊息
        """
        sender = self.context['request'].user
        validated_data['sender'] = sender
        
        try:
            with transaction.atomic():
                # 創建訊息
                message = Message.objects.create(**validated_data)
                
                # 更新對話的更新時間
                conversation = validated_data['conversation']
                conversation.updated_at = timezone.now()
                conversation.save(update_fields=['updated_at'])
                
                # 更新其他參與者的未讀消息數
                for participant in conversation.participants.exclude(id=sender.id):
                    state, created = UserConversationState.objects.get_or_create(
                        user=participant,
                        conversation=conversation
                    )
                    state.unread_count += 1
                    state.save(update_fields=['unread_count'])
                
                logger.info(f"用戶 {sender.username} 在對話 {conversation.id} 發送了新訊息")
                return message
        except Exception as e:
            logger.error(f"創建訊息失敗: {str(e)}")
            raise serializers.ValidationError(f"創建訊息失敗: {str(e)}")


class ConversationSerializer(serializers.ModelSerializer):
    """
    對話序列化器
    """
    participants_details = UserSerializer(source='participants', many=True, read_only=True)
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'participants', 'participants_details',
            'created_at', 'updated_at', 'latest_message', 'unread_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_latest_message(self, obj):
        """
        獲取最新的訊息
        """
        latest_message = obj.messages.order_by('-created_at').first()
        if latest_message:
            return MessageSerializer(latest_message).data
        return None
    
    def get_unread_count(self, obj):
        """
        獲取當前用戶在該對話中的未讀訊息數
        """
        user = self.context['request'].user
        try:
            state = UserConversationState.objects.get(user=user, conversation=obj)
            return state.unread_count
        except UserConversationState.DoesNotExist:
            return 0
    
    def validate_participants(self, value):
        """
        驗證參與者
        """
        # 確保當前用戶是參與者之一
        current_user = self.context['request'].user
        if current_user not in value:
            logger.warning(f"用戶 {current_user.username} 嘗試創建不包含自己的對話")
            raise serializers.ValidationError("您必須是對話的參與者之一")
        
        # 確保參與者不重複
        if len(value) != len(set(value)):
            logger.warning("對話參與者有重複")
            raise serializers.ValidationError("對話參與者不能重複")
        
        # 確保參與者數量不超過限制
        if len(value) > 10:
            logger.warning(f"對話參與者數量 {len(value)} 超過限制")
            raise serializers.ValidationError("對話參與者數量不能超過 10 人")
        
        return value
    
    def create(self, validated_data):
        """
        創建對話
        """
        participants = validated_data.pop('participants', [])
        
        try:
            with transaction.atomic():
                # 檢查是否已經存在相同參與者的對話
                if len(participants) == 2:
                    existing_conversations = Conversation.objects.filter(participants__in=[participants[0]]).filter(participants__in=[participants[1]])
                    for conv in existing_conversations:
                        if set(conv.participants.all()) == set(participants):
                            logger.info(f"返回已存在的對話: {conv.id}")
                            return conv
                
                # 創建新對話
                conversation = Conversation.objects.create(**validated_data)
                
                # 添加參與者
                conversation.participants.set(participants)
                
                # 創建參與者的對話狀態
                for participant in participants:
                    UserConversationState.objects.create(
                        user=participant,
                        conversation=conversation
                    )
                
                logger.info(f"創建新對話: {conversation.id}, 參與者: {[p.username for p in participants]}")
                return conversation
        except Exception as e:
            logger.error(f"創建對話失敗: {str(e)}")
            raise serializers.ValidationError(f"創建對話失敗: {str(e)}")


class UserConversationStateSerializer(serializers.ModelSerializer):
    """
    用戶對話狀態序列化器
    """
    class Meta:
        model = UserConversationState
        fields = [
            'id', 'user', 'conversation', 'is_archived',
            'unread_count', 'last_read_at'
        ]
        read_only_fields = ['id', 'user', 'conversation', 'unread_count', 'last_read_at'] 