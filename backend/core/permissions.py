"""
EngineerHub - 簡化的權限系統
只保留實際需要的權限類
"""

import logging
from rest_framework import permissions
from rest_framework.permissions import BasePermission

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.permissions')


class IsAdminOrReadOnly(BasePermission):
    """
    管理員可以讀寫，其他用戶只能讀取
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_staff


class IsOwnerOrReadOnly(BasePermission):
    """
    物件所有者可以編輯，其他用戶只能讀取
    """
    def has_object_permission(self, request, view, obj):
        # 讀取權限允許任何請求
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 寫入權限只允許物件所有者
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'author'):
            return obj.author == request.user
        return False


class IsAuthorOrReadOnly(BasePermission):
    """
    貼文權限：只有作者可以編輯，其他用戶只能讀取
    """
    def has_object_permission(self, request, view, obj):
        # 允許所有用戶讀取
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 只有作者可以編輯
        return obj.author == request.user


class IsCommentAuthorOrPostAuthor(BasePermission):
    """
    評論權限：評論作者或貼文作者才能編輯/刪除評論
    """
    
    def has_object_permission(self, request, view, obj):
        # 讀取權限允許任何請求
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 評論作者可以編輯/刪除
        if obj.user == request.user:
            return True
        
        # 貼文作者可以刪除評論（但不能編輯）
        if hasattr(obj, 'post') and obj.post.author == request.user:
            return request.method == 'DELETE'
        
        return False


class IsChatParticipant(BasePermission):
    """
    聊天權限：只有聊天參與者可以訪問
    """
    
    def has_object_permission(self, request, view, obj):
        # 檢查用戶是否為聊天參與者
        if hasattr(obj, 'participants'):
            return request.user in obj.participants.all()
        return False 