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

"""

import os
import sys  
#sys的功用是讓manage.py可以執行以下指令
# runserver：啟動開發伺服器
# migrate：執行資料庫遷移
# makemigrations：建立資料庫遷移檔
# createsuperuser：建立超級用戶
# collectstatic：收集靜態文件


def main():
    """運行管理任務"""
    # 設置 Django 設置模塊
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'engineerhub.settings.development')
    #Django 會透過環境變數或manage.py裡的 DJANGO_SETTINGS_MODULE 指定要用哪個設定檔
    #這邊DJANGO_SETTINGS_MODULE設定為engineerhub.settings.development
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "無法導入 Django。您確定已經安裝了 Django 並且 "
            "已經激活了虛擬環境嗎？您也可以從錯誤信息中查看更多詳細信息。"
        ) from exc
    
    execute_from_command_line(sys.argv)
# 我執行python manage.py runserver
# manage.py 呼叫main()也就會執行execute_from_command_line(sys.argv)
# 這個函式位於 django.core.management 模組，它內部會去自動匯入 Django 本身和所有已安裝 app 的指令（app 的 management/commands 資料夾裡的 .py 檔案）。
# 所以即使在 manage.py 裡沒寫import django.core.management.commands
# Django 還是會透過「App Registry（應用程式註冊系統）」自動去載入指令。
# 這種設計讓開發者只要專注在寫 manage.py 這個入口，而不用手動把每個指令都 import 進來


if __name__ == '__main__':
    main() 
