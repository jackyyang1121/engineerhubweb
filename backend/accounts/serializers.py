"""
EngineerHub - 用戶序列化器
定義用戶相關的數據序列化和驗證邏輯

使用 dj-rest-auth 後的變化：
- CustomRegisterSerializer: 兼容 dj-rest-auth 的註冊序列化器
- 移除自定義登入序列化器（使用 dj-rest-auth 預設）
- 保留用戶管理相關序列化器
"""

from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate
from PIL import Image
import re

from .models import User, Follow, PortfolioProject, UserSettings, BlockedUser

class CustomRegisterSerializer(RegisterSerializer):
    """
    自定義註冊序列化器 - 兼容 dj-rest-auth
    
    繼承 dj-rest-auth 的 RegisterSerializer，添加額外字段：
    - first_name: 名字
    - last_name: 姓氏
    
    dj-rest-auth 會自動處理：
    - 用戶創建
    - 郵箱驗證
    - JWT Token 生成
    """
    
    # 添加額外字段到註冊表單
    first_name = serializers.CharField(
        required=True,
        max_length=30,
        help_text="用戶的名字"
    )
    last_name = serializers.CharField(
        required=True,
        max_length=30,
        help_text="用戶的姓氏"
    )
    
    def validate_username(self, username):
        """
        驗證用戶名規則
        - 只能包含字母、數字和下劃線
        - 長度 3-30 字符
        - 不能使用保留用戶名
        """
        # 調用父類的驗證
        username = super().validate_username(username)
        
        # 自定義驗證規則
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            raise serializers.ValidationError('用戶名只能包含字母、數字和下劃線')
        
        if len(username) < 3:
            raise serializers.ValidationError('用戶名至少需要3個字符')
        
        if len(username) > 30:
            raise serializers.ValidationError('用戶名不能超過30個字符')
        
        # 檢查保留用戶名
        reserved_usernames = [
            'admin', 'api', 'www', 'mail', 'support', 'help',
            'about', 'contact', 'terms', 'privacy', 'settings',
            'profile', 'user', 'users', 'root', 'system'
        ]
        if username.lower() in reserved_usernames:
            raise serializers.ValidationError('此用戶名不可用')
        
        return username
    
    def validate_email(self, email):
        """
        驗證郵箱唯一性
        dj-rest-auth 會處理基本的郵箱格式驗證
        """
        # 調用父類的驗證
        email = super().validate_email(email)
        
        # 檢查郵箱是否已被使用
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError('此郵箱已被註冊')
        
        return email
    
    def validate_first_name(self, value):
        """驗證名字"""
        if not value.strip():
            raise serializers.ValidationError('名字不能為空')
        
        if len(value) > 30:
            raise serializers.ValidationError('名字不能超過30個字符')
        
        return value.strip()
    
    def validate_last_name(self, value):
        """驗證姓氏"""
        if not value.strip():
            raise serializers.ValidationError('姓氏不能為空')
        
        if len(value) > 30:
            raise serializers.ValidationError('姓氏不能超過30個字符')
        
        return value.strip()
    
    def get_cleaned_data(self):
        """
        為 dj-rest-auth 提供清理後的數據
        這個方法會被 dj-rest-auth 調用來獲取用戶數據
        """
        data = super().get_cleaned_data()
        data.update({
            'first_name': self.validated_data.get('first_name', ''),
            'last_name': self.validated_data.get('last_name', ''),
        })
        return data
    
    def save(self, request):
        """
        創建用戶實例 - 兼容 dj-rest-auth
        dj-rest-auth 會調用這個方法來創建用戶
        """
        # 調用父類的 save 方法創建基本用戶
        user = super().save(request)
        
        # 設置額外字段
        user.first_name = self.validated_data.get('first_name', '')
        user.last_name = self.validated_data.get('last_name', '')
        user.save()
        
        # 創建用戶設置（如果不存在）
        UserSettings.objects.get_or_create(user=user)
        
        return user


