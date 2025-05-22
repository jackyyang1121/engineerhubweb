from django.contrib import admin
from django.utils.html import format_html
from .models import Post, PostMedia, Like, Comment, Save, Report
from django.utils import timezone

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    """
    貼文管理界面
    """
    list_display = ('id', 'author', 'content_preview', 'has_code', 'likes_count', 'comments_count', 'shares_count', 'created_at')
    list_filter = ('created_at', 'author')
    search_fields = ('content', 'code_snippet', 'author__username')
    readonly_fields = ('likes_count', 'comments_count', 'shares_count', 'code_highlighted')
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
    
    def has_code(self, obj):
        """
        檢查是否包含程式碼
        """
        return bool(obj.code_snippet)
    
    has_code.boolean = True
    has_code.short_description = '含程式碼'


@admin.register(PostMedia)
class PostMediaAdmin(admin.ModelAdmin):
    """
    貼文媒體管理界面
    """
    list_display = ('id', 'post', 'media_type', 'file_preview', 'order', 'created_at')
    list_filter = ('media_type', 'created_at')
    search_fields = ('post__id', 'post__author__username')
    
    def file_preview(self, obj):
        """
        顯示媒體文件預覽
        """
        if obj.media_type == PostMedia.MediaType.IMAGE:
            return format_html('<img src="{}" width="50" height="50" />', obj.file.url)
        elif obj.media_type == PostMedia.MediaType.VIDEO:
            return format_html('<video width="50" height="50" controls><source src="{}"></video>', obj.file.url)
        return '無預覽'
    
    file_preview.short_description = '媒體預覽'


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """
    評論管理界面
    """
    list_display = ('id', 'user', 'post', 'parent', 'content_preview', 'created_at')
    list_filter = ('created_at', 'user')
    search_fields = ('content', 'user__username', 'post__id')
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


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    """
    點讚管理界面
    """
    list_display = ('id', 'user', 'post', 'created_at')
    list_filter = ('created_at', 'user')
    search_fields = ('user__username', 'post__id')
    date_hierarchy = 'created_at'


@admin.register(Save)
class SaveAdmin(admin.ModelAdmin):
    """
    收藏管理界面
    """
    list_display = ('id', 'user', 'post', 'created_at')
    list_filter = ('created_at', 'user')
    search_fields = ('user__username', 'post__id')
    date_hierarchy = 'created_at'


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    """
    舉報管理界面
    """
    list_display = ('id', 'user', 'post', 'reason', 'is_processed', 'created_at', 'processed_at')
    list_filter = ('reason', 'is_processed', 'created_at')
    search_fields = ('user__username', 'post__id', 'details')
    readonly_fields = ('user', 'post', 'reason', 'details', 'created_at')
    date_hierarchy = 'created_at'
    
    actions = ['mark_as_processed']
    
    def mark_as_processed(self, request, queryset):
        """
        將選中的舉報標記為已處理
        """
        queryset.update(is_processed=True, processed_at=timezone.now())
        self.message_user(request, f"已將 {queryset.count()} 個舉報標記為已處理")
    
    mark_as_processed.short_description = '標記為已處理' 