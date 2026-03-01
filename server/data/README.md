# 数据配置目录

此目录存储配置文件**示例模板**，实际运行时的配置文件存储在**服务器的 `/data/` 目录**，与项目代码分离，确保发版时不会覆盖配置。

## 配置文件路径说明

### 生产环境（推荐）

配置文件存储在服务器的 `/data/changdu-web/` 目录：

```
/data/changdu-web/daren-config.json              # 达人配置
/data/changdu-web/douyin-material-config.json    # 抖音号素材匹配配置
/data/changdu-web/auth.json                      # 认证配置（Cookie、XT Token 等）
```

**优点**：

- ✅ 发版时不会被覆盖
- ✅ 多个项目版本可以共享同一份配置
- ✅ 配置独立于代码，便于备份和管理

### 自定义路径

可以通过环境变量指定配置文件路径：

```bash
export DAREN_CONFIG_PATH=/custom/path/daren-config.json
export DOUYIN_MATERIAL_CONFIG_PATH=/custom/path/douyin-material-config.json
export AUTH_CONFIG_PATH=/custom/path/auth.json
```

## 达人配置 (`daren-config.json`)

### 文件说明

- **用途**：存储所有达人的信息配置
- **管理方式**：通过前端"达人设置"页面进行可视化管理
- **存储位置**：`/data/daren-config.json`（生产环境）

### 首次部署

```bash
# 在服务器上执行
mkdir -p /data/changdu-web
cp /path/to/project/server/data/daren-config.json.example /data/changdu-web/daren-config.json
```

或者使用 `deploy.sh` 脚本，它会自动创建目录和配置文件。

### 数据结构

```json
{
  "darenList": [
    {
      "id": "用户ID",
      "label": "达人名称",
      "shortName": "简称",
      "douyinAccounts": ["抖音号1", "抖音号2"],
      "feishuDramaStatusTableId": "飞书剧集状态表ID（可选）",
      "feishuDramaListTableId": "飞书剧集清单表ID（可选）",
      "feishuAccountTableId": "飞书账户表ID（可选）",
      "enableDramaClipEntry": false
    }
  ]
}
```

## 认证配置 (`auth.json`)

### 文件说明

- **用途**：集中管理所有账号的认证信息（Cookie、XT Token 等敏感配置）
- **管理方式**：通过 API 接口或直接编辑配置文件
- **存储位置**：`/data/changdu-web/auth.json`（生产环境）

### 首次部署

```bash
# 在服务器上执行
mkdir -p /data/changdu-web
cp /path/to/project/server/data/auth.json.example /data/changdu-web/auth.json

# 编辑配置文件，填入真实的 Cookie 和 Token
vi /data/changdu-web/auth.json
```

### 数据结构

```json
{
  "accounts": {
    "sanrou": {
      "cookie": "散柔账号的完整 Cookie",
      "xtToken": "散柔账号的形天系统 Token",
      "distributorId": "1842865091654731"
    },
    "daily": {
      "cookie": "每日账号的完整 Cookie",
      "xtToken": "",
      "distributorId": "1844565955364887"
    },
    "daren": {
      "cookie": "达人账号的完整 Cookie",
      "xtToken": "达人账号的形天系统 Token",
      "distributorId": "1841149910426777"
    },
    "qianlong": {
      "cookie": "牵龙账号的完整 Cookie",
      "distributorId": "1841142223098969"
    }
  },
  "ocean": {
    "xinya": "欣雅账号的巨量引擎 Ocean Cookie",
    "chaoqi": "超琦账号的巨量引擎 Ocean Cookie"
  },
  "lastUpdated": "2026-01-23T00:00:00.000Z",
  "version": "1.0.0"
}
```

### API 接口

**获取认证配置**：

```
GET /api/auth/config
```

**更新所有配置**：

```
PUT /api/auth/config
Body: { accounts: { ... } }
```

**更新单个账号配置**：

```
PUT /api/auth/config/:account
account: sanrou | daily | daren | qianlong
Body: { cookie, xtToken, distributorId }
```

**更新 Ocean 配置**：

```
PUT /api/auth/config/ocean/:account
account: xinya | chaoqi
Body: { cookie: "ocean_cookie_value" }
```

示例：

```bash
# 更新欣雅账号的 Ocean Cookie
curl -X PUT http://localhost:3000/api/auth/config/ocean/xinya \
  -H "Content-Type: application/json" \
  -d '{"cookie": "your_ocean_cookie_here"}'

# 更新超琦账号的 Ocean Cookie
curl -X PUT http://localhost:3000/api/auth/config/ocean/chaoqi \
  -H "Content-Type: application/json" \
  -d '{"cookie": "your_ocean_cookie_here"}'
```

