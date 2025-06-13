"""
EngineerHub - 統一異常處理模組

職責：
- 定義自定義異常類型
- 提供統一的錯誤處理機制
- 標準化 API 錯誤回應格式
- 記錄和監控錯誤

設計原則：
- Narrowly focused: 每個異常類型只處理特定的錯誤情況
- Flexible: 支援自定義錯誤訊息和狀態碼
- Loosely coupled: 最小化對其他模組的依賴
"""

import logging
from typing import Dict, Any, Optional, List
from rest_framework import status
from rest_framework.views import exception_handler
from rest_framework.response import Response
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from django.db import IntegrityError

logger = logging.getLogger('engineerhub.exceptions')


# ==================== 自定義異常類型 ====================

class BaseAPIException(Exception):
    """
    API 異常基類
    
    所有自定義 API 異常都應該繼承這個基類
    """
    
    def __init__(
        self, 
        message: str = "發生了一個錯誤",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)


class ValidationException(BaseAPIException):
    """驗證異常"""
    
    def __init__(
        self, 
        message: str = "資料驗證失敗",
        field_errors: Optional[Dict[str, List[str]]] = None,
        **kwargs
    ):
        self.field_errors = field_errors or {}
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR",
            details={"field_errors": self.field_errors},
            **kwargs
        )


class AuthenticationException(BaseAPIException):
    """認證異常"""
    
    def __init__(self, message: str = "認證失敗", **kwargs):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_ERROR",
            **kwargs
        )


class PermissionException(BaseAPIException):
    """權限異常"""
    
    def __init__(self, message: str = "權限不足", **kwargs):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="PERMISSION_ERROR",
            **kwargs
        )


class NotFoundError(BaseAPIException):
    """資源未找到異常"""
    
    def __init__(self, message: str = "資源未找到", resource: Optional[str] = None, **kwargs):
        details = {"resource": resource} if resource else {}
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND_ERROR",
            details=details,
            **kwargs
        )


class BusinessLogicError(BaseAPIException):
    """業務邏輯異常"""
    
    def __init__(self, message: str = "業務邏輯錯誤", **kwargs):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="BUSINESS_LOGIC_ERROR",
            **kwargs
        )


class RateLimitException(BaseAPIException):
    """頻率限制異常"""
    
    def __init__(
        self, 
        message: str = "請求過於頻繁，請稍後再試",
        retry_after: Optional[int] = None,
        **kwargs
    ):
        details = {"retry_after": retry_after} if retry_after else {}
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_ERROR",
            details=details,
            **kwargs
        )


class ConflictException(BaseAPIException):
    """衝突異常"""
    
    def __init__(self, message: str = "資源衝突", **kwargs):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT_ERROR",
            **kwargs
        )


class ServiceUnavailableException(BaseAPIException):
    """服務不可用異常"""
    
    def __init__(self, message: str = "服務暫時不可用", **kwargs):
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="SERVICE_UNAVAILABLE_ERROR",
            **kwargs
        )


# ==================== 異常處理函數 ====================

