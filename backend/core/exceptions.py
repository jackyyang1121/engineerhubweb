"""
EngineerHub - 簡化的異常處理
只保留實際需要的異常類和全局異常處理器
"""

import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException

logger = logging.getLogger('engineerhub.core')


def custom_exception_handler(exc, context):
    """
    自定義異常處理器
    提供統一的錯誤響應格式
    """
    # 調用 DRF 默認的異常處理器
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'success': False,
            'error': {
                'code': getattr(exc, 'default_code', 'error'),
                'message': str(exc.detail) if hasattr(exc, 'detail') else str(exc),
                'status_code': response.status_code
            },
            'timestamp': None,
            'path': context['request'].path if context and 'request' in context else None
        }
        
        # 添加詳細錯誤信息
        if hasattr(exc, 'detail') and isinstance(exc.detail, dict):
            custom_response_data['error']['details'] = exc.detail
        
        # 記錄錯誤
        logger.error(f"API 錯誤: {exc} - {context['request'].path if context and 'request' in context else 'Unknown'}")
        
        response.data = custom_response_data
    
    return response


class BusinessError(APIException):
    """
    業務邏輯錯誤 - 用於表示違反業務規則的錯誤
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = '業務邏輯錯誤'
    default_code = 'business_error' 