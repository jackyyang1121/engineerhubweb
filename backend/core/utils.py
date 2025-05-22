"""
通用工具函數

包含檔案處理、程式碼高亮、文字處理、快取等實用工具
"""

import os
import uuid
import re
import hashlib
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any, Union
from PIL import Image, ImageOps
from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils import timezone
from django.utils.text import slugify
from pygments import highlight
from pygments.lexers import get_lexer_by_name, guess_lexer
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound
import magic

logger = logging.getLogger('engineerhub.core')


class FileHandler:
    """
    檔案處理工具類
    
    功能：
    - 檔案上傳和驗證
    - 圖片處理和優化
    - 檔案類型檢測
    """
    
    @staticmethod
    def generate_filename(original_filename: str, prefix: str = '') -> str:
        """
        生成唯一的檔案名稱
        
        Args:
            original_filename: 原始檔案名
            prefix: 檔名前綴
        
        Returns:
            str: 新的檔案名稱
        """
        ext = Path(original_filename).suffix.lower()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4().hex[:8])
        
        if prefix:
            return f"{prefix}_{timestamp}_{unique_id}{ext}"
        return f"{timestamp}_{unique_id}{ext}"
    
    @staticmethod
    def get_upload_path(instance, filename: str, folder: str = 'uploads') -> str:
        """
        生成檔案上傳路徑
        
        Args:
            instance: 模型實例
            filename: 檔案名稱
            folder: 資料夾名稱
        
        Returns:
            str: 上傳路徑
        """
        # 按年月組織檔案
        date_path = timezone.now().strftime('%Y/%m')
        
        # 生成唯一檔名
        new_filename = FileHandler.generate_filename(filename)
        
        return f"{folder}/{date_path}/{new_filename}"
    
    @staticmethod
    def validate_file_size(file, max_size: int) -> bool:
        """
        驗證檔案大小
        
        Args:
            file: 上傳的檔案
            max_size: 最大大小（位元組）
        
        Returns:
            bool: 是否符合大小要求
        """
        return file.size <= max_size
    
    @staticmethod
    def validate_file_type(file, allowed_types: List[str]) -> bool:
        """
        驗證檔案類型
        
        Args:
            file: 上傳的檔案
            allowed_types: 允許的檔案類型列表
        
        Returns:
            bool: 是否為允許的檔案類型
        """
        try:
            # 使用 python-magic 檢測真實檔案類型
            file_type = magic.from_buffer(file.read(1024), mime=True)
            file.seek(0)  # 重置檔案指針
            
            return file_type in allowed_types
        except Exception as e:
            logger.error(f"檔案類型檢測錯誤: {str(e)}")
            return False
    
    @staticmethod
    def process_image(image_file, max_width: int = 1920, max_height: int = 1080, 
                     quality: int = 85) -> InMemoryUploadedFile:
        """
        處理和優化圖片
        
        Args:
            image_file: 圖片檔案
            max_width: 最大寬度
            max_height: 最大高度
            quality: 圖片品質
        
        Returns:
            InMemoryUploadedFile: 處理後的圖片檔案
        """
        try:
            # 開啟圖片
            image = Image.open(image_file)
            
            # 自動旋轉（根據EXIF資訊）
            image = ImageOps.exif_transpose(image)
            
            # 轉換為RGB模式（如果不是的話）
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # 調整大小
            image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            # 保存處理後的圖片
            from io import BytesIO
            output = BytesIO()
            image.save(output, format='JPEG', quality=quality, optimize=True)
            output.seek(0)
            
            # 創建新的檔案物件
            return InMemoryUploadedFile(
                output,
                'ImageField',
                FileHandler.generate_filename(image_file.name, 'processed'),
                'image/jpeg',
                output.getbuffer().nbytes,
                None
            )
        except Exception as e:
            logger.error(f"圖片處理錯誤: {str(e)}")
            return image_file


