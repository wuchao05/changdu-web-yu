# 每日主体资产化系统需求文档

## 概述

为每日主体开发一个自动化资产化系统，集成在爆剧坊顶部。用户点击按钮后，系统自动执行资产化流程，包括创建推广链接、配置小程序、添加事件等步骤。

**注意**：本文档描述的是"资产化"流程（步骤1-5），完整的"搭建"流程（含创建项目和广告）请参考 `build-daily2.md`。

## 功能范围

- ✅ 已实现：资产化流程（获取飞书记录、上传账户头像、创建推广链接、查询小程序、创建小程序资产、添加付费事件）
- ⏸️ 搭建流程：创建项目和创建广告（详见 `build-daily2.md`）
- 📊 串行处理多部剧集
- ❌ 遇到错误中断流程，提示用户

## 用户流程

### 1. 入口

- 切换到"每日" tab
- 点击"同步账户"按钮右侧的"提交资产化"按钮

### 2. 资产化流程

**点击"提交资产化"后直接开始，无需选择日期**

系统自动执行以下步骤，每个步骤都有明确的状态提示：

#### 步骤1：获取飞书记录

- 查询**每日飞书状态表**（table_id: `tblJcLhLpEkmFkga`）
- 筛选条件：
  - 当前状态 = "待资产化"
  - 不限日期
- 获取字段：剧名、短剧ID、账户、主体、日期
- 如果没有符合条件的记录，提示"当前没有待资产化的剧集"

#### 步骤2：上传账户头像

为每个剧集对应的账户上传统一的头像图片。

##### 上传图片

- 调用巨量 API 上传头像图片
- 接口：`POST https://ad.oceanengine.com/aadv/api/account/upload_image_v2?aadvid={account_id}`
- 请求方式：`multipart/form-data`
- 请求参数：
  - `file`：图片二进制数据（从 `server/assets/cover.png` 读取）
  - `width`：300（固定）
  - `height`：300（固定）
- 返回结果：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "image_info": {
        "width": 300,
        "web_uri": "C8fj/jj/Vv1gQgSMO8gQGY...",
        "height": 300
      },
      "image_base64": ""
    }
  }
  ```

##### 保存头像

- 调用巨量 API 保存账户头像
- 接口：`POST https://ad.oceanengine.com/account/api/v2/adv/saveAvatar?accountId={account_id}&aadvid={account_id}`
- 请求参数：
  ```json
  {
    "avatarInfo": {
      "webUri": "C8fj/jj/Vv1gQgSMO8gQGY...",
      "width": 300,
      "height": 300
    }
  }
  ```
- 返回结果：
  - `code: 200`：保存成功
  - `code: 410001, message: "没有任何修改"`：头像已经是相同的，视为成功
- **注意**：系统会将 `410001` 自动转换为成功状态

#### 步骤3：创建推广链接

- 调用常读 OpenAPI 创建推广链接
- 请求参数：
  ```json
  {
    "distributor_id": 1844565955364887, // 固定
    "book_id": "7584651061982954046", // 从飞书记录获取（短剧ID）
    "index": 1, // 固定
    "promotion_name": "小红-剧名", // 需去除特殊符号（：，！？\"）
    "recharge_template_id": 1126190, // 固定
    "ad_callback_config_id": 1845407746151576, // 固定
    "media_source": 1, // 固定
    "price": 150, // 固定
    "start_chapter": 10 // 固定
  }
  ```
- **重要**：请求头需要包含签名认证
  - `header-ts`: 秒级时间戳
  - `header-sign`: MD5签名，格式为 `distributor_id + secret_key + ts + params_value`
- 返回结果：
  ```json
  {
    "code": 200,
    "promotion_url": "pages/theatre/index?code=xxx&...",
    "promotion_name": "小红-剧名"
  }
  ```

#### 步骤4：查询小程序

- 调用巨量 API 查询"我的小程序"
- 接口：`POST https://ad.oceanengine.com/event_manager/api/assets/select?aadvid={account_id}`
- 请求参数：
  ```json
  {
    "assets_type": 4,
    "micro_app": {
      "page_no": 1,
      "page_size": 5,
      "search_type": 1,
      "search_key": "",
      "order_type": 1,
      "micro_app_type": 1
    }
  }
  ```
- 判断逻辑：
  - **存在小程序**（`micro_app` 数组非空）：继续下一步
  - **不存在小程序**（`micro_app` 数组为空）：暂停流程，显示提示

#### 步骤4.5：小程序不存在提示

