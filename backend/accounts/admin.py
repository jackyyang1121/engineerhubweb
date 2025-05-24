"""
EngineerHub - 管理後台配置
為用戶相關模型配置 Django 管理界面
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import reverse
from django.db import models
from .models import User, Follow, PortfolioProject, UserSettings, BlockedUser


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    自定義用戶管理界面
    """
    
    # 列表頁顯示欄位
    list_display = (
        'username', 
        'email', 
        'display_name_field',
        'is_verified',
        'is_online',
        'followers_count',
        'posts_count',
        'is_staff',
        'is_active',
        'created_at'
    )
    
    # 可搜索欄位
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    # 篩選器
    list_filter = (
        'is_staff', 
        'is_active', 
        'is_verified',
        'is_online',
        'is_private',
        'created_at'
    )
    
    # 排序
    ordering = ('-created_at',)
    
    # 只讀欄位
    readonly_fields = (
        'id',
        'date_joined',
        'created_at',
        'updated_at',
        'last_login',
        'last_online',
        'avatar_preview'
    )
    
    # 詳細頁面欄位分組
    fieldsets = (
        ('基本資訊', {
            'fields': ('id', 'username', 'email', 'password')
        }),
        ('個人資料', {
            'fields': (
                'first_name', 'last_name', 'bio', 
                'avatar', 'avatar_preview', 'location', 
                'website', 'github_url', 'skill_tags'
            )
        }),
        ('權限', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'is_verified', 'groups', 'user_permissions'
            )
        }),
        ('隱私設置', {
            'fields': ('is_private', 'hide_online_status')
        }),
        ('統計數據', {
            'fields': (
                'followers_count', 'following_count',
                'posts_count', 'likes_received_count'
            )
        }),
        ('狀態', {
            'fields': ('is_online', 'last_online')
        }),
        ('時間戳', {
            'fields': ('date_joined', 'created_at', 'updated_at', 'last_login')
        }),
    )
    
    # 新增用戶時的欄位
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username', 'email', 'password1', 'password2',
                'first_name', 'last_name', 'is_active', 'is_staff'
            ),
        }),
    )
    
    def display_name_field(self, obj):
        """顯示用戶顯示名稱"""
        return obj.display_name
    display_name_field.short_description = '顯示名稱'
    
    def avatar_preview(self, obj):
        """頭像預覽"""
        if obj.avatar:
            return format_html(
                '<img src="{}" width="50" height="50" style="border-radius: 50%;" />',
                obj.avatar.url
            )
        return format_html(
            '<img src="{}" width="50" height="50" style="border-radius: 50%;" />',
            obj.avatar_url
        )
    avatar_preview.short_description = '頭像預覽'
    
    # 批量操作
    actions = ['make_verified', 'make_unverified', 'make_online', 'make_offline']
    
    def make_verified(self, request, queryset):
        """批量驗證用戶"""
        queryset.update(is_verified=True)
        self.message_user(request, f"已驗證 {queryset.count()} 個用戶")
    make_verified.short_description = "標記為已驗證"
    
    def make_unverified(self, request, queryset):
        """批量取消驗證用戶"""
        queryset.update(is_verified=False)
        self.message_user(request, f"已取消驗證 {queryset.count()} 個用戶")
    make_unverified.short_description = "取消驗證"
    
    def make_online(self, request, queryset):
        """批量設置為在線"""
        queryset.update(is_online=True)
        self.message_user(request, f"已設置 {queryset.count()} 個用戶為在線")
    make_online.short_description = "設置為在線"
    
    def make_offline(self, request, queryset):
        """批量設置為離線"""
        queryset.update(is_online=False)
        self.message_user(request, f"已設置 {queryset.count()} 個用戶為離線")
    make_offline.short_description = "設置為離線"


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    """
    關注關係管理界面
    """
    
    list_display = ('follower', 'following', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('follower__username', 'following__username')
    raw_id_fields = ('follower', 'following')
    ordering = ('-created_at',)
    
    def get_queryset(self, request):
        """優化查詢"""
        return super().get_queryset(request).select_related('follower', 'following')


@admin.register(PortfolioProject)
class PortfolioProjectAdmin(admin.ModelAdmin):
    """
    作品集項目管理界面
    """
    
    list_display = (
        'title', 
        'user', 
        'is_featured', 
        'order',
        'has_image',
        'has_demo',
        'created_at'
    )
    list_filter = ('is_featured', 'created_at')
    search_fields = ('title', 'description', 'user__username')
    raw_id_fields = ('user',)
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'image_preview')
    
    fieldsets = (
        ('基本資訊', {
            'fields': ('id', 'user', 'title', 'description')
        }),
        ('媒體', {
            'fields': ('image', 'image_preview')
        }),
        ('連結', {
            'fields': ('project_url', 'github_url', 'youtube_url')
        }),
        ('技術與展示', {
            'fields': ('technologies', 'is_featured', 'order')
        }),
        ('時間戳', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def has_image(self, obj):
        """是否有圖片"""
        return bool(obj.image)
    has_image.boolean = True
    has_image.short_description = '有圖片'
    
    def has_demo(self, obj):
        """是否有演示連結"""
        return bool(obj.project_url)
    has_demo.boolean = True
    has_demo.short_description = '有演示'
    
    def image_preview(self, obj):
        """圖片預覽"""
        if obj.image:
            return format_html(
                '<img src="{}" width="100" height="100" style="object-fit: cover;" />',
                obj.image.url
            )
        return "無圖片"
    image_preview.short_description = '圖片預覽'
    
    def get_queryset(self, request):
        """優化查詢"""
        return super().get_queryset(request).select_related('user')


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    """
    用戶設置管理界面
    """
    
    list_display = (
        'user',
        'email_notifications',
        'push_notifications', 
        'profile_visibility',
        'theme',
        'language'
    )
    list_filter = (
        'email_notifications',
        'push_notifications',
        'profile_visibility',
        'theme',
        'language'
    )
    search_fields = ('user__username', 'user__email')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('用戶', {
            'fields': ('user',)
        }),
        ('通知設置', {
            'fields': (
                'email_notifications', 'push_notifications',
                'notification_new_follower', 'notification_post_like',
                'notification_post_comment', 'notification_comment_reply',
                'notification_mention', 'notification_new_message'
            )
        }),
        ('隱私設置', {
            'fields': (
                'profile_visibility', 'show_online_status', 'allow_mentions'
            )
        }),
        ('UI 偏好', {
            'fields': ('theme', 'language')
        }),
        ('時間戳', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def get_queryset(self, request):
        """優化查詢"""
        return super().get_queryset(request).select_related('user')


@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    """
    黑名單管理界面
    """
    
    list_display = ('blocker', 'blocked', 'reason', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('blocker__username', 'blocked__username', 'reason')
    raw_id_fields = ('blocker', 'blocked')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
    
    def get_queryset(self, request):
        """優化查詢"""
        return super().get_queryset(request).select_related('blocker', 'blocked')


# 自定義管理後台標題
admin.site.site_header = "EngineerHub 管理後台"
admin.site.site_title = "EngineerHub"
admin.site.index_title = "歡迎來到 EngineerHub 管理後台" 