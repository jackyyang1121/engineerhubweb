"""
EngineerHub - 用戶 API 視圖

使用 dj-rest-auth + allauth 後的變化：
- 移除自定義認證視圖（登入/登出/註冊）
- 保留用戶管理相關視圖
- 專注於用戶資料、關注、作品集等業務邏輯

認證功能已遷移到 dj-rest-auth：
- 註冊: POST /api/auth/registration/
- 登入: POST /api/auth/login/
- 登出: POST /api/auth/logout/
- 用戶信息: GET/PUT /api/auth/user/
"""

from rest_framework import status, generics, permissions, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.db.models import Q, Count, Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
import logging

from .models import User, Follow, PortfolioProject, UserSettings, BlockedUser
from .serializers import (
    UserSerializer, UserDetailSerializer, UserUpdateSerializer, 
    FollowSerializer, PortfolioProjectSerializer, UserSettingsSerializer,
    UserSearchSerializer
)
from core.pagination import CustomPageNumberPagination
from core.permissions import IsOwnerOrReadOnly
from core.utils import get_client_ip

logger = logging.getLogger('engineerhub.accounts')

# ==================== 用戶管理 ViewSet ====================

class UserViewSet(ModelViewSet):
    """
    用戶 ViewSet - 提供完整的用戶管理功能
    
    功能包括：
    - 用戶列表和詳情查看
    - 用戶資料更新
    - 關注/取消關注
    - 用戶搜索
    - 黑名單管理
    - 在線用戶查看
    - 推薦用戶
    
    注意：認證功能已遷移到 dj-rest-auth
    """
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'first_name', 'last_name', 'bio']
    ordering_fields = ['created_at', 'followers_count', 'posts_count']
    ordering = ['-created_at']
    lookup_field = 'username'  # 使用用戶名而不是 ID 進行查找

    def get_queryset(self):
        """
        自定義查詢集，優化性能並過濾被拉黑的用戶
        """
        # 由於 User 模型已有 followers_count、following_count、posts_count 字段
        # 我們不需要重複註解，直接使用模型字段即可
        # 使用 Prefetch 來處理可能不存在的 settings，避免 N+1 查詢問題
        queryset = User.objects.prefetch_related(
            'followers', 'following', 'portfolio_projects', 'settings'
        )
        
        # 如果用戶已認證，過濾掉被當前用戶拉黑的用戶
        if self.request.user.is_authenticated:
            blocked_users = BlockedUser.objects.filter(
                blocker=self.request.user
            ).values_list('blocked_id', flat=True)
            queryset = queryset.exclude(id__in=blocked_users)
        
        return queryset

    def get_serializer_class(self):
        """
        根據操作類型返回不同的序列化器
        """
        if self.action == 'retrieve':
            return UserDetailSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'search':
            return UserSearchSerializer
        return UserSerializer

    def get_permissions(self):
        """
        根據操作類型設置不同的權限
        """
        if self.action in ['list', 'retrieve', 'search', 'recommended']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """
        獲取或更新當前用戶信息
        
        GET /api/users/me/ - 獲取當前用戶詳細信息
        PATCH /api/users/me/ - 更新當前用戶信息
        
        注意：基本的用戶信息更新也可以使用 dj-rest-auth 的 /api/auth/user/ 端點
        """
        if request.method == 'GET':
            serializer = UserDetailSerializer(
                request.user, 
                context={'request': request}
            )
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            serializer = UserUpdateSerializer(
                request.user, 
                data=request.data, 
                partial=True,
                context={'request': request}
            )
            if serializer.is_valid():
                serializer.save()
                
                # 記錄用戶資料更新日誌
                logger.info(f'用戶資料更新: {request.user.username} from {get_client_ip(request)}')
                
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post', 'delete'])
    def follow(self, request, username=None):
        """
        關注或取消關注用戶
        
        POST /api/users/{username}/follow/ - 關注用戶
        DELETE /api/users/{username}/follow/ - 取消關注用戶
        """
        target_user = self.get_object()
        
        # 不能關注自己
        if target_user == request.user:
            return Response(
                {'error': '不能關注自己'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 檢查是否被拉黑
        if BlockedUser.objects.filter(
            blocker=target_user, 
            blocked=request.user
        ).exists():
            return Response(
                {'error': '無法關注此用戶'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.method == 'POST':
            # 關注用戶
            follow, created = Follow.objects.get_or_create(
                follower=request.user,
                following=target_user
            )
            
            if created:
                # 更新關注數量（可以考慮使用 Celery 異步處理）
                target_user.followers_count = target_user.followers.count()
                target_user.save(update_fields=['followers_count'])
                
                request.user.following_count = request.user.following.count()
                request.user.save(update_fields=['following_count'])
                
                logger.info(f'用戶關注: {request.user.username} -> {target_user.username}')
                
                return Response(
                    {'message': f'已關注 {target_user.username}'}, 
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {'message': '已經關注此用戶'}, 
                    status=status.HTTP_200_OK
                )
        
        elif request.method == 'DELETE':
            # 取消關注
            try:
                follow = Follow.objects.get(
                    follower=request.user,
                    following=target_user
                )
                follow.delete()
                
                # 更新關注數量
                target_user.followers_count = target_user.followers.count()
                target_user.save(update_fields=['followers_count'])
                
                request.user.following_count = request.user.following.count()
                request.user.save(update_fields=['following_count'])
                
                logger.info(f'取消關注: {request.user.username} -> {target_user.username}')
                
                return Response(
                    {'message': f'已取消關注 {target_user.username}'}, 
                    status=status.HTTP_200_OK
                )
            except Follow.DoesNotExist:
                return Response(
                    {'error': '尚未關注此用戶'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

    @action(detail=True, methods=['get'])
    def followers(self, request, username=None):
        """
        獲取用戶的關注者列表
        
        GET /api/users/{username}/followers/
        """
        user = self.get_object()
        followers = Follow.objects.filter(following=user).select_related('follower')
        
        page = self.paginate_queryset(followers)
        if page is not None:
            serializer = FollowSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = FollowSerializer(followers, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def following(self, request, username=None):
        """
        獲取用戶關注的人列表
        
        GET /api/users/{username}/following/
        """
        user = self.get_object()
        following = Follow.objects.filter(follower=user).select_related('following')
        
        page = self.paginate_queryset(following)
        if page is not None:
            serializer = FollowSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = FollowSerializer(following, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        搜索用戶
        
        GET /api/users/search/?q=關鍵字
        """
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': '請提供搜索關鍵字'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 使用 Q 對象進行複雜查詢
        users = self.get_queryset().filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(bio__icontains=query)
        ).distinct()
        
        page = self.paginate_queryset(users)
        if page is not None:
            serializer = UserSearchSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = UserSearchSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post', 'delete'])
    def block(self, request, username=None):
        """
        拉黑或取消拉黑用戶
        
        POST /api/users/{username}/block/ - 拉黑用戶
        DELETE /api/users/{username}/block/ - 取消拉黑用戶
        """
        target_user = self.get_object()
        
        # 不能拉黑自己
        if target_user == request.user:
            return Response(
                {'error': '不能拉黑自己'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if request.method == 'POST':
            # 拉黑用戶
            reason = request.data.get('reason', '')
            blocked, created = BlockedUser.objects.get_or_create(
                blocker=request.user,
                blocked=target_user,
                defaults={'reason': reason}
            )
            
            if created:
                # 如果之前有關注關係，自動取消
                Follow.objects.filter(
                    Q(follower=request.user, following=target_user) |
                    Q(follower=target_user, following=request.user)
                ).delete()
                
                # 更新關注數量
                request.user.following_count = request.user.following.count()
                request.user.save(update_fields=['following_count'])
                
                target_user.followers_count = target_user.followers.count()
                target_user.save(update_fields=['followers_count'])
                
                logger.info(f'用戶拉黑: {request.user.username} -> {target_user.username}')
                
                return Response(
                    {'message': f'已拉黑 {target_user.username}'}, 
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {'message': '已經拉黑此用戶'}, 
                    status=status.HTTP_200_OK
                )
        
        elif request.method == 'DELETE':
            # 取消拉黑
            try:
                blocked = BlockedUser.objects.get(
                    blocker=request.user,
                    blocked=target_user
                )
                blocked.delete()
                
                logger.info(f'取消拉黑: {request.user.username} -> {target_user.username}')
                
                return Response(
                    {'message': f'已取消拉黑 {target_user.username}'}, 
                    status=status.HTTP_200_OK
                )
            except BlockedUser.DoesNotExist:
                return Response(
                    {'error': '尚未拉黑此用戶'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

    @action(detail=False, methods=['get'])
    def online(self, request):
        """
        獲取在線用戶列表
        
        GET /api/users/online/
        """
        # 獲取最近 15 分鐘內活躍的用戶
        online_threshold = timezone.now() - timezone.timedelta(minutes=15)
        online_users = self.get_queryset().filter(
            last_online__gte=online_threshold,
            settings__show_online_status=True
        )
        
        page = self.paginate_queryset(online_users)
        if page is not None:
            serializer = UserSearchSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = UserSearchSerializer(online_users, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def trending(self, request):
        """
        獲取熱門用戶（基於最近的關注增長）
        
        GET /api/users/trending/
        """
        # 使用緩存提高性能
        cache_key = 'trending_users'
        trending_users = cache.get(cache_key)
        
        if trending_users is None:
            # 獲取最近 7 天內關注者增長最多的用戶
            seven_days_ago = timezone.now() - timezone.timedelta(days=7)
            trending_users = self.get_queryset().annotate(
                recent_followers=Count(
                    'followers',
                    filter=Q(followers__created_at__gte=seven_days_ago)
                )
            ).filter(
                recent_followers__gt=0
            ).order_by('-recent_followers', '-followers_count')[:20]
            
            # 緩存 1 小時
            cache.set(cache_key, list(trending_users), 3600)
        
        page = self.paginate_queryset(trending_users)
        if page is not None:
            serializer = UserSearchSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = UserSearchSerializer(trending_users, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def recommended(self, request):
        """
        獲取推薦用戶
        
        GET /api/users/recommended/
        
        推薦邏輯：
        - 已登入用戶：基於關注關係的協同過濾推薦
        - 未登入用戶：返回熱門用戶
        """
        if request.user.is_authenticated:
            # 已登入用戶：個性化推薦
            recommended_users = self._get_personalized_recommendations(request.user)
        else:
            # 未登入用戶：返回熱門用戶
            recommended_users = self._get_popular_users()
        
        page = self.paginate_queryset(recommended_users)
        if page is not None:
            serializer = UserSearchSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = UserSearchSerializer(recommended_users, many=True, context={'request': request})
        return Response(serializer.data)

    def _get_personalized_recommendations(self, user, limit=10):
        """
        基於協同過濾的個性化推薦
        """
        following_ids = list(user.following.values_list('id', flat=True))
        
        # “朋友的朋友”
        friends_of_friends = User.objects.filter(
            followers__id__in=following_ids
        ).exclude(
            id__in=following_ids + [user.id]
        ).annotate(
            common_friends=Count('followers', filter=Q(followers__id__in=following_ids))
        ).order_by('-common_friends', '-followers_count')
        
        # 如果數量不足，填充熱門用戶
        if friends_of_friends.count() < limit:
            additional_users = self._get_popular_users(
                limit - friends_of_friends.count(),
                exclude_ids=list(following_ids) + [user.id] + [u.id for u in friends_of_friends]
            )
            friends_of_friends = list(friends_of_friends) + list(additional_users)
        
        return friends_of_friends[:limit]

    def _get_popular_users(self, limit=10, exclude_ids=None):
        """
        獲取熱門用戶（基於關注者數量）
        """
        if exclude_ids is None:
            exclude_ids = []
        
        # 先嘗試獲取有關注者的用戶
        popular_users = User.objects.exclude(
            id__in=exclude_ids
        ).filter(
            followers_count__gt=0
        ).order_by('-followers_count', '-created_at')[:limit]
        
        # 如果沒有足夠的有關注者的用戶，補充其他活躍用戶
        if popular_users.count() < limit:
            remaining_limit = limit - popular_users.count()
            additional_users = User.objects.exclude(
                id__in=exclude_ids + [u.id for u in popular_users]
            ).filter(
                is_active=True
            ).order_by('-posts_count', '-created_at')[:remaining_limit]
            
            # 合併結果
            return list(popular_users) + list(additional_users)
        
        return popular_users

# ==================== 作品集管理 ViewSet ====================

class PortfolioProjectViewSet(ModelViewSet):
    """
    作品集項目 ViewSet - 管理用戶的作品集項目
    """
    
    serializer_class = PortfolioProjectSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        """只返回當前用戶的作品集項目"""
        return PortfolioProject.objects.filter(
            user=self.request.user
        ).order_by('-is_featured', 'order', '-created_at')

    def perform_create(self, serializer):
        """創建作品集項目時自動設置用戶"""
        serializer.save(user=self.request.user)
        
        logger.info(f'作品集項目創建: {self.request.user.username} - {serializer.instance.title}')

# ==================== 用戶設置管理 ====================

class UserSettingsView(generics.RetrieveUpdateAPIView):
    """
    用戶設置視圖 - 獲取和更新用戶設置
    
    GET /api/users/settings/ - 獲取當前用戶設置
    PUT/PATCH /api/users/settings/ - 更新用戶設置
    """
    
    serializer_class = UserSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """獲取當前用戶的設置，如果不存在則創建"""
        settings, created = UserSettings.objects.get_or_create(user=self.request.user)
        return settings

# ==================== 功能性 API 視圖 ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """
    上傳用戶頭像
    
    POST /api/users/upload-avatar/
    """
    if 'avatar' not in request.FILES:
        return Response(
            {'error': '請選擇頭像文件'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    avatar_file = request.FILES['avatar']
    
    # 驗證文件大小（5MB）
    if avatar_file.size > 5 * 1024 * 1024:
        return Response(
            {'error': '頭像文件大小不能超過5MB'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 驗證文件類型
    allowed_types = ['image/jpeg', 'image/png', 'image/gif']
    if avatar_file.content_type not in allowed_types:
        return Response(
            {'error': '頭像只支持 JPEG、PNG、GIF 格式'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 更新用戶頭像
    request.user.avatar = avatar_file
    request.user.save(update_fields=['avatar'])
    
    logger.info(f'頭像上傳: {request.user.username}')
    
    return Response({
        'message': '頭像上傳成功',
        'avatar_url': request.user.avatar_url
    })

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """
    刪除用戶帳號
    
    DELETE /api/users/delete-account/
    
    注意：這是不可逆操作，會刪除用戶的所有數據
    """
    password = request.data.get('password')
    
    if not password:
        return Response(
            {'error': '請提供密碼確認'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 驗證密碼
    if not request.user.check_password(password):
        return Response(
            {'error': '密碼錯誤'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    username = request.user.username
    
    # 記錄帳號刪除日誌
    logger.warning(f'帳號刪除: {username} from {get_client_ip(request)}')
    
    # 刪除用戶帳號（會級聯刪除相關數據）
    request.user.delete()
    
    return Response({
        'message': '帳號已成功刪除'
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def user_stats(request, username):
    """
    獲取用戶統計信息
    
    GET /api/users/{username}/stats/
    """
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(
            {'error': '用戶不存在'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # 檢查隱私設置（安全獲取用戶設置，如果不存在則使用默認值）
    try:
        profile_visibility = user.settings.profile_visibility
    except UserSettings.DoesNotExist:
        profile_visibility = 'public'  # 默認為公開
    
    if (profile_visibility == 'private' and 
        request.user != user and 
        not Follow.objects.filter(follower=request.user, following=user).exists()):
        return Response(
            {'error': '此用戶的資料為私人'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    stats = {
        'posts_count': user.posts.filter(is_published=True).count(),
        'followers_count': user.followers.count(),
        'following_count': user.following.count(),
        'likes_received_count': user.likes_received_count,
        'joined_date': user.created_at,
        'is_online': user.is_online,
        'last_online': user.last_online,
    }
    
    return Response(stats) 