当小程序不存在时，弹窗显示以下信息：

1. **启动页面**：`pages/theatre/index`（从 `promotion_url` 中提取，问号前的部分）
2. **启动参数**：`code=xxx&...`（从 `promotion_url` 中提取，问号后的部分）
3. **链接备注**：`小红-剧名`（去除特殊符号）

点击以上信息可自动复制到剪贴板。

操作按钮：

- **去创建小程序**：跳转到 `https://business.oceanengine.com/site/asset/mini_app_manager/byte/create?aadvid={account_id}`
- **刷新小程序**：重新调用查询接口，检测到小程序存在后继续资产化

#### 步骤5：创建小程序资产

- **先查询**：调用 `POST https://ad.oceanengine.com/event_manager/v2/api/assets/ad/list?aadvid={account_id}` 检查是否已存在小程序资产
- 请求参数：
  ```json
  {
    "assets_types": [1, 3, 2, 7, 4, 5],
    "role": 1
  }
  ```
- 判断逻辑：
  - **已存在**：使用返回的 `data.micro_app[0].assets_id`
  - **不存在**：调用创建接口

创建接口：`POST https://ad.oceanengine.com/event_manager/api/assets/create?aadvid={account_id}`

- 请求参数：
  ```json
  {
    "assets_type": 4,
    "micro_app": {
      "assets_name": "每日剧场", // 固定
      "micro_app_id": "tt9c36ea8b0305b6c401", // 固定
      "micro_app_name": "每日剧场", // 固定
      "micro_app_type": 1, // 固定
      "micro_app_instance_id": "xxx" // 从步骤3获取
    }
  }
  ```
- 返回 `assets_id`，记录下来供后续使用

#### 步骤6：添加付费事件

- **先查询**：调用 `GET https://ad.oceanengine.com/event_manager/v2/api/event/track/status/{assets_id}?aadvid={account_id}` 检查是否已添加付费事件
- 判断逻辑：
  - 检查返回的 `data.track_status` 数组
  - **已存在**：如果存在 `event_name` 为 "付费" 的事件，跳过添加
  - **不存在**：调用创建接口

创建接口：`POST https://ad.oceanengine.com/event_manager/v2/api/event/config/create?aadvid={account_id}`

- 请求参数：
  ```json
  {
    "link_name": "其他", // 固定
    "events": [
      {
        "event_enum": "14", // 固定
        "event_type": "active_pay", // 固定
        "event_name": "付费", // 固定
        "track_types": [12], // 固定
        "statistical_method_type": 2, // 固定
        "discrimination_value": {
          "value_type": 0,
          "dimension": 0,
          "groups": []
        }
      }
    ],
    "assets_id": 1853729836611721 // 从步骤4获取
  }
  ```
- 返回事件ID

#### 步骤7：更新飞书状态

资产化成功后，自动更新飞书状态表中的记录：

- 将当前剧集的"当前状态"字段更新为"待搭建"
- 为后续搭建流程做准备

### 3. 完成提示

资产化完成后显示：

- 成功列表：显示成功资产化的剧集
- 失败列表：显示失败的剧集及错误原因

## 技术实现

### 前端组件

- `DailyBuildModal.vue`：主弹窗组件
  - 资产化流程弹窗（800px宽）
  - 步骤进度展示
  - 错误提示和处理
  - 成功/失败列表展示

### 前端API

- `src/api/dailyBuild.ts`：封装所有资产化相关的API调用
  - `uploadAvatarImage()`：上传头像图片
  - `saveAvatar()`：保存头像
  - `createPromotionLink()`：创建推广链接
  - `queryMicroApp()`：查询小程序
  - `listMicroAppAssets()`：查询小程序资产列表
  - `createMicroAppAsset()`：创建小程序资产
  - `checkEventStatus()`：查询事件状态
  - `addPaymentEvent()`：添加付费事件

- `src/api/feishu.ts`：飞书相关API
  - `getPendingBuildDramas()`：获取待资产化剧集
    - 参数：`tableId?`, `date?`, `signal?`, `useDaily?`
    - 注意：资产化时不传日期参数，获取所有"待资产化"记录
  - `updateDramaStatus()`：更新剧集状态
    - 参数：`recordId`, `status`, `tableId?`
    - 资产化成功后调用，将状态更新为"待搭建"

### 后端路由