### 前端使用

前端应在进入爆剧爆剪页面时调用 API 获取最新配置：

```typescript
// 获取认证配置
const response = await fetch('/api/auth/config')
const { data } = await response.json()

// 存储到本地 store 使用
apiConfigStore.updateFromAuthConfig(data.accounts)
```

### 安全注意事项

⚠️ **重要**：

- 此文件包含敏感信息，**不要提交到代码仓库**
- 已在 `.gitignore` 中忽略
- 定期更新 Cookie（过期后需手动更新）
- 限制服务器文件访问权限：`chmod 600 /data/changdu-web/auth.json`

## 抖音号素材匹配配置 (`douyin-material-config.json`)

### 文件说明

- **用途**：存储每日主体的抖音号与素材序号匹配规则
- **管理方式**：通过前端"每日设置"页面进行可视化管理
- **存储位置**：`/data/douyin-material-config.json`（生产环境）

### 首次部署

```bash
# 在服务器上执行
mkdir -p /data/changdu-web
cp /path/to/project/server/data/douyin-material-config.json.example /data/changdu-web/douyin-material-config.json
```

或者使用 `deploy.sh` 脚本，它会自动创建。

### 数据结构

```json
{
  "matches": [
    {
      "id": "唯一标识",
      "douyinAccount": "抖音号名称",
      "douyinAccountId": "抖音号ID",
      "materialRange": "素材序号范围（如：01-04）",
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    }
  ]
}
```

## 配置管理

### 生产环境部署

使用 `deploy.sh` 脚本自动部署：

```bash
# 脚本会自动：
# 1. 创建 /data/changdu-web/ 目录
# 2. 初始化配置文件（如果不存在）
# 3. 通过环境变量传递配置路径
./deploy.sh
```

或手动部署：

```bash
# 1. 确保目录存在
sudo mkdir -p /data/changdu-web
sudo chown <app_user>:<app_group> /data/changdu-web

# 2. 从模板创建配置
cp server/data/*.json.example /data/changdu-web/

# 3. 启动应用并传递环境变量
DAREN_CONFIG_PATH=/data/changdu-web/daren-config.json \
DOUYIN_MATERIAL_CONFIG_PATH=/data/changdu-web/douyin-material-config.json \
pm2 start app
```

### 发版流程

```bash
# 使用 deploy.sh 脚本发版
./deploy.sh

# 脚本会：
# 1. 下载最新代码
# 2. 构建项目
# 3. 保持 /data/changdu-web/ 目录不变
# 4. 通过软链接切换版本
# 5. 重启应用并传递配置路径
```

### 配置备份

```bash
# 手动备份
cp /data/changdu-web/daren-config.json \
   /data/changdu-web/daren-config.backup.$(date +%Y%m%d).json
cp /data/changdu-web/douyin-material-config.json \
   /data/changdu-web/douyin-material-config.backup.$(date +%Y%m%d).json

# 定时备份（crontab）
0 2 * * * cp /data/changdu-web/*.json /data/changdu-web/backups/$(date +\%Y\%m\%d)/
```

### 故障恢复

```bash
# 从备份恢复
cp /data/changdu-web/backups/20260110/daren-config.json /data/changdu-web/

# 或使用 deploy.sh 重新部署，它会自动创建空配置
./deploy.sh
```

## 安全建议

- ✅ 定期备份 `/data/changdu-web/` 目录
- ✅ 限制目录访问权限
- ✅ 不要将生产配置提交到代码仓库
- ✅ 使用 `deploy.sh` 脚本统一管理配置
- ✅ 发版前备份配置

## 常见问题

**Q: 发版后配置会丢失吗？**

A: 不会。配置存储在 `/data/changdu-web/` 目录，与项目代码完全分离。`deploy.sh` 脚本使用软链接切换版本，不会影响配置文件。

**Q: 如何验证配置文件路径？**

A: 查看应用启动日志：

```
📁 达人配置文件路径: /data/changdu-web/daren-config.json
📁 抖音号素材匹配配置文件路径: /data/changdu-web/douyin-material-config.json
```

**Q: 为什么路径是 `/data/changdu-web/` 而不是 `/data/`？**

A: 为了支持多个项目共存，每个项目有独立的配置目录，避免冲突。
