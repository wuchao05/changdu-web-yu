# 每日搭建功能需求文档

## 一、需求概述

### 1.1 功能调整

#### 提交资产化功能简化

- **原流程**：点击提交资产化按钮 → 弹出日期选择框 → 根据日期拉取飞书表格中"待资产化"状态的数据
- **新流程**：点击提交资产化按钮 → 直接拉取飞书表格中所有"待资产化"状态的数据（不使用日期过滤）

#### 新增提交搭建功能

- **位置**：在提交资产化按钮右侧新增"提交搭建"按钮
- **交互流程**：
  1. 点击"提交搭建"按钮
  2. 弹出日期选择弹窗（复用原资产化的日期选择弹窗，标题改为"提交搭建"）
  3. 用户选择指定日期
  4. 根据选择的日期拉取飞书表格中"待搭建"状态的数据
  5. 提取数据中的**剧名**和**账户**字段
  6. 进入自动搭建流程

---

## 二、搭建流程总览

### 2.1 流程概述

搭建流程分为三个阶段：

1. **初始化阶段**（仅需执行一次）
   - 获取小程序资产
   - 获取小程序列表
   - 获取小程序资产详情
   - 上传主图

2. **创建项目（Project）**（每个抖音号执行一次）
3. **创建广告（Promotion）**（每个抖音号执行一次）

### 2.2 批次规则

- 每个抖音号对应一个项目和一个广告
- 一个抖音号 = 一个搭建批次
- 根据"每日配置"中的**抖音号与素材序号匹配规则**确定需要创建的批次数量

### 2.3 数据复用策略

**重要**：以下数据在初始化阶段获取后，整个搭建过程中所有批次共享复用：

| 数据名称                | 获取阶段 | 复用范围  | 说明                               |
| ----------------------- | -------- | --------- | ---------------------------------- |
| `assets_id`             | 初始化   | 所有批次  | 小程序资产ID，创建项目时使用       |
| `micro_app_instance_id` | 初始化   | 所有批次  | 小程序实例ID，创建项目和广告时使用 |
| `app_id`                | 初始化   | 所有批次  | 小程序应用ID，创建广告时使用       |
| `start_page`            | 初始化   | ���有批次 | 小程序启动页面，创建广告时使用     |
| `app_type`              | 初始化   | 所有批次  | 小程序类型，创建广告时使用         |
| `start_params`          | 初始化   | 所有批次  | 启动参数，创建广告时使用           |
| `link`                  | 初始化   | 所有批次  | 小程序完整链接，创建广告时使用     |
| `product_image_width`   | 初始化   | 所有批次  | 主图宽度，创建广告时使用           |
| `product_image_height`  | 初始化   | 所有批次  | 主图高度，创建广告时使用           |
| `product_image_uri`     | 初始化   | 所有批次  | 主图URI（web_uri），创建广告时使用 |
|                         |          |           |                                    |

**优势**：

- 减少重复API调用，提升搭建效率
- 降低接口请求频率，避免触发限流
- 确保所有批次使用相同的小程序配置，保证数据一致性

### 2.4 通用配置

| 配置项       | 说明                                         |
| ------------ | -------------------------------------------- |
| **aadvid**   | 当前操作的账户ID                             |
| **Cookie**   | 使用项目中已配置的每日主体的巨量后台 Cookie  |
| **固定字段** | 除特别标注外，接口传参中的其他字段均为固定值 |

---

## 三、初始化阶段（仅需执行一次）

### 3.1 阶段说明

在开始任何批次搭建之前，先执行初始化阶段，获取所有批次共享的小程序相关数据和主图。

**执行时机**：拉取到待搭建剧集数据后，在第一个抖音号批次开始前执行一次。

**执行顺序**：

1. 获取小程序资产 → 得到 `assets_id` 和 `micro_app_instance_id`
2. **【优化】查询被共享的已审核通过的小程序** → 如果找到，直接使用其 `micro_app_instance_id`，跳过创建小程序步骤
3. 获取小程序列表 → 验证小程序存在（如果步骤2未找到，则执行此步骤）
4. 获取小程序资产详情 → 得到 `app_id`、`start_page`、`app_type`、`start_params`、`link`
5. 上传主图 → 得到 `product_image_width`、`product_image_height`、`product_image_uri`

### 3.2 步骤一：获取小程序资产

#### 接口说明

获取指定账户下的小程序资产信息。

#### 请求示例

```bash
curl --location --request POST 'https://ad.oceanengine.com/event_manager/v2/api/assets/ad/list?aadvid=1852189014760457' \
--header 'platform: ad' \
--header 'Cookie: ' \
--data-raw '{
    "assets_types": [
        1,
        3,
        2,
        7,
        4,
        5
    ],
    "role": 1
}'
```

