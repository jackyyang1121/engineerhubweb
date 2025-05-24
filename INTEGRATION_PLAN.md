# 🔧 EngineerHub 重复功能整合计划

## 📋 发现的重复问题

### 1. 用户模型重复 ⚠️ **严重问题**

**当前状况：**
- `accounts.User` 模型（功能完整，包含社交功能、作品集、设置等）
- `users.CustomUser` 模型（功能简单，基本用户信息）
- 配置文件中 AUTH_USER_MODEL 设置不一致

**影响：**
- 数据库迁移冲突
- API 响应不一致
- 前端类型定义混乱

### 2. 关注功能重复

**当前状况：**
- `accounts.Follow` 模型
- `users.UserFollowing` 模型

### 3. 作品集功能重复

**当前状况：**
- `accounts.PortfolioProject` 模型（功能更完整）
- `profiles.Portfolio` 模型（功能简单）

## 🎯 整合方案

### 阶段一：统一用户模型

#### 1.1 选择主要用户模型
**决定：使用 `accounts.User` 作为主要用户模型**

**原因：**
- 功能更完整（包含社交功能、统计数据、隐私设置等）
- 已有完整的关联模型（Follow、PortfolioProject、UserSettings、BlockedUser）
- 代码质量更高，包含图片压缩等优化功能

#### 1.2 迁移步骤
1. **统一 AUTH_USER_MODEL 配置**
   - 将所有 settings 文件中的 AUTH_USER_MODEL 设置为 `'accounts.User'`
   - 删除 `users.CustomUser` 模型

2. **迁移数据**
   - 如果 users.CustomUser 中有数据，需要迁移到 accounts.User
   - 更新所有外键引用

3. **删除冗余应用**
   - 删除 `users` 应用
   - 更新 INSTALLED_APPS

### 阶段二：整合关注功能

#### 2.1 统一关注模型
**决定：使用 `accounts.Follow` 模型**

**原因：**
- 包含自动更新统计数据的逻辑
- 字段命名更清晰（follower/following vs user/following_user）

#### 2.2 迁移步骤
1. 迁移 `users.UserFollowing` 数据到 `accounts.Follow`
2. 删除 `users.UserFollowing` 模型

### 阶段三：整合作品集功能

#### 3.1 统一作品集模型
**决定：使用 `accounts.PortfolioProject` 模型**

**原因：**
- 功能更完整（支持多种链接、技术标签、排序等）
- 包含图片处理功能
- 有 is_featured 和 order 字段用于展示控制

#### 3.2 迁移步骤
1. 迁移 `profiles.Portfolio` 数据到 `accounts.PortfolioProject`
2. 保留 `profiles.PortfolioMedia` 模型，更新外键引用
3. 或者删除 `profiles` 应用，将 PortfolioMedia 移到 accounts

### 阶段四：整合API和前端

#### 4.1 后端API整合
1. **统一用户API**
   - 删除 `users/` 应用的API
   - 在 `accounts/` 中提供完整的用户API
   - 更新 URL 配置

2. **统一作品集API**
   - 将作品集API移到 `accounts/` 应用
   - 或者保留 `profiles/` 应用但只处理作品集相关功能

#### 4.2 前端API整合
1. **更新API调用**
   - 统一所有用户相关API调用到一个端点
   - 更新 `userApi.ts` 中的接口

2. **更新类型定义**
   - 确保 TypeScript 类型与后端模型一致
   - 删除重复的类型定义

## 📅 实施计划

### 第一周：准备工作
- [ ] 备份当前数据库
- [ ] 分析现有数据分布
- [ ] 创建数据迁移脚本

### 第二周：后端整合
- [ ] 统一用户模型配置
- [ ] 迁移用户数据
- [ ] 整合关注和作品集功能
- [ ] 更新API端点

### 第三周：前端整合
- [ ] 更新API调用
- [ ] 统一类型定义
- [ ] 测试所有功能

### 第四周：测试和优化
- [ ] 全面功能测试
- [ ] 性能优化
- [ ] 文档更新

## ⚠️ 风险和注意事项

1. **数据丢失风险**
   - 必须在迁移前完整备份数据库
   - 逐步迁移，每步都要验证数据完整性

2. **API兼容性**
   - 前端可能依赖现有API结构
   - 需要保持API响应格式的兼容性

3. **开发环境影响**
   - 迁移过程中可能影响开发环境
   - 建议在独立分支进行整合工作

## 🎯 预期收益

1. **代码简化**
   - 减少重复代码
   - 统一数据模型
   - 简化维护工作

2. **性能提升**
   - 减少数据库查询
   - 统一缓存策略
   - 优化API响应

3. **开发效率**
   - 统一开发接口
   - 减少混淆和错误
   - 提高代码质量

## 📝 后续维护

1. **文档更新**
   - 更新API文档
   - 更新开发指南
   - 更新数据库设计文档

2. **监控和日志**
   - 添加迁移监控
   - 记录API使用情况
   - 性能监控

3. **持续优化**
   - 定期检查重复代码
   - 优化数据库查询
   - 改进API设计 