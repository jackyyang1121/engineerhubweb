"""
自定義異常類和全局異常處理器

提供統一的錯誤處理機制和自定義異常類型
"""

import logging
from django.http import Http404
from django.core.exceptions import PermissionDenied, ValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied as DRFPermissionDenied,
    NotFound,
    ValidationError as DRFValidationError,
    Throttled
)

logger = logging.getLogger('engineerhub.core')


# 自定義異常類
class BaseAPIException(APIException):
    """
    基礎API異常類
    
    所有自定義異常的基礎類
    """
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = '伺服器發生錯誤'
    default_code = 'server_error'
    
    def __init__(self, detail=None, code=None, status_code=None):
        if detail is None:
            detail = self.default_detail
        if code is None:
            code = self.default_code
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail, code)


class BusinessLogicError(BaseAPIException):
    """
    業務邏輯錯誤
    
    用於表示違反業務規則的錯誤
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = '業務邏輯錯誤'
    default_code = 'business_logic_error'


class ResourceNotFoundError(BaseAPIException):
    """
    資源未找到錯誤
    """
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = '資源未找到'
    default_code = 'resource_not_found'


class AuthenticationError(BaseAPIException):
    """
    認證錯誤
    """
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = '認證失敗'
    default_code = 'authentication_failed'


class AuthorizationError(BaseAPIException):
    """
    授權錯誤
    """
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = '權限不足'
    default_code = 'permission_denied'


class RateLimitError(BaseAPIException):
    """
    頻率限制錯誤
    """
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = '請求過於頻繁'
    default_code = 'rate_limit_exceeded'


class FileUploadError(BaseAPIException):
    """
    檔案上傳錯誤
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = '檔案上傳失敗'
    default_code = 'file_upload_error'


class ValidationError(BaseAPIException):
    """
    資料驗證錯誤
    """
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = '資料驗證失敗'
    default_code = 'validation_error'


class ExternalServiceError(BaseAPIException):
    """
    外部服務錯誤
    """
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = '外部服務不可用'
    default_code = 'external_service_error'


class DatabaseError(BaseAPIException):
    """
    資料庫錯誤
    """
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = '資料庫操作失敗'
    default_code = 'database_error'


class CacheError(BaseAPIException):
    """
    快取錯誤
    """
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = '快取操作失敗'
    default_code = 'cache_error'


# 具體業務異常
class UserNotFoundError(ResourceNotFoundError):
    """用戶不存在"""
    default_detail = '用戶不存在'
    default_code = 'user_not_found'


class PostNotFoundError(ResourceNotFoundError):
    """貼文不存在"""
    default_detail = '貼文不存在'
    default_code = 'post_not_found'


class CommentNotFoundError(ResourceNotFoundError):
    """評論不存在"""
    default_detail = '評論不存在'
    default_code = 'comment_not_found'


class ConversationNotFoundError(ResourceNotFoundError):
    """對話不存在"""
    default_detail = '對話不存在'
    default_code = 'conversation_not_found'


class UsernameAlreadyExistsError(ValidationError):
    """用戶名已存在"""
    default_detail = '用戶名已存在'
    default_code = 'username_already_exists'


class EmailAlreadyExistsError(ValidationError):
    """電子郵件已存在"""
    default_detail = '電子郵件已被註冊'
    default_code = 'email_already_exists'


class InvalidPasswordError(ValidationError):
    """密碼格式錯誤"""
    default_detail = '密碼格式不正確'
    default_code = 'invalid_password'


class PostLimitExceededError(BusinessLogicError):
    """貼文數量超出限制"""
    default_detail = '今日發文數量已達上限'
    default_code = 'post_limit_exceeded'


class FileTypeMismatchError(FileUploadError):
    """檔案類型不符"""
    default_detail = '不支援的檔案類型'
    default_code = 'file_type_mismatch'


class FileSizeExceededError(FileUploadError):
    """檔案大小超出限制"""
    default_detail = '檔案大小超出限制'
    default_code = 'file_size_exceeded'


class SelfFollowError(BusinessLogicError):
    """自己關注自己"""
    default_detail = '不能關注自己'
    default_code = 'self_follow_error'


class AlreadyFollowingError(BusinessLogicError):
    """已經關注"""
    default_detail = '已經關注該用戶'
    default_code = 'already_following'


class NotFollowingError(BusinessLogicError):
    """未關注"""
    default_detail = '未關注該用戶'
    default_code = 'not_following'


class PostAlreadyLikedError(BusinessLogicError):
    """已經按讚"""
    default_detail = '已經按過讚了'
    default_code = 'post_already_liked'


class PostNotLikedError(BusinessLogicError):
    """未按讚"""
    default_detail = '尚未按讚該貼文'
    default_code = 'post_not_liked'


class CodeTooLongError(ValidationError):
    """程式碼過長"""
    default_detail = '程式碼長度超出限制'
    default_code = 'code_too_long'


class TooManyAttachmentsError(ValidationError):
    """附件過多"""
    default_detail = '附件數量超出限制'
    default_code = 'too_many_attachments'


