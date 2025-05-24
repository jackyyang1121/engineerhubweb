import logging
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from .models import Notification, NotificationSettings, NotificationTemplate, NotificationType
from accounts.serializers import UserSerializer

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.notifications')


class NotificationSerializer(serializers.ModelSerializer):
    """
    通知序列化器
    """
    actor_details = UserSerializer(source='actor', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    target_object_type = serializers.SerializerMethodField()
    time_since = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'actor', 'actor_details', 'type', 'type_display',
            'title', 'message', 'data', 'is_read', 'is_sent',
            'created_at', 'read_at', 'expires_at', 'target_object_type',
            'time_since'
        ]
        read_only_fields = [
            'id', 'recipient', 'actor_details', 'type_display',
            'created_at', 'read_at', 'target_object_type', 'time_since'
        ]
    
    def get_target_object_type(self, obj):
        """
        獲取目標對象的類型名稱
        """
        if obj.content_type:
            return obj.content_type.model
        return None
    
    def get_time_since(self, obj):
        """
        獲取通知創建以來的時間描述
        """
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "剛剛"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes}分鐘前"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours}小時前"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days}天前"
        else:
            return obj.created_at.strftime("%Y-%m-%d")


class NotificationCreateSerializer(serializers.ModelSerializer):
    """
    創建通知的序列化器
    """
    target_content_type = serializers.CharField(write_only=True, required=False)
    target_object_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = Notification
        fields = [
            'recipient', 'actor', 'type', 'title', 'message', 'data',
            'target_content_type', 'target_object_id', 'expires_at'
        ]
    
    def validate_type(self, value):
        """
        驗證通知類型
        """
        if value not in [choice[0] for choice in NotificationType.choices]:
            raise serializers.ValidationError("無效的通知類型")
        return value
    
    def validate(self, attrs):
        """
        自定義驗證
        """
        # 檢查接收者不能是觸發者（除了系統通知）
        recipient = attrs.get('recipient')
        actor = attrs.get('actor')
        
        if actor and recipient == actor and attrs.get('type') != NotificationType.SYSTEM:
            raise serializers.ValidationError("用戶不能給自己發送通知")
        
        # 處理目標對象
        target_content_type = attrs.pop('target_content_type', None)
        target_object_id = attrs.pop('target_object_id', None)
        
        if target_content_type and target_object_id:
            try:
                content_type = ContentType.objects.get(model=target_content_type)
                attrs['content_type'] = content_type
                attrs['object_id'] = target_object_id
            except ContentType.DoesNotExist:
                raise serializers.ValidationError("無效的目標對象類型")
        
        return attrs
    
    def create(self, validated_data):
        """
        創建通知
        """
        try:
            with transaction.atomic():
                notification = Notification.objects.create(**validated_data)
                logger.info(f"通知創建成功: {notification.id}")
                return notification
        except Exception as e:
            logger.error(f"通知創建失敗: {str(e)}")
            raise serializers.ValidationError(f"通知創建失敗: {str(e)}")


class NotificationSettingsSerializer(serializers.ModelSerializer):
    """
    通知設置序列化器
    """
    
    class Meta:
        model = NotificationSettings
        fields = [
            'follow_notifications', 'like_notifications', 'comment_notifications',
            'reply_notifications', 'mention_notifications', 'message_notifications',
            'share_notifications', 'system_notifications', 'email_notifications',
            'push_notifications', 'quiet_hours_start', 'quiet_hours_end',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate(self, attrs):
        """
        驗證勿擾時間設置
        """
        quiet_start = attrs.get('quiet_hours_start')
        quiet_end = attrs.get('quiet_hours_end')
        
        # 如果設置了勿擾時間，開始和結束時間都必須設置
        if (quiet_start and not quiet_end) or (quiet_end and not quiet_start):
            raise serializers.ValidationError("勿擾時間的開始和結束時間必須同時設置")
        
        return attrs
    
    def update(self, instance, validated_data):
        """
        更新通知設置
        """
        try:
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            logger.info(f"用戶 {instance.user.username} 的通知設置已更新")
            return instance
        except Exception as e:
            logger.error(f"通知設置更新失敗: {str(e)}")
            raise serializers.ValidationError(f"通知設置更新失敗: {str(e)}")


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """
    通知模板序列化器
    """
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'type', 'type_display', 'title_template', 'message_template',
            'email_subject_template', 'email_body_template', 'is_active'
        ]
        read_only_fields = ['id', 'type_display']
    
    def validate_type(self, value):
        """
        驗證通知類型
        """
        if value not in [choice[0] for choice in NotificationType.choices]:
            raise serializers.ValidationError("無效的通知類型")
        return value


class BulkNotificationMarkSerializer(serializers.Serializer):
    """
    批量標記通知序列化器
    """
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )
    action = serializers.ChoiceField(
        choices=['read', 'unread', 'delete'],
        help_text="操作類型：read（標記為已讀）、unread（標記為未讀）、delete（刪除）"
    )
    
    def validate_notification_ids(self, value):
        """
        驗證通知ID列表
        """
        if len(value) > 100:
            raise serializers.ValidationError("一次最多只能操作100條通知")
        return value


class NotificationStatsSerializer(serializers.Serializer):
    """
    通知統計序列化器
    """
    total_count = serializers.IntegerField(read_only=True)
    unread_count = serializers.IntegerField(read_only=True)
    
    # 按類型統計
    follow_count = serializers.IntegerField(read_only=True)
    like_count = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    mention_count = serializers.IntegerField(read_only=True)
    message_count = serializers.IntegerField(read_only=True)
    share_count = serializers.IntegerField(read_only=True)
    system_count = serializers.IntegerField(read_only=True)
    
    # 按時間統計
    today_count = serializers.IntegerField(read_only=True)
    week_count = serializers.IntegerField(read_only=True)
    month_count = serializers.IntegerField(read_only=True) 