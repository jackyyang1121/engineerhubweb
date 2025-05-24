#!/bin/bash

echo "=== 终端机修复工具快捷方式 ==="

SCRIPT_DIR="終端機卡住修復"

# 检查修复目录是否存在
if [ ! -d "$SCRIPT_DIR" ]; then
    echo "错误：找不到 $SCRIPT_DIR 文件夹"
    exit 1
fi

echo "可用的修复工具："
echo "1. 诊断卡住的进程"
echo "2. 自动修复卡住的终端机"
echo "3. 查看使用指南"
echo "4. 加载便捷别名"

read -p "请选择 (1-4): " choice

case $choice in
    1)
        echo "正在诊断..."
        timeout 15s "./$SCRIPT_DIR/kill_stuck_processes.sh"
        ;;
    2)
        echo "正在自动修复..."
        timeout 30s "./$SCRIPT_DIR/fix_stuck_terminal.sh"
        ;;
    3)
        echo "显示使用指南..."
        cat "./$SCRIPT_DIR/TERMINAL_FIX_GUIDE.md" | head -50
        ;;
    4)
        echo "加载别名..."
        source "./$SCRIPT_DIR/terminal_aliases.sh"
        ;;
    *)
        echo "无效选择，显示帮助..."
        cat "./$SCRIPT_DIR/TERMINAL_FIX_GUIDE.md" | head -30
        ;;
esac 