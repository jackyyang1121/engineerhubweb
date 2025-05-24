#!/bin/bash

echo "=== 终端机卡住问题诊断和解决脚本 ==="
echo "时间: $(date)"

# 设置5秒的全局超时
set -o timeout 5

echo -e "\n1. 检查当前运行的主要进程..."
timeout 5s ps aux | grep -E "(python|node|npm|docker|git)" | grep -v grep | head -10

echo -e "\n2. 检查Docker容器状态..."
timeout 5s docker ps | head -5

echo -e "\n3. 检查监听的端口..."
timeout 5s netstat -an | findstr LISTENING | head -5

echo -e "\n4. 查找可能卡住的进程..."
# 查找可能的问题进程
PYTHON_PROCS=$(timeout 3s ps aux | grep python | grep -v grep | awk '{print $1}')
NODE_PROCS=$(timeout 3s ps aux | grep node | grep -v grep | awk '{print $1}')

if [ ! -z "$PYTHON_PROCS" ]; then
    echo "发现Python进程: $PYTHON_PROCS"
fi

if [ ! -z "$NODE_PROCS" ]; then
    echo "发现Node.js进程: $NODE_PROCS"
fi

echo -e "\n5. 检查Docker容器日志..."
timeout 3s docker logs engineerhub_django --tail 3 2>/dev/null || echo "Django日志检查失败"

echo -e "\n=== 解决方案 ==="
echo "如果发现卡住的进程，可以使用以下命令："
echo "1. 停止Docker服务: docker-compose down"
echo "2. 强制终止Python进程: pkill -f python"
echo "3. 强制终止Node进程: pkill -f node"
echo "4. 重启服务: docker-compose up -d"

echo -e "\n=== 预防措施 ==="
echo "1. 在启动服务前检查端口是否被占用"
echo "2. 使用timeout命令为长时间运行的命令设置时间限制"
echo "3. 定期清理Docker未使用的镜像和容器"

echo -e "\n脚本执行完成!" 