#### 返回示例

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "android_app": [],
    "ios_app": [],
    "harmony_app": [],
    "landing_page": [],
    "micro_app": [
      {
        "advertiser_id": "1852189014760457",
        "assets_id": 1852409191020635,
        "micro_app_id": "tt9c36ea8b0305b6c401",
        "micro_app_name": "每日剧场",
        "micro_app_type": "1",
        "modify_time": "2025-12-25 00:51:09",
        "create_time": "2025-12-25 00:51:09",
        "micro_app_instance_id": "7587458105462571071",
        "revenue_model_type": 0,
        "revenue_model_point_type": 0,
        "account_asset_role": 1
      }
    ],
    "offline_collect": [],
    "quick_app": [],
    "tetris": [],
    "site": []
  }
}
```

#### 关键数据提取

| 字段                    | 说明         | 后续用途       |
| ----------------------- | ------------ | -------------- |
| `assets_id`             | 资产ID       | 创建项目时使用 |
| `micro_app_instance_id` | 小程序实例ID | 创建项目时使用 |

---

### 3.3 步骤二（优化）：查询被共享的已审核通过的小程序

#### 接口说明

**优化目的**：优先查询账户下被共享的已审核通过的小程序，如果找到则直接使用其 `instance_id`，跳过创建小程序的步骤，节省等待审核的时间。

#### 请求示例

```bash
curl --location --request GET 'https://business.oceanengine.com/app_package/microapp/applet/list?page_no=1&page_size=10&search_key=&search_type=2&status=-1&adv_id=1852189014760457&cc_id=1849832732821859&operator=1849832732821859&operation_type=1' \
--header 'x-tt-hume-platform: bp' \
--header 'Cookie: '
```

#### 关键参数说明

| 参数          | 值     | 说明                                         |
| ------------- | ------ | -------------------------------------------- |
| `search_type` | `2`    | **关键参数**：查询被共享的已审核通过的小程序 |
| `status`      | `-1`   | 查询所有状态                                 |
| `adv_id`      | -      | 当前账户ID                                   |
| `cc_id`       | 固定值 | 财务中心ID                                   |
| `operator`    | 固定值 | 操作者ID                                     |

#### 返回示例

```json
{
  "status": 0,
  "message": "",
  "data": {
    "total_count": 1,
    "applets": [
      {
        "operator": 1855114210570435,
        "operation_type": 2,
        "instance_id": "7599207448003788838",
        "app_id": "tt9c36ea8b0305b6c401",
        "name": "每日剧场",
        "category": 2,
        "status": 1,
        "reason": "",
        "unite_flag": false,
        "icon": "https://p3-app-package-sign.byteimg.com/...",
        "remark": "",
        "brandName": "每日剧场",
        "brandId": "1172753",
        "is_ebp_asset": false
      }
    ]
  }
}
```

#### 处理逻辑

1. **查询成功且找到 `status=1` 的小程序**：
   - 直接使用该小程序的 `instance_id` 作为 `micro_app_instance_id`
   - **跳过**后续的"获取小程序列表"和"创建小程序"步骤
   - 继续执行"获取小程序资产详情"步骤

2. **未找到被共享的已审核通过的小程序**：
   - 继续执行原有的"获取小程序列表"步骤
   - 如果小程序不存在，则创建小程序并等待审核

#### 优化效果

| 场景                             | 原流程                          | 优化后流程                 |
| -------------------------------- | ------------------------------- | -------------------------- |
| 账户有被共享的已审核通过的小程序 | 查询 → 创建 → 等待30秒 → 再查询 | 直接使用，**节省30秒以上** |
| 账户无被共享的小程序             | 查询 → 创建 → 等待30秒 → 再查询 | 走原有流程（无变化）       |

---

### 3.4 步骤三：获取小程序列表（兜底）

#### 接口说明

获取指定账户下的小程序列表，验证小程序是否存在。

#### 请求示例

```bash
curl --location --request POST 'https://ad.oceanengine.com/event_manager/api/assets/select?aadvid=1851104211491912' \
--header 'platform: ad' \
--header 'Cookie: ' \
--data-raw '{
    "assets_type": 4,
    "micro_app": {
        "page_no": 1,
        "page_size": 5,
        "search_type": 1,
        "search_key": "",
        "order_type": 1,
        "micro_app_type": 1
    }
}'
```

#### 返回示例

```json
{
  "code": 0,
  "data": {
    "assets_type": 4,
    "micro_app": [
      {
        "micro_app_instance_id": "7592960597470281766",
        "micro_app_id": "tt9c36ea8b0305b6c401",
        "micro_app_name": "每日剧场",
        "micro_app_type": 1,
        "micro_app_icon": "https://p26-app-package-sign.byteimg.com/ad-app-package/2c26ec4a9d0097da04885462e204ba4d.jpg~tplv-4icaid6hyb-image.jpeg?lk3s=ae9512e2&x-expires=1767880636&x-signature=Q%2FGHTAemAAksiRxI1yZvZw4wfcM%3D",
        "is_selected": true
      }
    ],
    "total": 1
  },
  "message": "成功"
}
```

#### 关键数据提取

| 字段                    | 说明         | 后续用途                |
| ----------------------- | ------------ | ----------------------- |
| `micro_app_instance_id` | 小程序实例ID | 与步骤3.1返回值保持一致 |

**说明**：此步骤作为兜底逻辑，仅在步骤二（优化）未找到被共享的已审核通过的小程序时执行。主要用于验证小程序是否存在，如果不存在则需要创建小程序。

### 3.5 步骤四：获取小程序资产详情

#### 接口说明

根据小程序实例ID获取详细的小程序资产信息。

#### 请求示例

```bash
curl --location --request GET 'https://ad.oceanengine.com/superior/api/v2/ad/applet/link?aadvid=1850383276874820&micro_app_instance_id=7592960597470281766&page=1&page_size=20&search_key=&order_type=4&app_status=1' \
--header 'Cookie: '
```

#### 动态参数说明

| 字段                    | 说明         | 来源               |
| ----------------------- | ------------ | ------------------ |
| `micro_app_instance_id` | 小程序实例ID | 从步骤3.2或3.3获取 |

#### 返回示例

```json
{
  "code": 0,
  "data": {
    "pagination": {
      "total_count": 1
    },
    "list": [
      {
        "instance_id": "7592960597470281766",
        "adv_id": "1851104211491912",
        "clue_account_id": "1851104213995531",
        "create_time": "1767874750",
        "modify_time": "1767874750",
        "app_type": 2,
        "audit_status": 1,
        "site_id": "7592944268478578715",
        "link_id": "3472509958",
        "account_id": "1851104211491912",
        "account_type": 2,
        "is_ebp_asset": false,
        "app_id": "tt9c36ea8b0305b6c401",
        "start_page": "pages/theatre/index",
        "remark": "迟来的爱比草贱",
        "link": "sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D__ADVERTISER_ID__%26aid%3D40011566%26click_id%3D__CLICKID__%26code%3DPI93LGOXZZ7%26item_source%3D1%26media_source%3D1%26mid1%3D__MID1__%26mid2%3D__MID2__%26mid3%3D__MID3__%26mid4%3D__MID4__%26mid5%3D__MID5__%26request_id%3D__REQUESTID__%26tt_album_id%3D7592866881359315492%26tt_episode_id%3D7592866903737385514&uniq_id=W2026010820190924898833546&version=v2&version_type=current&bdpsum=cfbbbbb",
        "icon": "https://p3-app-package-sign.byteimg.com/ad-app-package/2c26ec4a9d0097da04885462e204ba4d.jpg~tplv-4icaid6hyb-image.jpeg?lk3s=ae9512e2&x-expires=1767958065&x-signature=KgulYaglQOhQJOmX1ORAwseihaU%3D",
        "thumbnail": "",
        "start_params": "mid2=__MID2__&mid4=__MID4__&item_source=1&media_source=1&mid1=__MID1__&mid5=__MID5__&request_id=__REQUESTID__&tt_album_id=7592866881359315492&mid3=__MID3__&advertiser_id=__ADVERTISER_ID__&aid=40011566&code=PI93LGOXZZ7&tt_episode_id=7592866903737385514&click_id=__CLICKID__"
      }
    ]
  },
  "extra": {},
  "msg": "",
  "request_id": "202601091827459DF1C7D430E99A639DBC",
  "env": {
    "ppe": false
  }
}
```

#### 关键数据提取

| 字段           | 说明               | 后续用途       |
| -------------- | ------------------ | -------------- |
| `app_id`       | 小程序应用ID       | 创建广告时使用 |
| `start_page`   | 小程序启动页面路径 | 创建广告时使用 |
| `app_type`     | 小程序类型         | 创建广告时使用 |
| `start_params` | 启动参数           | 创建广告时使用 |
| `link`         | 小程序完整链接     | 创建广告时使用 |

**重要**：此步骤获取的数据将在所有抖音号批次创建广告时复用。

---

### 3.6 步骤五：上传主图

#### 接口说明

为账户上传主图素材，用于创建广告时的商品信息展示。主图在账户维度，所有抖音号批次共用。（主图的上传可以参考资产化时上传头像，跟头像上传是用的同一张图片）

#### 请求示例

```bash
curl --location --request POST 'https://ad.oceanengine.com/superior/api/v2/creative/material/picture/upload?aadvid={account_id}' \
--header 'Cookie: {巨量后台Cookie}' \
--form 'fileData=@"/path/to/cover.png"'
```

#### 动态参数说明

| 字段       | 说明     | 来源                     |
| ---------- | -------- | ------------------------ |
| `aadvid`   | 账户ID   | 当前操作的账户ID         |
| `fileData` | 图片文件 | 本地主图文件路径（固定） |

#### 返回示例

```json
{
  "code": 0,
  "msg": "",
  "data": {
    "width": 108,
    "height": 108,
    "size": 9426,
    "web_uri": "tos-cn-i-sd07hgqsbj/e054858e3a6b450c874fd5693a419207",
    "sign_url": "https://p0-adplatform-private.oceanengine.com/tos-cn-i-sd07hgqsbj/e054858e3a6b450c874fd5693a419207~tplv-iq460dd072-origin.image?...",
    "material_id": "7593657840747560966"
  },
  "request_id": "20260110182205CD9BDAC13DE5B070CAEE",
  "env": {
    "ppe": false
  },
  "extra": {}
}
```

#### 关键数据提取

| 字段      | 说明     | 后续用途                            |
| --------- | -------- | ----------------------------------- |
| `width`   | 图片宽度 | 创建广告时product_images的width     |
| `height`  | 图片高度 | 创建广告时product_images的height    |
| `web_uri` | 图片URI  | 创建广告时product_images的image_uri |

**重要**：此步骤上传的主图数据将在所有抖音号批次创建广告时复用，无需重复上传。

#### 主图文件说明

- **文件路径**：固定为项目中的 `/path/to/cover.png`（实际部署时配置具体路径）
- **文件要求**：建议尺寸 108x108 像素，大小不超过 100KB
- **文件格式**：支持 PNG、JPG 等常见图片格式

## 四、创建项目（Project）(每个抖音号执行一次)

### 4.1 步骤说明

使用初始化阶段获取的小程序资产数据，为每个抖音号创建独立的项目。

### 4.2 步骤一：创建项目

#### 接口说明

为指定账户和剧集创建广告项目。

#### 请求示例

```bash
curl --location --request POST 'https://ad.oceanengine.com/superior/api/v2/project/create?aadvid=1850383276874820' \
--header 'Cookie: ' \
--data-raw '{
  "track_url_group_info": {},
  "track_url": [],
  "action_track_url": [],
  "first_frame": [],
  "last_frame": [],
  "effective_frame": [],
  "track_url_send_type": "2",
  "smart_bid_type": 7,
  "is_search_speed_phase_four": false,
  "budget": 300,
  "inventory_catalog": 5,
  "flow_control_mode": 0,
  "delivery_mode": 3,
  "delivery_package": 0,
  "landing_type": 16,
  "delivery_related_num": 1,
  "name": "玄门泰斗开局竟被当凡夫-小鱼-萍通剧坊",
  "schedule_type": 1,
  "week_schedule_type": 0,
  "pricing_type": 9,
  "product_platform_id": "1969743078737707",
  "product_id": "1764165838361148283",
  "district": "all",
  "gender": "0",
  "age": [
    [
      "0",
      "17"
    ]
  ],
  "retargeting_tags": [],
  "platform": [
    "0"
  ],
  "hide_if_converted": "1",
  "cdp_marketing_goal": 1,
  "asset_ids": [
    "1851981749250121"
  ],
  "external_action": "14",
  "budget_mode": 0,
  "campaign_type": 1,
  "micro_promotion_type": 4,
  "asset_name": "",
  "smart_inventory": 3,
  "auto_ad_type": 1,
  "micro_app_instance_id": "7550501886361731122",
  "products": [],
  "aigc_dynamic_creative_switch": 0,
  "is_search_3_online": true
}'
```

#### 动态参数说明

| 字段                    | 值规则                                     | 示例                    | 来源                            |
| ----------------------- | ------------------------------------------ | ----------------------- | ------------------------------- |
| `name`                  | `{剧名}-小鱼-{抖音号}`                     | `暗香-小鱼-萍通剧坊`    | 飞书表格剧名 + 当前批次抖音号   |
| `asset_ids`             | 从初始化阶段获取的 `assets_id`             | `["1851981749250121"]`  | 初始化阶段步骤3.2（仅获取一次） |
| `micro_app_instance_id` | 从初始化阶段获取的 `micro_app_instance_id` | `"7550501886361731122"` | 初始化阶段步骤3.2（仅获取一次） |
| `product_platform_id`   | 固定值（待后续修改）                       | `"4382498222065454"`    | 配置文件                        |
| `product_id`            | 固定值（待后续修改）                       | `"1767786539332903207"` | 配置文件                        |

#### 返回示例

```json
{
  "code": 0,
  "data": {
    "id": "7592808131504832575",
    "keywordsError": []
  },
  "extra": {},
  "msg": "",
  "request_id": "20260108101329D881CDAF547754C6360F",
  "env": {
    "ppe": false
  }
}
```

#### 关键数据提取

| 字段 | 说明   | 后续用途       |
| ---- | ------ | -------------- |
| `id` | 项目ID | 创建广告时使用 |

---

## 五、创建广告（Promotion）（每个抖音号执行一次）

### 5.1 前置数据准备

创建广告前需要准备以下数据：

1. **抖音号原始ID（ies_core_id）** - 每个批次单独获取
2. **小程序信息** - 从初始化阶段获取（所有批次共享）
3. **素材数据** - 每个批次单独筛选

**说明**：小程序信息（app_id、start_page、app_type、start_params、link）已在初始化阶段获取，无需重复请求。

---

### 5.2 步骤一：获取抖音号原始ID

#### 接口说明

根据抖音号ID查询抖音号的原始ID（ies_core_id）。

#### 请求示例

```bash
curl --location --request POST 'https://ad.oceanengine.com/superior/api/v2/ad/authorize/list?aadvid=1850383309288522' \
--header 'Cookie: ' \
--data-raw '{
    "page_index": 1,
    "page_size": 100,
    "uniq_id_or_short_id": "25655660267",
    "need_limits_info": true,
    "need_limit_scenes": [
        4
    ],
    "level": [
        1,
        4,
        5,
        7
    ],
    "need_auth_extra_info": true,
    "dpa_id": ""
}'
```

#### 动态参数说明

| 字段                  | 说明     | 来源                           |
| --------------------- | -------- | ------------------------------ |
| `uniq_id_or_short_id` | 抖音号ID | 从每日配置中当前批次的抖音号ID |

#### 返回示例

```json
{
  "code": 0,
  "data": [
    {
      "ies_user_name": "小鱼看剧",
      "ban_push_item": false,
      "ies_avatar_url": "https://p3.douyinpic.com/aweme/100x100/aweme-avatar/tos-cn-avt-0015_38d8268669cbc45985dee8c0b8125b36.jpeg?from=3782654143",
      "ies_core_id": "1418801121595483",
      "ies_id": "25655660267",
      "auth_level": 5,
      "ies_bind_limits": [],
      "ies_avatar_uri": "100x100/aweme-avatar/tos-cn-avt-0015_38d8268669cbc45985dee8c0b8125b36",
      "aweme_user_type": 3,
      "is_business_account": true
    }
  ],
  "extra": {
    "total": "1"
  },
  "msg": "",
  "request_id": "202601091817001844411321A360A424EE",
  "env": {
    "ppe": false
  }
}
```

#### 关键数据提取与校验

| 字段            | 说明         | 校验规则                     |
| --------------- | ------------ | ---------------------------- |
| `ies_user_name` | 抖音号名称   | 需与当前批次的抖音号名称匹配 |
| `ies_core_id`   | 抖音号原始ID | 创建广告时使用               |

---

### 5.3 步骤二：获取并筛选素材列表

#### 接口说明

根据抖音号ID和原始ID查询素材列表，并按规则筛选出当前批次需要的素材。

#### 请求示例

```bash
curl --location -g --request GET 'https://ad.oceanengine.com/superior/api/v2/video/list?aadvid=1850383276874820&image_mode=5,15&sort_type=desc&metric_names=create_time,stat_cost,ctr&aweme_id=64838437844&aweme_account=3461675205264087&auth_level\[\]=5&landing_type=16&external_action=14&page=1&limit=100&version=v2&operation_platform=1' \
--header 'Cookie: '
```

#### 动态参数说明

| 字段            | 说明         | 来源                           |
| --------------- | ------------ | ------------------------------ |
| `aweme_id`      | 抖音号ID     | 从每日配置中当前批次的抖音号ID |
| `aweme_account` | 抖音号原始ID | 从步骤5.2获取的 `ies_core_id`  |

#### 返回示例

```json
{
  "code": 0,
  "msg": "",
  "data": {
    "videos": [
      {
        "material_id": "7592274032157671474",
        "video_url": "refid:v02033g10000d5eiqd7og65q5d8qdk3g",
        "video_name": "1.6-玄门泰斗开局竟被当凡夫-xh-01.mp4",
        "video_poster_uri": "tos-cn-p-0051/oIXbEbsQQgQ0LkrqRW9h6eynKXZ67BAQ4ApmFQ",
        "video_poster": "https://p3-adplatform.byteadimg.com/obj/tos-cn-p-0051/oIXbEbsQQgQ0LkrqRW9h6eynKXZ67BAQ4ApmFQ",
        "sign_url": "https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/oIXbEbsQQgQ0LkrqRW9h6eynKXZ67BAQ4ApmFQ~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTE0NTA1NjQ3MjA3MjY4MSJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1767997925&x-orig-sign=9nesBdq4mmChAsiUIYpDoWAv8%2Bo%3D",
        "cover_uri": "tos-cn-p-0051/oIXbEbsQQgQ0LkrqRW9h6eynKXZ67BAQ4ApmFQ",
        "video_filmLength": "704",
        "video_id": "v02033g10000d5eiqd7og65q5d8qdk3g",
        "business": 8,
        "template_id": "",
        "third_party": false,
        "create_time": "2026-01-06T23:42:48+08:00",
        "image_mode": 15,
        "tags": [],
        "organization_tags": [],
        "advertiser_tags": [],
        "video_info": {
          "height": 1920,
          "width": 1080,
          "bitrate": 6471330,
          "thumb_height": 1920,
          "thumb_width": 1080,
          "duration": 704,
          "status": 10,
          "initial_size": 569733567,
          "file_md5": "e86b10c07d1ad41c9886dc565800c174"
        },
        "image_info": {
          "width": 1080,
          "height": 1920,
          "web_uri": "tos-cn-p-0051/oIXbEbsQQgQ0LkrqRW9h6eynKXZ67BAQ4ApmFQ"
        },
        "related_creative_count": 0,
        "metrics_result": {
          "ctr": "0.79",
          "stat_cost": "89.20"
        },
        "audit_result": {},
        "pre_audit_result": [],
        "is_low_quality": false,
        "similar_material_status": 0,
        "material_properties": {
          "is_first_publish": false,
          "is_low_quality": false,
          "ad_hq_status": 0,
          "similar_material_status": 0,
          "ad_pq_status": 0,
          "new_similar_material": 0,
          "promotion_audit_reject": 0
        },
        "is_carry_material": false
      }
    ],
    "has_more": false,
    "pagination": {
      "total_count": 82,
      "limit": 1,
      "page": 1,
      "total_page": 82
    }
  },
  "request_id": "20260109183205D1412EB862BB196EC3C5",
  "env": {
    "ppe": false
  },
  "extra": {}
}
```

#### 素材筛选规则

根据每日配置中的**抖音号与素材序号匹配规则**筛选素材：

**规则说明：**

1. 从配置中获取当前抖音号对应的素材序号范围（如 `01-04`）
2. 解析素材文件名 `video_name`，格式为：`{日期}-{剧名}-{用户标识}-{序号}.mp4`
   - 示例：`1.6-玄门泰斗开局竟被当凡夫-xh-01.mp4`
3. 校验规则：
   - 剧名必须与当前搭建的剧名匹配
   - 序号必须在配置的范围内（如 `01`、`02`、`03`、`04`）
   - 日期可忽略校验

**筛选示例：**

- **当前抖音号**：萍通剧坊
- **序号规则**：`01-04`
- **当前剧名**：玄门泰斗开局竟被当凡夫
- **需筛选的素材**：
  - `1.6-玄门泰斗开局竟被当凡夫-xh-01.mp4`
  - `1.6-玄门泰斗开局竟被当凡夫-xh-02.mp4`
  - `1.6-玄门泰斗开局竟被当凡夫-xh-03.mp4`
  - `1.6-玄门泰斗开局竟被当凡夫-xh-04.mp4`

#### 关键数据提取

筛选后的每个素材需保留以下字段，用于创建广告：

| 字段         | 说明         | 用途           |
| ------------ | ------------ | -------------- |
| `video_id`   | 视频ID       | 创建广告时使用 |
| `cover_uri`  | 封面URI      | 创建广告时使用 |
| `sign_url`   | 签名URL      | 创建广告时使用 |
| `video_info` | 视频详细信息 | 创建广告时使用 |
| `image_info` | 图片详细信息 | 创建广告时使用 |

---

### 5.4 步骤三：创建广告

#### 接口说明

为指定项目创建广告计划。

#### 请求示例

```bash
curl --location --request POST 'https://ad.oceanengine.com/superior/api/v2/promotion/create_promotion?aadvid=1850383276874820' \
--header 'Cookie: ' \
--data-raw '{
  "promotion_data": {
    "client_settings": {
      "is_comment_disable": "0"
    },
    "native_info": {
      "is_feed_and_fav_see": 2,
      "anchor_related_type": 0,
      "ies_core_user_id": "61917543278"
    },
    "enable_personal_action": true,
    "micro_app_info": {
      "app_id": "ttb76bc1d6285b4e4201",
      "start_path": "pages/theater/index",
      "micro_app_type": 2,
      "params": "advertiser_id=__ADVERTISER_ID__&aid=40012555&click_id=__CLICKID__&code=PI5FBA16OUI&item_source=1&media_source=1&mid1=__MID1__&mid2=__MID2__&mid3=__MID3__&mid4=__MID4__&mid5=__MID5__&request_id=__REQUESTID__&tt_album_id=7550180334857126400&tt_episode_id=7550180357955797540",
      "url": "sslocal://microapp?app_id=ttb76bc1d6285b4e4201&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheater%2Findex%3Fadvertiser_id%3D__ADVERTISER_ID__%26aid%3D40012555%26click_id%3D__CLICKID__%26code%3DPI5FBA16OUI%26item_source%3D1%26media_source%3D1%26mid1%3D__MID1__%26mid2%3D__MID2__%26mid3%3D__MID3__%26mid4%3D__MID4__%26mid5%3D__MID5__%26request_id%3D__REQUESTID__%26tt_album_id%3D7550180334857126400%26tt_episode_id%3D7550180357955797540&uniq_id=W20250916101302151w90o5ayh&version=v2&version_type=current&bdpsum=d385efe"
    },
    "source": "合肥山宥麦网络"
  },
  "material_group": {
    "playable_material_info": [],
    "video_material_info": [
      {
        "image_info": [
          {
            "width": 1080,
            "height": 1920,
            "web_uri": "tos-cn-p-0051/oArA2AspHG4Fm6QYYqwCeldgKshF10IBL1ItZd",
            "sign_url": "https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/oArA2AspHG4Fm6QYYqwCeldgKshF10IBL1ItZd~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTE0NTA1NjQ3MjA3MjY4MSJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1767841489&x-orig-sign=8ymHph1RDSIsjzAsKl4pgUr044I%3D"
          }
        ],
        "video_info": {
          "height": 1920,
          "width": 1080,
          "bitrate": 6459524,
          "thumb_height": 1920,
          "thumb_width": 1080,
          "duration": 681,
          "status": 10,
          "initial_size": 550123015,
          "file_md5": "aaa722ca032e1725b0749a7685081ba0",
          "video_id": "v02033g10000d5eiptnog65jtopjhbqg",
          "cover_uri": "tos-cn-p-0051/oArA2AspHG4Fm6QYYqwCeldgKshF10IBL1ItZd",
          "vid": "v02033g10000d5eiptnog65jtopjhbqg"
        },
        "is_ebp_share": false,
        "image_mode": 15,
        "f_f_see_setting": 1,
        "cover_type": 1
      }
    ],
    "image_material_info": [],
    "aweme_photo_material_info": [],
    "external_material_info": [
      {
        "external_url": "https://www.chengzijianzhan.com/tetris/page/7552876685726089254/"
      }
    ],
    "component_material_info": [],
    "call_to_action_material_info": [
      {
        "call_to_action": "精彩继续",
        "suggestion_usage_type": 0
      }
    ],
    "product_info": {
      "product_name": {
        "name": "热播短剧"
      },
      "product_images": [
        {
          "image_uri": "{product_image_uri}",  // 从初始化阶段步骤3.6获取
          "width": 108,  // 从初始化阶段步骤3.6获取
          "height": 108  // 从初始化阶段步骤3.6获取
        }
      ],
      "product_selling_points": [
        {
          "selling_point": "爆款短剧推荐",
          "suggestion_usage_type": 0
        }
      ]
    },
    "title_material_info": [
      {
        "title": "#短剧推荐#玄门泰斗开局竟被当凡夫",
        "word_list": [],
        "bidword_list": [],
        "dpa_word_list": [],
        "is_dynamic": 0,
        "suggestion_usage_type": 0,
        "request_id": "0"
      }
    ]
  },
  "name": "玄门泰斗开局竟被当凡夫-小鱼-萍通剧坊",
  "project_id": "7592808131504832575",
  "check_hash": "1767838716225",
  "is_auto_delivery_mode": false
}'
```

#### 动态参数映射表

##### promotion_data 部分

| 字段路径                                       | 值规则         | 数据来源                               |
| ---------------------------------------------- | -------------- | -------------------------------------- |
| `promotion_data.native_info.ies_core_user_id`  | 抖音号原始ID   | 步骤5.2获取的 `ies_core_id`            |
| `promotion_data.micro_app_info.app_id`         | 小程序应用ID   | 初始化阶段步骤3.5获取的 `app_id`       |
| `promotion_data.micro_app_info.start_path`     | 小程序启动路径 | 初始化阶段步骤3.5获取的 `start_page`   |
| `promotion_data.micro_app_info.micro_app_type` | 小程序类型     | 初始化阶段步骤3.5获取的 `app_type`     |
| `promotion_data.micro_app_info.params`         | 启动参数       | 初始化阶段步骤3.5获取的 `start_params` |
| `promotion_data.micro_app_info.url`            | 小程序完整链接 | 初始化阶段步骤3.5获取的 `link`         |

**重要说明**：小程序信息相关参数（app_id、start_page、app_type、start_params、link）来自初始化阶段，所有批次共享使用，无需重复请求。

##### material_group 部分

| 字段路径                                                     | 值规则               | 数据来源                         |
| ------------------------------------------------------------ | -------------------- | -------------------------------- |
| `material_group.video_material_info[].image_info`            | 图片信息数组         | 步骤5.3筛选的素材的 `image_info` |
| `material_group.video_material_info[].image_info[].sign_url` | 封面签名URL          | 步骤5.3筛选的素材的 `sign_url`   |
| `material_group.video_material_info[].video_info`            | 视频信息对象         | 步骤5.3筛选的素材的 `video_info` |
| `material_group.video_material_info[].video_info.video_id`   | 视频ID               | 步骤5.3筛选的素材的 `video_id`   |
| `material_group.video_material_info[].video_info.cover_uri`  | 封面URI              | 步骤5.3筛选的素材的 `cover_uri`  |
| `material_group.video_material_info[].video_info.vid`        | 视频ID（同video_id） | 步骤5.3筛选的素材的 `video_id`   |
| `material_group.title_material_info[].title`                 | 广告标题             | #短剧推荐#当前剧名               |

##### 其他参数

| 字段         | 值规则                 | 数据来源                  |
| ------------ | ---------------------- | ------------------------- |
| `name`       | `{剧名}-小鱼-{抖音号}` | 飞书表格剧名 + 配置抖音号 |
| `project_id` | 项目ID                 | 步骤4.2创建的项目ID       |

#### 固定参数

以下字段为固定值，直接使用即可：

```json
{
  "promotion_data": {
    "client_settings": {
      "is_comment_disable": "0"
    },
    "native_info": {
      "is_feed_and_fav_see": 2,
      "anchor_related_type": 0
    },
    "enable_personal_action": true,
    "source": "合肥山宥麦网络"
  },
  "material_group": {
    "playable_material_info": [],
    "image_material_info": [],
    "aweme_photo_material_info": [],
    "external_material_info": [
      {
        "external_url": "https://www.chengzijianzhan.com/tetris/page/7552876685726089254/"
      }
    ],
    "component_material_info": [],
    "call_to_action_material_info": [
      {
        "call_to_action": "精彩继续",
        "suggestion_usage_type": 0
      }
    ],
    "product_info": {
      "product_name": {
        "name": "热播短剧"
      },
      "product_images": [
        {
          "image_uri": "{product_image_uri}", // 从初始化阶段步骤3.6获取
          "width": 108, // 从初始化阶段步骤3.6获取
          "height": 108 // 从初始化阶段步骤3.6获取
        }
      ],
      "product_selling_points": [
        {
          "selling_point": "爆款短剧推荐",
          "suggestion_usage_type": 0
        }
      ]
    },
    "video_material_info": [
      {
        "is_ebp_share": false,
        "image_mode": 15,
        "f_f_see_setting": 1,
        "cover_type": 1
      }
    ]
  },
  "check_hash": "1767838716225", // 当前时间戳
  "is_auto_delivery_mode": false
}
```

**注意**：

- `product_info.product_images` 字段中的 `image_uri`、`width`、`height` 来自初始化阶段步骤3.6（上传主图）的返回结果。
- 主图在账户维度，所有抖音号批次共用同一张主图，无需重复上传。

#### 返回示例

```json
{
  "code": 0,
  "data": {
    "promotion_id": "7592809559666147364",
    "keywordsError": []
  },
  "extra": {},
  "msg": "",
  "request_id": "20260108101901D1E6792CF62F3B8EB321",
  "env": {
    "ppe": false
  }
}
```

#### 关键数据提取

| 字段           | 说明       | 用途             |
| -------------- | ---------- | ---------------- |
| `promotion_id` | 广告计划ID | 标识广告创建成功 |

---

## 五、批次循环与完成标志

### 5.1 单批次完成标志

当广告创建接口返回 `code: 0` 时，表示当前批次（抖音号）搭建成功。

### 5.2 多批次循环

1. 遍历每日配置中的所有抖音号
2. 对每个抖音号执行完整的创建项目和创建广告流程
3. 所有抖音号搭建完成后，当前剧集搭建任务完成

### 5.3 多剧集搭建策略

**重要原则：单个剧集失败不影响后续剧集搭建**

1. **容错机制**：
   - 某部剧在搭建过程中任何步骤失败，不中断整体流程
   - 记录该剧的失败状态和详细错误信息
   - 继续执行下一部剧的搭建任务

2. **错误信息记录要求**：
   - **剧名**：标识失败的剧集
   - **失败步骤**：具体在哪个接口或步骤失败（如"获取小程序资产"、"创建项目"、"素材筛选"等）
   - **错误代码**：接口返回的 `code`
   - **错误信息**：接口返回的 `msg` 或自定义错误描述
   - **请求ID**：接口返回的 `request_id`（如有）
   - **时间戳**：失败发生的时间

3. **搭建流程控制**：
   ```
   遍历所有待搭建剧集:
     try {
       执行当前剧集的完整搭建流程（创建项目 + 创建广告）
       记录成功状态
     } catch (error) {
       记录失败状态和详细错误信息
       继续下一部剧（不中断）
     }
   所有剧集处理完成后，展示结果弹框
   ```

### 5.4 异常处理建议

- 记录每个批次的成功/失败状态
- 失败时记录详细的错误信息（接口返回的 `msg` 和 `code`）
- 提供重试机制，允许对失败的批次单独重试

---

## 六、搭建结果展示

### 6.1 搭建进度弹框需求

**核心交互流程：**

1. 用户选择日期后，点击"确定"按钮
2. **立即弹出**搭建进度弹窗
3. 弹窗中以表格形式**实时展示**每部剧的搭建状态
4. 所有剧集搭建完成后，弹窗保持打开，用户可查看最终结果

### 6.2 弹框设计要求

#### 6.2.1 基本信息

- **弹框标题**：搭建进度（{已完成}/{总数}）
- **统计信息**（实时更新）：
  - 总计剧集数量
  - 进行中数量
  - 成功数量
  - 失败数量

#### 6.2.2 表格列设计

表格应包含以下列：

| 列名   | 说明                       | 宽度建议 |
| ------ | -------------------------- | -------- |
| 序号   | 剧集序号（1, 2, 3...）     | 60px     |
| 剧名   | 剧集名称                   | 自适应   |
| 账户   | 账户ID或名称（可选）       | 150px    |
| 批次数 | 抖音号批次数（成功后显示） | 100px    |
| 状态   | 搭建状态（带图标和文字）   | 150px    |

#### 6.2.3 状态展示规则

##### 等待中状态

- **图标**：灰色圆点或 `-`
- **文字**：等待中
- **颜色**：灰色 `#999999`

