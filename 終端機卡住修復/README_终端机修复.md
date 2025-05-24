# 终端机卡住修复工具使用说明

## 🚨 快速解决方案

### 当终端机卡住时，立即执行：

```bash
# 1. 诊断问题（10秒超时）
timeout 10s ./終端機卡住修復/kill_stuck_processes.sh

# 2. 自动修复（30秒超时）  
timeout 30s ./終端機卡住修復/fix_stuck_terminal.sh
```

## 📁 文件结构

```
終端機卡住修復/
├── kill_stuck_processes.sh    # 诊断脚本
├── fix_stuck_terminal.sh       # 自动修复脚本
├── terminal_aliases.sh         # 便捷别名
└── TERMINAL_FIX_GUIDE.md      # 详细使用指南
```

## 🔧 快速命令

### 检查当前状态
```bash
# 查看进程
timeout 5s ps aux | grep -E "(python|node)" | head -5

# 查看Docker状态
timeout 5s docker ps

# 查看端口占用
timeout 3s netstat -an | findstr LISTENING | head -5
```

### 终止卡住的进程
```bash
# 终止Python进程
pkill -f python

# 终止Node.js进程
pkill -f node

# 重启Docker服务
timeout 10s docker-compose down
timeout 20s docker-compose up -d
```

## ⚡ 紧急情况

如果脚本也卡住了：

1. **Ctrl+C** - 中断当前命令
2. **Ctrl+Z** - 暂停进程
3. 关闭终端机重新开启
4. 重启Docker Desktop

## 💡 预防小贴士

- 总是为长时间运行的命令加上 `timeout`
- 启动服务前检查端口是否被占用
- 定期清理Docker资源：`docker system prune -f`

---

**记住**: 所有命令都已经加上了时间限制，不用担心再次卡住！ 