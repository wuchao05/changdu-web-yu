# 配置管理与部署文档

## 目录

- [配置管理与部署文档](#配置管理与部署文档)
  - [目录](#目录)
  - [1. 配置文件外部化存储方案](#1-配置文件外部化存储方案)
    - [1.1 为什么需要外部化存储](#11-为什么需要外部化存储)
    - [1.2 配置文件路径规划](#12-配置文件路径规划)
    - [1.3 路径选择逻辑](#13-路径选择逻辑)
  - [2. 部署架构](#2-部署架构)
    - [2.1 目录结构](#21-目录结构)
    - [2.2 软链接发版机制](#22-软链接发版机制)
  - [3. 服务启动方式](#3-服务启动方式)
    - [3.1 PM2 配置文件](#31-pm2-配置文件)
    - [3.2 环境变量配置](#32-环境变量配置)
    - [3.3 启动命令](#33-启动命令)
  - [4. 部署流程](#4-部署流程)
    - [4.1 使用 deploy.sh 自动部署](#41-使用-deploysh-自动部署)
    - [4.2 手动部署流程](#42-手动部署流程)
  - [5. 配置管理操作](#5-配置管理操作)
    - [5.1 查看配置](#51-查看配置)
    - [5.2 修改配置](#52-修改配置)
    - [5.3 备份配置](#53-备份配置)
    - [5.4 恢复配置](#54-恢复配置)
  - [6. 故障排查](#6-故障排查)
    - [6.1 配置文件未生效](#61-配置文件未生效)
    - [6.2 权限问题](#62-权限问题)
    - [6.3 服务启动失败](#63-服务启动失败)
  - [7. 最佳实践](#7-最佳实践)
    - [7.1 配置备份策略](#71-配置备份策略)
    - [7.2 发版前检查清单](#72-发版前检查清单)
    - [7.3 应急恢复预案](#73-应急恢复预案)
  - [8. 开发环境配置](#8-开发环境配置)
    - [8.1 本地开发](#81-本地开发)
    - [8.2 环境变量配置](#82-环境变量配置)

---

## 1. 配置文件外部化存储方案

### 1.1 为什么需要外部化存储

**问题**：

- 每次发版（git pull + 重新构建）会覆盖项目目录下的所有文件
- 达人配置、抖音号素材匹配配置等业务数据会丢失
- 需要手动备份和恢复配置，容易出错

**解决方案**：

- 将配置文件存储在项目外的独立目录 `/data/changdu-web/`
- 通过环境变量告诉应用配置文件的位置
- 发版时只更新代码，不影响配置文件

### 1.2 配置文件路径规划

#### 生产环境（服务器）

```
/data/changdu-web/                          # 配置根目录（项目外）
├── daren-config.json                       # 达人配置
├── douyin-material-config.json             # 抖音号素材匹配配置
└── ecosystem.config.js                     # PM2 启动配置
```

#### 项目结构（会被发版覆盖）

```
/home/web/changdu-web/                      # 项目根目录
├── releases/                               # 各版本发布目录
│   ├── 20260110-120000/                   # 历史版本
│   └── 20260110-123000/                   # 当前版本
├── current -> releases/20260110-123000/    # 软链接指向当前版本
└── shared/                                 # 共享文件（如 .env）
    └── .env
```

### 1.3 路径选择逻辑

应用启动时按以下优先级选择配置文件路径：

1. **环境变量**（最高优先级）

   ```bash
   DAREN_CONFIG_PATH=/custom/path/daren-config.json
   DOUYIN_MATERIAL_CONFIG_PATH=/custom/path/douyin-material-config.json
   ```

2. **生产环境**（`NODE_ENV=production`）

   ```
   /data/changdu-web/daren-config.json
   /data/changdu-web/douyin-material-config.json
   ```

3. **开发环境**（默认）
   ```
   server/data/daren-config.json
   server/data/douyin-material-config.json
   ```

---

## 2. 部署架构

### 2.1 目录结构

```
/home/web/changdu-web/
├── releases/                    # 版本发布目录
│   ├── 20260110-120000/        # 版本1
│   ├── 20260110-123000/        # 版本2（当前）
│   └── 20260110-130000/        # 版本3
├── current -> releases/20260110-123000/  # 软链接
└── shared/
    └── .env                     # 环境变量配置

/data/changdu-web/               # 配置目录（独立于项目）
├── daren-config.json
├── douyin-material-config.json
└── ecosystem.config.js
```

### 2.2 软链接发版机制

**原理**：

1. 每次发版创建新的 releases 目录
2. 构建完成后，更新 `current` 软链接指向新版本
3. PM2 配置中使用 `current` 路径，重启时自动使用新版本
4. 旧版本保留，可快速回滚

**优点**：

- 零停机时间切换版本
- 可快速回滚到任意历史版本
- 配置文件在 `/data/` 中，不受影响

---

## 3. 服务启动方式

### 3.1 PM2 配置文件

**位置**：`/data/changdu-web/ecosystem.config.js`

**内容**：

```javascript
module.exports = {
  apps: [
    {
      name: 'changdu-web',
      cwd: '/home/web/changdu-web/current',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        DAREN_CONFIG_PATH: '/data/changdu-web/daren-config.json',
        DOUYIN_MATERIAL_CONFIG_PATH: '/data/changdu-web/douyin-material-config.json',
      },
    },
  ],
}
```

**关键参数说明**：

- `name`: PM2 进程名称
- `cwd`: 工作目录（指向 current 软链接）
- `script`: 启动脚本
- `env`: 环境变量
  - `NODE_ENV=production`: 标识生产环境
  - `DAREN_CONFIG_PATH`: 达人配置文件路径
  - `DOUYIN_MATERIAL_CONFIG_PATH`: 抖音号配置文件路径

### 3.2 环境变量配置

**环境变量的作用**：

```javascript
// server/routes/daren.js
const CONFIG_FILE_PATH =
  process.env.DAREN_CONFIG_PATH || // 1. 优先使用环境变量
  (process.env.NODE_ENV === 'production'
    ? '/data/changdu-web/daren-config.json' // 2. 生产环境默认路径
    : path.join(__dirname, '../data/daren-config.json')) // 3. 开发环境项目内路径
```

### 3.3 启动命令

#### 方式一：使用 PM2 配置文件（推荐）

```bash
# 启动
pm2 start /data/changdu-web/ecosystem.config.js

# 重启
pm2 restart changdu-web

# 停止
pm2 stop changdu-web

# 查看状态
pm2 status

# 查看日志
pm2 logs changdu-web
```

#### 方式二：直接命令启动

```bash
cd /home/web/changdu-web/current

NODE_ENV=production \
DAREN_CONFIG_PATH=/data/changdu-web/daren-config.json \
DOUYIN_MATERIAL_CONFIG_PATH=/data/changdu-web/douyin-material-config.json \
pm2 start server.js --name changdu-web
```

#### 方式三：使用 npm script

```bash
cd /home/web/changdu-web/current

NODE_ENV=production \
DAREN_CONFIG_PATH=/data/changdu-web/daren-config.json \
DOUYIN_MATERIAL_CONFIG_PATH=/data/changdu-web/douyin-material-config.json \
npm start
```

---

## 4. 部署流程

### 4.1 使用 deploy.sh 自动部署

**一键部署**：

```bash
cd /home/web/changdu-web
./deploy.sh
```

**脚本自动执行**：

1. 下载最新代码到新的 releases 目录
2. 安装依赖 (`pnpm install`)
3. 构建项目 (`pnpm build`)
4. 创建 `/data/changdu-web/` 目录（如果不存在）
5. 初始化配置文件（如果不存在）
6. 生成 PM2 配置文件（包含环境变量）
7. 更新 `current` 软链接
8. 重启应用
9. 清理旧版本（保留最近5个）

**关键步骤详解**：

```bash
# 1. 初始化配置目录
mkdir -p /data/changdu-web

# 2. 创建达人配置（如果不存在）
if [ ! -f "/data/changdu-web/daren-config.json" ]; then
    cat > /data/changdu-web/daren-config.json << 'EOF'
{
  "darenList": []
}
EOF
fi

# 3. 创建抖音号配置（如果不存在）
if [ ! -f "/data/changdu-web/douyin-material-config.json" ]; then
    cat > /data/changdu-web/douyin-material-config.json << 'EOF'
{
  "matches": []
}
EOF
fi

# 4. 生成 PM2 配置
cat > /data/changdu-web/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'changdu-web',
    cwd: '/home/web/changdu-web/current',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      DAREN_CONFIG_PATH: '/data/changdu-web/daren-config.json',
      DOUYIN_MATERIAL_CONFIG_PATH: '/data/changdu-web/douyin-material-config.json'
    }
  }]
}
EOF

# 5. 更新软链接
ln -sfn /home/web/changdu-web/releases/20260110-123000 /home/web/changdu-web/current

# 6. 重启应用
pm2 delete changdu-web 2>/dev/null || true
pm2 start /data/changdu-web/ecosystem.config.js
pm2 save
```

### 4.2 手动部署流程

如果不使用 deploy.sh，可以按以下步骤手动部署：

```bash
# 1. 进入项目目录
cd /home/web/changdu-web

# 2. 拉取最新代码
git pull origin master

# 3. 安装依赖
pnpm install --frozen-lockfile

# 4. 构建项目
pnpm build

# 5. 确保配置目录和文件存在
mkdir -p /data/changdu-web
# 创建配置文件（如果不存在，参考 4.1）

# 6. 重启应用
pm2 restart changdu-web
```

---

## 5. 配置管理操作

### 5.1 查看配置

```bash
# 查看达人配置
cat /data/changdu-web/daren-config.json

# 查看抖音号配置
cat /data/changdu-web/douyin-material-config.json

# 查看 PM2 配置
cat /data/changdu-web/ecosystem.config.js

# 查看应用使用的配置路径（从日志）
pm2 logs changdu-web --lines 50 | grep "配置文件路径"
```

### 5.2 修改配置

**方式一：通过网站前端界面（推荐）**

1. 访问网站设置页面
2. 在"达人设置"或"每日设置"中修改配置
3. 配置自动保存到服务器文件

**方式二：直接编辑文件**

```bash
# 备份
cp /data/changdu-web/daren-config.json /data/changdu-web/daren-config.json.backup

# 编辑
vim /data/changdu-web/daren-config.json

# 验证 JSON 格式
cat /data/changdu-web/daren-config.json | jq .

# 重启应用（如果需要）
pm2 restart changdu-web
```

### 5.3 备份配置

**手动备份**：

```bash
# 备份所有配置
cp /data/changdu-web/daren-config.json \
   /data/changdu-web/daren-config.backup.$(date +%Y%m%d_%H%M%S).json

cp /data/changdu-web/douyin-material-config.json \
   /data/changdu-web/douyin-material-config.backup.$(date +%Y%m%d_%H%M%S).json
```

**定时备份**（crontab）：

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天凌晨2点备份）
0 2 * * * mkdir -p /data/changdu-web/backups/$(date +\%Y\%m\%d) && \
          cp /data/changdu-web/*.json /data/changdu-web/backups/$(date +\%Y\%m\%d)/
```

### 5.4 恢复配置

```bash
# 从备份恢复
cp /data/changdu-web/daren-config.backup.20260110_120000.json \
   /data/changdu-web/daren-config.json

# 重启应用
pm2 restart changdu-web

# 验证配置已生效
pm2 logs changdu-web --lines 10
```

---

## 6. 故障排查

### 6.1 配置文件未生效

**现象**：修改配置后，应用仍使用旧配置或项目内配置

**排查步骤**：

```bash
# 1. 检查应用实际使用的配置路径
pm2 logs changdu-web --lines 50 | grep "配置文件路径"

# 应该看到：
# 📁 达人配置文件路径: /data/changdu-web/daren-config.json
# 📁 抖音号素材匹配配置文件路径: /data/changdu-web/douyin-material-config.json
# 📁 环境: 生产环境

# 2. 检查 PM2 环境变量
pm2 show changdu-web | grep -A 10 "env"

# 3. 检查 ecosystem.config.js
cat /data/changdu-web/ecosystem.config.js
```

**解决方案**：

```bash
# 1. 确保 ecosystem.config.js 包含正确的环境变量
cat > /data/changdu-web/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'changdu-web',
    cwd: '/home/web/changdu-web/current',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      DAREN_CONFIG_PATH: '/data/changdu-web/daren-config.json',
      DOUYIN_MATERIAL_CONFIG_PATH: '/data/changdu-web/douyin-material-config.json'
    }
  }]
}
EOF

# 2. 重启应用（使用 --update-env 更新环境变量）
pm2 delete changdu-web
pm2 start /data/changdu-web/ecosystem.config.js
pm2 save
```

### 6.2 权限问题

**现象**：API 调用成功，但配置文件未写入

**排查步骤**：

```bash
# 1. 检查文件权限
ls -la /data/changdu-web/

# 2. 检查应用运行用户
pm2 status | grep changdu-web

# 3. 检查目录权限
ls -ld /data/changdu-web/
```

**解决方案**：

```bash
# 假设应用以 web 用户运行
# 1. 修改所有者
chown -R web:web /data/changdu-web/

# 2. 修改权限
chmod 755 /data/changdu-web/
chmod 644 /data/changdu-web/*.json

# 或者如果应用以 root 运行
chown -R root:root /data/changdu-web/
```

### 6.3 服务启动失败

**现象**：`pm2 status` 显示 `errored` 或 `stopped`

**排查步骤**：

```bash
# 1. 查看错误日志
pm2 logs changdu-web --err --lines 50

# 2. 查看详细信息
pm2 describe changdu-web

# 3. 检查 current 软链接
ls -la /home/web/changdu-web/current

# 4. 检查 server.js 是否存在
ls -la /home/web/changdu-web/current/server.js
```

**常见问题及解决**：

```bash
# 问题1：current 软链接不存在或指向错误
ln -sfn /home/web/changdu-web/releases/$(ls -t /home/web/changdu-web/releases | head -1) \
        /home/web/changdu-web/current

# 问题2：依赖未安装
cd /home/web/changdu-web/current
pnpm install

# 问题3：端口被占用
lsof -i :3000
kill -9 <PID>

# 问题4：环境变量缺失
# 重新生成 ecosystem.config.js（参考 6.1）
```

---

## 7. 最佳实践

### 7.1 配置备份策略

**自动备份脚本**：

```bash
# 创建备份脚本
cat > /data/changdu-web/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/data/changdu-web/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
cp /data/changdu-web/daren-config.json "$BACKUP_DIR/daren-config.$DATE.json"
cp /data/changdu-web/douyin-material-config.json "$BACKUP_DIR/douyin-material-config.$DATE.json"

# 清理30天前的备份
find "$BACKUP_DIR" -name "*.json" -mtime +30 -delete

echo "备份完成: $DATE"
EOF

chmod +x /data/changdu-web/backup.sh

# 添加到 crontab（每天凌晨2点）
crontab -e
# 0 2 * * * /data/changdu-web/backup.sh >> /var/log/config-backup.log 2>&1
```

### 7.2 发版前检查清单

```bash
# 1. 备份当前配置
cp /data/changdu-web/daren-config.json /data/changdu-web/daren-config.backup.before-deploy.json
cp /data/changdu-web/douyin-material-config.json /data/changdu-web/douyin-material-config.backup.before-deploy.json

# 2. 查看当前版本
pm2 show changdu-web | grep cwd

# 3. 记录当前配置路径
pm2 logs changdu-web --lines 10 | grep "配置文件路径"

# 4. 执行发版
./deploy.sh

# 5. 验证发版后配置
pm2 logs changdu-web --lines 10 | grep "配置文件路径"

# 6. 测试配置读写
# 访问网站，测试添加/修改配置
```

### 7.3 应急恢复预案

**情况1：发版后应用无法启动**

```bash
# 1. 查看日志
pm2 logs changdu-web --err --lines 50

# 2. 回滚到上一个版本
cd /home/web/changdu-web/releases
PREV_VERSION=$(ls -t | sed -n 2p)
ln -sfn /home/web/changdu-web/releases/$PREV_VERSION /home/web/changdu-web/current
pm2 restart changdu-web

# 3. 验证
pm2 status changdu-web
```

**情况2：配置文件损坏**

```bash
# 1. 停止应用
pm2 stop changdu-web

# 2. 从备份恢复
cp /data/changdu-web/backups/20260110_020000/daren-config.json \
   /data/changdu-web/daren-config.json

# 3. 验证 JSON 格式
cat /data/changdu-web/daren-config.json | jq .

# 4. 重启应用
pm2 restart changdu-web
```

**情况3：配置丢失**

```bash
# 1. 从模板重新创建
cat > /data/changdu-web/daren-config.json << 'EOF'
{
  "darenList": []
}
EOF

cat > /data/changdu-web/douyin-material-config.json << 'EOF'
{
  "matches": []
}
EOF

# 2. 重启应用
pm2 restart changdu-web

# 3. 通过网站前端重新配置
```

---

## 8. 开发环境配置

### 8.1 本地开发

**路径选择**：

- 本地开发时，`NODE_ENV` 未设置
- 自动使用项目内路径：`server/data/*.json`
- 配置文件在 Git 仓库中（`.gitignore` 已忽略）

**本地启动**：

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器
pnpm dev

# 3. 查看日志（确认使用项目内路径）
# 输出：
# 📁 达人配置文件路径: /path/to/project/server/data/daren-config.json
# 📁 环境: 开发环境
```

### 8.2 环境变量配置

**本地测试生产环境路径**：

```bash
# 方式1：临时环境变量
NODE_ENV=production \
DAREN_CONFIG_PATH=/tmp/daren-config.json \
DOUYIN_MATERIAL_CONFIG_PATH=/tmp/douyin-material-config.json \
pnpm dev

# 方式2：.env 文件（不提交到 Git）
cat > .env.local << 'EOF'
NODE_ENV=production
DAREN_CONFIG_PATH=/tmp/daren-config.json
DOUYIN_MATERIAL_CONFIG_PATH=/tmp/douyin-material-config.json
EOF

pnpm dev
```

---

## 总结

### 配置外部化方案核心要点

1. **存储位置**：`/data/changdu-web/`（项目外，不受发版影响）
2. **环境变量**：通过 PM2 配置文件传递配置路径
3. **自动切换**：根据 `NODE_ENV` 自动选择生产/开发路径
4. **软链接发版**：代码在 `releases/`，配置在 `/data/`，互不影响
5. **自动化**：deploy.sh 脚本自动初始化配置和环境变量

### 服务启动核心流程

```bash
# 1. PM2 读取配置文件
pm2 start /data/changdu-web/ecosystem.config.js

# 2. PM2 设置环境变量
export NODE_ENV=production
export DAREN_CONFIG_PATH=/data/changdu-web/daren-config.json
export DOUYIN_MATERIAL_CONFIG_PATH=/data/changdu-web/douyin-material-config.json

# 3. 进入工作目录
cd /home/web/changdu-web/current

# 4. 启动应用
node server.js

# 5. 应用读取环境变量，加载配置
# server/routes/daren.js: 使用 process.env.DAREN_CONFIG_PATH
# server/routes/douyinMaterial.js: 使用 process.env.DOUYIN_MATERIAL_CONFIG_PATH
```

### 维护建议

- ✅ 定期备份配置文件（建议每天自动备份）
- ✅ 发版前备份配置
- ✅ 定期清理旧版本（deploy.sh 自动保留最近5个）
- ✅ 监控 PM2 应用状态
- ✅ 定期查看应用日志
- ✅ 通过前端界面管理配置，避免手动编辑文件

---

**文档维护**：

- 创建时间：2026-01-10
- 最后更新：2026-01-10
- 维护人员：开发团队