##### 进行中状态

- **图标**：蓝色加载动画（旋转圆圈）
- **文字**：搭建中...
- **颜色**：蓝色 `#1890ff`

##### 成功状态

- **图标**：绿色 ✓ 图标
- **文字**：搭建成功
- **颜色**：绿色 `#52c41a`

##### 失败状态（重点）

- **图标**：红色感叹号 ⚠ 或 ❗
- **文字**：搭建失败
- **颜色**：红色 `#ff4d4f`
- **交互**：鼠标悬停在感叹号或"搭建失败"文字上时，显示 Tooltip 展示详细失败原因

**失败 Tooltip 内容格式：**

```
失败步骤：获取小程序资产
失败原因：账户下未找到小程序资产，请检查账户配置
错误代码：40001
```

### 6.3 数据结构设计

#### 6.3.1 单个剧集记录数据结构

```typescript
interface BuildDramaRecord {
  id: string // 记录ID（唯一标识）
  index: number // 序号（在列表中的位置）
  dramaName: string // 剧名
  accountId: string // 账户ID
  accountName?: string // 账户名称（可选）
  status: 'pending' | 'running' | 'success' | 'failed' // 状态
  batchCount?: number // 批次数量（成功后填充）
  projectIds?: string[] // 创建的项目ID列表（成功后填充）
  promotionIds?: string[] // 创建的广告ID列表（成功后填充）
  failedStep?: string // 失败步骤（失败时填充）
  errorCode?: string | number // 错误代码（失败时填充）
  errorMessage?: string // 错误信息（失败时填充）
  requestId?: string // 请求ID（失败时填充，用于排查）
  startedAt?: string // 开始时间（ISO格式）
  completedAt?: string // 完成时间（ISO格式）
}
```

