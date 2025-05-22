"""
EngineerHub 核心序列化器

提供核心功能數據的序列化和反序列化
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    SearchHistory, 
    UserActivity, 
    SystemConfiguration, 
    PlatformStatistics, 
    Notification, 
    ReportedContent
)

User = get_user_model()


class SearchHistorySerializer(serializers.ModelSerializer):
    """
    搜尋歷史序列化器
    """
    
    class Meta:
        model = SearchHistory
        fields = [
            'id', 'query', 'search_type', 'results_count', 
            'response_time', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserActivitySerializer(serializers.ModelSerializer):
    """
    用戶活動序列化器
    """
    user_username = serializers.CharField(source='user.username', read_only=True)
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    
    class Meta:
        model = UserActivity
        fields = [
            'id', 'user', 'user_username', 'activity_type', 'activity_type_display',
            'target_content_type', 'target_object_id', 'details', 
            'ip_address', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SystemConfigurationSerializer(serializers.ModelSerializer):
    """
    系統配置序列化器
    """
    config_type_display = serializers.CharField(source='get_config_type_display', read_only=True)
    
    class Meta:
        model = SystemConfiguration
        fields = [
            'key', 'value', 'config_type', 'config_type_display',
            'description', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class PlatformStatisticsSerializer(serializers.ModelSerializer):
    """
    平台統計序列化器
    """
    stat_type_display = serializers.CharField(source='get_stat_type_display', read_only=True)
    
    class Meta:
        model = PlatformStatistics
        fields = [
            'stat_type', 'stat_type_display', 'date',
            'total_users', 'new_users', 'active_users',
            'total_posts', 'new_posts', 'total_comments', 'new_comments',
            'total_likes', 'total_shares', 'total_messages', 'total_searches',
            'additional_stats', 'created_at'
        ]
        read_only_fields = ['created_at']


class NotificationSerializer(serializers.ModelSerializer):
    """
    通知序列化器
    """
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    time_since = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'sender', 'sender_username', 'sender_avatar',
            'notification_type', 'notification_type_display',
            'title', 'content', 'target_content_type', 'target_object_id',
            'is_read', 'read_at', 'data', 'created_at', 'time_since'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']
    
    def get_sender_avatar(self, obj):
        """獲取發送者頭像"""
        if obj.sender and obj.sender.avatar:
            return obj.sender.avatar.url
        return None
    
    def get_time_since(self, obj):
        """獲取相對時間"""
        from django.utils.timesince import timesince
        return timesince(obj.created_at)


class ReportedContentSerializer(serializers.ModelSerializer):
    """
    舉報內容序列化器
    """
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    reviewer_username = serializers.CharField(source='reviewer.username', read_only=True)
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ReportedContent
        fields = [
            'id', 'reporter', 'reporter_username', 'content_type', 'content_type_display',
            'content_id', 'reason', 'reason_display', 'description',
            'status', 'status_display', 'reviewer', 'reviewer_username',
            'reviewer_notes', 'action_taken', 'created_at', 'reviewed_at', 'resolved_at'
        ]
        read_only_fields = ['id', 'created_at', 'reviewed_at', 'resolved_at']


class CreateNotificationSerializer(serializers.Serializer):
    """
    創建通知序列化器
    """
    recipient_id = serializers.IntegerField()
    notification_type = serializers.ChoiceField(choices=Notification.NOTIFICATION_TYPES)
    title = serializers.CharField(max_length=200)
    content = serializers.CharField()
    target_content_type = serializers.CharField(required=False, allow_blank=True)
    target_object_id = serializers.CharField(required=False, allow_blank=True)
    data = serializers.JSONField(required=False, default=dict)
    
    def validate_recipient_id(self, value):
        """驗證接收者是否存在"""
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("接收者不存在")
        return value


class BulkNotificationSerializer(serializers.Serializer):
    """
    批量通知序列化器
    """
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=1000  # 限制最多1000個接收者
    )
    notification_type = serializers.ChoiceField(choices=Notification.NOTIFICATION_TYPES)
    title = serializers.CharField(max_length=200)
    content = serializers.CharField()
    target_content_type = serializers.CharField(required=False, allow_blank=True)
    target_object_id = serializers.CharField(required=False, allow_blank=True)
    data = serializers.JSONField(required=False, default=dict)
    
    def validate_recipient_ids(self, value):
        """驗證接收者是否都存在"""
        existing_users = User.objects.filter(id__in=value).values_list('id', flat=True)
        non_existing = set(value) - set(existing_users)
        if non_existing:
            raise serializers.ValidationError(f"以下用戶不存在: {list(non_existing)}")
        return value


class SearchStatsSerializer(serializers.Serializer):
    """
    搜尋統計序列化器
    """
    query = serializers.CharField()
    search_count = serializers.IntegerField()
    avg_results = serializers.FloatField()
    avg_response_time = serializers.FloatField()
    last_searched = serializers.DateTimeField()


class UserEngagementSerializer(serializers.Serializer):
    """
    用戶參與度序列化器
    """
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    posts_count = serializers.IntegerField()
    comments_count = serializers.IntegerField()
    likes_given = serializers.IntegerField()
    likes_received = serializers.IntegerField()
    followers_count = serializers.IntegerField()
    following_count = serializers.IntegerField()
    last_active = serializers.DateTimeField()
    engagement_score = serializers.FloatField()


class ContentModerationSerializer(serializers.Serializer):
    """
    內容審核序列化器
    """
    content_type = serializers.ChoiceField(choices=ReportedContent.CONTENT_TYPES)
    content_id = serializers.CharField()
    action = serializers.ChoiceField(choices=[
        ('approve', '批准'),
        ('reject', '拒絕'),
        ('remove', '移除'),
        ('warn', '警告'),
        ('ban', '封禁')
    ])
    reason = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True) 