- `server/routes/dailyBuild.js`：后端API实现
  - `/api/daily-build/upload-avatar-image`：上传头像图片
  - `/api/daily-build/save-avatar`：保存头像
  - `/api/daily-build/create-promotion`：创建推广链接（含签名认证）
  - `/api/daily-build/query-microapp`：查询小程序
  - `/api/daily-build/list-assets`：查询小程序资产
  - `/api/daily-build/create-asset`：创建小程序资产
  - `/api/daily-build/check-event`：查询事件状态
  - `/api/daily-build/add-event`：添加付费事件

- `server/routes/feishu.js`：飞书相关API
  - `GET /feishu/bitable/drama-status/:recordId/status`：更新剧集状态
    - 参数：`recordId`, `status`, `tableId?`
    - 用于资产化成功后更新状态

### 配置文件

- `server/config/dailyBuild.js`：存储所有固定参数
  - 常读配置：distributorId、baseUrl、模板ID等
  - 巨量配置：microAppId、microAppName
  - 推广链接固定参数
  - 事件固定参数

- `server/config/changdu.js`：签名认证相关
  - 每日渠道的 `distributor_id` 和 `secret_key`

- `server/config/feishu.js`：飞书配置
  - `daily_table_ids.drama_status`: "tblJcLhLpEkmFkga"（每日状态表）

### 工具函数

- `src/utils/dailyBuild.ts`：
  - `parsePromotionUrl()`：解析推广链接URL
  - `copyToClipboard()`：复制到剪贴板

- `server/utils/changduSign.js`：
  - `buildChangduPostHeaders()`：生成POST请求的签名头部
  - `buildChangduSign()`：生成签名
  - `getChangduTimestamp()`：获取秒级时间戳

- `src/stores/douyinMaterial.ts`：
  - 抖音号匹配素材配置的 Pinia store
  - 数据结构：
    ```typescript
    interface DouyinMaterialMatch {
      id: string
      douyinAccount: string // 抖音号名称
      douyinAccountId: string // 抖音号ID
      materialRange: string // 素材序号范围，如 "01-04"
      createdAt: string
      updatedAt: string
    }
    ```

### 数据存储

- **飞书表格**：
  - 每日剧集状态表（`tblJcLhLpEkmFkga`）
    - 字段：剧名、短剧ID、账户、主体、日期、当前状态
    - 状态流转：待资产化 → 待搭建 → 待下载
  - 每日账户表（`tblrlxmzydVtPcbW`）
  - 每日剧集清单表（`tblYEW4YqqSmnsB5`）

- **本地存储**：
  - `douyin_material_matches`：抖音号匹配素材配置
  - 通过 Pinia store 管理，存储在 localStorage

## 特殊处理

### 1. 头像上传处理

图片读取和上传：

```javascript
// 后端读取图片
const imageBuffer = fs.readFileSync(path.join(__dirname, '../assets/cover.png'))

// 使用 FormData 上传
const formData = new FormData()
formData.append('file', imageBuffer, {
  filename: 'cover.png',
  contentType: 'image/png',
})
formData.append('width', '300')
formData.append('height', '300')
```

保存头像错误码处理：

```javascript
// 410001 表示"没有任何修改"，视为成功
if (result.code === 200 || result.code === 410001) {
  // 成功
} else {
  // 失败
}
```

### 2. 剧名处理

去除特殊符号（：，！？\"）：

```typescript
function cleanDramaName(name: string): string {
  return name.replace(/[：，！?\"']/g, '').trim()
}
```

### 2. 剧名处理

去除特殊符号（：，！？\"）：

```typescript
function cleanDramaName(name: string): string {
  return name.replace(/[：，！?\"']/g, '').trim()
}
```

### 3. 短剧ID获取

飞书数据结构：

```typescript
drama.fields['短剧ID']?.value?.[0]?.text
```

### 4. 推广链接解析

从 `promotion_url` 中提取：

```typescript
function parsePromotionUrl(url: string): {
  launchPage: string // "pages/theatre/index"
  launchParams: string // "code=xxx&..."
}
```

### 5. 签名认证

生成请求头：

```typescript
const timestamp = Math.floor(Date.now() / 1000)
const paramsValue = JSON.stringify(requestBody)
const sign = md5(`${distributorId}${secretKey}${timestamp}${paramsValue}`)

headers: {
  'header-ts': String(timestamp),
  'header-sign': sign
}
```

### 6. 避免重复创建

- **查询小程序资产**：创建前先查询，已存在则复用
- **查询事件状态**：添加前先查询，已存在则跳过

### 7. 状态管理

