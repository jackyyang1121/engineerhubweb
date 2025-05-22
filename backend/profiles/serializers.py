import logging
from rest_framework import serializers
from .models import Portfolio, PortfolioMedia
from users.serializers import UserSerializer

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.profiles')

class PortfolioMediaSerializer(serializers.ModelSerializer):
    """
    作品集媒體序列化器
    """
    class Meta:
        model = PortfolioMedia
        fields = [
            'id', 'portfolio', 'file', 'media_type', 'order', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate_file(self, value):
        """
        驗證文件大小
        """
        if value and value.size > 50 * 1024 * 1024:  # 50MB
            logger.warning(f"文件大小超過限制: {value.size} bytes")
            raise serializers.ValidationError("文件大小不能超過 50MB")
        return value


class PortfolioSerializer(serializers.ModelSerializer):
    """
    作品集序列化器
    """
    user_details = UserSerializer(source='user', read_only=True)
    media = PortfolioMediaSerializer(many=True, read_only=True)
    media_files = serializers.ListField(
        child=serializers.FileField(allow_empty_file=False),
        write_only=True,
        required=False
    )
    media_types = serializers.ListField(
        child=serializers.ChoiceField(choices=PortfolioMedia.MediaType.choices),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Portfolio
        fields = [
            'id', 'user', 'user_details', 'title', 'description',
            'github_link', 'project_link', 'youtube_link',
            'created_at', 'updated_at', 'media', 'media_files', 'media_types'
        ]
        read_only_fields = ['id', 'user_details', 'created_at', 'updated_at']
    
    def validate(self, data):
        """
        驗證數據
        """
        # 驗證媒體文件和媒體類型列表長度一致
        media_files = data.get('media_files', [])
        media_types = data.get('media_types', [])
        
        if media_files and media_types and len(media_files) != len(media_types):
            logger.warning("媒體文件列表和媒體類型列表長度不一致")
            raise serializers.ValidationError("媒體文件列表和媒體類型列表長度必須一致")
        
        return data
    
    def create(self, validated_data):
        """
        創建作品集
        """
        media_files = validated_data.pop('media_files', [])
        media_types = validated_data.pop('media_types', [])
        
        # 創建作品集
        portfolio = Portfolio.objects.create(**validated_data)
        
        # 創建作品集媒體
        for i, media_file in enumerate(media_files):
            media_type = media_types[i] if i < len(media_types) else PortfolioMedia.MediaType.IMAGE
            PortfolioMedia.objects.create(
                portfolio=portfolio,
                file=media_file,
                media_type=media_type,
                order=i
            )
        
        return portfolio
    
    def update(self, instance, validated_data):
        """
        更新作品集
        """
        media_files = validated_data.pop('media_files', [])
        media_types = validated_data.pop('media_types', [])
        
        # 更新作品集
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # 創建新的作品集媒體
        current_order = instance.media.count()
        for i, media_file in enumerate(media_files):
            media_type = media_types[i] if i < len(media_types) else PortfolioMedia.MediaType.IMAGE
            PortfolioMedia.objects.create(
                portfolio=instance,
                file=media_file,
                media_type=media_type,
                order=current_order + i
            )
        
        return instance 