class CodeHighlighter:
    """
    程式碼高亮工具類
    
    功能：
    - 自動偵測程式語言
    - 生成高亮HTML
    - 支援多種主題風格
    """
    
    @staticmethod
    def highlight_code(code: str, language: str = None, style: str = None) -> Dict[str, Any]:
        """
        高亮程式碼
        
        Args:
            code: 程式碼內容
            language: 程式語言（可選，自動偵測）
            style: 高亮樣式（可選）
        
        Returns:
            dict: 包含高亮HTML和語言資訊的字典
        """
        if not code or not code.strip():
            return {
                'html': '',
                'language': 'text',
                'css': '',
                'error': None
            }
        
        try:
            # 獲取樣式
            style = style or getattr(settings, 'DEFAULT_CODE_STYLE', 'monokai')
            
            # 獲取語言lexer
            if language:
                try:
                    lexer = get_lexer_by_name(language)
                    detected_language = language
                except ClassNotFound:
                    lexer = guess_lexer(code)
                    detected_language = lexer.aliases[0] if lexer.aliases else 'text'
            else:
                lexer = guess_lexer(code)
                detected_language = lexer.aliases[0] if lexer.aliases else 'text'
            
            # 創建格式化器
            formatter = HtmlFormatter(
                style=style,
                linenos=True,
                linenostart=1,
                cssclass='highlight',
                wrapcode=True,
                anchorlinenos=True,
                lineanchors='line'
            )
            
            # 生成高亮HTML
            highlighted_html = highlight(code, lexer, formatter)
            
            # 獲取CSS樣式
            css_styles = formatter.get_style_defs('.highlight')
            
            return {
                'html': highlighted_html,
                'language': detected_language,
                'css': css_styles,
                'error': None
            }
            
        except Exception as e:
            logger.error(f"程式碼高亮錯誤: {str(e)}")
            return {
                'html': f'<pre><code>{code}</code></pre>',
                'language': 'text',
                'css': '',
                'error': str(e)
            }
    
    @staticmethod
    def get_supported_languages() -> List[str]:
        """
        獲取支援的程式語言列表
        
        Returns:
            list: 支援的語言列表
        """
        from pygments.lexers import get_all_lexers
        
        languages = []
        for lexer in get_all_lexers():
            name, aliases, _, _ = lexer
            if aliases:
                languages.extend(aliases)
        
        return sorted(list(set(languages)))


class TextProcessor:
    """
    文字處理工具類
    
    功能：
    - 文字清理和驗證
    - URL和連結處理
    - 文字摘要生成
    """
    
    @staticmethod
    def clean_text(text: str) -> str:
        """
        清理文字內容
        
        Args:
            text: 原始文字
        
        Returns:
            str: 清理後的文字
        """
        if not text:
            return ''
        
        # 移除多餘的空白字符
        text = re.sub(r'\s+', ' ', text.strip())
        
        # 移除不可見字符
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
        
        return text
    
    @staticmethod
    def extract_urls(text: str) -> List[str]:
        """
        從文字中提取URL
        
        Args:
            text: 文字內容
        
        Returns:
            list: URL列表
        """
        url_pattern = re.compile(
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        )
        return url_pattern.findall(text)
    
    @staticmethod
    def generate_excerpt(text: str, max_length: int = 200) -> str:
        """
        生成文字摘要
        
        Args:
            text: 原始文字
            max_length: 最大長度
        
        Returns:
            str: 文字摘要
        """
        if not text:
            return ''
        
        # 清理文字
        clean_text = TextProcessor.clean_text(text)
        
        # 如果文字長度小於限制，直接返回
        if len(clean_text) <= max_length:
            return clean_text
        
        # 在單詞邊界截斷
        truncated = clean_text[:max_length]
        last_space = truncated.rfind(' ')
        
        if last_space > max_length * 0.8:  # 如果最後一個空格在合理位置
            truncated = truncated[:last_space]
        
        return truncated + '...'
    
    @staticmethod
    def validate_username(username: str) -> bool:
        """
        驗證用戶名格式
        
        Args:
            username: 用戶名
        
        Returns:
            bool: 是否有效
        """
        pattern = re.compile(r'^[a-zA-Z0-9_-]{3,30}$')
        return bool(pattern.match(username))
    
    @staticmethod
    def create_slug(text: str) -> str:
        """
        創建URL友好的slug
        
        Args:
            text: 原始文字
        
        Returns:
            str: slug字符串
        """
        return slugify(text)


class CacheHelper:
    """
    快取輔助工具類
    
    功能：
    - 快取操作封裝
    - 快取鍵生成
    - 快取失效管理
    """
    
    @staticmethod
    def get_cache_key(*args, prefix: str = 'engineerhub') -> str:
        """
        生成快取鍵
        
        Args:
            args: 快取鍵組成部分
            prefix: 前綴
        
        Returns:
            str: 快取鍵
        """
        key_parts = [str(arg) for arg in args]
        key = ':'.join([prefix] + key_parts)
        
        # 確保鍵長度不超過250字符（memcached限制）
        if len(key) > 250:
            key_hash = hashlib.md5(key.encode()).hexdigest()
            key = f"{prefix}:hash:{key_hash}"
        
        return key
    
    @staticmethod
    def cached_result(key: str, timeout: int = 3600):
        """
        快取結果裝飾器
        
        Args:
            key: 快取鍵
            timeout: 過期時間（秒）
        """
        def decorator(func):
            def wrapper(*args, **kwargs):
                # 檢查快取
                cached_data = cache.get(key)
                if cached_data is not None:
                    return cached_data
                
                # 執行函數並快取結果
                result = func(*args, **kwargs)
                cache.set(key, result, timeout)
                return result
            
            return wrapper
        return decorator
    
    @staticmethod
    def invalidate_pattern(pattern: str):
        """
        使符合模式的快取失效
        
        Args:
            pattern: 快取鍵模式
        """
        try:
            # 這是一個簡化版本，實際實現可能需要更複雜的邏輯
            # 在生產環境中，可能需要使用Redis的SCAN命令
            pass
        except Exception as e:
            logger.error(f"快取失效錯誤: {str(e)}")