# 全局異常處理器
def custom_exception_handler(exc, context):
    """
    自定義異常處理器
    
    Args:
        exc: 異常物件
        context: 上下文資訊
    
    Returns:
        Response: 統一格式的錯誤回應
    """
    # 先呼叫DRF預設的異常處理器
    response = exception_handler(exc, context)
    
    # 獲取視圖和請求資訊
    view = context.get('view', None)
    request = context.get('request', None)
    
    # 記錄異常資訊
    logger.error(
        f"API異常 - "
        f"異常類型: {type(exc).__name__}, "
        f"異常訊息: {str(exc)}, "
        f"視圖: {view.__class__.__name__ if view else 'Unknown'}, "
        f"用戶: {getattr(request.user, 'username', 'Anonymous') if request else 'Unknown'}, "
        f"路徑: {request.path if request else 'Unknown'}"
    )
    
    if response is not None:
        # 處理DRF標準異常
        custom_response_data = {
            'success': False,
            'error': {
                'code': getattr(exc, 'default_code', 'unknown_error'),
                'message': _extract_error_message(response.data),
                'details': response.data if isinstance(response.data, dict) else None,
                'status_code': response.status_code
            },
            'timestamp': _get_current_timestamp(),
            'path': request.path if request else None
        }
        
        # 根據異常類型設置特定的錯誤代碼
        if isinstance(exc, NotAuthenticated):
            custom_response_data['error']['code'] = 'authentication_required'
        elif isinstance(exc, DRFPermissionDenied):
            custom_response_data['error']['code'] = 'permission_denied'
        elif isinstance(exc, NotFound):
            custom_response_data['error']['code'] = 'resource_not_found'
        elif isinstance(exc, DRFValidationError):
            custom_response_data['error']['code'] = 'validation_error'
        elif isinstance(exc, Throttled):
            custom_response_data['error']['code'] = 'rate_limit_exceeded'
            # 添加重試資訊
            if hasattr(exc, 'wait'):
                custom_response_data['error']['retry_after'] = exc.wait
        
        response.data = custom_response_data
        
    else:
        # 處理未被DRF處理的異常
        if isinstance(exc, Http404):
            response_data = {
                'success': False,
                'error': {
                    'code': 'resource_not_found',
                    'message': '資源未找到',
                    'status_code': 404
                },
                'timestamp': _get_current_timestamp(),
                'path': request.path if request else None
            }
            response = Response(response_data, status=status.HTTP_404_NOT_FOUND)
            
        elif isinstance(exc, PermissionDenied):
            response_data = {
                'success': False,
                'error': {
                    'code': 'permission_denied',
                    'message': '權限不足',
                    'status_code': 403
                },
                'timestamp': _get_current_timestamp(),
                'path': request.path if request else None
            }
            response = Response(response_data, status=status.HTTP_403_FORBIDDEN)
            
        elif isinstance(exc, ValidationError):
            response_data = {
                'success': False,
                'error': {
                    'code': 'validation_error',
                    'message': '資料驗證失敗',
                    'details': exc.message_dict if hasattr(exc, 'message_dict') else str(exc),
                    'status_code': 400
                },
                'timestamp': _get_current_timestamp(),
                'path': request.path if request else None
            }
            response = Response(response_data, status=status.HTTP_400_BAD_REQUEST)
            
        else:
            # 處理其他未預期的異常
            logger.exception(f"未處理的異常: {type(exc).__name__}: {str(exc)}")
            
            response_data = {
                'success': False,
                'error': {
                    'code': 'internal_server_error',
                    'message': '伺服器內部錯誤',
                    'status_code': 500
                },
                'timestamp': _get_current_timestamp(),
                'path': request.path if request else None
            }
            
            # 在除錯模式下顯示詳細錯誤資訊
            from django.conf import settings
            if settings.DEBUG:
                response_data['error']['debug_message'] = str(exc)
                response_data['error']['exception_type'] = type(exc).__name__
            
            response = Response(response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return response


def _extract_error_message(data):
    """
    從錯誤資料中提取主要錯誤訊息
    
    Args:
        data: 錯誤資料
    
    Returns:
        str: 主要錯誤訊息
    """
    if isinstance(data, str):
        return data
    elif isinstance(data, list):
        return data[0] if data else '未知錯誤'
    elif isinstance(data, dict):
        # 嘗試從常見欄位提取錯誤訊息
        for field in ['detail', 'message', 'error', 'non_field_errors']:
            if field in data:
                value = data[field]
                if isinstance(value, list):
                    return value[0] if value else '未知錯誤'
                elif isinstance(value, str):
                    return value
        
        # 如果沒有找到常見欄位，返回第一個欄位的錯誤
        for key, value in data.items():
            if isinstance(value, list):
                return f"{key}: {value[0]}" if value else f"{key}: 未知錯誤"
            elif isinstance(value, str):
                return f"{key}: {value}"
        
        return '資料驗證失敗'
    else:
        return str(data)


def _get_current_timestamp():
    """
    獲取當前時間戳
    
    Returns:
        str: ISO格式的時間戳
    """
    from django.utils import timezone
    return timezone.now().isoformat()


# 異常處理裝飾器
def handle_exceptions(default_message="操作失敗"):
    """
    異常處理裝飾器
    
    Args:
        default_message: 預設錯誤訊息
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except BaseAPIException:
                # 重新拋出自定義異常
                raise
            except Exception as e:
                logger.exception(f"函數 {func.__name__} 發生未預期的異常: {str(e)}")
                raise BaseAPIException(detail=default_message)
        
        return wrapper
    return decorator


# 資料庫操作異常處理
def handle_database_error(func):
    """
    資料庫操作異常處理裝飾器
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"資料庫操作錯誤: {str(e)}")
            raise DatabaseError(detail=f"資料庫操作失敗: {str(e)}")
    
    return wrapper


# 外部服務調用異常處理
def handle_external_service_error(service_name):
    """
    外部服務調用異常處理裝飾器
    
    Args:
        service_name: 服務名稱
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"{service_name} 服務調用錯誤: {str(e)}")
                raise ExternalServiceError(detail=f"{service_name} 服務不可用")
        
        return wrapper
    return decorator 