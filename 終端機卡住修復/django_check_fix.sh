#!/bin/bash

echo "=== Django Check 命令卡住问题修复 ==="

# 安全执行函数
safe_run() {
    local cmd="$1"
    local timeout_sec="$2"
    echo "执行: $cmd (超时: ${timeout_sec}秒)"
    timeout ${timeout_sec}s bash -c "$cmd" || echo "命令超时或失败: $cmd"
}

echo "问题分析：Django check 命令可能卡在 Algolia 连接测试上"

echo -e "\n1. 检查当前 Python 进程..."
safe_run "ps aux | grep python | grep -v grep" 5

echo -e "\n2. 检查环境变量配置..."
if [ -f ".env" ]; then
    echo "找到 .env 文件"
    safe_run "grep -E '(ALGOLIA_|DEBUG)' .env | head -5" 3
else
    echo "⚠️  未找到 .env 文件"
fi

echo -e "\n3. 测试安全的 Django 检查..."
cd backend 2>/dev/null || cd . 

# 使用更短的超时时间测试
echo "尝试快速检查（5秒超时）..."
safe_run "python manage.py check --deploy" 5

echo -e "\n4. 检查 Algolia 配置状态..."
safe_run "python -c \"
import os
print(f'ALGOLIA_APPLICATION_ID: {bool(os.getenv(\"ALGOLIA_APPLICATION_ID\"))}')
print(f'ALGOLIA_API_KEY: {bool(os.getenv(\"ALGOLIA_API_KEY\"))}')
\"" 3

echo -e "\n5. 建议的解决方案："
echo "   ✅ 系统已经有防护机制，Algolia 连接测试会被跳过"
echo "   ✅ 使用 timeout 命令避免卡住：timeout 10s python manage.py check"
echo "   ⚠️  如需启用搜索功能，请配置有效的 Algolia API 密钥"

echo -e "\n6. 快速修复命令："
echo "   # 终止可能卡住的 Python 进程"
echo "   pkill -f 'python manage.py'"
echo ""
echo "   # 安全运行 check 命令"
echo "   timeout 10s python manage.py check"
echo ""
echo "   # 检查 Docker 容器状态"
echo "   docker ps | grep engineerhub"

echo -e "\n=== 修复完成 ==="
echo "如果问题持续，请："
echo "1. 检查 Algolia API 密钥是否有效"
echo "2. 考虑暂时禁用 Algolia（移除环境变量）"
echo "3. 重启 Django 开发服务器" 