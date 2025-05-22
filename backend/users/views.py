import logging
from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q

from .models import CustomUser, UserFollowing
from .serializers import (
    UserSerializer, UserRegistrationSerializer,
    UserUpdateSerializer, ChangePasswordSerializer,
    UserFollowingSerializer, UserFollowerSerializer
)

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.users')

class UserViewSet(viewsets.ModelViewSet):
    """
    用戶視圖集，提供用戶相關操作的 API 端點
    
    提供用戶資訊查詢、註冊、更新、關注等功能
    """
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        """
        根據不同的操作設置不同的權限
        """
        if self.action in ['create', 'list', 'search']:
            permission_classes = [permissions.AllowAny]
        elif self.action in ['retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """
        根據不同的操作選擇不同的序列化器
        """
        if self.action == 'create':
            return UserRegistrationSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return UserUpdateSerializer
        elif self.action == 'change_password':
            return ChangePasswordSerializer
        elif self.action == 'follow':
            return UserFollowingSerializer
        elif self.action == 'followers':
            return UserFollowerSerializer
        elif self.action == 'following':
            return UserFollowingSerializer
        return UserSerializer
    
    def create(self, request, *args, **kwargs):
        """
        創建新用戶
        """
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            logger.info(f"用戶註冊成功: {user.username}")
            return Response(
                UserSerializer(user).data,
                status=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            logger.error(f"用戶註冊驗證錯誤: {str(e)}")
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"用戶註冊未知錯誤: {str(e)}")
            return Response(
                {"detail": f"註冊失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, *args, **kwargs):
        """
        獲取用戶詳細資訊
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取用戶詳細資訊錯誤: {str(e)}")
            return Response(
                {"detail": f"獲取用戶資訊失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """
        更新用戶資料
        """
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            
            # 只允許用戶更新自己的資料
            if instance != request.user and not request.user.is_staff:
                logger.warning(f"用戶 {request.user.username} 嘗試更新其他用戶 {instance.username} 的資料")
                return Response(
                    {"detail": "無權限更新其他用戶的資料"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            logger.info(f"用戶 {instance.username} 資料更新成功")
            return Response(serializer.data)
        except ValidationError as e:
            logger.error(f"用戶資料更新驗證錯誤: {str(e)}")
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"用戶資料更新未知錯誤: {str(e)}")
            return Response(
                {"detail": f"更新用戶資料失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        """
        修改密碼
        """
        user = self.get_object()
        
        # 只允許用戶修改自己的密碼
        if user != request.user and not request.user.is_staff:
            logger.warning(f"用戶 {request.user.username} 嘗試修改其他用戶 {user.username} 的密碼")
            return Response(
                {"detail": "無權限修改其他用戶的密碼"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            logger.info(f"用戶 {user.username} 密碼修改成功")
            return Response({"detail": "密碼修改成功"})
        except ValidationError as e:
            logger.error(f"用戶密碼修改驗證錯誤: {str(e)}")
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"用戶密碼修改未知錯誤: {str(e)}")
            return Response(
                {"detail": f"密碼修改失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def follow(self, request, pk=None):
        """
        關注用戶
        """
        following_user = self.get_object()
        
        # 不能關注自己
        if following_user == request.user:
            logger.warning(f"用戶 {request.user.username} 嘗試關注自己")
            return Response(
                {"detail": "不能關注自己"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 檢查是否已經關注
            if UserFollowing.objects.filter(
                user=request.user, 
                following_user=following_user
            ).exists():
                logger.warning(f"用戶 {request.user.username} 已經關注 {following_user.username}")
                return Response(
                    {"detail": "已經關注該用戶"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 創建關注關係
            with transaction.atomic():
                following = UserFollowing.objects.create(
                    user=request.user,
                    following_user=following_user
                )
                logger.info(f"用戶 {request.user.username} 成功關注 {following_user.username}")
                serializer = UserFollowingSerializer(following)
                return Response(serializer.data)
        except Exception as e:
            logger.error(f"關注用戶錯誤: {str(e)}")
            return Response(
                {"detail": f"關注用戶失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def unfollow(self, request, pk=None):
        """
        取消關注用戶
        """
        following_user = self.get_object()
        
        try:
            # 檢查是否已經關注
            following = UserFollowing.objects.filter(
                user=request.user, 
                following_user=following_user
            ).first()
            
            if not following:
                logger.warning(f"用戶 {request.user.username} 未關注 {following_user.username}")
                return Response(
                    {"detail": "未關注該用戶"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 刪除關注關係
            following.delete()
            logger.info(f"用戶 {request.user.username} 成功取消關注 {following_user.username}")
            return Response({"detail": "取消關注成功"})
        except Exception as e:
            logger.error(f"取消關注用戶錯誤: {str(e)}")
            return Response(
                {"detail": f"取消關注用戶失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def followers(self, request, pk=None):
        """
        獲取用戶的粉絲列表
        """
        user = self.get_object()
        
        try:
            followers = UserFollowing.objects.filter(following_user=user)
            page = self.paginate_queryset(followers)
            if page is not None:
                serializer = UserFollowerSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = UserFollowerSerializer(followers, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取用戶粉絲列表錯誤: {str(e)}")
            return Response(
                {"detail": f"獲取粉絲列表失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def following(self, request, pk=None):
        """
        獲取用戶的關注列表
        """
        user = self.get_object()
        
        try:
            following = UserFollowing.objects.filter(user=user)
            page = self.paginate_queryset(following)
            if page is not None:
                serializer = UserFollowingSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = UserFollowingSerializer(following, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取用戶關注列表錯誤: {str(e)}")
            return Response(
                {"detail": f"獲取關注列表失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        搜尋用戶
        """
        query = request.query_params.get('q', '')
        if not query:
            return Response(
                {"detail": "搜尋關鍵字不能為空"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            users = CustomUser.objects.filter(
                Q(username__icontains=query) | 
                Q(first_name__icontains=query) | 
                Q(last_name__icontains=query)
            )
            
            page = self.paginate_queryset(users)
            if page is not None:
                serializer = UserSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = UserSerializer(users, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"搜尋用戶錯誤: {str(e)}")
            return Response(
                {"detail": f"搜尋用戶失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        獲取當前登入用戶的資訊
        """
        try:
            serializer = UserSerializer(request.user)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"獲取當前用戶資訊錯誤: {str(e)}")
            return Response(
                {"detail": f"獲取當前用戶資訊失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 