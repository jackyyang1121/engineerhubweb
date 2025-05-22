"""
自定義分頁器

提供企業級的分頁功能，包含完整的分頁資訊和效能優化
"""

import logging
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from collections import OrderedDict

logger = logging.getLogger('engineerhub.core')


class CustomPageNumberPagination(PageNumberPagination):
    """
    自定義頁碼分頁器
    
    特色功能：
    - 提供完整的分頁資訊
    - 支援動態調整每頁項目數
    - 包含效能監控
    """
    
    page_size = 20  # 預設每頁項目數
    page_size_query_param = 'page_size'  # 允許客戶端指定每頁項目數
    max_page_size = 100  # 最大每頁項目數
    page_query_param = 'page'  # 頁碼參數名
    
    def get_paginated_response(self, data):
        """
        返回分頁響應，包含完整的分頁資訊
        """
        try:
            # 計算分頁統計資訊
            total_pages = self.page.paginator.num_pages if self.page else 0
            current_page = self.page.number if self.page else 1
            page_size = self.get_page_size(self.request)
            total_count = self.page.paginator.count if self.page else 0
            
            # 計算起始和結束項目編號
            start_index = (current_page - 1) * page_size + 1 if total_count > 0 else 0
            end_index = min(current_page * page_size, total_count)
            
            # 構建分頁資訊
            pagination_info = OrderedDict([
                ('count', total_count),  # 總項目數
                ('total_pages', total_pages),  # 總頁數
                ('current_page', current_page),  # 當前頁碼
                ('page_size', page_size),  # 每頁項目數
                ('start_index', start_index),  # 起始項目編號
                ('end_index', end_index),  # 結束項目編號
                ('has_next', self.get_next_link() is not None),  # 是否有下一頁
                ('has_previous', self.get_previous_link() is not None),  # 是否有上一頁
                ('next', self.get_next_link()),  # 下一頁連結
                ('previous', self.get_previous_link()),  # 上一頁連結
            ])
            
            logger.debug(
                f"分頁查詢完成 - 頁碼: {current_page}, "
                f"每頁: {page_size}, 總數: {total_count}"
            )
            
            return Response(OrderedDict([
                ('pagination', pagination_info),
                ('results', data)
            ]))
            
        except Exception as e:
            logger.error(f"分頁響應生成錯誤: {str(e)}")
            # 發生錯誤時返回基本響應
            return Response(OrderedDict([
                ('pagination', {
                    'count': 0,
                    'total_pages': 0,
                    'current_page': 1,
                    'page_size': self.page_size,
                    'has_next': False,
                    'has_previous': False,
                    'next': None,
                    'previous': None,
                }),
                ('results', data)
            ]))


class CursorPagination(PageNumberPagination):
    """
    游標分頁器
    
    適用於大數據集的高效能分頁，特別是時間序列數據
    """
    
    page_size = 20
    ordering = '-created_at'  # 預設排序字段
    cursor_query_param = 'cursor'
    cursor_query_description = '游標位置'
    page_size_query_param = 'page_size'
    template = 'rest_framework/pagination/cursor.html'
    
    def get_paginated_response(self, data):
        """
        返回游標分頁響應
        """
        try:
            return Response(OrderedDict([
                ('next', self.get_next_link()),
                ('previous', self.get_previous_link()),
                ('page_size', self.get_page_size(self.request)),
                ('results', data)
            ]))
        except Exception as e:
            logger.error(f"游標分頁響應生成錯誤: {str(e)}")
            return Response(OrderedDict([
                ('next', None),
                ('previous', None),
                ('page_size', self.page_size),
                ('results', data)
            ]))


class LimitOffsetPagination(PageNumberPagination):
    """
    限制偏移分頁器
    
    適用於需要跳轉到任意頁面的場景
    """
    
    default_limit = 20
    limit_query_param = 'limit'
    offset_query_param = 'offset'
    max_limit = 100
    
    def get_paginated_response(self, data):
        """
        返回限制偏移分頁響應
        """
        try:
            count = self.count if hasattr(self, 'count') else len(data)
            limit = self.get_limit(self.request)
            offset = self.get_offset(self.request)
            
            return Response(OrderedDict([
                ('count', count),
                ('limit', limit),
                ('offset', offset),
                ('next', self.get_next_link()),
                ('previous', self.get_previous_link()),
                ('results', data)
            ]))
        except Exception as e:
            logger.error(f"限制偏移分頁響應生成錯誤: {str(e)}")
            return Response(OrderedDict([
                ('count', 0),
                ('limit', self.default_limit),
                ('offset', 0),
                ('next', None),
                ('previous', None),
                ('results', data)
            ])) 