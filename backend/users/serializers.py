import logging
from rest_framework import serializers
from .models import CustomUser, UserFollowing
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.users')

class UserSerializer(serializers.ModelSerializer):
    """
    用戶序列化器，用於顯示用戶資訊
    """
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'phone_number', 'avatar', 'bio', 'skills', 'is_online',
            'date_joined', 'last_online', 'followers_count', 'following_count'
        ]
        read_only_fields = ['id', 'date_joined', 'last_online', 'is_online']
    
    def get_followers_count(self, obj):
        """
        獲取用戶粉絲數量
        """
        return obj.followers.count()
    
    def get_following_count(self, obj):
        """
        獲取用戶關注數量
        """
        return obj.following.count()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    用戶註冊序列化器
    """
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True, 
        required=True, 
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone_number'
        ]
    
    def validate(self, data):
        """
        驗證密碼是否匹配並符合規範
        """
        # 檢查密碼是否匹配
        if data['password'] != data['password_confirm']:
            logger.warning(f"用戶註冊密碼不匹配: {data['username']}")
            raise serializers.ValidationError({"password": "兩次輸入的密碼不匹配"})
        
        # 使用 Django 內建的密碼驗證
        try:
            validate_password(data['password'])
        except ValidationError as e:
            logger.warning(f"用戶註冊密碼不符合規範: {data['username']}")
            raise serializers.ValidationError({"password": e.messages})
        
        return data
    
    def create(self, validated_data):
        """
        創建用戶
        """
        validated_data.pop('password_confirm')
        
        try:
            with transaction.atomic():
                user = CustomUser.objects.create_user(
                    username=validated_data['username'],
                    email=validated_data['email'],
                    password=validated_data['password'],
                    first_name=validated_data.get('first_name', ''),
                    last_name=validated_data.get('last_name', ''),
                    phone_number=validated_data.get('phone_number', None)
                )
                logger.info(f"用戶註冊成功: {user.username}")
                return user
        except Exception as e:
            logger.error(f"用戶註冊失敗: {str(e)}")
            raise serializers.ValidationError({"detail": f"用戶註冊失敗: {str(e)}"})


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    用戶資料更新序列化器
    """
    class Meta:
        model = CustomUser
        fields = [
            'first_name', 'last_name', 'phone_number', 
            'avatar', 'bio', 'skills', 'notification_enabled'
        ]
    
    def update(self, instance, validated_data):
        """
        更新用戶資料
        """
        try:
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            logger.info(f"用戶資料更新成功: {instance.username}")
            return instance
        except Exception as e:
            logger.error(f"用戶資料更新失敗: {instance.username}, {str(e)}")
            raise serializers.ValidationError({"detail": f"用戶資料更新失敗: {str(e)}"})


class ChangePasswordSerializer(serializers.Serializer):
    """
    密碼更新序列化器
    """
    old_password = serializers.CharField(required=True, style={'input_type': 'password'})
    new_password = serializers.CharField(required=True, style={'input_type': 'password'})
    
    def validate_old_password(self, value):
        """
        驗證舊密碼是否正確
        """
        user = self.context['request'].user
        if not user.check_password(value):
            logger.warning(f"用戶密碼更新失敗 - 舊密碼不正確: {user.username}")
            raise serializers.ValidationError("舊密碼不正確")
        return value
    
    def validate_new_password(self, value):
        """
        驗證新密碼是否符合規範
        """
        try:
            validate_password(value)
        except ValidationError as e:
            logger.warning(f"用戶密碼更新失敗 - 新密碼不符合規範: {self.context['request'].user.username}")
            raise serializers.ValidationError(e.messages)
        return value
    
    def save(self):
        """
        保存新密碼
        """
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        logger.info(f"用戶密碼更新成功: {user.username}")


class UserFollowingSerializer(serializers.ModelSerializer):
    """
    用戶關注序列化器
    """
    following_user_details = UserSerializer(source='following_user', read_only=True)
    
    class Meta:
        model = UserFollowing
        fields = ['id', 'following_user', 'created_at', 'following_user_details']
        read_only_fields = ['created_at']
    
    def validate_following_user(self, value):
        """
        驗證關注的用戶
        """
        user = self.context['request'].user
        if user == value:
            logger.warning(f"用戶嘗試關注自己: {user.username}")
            raise serializers.ValidationError("不能關注自己")
        
        # 檢查是否已經關注
        if UserFollowing.objects.filter(user=user, following_user=value).exists():
            logger.warning(f"用戶重複關注: {user.username} -> {value.username}")
            raise serializers.ValidationError("已經關注該用戶")
        
        return value
    
    def create(self, validated_data):
        """
        創建關注關係
        """
        user = self.context['request'].user
        following_user = validated_data['following_user']
        
        try:
            following = UserFollowing.objects.create(
                user=user,
                following_user=following_user
            )
            logger.info(f"用戶關注成功: {user.username} -> {following_user.username}")
            return following
        except Exception as e:
            logger.error(f"用戶關注失敗: {user.username} -> {following_user.username}, {str(e)}")
            raise serializers.ValidationError({"detail": f"關注用戶失敗: {str(e)}"})


class UserFollowerSerializer(serializers.ModelSerializer):
    """
    用戶粉絲序列化器
    """
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = UserFollowing
        fields = ['id', 'user', 'created_at', 'user_details']
        read_only_fields = ['id', 'user', 'created_at'] 