- **资产化前**：状态为"待资产化"
- **资产化后**：自动更新状态为"待搭建"
- **搭建后**：状态为"待下载"（详见 build-daily2.md）

## 错误处理

### 错误类型

1. **当前没有待资产化的剧集**：步骤1失败
2. **剧集信息不完整**：缺少必要字段
3. **上传头像失败**：图片上传或保存失败
4. **创建推广链接失败**：API调用失败
5. **小程序不存在**：需要用户手动创建
6. **API调用失败**：网络或接口错误
7. **更新飞书状态失败**：记录错误但不影响资产化流程

### 错误展示

- 步骤进度条：出错步骤显示红色失败图标
- 错误提示：显示详细错误信息和出错步骤
- 完成状态：成功/失败列表

### 错误处理策略

- 遇到错误立即中断当前剧集的资产化
- 记录错误到失败列表
- 不继续处理剩余剧集（串行处理）
- 更新飞书状态失败不影响资产化成功判定

## UI设计

### 按钮布局

```
[同步账户] [提交资产化] [提交搭建] [新增商品]
```

- **提交资产化**：点击后直接开始，无日期选择
- **提交搭建**：需要选择日期（详见 build-daily2.md）

### 资产化流程弹窗

- 宽度：800px
- 标题："每日剧场-资产化"
- 步骤进度条：6个步骤，实时状态
- 当前处理信息：显示第几部剧集、剧名
- 错误提示：红色Alert组件
- 完成状态：成功/失败列表

### 小程序不存在提示

- 黄色Alert组件
- 可复制的三行信息（启动页面、启动参数、链接备注）
- 两个按钮："去创建小程序"、"刷新小程序"

### 完成状态展示

```
资产化完成
成功：2 部剧集
失败：1 部剧集

✅ 成功列表
  玄门泰斗开局竟被当凡夫
  暗香

❌ 失败列表
  迟来的爱比草贱 - 查询小程序失败（步骤3）
```

## 配置说明

### 巨量Cookie

- 存储位置：`server/config/jiliang.js`
- 用途：所有巨量API调用的身份认证
- 更新方式：手动更新配置文件

### 常读签名密钥

- 存储位置：`server/config/changdu.js`
- 每日渠道：
  - `distributor_id`: 1844565955364887
  - `secret_key`: H53iZltmBXDndYt5ONW2h6tgCUxbG7kX

### 账户头像图片

- 存储位置：`server/assets/cover.png`
- 用途：为每个剧集对应的账户上传统一头像
- 图片要求：
  - 格式：PNG
  - 尺寸：300x300（固定）
- 更新方式：直接替换 `server/assets/cover.png` 文件

### 抖音号配置

- 配置位置：每日tab → 设置页面 → 抖音号匹配素材
- 配置内容：
  - 抖音号名称（如：小红看剧）
  - 抖音号ID（如：25655660267）
  - 素材序号范围（如：01-04）
- 用途：搭建流程中根据配置创建批次的广告（详见 build-daily2.md）

## 测试要点

### 功能测试

- ✅ 点击提交资产化直接开始（无日期选择）
- ✅ 获取待资产化剧集（不限日期）
- ✅ 上传账户头像（含图片上传和保存）
- ✅ 处理头像保存返回410001（视为成功）
- ✅ 推广链接创建（含签名）
- ✅ 小程序查询和不存在处理
- ✅ 小程序资产创建和复用
- ✅ 付费事件添加和跳过
- ✅ 资产化成功后更新飞书状态为"待搭建"
- ✅ 多剧集串行处理
- ✅ 错误处理和中断

### 边界测试

- 无待资产化剧集
- 剧集信息不完整
- 网络错误
- API返回错误
- 小程序不存在后的刷新恢复
- 更新飞书状态失败

### UI测试

- 弹窗切换动画
- 步骤状态显示
- 错误信息展示
- 复制功能
- 响应式布局
- 成功/失败列表展示

## 已知问题与限制

1. **串行处理**：当前采用串行处理方式，一部剧集失败会中断后续剧集
2. **无重试机制**：失败后需要手动重新开始
3. **状态同步**：依赖飞书状态表，需要确保状态正确更新

## 后续扩展

- [ ] 创建项目和创建广告（详见 build-daily2.md）
- [ ] 批量处理：支持多剧集并行资产化
- [ ] 重试机制：失败剧集支持单独重试
- [ ] 日志记录：详细的资产化日志便于排查问题
- [ ] 支持自定义日期范围资产化
- [ ] 资产化进度实时推送
- [ ] 资产化历史记录查询
