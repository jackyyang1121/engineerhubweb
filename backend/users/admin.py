from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UserFollowing

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    自定義用戶管理界面
    """
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_online')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'is_online')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone_number')
    
    # 添加自定義字段到 fieldsets
    fieldsets = UserAdmin.fieldsets + (
        ('個人資訊', {'fields': ('phone_number', 'avatar', 'bio', 'skills')}),
        ('狀態資訊', {'fields': ('is_online', 'last_online', 'notification_enabled')}),
    )
    
    # 添加自定義字段到 add_fieldsets
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('個人資訊', {'fields': ('email', 'phone_number', 'avatar', 'bio', 'skills')}),
    )


@admin.register(UserFollowing)
class UserFollowingAdmin(admin.ModelAdmin):
    """
    用戶關注關係管理界面
    """
    list_display = ('user', 'following_user', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'following_user__username')
    date_hierarchy = 'created_at' 