class DateTimeHelper:
    """
    日期時間輔助工具類
    
    功能：
    - 日期格式化
    - 時間差計算
    - 時區處理
    """
    
    @staticmethod
    def humanize_timedelta(dt: datetime) -> str:
        """
        人性化的時間差描述
        
        Args:
            dt: 日期時間物件
        
        Returns:
            str: 人性化描述
        """
        now = timezone.now()
        diff = now - dt
        
        if diff.days > 0:
            if diff.days == 1:
                return '1天前'
            elif diff.days < 7:
                return f'{diff.days}天前'
            elif diff.days < 30:
                weeks = diff.days // 7
                return f'{weeks}週前'
            elif diff.days < 365:
                months = diff.days // 30
                return f'{months}個月前'
            else:
                years = diff.days // 365
                return f'{years}年前'
        
        seconds = diff.seconds
        if seconds < 60:
            return '剛剛'
        elif seconds < 3600:
            minutes = seconds // 60
            return f'{minutes}分鐘前'
        else:
            hours = seconds // 3600
            return f'{hours}小時前'
    
    @staticmethod
    def get_date_range(period: str) -> tuple[datetime, datetime]:
        """
        獲取日期範圍
        
        Args:
            period: 時間週期 ('today', 'week', 'month', 'year')
        
        Returns:
            tuple: (開始時間, 結束時間)
        """
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        if period == 'today':
            return today_start, now
        elif period == 'week':
            week_start = today_start - timedelta(days=today_start.weekday())
            return week_start, now
        elif period == 'month':
            month_start = today_start.replace(day=1)
            return month_start, now
        elif period == 'year':
            year_start = today_start.replace(month=1, day=1)
            return year_start, now
        else:
            return today_start, now


class ValidationHelper:
    """
    驗證輔助工具類
    
    功能：
    - 資料格式驗證
    - 業務規則驗證
    """
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """
        驗證電子郵件格式
        
        Args:
            email: 電子郵件地址
        
        Returns:
            bool: 是否有效
        """
        pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        return bool(pattern.match(email))
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """
        驗證手機號碼格式（台灣）
        
        Args:
            phone: 手機號碼
        
        Returns:
            bool: 是否有效
        """
        # 移除所有非數字字符
        phone_digits = re.sub(r'\D', '', phone)
        
        # 台灣手機號碼格式
        pattern = re.compile(r'^09\d{8}$')
        return bool(pattern.match(phone_digits))
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """
        驗證密碼強度
        
        Args:
            password: 密碼
        
        Returns:
            dict: 驗證結果
        """
        result = {
            'is_valid': True,
            'score': 0,
            'errors': []
        }
        
        if len(password) < 8:
            result['errors'].append('密碼長度至少8位')
            result['is_valid'] = False
        else:
            result['score'] += 1
        
        if not re.search(r'[a-z]', password):
            result['errors'].append('密碼需包含小寫字母')
            result['is_valid'] = False
        else:
            result['score'] += 1
        
        if not re.search(r'[A-Z]', password):
            result['errors'].append('密碼需包含大寫字母')
            result['is_valid'] = False
        else:
            result['score'] += 1
        
        if not re.search(r'\d', password):
            result['errors'].append('密碼需包含數字')
            result['is_valid'] = False
        else:
            result['score'] += 1
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            result['errors'].append('密碼需包含特殊字符')
        else:
            result['score'] += 1
        
        return result


# 常用的快取裝飾器
def cache_result(timeout: int = 3600, key_prefix: str = ''):
    """
    快取函數結果的裝飾器
    
    Args:
        timeout: 快取過期時間
        key_prefix: 快取鍵前綴
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # 生成快取鍵
            cache_key = CacheHelper.get_cache_key(
                key_prefix or func.__name__,
                str(args),
                str(sorted(kwargs.items()))
            )
            
            # 檢查快取
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # 執行函數並快取結果
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout)
            return result
        
        return wrapper
    return decorator 