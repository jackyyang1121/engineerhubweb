# 添加到您的 ~/.bashrc 或 ~/.bash_profile 中

# 终端机卡住问题解决别名
alias check-stuck='timeout 10s ./kill_stuck_processes.sh'
alias fix-stuck='timeout 30s ./fix_stuck_terminal.sh'
alias safe-ps='timeout 5s ps aux | head -20'
alias safe-docker='timeout 10s docker ps'
alias safe-ports='timeout 5s netstat -an | findstr LISTENING | head -10'

# 安全的Docker操作别名（带时间限制）
alias safe-docker-down='timeout 15s docker-compose down'
alias safe-docker-up='timeout 30s docker-compose up -d'
alias safe-docker-logs='timeout 10s docker-compose logs --tail=20'

# 快速清理别名
alias kill-python='pkill -f python'
alias kill-node='pkill -f node'
alias clean-docker='timeout 15s docker system prune -f'

# 检查常用端口
alias check-ports='timeout 3s netstat -an | findstr -E "(3000|8000|8080|5432|6379)"'

echo "终端机卡住问题工具已加载！"
echo "可用命令："
echo "  check-stuck  - 诊断卡住的进程"
echo "  fix-stuck    - 自动修复卡住的终端机"
echo "  safe-ps      - 安全查看进程"
echo "  safe-docker  - 安全查看Docker状态"
echo "  clean-docker - 清理Docker资源" 