**状态说明：**

- `pending`：等待中（初始状态）
- `running`：搭建中（正在执行）
- `success`：搭建成功
- `failed`：搭建失败

#### 6.3.2 搭建任务总览数据结构

```typescript
interface BuildTaskProgress {
  taskId: string // 任务ID
  startTime: string // 任务开始时间
  endTime?: string // 任务结束时间（完成后填充）
  totalCount: number // 总计剧集数
  pendingCount: number // 等待中数量
  runningCount: number // 进行中数量
  successCount: number // 成功数量
  failureCount: number // 失败数量
  records: BuildDramaRecord[] // 剧集记录列表
}
```

#### 6.3.3 数据示例

**初始状态（刚打开弹窗）：**

```json
{
  "taskId": "task_20260109_183000",
  "startTime": "2026-01-09T18:20:00+08:00",
  "totalCount": 3,
  "pendingCount": 3,
  "runningCount": 0,
  "successCount": 0,
  "failureCount": 0,
  "records": [
    {
      "id": "record_001",
      "index": 1,
      "dramaName": "玄门泰斗开局竟被当凡夫",
      "accountId": "1850383276874820",
      "status": "pending"
    },
    {
      "id": "record_002",
      "index": 2,
      "dramaName": "暗香",
      "accountId": "1850383276874820",
      "status": "pending"
    },
    {
      "id": "record_003",
      "index": 3,
      "dramaName": "迟来的爱比草贱",
      "accountId": "1850383276874820",
      "status": "pending"
    }
  ]
}
```

