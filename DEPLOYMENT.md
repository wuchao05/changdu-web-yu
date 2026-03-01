# 部署指南

## 📦 首次部署步骤

### 1. 拉取代码

```bash
git clone <repository-url>
cd changdu-web
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置持久化存储路径（生产环境推荐）

**重要**：为防止部署时配置文件被覆盖，建议将配置文件放在项目目录外。

#### 方式 1：使用环境变量（推荐）

```bash
# 1. 创建持久化数据目录（项目外）
sudo mkdir -p /data/changdu-web-yu
sudo chown $USER:$USER /data/changdu-web-yu

# 2. 配置环境变量
echo 'export DAREN_CONFIG_PATH="/data/changdu-web-yu/daren-config.json"' >> ~/.bashrc
source ~/.bashrc

# 3. 初始化配置文件
cp server/data/daren-config.json.example /data/changdu-web-yu/daren-config.json
```

#### 方式 2：使用项目内路径（开发环境）

```bash
cd server/data
cp daren-config.json.example daren-config.json
cd ../..
```

**注意**：

- 使用项目内路径时，需要确保部署脚本不会删除整个项目目录
- 推荐生产环境使用方式 1（环境变量 + 外部路径）

### 4. 构建项目

```bash
pnpm build
```

### 5. 启动服务

#### 方式 1：直接启动（开发/测试）

```bash
pnpm start
```

#### 方式 2：使用 PM2（推荐生产环境）

**配置 PM2**：

```bash
# 1. 复制示例配置
cp ecosystem.config.example.js ecosystem.config.js

# 2. 编辑配置文件，设置正确的 DAREN_CONFIG_PATH
nano ecosystem.config.js

# 3. 使用 PM2 启动
pm2 start ecosystem.config.js

# 4. 保存 PM2 进程列表
pm2 save

# 5. 设置开机自启
pm2 startup
```

**或快速启动**：

```bash
pm2 start npm --name "changdu-web" -- start
```

### 6. 配置达人信息

- 使用管理员账号访问网站
- 进入"设置" → "达人设置"
- 添加达人及其抖音号配置

---

## 🔄 后续部署（更新代码）

### 方式 1：使用外部持久化路径（推荐）

```bash
# 1. 备份配置（可选，因为配置在项目外不会被覆盖）
cp /data/changdu-web-yu/daren-config.json /data/changdu-web-yu/daren-config.backup.$(date +%Y%m%d_%H%M%S).json

# 2. 拉取最新代码
git pull origin master

# 3. 安装依赖（如有更新）
pnpm install

# 4. 构建
pnpm build

# 5. 重启服务
pm2 restart changdu-web
```

**优势**：配置文件在 `/data/changdu-web-yu/` 下，完全不受部署影响！

### 方式 2：使用项目内路径

```bash
# 1. 备份当前配置（必须！）
cp server/data/daren-config.json server/data/daren-config.backup.$(date +%Y%m%d_%H%M%S).json

# 2. 拉取最新代码
git pull origin master

# 3. 安装依赖（如有更新）
pnpm install

# 4. 构建
pnpm build

# 5. 重启服务
pm2 restart changdu-web
```

**注意**：

- 方式 2 依赖 Git 不覆盖配置文件（已加入 `.gitignore`）
- 如果使用 `rm -rf` 删除项目目录后重新部署，配置会丢失
- 推荐使用方式 1 确保配置永不丢失

### 方式 2：使用部署脚本

```bash
./deploy.sh
```

---

## ⚠️ 配置文件说明

### 达人配置文件路径

配置文件路径由环境变量 `DAREN_CONFIG_PATH` 决定：

```bash
# 生产环境（推荐）
export DAREN_CONFIG_PATH="/data/changdu-web-yu/daren-config.json"

