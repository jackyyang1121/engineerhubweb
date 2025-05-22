from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Notification, NotificationSettings, NotificationTemplate


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    通知管理界面
    """
    list_display = [
        'id', 'recipient_display', 'actor_display', 'type_display', 
        'title_truncated', 'is_read', 'is_sent', 'created_at_display'
    ]
    list_filter = ['type', 'is_read', 'is_sent', 'created_at']
    search_fields = ['recipient__username', 'actor__username', 'title', 'message']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'read_at']
    
    fieldsets = (
        ('基本信息', {
            'fields': ('recipient', 'actor', 'type', 'title', 'message')
        }),
        ('關聯對象', {
            'fields': ('content_type', 'object_id', 'data'),
            'classes': ('collapse',)
        }),
        ('狀態信息', {
            'fields': ('is_read', 'is_sent', 'expires_at')
        }),
        ('時間信息', {
            'fields': ('created_at', 'read_at'),
            'classes': ('collapse',)
        }),
    )
    
    def recipient_display(self, obj):
        """顯示接收者信息"""
        if obj.recipient:
            return format_html(
                '<a href="/admin/users/customuser/{}/change/">{}</a>',
                obj.recipient.id,
                obj.recipient.username
            )
        return '-'
    recipient_display.short_description = '接收者'
    
    def actor_display(self, obj):
        """顯示觸發者信息"""
        if obj.actor:
            return format_html(
                '<a href="/admin/users/customuser/{}/change/">{}</a>',
                obj.actor.id,
                obj.actor.username
            )
        return '系統'
    actor_display.short_description = '觸發者'
    
    def type_display(self, obj):
        """顯示通知類型"""
        colors = {
            'follow': '#28a745',
            'like': '#dc3545',
            'comment': '#007bff',
            'reply': '#6c757d',
            'mention': '#ffc107',
            'message': '#17a2b8',
            'share': '#6f42c1',
            'system': '#fd7e14',
        }
        color = colors.get(obj.type, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_type_display()
        )
    type_display.short_description = '類型'
    
    def title_truncated(self, obj):
        """截斷標題顯示"""
        if len(obj.title) > 50:
            return obj.title[:50] + '...'
        return obj.title
    title_truncated.short_description = '標題'
    
    def created_at_display(self, obj):
        """格式化創建時間"""
        return timezone.localtime(obj.created_at).strftime('%Y-%m-%d %H:%M')
    created_at_display.short_description = '創建時間'
    
    actions = ['mark_as_read', 'mark_as_unread', 'delete_selected']
    
    def mark_as_read(self, request, queryset):
        """批量標記為已讀"""
        count = 0
        for notification in queryset:
            if not notification.is_read:
                notification.mark_as_read()
                count += 1
        self.message_user(request, f'已標記 {count} 條通知為已讀')
    mark_as_read.short_description = '標記為已讀'
    
    def mark_as_unread(self, request, queryset):
        """批量標記為未讀"""
        count = 0
        for notification in queryset:
            if notification.is_read:
                notification.mark_as_unread()
                count += 1
        self.message_user(request, f'已標記 {count} 條通知為未讀')
    mark_as_unread.short_description = '標記為未讀'


@admin.register(NotificationSettings)
class NotificationSettingsAdmin(admin.ModelAdmin):
    """
    通知設置管理界面
    """
    list_display = [
        'user_display', 'follow_notifications', 'like_notifications',
        'comment_notifications', 'email_notifications', 'push_notifications'
    ]
    list_filter = [
        'follow_notifications', 'like_notifications', 'comment_notifications',
        'email_notifications', 'push_notifications'
    ]
    search_fields = ['user__username', 'user__email']
    ordering = ['user__username']
    
    fieldsets = (
        ('用戶', {
            'fields': ('user',)
        }),
        ('通知類型設置', {
            'fields': (
                'follow_notifications', 'like_notifications', 'comment_notifications',
                'reply_notifications', 'mention_notifications', 'message_notifications',
                'share_notifications', 'system_notifications'
            )
        }),
        ('通知管道設置', {
            'fields': ('email_notifications', 'push_notifications')
        }),
        ('時間設置', {
            'fields': ('quiet_hours_start', 'quiet_hours_end'),
            'classes': ('collapse',)
        }),
    )
    
    def user_display(self, obj):
        """顯示用戶信息"""
        return format_html(
            '<a href="/admin/users/customuser/{}/change/">{}</a>',
            obj.user.id,
            obj.user.username
        )
    user_display.short_description = '用戶'


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    """
    通知模板管理界面
    """
    list_display = ['type_display', 'title_template_truncated', 'is_active']
    list_filter = ['type', 'is_active']
    search_fields = ['title_template', 'message_template']
    ordering = ['type']
    
    fieldsets = (
        ('基本信息', {
            'fields': ('type', 'is_active')
        }),
        ('通知模板', {
            'fields': ('title_template', 'message_template')
        }),
        ('郵件模板', {
            'fields': ('email_subject_template', 'email_body_template'),
            'classes': ('collapse',)
        }),
    )
    
    def type_display(self, obj):
        """顯示通知類型"""
        colors = {
            'follow': '#28a745',
            'like': '#dc3545',
            'comment': '#007bff',
            'reply': '#6c757d',
            'mention': '#ffc107',
            'message': '#17a2b8',
            'share': '#6f42c1',
            'system': '#fd7e14',
        }
        color = colors.get(obj.type, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_type_display()
        )
    type_display.short_description = '類型'
    
    def title_template_truncated(self, obj):
        """截斷標題模板顯示"""
        if len(obj.title_template) > 50:
            return obj.title_template[:50] + '...'
        return obj.title_template
    title_template_truncated.short_description = '標題模板' 