**搭建中状态（第1部剧正在搭建）：**

```json
{
  "taskId": "task_20260109_183000",
  "startTime": "2026-01-09T18:20:00+08:00",
  "totalCount": 3,
  "pendingCount": 2,
  "runningCount": 1,
  "successCount": 0,
  "failureCount": 0,
  "records": [
    {
      "id": "record_001",
      "index": 1,
      "dramaName": "玄门泰斗开局竟被当凡夫",
      "accountId": "1850383276874820",
      "status": "running",
      "startedAt": "2026-01-09T18:20:01+08:00"
    },
    {
      "id": "record_002",
      "index": 2,
      "dramaName": "暗香",
      "accountId": "1850383276874820",
      "status": "pending"
    },
    {
      "id": "record_003",
      "index": 3,
      "dramaName": "迟来的爱比草贱",
      "accountId": "1850383276874820",
      "status": "pending"
    }
  ]
}
```

**完成状态（有成功有失败）：**

```json
{
  "taskId": "task_20260109_183000",
  "startTime": "2026-01-09T18:20:00+08:00",
  "endTime": "2026-01-09T18:25:45+08:00",
  "totalCount": 3,
  "pendingCount": 0,
  "runningCount": 0,
  "successCount": 2,
  "failureCount": 1,
  "records": [
    {
      "id": "record_001",
      "index": 1,
      "dramaName": "玄门泰斗开局竟被当凡夫",
      "accountId": "1850383276874820",
      "status": "success",
      "batchCount": 3,
      "projectIds": ["7592808131504832575", "7592808131504832576", "7592808131504832577"],
      "promotionIds": ["7592809559666147364", "7592809559666147365", "7592809559666147366"],
      "startedAt": "2026-01-09T18:20:01+08:00",
      "completedAt": "2026-01-09T18:22:30+08:00"
    },
    {
      "id": "record_002",
      "index": 2,
      "dramaName": "暗香",
      "accountId": "1850383276874820",
      "status": "failed",
      "failedStep": "获取小程序资产",
      "errorCode": 40001,
      "errorMessage": "账户下未找到小程序资产，请检查账户配置",
      "requestId": "20260109183205D1412EB862BB196EC3C5",
      "startedAt": "2026-01-09T18:22:31+08:00",
      "completedAt": "2026-01-09T18:23:15+08:00"
    },
    {
      "id": "record_003",
      "index": 3,
      "dramaName": "迟来的爱比草贱",
      "accountId": "1850383276874820",
      "status": "success",
      "batchCount": 3,
      "projectIds": ["7592808131504832578", "7592808131504832579", "7592808131504832580"],
      "promotionIds": ["7592809559666147367", "7592809559666147368", "7592809559666147369"],
      "startedAt": "2026-01-09T18:23:16+08:00",
      "completedAt": "2026-01-09T18:25:45+08:00"
    }
  ]
}
```

### 6.4 UI交互要求

#### 6.4.1 弹框基本设置

- **尺寸**：宽度 800-900px，高度自适应（最大高度 70vh，超出显示滚动条）
- **关闭控制**：
  - 搭建进行中时，右上角关闭按钮置灰不可点击（或提示"搭建进行中，请稍候"）
  - 所有剧集搭建完成后，关闭按钮变为可点击状态
  - 点击弹框外部不关闭弹窗

#### 6.4.2 表格展示

- **表格组件**：使用 Naive UI 的 `n-data-table` 组件
- **单行高度**：建议 48-56px
- **表头固定**：表头固定在顶部，内容可滚动
- **斑马纹**：可选，建议使用淡色斑马纹增强可读性

#### 6.4.3 状态图标与动效

- **等待中**：灰色圆点 `○`
- **进行中**：蓝色旋转加载图标（使用 `n-spin` 或 `Icon` 组件）
- **成功**：绿色对勾图标 `✓`（Icon: `mdi:check-circle`）
- **失败**：红色感叹号图标 `⚠`（Icon: `mdi:alert-circle`）

#### 6.4.4 失败原因 Tooltip

- **触发方式**：鼠标悬停在失败图标或"搭建失败"文字上
- **组件**：使用 Naive UI 的 `n-tooltip` 组件
- **显示延迟**：100ms
- **内容格式**：
  ```
  失败步骤：获取小程序资产
  错误代码：40001
  失败原因：账户下未找到小程序资产，请检查账户配置
  ```
- **样式**：
  - 背景色：深灰 `#303030`
  - 文字颜色：白色
  - 最大宽度：400px
  - 内容可换行

#### 6.4.5 统计信息实时更新

在表格上方显示统计信息，实时更新：

```
搭建进度：2/5 | 成功：1 | 失败：1 | 进行中：1 | 等待中：2
```

- 使用不同颜色标识：
  - 成功：绿色 `#52c41a`
  - 失败：红色 `#ff4d4f`
  - 进行中：蓝色 `#1890ff`
  - 等待中：灰色 `#999999`

#### 6.4.6 操作按钮

在弹框底部显示操作按钮：

- **搭建进行中**：
  - 只显示一个"后台运行"按钮（可选，点击关闭弹窗但不中断搭建）
- **搭建完成后**：
  - "关闭"按钮（主要按钮）
  - "导出日志"按钮（次要按钮，可选）
  - "重试失败项"按钮（如果有失败记录，次要按钮，可选）

#### 6.4.7 视觉反馈

- **成功行**：无特殊背景，图标绿色
- **失败行**：淡红色背景 `#fff1f0` 或 红色左侧边框（3px）
- **进行中行**：淡蓝色背景 `#e6f7ff` 或 蓝色左侧边框（3px）
- **等待中行**：默认背景，无特殊样式

### 6.5 实时更新机制

#### 6.5.1 状态更新时机

| 时机           | 需更新的字段                                                                                   | 说明                                         |
| -------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 开始搭建某部剧 | `status` → `running`<br>`startedAt`                                                            | 状态改为"进行中"，记录开始时间               |
| 搭建成功       | `status` → `success`<br>`batchCount`, `projectIds`, `promotionIds`<br>`completedAt`            | 状态改为"成功"，填充批次数和ID，记录完成时间 |
| 搭建失败       | `status` → `failed`<br>`failedStep`, `errorCode`, `errorMessage`, `requestId`<br>`completedAt` | 状态改为"失败"，记录错误详情，记录完成时间   |