# 开发环境（默认）
# 不设置环境变量，自动使用：server/data/daren-config.json
```

### 配置文件特性

- **用途**：存储达人账号和抖音号配置
- **管理方式**：通过网站"达人设置"页面管理
- **版本控制**：项目内路径已加入 `.gitignore`，不纳入 Git 管理
- **持久化策略**：
  - **外部路径**（`/data/changdu-web-yu/`）：完全不受部署影响，永久保存
  - **项目内路径**（`server/data/`）：受 `.gitignore` 保护，但重新部署时需注意备份

### 如果配置文件丢失

#### 首先：确认配置文件路径

```bash
# 检查是否设置了环境变量
echo $DAREN_CONFIG_PATH

# 如果有输出（如 /data/changdu-web-yu/daren-config.json）
ls -la $DAREN_CONFIG_PATH

# 如果无输出（使用项目内路径）
ls -la server/data/daren-config.json
```

#### 情况 1：有备份文件

**外部路径**：

```bash
# 查看备份文件
ls -la /data/changdu-web-yu/daren-config.backup.*
# 恢复最新备份
cp /data/changdu-web-yu/daren-config.backup.YYYYMMDD_HHMMSS.json /data/changdu-web-yu/daren-config.json
```

**项目内路径**：

```bash
cd server/data
ls -la daren-config.backup.*
cp daren-config.backup.YYYYMMDD_HHMMSS.json daren-config.json
```

#### 情况 2：无备份文件

**外部路径**：

```bash
cp server/data/daren-config.json.example /data/changdu-web-yu/daren-config.json
```

**项目内路径**：

```bash
cd server/data
cp daren-config.json.example daren-config.json
```

然后通过网站设置页面重新配置。

---

## 🌍 多环境部署

### 环境隔离（使用环境变量）

推荐为每个环境设置独立的配置文件路径：

**开发环境**：

```bash
# ~/.bashrc 或 ~/.zshrc
export DAREN_CONFIG_PATH="/data/changdu-web-yu-dev/daren-config.json"
```

**测试环境**：

```bash
export DAREN_CONFIG_PATH="/data/changdu-web-yu-test/daren-config.json"
```

**生产环境**：

```bash
export DAREN_CONFIG_PATH="/data/changdu-web-yu-prod/daren-config.json"
```

### PM2 环境变量配置

如果使用 PM2 管理进程，可在 `ecosystem.config.js` 中配置：

```javascript
module.exports = {
  apps: [
    {
      name: 'changdu-web-prod',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        DAREN_CONFIG_PATH: '/data/changdu-web-yu-prod/daren-config.json',
      },
    },
  ],
}
```

### 环境配置步骤

1. 在各环境服务器创建独立数据目录

   ```bash
   sudo mkdir -p /data/changdu-web-yu-{dev,test,prod}
   sudo chown $USER:$USER /data/changdu-web-yu-{dev,test,prod}
   ```

2. 各自初始化配置文件

   ```bash
   cp server/data/daren-config.json.example /data/changdu-web-yu-prod/daren-config.json
   ```

3. 各自通过设置页面配置达人信息

4. 环境间配置完全独立，互不影响

---

## 🔐 安全建议

### 1. 定期备份

**外部路径（推荐）**：

```bash
# 添加到 crontab，每天备份
0 2 * * * cp /data/changdu-web-yu/daren-config.json /data/changdu-web-yu/daren-config.backup.$(date +\%Y\%m\%d).json
```

**项目内路径**：

```bash
# 添加到 crontab，每天备份
0 2 * * * cd /path/to/changdu-web/server/data && cp daren-config.json daren-config.backup.$(date +\%Y\%m\%d).json
```

### 2. 限制文件权限

**外部路径**：

```bash
chmod 600 /data/changdu-web-yu/daren-config.json
chown your-app-user:your-app-group /data/changdu-web-yu/daren-config.json
```

**项目内路径**：

```bash
chmod 600 server/data/daren-config.json
chown your-app-user:your-app-group server/data/daren-config.json
```

### 3. 备份目录清理

**外部路径**：

```bash
# 只保留最近 30 天的备份
find /data/changdu-web-yu -name "daren-config.backup.*" -mtime +30 -delete
```

**项目内路径**：

```bash
# 只保留最近 30 天的备份
find server/data -name "daren-config.backup.*" -mtime +30 -delete
```

---

## 🐛 故障排查

### 问题 1：部署后达人配置丢失

**症状**：部署后，达人设置页面显示为空

**原因**：配置文件被意外删除或覆盖

**解决**：

```bash
# 1. 检查环境变量
echo $DAREN_CONFIG_PATH