class UserSerializer(serializers.ModelSerializer):
    """
    用戶基本信息序列化器
    用於 dj-rest-auth 的用戶詳情端點和一般用戶信息顯示
    """
    
    avatar_url = serializers.ReadOnlyField()
    display_name = serializers.ReadOnlyField()
    is_following = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'display_name', 'bio', 'avatar', 'avatar_url', 'location',
            'website', 'github_url', 'skill_tags', 'is_verified',
            'is_online', 'last_online', 'followers_count', 'following_count',
            'posts_count', 'likes_received_count', 'created_at',
            'is_following', 'is_blocked'
        ]
        read_only_fields = [
            'id', 'is_verified', 'followers_count', 'following_count',
            'posts_count', 'likes_received_count', 'created_at', 'last_online'
        ]
    
    def get_is_following(self, obj):
        """檢查當前用戶是否關注此用戶"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(
                follower=request.user,
                following=obj
            ).exists()
        return False
    
    def get_is_blocked(self, obj):
        """檢查當前用戶是否拉黑此用戶"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return BlockedUser.objects.filter(
                blocker=request.user,
                blocked=obj
            ).exists()
        return False


class UserDetailSerializer(UserSerializer):
    """
    用戶詳細信息序列化器
    用於個人資料頁面和詳細信息顯示
    """
    
    portfolio_projects = serializers.SerializerMethodField()
    recent_posts = serializers.SerializerMethodField()
    settings = serializers.SerializerMethodField()
    
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + [
            'portfolio_projects', 'recent_posts', 'settings'
        ]
    
    def get_portfolio_projects(self, obj):
        """獲取用戶的作品集項目"""
        projects = obj.portfolio_projects.filter(is_featured=True)[:3]
        return PortfolioProjectSerializer(projects, many=True).data
    
    def get_recent_posts(self, obj):
        """獲取用戶最近的文章"""
        from posts.serializers import PostSerializer
        posts = obj.posts.filter(is_published=True).order_by('-created_at')[:5]
        return PostSerializer(posts, many=True, context=self.context).data
    
    def get_settings(self, obj):
        """獲取用戶設置（僅對本人可見）"""
        request = self.context.get('request')
        if request and request.user == obj:
            try:
                return UserSettingsSerializer(obj.settings).data
            except UserSettings.DoesNotExist:
                return None
        return None


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    用戶更新序列化器
    處理個人資料更新，兼容 dj-rest-auth 的用戶更新端點
    """
    
    avatar = serializers.ImageField(required=False)
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'bio', 'avatar', 'location',
            'website', 'github_url', 'skill_tags'
        ]
    
    def validate_bio(self, value):
        """驗證個人簡介"""
        if value and len(value) > 500:
            raise serializers.ValidationError('個人簡介不能超過500個字符')
        return value
    
    def validate_website(self, value):
        """驗證網站URL"""
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError('網站URL必須以http://或https://開頭')
        return value
    
    def validate_github_url(self, value):
        """驗證GitHub URL"""
        if value and 'github.com' not in value:
            raise serializers.ValidationError('請輸入有效的GitHub URL')
        return value
    
    def validate_skill_tags(self, value):
        """驗證技能標籤"""
        if value:
            if len(value) > 20:
                raise serializers.ValidationError('技能標籤不能超過20個')
            
            for tag in value:
                if len(tag) > 30:
                    raise serializers.ValidationError('單個技能標籤不能超過30個字符')
        
        return value
    
    def validate_avatar(self, value):
        """驗證頭像"""
        if value:
            # 檢查文件大小（5MB）
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError('頭像文件大小不能超過5MB')
            
            # 檢查圖片格式
            try:
                img = Image.open(value)
                if img.format.lower() not in ['jpeg', 'jpg', 'png', 'gif']:
                    raise serializers.ValidationError('頭像只支持JPEG、PNG、GIF格式')
            except Exception:
                raise serializers.ValidationError('無效的圖片文件')
        
        return value


class UserSearchSerializer(serializers.ModelSerializer):
    """
    用戶搜索結果序列化器
    用於搜索結果的簡化顯示
    """
    
    avatar_url = serializers.ReadOnlyField()
    display_name = serializers.ReadOnlyField()
    is_following = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'display_name', 'bio', 'avatar_url',
            'location', 'skill_tags', 'is_verified', 'followers_count',
            'is_following'
        ]
    
    def get_is_following(self, obj):
        """檢查當前用戶是否關注此用戶"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(
                follower=request.user,
                following=obj
            ).exists()
        return False