#### 6.5.2 统计数据更新

每次单个剧集状态变化时，需同步更新任务总览中的统计数据：

- `pendingCount`
- `runningCount`
- `successCount`
- `failureCount`

### 6.6 错误信息记录规范

在以下每个步骤中都需要捕获错误并记录详细信息：

| 步骤                      | 失败步骤标识             | 需记录的关键信息                              |
| ------------------------- | ------------------------ | --------------------------------------------- | --- | --------------- | ---------- | --------------------------- |
| 获取小程序资产（3.2）     | `获取小程序资产`         | `code`, `message`, `request_id`               |
| 获取小程序列表（3.3）     | `获取小程序列表`         | `code`, `message`, `request_id`               |
| 获取小程序资产详情（3.4） | `获取小程序资产详情`     | `code`, `msg`, `request_id`                   |
| 上传主图（3.5）           | `上传主图`               | `code`, `msg`, `request_id`                   |     | 创建项目（4.2） | `创建项目` | `code`, `msg`, `request_id` |
| 获取抖音号原始ID（5.2）   | `获取抖音号信息`         | `code`, `msg`, `request_id`, 抖音号ID         |
| 获取并筛选素材（5.3）     | `获取素材` 或 `素材筛选` | `code`, `msg`, `request_id`, 筛选到的素材数量 |
| 创建广告（5.4）           | `创建广告`               | `code`, `msg`, `request_id`                   |

#### 6.6.1 自定义错误消息规范

除了接口返回的错误信息外，以下场景需提供更友好的自定义错误消息：

| 场景             | 错误代码                | 错误消息示例                                            |
| ---------------- | ----------------------- | ------------------------------------------------------- |
| 素材数量不足     | `MATERIAL_INSUFFICIENT` | 素材数量不足：需要4个素材，实际只找到2个（序号：01-04） |
| 抖音号名称不匹配 | `DOUYIN_NAME_MISMATCH`  | 抖音号名称不匹配：期望"萍通剧坊"，实际"萍通剧场"        |
| 未找到小程序资产 | `MINI_APP_NOT_FOUND`    | 账户下未找到小程序资产，请检查账户配置                  |
| 网络请求超时     | `REQUEST_TIMEOUT`       | 请求超时，请检查网络连接后重试                          |

---

## 七、开发注意事项

### 7.1 数据校验

1. **抖音号校验**：确保 `ies_user_name` 与配置中的抖音号名称一致
2. **剧名校验**：素材筛选时确保 `video_name` 中的剧名与当前剧集匹配
3. **素材数量校验**：确保筛选出的素材数量符合配置规则（如 `01-04` 应有4个素材）

### 7.2 接口依赖关系

```
初始化阶段（仅执行一次，所有批次共享）
  ├── 步骤3.2：获取小程序资产 → assets_id, micro_app_instance_id
  ├── 步骤3.3【优化】：查询被共享的已审核通过的小程序 → 如果找到，直接使用 micro_app_instance_id
  ├── 步骤3.4：获取小程序列表 → 验证小程序存在（兜底）
  ├── 步骤3.5：获取小程序资产详情 → app_id, start_page, app_type, start_params, link
  └── 步骤3.6：上传主图 → product_image_width, product_image_height, product_image_uri

创建项目（每个抖音号执行一次）
  └── 步骤4.2：创建项目 → project_id
      └── 依赖：初始化阶段的 assets_id, micro_app_instance_id

创建广告（每个抖音号执行一次）
  ├── 步骤5.2：获取抖音号原始ID → ies_core_id（当前批次）
  ├── 步骤5.3：获取并筛选素材 → video_id, cover_uri, sign_url, video_info, image_info（当前批次）
  └── 步骤5.4：创建广告
      └── 依赖：
          ├── 初始化阶段的 app_id, start_page, app_type, start_params, link（共享，步骤3.5）
          ├── 初始化阶段的 product_image_width, product_image_height, product_image_uri（共享，步骤3.6）
          ├── 步骤4.2的 project_id（当前批次）
          ├── 步骤5.2的 ies_core_id（当前批次）
          └── 步骤5.3的素材数据（当前批次）
```

**关键优化点**：2. 主图仅在初始化阶段上传一次，所有批次共享（账户维度）2. 每个批次只需获取抖音号相关信息和素材数据4. 大幅减少重复API调用，提升效率3. 大幅减少重复API调用，提升效率

### 7.3 错误处理

- 所有接口调用需判断返回的 `code` 是否为 `0`
- 非0时需记录 `msg` 和 `request_id` 用于排查
- 关键步骤失败时应终止当前剧集的搭建，记录失败信息，继续下一部剧
- 每个剧集的搭建流程需要使用 try-catch 包裹，确保单个剧集失败不影响整体流程

### 7.4 待后续修改的固定参数

以下参数当前为固定值，后续可能需要支持配置化：

| 参数                  | 当前固定值                                                           | 位置         |
| --------------------- | -------------------------------------------------------------------- | ------------ |
| `product_platform_id` | `"1969743078737707"`                                                 | 创建项目接口 |
| `product_id`          | `"1764165838361148283"`                                              | 创建项目接口 |
| `external_url`        | `"https://www.chengzijianzhan.com/tetris/page/7552876685726089254/"` | 创建广告接口 |
| `source`              | `"合肥山宥麦网络"`                                                   | 创建广告接口 |

---

## 八、附录

### 8.1 素材文件名解析规则

**格式**：`{日期}-{剧名}-{用户标识}-{序号}.mp4`

**示例**：`1.6-玄门泰斗开局竟被当凡夫-xh-01.mp4`

**解析结果**：

- 日期：`1.6`
- 剧名：`玄门泰斗开局竟被当凡夫`
- 用户标识：`xh`
- 序号：`01`

### 8.2 抖音号与素材序号匹配规则示例

| 抖音号   | 素材序号范围 | 需筛选素材数量 |
| -------- | ------------ | -------------- |
| 萍通剧坊 | `01-04`      | 4个            |
| 小鱼看剧 | `05-08`      | 4个            |
| 斯娜看剧 | `09-12`      | 4个            |

（具体配置以实际"每日配置"为准）

---

## 九、版本历史

| 版本 | 日期       | 修改内容                           | 修改人 |
| ---- | ---------- | ---------------------------------- | ------ |
| v1.0 | 2026-01-09 | 初始版本，优化文档结构和语义       | -      |
| v1.1 | 2026-01-09 | 新增错误容错机制和搭建结果展示需求 | -      |

``

sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log={"launch_from":"ad"}&scene=0&start_page=pages/theatre/index?advertiser_id=**ADVERTISER_ID**&aid=40011566&app_id=tt9c36ea8b0305b6c401&click_id=**CLICKID**&code=PI962N9SQ4J&item_source=1&media_source=1&mid1=**MID1**&mid2=**MID2**&mid3=**MID3**&mid4=**MID4**&mid5=**MID5**&request_id=**REQUESTID**&tt_album_id=7591807692327354916&tt_episode_id=7591807714712912426&version=v2&version_type=current&bdpsum=d19ae55

sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D**ADVERTISER_ID**%26aid%3D40011566%26click_id%3D**CLICKID**%26code%3DPI962DXJJ5F%26item_source%3D1%26media_source%3D1%26mid1%3D**MID1**%26mid2%3D**MID2**%26mid3%3D**MID3**%26mid4%3D**MID4**%26mid5%3D**MID5**%26request_id%3D**REQUESTID**%26tt_album_id%3D7592499445968437786%26tt_episode_id%3D7592499468470354451&version=v2&version_type=current

sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D**ADVERTISER_ID**%26aid%3D40011566%26click_id%3D**CLICKID**%26code%3DPI962DXJJ5F%26item_source%3D1%26media_source%3D1%26mid1%3D**MID1**%26mid2%3D**MID2**%26mid3%3D**MID3**%26mid4%3D**MID4**%26mid5%3D**MID5**%26request_id%3D**REQUESTID**%26tt_album_id%3D7592499445968437786%26tt_episode_id%3D7592499468470354451&uniq_id=W202601102336105202kkau08c&version=v2&version_type=current&bdpsum=3c05d79

sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D**ADVERTISER_ID**%26aid%3D40011566%26click_id%3D**CLICKID**%26code%3DPI96NCW0ZMG%26item_source%3D1%26media_source%3D1%26mid1%3D**MID1**%26mid2%3D**MID2**%26mid3%3D**MID3**%26mid4%3D**MID4**%26mid5%3D**MID5**%26request_id%3D**REQUESTID**%26tt_album_id%3D7592905448143979027%26tt_episode_id%3D7592905470463754779&uniq_id=W202601111149179385gebf8js&version=v2&version_type=current&bdpsum=8a99de0

uniq_id 的规则为：W + 当前时间(yyyyMMddHHmmss)+3 位数字+8 位[0-9a-z]随机串，比如“W20260111114427273cp0vp10s”

bdpsum 的规则为：7 位数[0-9a-z]随机串，比如“8a99de0”

