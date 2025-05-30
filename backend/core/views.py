"""
EngineerHub 核心API視圖

提供平台核心功能的API接口：
1. 搜尋功能
2. 通知管理
3. 系統配置
4. 平台統計
"""

import logging
import time
from django.conf import settings
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count
from django.utils import timezone
from django.core.cache import cache
# 暫時移除 drf_yasg 導入，因為模組未安裝
# from drf_yasg.utils import swagger_auto_schema # type: ignore
# from drf_yasg import openapi # type: ignore

from .search import search_service
from .models import Notification, ReportedContent, PlatformStatistics
from .serializers import (
    NotificationSerializer, 
    ReportedContentSerializer,
    PlatformStatisticsSerializer
)
from .permissions import IsAdminOrReadOnly

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.core')


class SearchAPIView(APIView):
    """
    統一搜尋API - Algolia 版本
    支援用戶搜尋、貼文搜尋和混合搜尋，並提供進階過濾功能
    """
    permission_classes = [permissions.IsAuthenticated]
    
    # @swagger_auto_schema(
    #     manual_parameters=[
    #         openapi.Parameter(
    #             'q',
    #             openapi.IN_QUERY,
    #             description="搜尋關鍵字",
    #             type=openapi.TYPE_STRING,
    #             required=True
    #         ),
    #         openapi.Parameter(
    #             'type',
    #             openapi.IN_QUERY,
    #             description="搜尋類型 (users/posts/all)",
    #             type=openapi.TYPE_STRING,
    #             default='all'
    #         ),
    #         openapi.Parameter(
    #             'limit',
    #             openapi.IN_QUERY,
    #             description="結果數量限制",
    #             type=openapi.TYPE_INTEGER,
    #             default=20
    #         ),
    #         openapi.Parameter(
    #             'code_language',
    #             openapi.IN_QUERY,
    #             description="程式語言過濾 (例如: python,javascript)",
    #             type=openapi.TYPE_STRING
    #         ),
    #         openapi.Parameter(
    #             'skills',
    #             openapi.IN_QUERY,
    #             description="技能標籤過濾 (例如: react,vue)",
    #             type=openapi.TYPE_STRING
    #         ),
    #         openapi.Parameter(
    #             'location',
    #             openapi.IN_QUERY,
    #             description="地點過濾",
    #             type=openapi.TYPE_STRING
    #         ),
    #     ],
    #     responses={
    #         200: openapi.Response(
    #             description="搜尋結果",
    #             examples={
    #                 "application/json": {
    #                     "query": "python",
    #                     "type": "all",
    #                     "users": [
    #                         {
    #                             "id": "123",
    #                             "username": "john_doe",
    #                             "display_name": "John Doe",
    #                             "bio": "Python developer",
    #                             "skills": ["python", "django"],
    #                             "followers_count": 100,
    #                             "posts_count": 50,
    #                             "avatar": "https://example.com/avatar.jpg"
    #                         }
    #                     ],
    #                     "posts": [
    #                         {
    #                             "id": "456",
    #                             "content": "Learning <mark>Python</mark> basics",
    #                             "code_snippet": "print('hello world')",
    #                             "code_language": "python",
    #                             "author": {
    #                                 "username": "jane_doe",
    #                                 "display_name": "Jane Doe"
    #                             },
    #                             "likes_count": 10,
    #                             "comments_count": 5
    #                         }
    #                     ],
    #                     "total_users": 1,
    #                     "total_posts": 1,
    #                     "search_time": 0.123,
    #                     "facets": {
    #                         "code_language": {
    #                             "python": 15,
    #                             "javascript": 8
    #                         }
    #                     }
    #                 }
    #             }
    #         )
    #     }
    # )
    def get(self, request):
        """
        執行搜尋
        """
        start_time = time.time()
        
        # 獲取搜尋參數
        query = request.GET.get('q', '').strip()
        search_type = request.GET.get('type', 'all')
        limit = min(int(request.GET.get('limit', 20)), 50)
        
        if not query or len(query) < 2:
            return Response({
                'error': '搜尋關鍵字至少需要2個字符',
                'query': query
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            response_data = {
                'query': query,
                'type': search_type,
                'users': [],
                'posts': [],
                'total_users': 0,
                'total_posts': 0,
                'facets': {},
                'search_time': 0
            }
            
            user_id = request.user.id
            
            # 構建過濾條件
            filters = {}
            facets = []
            
            # 程式語言過濾
            code_language = request.GET.get('code_language')
            if code_language:
                languages = [lang.strip() for lang in code_language.split(',')]
                filters['code_language'] = languages
                facets.append('code_language')
            else:
                facets.append('code_language')  # 總是包含此 facet
            
            # 技能過濾（僅用於用戶搜尋）
            skills = request.GET.get('skills')
            if skills and search_type in ['users', 'all']:
                skills_list = [skill.strip() for skill in skills.split(',')]
                filters['skills'] = skills_list
            
            # 地點過濾（僅用於用戶搜尋）
            location = request.GET.get('location')
            if location and search_type in ['users', 'all']:
                filters['location'] = location
            
            # 根據搜尋類型執行搜尋
            if search_type in ['users', 'all']:
                user_filters = {k: v for k, v in filters.items() if k in ['skills', 'location']}
                user_results = search_service.search_users(query, user_id, limit, user_filters)
                response_data['users'] = user_results.get('users', [])
                response_data['total_users'] = user_results.get('total', 0)
            
            if search_type in ['posts', 'all']:
                post_filters = {k: v for k, v in filters.items() if k in ['code_language']}
                post_results = search_service.search_posts(query, user_id, limit, post_filters, facets)
                response_data['posts'] = post_results.get('posts', [])
                response_data['total_posts'] = post_results.get('total', 0)
                response_data['facets'] = post_results.get('facets', {})
            
            # 計算總搜尋時間
            total_search_time = time.time() - start_time
            response_data['search_time'] = round(total_search_time, 3)
            
            logger.info(f"用戶 {request.user.username} 搜尋 '{query}' 類型 {search_type}, 耗時 {total_search_time:.3f}s")
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"搜尋錯誤: {str(e)}")
            return Response({
                'error': '搜尋服務暫時不可用',
                'query': query,
                'details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SearchSuggestionsAPIView(APIView):
    """
    搜尋建議API - Algolia 版本
    提供即時搜尋建議和熱門搜尋
    """
    permission_classes = [permissions.IsAuthenticated]
    
    # @swagger_auto_schema(
    #     manual_parameters=[
    #         openapi.Parameter(
    #             'q',
    #             openapi.IN_QUERY,
    #             description="部分搜尋關鍵字",
    #             type=openapi.TYPE_STRING,
    #             required=True
    #         ),
    #         openapi.Parameter(
    #             'limit',
    #             openapi.IN_QUERY,
    #             description="建議數量限制",
    #             type=openapi.TYPE_INTEGER,
    #             default=5
    #         ),
    #     ],
    #     responses={
    #         200: openapi.Response(
    #             description="搜尋建議列表",
    #             examples={
    #                 "application/json": {
    #                     "suggestions": ["python", "javascript", "react"],
    #                     "trending": [
    #                         {
    #                             "query": "machine learning",
    #                             "search_count": 45,
    #                             "last_searched": "2024-01-15T10:30:00Z"
    #                         }
    #                     ]
    #                 }
    #             }
    #         )
    #     }
    # )
    def get(self, request):
        """
        獲取搜尋建議和熱門搜尋
        """
        query = request.GET.get('q', '').strip()
        limit = min(int(request.GET.get('limit', 5)), 10)
        
        try:
            response_data = {
                'suggestions': [],
                'trending': []
            }
            
            if len(query) >= 2:
                # 獲取搜尋建議
                suggestions = search_service.get_search_suggestions(query, limit)
                response_data['suggestions'] = suggestions
            
            # 獲取熱門搜尋（如果沒有查詢或建議不足）
            if len(query) < 2 or len(response_data['suggestions']) < limit:
                trending = search_service.get_trending_searches(limit)
                response_data['trending'] = trending
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"獲取搜尋建議錯誤: {str(e)}")
            return Response({
                'suggestions': [],
                'trending': []
            }, status=status.HTTP_200_OK)


class SearchHistoryAPIView(APIView):
    """
    搜尋歷史API - 增強版
    """
    permission_classes = [permissions.IsAuthenticated]
    
    # @swagger_auto_schema(
    #     responses={
    #         200: openapi.Response(
    #             description="用戶搜尋歷史",
    #             examples={
    #                 "application/json": {
    #                     "history": [
    #                         {
    #                             "id": "123e4567-e89b-12d3-a456-426614174000",
    #                             "query": "python tutorial",
    #                             "search_type": "posts",
    #                             "results_count": 15,
    #                             "response_time": 0.123,
    #                             "created_at": "2024-01-15T10:30:00Z"
    #                         }
    #                     ],
    #                     "total": 1
    #                 }
    #             }
    #         )
    #     }
    # )
    def get(self, request):
        """
        獲取用戶搜尋歷史
        """
        try:
            limit = min(int(request.GET.get('limit', 10)), 50)
            history = search_service.get_search_history(request.user.id, limit)
            
            return Response({
                'history': history,
                'total': len(history)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"獲取搜尋歷史錯誤: {str(e)}")
            return Response({
                'history': [],
                'total': 0,
                'error': '無法獲取搜尋歷史'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # @swagger_auto_schema(
    #     responses={
    #         200: openapi.Response(description="搜尋歷史已清除")
    #     }
    # )
    def delete(self, request):
        """
        清除用戶搜尋歷史
        """
        try:
            success = search_service.clear_search_history(request.user.id)
            
            if success:
                return Response({
                    'message': '搜尋歷史已清除'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': '清除搜尋歷史失敗'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"清除搜尋歷史錯誤: {str(e)}")
            return Response({
                'error': '清除搜尋歷史失敗'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationListAPIView(APIView):
    """
    通知列表API
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        獲取用戶通知列表
        """
        try:
            notifications = Notification.objects.filter(
                recipient=request.user
            ).select_related('sender').order_by('-created_at')[:50]
            
            serializer = NotificationSerializer(notifications, many=True)
            
            # 統計未讀通知數
            unread_count = notifications.filter(is_read=False).count()
            
            return Response({
                'notifications': serializer.data,
                'unread_count': unread_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"獲取通知列表錯誤: {str(e)}")
            return Response({
                'error': '獲取通知列表失敗'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationDetailAPIView(APIView):
    """
    通知詳情API
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def patch(self, request, notification_id):
        """
        標記通知為已讀
        """
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=request.user
            )
            
            notification.mark_as_read()
            
            return Response({
                'message': '通知已標記為已讀'
            }, status=status.HTTP_200_OK)
            
        except Notification.DoesNotExist:
            return Response({
                'error': '通知不存在'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"標記通知已讀錯誤: {str(e)}")
            return Response({
                'error': '操作失敗'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_all_notifications_read(request):
    """
    標記所有通知為已讀
    """
    try:
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        logger.info(f"用戶 {request.user.username} 標記了 {updated_count} 條通知為已讀")
        
        return Response({
            'message': f'已標記 {updated_count} 條通知為已讀'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"批量標記通知已讀錯誤: {str(e)}")
        return Response({
            'error': '操作失敗'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReportContentAPIView(APIView):
    """
    內容舉報API
    """
    permission_classes = [permissions.IsAuthenticated]
    
    # @swagger_auto_schema(
    #     request_body=openapi.Schema(
    #         type=openapi.TYPE_OBJECT,
    #         required=['content_type', 'content_id', 'reason'],
    #         properties={
    #             'content_type': openapi.Schema(
    #                 type=openapi.TYPE_STRING,
    #                 description="內容類型 (post/comment/user/message)"
    #             ),
    #             'content_id': openapi.Schema(
    #                 type=openapi.TYPE_STRING,
    #                 description="內容ID"
    #             ),
    #             'reason': openapi.Schema(
    #                 type=openapi.TYPE_STRING,
    #                 description="舉報原因"
    #             ),
    #             'description': openapi.Schema(
    #                 type=openapi.TYPE_STRING,
    #                 description="詳細描述"
    #             ),
    #         }
    #     ),
    #     responses={
    #         201: openapi.Response(description="舉報提交成功")
    #     }
    # )
    def post(self, request):
        """
        提交內容舉報
        """
        try:
            data = request.data
            content_type = data.get('content_type')
            content_id = data.get('content_id')
            reason = data.get('reason')
            description = data.get('description', '')
            
            # 驗證必要參數
            if not all([content_type, content_id, reason]):
                return Response({
                    'error': '缺少必要參數'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 檢查是否重複舉報
            existing_report = ReportedContent.objects.filter(
                reporter=request.user,
                content_type=content_type,
                content_id=content_id,
                status__in=['pending', 'reviewing']
            ).exists()
            
            if existing_report:
                return Response({
                    'error': '您已經舉報過此內容'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 創建舉報記錄
            report = ReportedContent.objects.create(
                reporter=request.user,
                content_type=content_type,
                content_id=content_id,
                reason=reason,
                description=description
            )
            
            logger.info(f"用戶 {request.user.username} 舉報了 {content_type} {content_id}")
            
            return Response({
                'message': '舉報提交成功，我們將盡快處理',
                'report_id': str(report.id)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"提交舉報錯誤: {str(e)}")
            return Response({
                'error': '提交舉報失敗'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PlatformStatsAPIView(APIView):
    """
    平台統計API
    """
    permission_classes = [IsAdminOrReadOnly]
    
    def get(self, request):
        """
        獲取平台統計數據
        """
        try:
            # 獲取最新的統計數據
            stats = PlatformStatistics.objects.filter(
                stat_type='daily'
            ).order_by('-date')[:30]  # 最近30天
            
            serializer = PlatformStatisticsSerializer(stats, many=True)
            
            # 計算總統計
            if stats:
                latest_stats = stats[0]
                total_stats = {
                    'total_users': latest_stats.total_users,
                    'total_posts': latest_stats.total_posts,
                    'total_comments': latest_stats.total_comments,
                    'total_likes': latest_stats.total_likes,
                    'total_shares': latest_stats.total_shares,
                    'total_messages': latest_stats.total_messages,
                    'total_searches': latest_stats.total_searches,
                }
            else:
                total_stats = {}
            
            return Response({
                'total_stats': total_stats,
                'daily_stats': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"獲取平台統計錯誤: {str(e)}")
            return Response({
                'error': '獲取統計數據失敗'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def trending_topics(request):
    """
    獲取熱門話題
    """
    try:
        # 從緩存獲取熱門話題
        cache_key = 'trending_topics'
        trending = cache.get(cache_key)
        
        if not trending:
            # 從搜尋歷史中獲取熱門關鍵字
            from .models import SearchHistory
            
            # 計算最近7天的熱門搜尋
            seven_days_ago = timezone.now() - timezone.timedelta(days=7)
            
            trending_searches = SearchHistory.objects.filter(
                created_at__gte=seven_days_ago
            ).values('query').annotate(
                count=Count('query')
            ).order_by('-count')[:20]
            
            trending = [item['query'] for item in trending_searches]
            
            # 緩存1小時
            cache.set(cache_key, trending, 3600)
        
        return Response({
            'trending_topics': trending
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"獲取熱門話題錯誤: {str(e)}")
        return Response({
            'trending_topics': []
        }, status=status.HTTP_200_OK) 