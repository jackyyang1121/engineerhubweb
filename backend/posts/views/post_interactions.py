"""
貼文互動視圖模塊

功能：專職處理貼文的互動功能
原則：
- Narrowly focused: 只負責互動相關的功能
- Flexible: 支援不同類型的互動操作
- Loosely coupled: 通過服務層處理業務邏輯
"""

import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404

from ..models import Post, Like, Save, Report, PostShare
from ..serializers import LikeSerializer, SaveSerializer, ReportSerializer, PostShareSerializer

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.posts.interactions')


class PostInteractionViewSet(viewsets.GenericViewSet):
    """
    貼文互動視圖集 - 專職處理互動相關的功能
    
    職責範圍：
    - 點讚/取消點讚
    - 收藏/取消收藏
    - 分享/取消分享
    - 檢舉功能
    - 獲取互動狀態
    
    不包含：
    - 貼文的基本 CRUD 操作
    - 推薦算法
    - 複雜的查詢邏輯
    """
    
    queryset = Post.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """
        獲取貼文對象，添加額外的驗證
        """
        post = get_object_or_404(Post, pk=self.kwargs['pk'])
        
        # 檢查貼文是否已發布
        if not post.is_published and post.author != self.request.user and not self.request.user.is_staff:
            raise ValidationError("貼文不存在或尚未發布")
            
        return post
    
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """
        點讚貼文
        
        POST /api/posts/{id}/interactions/like/
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
            
            # 創建點讚並更新計數
            with transaction.atomic():
                Like.objects.create(user=request.user, post=post)
                # 使用原子操作更新點讚數
                Post.objects.filter(id=post.id).update(
                    likes_count=F('likes_count') + 1
                )
                
                logger.info(f"用戶 {request.user.username} 點讚貼文 {post.id}")
                return Response({
                    "detail": "點讚成功",
                    "likes_count": post.likes_count + 1
                }, status=status.HTTP_201_CREATED)
                
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
        
        POST /api/posts/{id}/interactions/unlike/
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
            
            # 刪除點讚並更新計數
            with transaction.atomic():
                like.delete()
                Post.objects.filter(id=post.id).update(
                    likes_count=F('likes_count') - 1
                )
                
                logger.info(f"用戶 {request.user.username} 取消點讚貼文 {post.id}")
                return Response({
                    "detail": "取消點讚成功",
                    "likes_count": max(0, post.likes_count - 1)
                }, status=status.HTTP_200_OK)
                
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
        
        POST /api/posts/{id}/interactions/save/
        """
        post = self.get_object()
        
        try:
            # 檢查是否已經收藏
            if Save.objects.filter(user=request.user, post=post).exists():
                return Response(
                    {"detail": "您已經收藏過這篇貼文"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 創建收藏
            Save.objects.create(user=request.user, post=post)
            logger.info(f"用戶 {request.user.username} 收藏貼文 {post.id}")
            
            return Response({"detail": "收藏成功"}, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"收藏失敗: {str(e)}")
            return Response(
                {"detail": f"收藏失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def unsave(self, request, pk=None):
        """
        取消收藏貼文
        
        POST /api/posts/{id}/interactions/unsave/
        """
        post = self.get_object()
        
        try:
            # 檢查是否已經收藏
            save = Save.objects.filter(user=request.user, post=post).first()
            if not save:
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
    def share(self, request, pk=None):
        """
        分享貼文
        
        POST /api/posts/{id}/interactions/share/
        """
        post = self.get_object()
        content = request.data.get('content', '')
        
        try:
            # 創建分享並更新計數
            with transaction.atomic():
                share = PostShare.objects.create(
                    user=request.user,
                    post=post,
                    content=content
                )
                
                Post.objects.filter(id=post.id).update(
                    shares_count=F('shares_count') + 1
                )
                
                logger.info(f"用戶 {request.user.username} 分享貼文 {post.id}")
                
                serializer = PostShareSerializer(share)
                return Response({
                    "detail": "分享成功",
                    "share": serializer.data,
                    "shares_count": post.shares_count + 1
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"分享失敗: {str(e)}")
            return Response(
                {"detail": f"分享失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def unshare(self, request, pk=None):
        """
        取消分享貼文
        
        POST /api/posts/{id}/interactions/unshare/
        """
        post = self.get_object()
        
        try:
            # 查找用戶的分享
            share = PostShare.objects.filter(user=request.user, post=post).first()
            if not share:
                return Response(
                    {"detail": "您未分享過這篇貼文"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 刪除分享並更新計數
            with transaction.atomic():
                share.delete()
                Post.objects.filter(id=post.id).update(
                    shares_count=F('shares_count') - 1
                )
                
                logger.info(f"用戶 {request.user.username} 取消分享貼文 {post.id}")
                return Response({
                    "detail": "取消分享成功",
                    "shares_count": max(0, post.shares_count - 1)
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"取消分享失敗: {str(e)}")
            return Response(
                {"detail": f"取消分享失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def report(self, request, pk=None):
        """
        檢舉貼文
        
        POST /api/posts/{id}/interactions/report/
        """
        post = self.get_object()
        reason = request.data.get('reason', '')
        
        if not reason:
            return Response(
                {"detail": "檢舉原因不能為空"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 檢查是否已經檢舉過
            if Report.objects.filter(reporter=request.user, post=post).exists():
                return Response(
                    {"detail": "您已經檢舉過這篇貼文"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 創建檢舉
            report = Report.objects.create(
                reporter=request.user,
                post=post,
                reason=reason
            )
            
            logger.info(f"用戶 {request.user.username} 檢舉貼文 {post.id}，原因：{reason}")
            
            serializer = ReportSerializer(report)
            return Response({
                "detail": "檢舉成功，我們會儘快處理",
                "report": serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"檢舉失敗: {str(e)}")
            return Response(
                {"detail": f"檢舉失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """
        獲取當前用戶對貼文的互動狀態
        
        GET /api/posts/{id}/interactions/status/
        """
        post = self.get_object()
        
        try:
            # 獲取互動狀態
            is_liked = Like.objects.filter(user=request.user, post=post).exists()
            is_saved = Save.objects.filter(user=request.user, post=post).exists()
            is_shared = PostShare.objects.filter(user=request.user, post=post).exists()
            
            return Response({
                "is_liked": is_liked,
                "is_saved": is_saved,
                "is_shared": is_shared,
                "likes_count": post.likes_count,
                "shares_count": post.shares_count,
                "comments_count": post.comments_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"獲取互動狀態失敗: {str(e)}")
            return Response(
                {"detail": f"獲取狀態失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 