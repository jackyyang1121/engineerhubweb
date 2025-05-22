"""
自定義中介軟體

包含用戶活動追蹤、請求日誌記錄、效能監控等功能
"""

import time
import logging
import json
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.core.cache import cache
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger('engineerhub.core')
performance_logger = logging.getLogger('engineerhub.performance')


class UserActivityMiddleware(MiddlewareMixin):
    """
    用戶活動追蹤中介軟體
    
    功能：
    - 更新用戶最後上線時間
    - 追蹤用戶在線狀態
    - 記錄用戶活動日誌
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """
        處理請求，更新用戶活動狀態
        """
        if request.user.is_authenticated:
            try:
                # 使用快取減少資料庫查詢
                cache_key = f"user_activity_{request.user.id}"
                last_update = cache.get(cache_key)
                current_time = timezone.now()
                
                # 每5分鐘更新一次，避免過頻繁的資料庫操作
                if not last_update or (current_time - last_update).seconds > 300:
                    User.objects.filter(id=request.user.id).update(
                        last_online=current_time,
                        is_online=True
                    )
                    cache.set(cache_key, current_time, 300)  # 快取5分鐘
                    
                    logger.debug(f"用戶活動更新: {request.user.username}")
                    
            except Exception as e:
                logger.warning(f"用戶活動更新失敗: {str(e)}")
        
        return None


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    請求日誌記錄中介軟體
    
    功能：
    - 記錄API請求和回應
    - 監控請求效能
    - 追蹤錯誤和異常
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """
        記錄請求開始時間
        """
        request.start_time = time.time()
        
        # 記錄API請求
        if request.path.startswith('/api/'):
            logger.info(
                f"API請求開始 - "
                f"方法: {request.method}, "
                f"路徑: {request.path}, "
                f"用戶: {getattr(request.user, 'username', 'Anonymous')}, "
                f"IP: {self.get_client_ip(request)}"
            )
        
        return None
    
    def process_response(self, request, response):
        """
        記錄請求完成和效能資訊
        """
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            # 記錄API回應
            if request.path.startswith('/api/'):
                performance_logger.info(
                    f"API請求完成 - "
                    f"方法: {request.method}, "
                    f"路徑: {request.path}, "
                    f"狀態碼: {response.status_code}, "
                    f"耗時: {duration:.3f}s, "
                    f"用戶: {getattr(request.user, 'username', 'Anonymous')}"
                )
                
                # 慢查詢警告
                if duration > 2.0:  # 超過2秒
                    logger.warning(
                        f"慢請求警告 - "
                        f"路徑: {request.path}, "
                        f"耗時: {duration:.3f}s"
                    )
        
        return response
    
    def process_exception(self, request, exception):
        """
        記錄異常資訊
        """
        logger.error(
            f"請求異常 - "
            f"方法: {request.method}, "
            f"路徑: {request.path}, "
            f"異常: {str(exception)}, "
            f"用戶: {getattr(request.user, 'username', 'Anonymous')}, "
            f"IP: {self.get_client_ip(request)}"
        )
        
        return None
    
    def get_client_ip(self, request):
        """
        獲取客戶端真實IP地址
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecurityMiddleware(MiddlewareMixin):
    """
    安全中介軟體
    
    功能：
    - API請求頻率限制
    - 惡意請求檢測
    - 安全標頭設置
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """
        處理安全檢查
        """
        client_ip = self.get_client_ip(request)
        
        # 檢查IP黑名單
        if self.is_ip_blocked(client_ip):
            logger.warning(f"被封鎖的IP嘗試訪問: {client_ip}")
            return JsonResponse({
                'error': '訪問被拒絕',
                'code': 'ACCESS_DENIED'
            }, status=403)
        
        # 簡單的頻率限制
        if request.path.startswith('/api/'):
            if self.is_rate_limited(client_ip):
                logger.warning(f"IP {client_ip} 超出請求頻率限制")
                return JsonResponse({
                    'error': '請求過於頻繁，請稍後再試',
                    'code': 'RATE_LIMITED'
                }, status=429)
        
        return None
    
    def process_response(self, request, response):
        """
        設置安全標頭
        """
        # 設置安全標頭
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # API回應設置CORS標頭
        if request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
        
        return response
    
    def get_client_ip(self, request):
        """
        獲取客戶端IP地址
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def is_ip_blocked(self, ip):
        """
        檢查IP是否被封鎖
        """
        # 這裡可以實現更複雜的IP黑名單邏輯
        blocked_ips = cache.get('blocked_ips', set())
        return ip in blocked_ips
    
    def is_rate_limited(self, ip):
        """
        檢查是否超出頻率限制
        """
        cache_key = f"rate_limit_{ip}"
        current_requests = cache.get(cache_key, 0)
        
        # 每分鐘最多100個請求
        if current_requests >= 100:
            return True
        
        # 增加請求計數
        cache.set(cache_key, current_requests + 1, 60)
        return False


class APIVersionMiddleware(MiddlewareMixin):
    """
    API版本管理中介軟體
    
    功能：
    - API版本檢測
    - 版本兼容性處理
    - 版本使用統計
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """
        處理API版本
        """
        if request.path.startswith('/api/'):
            # 從標頭獲取API版本
            api_version = request.META.get('HTTP_API_VERSION', 'v1')
            request.api_version = api_version
            
            # 記錄版本使用統計
            cache_key = f"api_version_stats_{api_version}"
            current_count = cache.get(cache_key, 0)
            cache.set(cache_key, current_count + 1, 86400)  # 24小時
            
            logger.debug(f"API版本: {api_version}, 路徑: {request.path}")
        
        return None
    
    def process_response(self, request, response):
        """
        設置API版本資訊
        """
        if request.path.startswith('/api/'):
            response['API-Version'] = getattr(request, 'api_version', 'v1')
            response['API-Supported-Versions'] = 'v1'
        
        return response


class CacheControlMiddleware(MiddlewareMixin):
    """
    快取控制中介軟體
    
    功能：
    - 設置適當的快取標頭
    - 條件請求處理
    - 靜態資源快取優化
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_response(self, request, response):
        """
        設置快取控制標頭
        """
        path = request.path
        
        # 靜態檔案長期快取
        if any(path.startswith(prefix) for prefix in ['/static/', '/media/']):
            response['Cache-Control'] = 'public, max-age=31536000'  # 1年
            response['Expires'] = 'Thu, 31 Dec 2024 23:59:59 GMT'
        
        # API回應短期快取
        elif path.startswith('/api/'):
            if request.method == 'GET' and response.status_code == 200:
                # 根據端點設置不同的快取時間
                if 'posts' in path:
                    response['Cache-Control'] = 'public, max-age=300'  # 5分鐘
                elif 'users' in path:
                    response['Cache-Control'] = 'public, max-age=600'  # 10分鐘
                else:
                    response['Cache-Control'] = 'no-cache'
            else:
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        
        return response 