#!/bin/bash

echo "=== 快速修复卡住的终端机 ==="

# 函数：安全地执行带时间限制的命令
safe_exec() {
    local cmd="$1"
    local timeout_sec="$2"
    echo "执行: $cmd (超时: ${timeout_sec}秒)"
    timeout ${timeout_sec}s bash -c "$cmd" || echo "命令超时或失败: $cmd"
}

echo "1. 检查并停止可能卡住的进程..."

# 检查是否有Python进程卡住
STUCK_PYTHON=$(timeout 3s ps aux | grep "python" | grep -v grep | awk '{print $1}' | head -1)
if [ ! -z "$STUCK_PYTHON" ]; then
    echo "发现Python进程 PID: $STUCK_PYTHON，尝试优雅停止..."
    safe_exec "kill $STUCK_PYTHON" 5
    sleep 2
    # 如果还在运行，强制停止
    if timeout 2s ps -p $STUCK_PYTHON > /dev/null 2>&1; then
        echo "强制停止Python进程..."
        safe_exec "kill -9 $STUCK_PYTHON" 3
    fi
fi

# 检查Node.js进程
STUCK_NODE=$(timeout 3s ps aux | grep "node" | grep -v grep | awk '{print $1}' | head -1)
if [ ! -z "$STUCK_NODE" ]; then
    echo "发现Node.js进程 PID: $STUCK_NODE，尝试优雅停止..."
    safe_exec "kill $STUCK_NODE" 5
    sleep 2
    if timeout 2s ps -p $STUCK_NODE > /dev/null 2>&1; then
        echo "强制停止Node.js进程..."
        safe_exec "kill -9 $STUCK_NODE" 3
    fi
fi

echo "2. 检查Docker容器状态..."
safe_exec "docker ps --format 'table {{.Names}}\t{{.Status}}'" 5

echo "3. 重启可能有问题的服务..."
echo "是否要重启Docker服务？ (将自动在10秒后继续)"
read -t 10 -p "输入 'y' 重启Docker服务，其他任何键跳过: " restart_docker

if [ "$restart_docker" = "y" ] || [ -z "$restart_docker" ]; then
    echo "重启Docker服务..."
    safe_exec "docker-compose down" 10
    sleep 3
    safe_exec "docker-compose up -d" 15
else
    echo "跳过Docker重启"
fi

echo "4. 清理操作..."
safe_exec "docker system prune -f" 10

echo "=== 修复完成 ==="
echo "当前系统状态："
safe_exec "docker ps --format 'table {{.Names}}\t{{.Status}}'" 5
safe_exec "ps aux | grep -E '(python|node)' | grep -v grep | head -3" 3

echo "如果问题仍然存在，建议："
echo "1. 重启整个终端机会话"
echo "2. 检查系统资源使用情况"
echo "3. 查看具体的错误日志" 