```bash
curl --location --request POST 'https://business.oceanengine.com/app_package/microapp/applet/create?cc_id=1849832732821859&operator=1849832732821859&operation_type=1' \
--header 'Cookie: ' \
--header 'content-type: application/json' \
--data-raw '{"instance_id":"","adv_id":"1852645552513225","app_id":"tt9c36ea8b0305b6c401","remark":"","schema_info":[{"path":"pages/theatre/index","query":"code=PI96NCW0ZMG&aid=40011566&item_source=1&media_source=1&tt_album_id=7592905448143979027&tt_episode_id=7592905470463754779&app_id=tt9c36ea8b0305b6c401&click_id=__CLICKID__&request_id=__REQUESTID__&mid1=__MID1__&mid2=__MID2__&mid3=__MID3__&mid4=__MID4__&mid5=__MID5__&advertiser_id=__ADVERTISER_ID__","remark":"小鱼-女神且慢看我露一手","link":"sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D__ADVERTISER_ID__%26aid%3D40011566%26click_id%3D__CLICKID__%26code%3DPI96NCW0ZMG%26item_source%3D1%26media_source%3D1%26mid1%3D__MID1__%26mid2%3D__MID2__%26mid3%3D__MID3__%26mid4%3D__MID4__%26mid5%3D__MID5__%26request_id%3D__REQUESTID__%26tt_album_id%3D7592905448143979027%26tt_episode_id%3D7592905470463754779&uniq_id=W20260111114427273cp0vp10s&version=v2&version_type=current&bdpsum=c1294e6","operate_type":"1"}],"data":{"tag_info":"{\"category_id\":1050000000,\"category_name\":\"小程序\",\"categories\":[{\"category_id\":1050100000,\"category_name\":\"短剧\",\"categories\":[{\"category_id\":1050107001,\"category_name\":\"其他\"}]}]}"}}'
```

```bash
sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D__ADVERTISER_ID__%26aid%3D40011566%26click_id%3D__CLICKID__%26code%3DPI96NCW0ZMG%26item_source%3D1%26media_source%3D1%26mid1%3D__MID1__%26mid2%3D__MID2__%26mid3%3D__MID3__%26mid4%3D__MID4__%26mid5%3D__MID5__%26request_id%3D__REQUESTID__%26tt_album_id%3D7592905448143979027%26tt_episode_id%3D7592905470463754779&uniq_id=W20260111144432811pqwoytke&version=v2&version_type=current&bdpsum=0d7866d
```

sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D**ADVERTISER_ID**%26aid%3D40011566%26click_id%3D**CLICKID**%26code%3DPI96SI7V9IC%26item_source%3D1%26media_source%3D1%26mid1%3D**MID1**%26mid2%3D**MID2**%26mid3%3D**MID3**%26mid4%3D**MID4**%26mid5%3D**MID5**%26request_id%3D**REQUESTID**%26tt_album_id%3D7593322894701920768%26tt_episode_id%3D7593322917347836442&uniq_id=W20260111143938155a6f7hqwb&version=v2&version_type=current&bdpsum=lv759i1

curl --location --request POST 'https://business.oceanengine.com/app_package/microapp/applet/create?operator=1852645552513225&operation_type=1' \ --header 'x-tt-hume-platform: bp' \ --header 'Cookie: is_hit_partitioned_cookie_canary_ss=true; is_hit_partitioned_cookie_canary_ss=true; is_hit_partitioned_cookie_canary=true; is_hit_partitioned_cookie_canary=true; **security_mc_61_s_sdk_crypt_sdk=112ba4a9-495a-8531; bd_ticket_guard_client_web_domain=2; d_ticket=f56e7348e0fb7fb786f55ce43103e08750a38; passport_auth_status=9248afad2c71c5b5b443e1b22b9bc5e7%2C; passport_auth_status_ss=9248afad2c71c5b5b443e1b22b9bc5e7%2C; n_mh=Is1iB8GYEmIolPCbsKTNDXu5N6moq6Yvf_T7fcRre8M; **security_mc_61_s_sdk_cert_key=1631726f-470c-81d3; is_staff_user=false; passport_csrf_token=a88ef95073c4fe172abbed01da9d89e3; passport_csrf_token_default=a88ef95073c4fe172abbed01da9d89e3; ttwid=1%7Cp1XQ6Fu2Tyc-xDaoIsFT0S3dc5sG5lZs3k9OuCjH3iQ%7C1768016768%7Cb26e9c007370d7d507744205cbe4817385accd4ed144f42206bbdb4422ff6b41; \_bd_ticket_crypt_doamin=3; \_bd_ticket_crypt_cookie=138df4d25a6b320cbf8beffc89a95e1e; **security_mc_61_s_sdk_sign_data_key_web_protect=7feb43d3-4f0f-9344; **security_server_data_status=1; bd_ticket_guard_client_data=eyJiZC10aWNrZXQtZ3VhcmQtdmVyc2lvbiI6MiwiYmQtdGlja2V0LWd1YXJkLWl0ZXJhdGlvbi12ZXJzaW9uIjoxLCJiZC10aWNrZXQtZ3VhcmQtcmVlLXB1YmxpYy1rZXkiOiJCRklLQXlGcFN0V2tWU1daeEthTjh5NWxoVnM4OThXdDdVdVd5cklkd1BCZEphRkpMTXl1Mm5YbmRHOGJWUHJGWnBxYXRLanFkemdLRk9LMWJYTHIyYVE9IiwiYmQtdGlja2V0LWd1YXJkLXdlYi12ZXJzaW9uIjoyfQ%3D%3D; s_v_web_id=verify_mk7rjqti_41578b08_422b_b29f_6195_ea9942509403; passport_mfa_token=CjGErwgmOYIOuT0ArfOnIUCWkyfmAvi86smIic70%2BQle6EuN%2FQhP6rEkJJvoZuQi4foUGkoKPAAAAAAAAAAAAABP7oh5AsbPZ1EGn1Ggi3lTZBuY694kO0FKnmkwCdmjU0guFeZ4%2F2gNI4ZgBpqizITaEhCawIYOGPax0WwgAiIBAx4UuOU%3D; sso_uid_tt=08aef28a88955d0fcb3aaa8d4b374051; sso_uid_tt_ss=08aef28a88955d0fcb3aaa8d4b374051; toutiao_sso_user=d1a5292d837e6dea4181c0799b04ec6c; toutiao_sso_user_ss=d1a5292d837e6dea4181c0799b04ec6c; sid_ucp_sso_v1=1.0.0-KDRlYWI2MTUwNjllMmM5ZTIwYjI2ZDg4ZWY0N2UzNmRiY2YzMzcyNGQKIQj8p8Cul8ylAhCcl4fLBhj6CiAMMMy73bAGOAFA6wdIBhoCbGYiIGQxYTUyOTJkODM3ZTZkZWE0MTgxYzA3OTliMDRlYzZj; ssid_ucp_sso_v1=1.0.0-KDRlYWI2MTUwNjllMmM5ZTIwYjI2ZDg4ZWY0N2UzNmRiY2YzMzcyNGQKIQj8p8Cul8ylAhCcl4fLBhj6CiAMMMy73bAGOAFA6wdIBhoCbGYiIGQxYTUyOTJkODM3ZTZkZWE0MTgxYzA3OTliMDRlYzZj; **security_mc_61_s_sdk_sign_data_key_sso=b0064cea-4e94-8bb9; odin_tt=cfea69c8af176fd7c93d2324e895fa5d0e2c73960c573d49e6f3605570371ec276a19e096f67c49a579e8df87dc43bb01b514457831ec0dd56986f6b806049ef; bd_ticket_guard_server_data=eyJ0aWNrZXQiOiJoYXNoLkVHb04rRG05c0lQNUZkcThraDNZZ0Rta0hzYmdhcDkrTXhVbjlINXBtN3M9IiwidHNfc2lnbiI6InRzLjIuNDMwNjJlMzNhMzU1Y2E1YmRmZGUyNGZhMTQzOTA0YzZiYTIzMWZhNzJjOTI0ZjE4OWQ5M2FiOWVkZTg0NmU0MmM0ZmJlODdkMjMxOWNmMDUzMTg2MjRjZWRhMTQ5MTFjYTQwNmRlZGJlYmVkZGIyZTMwZmNlOGQ0ZmEwMjU3NWQiLCJjbGllbnRfY2VydCI6InB1Yi5CRklLQXlGcFN0V2tWU1daeEthTjh5NWxoVnM4OThXdDdVdVd5cklkd1BCZEphRkpMTXl1Mm5YbmRHOGJWUHJGWnBxYXRLanFkemdLRk9LMWJYTHIyYVE9IiwibG9nX2lkIjoiMjAyNjAxMTAxMTQ2MzYyNzk2RDQ3NjQwRDk0RkI0QjE5NiIsImNyZWF0ZV90aW1lIjoxNzY4MDE2Nzk3fQ%3D%3D; bd_ticket_guard_web_domain=3; sid_guard=f5dc561a54903e28bed8f5c91ba86ca4%7C1768016797%7C5184001%7CWed%2C+11-Mar-2026+03%3A46%3A38+GMT; uid_tt=e229a9e38ccd82246e7c174bd34eec71; uid_tt_ss=e229a9e38ccd82246e7c174bd34eec71; uid_tt_ss=e229a9e38ccd82246e7c174bd34eec71; sid_tt=f5dc561a54903e28bed8f5c91ba86ca4; sessionid=f5dc561a54903e28bed8f5c91ba86ca4; sessionid_ss=f5dc561a54903e28bed8f5c91ba86ca4; sessionid_ss=f5dc561a54903e28bed8f5c91ba86ca4; session_tlb_tag=sttt%7C12%7C9dxWGlSQPii-2PXJG6hspP**\_\_\***\*-6lZcZddzQzi5mgyIluWawN3_jpVQBqOc6btTZIm6Gl0w%3D; session_tlb_tag=sttt%7C12%7C9dxWGlSQPii-2PXJG6hspP**\_\_\_\_\*\*-6lZcZddzQzi5mgyIluWawN3_jpVQBqOc6btTZIm6Gl0w%3D; sid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; sid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; ssid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; ssid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; csrftoken=pf0Z0JkgEsblnJ36uCqIt_ja; csrf_session_id=0db41d808b3f13e68eabac9a28894bf1; \_x_as_verify_status=v1_619b02a5ccf7480995e7de8d7b74c21d_1f69a9bbffd32f4569f1cea7076510e162d1ff27a0fa05707b9c257299989da8; trace_log_adv_id=; trace_log_user_id=1291245239407612; ttcid=c08254873f5d4ad09db3f893c872327637; tt_scid=1CXqTUuzWKnh-LTqKRmp.grfCURA9csxUKrh4IzU-rBQYZ57hVno-vDLF5oj3czU235e' \ --header 'Content-Type: application/json' \ --data-raw '{ "instance_id": "", "adv_id": "1852645552513225", "app_id": "tt9c36ea8b0305b6c401", "remark": "", "schema_info": [ { "path": "pages/theatre/index", "query": "code=PI96NCW0ZMG&aid=40011566&item_source=1&media_source=1&tt_album_id=7592905448143979027&tt_episode_id=7592905470463754779&app_id=tt9c36ea8b0305b6c401&click_id=__CLICKID__&request_id=__REQUESTID__&mid1=__MID1__&mid2=__MID2__&mid3=__MID3__&mid4=__MID4__&mid5=__MID5__&advertiser_id=__ADVERTISER_ID__", "remark": "小鱼-女神且慢看我露一手", "link": "sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D__ADVERTISER_ID__%26aid%3D40011566%26click_id%3D__CLICKID__%26code%3DPI96NCW0ZMG%26item_source%3D1%26media_source%3D1%26mid1%3D__MID1__%26mid2%3D__MID2__%26mid3%3D__MID3__%26mid4%3D__MID4__%26mid5%3D__MID5__%26request_id%3D__REQUESTID__%26tt_album_id%3D7592905448143979027%26tt_episode_id%3D7592905470463754779&uniq_id=W20260111144432811pqwoytke&version=v2&version_type=current&bdpsum=0d7866d", "operate_type": "1" } ], "data": { "tag_info": "{\"category_id\":1050000000,\"category_name\":\"小程序\",\"categories\":[{\"category_id\":1050100000,\"category_name\":\"短剧\",\"categories\":[{\"category_id\":1050107001,\"category_name\":\"其他\"}]}]}" } }'

