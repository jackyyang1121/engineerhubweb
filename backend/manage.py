#!/usr/bin/env python
"""
EngineerHub Django Management Script

這是 Django 項目的主要管理腳本，用於執行各種管理任務：
- 運行開發服務器
- 執行數據庫遷移
- 創建超級用戶
- 運行測試
- 收集靜態文件
等等...

使用方法：
    python manage.py runserver
    python manage.py migrate
    python manage.py createsuperuser
    python manage.py collectstatic
"""

import os
import sys


def main():
    """運行管理任務"""
    # 設置 Django 設置模塊
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'engineerhub.settings')
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "無法導入 Django。您確定已經安裝了 Django 並且 "
            "已經激活了虛擬環境嗎？您也可以從錯誤信息中查看更多詳細信息。"
        ) from exc
    
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main() 