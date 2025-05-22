"""
EngineerHub - 用戶序列化器
定義用戶相關的數據序列化和驗證邏輯
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate
from PIL import Image
import re

from .models import User, Follow, PortfolioProject, UserSettings, BlockedUser


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    自定義JWT Token序列化器
    添加用戶信息到響應中
    """
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # 添加用戶信息
        user_data = UserSerializer(self.user).data
        data['user'] = user_data
        
        return data


class UserSerializer(serializers.ModelSerializer):
    """
    用戶基本信息序列化器
    用於列表顯示和基本操作
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
        """獲取用戶最近的貼文"""
        from posts.serializers import PostSerializer
        posts = obj.posts.filter(is_published=True)[:5]
        return PostSerializer(posts, many=True, context=self.context).data
    
    def get_settings(self, obj):
        """獲取用戶設置（僅本人可見）"""
        request = self.context.get('request')
        if request and request.user == obj:
            try:
                return UserSettingsSerializer(obj.settings).data
            except UserSettings.DoesNotExist:
                return None
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    """
    用戶註冊序列化器
    處理用戶註冊邏輯和驗證
    """
    
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'password_confirm'
        ]
    
    def validate_username(self, value):
        """驗證用戶名"""
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError('用戶名只能包含字母、數字和下劃線')
        
        if len(value) < 3:
            raise serializers.ValidationError('用戶名至少需要3個字符')
        
        if len(value) > 30:
            raise serializers.ValidationError('用戶名不能超過30個字符')
        
        # 檢查保留用戶名
        reserved_usernames = [
            'admin', 'api', 'www', 'mail', 'support', 'help',
            'about', 'contact', 'terms', 'privacy', 'settings',
            'profile', 'user', 'users', 'root', 'system'
        ]
        if value.lower() in reserved_usernames:
            raise serializers.ValidationError('此用戶名不可用')
        
        return value
    
    def validate_email(self, value):
        """驗證郵箱"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('此郵箱已被註冊')
        return value
    
    def validate(self, attrs):
        """驗證密碼確認"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': '兩次密碼輸入不一致'
            })
        return attrs
    
    def create(self, validated_data):
        """創建用戶"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    用戶更新序列化器
    處理個人資料更新
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
            raise serializers.ValidationError('網站URL必須以 http:// 或 https:// 開始')
        return value
    
    def validate_github_url(self, value):
        """驗證GitHub URL"""
        if value and not value.startswith('https://github.com/'):
            raise serializers.ValidationError('請輸入有效的GitHub個人頁面URL')
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
            # 檢查文件大小（10MB）
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError('頭像文件不能超過10MB')
            
            # 檢查圖片格式
            try:
                img = Image.open(value)
                if img.format not in ['JPEG', 'PNG', 'GIF', 'WEBP']:
                    raise serializers.ValidationError('只支援 JPEG、PNG、GIF、WebP 格式的圖片')
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
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'display_name', 'avatar_url',
            'bio', 'is_verified', 'followers_count'
        ]


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
        """驗證項目標題"""
        if len(value) > 200:
            raise serializers.ValidationError('項目標題不能超過200個字符')
        return value
    
    def validate_description(self, value):
        """驗證項目描述"""
        if len(value) > 2000:
            raise serializers.ValidationError('項目描述不能超過2000個字符')
        return value
    
    def validate_technologies(self, value):
        """驗證技術棧"""
        if value and len(value) > 20:
            raise serializers.ValidationError('技術棧不能超過20項')
        return value
    
    def validate_project_url(self, value):
        """驗證項目URL"""
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError('項目URL必須以 http:// 或 https:// 開始')
        return value
    
    def validate_github_url(self, value):
        """驗證GitHub URL"""
        if value and not value.startswith('https://github.com/'):
            raise serializers.ValidationError('請輸入有效的GitHub倉庫URL')
        return value
    
    def validate_youtube_url(self, value):
        """驗證YouTube URL"""
        if value and 'youtube.com' not in value and 'youtu.be' not in value:
            raise serializers.ValidationError('請輸入有效的YouTube視頻URL')
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


class PasswordChangeSerializer(serializers.Serializer):
    """
    密碼修改序列化器
    """
    
    old_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """驗證新密碼確認"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': '兩次新密碼輸入不一致'
            })
        return attrs


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
    
    def validate_access_token(self, value):
        """驗證訪問令牌"""
        if not value:
            raise serializers.ValidationError('訪問令牌不能為空')
        return value 