# 爆剧坊

基于Vue 3构建的可视化爆剧坊，用于展示达人数据分析。

## 功能特性

- 📊 **数据概览**: 实时展示今日、本月、累计金额数据
- 📈 **数据报表**: 可按日期筛选的详细数据报表，支持分页
- 📋 **订单统计**: 订单详情查看，支持时间和支付状态筛选
- 👥 **多达人管理**: 支持多个达人账号切换查看
- 🔧 **智能解析**: 自动解析推广链来源信息
- ⚙️ **灵活配置**: 支持自定义设置和本地存储

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **UI组件**: Element Plus
- **样式框架**: TailwindCSS
- **HTTP客户端**: Axios
- **时间处理**: Day.js
- **图标**: Iconify
- **代码规范**: ESLint + Prettier

## 项目结构

```
src/
├── api/           # API接口层
├── components/    # 可复用组件
├── config/        # 配置文件
├── router/        # 路由配置
├── stores/        # Pinia状态管理
├── styles/        # 全局样式
├── utils/         # 工具函数
└── views/         # 页面组件
```

## 开发指南

### 环境要求

- Node.js >= 20
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建项目

```bash
pnpm build
```

### 代码检查

```bash
pnpm lint
```

### 代码格式化

```bash
pnpm format
```

## 配置说明

### 达人配置

在 `src/config/creators.ts` 中维护达人列表：

```typescript
export const CREATORS: Creator[] = [
  { name: '驴哥', distributorId: '1842666484369707' },
  { name: '小何', distributorId: '1842848339210377' },
  // ... 更多达人
]
```

### API配置

项目使用固定的API端点和请求头配置，可在设置页面中进行自定义配置。

### 本地存储

- 达人选择状态
- 用户设置偏好
- API请求头配置
- 解析的抖音号信息

## 主要功能

### 1. 数据概览

- 今日金额统计
- 本月金额统计
- 累计金额统计
- 实时数据更新

### 2. 数据报表

- 按日期范围筛选
- 新用户/全用户数据对比
- 充值金额和订单统计
- 完成率分析

### 3. 订单统计

- 订单创建/支付时间
- 支付状态筛选
- 推广链来源解析
- 智能信息提取

### 4. 推广链解析

自动解析推广链格式：`账户-固定段-剧名-达人-抖音号`

示例：`1842754778072330-CC-虎雨 8384-73-昭然赴礼-小何-安贺剧场`

解析结果：

- 账户：1842754778072330
- 剧名：昭然赴礼
- 达人：小何
- 抖音号：安贺剧场

## 生产部署

### 📦 快速部署

请查看详细的部署指南：[DEPLOYMENT.md](./DEPLOYMENT.md)

### ⚠️ 重要：配置文件持久化

为防止部署时配置文件被覆盖，**强烈推荐**使用环境变量指定外部持久化路径：

```bash
# 1. 创建持久化目录
sudo mkdir -p /data/changdu-web
sudo chown $USER:$USER /data/changdu-web

# 2. 设置环境变量
export DAREN_CONFIG_PATH="/data/changdu-web/daren-config.json"

# 3. 初始化配置
cp server/data/daren-config.json.example /data/changdu-web/daren-config.json
```

更多详情请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 注意事项

1. 本项目为内部使用工具，包含敏感的API访问配置
2. 请勿将包含真实Cookie和Token的配置提交到版本控制
3. **生产环境必须配置 `DAREN_CONFIG_PATH` 环境变量，防止配置丢失**
4. 建议在生产环境使用代理服务器处理API请求
5. 所有金额单位为"分"，前端自动转换为"元"显示

## License

Private Project - All Rights Reserved
