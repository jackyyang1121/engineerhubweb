from django.contrib import admin
from .models import Conversation, Message, UserConversationState

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    """
    對話管理界面
    """
    list_display = ('id', 'get_participants', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('id', 'participants__username')
    date_hierarchy = 'created_at'
    
    def get_participants(self, obj):
        """
        獲取對話參與者列表
        """
        return ", ".join([user.username for user in obj.participants.all()])
    
    get_participants.short_description = '參與者'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    """
    訊息管理界面
    """
    list_display = ('id', 'conversation', 'sender', 'message_type', 'content_preview', 'is_read', 'created_at')
    list_filter = ('message_type', 'is_read', 'created_at')
    search_fields = ('content', 'sender__username', 'conversation__id')
    readonly_fields = ('created_at', 'read_at')
    date_hierarchy = 'created_at'
    
    def content_preview(self, obj):
        """
        顯示截斷的內容預覽
        """
        max_length = 50
        if len(obj.content) > max_length:
            return f"{obj.content[:max_length]}..."
        return obj.content
    
    content_preview.short_description = '內容預覽'


@admin.register(UserConversationState)
class UserConversationStateAdmin(admin.ModelAdmin):
    """
    用戶對話狀態管理界面
    """
    list_display = ('id', 'user', 'conversation', 'is_archived', 'unread_count', 'last_read_at')
    list_filter = ('is_archived', 'last_read_at')
    search_fields = ('user__username', 'conversation__id')
    date_hierarchy = 'last_read_at' 