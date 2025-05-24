import logging
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q, F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta

from .models import Post, Like, Save, Report, PostView, PostShare
from comments.models import Comment
from .serializers import (
    PostSerializer, CommentSerializer, ReplySerializer,
    LikeSerializer, SaveSerializer, ReportSerializer, PostShareSerializer
)

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.posts')


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


class PostViewSet(viewsets.ModelViewSet):
    """
    貼文視圖集，提供貼文相關操作的 API 端點
    
    提供貼文創建、查詢、更新、刪除等功能
    """
    serializer_class = PostSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'likes_count', 'comments_count']
    ordering = ['-created_at']
    
    def get_permissions(self):
        """
        根據不同的操作設置不同的權限
        """
        if self.action in ['list', 'retrieve', 'following_posts', 'trending']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        獲取貼文列表，根據不同的查詢參數過濾
        """
        queryset = Post.objects.all()
        
        # 根據作者過濾
        author_id = self.request.query_params.get('author')
        if author_id:
            queryset = queryset.filter(author_id=author_id)
            logger.info(f"按作者過濾貼文: {author_id}")
        
        # 根據關鍵字搜尋
        keyword = self.request.query_params.get('search')
        if keyword:
            queryset = queryset.filter(
                Q(content__icontains=keyword) |
                Q(code_snippet__icontains=keyword)
            )
            logger.info(f"按關鍵字搜尋貼文: {keyword}")
        
        return queryset
    
    def perform_create(self, serializer):
        """
        創建貼文時設置作者為當前用戶
        """
        try:
            serializer.save(author=self.request.user)
            logger.info(f"用戶 {self.request.user.username} 創建了新貼文")
        except Exception as e:
            logger.error(f"貼文創建失敗: {str(e)}")
            raise ValidationError(f"貼文創建失敗: {str(e)}")
    
    def perform_update(self, serializer):
        """
        更新貼文
        """
        try:
            serializer.save()
            logger.info(f"用戶 {self.request.user.username} 更新了貼文 {serializer.instance.id}")
        except Exception as e:
            logger.error(f"貼文更新失敗: {str(e)}")
            raise ValidationError(f"貼文更新失敗: {str(e)}")
    
    def perform_destroy(self, instance):
        """
        刪除貼文
        """
        try:
            instance.delete()
            logger.info(f"用戶 {self.request.user.username} 刪除了貼文 {instance.id}")
        except Exception as e:
            logger.error(f"貼文刪除失敗: {str(e)}")
            raise ValidationError(f"貼文刪除失敗: {str(e)}")
    
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """
        點讚貼文
        """
        post = self.get_object()
        
        try:
            # 檢查是否已經點讚
            if Like.objects.filter(user=request.user, post=post).exists():
                logger.warning(f"用戶 {request.user.username} 已經點讚過貼文 {post.id}")
                return Response(
                    {"detail": "您已經點讚過這篇貼文"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 創建點讚
            with transaction.atomic():
                like = Like.objects.create(user=request.user, post=post)
                logger.info(f"用戶 {request.user.username} 點讚貼文 {post.id}")
                return Response({"detail": "點讚成功"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"貼文點讚失敗: {str(e)}")
            return Response(
                {"detail": f"點讚失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def unlike(self, request, pk=None):
        """
        取消點讚貼文
        """
        post = self.get_object()
        
        try:
            # 檢查是否已經點讚
            like = Like.objects.filter(user=request.user, post=post).first()
            if not like:
                logger.warning(f"用戶 {request.user.username} 未點讚過貼文 {post.id}")
                return Response(
                    {"detail": "您未點讚過這篇貼文"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 刪除點讚
            like.delete()
            logger.info(f"用戶 {request.user.username} 取消點讚貼文 {post.id}")
            return Response({"detail": "取消點讚成功"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"取消點讚失敗: {str(e)}")
            return Response(
                {"detail": f"取消點讚失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def save(self, request, pk=None):
        """
        收藏貼文
        """
        post = self.get_object()
        
        try:
            # 檢查是否已經收藏
            if Save.objects.filter(user=request.user, post=post).exists():
                logger.warning(f"用戶 {request.user.username} 已經收藏過貼文 {post.id}")
                return Response(
                    {"detail": "您已經收藏過這篇貼文"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 創建收藏
            with transaction.atomic():
                save = Save.objects.create(user=request.user, post=post)
                logger.info(f"用戶 {request.user.username} 收藏貼文 {post.id}")
                return Response({"detail": "收藏成功"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"貼文收藏失敗: {str(e)}")
            return Response(
                {"detail": f"收藏失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def unsave(self, request, pk=None):
        """
        取消收藏貼文
        """
        post = self.get_object()
        
        try:
            # 檢查是否已經收藏
            save = Save.objects.filter(user=request.user, post=post).first()
            if not save:
                logger.warning(f"用戶 {request.user.username} 未收藏過貼文 {post.id}")
                return Response(
                    {"detail": "您未收藏過這篇貼文"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 刪除收藏
            save.delete()
            logger.info(f"用戶 {request.user.username} 取消收藏貼文 {post.id}")
            return Response({"detail": "取消收藏成功"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"取消收藏失敗: {str(e)}")
            return Response(
                {"detail": f"取消收藏失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def report(self, request, pk=None):
        """
        舉報貼文
        """
        post = self.get_object()
        
        # 獲取舉報數據
        reason = request.data.get('reason')
        description = request.data.get('description', '')
        
        try:
            # 檢查是否已經舉報過
            if Report.objects.filter(reporter=request.user, post=post).exists():
                logger.warning(f"用戶 {request.user.username} 已經舉報過貼文 {post.id}")
                return Response(
                    {"detail": "您已經舉報過這篇貼文"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 創建舉報
            with transaction.atomic():
                report = Report.objects.create(
                    reporter=request.user,
                    post=post,
                    reason=reason,
                    description=description
                )
                logger.info(f"用戶 {request.user.username} 舉報貼文 {post.id}")
                return Response({"detail": "舉報成功，我們會盡快處理"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"貼文舉報失敗: {str(e)}")
            return Response(
                {"detail": f"舉報失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def following_posts(self, request):
        """
        獲取關注用戶的貼文
        """
        try:
            from profiles.models import Follow
            
            # 獲取當前用戶關注的用戶
            following_users = Follow.objects.filter(follower=request.user).values_list('following', flat=True)
            
            if not following_users:
                return Response({"message": "您還沒有關注任何用戶", "posts": []})
            
            # 獲取關注用戶的貼文
            posts = Post.objects.filter(author__in=following_users)
            
            # 分頁與序列化
            page = self.paginate_queryset(posts)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(posts, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取關注用戶貼文失敗: {str(e)}")
            return Response(
                {"detail": f"獲取關注用戶貼文失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def trending(self, request):
        """
        獲取熱門貼文（過去24小時內點讚數最多）
        """
        try:
            # 計算24小時前的時間
            yesterday = timezone.now() - timedelta(days=1)
            
            # 獲取熱門貼文
            trending_posts = Post.objects.filter(
                created_at__gte=yesterday
            ).order_by('-likes_count', '-comments_count', '-created_at')
            
            # 分頁與序列化
            page = self.paginate_queryset(trending_posts)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(trending_posts, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取熱門貼文失敗: {str(e)}")
            return Response(
                {"detail": f"獲取熱門貼文失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """
        獲取個性化推薦貼文
        """
        try:
            from .recommendation import recommendation_engine
            
            # 獲取推薦貼文
            recommended_posts = recommendation_engine.get_recommendations(
                user=request.user,
                limit=20
            )
            
            # 分頁與序列化
            page = self.paginate_queryset(recommended_posts)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(recommended_posts, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取推薦貼文失敗: {str(e)}")
            return Response(
                {"detail": f"獲取推薦貼文失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def record_interaction(self, request, pk=None):
        """
        記錄用戶與貼文的互動行為，用於優化推薦系統
        
        互動類型：view（瀏覽）、like（點讚）、comment（評論）、share（分享）
        """
        try:
            from .recommendation import recommendation_engine
            
            post = self.get_object()
            action = request.data.get('action')
            
            if action not in ['view', 'like', 'comment', 'share']:
                return Response(
                    {"detail": "無效的互動類型"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 更新用戶偏好
            recommendation_engine.update_user_preferences(
                user=request.user,
                post=post,
                action=action
            )
            
            # 如果是瀏覽行為，記錄到瀏覽歷史
            if action == 'view':
                PostView.objects.get_or_create(
                    user=request.user,
                    post=post,
                    defaults={'created_at': timezone.now()}
                )
                
                # 增加貼文瀏覽數
                Post.objects.filter(id=post.id).update(
                    views_count=F('views_count') + 1
                )
            
            logger.info(f"用戶 {request.user.username} 對貼文 {post.id} 執行了 {action} 操作")
            
            return Response({"detail": "互動記錄成功"}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"記錄用戶互動失敗: {str(e)}")
            return Response(
                {"detail": f"記錄互動失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def saved(self, request):
        """
        獲取用戶收藏的貼文
        """
        try:
            # 獲取用戶收藏的貼文
            saved_posts = Post.objects.filter(saved_by__user=request.user)
            
            # 分頁與序列化
            page = self.paginate_queryset(saved_posts)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(saved_posts, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取收藏貼文失敗: {str(e)}")
            return Response(
                {"detail": f"獲取收藏貼文失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """
        轉發貼文
        """
        post = self.get_object()
        comment = request.data.get('comment', '')
        
        try:
            # 檢查是否已經轉發過
            if PostShare.objects.filter(user=request.user, post=post).exists():
                logger.warning(f"用戶 {request.user.username} 已經轉發過貼文 {post.id}")
                return Response(
                    {"detail": "您已經轉發過這篇貼文"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 檢查是否試圖轉發自己的貼文
            if post.author == request.user:
                logger.warning(f"用戶 {request.user.username} 嘗試轉發自己的貼文 {post.id}")
                return Response(
                    {"detail": "不能轉發自己的貼文"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 創建轉發記錄
            with transaction.atomic():
                share = PostShare.objects.create(
                    user=request.user,
                    post=post,
                    comment=comment
                )
                logger.info(f"用戶 {request.user.username} 轉發貼文 {post.id}")
                
                # 序列化轉發記錄
                serializer = PostShareSerializer(share, context={'request': request})
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"轉發貼文失敗: {str(e)}")
            return Response(
                {"detail": f"轉發失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def unshare(self, request, pk=None):
        """
        取消轉發貼文
        """
        post = self.get_object()
        
        try:
            # 檢查是否已經轉發
            share = PostShare.objects.filter(user=request.user, post=post).first()
            if not share:
                logger.warning(f"用戶 {request.user.username} 未轉發過貼文 {post.id}")
                return Response(
                    {"detail": "您未轉發過這篇貼文"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 刪除轉發記錄
            share.delete()
            logger.info(f"用戶 {request.user.username} 取消轉發貼文 {post.id}")
            return Response({"detail": "取消轉發成功"}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"取消轉發失敗: {str(e)}")
            return Response(
                {"detail": f"取消轉發失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def shared_posts(self, request):
        """
        獲取用戶轉發的貼文
        """
        try:
            # 獲取用戶轉發的貼文
            shared_posts = PostShare.objects.filter(user=request.user).order_by('-created_at')
            
            # 分頁與序列化
            page = self.paginate_queryset(shared_posts)
            if page is not None:
                serializer = PostShareSerializer(page, many=True, context={'request': request})
                return self.get_paginated_response(serializer.data)
            
            serializer = PostShareSerializer(shared_posts, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取轉發貼文失敗: {str(e)}")
            return Response(
                {"detail": f"獲取轉發貼文失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CommentViewSet(viewsets.ModelViewSet):
    """
    評論視圖集，提供評論相關操作的 API 端點
    
    提供評論創建、查詢、更新、刪除等功能
    """
    serializer_class = CommentSerializer
    
    def get_permissions(self):
        """
        根據不同的操作設置不同的權限
        """
        if self.action in ['list', 'retrieve', 'post_comments', 'replies']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        獲取評論列表，只返回頂層評論（沒有父評論的評論）
        """
        return Comment.objects.filter(parent=None)
    
    def perform_create(self, serializer):
        """
        創建評論時設置用戶為當前用戶
        """
        try:
            serializer.save(author=self.request.user)
            logger.info(f"用戶 {self.request.user.username} 創建了新評論")
        except Exception as e:
            logger.error(f"評論創建失敗: {str(e)}")
            raise ValidationError(f"評論創建失敗: {str(e)}")
    
    def perform_update(self, serializer):
        """
        更新評論
        """
        try:
            # 只允許用戶更新自己的評論
            instance = serializer.instance
            if instance.author != self.request.user:
                logger.warning(f"用戶 {self.request.user.username} 嘗試更新其他用戶的評論")
                raise ValidationError("無權限更新其他用戶的評論")
            
            serializer.save()
            logger.info(f"用戶 {self.request.user.username} 更新了評論 {instance.id}")
        except Exception as e:
            logger.error(f"評論更新失敗: {str(e)}")
            raise ValidationError(f"評論更新失敗: {str(e)}")
    
    def perform_destroy(self, instance):
        """
        刪除評論
        """
        try:
            # 只允許用戶刪除自己的評論
            if instance.author != self.request.user:
                logger.warning(f"用戶 {self.request.user.username} 嘗試刪除其他用戶的評論")
                raise ValidationError("無權限刪除其他用戶的評論")
            
            instance.delete()
            logger.info(f"用戶 {self.request.user.username} 刪除了評論 {instance.id}")
        except Exception as e:
            logger.error(f"評論刪除失敗: {str(e)}")
            raise ValidationError(f"評論刪除失敗: {str(e)}")
    
    @action(detail=False, methods=['get'])
    def post_comments(self, request):
        """
        獲取指定貼文的評論
        """
        post_id = request.query_params.get('post_id')
        if not post_id:
            logger.warning("未提供貼文ID")
            return Response(
                {"detail": "未提供貼文ID"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 獲取貼文
            post = get_object_or_404(Post, id=post_id)
            
            # 獲取貼文的頂層評論
            comments = Comment.objects.filter(post=post, parent=None)
            
            # 分頁與序列化
            page = self.paginate_queryset(comments)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(comments, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取貼文評論失敗: {str(e)}")
            return Response(
                {"detail": f"獲取貼文評論失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def replies(self, request, pk=None):
        """
        獲取評論的回覆
        """
        try:
            comment = self.get_object()
            replies = comment.replies.all()
            
            # 分頁與序列化
            page = self.paginate_queryset(replies)
            if page is not None:
                serializer = ReplySerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = ReplySerializer(replies, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取評論回覆失敗: {str(e)}")
            return Response(
                {"detail": f"獲取評論回覆失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 