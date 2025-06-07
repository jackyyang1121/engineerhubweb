"""
貼文視圖層
使用服務層處理業務邏輯，視圖層只負責請求/響應處理
"""

import logging
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound
from django.db.models import Q

from core.services import ServiceRegistry, ServiceError, NotFoundError, PermissionError as ServicePermissionError, BusinessLogicError
from .models import Post, Comment
from .serializers import PostSerializer, PostShareSerializer
from comments.serializers import CommentSerializer

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.posts.views')


class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    自定義權限：只有作者可以編輯，其他用戶只能讀取
    """
    def has_object_permission(self, request, view, obj):
        # 允許所有用戶讀取
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 只有作者可以編輯
        return obj.author == request.user


class ServiceMixin:
    """
    服務層混入類
    提供服務訪問和錯誤處理
    """
    def get_service(self, service_name: str):
        """獲取服務"""
        try:
            return ServiceRegistry.get(service_name)
        except ValueError as e:
            logger.error(f"Service not found: {service_name}")
            raise RuntimeError(f"Service configuration error: {str(e)}")
    
    def handle_service_error(self, error: Exception) -> Response:
        """統一處理服務層錯誤"""
        if isinstance(error, NotFoundError):
            return Response(
                {"detail": error.message, "code": error.code},
                status=status.HTTP_404_NOT_FOUND
            )
        elif isinstance(error, ServicePermissionError):
            return Response(
                {"detail": error.message, "code": error.code},
                status=status.HTTP_403_FORBIDDEN
            )
        elif isinstance(error, BusinessLogicError):
            return Response(
                {"detail": error.message, "code": error.code},
                status=status.HTTP_400_BAD_REQUEST
            )
        elif isinstance(error, ServiceError):
            return Response(
                {"detail": error.message, "code": error.code},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        else:
            logger.error(f"Unexpected error: {str(error)}")
            return Response(
                {"detail": "發生未預期的錯誤", "code": "unexpected_error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PostViewSet(ServiceMixin, viewsets.ModelViewSet):
    """
    貼文視圖集
    處理貼文的基本 CRUD 操作
    """
    serializer_class = PostSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'likes_count', 'comments_count']
    ordering = ['-created_at']
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]
    
    def get_queryset(self):
        """獲取貼文列表"""
        post_service = self.get_service('post_service')
        queryset = Post.objects.all()
        
        # 根據作者過濾
        author_id = self.request.query_params.get('author')
        if author_id:
            queryset = queryset.filter(author_id=author_id)
        
        # 根據關鍵字搜尋
        keyword = self.request.query_params.get('search')
        if keyword:
            queryset = post_service.search_posts(keyword)
        
        return queryset
    
    def perform_create(self, serializer):
        """創建貼文"""
        try:
            post_service = self.get_service('post_service')
            post = post_service.create_post(
                author=self.request.user,
                **serializer.validated_data
            )
            serializer.instance = post
        except ServiceError as e:
            logger.error(f"Failed to create post: {str(e)}")
            raise ValidationError({"detail": e.message})
    
    def perform_update(self, serializer):
        """更新貼文"""
        try:
            post_service = self.get_service('post_service')
            post = post_service.update_post(
                post=serializer.instance,
                user=self.request.user,
                **serializer.validated_data
            )
            serializer.instance = post
        except ServiceError as e:
            logger.error(f"Failed to update post: {str(e)}")
            if isinstance(e, ServicePermissionError):
                raise PermissionDenied({"detail": e.message})
            raise ValidationError({"detail": e.message})
    
    def perform_destroy(self, instance):
        """刪除貼文"""
        try:
            post_service = self.get_service('post_service')
            post_service.delete_post(
                post=instance,
                user=self.request.user
            )
        except ServiceError as e:
            logger.error(f"Failed to delete post: {str(e)}")
            if isinstance(e, ServicePermissionError):
                raise PermissionDenied({"detail": e.message})
            raise ValidationError({"detail": e.message})


class PostInteractionViewSet(ServiceMixin, viewsets.GenericViewSet):
    """
    貼文互動視圖集
    處理點讚、收藏、轉發等互動操作
    """
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """點讚貼文"""
        post = self.get_object()
        try:
            interaction_service = self.get_service('post_interaction_service')
            interaction_service.like_post(request.user, post)
            return Response({"detail": "點讚成功"}, status=status.HTTP_201_CREATED)
        except ServiceError as e:
            return self.handle_service_error(e)
    
    @action(detail=True, methods=['post'])
    def unlike(self, request, pk=None):
        """取消點讚"""
        post = self.get_object()
        try:
            interaction_service = self.get_service('post_interaction_service')
            interaction_service.unlike_post(request.user, post)
            return Response({"detail": "取消點讚成功"}, status=status.HTTP_200_OK)
        except ServiceError as e:
            return self.handle_service_error(e)
    
    @action(detail=True, methods=['post'])
    def save(self, request, pk=None):
        """收藏貼文"""
        post = self.get_object()
        try:
            interaction_service = self.get_service('post_interaction_service')
            interaction_service.save_post(request.user, post)
            return Response({"detail": "收藏成功"}, status=status.HTTP_201_CREATED)
        except ServiceError as e:
            return self.handle_service_error(e)
    
    @action(detail=True, methods=['post'])
    def unsave(self, request, pk=None):
        """取消收藏"""
        post = self.get_object()
        try:
            interaction_service = self.get_service('post_interaction_service')
            interaction_service.unsave_post(request.user, post)
            return Response({"detail": "取消收藏成功"}, status=status.HTTP_200_OK)
        except ServiceError as e:
            return self.handle_service_error(e)
    
    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """轉發貼文"""
        post = self.get_object()
        comment = request.data.get('comment', '')
        
        try:
            interaction_service = self.get_service('post_interaction_service')
            share = interaction_service.share_post(request.user, post, comment)
            serializer = PostShareSerializer(share, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ServiceError as e:
            return self.handle_service_error(e)
    
    @action(detail=True, methods=['post'])
    def unshare(self, request, pk=None):
        """取消轉發"""
        post = self.get_object()
        try:
            interaction_service = self.get_service('post_interaction_service')
            interaction_service.unshare_post(request.user, post)
            return Response({"detail": "取消轉發成功"}, status=status.HTTP_200_OK)
        except ServiceError as e:
            return self.handle_service_error(e)
    
    @action(detail=True, methods=['post'])
    def report(self, request, pk=None):
        """舉報貼文"""
        post = self.get_object()
        reason = request.data.get('reason')
        description = request.data.get('description', '')
        
        if not reason:
            return Response(
                {"detail": "請提供舉報原因"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            interaction_service = self.get_service('post_interaction_service')
            interaction_service.report_post(request.user, post, reason, description)
            return Response({"detail": "舉報成功，我們會盡快處理"}, status=status.HTTP_201_CREATED)
        except ServiceError as e:
            return self.handle_service_error(e)


class PostFeedViewSet(ServiceMixin, viewsets.GenericViewSet):
    """
    貼文動態視圖集
    處理各種貼文列表：關注、熱門、推薦等
    """
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def following(self, request):
        """獲取關注用戶的貼文"""
        try:
            post_service = self.get_service('post_service')
            posts = post_service.get_following_posts(request.user)
            
            if not posts.exists():
                return Response({"message": "您還沒有關注任何用戶", "posts": []})
            
            page = self.paginate_queryset(posts)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(posts, many=True)
            return Response(serializer.data)
        except ServiceError as e:
            return self.handle_service_error(e)
    
    @action(detail=False, methods=['get'])
    def trending(self, request):
        """獲取熱門貼文"""
        try:
            post_service = self.get_service('post_service')
            posts = post_service.get_trending_posts()
            
            page = self.paginate_queryset(posts)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(posts, many=True)
            return Response(serializer.data)
        except ServiceError as e:
            return self.handle_service_error(e)
    
    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """獲取推薦貼文"""
        try:
            post_service = self.get_service('post_service')
            user = request.user if request.user.is_authenticated else None
            posts = post_service.get_recommended_posts(user)
            
            page = self.paginate_queryset(posts)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(posts, many=True)
            return Response(serializer.data)
        except ServiceError as e:
            return self.handle_service_error(e)
    
    @action(detail=False, methods=['get'])
    def saved(self, request):
        """獲取收藏的貼文"""
        try:
            interaction_service = self.get_service('post_interaction_service')
            posts = interaction_service.get_user_saved_posts(request.user)
            
            page = self.paginate_queryset(posts)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(posts, many=True)
            return Response(serializer.data)
        except ServiceError as e:
            return self.handle_service_error(e)
    
    @action(detail=False, methods=['get'])
    def shared(self, request):
        """獲取轉發的貼文"""
        try:
            interaction_service = self.get_service('post_interaction_service')
            shares = interaction_service.get_user_shared_posts(request.user)
            
            page = self.paginate_queryset(shares)
            if page is not None:
                serializer = PostShareSerializer(page, many=True, context={'request': request})
                return self.get_paginated_response(serializer.data)
            
            serializer = PostShareSerializer(shares, many=True, context={'request': request})
            return Response(serializer.data)
        except ServiceError as e:
            return self.handle_service_error(e)


class CommentViewSet(ServiceMixin, viewsets.ModelViewSet):
    """
    評論視圖集
    處理評論相關操作
    """
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """獲取評論列表"""
        queryset = super().get_queryset()
        post_id = self.request.query_params.get('post_id')
        if post_id:
            queryset = queryset.filter(post_id=post_id)
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """創建評論"""
        serializer.save(author=self.request.user)
        logger.info(f"User {self.request.user.username} created comment")
    
    def perform_update(self, serializer):
        """更新評論"""
        if serializer.instance.author != self.request.user:
            raise PermissionDenied({"detail": "您沒有權限編輯此評論"})
        serializer.save()
        logger.info(f"User {self.request.user.username} updated comment {serializer.instance.id}")
    
    def perform_destroy(self, instance):
        """刪除評論"""
        if instance.author != self.request.user:
            raise PermissionDenied({"detail": "您沒有權限刪除此評論"})
        comment_id = instance.id
        instance.delete()
        logger.info(f"User {self.request.user.username} deleted comment {comment_id}")
    
    @action(detail=False, methods=['get'])
    def post_comments(self, request):
        """獲取特定貼文的評論"""
        post_id = request.query_params.get('post_id')
        if not post_id:
            return Response(
                {"detail": "請提供 post_id 參數"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response(
                {"detail": "貼文不存在"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        comments = self.get_queryset().filter(post=post)
        page = self.paginate_queryset(comments)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(comments, many=True)
        return Response(serializer.data) 