"""
EngineerHub - 評論管理後台配置
為評論相關模型配置 Django 管理界面
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Comment, CommentLike, CommentReport


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """
    評論管理界面
    """
    
    list_display = (
        'content_preview',
        'user',
        'post_link',
        'is_reply',
        'likes_count',
        'replies_count',
        'is_deleted',
        'is_edited',
        'created_at'
    )
    
    list_filter = (
        'is_deleted',
        'is_edited',
        'created_at',
        'parent'
    )
    
    search_fields = (
        'content',
        'user__username',
        'post__id'
    )
    
    readonly_fields = (
        'id',
        'likes_count',
        'replies_count',
        'created_at',
        'updated_at',
        'depth_level'
    )
    
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('基本資訊', {
            'fields': ('id', 'user', 'post', 'parent')
        }),
        ('內容', {
            'fields': ('content',)
        }),
        ('統計數據', {
            'fields': ('likes_count', 'replies_count', 'depth_level')
        }),
        ('狀態', {
            'fields': ('is_deleted', 'is_edited')
        }),
        ('時間戳', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def content_preview(self, obj):
        """內容預覽"""
        max_length = 50
        content = obj.content
        if len(content) > max_length:
            return f"{content[:max_length]}..."
        return content
    content_preview.short_description = '內容預覽'
    
    def post_link(self, obj):
        """貼文連結"""
        return format_html(
            '<a href="/admin/posts/post/{}/change/">{}</a>',
            obj.post.id,
            f"貼文 {str(obj.post.id)[:8]}..."
        )
    post_link.short_description = '所屬貼文'
    
    def is_reply(self, obj):
        """是否為回覆"""
        return bool(obj.parent)
    is_reply.boolean = True
    is_reply.short_description = '是回覆'
    
    def depth_level(self, obj):
        """評論深度"""
        return obj.depth
    depth_level.short_description = '深度層級'
    
    # 批量操作
    actions = ['mark_as_deleted', 'restore_comments']
    
    def mark_as_deleted(self, request, queryset):
        """批量軟刪除評論"""
        count = 0
        for comment in queryset:
            if not comment.is_deleted:
                comment.delete()  # 使用軟刪除
                count += 1
        self.message_user(request, f"已刪除 {count} 個評論")
    mark_as_deleted.short_description = "標記為已刪除"
    
    def restore_comments(self, request, queryset):
        """批量恢復評論"""
        queryset.update(is_deleted=False)
        self.message_user(request, f"已恢復 {queryset.count()} 個評論")
    restore_comments.short_description = "恢復評論"
    
    def get_queryset(self, request):
        """優化查詢"""
        return super().get_queryset(request).select_related(
            'user', 'post', 'parent'
        )


@admin.register(CommentLike)
class CommentLikeAdmin(admin.ModelAdmin):
    """
    評論點讚管理界面
    """
    
    list_display = (
        'user',
        'comment_preview',
        'comment_author',
        'created_at'
    )
    
    list_filter = ('created_at',)
    
    search_fields = (
        'user__username',
        'comment__content',
        'comment__user__username'
    )
    
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    def comment_preview(self, obj):
        """評論預覽"""
        max_length = 30
        content = obj.comment.content
        if len(content) > max_length:
            return f"{content[:max_length]}..."
        return content
    comment_preview.short_description = '評論內容'
    
    def comment_author(self, obj):
        """評論作者"""
        return obj.comment.user.username
    comment_author.short_description = '評論作者'
    
    def get_queryset(self, request):
        """優化查詢"""
        return super().get_queryset(request).select_related(
            'user', 'comment', 'comment__user'
        )


@admin.register(CommentReport)
class CommentReportAdmin(admin.ModelAdmin):
    """
    評論舉報管理界面
    """
    
    list_display = (
        'reporter',
        'comment_preview',
        'reason',
        'status',
        'created_at',
        'reviewed_at'
    )
    
    list_filter = (
        'reason',
        'status',
        'created_at',
        'reviewed_at'
    )
    
    search_fields = (
        'reporter__username',
        'comment__content',
        'description'
    )
    
    readonly_fields = (
        'id',
        'reporter',
        'comment',
        'reason',
        'description',
        'created_at'
    )
    
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('舉報資訊', {
            'fields': ('id', 'reporter', 'comment', 'reason', 'description')
        }),
        ('處理狀態', {
            'fields': ('status', 'reviewer', 'reviewer_notes')
        }),
        ('時間戳', {
            'fields': ('created_at', 'reviewed_at')
        }),
    )
    
    def comment_preview(self, obj):
        """評論預覽"""
        max_length = 30
        content = obj.comment.content
        if len(content) > max_length:
            return f"{content[:max_length]}..."
        return content
    comment_preview.short_description = '被舉報評論'
    
    # 批量操作
    actions = ['mark_as_reviewed', 'mark_as_resolved', 'mark_as_dismissed']
    
    def mark_as_reviewed(self, request, queryset):
        """批量標記為已審核"""
        queryset.update(
            status='reviewed',
            reviewed_at=timezone.now(),
            reviewer=request.user
        )
        self.message_user(request, f"已將 {queryset.count()} 個舉報標記為已審核")
    mark_as_reviewed.short_description = "標記為已審核"
    
    def mark_as_resolved(self, request, queryset):
        """批量標記為已解決"""
        queryset.update(
            status='resolved',
            reviewed_at=timezone.now(),
            reviewer=request.user
        )
        self.message_user(request, f"已將 {queryset.count()} 個舉報標記為已解決")
    mark_as_resolved.short_description = "標記為已解決"
    
    def mark_as_dismissed(self, request, queryset):
        """批量標記為已駁回"""
        queryset.update(
            status='dismissed',
            reviewed_at=timezone.now(),
            reviewer=request.user
        )
        self.message_user(request, f"已將 {queryset.count()} 個舉報標記為已駁回")
    mark_as_dismissed.short_description = "標記為已駁回"
    
    def get_queryset(self, request):
        """優化查詢"""
        return super().get_queryset(request).select_related(
            'reporter', 'comment', 'comment__user', 'reviewer'
        ) 