is_hit_partitioned_cookie_canary_ss=true; is_hit_partitioned_cookie_canary_ss=true; is_hit_partitioned_cookie_canary=true; is_hit_partitioned_cookie_canary=true; **security_mc_61_s_sdk_crypt_sdk=112ba4a9-495a-8531; bd_ticket_guard_client_web_domain=2; d_ticket=f56e7348e0fb7fb786f55ce43103e08750a38; passport_auth_status=9248afad2c71c5b5b443e1b22b9bc5e7%2C; passport_auth_status_ss=9248afad2c71c5b5b443e1b22b9bc5e7%2C; n_mh=Is1iB8GYEmIolPCbsKTNDXu5N6moq6Yvf_T7fcRre8M; **security_mc_61_s_sdk_cert_key=1631726f-470c-81d3; is_staff_user=false; passport_csrf_token=a88ef95073c4fe172abbed01da9d89e3; passport_csrf_token_default=a88ef95073c4fe172abbed01da9d89e3; ttwid=1%7Cp1XQ6Fu2Tyc-xDaoIsFT0S3dc5sG5lZs3k9OuCjH3iQ%7C1768016768%7Cb26e9c007370d7d507744205cbe4817385accd4ed144f42206bbdb4422ff6b41; \_bd_ticket_crypt_doamin=3; \_bd_ticket_crypt_cookie=138df4d25a6b320cbf8beffc89a95e1e; **security_mc_61_s_sdk_sign_data_key_web_protect=7feb43d3-4f0f-9344; **security_server_data_status=1; bd_ticket_guard_client_data=eyJiZC10aWNrZXQtZ3VhcmQtdmVyc2lvbiI6MiwiYmQtdGlja2V0LWd1YXJkLWl0ZXJhdGlvbi12ZXJzaW9uIjoxLCJiZC10aWNrZXQtZ3VhcmQtcmVlLXB1YmxpYy1rZXkiOiJCRklLQXlGcFN0V2tWU1daeEthTjh5NWxoVnM4OThXdDdVdVd5cklkd1BCZEphRkpMTXl1Mm5YbmRHOGJWUHJGWnBxYXRLanFkemdLRk9LMWJYTHIyYVE9IiwiYmQtdGlja2V0LWd1YXJkLXdlYi12ZXJzaW9uIjoyfQ%3D%3D; s_v_web_id=verify_mk7rjqti_41578b08_422b_b29f_6195_ea9942509403; passport_mfa_token=CjGErwgmOYIOuT0ArfOnIUCWkyfmAvi86smIic70%2BQle6EuN%2FQhP6rEkJJvoZuQi4foUGkoKPAAAAAAAAAAAAABP7oh5AsbPZ1EGn1Ggi3lTZBuY694kO0FKnmkwCdmjU0guFeZ4%2F2gNI4ZgBpqizITaEhCawIYOGPax0WwgAiIBAx4UuOU%3D; sso_uid_tt=08aef28a88955d0fcb3aaa8d4b374051; sso_uid_tt_ss=08aef28a88955d0fcb3aaa8d4b374051; toutiao_sso_user=d1a5292d837e6dea4181c0799b04ec6c; toutiao_sso_user_ss=d1a5292d837e6dea4181c0799b04ec6c; sid_ucp_sso_v1=1.0.0-KDRlYWI2MTUwNjllMmM5ZTIwYjI2ZDg4ZWY0N2UzNmRiY2YzMzcyNGQKIQj8p8Cul8ylAhCcl4fLBhj6CiAMMMy73bAGOAFA6wdIBhoCbGYiIGQxYTUyOTJkODM3ZTZkZWE0MTgxYzA3OTliMDRlYzZj; ssid_ucp_sso_v1=1.0.0-KDRlYWI2MTUwNjllMmM5ZTIwYjI2ZDg4ZWY0N2UzNmRiY2YzMzcyNGQKIQj8p8Cul8ylAhCcl4fLBhj6CiAMMMy73bAGOAFA6wdIBhoCbGYiIGQxYTUyOTJkODM3ZTZkZWE0MTgxYzA3OTliMDRlYzZj; **security_mc_61_s_sdk_sign_data_key_sso=b0064cea-4e94-8bb9; odin_tt=cfea69c8af176fd7c93d2324e895fa5d0e2c73960c573d49e6f3605570371ec276a19e096f67c49a579e8df87dc43bb01b514457831ec0dd56986f6b806049ef; bd_ticket_guard_server_data=eyJ0aWNrZXQiOiJoYXNoLkVHb04rRG05c0lQNUZkcThraDNZZ0Rta0hzYmdhcDkrTXhVbjlINXBtN3M9IiwidHNfc2lnbiI6InRzLjIuNDMwNjJlMzNhMzU1Y2E1YmRmZGUyNGZhMTQzOTA0YzZiYTIzMWZhNzJjOTI0ZjE4OWQ5M2FiOWVkZTg0NmU0MmM0ZmJlODdkMjMxOWNmMDUzMTg2MjRjZWRhMTQ5MTFjYTQwNmRlZGJlYmVkZGIyZTMwZmNlOGQ0ZmEwMjU3NWQiLCJjbGllbnRfY2VydCI6InB1Yi5CRklLQXlGcFN0V2tWU1daeEthTjh5NWxoVnM4OThXdDdVdVd5cklkd1BCZEphRkpMTXl1Mm5YbmRHOGJWUHJGWnBxYXRLanFkemdLRk9LMWJYTHIyYVE9IiwibG9nX2lkIjoiMjAyNjAxMTAxMTQ2MzYyNzk2RDQ3NjQwRDk0RkI0QjE5NiIsImNyZWF0ZV90aW1lIjoxNzY4MDE2Nzk3fQ%3D%3D; bd_ticket_guard_web_domain=3; sid_guard=f5dc561a54903e28bed8f5c91ba86ca4%7C1768016797%7C5184001%7CWed%2C+11-Mar-2026+03%3A46%3A38+GMT; uid_tt=e229a9e38ccd82246e7c174bd34eec71; uid_tt_ss=e229a9e38ccd82246e7c174bd34eec71; uid_tt_ss=e229a9e38ccd82246e7c174bd34eec71; sid_tt=f5dc561a54903e28bed8f5c91ba86ca4; sessionid=f5dc561a54903e28bed8f5c91ba86ca4; sessionid_ss=f5dc561a54903e28bed8f5c91ba86ca4; sessionid_ss=f5dc561a54903e28bed8f5c91ba86ca4; session_tlb_tag=sttt%7C12%7C9dxWGlSQPii-2PXJG6hspP**\_\_\***\*-6lZcZddzQzi5mgyIluWawN3_jpVQBqOc6btTZIm6Gl0w%3D; session_tlb_tag=sttt%7C12%7C9dxWGlSQPii-2PXJG6hspP**\_\_\_\_\*\*-6lZcZddzQzi5mgyIluWawN3_jpVQBqOc6btTZIm6Gl0w%3D; sid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; sid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; ssid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; ssid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; csrftoken=pf0Z0JkgEsblnJ36uCqIt_ja; csrf_session_id=0db41d808b3f13e68eabac9a28894bf1; \_x_as_verify_status=v1_619b02a5ccf7480995e7de8d7b74c21d_1f69a9bbffd32f4569f1cea7076510e162d1ff27a0fa05707b9c257299989da8; trace_log_adv_id=; trace_log_user_id=1291245239407612; ttcid=c08254873f5d4ad09db3f893c872327637; tt_scid=1CXqTUuzWKnh-LTqKRmp.grfCURA9csxUKrh4IzU-rBQYZ57hVno-vDLF5oj3czU235e
