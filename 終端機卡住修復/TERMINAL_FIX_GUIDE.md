# 终端机卡住问题解决指南

## 🚨 当终端机卡住时

### 立即解决方案

1. **快速诊断**:
   ```bash
   timeout 10s ./kill_stuck_processes.sh
   ```

2. **自动修复**:
   ```bash
   timeout 30s ./fix_stuck_terminal.sh
   ```

### 手动解决步骤

#### 步骤1：检查卡住的进程
```bash
# 查看所有进程（限时5秒）
timeout 5s ps aux | head -20

# 查找Python进程
timeout 3s ps aux | grep python | grep -v grep

# 查找Node.js进程  
timeout 3s ps aux | grep node | grep -v grep
```

#### 步骤2：安全终止进程
```bash
# 优雅停止Python进程
pkill -TERM python

# 如果不行，强制停止
pkill -9 python

# 停止Node.js进程
pkill -TERM node
pkill -9 node
```

#### 步骤3：检查Docker状态
```bash
# 查看容器状态（限时10秒）
timeout 10s docker ps

# 查看容器日志
timeout 5s docker logs engineerhub_django --tail 5

# 重启Docker服务
timeout 15s docker-compose down
timeout 30s docker-compose up -d
```

#### 步骤4：清理资源
```bash
# 清理Docker资源
timeout 15s docker system prune -f

# 清理未使用的镜像
timeout 10s docker image prune -f
```

## 🛡️ 预防措施

### 1. 使用时间限制
总是在可能长时间运行的命令前加上 `timeout`：

```bash
# 好的做法
timeout 10s npm install
timeout 15s python manage.py migrate
timeout 30s docker-compose up

# 避免的做法（可能卡住）
npm install  # 没有时间限制
python manage.py runserver  # 没有时间限制
```

### 2. 检查端口占用
启动服务前检查端口：

```bash
# 检查常用端口
timeout 3s netstat -an | findstr -E "(3000|8000|8080|5432|6379)"

# 检查特定端口
timeout 3s netstat -an | findstr ":8000"
```

### 3. 定期清理
```bash
# 每日清理（添加到计划任务）
timeout 15s docker system prune -f
timeout 10s docker volume prune -f
```

## 🔧 便捷别名

将以下内容添加到 `~/.bashrc` 或 `~/.bash_profile`：

```bash
# 加载别名
source /c/Users/88690/Documents/Github/engineerhubweb/terminal_aliases.sh
```

可用的快捷命令：
- `check-stuck` - 诊断卡住的进程
- `fix-stuck` - 自动修复
- `safe-ps` - 安全查看进程
- `safe-docker` - 安全查看Docker
- `clean-docker` - 清理Docker资源

## 🚨 紧急情况

如果以上都不行：

1. **Ctrl+C** 尝试中断当前命令
2. **Ctrl+Z** 暂停当前进程，然后用 `kill %1`
3. 关闭并重新打开终端机
4. 重启Docker Desktop (Windows)
5. 重启计算机（最后手段）

## 📊 监控工具

```bash
# 实时监控系统资源
timeout 10s top | head -20

# 监控Docker资源使用
timeout 5s docker stats --no-stream

# 监控磁盘使用
timeout 3s df -h
```

---

**记住**: 永远为可能卡住的命令设置时间限制！ 