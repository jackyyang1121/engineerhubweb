import logging
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import Conversation, Message, UserConversationState
from .serializers import (
    ConversationSerializer, MessageSerializer, UserConversationStateSerializer
)

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.chat')

class ConversationViewSet(viewsets.ModelViewSet):
    """
    對話視圖集，提供對話相關操作的 API 端點
    
    提供對話創建、查詢等功能
    """
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['updated_at', 'created_at']
    ordering = ['-updated_at']
    
    def get_queryset(self):
        """
        獲取當前用戶參與的對話
        """
        user = self.request.user
        return Conversation.objects.filter(participants=user)
    
    def perform_create(self, serializer):
        """
        創建對話
        """
        try:
            serializer.save()
            logger.info(f"用戶 {self.request.user.username} 創建了新對話")
        except Exception as e:
            logger.error(f"對話創建失敗: {str(e)}")
            raise ValidationError(f"對話創建失敗: {str(e)}")
    
    def destroy(self, request, *args, **kwargs):
        """
        刪除對話（實際上是將對話標記為已封存）
        """
        conversation = self.get_object()
        user = request.user
        
        try:
            # 獲取或創建用戶對話狀態
            state, created = UserConversationState.objects.get_or_create(
                user=user,
                conversation=conversation
            )
            
            # 將對話標記為已封存
            state.is_archived = True
            state.save(update_fields=['is_archived'])
            
            logger.info(f"用戶 {user.username} 封存了對話 {conversation.id}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"封存對話失敗: {str(e)}")
            return Response(
                {"detail": f"封存對話失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """
        將對話標記為未封存
        """
        conversation = self.get_object()
        user = request.user
        
        try:
            # 獲取用戶對話狀態
            state = get_object_or_404(
                UserConversationState,
                user=user,
                conversation=conversation
            )
            
            # 將對話標記為未封存
            state.is_archived = False
            state.save(update_fields=['is_archived'])
            
            logger.info(f"用戶 {user.username} 取消封存了對話 {conversation.id}")
            return Response({"detail": "對話已取消封存"})
        except Exception as e:
            logger.error(f"取消封存對話失敗: {str(e)}")
            return Response(
                {"detail": f"取消封存對話失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def read_all(self, request, pk=None):
        """
        將對話中的所有訊息標記為已讀
        """
        conversation = self.get_object()
        user = request.user
        
        try:
            with transaction.atomic():
                # 將所有未讀訊息標記為已讀
                unread_messages = Message.objects.filter(
                    conversation=conversation,
                    sender__is_not=user,
                    is_read=False
                )
                
                current_time = timezone.now()
                for message in unread_messages:
                    message.is_read = True
                    message.read_at = current_time
                    message.save(update_fields=['is_read', 'read_at'])
                
                # 更新用戶對話狀態
                state, created = UserConversationState.objects.get_or_create(
                    user=user,
                    conversation=conversation
                )
                state.unread_count = 0
                state.last_read_at = current_time
                state.save(update_fields=['unread_count', 'last_read_at'])
                
                logger.info(f"用戶 {user.username} 將對話 {conversation.id} 中的所有訊息標記為已讀")
                return Response({"detail": "所有訊息已標記為已讀"})
        except Exception as e:
            logger.error(f"標記所有訊息為已讀失敗: {str(e)}")
            return Response(
                {"detail": f"標記所有訊息為已讀失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MessageViewSet(viewsets.ModelViewSet):
    """
    訊息視圖集，提供訊息相關操作的 API 端點
    
    提供訊息創建、查詢等功能
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        獲取當前用戶能看到的訊息
        """
        user = self.request.user
        return Message.objects.filter(conversation__participants=user)
    
    def list(self, request, *args, **kwargs):
        """
        獲取指定對話的訊息列表
        """
        conversation_id = request.query_params.get('conversation')
        if not conversation_id:
            logger.warning("未提供對話ID")
            return Response(
                {"detail": "未提供對話ID"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 獲取對話
            conversation = get_object_or_404(Conversation, id=conversation_id)
            
            # 檢查用戶是否是對話的參與者
            if not conversation.participants.filter(id=request.user.id).exists():
                logger.warning(f"用戶 {request.user.username} 嘗試獲取不屬於他的對話 {conversation_id} 的訊息")
                return Response(
                    {"detail": "您不是該對話的參與者"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # 獲取對話的訊息
            messages = Message.objects.filter(conversation=conversation).order_by('created_at')
            
            # 分頁與序列化
            page = self.paginate_queryset(messages)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(messages, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取訊息列表失敗: {str(e)}")
            return Response(
                {"detail": f"獲取訊息列表失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_create(self, serializer):
        """
        創建訊息
        """
        try:
            message = serializer.save(sender=self.request.user)
            logger.info(f"用戶 {self.request.user.username} 發送了新訊息")
        except Exception as e:
            logger.error(f"訊息創建失敗: {str(e)}")
            raise ValidationError(f"訊息創建失敗: {str(e)}")
    
    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """
        將訊息標記為已讀
        """
        message = self.get_object()
        user = request.user
        
        try:
            # 只能標記別人發送的訊息為已讀
            if message.sender == user:
                logger.warning(f"用戶 {user.username} 嘗試將自己發送的訊息標記為已讀")
                return Response(
                    {"detail": "不能將自己發送的訊息標記為已讀"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 標記訊息為已讀
            if not message.is_read:
                message.mark_as_read(user)
                
                # 更新用戶對話狀態
                state, created = UserConversationState.objects.get_or_create(
                    user=user,
                    conversation=message.conversation
                )
                state.update_unread_count()
                
                logger.info(f"用戶 {user.username} 將訊息 {message.id} 標記為已讀")
            
            return Response({"detail": "訊息已標記為已讀"})
        except Exception as e:
            logger.error(f"標記訊息為已讀失敗: {str(e)}")
            return Response(
                {"detail": f"標記訊息為已讀失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 