class FollowSerializer(serializers.ModelSerializer):
    """
    關注關係序列化器
    """
    
    follower = UserSerializer(read_only=True)
    following = UserSerializer(read_only=True)
    
    class Meta:
        model = Follow
        fields = ['follower', 'following', 'created_at']
        read_only_fields = ['created_at']


class PortfolioProjectSerializer(serializers.ModelSerializer):
    """
    作品集項目序列化器
    """
    
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = PortfolioProject
        fields = [
            'id', 'user', 'title', 'description', 'image',
            'project_url', 'github_url', 'youtube_url',
            'technologies', 'is_featured', 'order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def validate_title(self, value):
        """驗證標題"""
        if len(value) > 100:
            raise serializers.ValidationError('標題不能超過100個字符')
        return value
    
    def validate_description(self, value):
        """驗證描述"""
        if len(value) > 1000:
            raise serializers.ValidationError('描述不能超過1000個字符')
        return value
    
    def validate_technologies(self, value):
        """驗證技術標籤"""
        if len(value) > 10:
            raise serializers.ValidationError('技術標籤不能超過10個')
        return value
    
    def validate_project_url(self, value):
        """驗證項目URL"""
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError('項目URL必須以http://或https://開頭')
        return value
    
    def validate_github_url(self, value):
        """驗證GitHub URL"""
        if value and 'github.com' not in value:
            raise serializers.ValidationError('請輸入有效的GitHub URL')
        return value
    
    def validate_youtube_url(self, value):
        """驗證YouTube URL"""
        if value and 'youtube.com' not in value and 'youtu.be' not in value:
            raise serializers.ValidationError('請輸入有效的YouTube URL')
        return value


class UserSettingsSerializer(serializers.ModelSerializer):
    """
    用戶設置序列化器
    """
    
    class Meta:
        model = UserSettings
        fields = [
            'email_notifications', 'push_notifications',
            'notification_new_follower', 'notification_post_like',
            'notification_post_comment', 'notification_comment_reply',
            'notification_mention', 'notification_new_message',
            'profile_visibility', 'show_online_status', 'allow_mentions',
            'theme', 'language', 'updated_at'
        ]
        read_only_fields = ['updated_at']


class BlockedUserSerializer(serializers.ModelSerializer):
    """
    黑名單序列化器
    """
    
    blocker = UserSerializer(read_only=True)
    blocked = UserSerializer(read_only=True)
    
    class Meta:
        model = BlockedUser
        fields = ['blocker', 'blocked', 'reason', 'created_at']
        read_only_fields = ['created_at']


class UserStatsSerializer(serializers.Serializer):
    """
    用戶統計數據序列化器
    """
    
    posts_count = serializers.IntegerField(read_only=True)
    followers_count = serializers.IntegerField(read_only=True)
    following_count = serializers.IntegerField(read_only=True)
    likes_received_count = serializers.IntegerField(read_only=True)
    joined_date = serializers.DateTimeField(read_only=True)
    is_online = serializers.BooleanField(read_only=True)
    last_online = serializers.DateTimeField(read_only=True)


class SocialAuthSerializer(serializers.Serializer):
    """
    社交登入序列化器
    """
    
    access_token = serializers.CharField(required=True)
    provider = serializers.CharField(required=True)
    
    def validate_access_token(self, value):
        """驗證訪問令牌"""
        if not value.strip():
            raise serializers.ValidationError('訪問令牌不能為空')
        return value