def format_error_response(
    error_code: str,
    message: str,
    status_code: int,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    格式化錯誤回應
    
    Args:
        error_code: 錯誤代碼
        message: 錯誤訊息
        status_code: HTTP 狀態碼
        details: 錯誤詳情
        request_id: 請求 ID
        
    Returns:
        格式化的錯誤回應字典
    """
    response_data = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "status_code": status_code,
        }
    }
    
    if details:
        response_data["error"]["details"] = details
    
    if request_id:
        response_data["request_id"] = request_id
        
    return response_data


def custom_exception_handler(exc, context):
    """
    自定義異常處理器
    
    統一處理所有 API 異常，返回標準化的錯誤回應格式
    
    Args:
        exc: 異常對象
        context: 異常上下文
        
    Returns:
        標準化的錯誤回應
    """
    # 獲取請求對象
    request = context.get('request')
    request_id = getattr(request, 'id', None) if request else None
    
    # 處理自定義 API 異常
    if isinstance(exc, BaseAPIException):
        logger.warning(
            f'API 異常: {exc.error_code} - {exc.message}',
            extra={
                'status_code': exc.status_code,
                'error_code': exc.error_code,
                'details': exc.details,
                'request_id': request_id,
                'path': request.path if request else None,
                'method': request.method if request else None,
            }
        )
        
        return Response(
            format_error_response(
                error_code=exc.error_code,
                message=exc.message,
                status_code=exc.status_code,
                details=exc.details,
                request_id=request_id
            ),
            status=exc.status_code
        )
    
    # 處理 Django 驗證錯誤
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, 'message_dict'):
            field_errors = {
                field: [str(error) for error in errors]
                for field, errors in exc.message_dict.items()
            }
        else:
            field_errors = {'non_field_errors': exc.messages}
        
        return Response(
            format_error_response(
                error_code="VALIDATION_ERROR",
                message="資料驗證失敗",
                status_code=status.HTTP_400_BAD_REQUEST,
                details={"field_errors": field_errors},
                request_id=request_id
            ),
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 處理 404 錯誤
    if isinstance(exc, Http404):
        return Response(
            format_error_response(
                error_code="NOT_FOUND_ERROR",
                message="資源未找到",
                status_code=status.HTTP_404_NOT_FOUND,
                request_id=request_id
            ),
            status=status.HTTP_404_NOT_FOUND
        )
    
    # 處理數據庫完整性錯誤
    if isinstance(exc, IntegrityError):
        logger.error(
            f'數據庫完整性錯誤: {str(exc)}',
            extra={
                'request_id': request_id,
                'path': request.path if request else None,
                'method': request.method if request else None,
            }
        )
        
        return Response(
            format_error_response(
                error_code="INTEGRITY_ERROR",
                message="數據完整性錯誤",
                status_code=status.HTTP_400_BAD_REQUEST,
                request_id=request_id
            ),
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 調用 DRF 默認異常處理器
    response = exception_handler(exc, context)
    
    if response is not None:
        # 標準化 DRF 異常回應格式
        custom_response_data = format_error_response(
            error_code="API_ERROR",
            message=str(exc),
            status_code=response.status_code,
            details={"original_error": response.data},
            request_id=request_id
        )
        response.data = custom_response_data
        
        logger.warning(
            f'DRF 異常: {str(exc)}',
            extra={
                'status_code': response.status_code,
                'response_data': response.data,
                'request_id': request_id,
                'path': request.path if request else None,
                'method': request.method if request else None,
            }
        )
    else:
        # 處理未捕獲的異常
        logger.error(
            f'未處理的異常: {str(exc)}',
            exc_info=True,
            extra={
                'request_id': request_id,
                'path': request.path if request else None,
                'method': request.method if request else None,
            }
        )
        
        response = Response(
            format_error_response(
                error_code="INTERNAL_ERROR",
                message="內部伺服器錯誤",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                request_id=request_id
            ),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return response


# ==================== 裝飾器 ====================

def handle_exceptions(func):
    """
    異常處理裝飾器
    
    為服務層方法提供統一的異常處理
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(
                f'服務層異常: {func.__name__} - {str(e)}',
                exc_info=True,
                extra={
                    'function': func.__name__,
                    'args': args,
                    'kwargs': kwargs,
                }
            )
            # 重新拋出異常，讓上層處理
            raise
    
    return wrapper


# ==================== 工具函數 ====================

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> None:
    """
    驗證必需字段
    
    Args:
        data: 要驗證的數據
        required_fields: 必需字段列表
        
    Raises:
        ValidationException: 如果必需字段缺失
    """
    missing_fields = [field for field in required_fields if field not in data or data[field] is None]
    
    if missing_fields:
        field_errors = {field: ["此字段為必需"] for field in missing_fields}
        raise ValidationException(
            message=f"缺少必需字段: {', '.join(missing_fields)}",
            field_errors=field_errors
        )


def validate_user_permission(user, required_permission: str, obj=None) -> None:
    """
    驗證用戶權限
    
    Args:
        user: 用戶對象
        required_permission: 必需的權限
        obj: 權限對象（可選）
        
    Raises:
        AuthenticationException: 如果用戶未認證
        PermissionException: 如果用戶沒有權限
    """
    if not user.is_authenticated:
        raise AuthenticationException("用戶未認證")
    
    if not user.has_perm(required_permission, obj):
        raise PermissionException(f"用戶沒有 {required_permission} 權限")


def safe_get_object_or_404(model_class, error_message: str = None, **kwargs):
    """
    安全獲取對象或拋出 404 異常
    
    Args:
        model_class: 模型類
        error_message: 自定義錯誤訊息
        **kwargs: 查詢參數
        
    Returns:
        找到的對象
        
    Raises:
        NotFoundError: 如果對象不存在
    """
    try:
        return model_class.objects.get(**kwargs)
    except model_class.DoesNotExist:
        resource_name = model_class.__name__
        message = error_message or f"{resource_name} 不存在"
        raise NotFoundError(message=message, resource=resource_name) 