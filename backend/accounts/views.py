"""
EngineerHub - 用戶API視圖
提供完整的用戶管理、認證、社交功能的REST API
"""

from rest_framework import status, generics, permissions, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
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
    UserSerializer, UserDetailSerializer, UserCreateSerializer,
    UserUpdateSerializer, FollowSerializer, PortfolioProjectSerializer,
    UserSettingsSerializer, CustomTokenObtainPairSerializer,
    PasswordChangeSerializer, UserSearchSerializer
)
from core.pagination import CustomPageNumberPagination
from core.permissions import IsOwnerOrReadOnly
from core.utils import get_client_ip

logger = logging.getLogger('engineerhub.accounts')


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    自定義JWT登入視圖
    增加登入日誌記錄和在線狀態更新
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            # 獲取用戶信息
            email = request.data.get('email')
            try:
                user = User.objects.get(email=email)
                user.update_online_status(True)
                
                # 記錄登入日誌
                logger.info(f'用戶登入成功: {user.username} from {get_client_ip(request)}')
                
                # 在響應中添加用戶信息
                response.data['user'] = UserSerializer(user).data
                
            except User.DoesNotExist:
                pass
        
        return response


class UserRegistrationView(generics.CreateAPIView):
    """
    用戶註冊視圖
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        
        # 創建用戶設置
        UserSettings.objects.create(user=user)
        
        # 記錄註冊日誌
        logger.info(f'新用戶註冊: {user.username} from {get_client_ip(self.request)}')

#密碼password1沒有驗證，之後可以新增驗證規則
class SimpleRegistrationView(generics.CreateAPIView):
    """
    簡化的用戶註冊視圖
    專門用於開發環境，避免複雜的驗證
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        """處理註冊請求"""
        data = request.data
        
        # 基本驗證
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password1 = data.get('password1', '') 
        password2 = data.get('password2', '')
        
        # 檢查必填欄位
        if not username or not password1:
            return Response(
                {'error': '用戶名和密碼是必填的'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 如果提供了 password2，檢查兩次密碼是否匹配
        if password2 and password1 != password2:
            return Response(
                {'error': '兩次密碼輸入不一致'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 檢查用戶名是否已存在
        if User.objects.filter(username=username).exists():
            return Response(
                {'username': ['用戶名已存在']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 檢查郵箱是否已存在
        if email and User.objects.filter(email=email).exists():
            return Response(
                {'email': ['郵箱已被註冊']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 創建用戶
            user = User.objects.create_user(
                username=username,
                email=email or '',
                password=password1,
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', '')
            )
            
            # 創建用戶設置
            UserSettings.objects.get_or_create(user=user)
            
            # 生成 JWT token
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            
            logger.info(f'新用戶註冊成功: {user.username}')
            
            return Response({
                'user': {
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                },
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f'註冊失敗: {e}')
            return Response(
                {'error': '註冊失敗，請稍後重試'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SimpleLoginView(generics.GenericAPIView):
    """
    簡化的用戶登入視圖
    支持郵箱或用戶名登入
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        """處理登入請求"""
        data = request.data
        
        # 支持 username 或 email 字段
        username_or_email = data.get('username') or data.get('email', '').strip()
        password = data.get('password', '')
        
        if not username_or_email or not password:
            return Response(
                {'error': '用戶名/郵箱和密碼是必填的'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 嘗試用戶名驗證
        from django.contrib.auth import authenticate
        user = authenticate(username=username_or_email, password=password)
        
        # 如果用戶名驗證失敗，嘗試郵箱驗證
        if user is None and '@' in username_or_email:
            # 通過郵箱查找用戶
            try:
                user_by_email = User.objects.get(email=username_or_email)
                user = authenticate(username=user_by_email.username, password=password)
            except User.DoesNotExist:
                pass
        
        if user is None:
            return Response(
                {'error': '用戶名/郵箱或密碼錯誤'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': '用戶帳戶已被禁用'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # 更新在線狀態
        user.update_online_status(True)
        
        # 生成 JWT token
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        logger.info(f'用戶登入: {user.username}')
        
        return Response({
            'user': {
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
        }, status=status.HTTP_200_OK)


class SimpleLogoutView(generics.GenericAPIView):
    """
    簡化的用戶登出視圖
    """
    permission_classes = [AllowAny]  # 允許所有人訪問，不管認證狀態
    
    def post(self, request, *args, **kwargs):
        """處理登出請求"""
        try:
            # 更新用戶在線狀態（如果已認證）
            if request.user.is_authenticated:
                request.user.update_online_status(False)
                logger.info(f'用戶登出: {request.user.username}')
            
            return Response({'message': '登出成功'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f'登出失敗: {e}')
            # 即使失敗也返回成功，因為登出不應該阻止用戶
            return Response({'message': '登出成功'}, status=status.HTTP_200_OK)


class UserViewSet(ModelViewSet):
    """
    用戶ViewSet
    提供用戶的CRUD操作和額外功能
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'first_name', 'last_name', 'bio']
    ordering_fields = ['created_at', 'followers_count', 'posts_count']
    ordering = ['-created_at']
    lookup_field = 'username'

    def get_queryset(self):
        """根據不同操作優化查詢"""
        queryset = User.objects.all()
        
        if self.action == 'list':
            # 列表頁面需要基本統計數據
            queryset = queryset.select_related('settings').only(
                'id', 'username', 'first_name', 'last_name', 'email',
                'avatar', 'bio', 'is_verified', 'followers_count',
                'following_count', 'posts_count', 'created_at'
            )
        elif self.action == 'retrieve':
            # 詳情頁面需要完整數據
            queryset = queryset.select_related('settings').prefetch_related(
                'portfolio_projects',
                Prefetch('posts', queryset=queryset.model.objects.filter(is_published=True)[:5])
            )
        
        return queryset

    def get_serializer_class(self):
        """根據操作返回不同的序列化器"""
        if self.action == 'retrieve':
            return UserDetailSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'search':
            return UserSearchSerializer
        return UserSerializer

    def get_permissions(self):
        """根據操作設置權限"""
        if self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
        elif self.action in ['list', 'retrieve', 'search', 'recommended', 'trending', 'online']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """
        獲取或更新當前用戶信息
        """
        if request.method == 'GET':
            logger.info(f"用戶信息請求 - 用戶: {request.user}, 已認證: {request.user.is_authenticated}")
            if request.user.is_authenticated:
                serializer = self.get_serializer(request.user)
                return Response(serializer.data)
            else:
                logger.warning("未認證用戶嘗試訪問 /users/me/")
                return Response(
                    {'detail': '認證憑證無效或缺失'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        elif request.method == 'PATCH':
            if not request.user.is_authenticated:
                return Response(
                    {'detail': '認證憑證無效或缺失'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

    @action(detail=True, methods=['post', 'delete'])
    def follow(self, request, username=None):
        """
        關注/取消關注用戶
        POST /users/{username}/follow/ - 關注用戶
        DELETE /users/{username}/follow/ - 取消關注用戶
        """
        target_user = get_object_or_404(User, username=username)
        current_user = request.user

        # 不能關注自己
        if target_user == current_user:
            return Response(
                {'error': '不能關注自己'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.method == 'POST':
            follow, created = Follow.objects.get_or_create(
                follower=current_user,
                following=target_user
            )
            
            if created:
                logger.info(f'{current_user.username} 關注了 {target_user.username}')
                return Response({'message': '關注成功'}, status=status.HTTP_201_CREATED)
            else:
                return Response({'message': '已經關注了'}, status=status.HTTP_200_OK)

        elif request.method == 'DELETE':
            try:
                follow = Follow.objects.get(
                    follower=current_user,
                    following=target_user
                )
                follow.delete()
                logger.info(f'{current_user.username} 取消關注了 {target_user.username}')
                return Response({'message': '取消關注成功'}, status=status.HTTP_200_OK)
            except Follow.DoesNotExist:
                return Response(
                    {'error': '沒有關注該用戶'},
                    status=status.HTTP_400_BAD_REQUEST
                )

    @action(detail=True, methods=['get'])
    def followers(self, request, username=None):
        """
        獲取用戶的關注者列表
        GET /users/{username}/followers/
        """
        user = get_object_or_404(User, username=username)
        followers = User.objects.filter(
            following_set__following=user
        ).order_by('-following_set__created_at')
        
        page = self.paginate_queryset(followers)
        if page is not None:
            serializer = UserSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = UserSerializer(followers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def following(self, request, username=None):
        """
        獲取用戶的關注列表
        GET /users/{username}/following/
        """
        user = get_object_or_404(User, username=username)
        following = User.objects.filter(
            followers_set__follower=user
        ).order_by('-followers_set__created_at')
        
        page = self.paginate_queryset(following)
        if page is not None:
            serializer = UserSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = UserSerializer(following, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        搜索用戶
        GET /users/search/?q=關鍵詞
        """
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'results': []})

        # 搜索用戶名、姓名、簡介
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(bio__icontains=query)
        ).order_by('-followers_count')[:10]

        serializer = UserSearchSerializer(users, many=True)
        return Response({'results': serializer.data})

    @action(detail=True, methods=['post', 'delete'])
    def block(self, request, username=None):
        """
        拉黑/取消拉黑用戶
        POST /users/{username}/block/ - 拉黑用戶
        DELETE /users/{username}/block/ - 取消拉黑用戶
        """
        target_user = get_object_or_404(User, username=username)
        current_user = request.user

        if target_user == current_user:
            return Response(
                {'error': '不能拉黑自己'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.method == 'POST':
            reason = request.data.get('reason', '')
            blocked, created = BlockedUser.objects.get_or_create(
                blocker=current_user,
                blocked=target_user,
                defaults={'reason': reason}
            )
            
            if created:
                # 如果有關注關係，自動取消
                Follow.objects.filter(
                    Q(follower=current_user, following=target_user) |
                    Q(follower=target_user, following=current_user)
                ).delete()
                
                logger.info(f'{current_user.username} 拉黑了 {target_user.username}')
                return Response({'message': '拉黑成功'}, status=status.HTTP_201_CREATED)
            else:
                return Response({'message': '已經拉黑了'}, status=status.HTTP_200_OK)

        elif request.method == 'DELETE':
            try:
                blocked = BlockedUser.objects.get(
                    blocker=current_user,
                    blocked=target_user
                )
                blocked.delete()
                logger.info(f'{current_user.username} 取消拉黑了 {target_user.username}')
                return Response({'message': '取消拉黑成功'}, status=status.HTTP_200_OK)
            except BlockedUser.DoesNotExist:
                return Response(
                    {'error': '沒有拉黑該用戶'},
                    status=status.HTTP_400_BAD_REQUEST
                )

    @action(detail=False, methods=['get'])
    def online(self, request):
        """
        獲取在線用戶列表
        GET /users/online/
        """
        online_users = User.objects.filter(
            is_online=True,
            hide_online_status=False
        ).order_by('-last_online')[:20]

        serializer = UserSerializer(online_users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def trending(self, request):
        """
        獲取熱門用戶（本週新增關注者最多）
        GET /users/trending/
        """
        cache_key = 'trending_users'
        trending_users = cache.get(cache_key)
        
        if trending_users is None:
            # 計算本週新增關注者數量
            week_ago = timezone.now() - timezone.timedelta(days=7)
            trending_users = User.objects.annotate(
                week_followers=Count(
                    'followers_set',
                    filter=Q(followers_set__created_at__gte=week_ago)
                )
            ).filter(week_followers__gt=0).order_by('-week_followers')[:10]
            
            # 緩存1小時
            cache.set(cache_key, trending_users, 3600)

        serializer = UserSerializer(trending_users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def recommended(self, request):
        """
        獲取推薦用戶
        GET /users/recommended/
        """
        try:
            current_user = request.user if request.user.is_authenticated else None
            
            # 檢查緩存
            cache_key = f'recommended_users_{current_user.id if current_user else "anonymous"}'
            recommended_users = cache.get(cache_key)
            
            if recommended_users is None:
                # 獲取推薦用戶的邏輯
                if current_user and current_user.is_authenticated:
                    # 已登入用戶：基於關注網絡和技能匹配推薦
                    recommended_users = self._get_personalized_recommendations(current_user)
                else:
                    # 未登入用戶：推薦熱門用戶
                    recommended_users = self._get_popular_users()
                
                # 緩存30分鐘
                cache.set(cache_key, recommended_users, 1800)
            
            # 序列化用戶數據，包含 is_following 信息
            user_data = []
            for user in recommended_users:
                serializer = UserSerializer(user, context={'request': request})
                user_data.append(serializer.data)
            
            return Response({
                'users': user_data,
                'total_count': len(user_data)
            })
            
        except Exception as e:
            logger.error(f"獲取推薦用戶失敗: {str(e)}")
            return Response(
                {'detail': f'獲取推薦用戶失敗: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_personalized_recommendations(self, user, limit=10):
        """
        為已登入用戶獲取個性化推薦
        """
        try:
            # 獲取用戶已關注的人
            following_ids = user.following.values_list('id', flat=True)
            
            # 獲取用戶關注的人也關注的人（二度關注）
            second_degree_follows = User.objects.filter(
                followers__in=following_ids
            ).exclude(
                id__in=list(following_ids) + [user.id]
            ).annotate(
                mutual_count=Count('followers', filter=Q(followers__in=following_ids))
            ).filter(
                is_active=True,
                mutual_count__gt=0
            ).order_by('-mutual_count', '-followers_count')[:limit//2]
            
            # 獲取技能相關的用戶
            user_skills = getattr(user, 'skill_tags', []) or []
            skill_based_users = User.objects.filter(
                skill_tags__overlap=user_skills
            ).exclude(
                id__in=list(following_ids) + [user.id]
            ).exclude(
                id__in=[u.id for u in second_degree_follows]
            ).filter(
                is_active=True
            ).order_by('-followers_count')[:limit//2]
            
            # 合併推薦結果
            recommended = list(second_degree_follows) + list(skill_based_users)
            
            # 如果推薦數量不足，補充熱門用戶
            if len(recommended) < limit:
                popular_users = self._get_popular_users(
                    limit=limit - len(recommended),
                    exclude_ids=[user.id] + list(following_ids) + [u.id for u in recommended]
                )
                recommended.extend(popular_users)
            
            return recommended[:limit]
            
        except Exception as e:
            logger.error(f"獲取個性化推薦失敗: {str(e)}")
            return self._get_popular_users(limit)
    
    def _get_popular_users(self, limit=10, exclude_ids=None):
        """
        獲取熱門用戶
        """
        exclude_ids = exclude_ids or []
        
        return User.objects.filter(
            is_active=True
        ).exclude(
            id__in=exclude_ids
        ).order_by(
            '-followers_count', 
            '-posts_count', 
            '-created_at'
        )[:limit]


class PortfolioProjectViewSet(ModelViewSet):
    """
    作品集項目ViewSet
    """
    serializer_class = PortfolioProjectSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        if hasattr(self, 'kwargs') and 'username' in self.kwargs:
            user = get_object_or_404(User, username=self.kwargs['username'])
            return PortfolioProject.objects.filter(user=user)
        return PortfolioProject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if 'username' in self.kwargs:
            user = get_object_or_404(User, username=self.kwargs['username'])
            if user != self.request.user:
                raise permissions.PermissionDenied('只能創建自己的作品集項目')
            serializer.save(user=user)
        else:
            serializer.save(user=self.request.user)


class UserSettingsView(generics.RetrieveUpdateAPIView):
    """
    用戶設置視圖
    """
    serializer_class = UserSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        settings, created = UserSettings.objects.get_or_create(
            user=self.request.user
        )
        return settings


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    修改密碼
    POST /users/change-password/
    """
    serializer = PasswordChangeSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        
        # 驗證舊密碼
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': {'old_password': ['舊密碼不正確']}},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 設置新密碼
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        logger.info(f'用戶修改密碼: {user.username}')
        return Response({'message': '密碼修改成功'})
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """
    上傳頭像
    POST /users/upload-avatar/
    """
    if 'avatar' not in request.FILES:
        return Response(
            {'error': '請選擇頭像文件'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    avatar_file = request.FILES['avatar']
    
    # 文件大小檢查（10MB）
    if avatar_file.size > 10 * 1024 * 1024:
        return Response(
            {'error': '頭像文件不能超過10MB'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 文件類型檢查
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if avatar_file.content_type not in allowed_types:
        return Response(
            {'error': '只支援 JPEG、PNG、GIF、WebP 格式的圖片'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = request.user
    user.avatar = avatar_file
    user.save()
    
    logger.info(f'用戶上傳頭像: {user.username}')
    return Response({
        'message': '頭像上傳成功',
        'avatar_url': user.avatar_url
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """
    刪除帳戶
    DELETE /users/delete-account/
    """
    password = request.data.get('password')
    confirmation = request.data.get('confirmation')
    
    if not password:
        return Response(
            {'error': '請輸入密碼確認'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if confirmation != 'DELETE':
        return Response(
            {'error': '請輸入 DELETE 確認刪除'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = request.user
    
    # 驗證密碼
    if not user.check_password(password):
        return Response(
            {'error': '密碼不正確'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 記錄刪除日誌
    logger.warning(f'用戶刪除帳戶: {user.username}')
    
    # 軟刪除用戶（將 is_active 設為 False）
    user.is_active = False
    user.email = f"deleted_{user.id}@deleted.com"
    user.username = f"deleted_{user.id}"
    user.save()
    
    return Response({'message': '帳戶已刪除'})


@api_view(['GET'])
@permission_classes([AllowAny])
def user_stats(request, username):
    """
    獲取用戶統計數據
    GET /users/{username}/stats/
    """
    user = get_object_or_404(User, username=username)
    
    # 從緩存獲取統計數據
    cache_key = f'user_stats_{user.id}'
    stats = cache.get(cache_key)
    
    if stats is None:
        stats = {
            'posts_count': user.posts_count,
            'followers_count': user.followers_count,
            'following_count': user.following_count,
            'likes_received_count': user.likes_received_count,
            'joined_date': user.created_at.isoformat(),
            'is_online': user.is_online,
            'last_online': user.last_online.isoformat() if user.last_online else None,
        }
        
        # 緩存5分鐘
        cache.set(cache_key, stats, 300)
    
    return Response(stats) 