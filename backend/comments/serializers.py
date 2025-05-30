"""
EngineerHub - 評論序列化器
定義評論相關的序列化器
"""

import logging
from rest_framework import serializers
from .models import Comment, CommentLike, CommentReport
from accounts.serializers import UserSerializer

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.comments')


class CommentSerializer(serializers.ModelSerializer):
    """
    評論序列化器
    """
    author_details = UserSerializer(source='user', read_only=True)
    replies_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id', 'user', 'post', 'parent', 'content', 
            'created_at', 'updated_at', 'author_details',
            'replies_count', 'likes_count', 'is_liked',
            'is_deleted', 'is_edited'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'likes_count', 'is_deleted', 'is_edited']
    
    def get_replies_count(self, obj):
        """
        獲取回覆數量
        """
        return obj.replies_count
    
    def get_is_liked(self, obj):
        """
        檢查當前用戶是否點讚了該評論
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return CommentLike.objects.filter(user=request.user, comment=obj).exists()
        return False
    
    def validate(self, data):
        """
        驗證評論數據
        """
        # 驗證評論內容
        content = data.get('content', '').strip()
        if not content:
            logger.warning("評論內容為空")
            raise serializers.ValidationError("評論內容不能為空")
        
        # 驗證父評論
        parent = data.get('parent')
        post = data.get('post')
        if parent and post and parent.post != post:
            logger.warning(f"父評論 {parent.id} 與貼文 {post.id} 不匹配")
            raise serializers.ValidationError("回覆的評論必須屬於同一貼文")
        
        return data


class ReplySerializer(serializers.ModelSerializer):
    """
    回覆序列化器（簡化版的評論序列化器）
    """
    author_details = UserSerializer(source='user', read_only=True)
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id', 'user', 'content', 'created_at', 
            'updated_at', 'author_details', 'likes_count',
            'is_liked', 'is_deleted', 'is_edited'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'likes_count', 'is_deleted', 'is_edited']
    
    def get_is_liked(self, obj):
        """
        檢查當前用戶是否點讚了該評論
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return CommentLike.objects.filter(user=request.user, comment=obj).exists()
        return False


class CommentLikeSerializer(serializers.ModelSerializer):
    """
    評論點讚序列化器
    """
    class Meta:
        model = CommentLike
        fields = ['id', 'user', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']


class CommentReportSerializer(serializers.ModelSerializer):
    """
    評論舉報序列化器
    """
    class Meta:
        model = CommentReport
        fields = [
            'id', 'reporter', 'comment', 'reason', 'description', 
            'status', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at'] 