# 2. 检查文件是否存在
# 如果设置了环境变量
ls -la $DAREN_CONFIG_PATH
# 如果未设置（使用项目内路径）
ls -la server/data/daren-config.json

# 3. 如果不存在，恢复备份或重新初始化
# 外部路径
cp /data/changdu-web-yu/daren-config.backup.latest.json /data/changdu-web-yu/daren-config.json
# 项目内路径
cp server/data/daren-config.backup.latest.json server/data/daren-config.json
# 或重新初始化
cp server/data/daren-config.json.example $DAREN_CONFIG_PATH

# 4. 重启服务
pm2 restart changdu-web
```

### 问题 1.1：环境变量未生效

**症状**：设置了 `DAREN_CONFIG_PATH`，但系统仍使用项目内路径

**原因**：环境变量未正确加载或进程未重启

**解决**：

```bash
# 1. 检查环境变量是否生效
echo $DAREN_CONFIG_PATH

# 2. 如果未生效，检查配置文件
cat ~/.bashrc | grep DAREN_CONFIG_PATH
# 或
cat ~/.zshrc | grep DAREN_CONFIG_PATH

# 3. 重新加载环境变量
source ~/.bashrc  # 或 source ~/.zshrc

# 4. 重启服务（重要！）
pm2 restart changdu-web

# 5. 查看服务日志，确认路径
pm2 logs changdu-web | grep "配置文件路径"
```

### 问题 2：配置更新不生效

**症状**：在设置页面修改了配置，但前端显示旧数据

**原因**：前端缓存未刷新

**解决**：

1. 浏览器控制台执行：

```javascript
localStorage.removeItem('daren-list-cache')
location.reload()
```

2. 或点击设置页面的"刷新配置"按钮

### 问题 3：Git 又追踪了配置文件

**症状**：`git status` 显示 `server/data/daren-config.json` 被修改

**原因**：不小心执行了 `git add server/data/daren-config.json`

**解决**：

```bash
# 从暂存区移除
git restore --staged server/data/daren-config.json

# 确认 .gitignore 包含此文件
grep "daren-config.json" .gitignore
```

---

## 📋 检查清单

### 首次部署前

- [ ] 已拉取最新代码
- [ ] 已安装依赖
- [ ] 已配置 `DAREN_CONFIG_PATH` 环境变量（生产环境推荐）
- [ ] 已创建外部数据目录（如使用外部路径）
- [ ] 已初始化 `daren-config.json`
- [ ] 已构建项目

### 首次部署后

- [ ] 服务正常启动
- [ ] 查看日志确认配置文件路径正确
  ```bash
  pm2 logs changdu-web | grep "配置文件路径"
  ```
- [ ] 网站可访问
- [ ] 已配置达人信息
- [ ] 已创建首次备份
- [ ] 已设置定期备份任务（crontab）

### 更新部署前

- [ ] 已确认配置文件路径（外部/内部）
- [ ] 已备份当前配置（可选，外部路径不受影响）
- [ ] 已通知用户（如需要）

### 更新部署后

- [ ] 服务正常重启
- [ ] 配置文件未丢失（检查达人设置页面）
- [ ] 环境变量仍然生效
  ```bash
  pm2 logs changdu-web | grep "配置文件路径"
  ```
- [ ] 功能正常运行
- [ ] 清理旧备份（可选）

---

## 🆘 紧急联系

如遇到部署问题，请联系：

- 开发团队：[联系方式]
- 技术文档：[文档链接]
