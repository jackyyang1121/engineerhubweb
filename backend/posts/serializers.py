import logging
from rest_framework import serializers
from django.db import transaction
from django.utils.html import strip_tags
from .models import Post, PostMedia, Like, Save, Report, PostShare
from comments.models import Comment
from users.serializers import UserSerializer
from django.db import models

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.posts')


class PostMediaSerializer(serializers.ModelSerializer):
    """
    貼文媒體序列化器
    """
    class Meta:
        model = PostMedia
        fields = ['id', 'file', 'media_type', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class CommentSerializer(serializers.ModelSerializer):
    """
    評論序列化器
    """
    author_details = UserSerializer(source='user', read_only=True)
    replies_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id', 'user', 'post', 'parent', 'content', 
            'created_at', 'updated_at', 'author_details',
            'replies_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_replies_count(self, obj):
        """
        獲取回覆數量
        """
        return obj.replies.count()
    
    def validate(self, data):
        """
        驗證評論數據
        """
        # 驗證評論內容
        if not data.get('content', '').strip():
            logger.warning("評論內容為空")
            raise serializers.ValidationError("評論內容不能為空")
        
        # 驗證父評論
        parent = data.get('parent')
        if parent and parent.post != data.get('post'):
            logger.warning(f"父評論 {parent.id} 與貼文 {data.get('post').id} 不匹配")
            raise serializers.ValidationError("回覆的評論必須屬於同一貼文")
        
        return data
    
    def create(self, validated_data):
        """
        創建評論
        """
        try:
            comment = Comment.objects.create(**validated_data)
            logger.info(f"用戶 {validated_data['user'].username} 評論成功: {comment.id}")
            return comment
        except Exception as e:
            logger.error(f"創建評論失敗: {str(e)}")
            raise serializers.ValidationError(f"創建評論失敗: {str(e)}")


class ReplySerializer(serializers.ModelSerializer):
    """
    回覆序列化器
    """
    author_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Comment
        fields = [
            'id', 'user', 'content', 'created_at', 
            'updated_at', 'author_details'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PostSerializer(serializers.ModelSerializer):
    """
    貼文序列化器
    """
    author_details = UserSerializer(source='author', read_only=True)
    media = PostMediaSerializer(many=True, read_only=True)
    media_files = serializers.ListField(
        child=serializers.FileField(), 
        write_only=True,
        required=False
    )
    media_types = serializers.ListField(
        child=serializers.ChoiceField(choices=[('image', '圖片'), ('video', '影片')]),
        write_only=True,
        required=False
    )
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    is_shared = serializers.SerializerMethodField()
    comments_list = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'author', 'author_details', 'content', 
            'code_snippet', 'code_language', 'code_highlighted',
            'created_at', 'updated_at', 'likes_count', 'comments_count',
            'shares_count', 'views_count', 'media', 'media_files', 'media_types',
            'is_liked', 'is_saved', 'is_shared', 'comments_list'
        ]
        read_only_fields = [
            'id', 'author_details', 'code_highlighted', 'created_at', 
            'updated_at', 'likes_count', 'comments_count', 'shares_count',
            'views_count', 'is_liked', 'is_saved', 'is_shared', 'comments_list'
        ]
    
    def get_is_liked(self, obj):
        """
        檢查當前用戶是否點讚了該貼文
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Like.objects.filter(user=request.user, post=obj).exists()
        return False
    
    def get_is_saved(self, obj):
        """
        檢查當前用戶是否收藏了該貼文
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Save.objects.filter(user=request.user, post=obj).exists()
        return False
    
    def get_is_shared(self, obj):
        """
        檢查當前用戶是否轉發了該貼文
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return PostShare.objects.filter(user=request.user, post=obj).exists()
        return False
    
    def get_comments_list(self, obj):
        """
        獲取貼文的評論列表（只返回頂層評論）
        """
        # 限制返回的評論數量，避免數據過大
        comments = Comment.objects.filter(post=obj, parent=None).order_by('-created_at')[:3]
        return CommentSerializer(comments, many=True, context=self.context).data
    
    def validate(self, data):
        """
        驗證貼文數據
        """
        # 驗證貼文內容
        content = data.get('content', '').strip()
        code_snippet = data.get('code_snippet', '').strip()
        media_files = data.get('media_files', [])
        
        if not content and not code_snippet and not media_files:
            logger.warning("貼文內容為空")
            raise serializers.ValidationError("貼文必須包含文字、程式碼或媒體文件")
        
        # 驗證媒體文件與媒體類型數量是否匹配
        media_types = data.get('media_types', [])
        if len(media_files) != len(media_types):
            logger.warning(f"媒體文件數量 {len(media_files)} 與媒體類型數量 {len(media_types)} 不匹配")
            raise serializers.ValidationError("媒體文件數量與媒體類型數量必須一致")
        
        # 驗證程式碼長度
        if code_snippet and len(code_snippet.splitlines()) > 100:
            logger.warning("程式碼行數超過 100 行")
            raise serializers.ValidationError("程式碼行數不能超過 100 行")
        
        # 驗證媒體數量
        if len(media_files) > 10:
            logger.warning(f"媒體文件數量 {len(media_files)} 超過限制")
            raise serializers.ValidationError("媒體文件數量不能超過 10 個")
        
        return data
    
    def create(self, validated_data):
        """
        創建貼文
        """
        media_files = validated_data.pop('media_files', [])
        media_types = validated_data.pop('media_types', [])
        
        try:
            with transaction.atomic():
                # 創建貼文
                post = Post.objects.create(**validated_data)
                logger.info(f"用戶 {validated_data['author'].username} 創建貼文成功: {post.id}")
                
                # 處理媒體文件
                for i, (file, media_type) in enumerate(zip(media_files, media_types)):
                    PostMedia.objects.create(
                        post=post,
                        file=file,
                        media_type=media_type,
                        order=i
                    )
                    logger.info(f"貼文 {post.id} 添加媒體文件: {media_type}")
                
                return post
        except Exception as e:
            logger.error(f"創建貼文失敗: {str(e)}")
            raise serializers.ValidationError(f"創建貼文失敗: {str(e)}")
    
    def update(self, instance, validated_data):
        """
        更新貼文
        """
        media_files = validated_data.pop('media_files', [])
        media_types = validated_data.pop('media_types', [])
        
        try:
            with transaction.atomic():
                # 更新貼文基本信息
                for attr, value in validated_data.items():
                    setattr(instance, attr, value)
                instance.save()
                
                # 如果有新媒體文件，清除舊的並添加新的
                if media_files:
                    instance.media.all().delete()
                    for i, (file, media_type) in enumerate(zip(media_files, media_types)):
                        PostMedia.objects.create(
                            post=instance,
                            file=file,
                            media_type=media_type,
                            order=i
                        )
                
                logger.info(f"貼文 {instance.id} 更新成功")
                return instance
        except Exception as e:
            logger.error(f"更新貼文失敗: {str(e)}")
            raise serializers.ValidationError(f"更新貼文失敗: {str(e)}")


class LikeSerializer(serializers.ModelSerializer):
    """
    點讚序列化器
    """
    class Meta:
        model = Like
        fields = ['id', 'user', 'post', 'created_at']
        read_only_fields = ['id', 'created_at']
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=Like.objects.all(),
                fields=['user', 'post'],
                message="您已經點讚過此貼文"
            )
        ]


class SaveSerializer(serializers.ModelSerializer):
    """
    收藏序列化器
    """
    class Meta:
        model = Save
        fields = ['id', 'user', 'post', 'created_at']
        read_only_fields = ['id', 'created_at']
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=Save.objects.all(),
                fields=['user', 'post'],
                message="您已經收藏過此貼文"
            )
        ]


class ReportSerializer(serializers.ModelSerializer):
    """
    舉報序列化器
    """
    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'post', 'reason', 'description', 
            'status', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at']
    
    def validate(self, data):
        """
        驗證舉報數據
        """
        # 檢查是否已經舉報過
        if Report.objects.filter(
            reporter=data['reporter'], 
            post=data['post']
        ).exists():
            logger.warning(f"用戶 {data['reporter'].username} 重複舉報貼文 {data['post'].id}")
            raise serializers.ValidationError("您已經舉報過此貼文")
        
        return data


class PostShareSerializer(serializers.ModelSerializer):
    """
    貼文轉發序列化器
    """
    user_details = UserSerializer(source='user', read_only=True)
    post_details = PostSerializer(source='post', read_only=True)
    
    class Meta:
        model = PostShare
        fields = ['id', 'user', 'post', 'comment', 'created_at', 'user_details', 'post_details']
        read_only_fields = ['id', 'created_at', 'user_details', 'post_details']
    
    def validate(self, data):
        """
        驗證轉發數據
        """
        # 檢查是否已經轉發過
        if PostShare.objects.filter(
            user=data['user'], 
            post=data['post']
        ).exists():
            logger.warning(f"用戶 {data['user'].username} 重複轉發貼文 {data['post'].id}")
            raise serializers.ValidationError("您已經轉發過此貼文")
        
        # 檢查是否是自己的貼文
        if data['post'].author == data['user']:
            logger.warning(f"用戶 {data['user'].username} 嘗試轉發自己的貼文 {data['post'].id}")
            raise serializers.ValidationError("不能轉發自己的貼文")
        
        return data
    
    def create(self, validated_data):
        """
        創建轉發記錄
        """
        try:
            share = PostShare.objects.create(**validated_data)
            
            # 更新貼文轉發數
            Post.objects.filter(id=share.post.id).update(
                shares_count=models.F('shares_count') + 1
            )
            
            logger.info(f"用戶 {validated_data['user'].username} 轉發貼文成功: {share.post.id}")
            return share
        except Exception as e:
            logger.error(f"轉發貼文失敗: {str(e)}")
            raise serializers.ValidationError(f"轉發貼文失敗: {str(e)}") 