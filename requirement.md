# 爆剧坊 - 需求文档

## **多账号支持功能**

### **账号类型**

系统现在支持两种账号类型：

1. **散柔账号**（默认）
   - 显示多达人Tab切换
   - 包含完整的数据分析和短剧排行榜功能
   - 使用原有的API配置

2. **牵龙账号**
   - 显示单一的达人收入聚合页面
   - 聚合所有达人的订单数据并按达人分组统计
   - 使用专用的API配置和Cookie

### **账号切换**

- 在顶部导航栏右侧添加账号选择下拉框
- 默认为散柔账号，可切换到牵龙账号
- 切换账号时会清空所有数据缓存并重新加载

### **牵龙账号专用功能**

#### **达人收入聚合**

- **数据来源**: 使用订单详情接口获取所有达人的订单数据
- **聚合逻辑**:
  1. 解析 `promotion_name` 字段提取达人信息（格式：账户-剧名-达人名称）
  2. 按达人名称和日期进行分组统计
  3. 累计每日充值金额（分转元，保留1位小数）
- **展示内容**:
  - 统计概览：活跃达人数、总收入、数据天数、日均收入
  - 达人排行榜：按总收入排序，显示收入、订单数、活跃天数等
  - 详细数据表格：达人每日收入明细，支持导出CSV

---

## **项目目标**

基于已授权的接口，搭建一个仅自用的可视化爆剧坊。支持多账号切换，按"达人（DistributorId）"维度分 Tab 展示，提供以下功能模块：

### **核心功能模块**

1. **数据分析**：
   - 【数据概览】（接口 A）- 实时展示今日、本月、累计金额数据
   - 【数据报表】（接口 B）- 可按日期筛选的详细数据报表，支持分页
   - 【订单统计】（接口 C）- 订单详情查看，支持时间和支付状态筛选

2. **短剧排行榜**（接口 D）：
   - 短剧数据分析和排行展示
   - 支持多维度筛选和排序

### **管理功能**

3. **达人管理**：
   - 支持 API 自动获取达人列表
   - 手动添加/编辑/删除达人信息
   - 达人显示/隐藏控制
   - 拖拽排序功能

4. **系统设置**：
   - API 配置管理（Cookie、AppID、AppType）
   - 基础设置（分页大小、默认查询天数）
   - 自动刷新配置
   - 数据管理（缓存清理、设置重置）

需保证界面精致、美观、交互顺滑、性能稳定、代码可维护。

---

## **技术栈与基础设施**

- 架构：Vue 3 + Vite + TypeScript + Pinia

- UI：Element Plus（表单/表格/日期选择），TailwindCSS（排版与视觉）

- HTTP：Axios（实例 + 拦截器）

- 代码规范：ESLint + Prettier + Husky（pre-commit）

- 时间与格式化：dayjs

- 图标：@iconify/vue

- 拖拽组件：vuedraggable + sortablejs（支持拖拽排序）

- UI组件库：Naive UI（替代部分 Element Plus 组件，提供更现代的交互体验）

- 目录：

  ```markdown
  src/
  api/ # Axios 实例、API 封装
  stores/ # Pinia 状态管理
  components/ # 复用组件
  views/ # 页面组件
  utils/ # 工具方法（金额/解析/时间）
  router/ # 路由配置
  styles/ # 全局样式
  config/ # 达人配置、环境变量
  composables/ # Vue3 组合式函数（如自动刷新、拖拽等）
  ```

---

## **达人配置（可扩展）**

- DistributorId 作为区分达人身份的请求头字段：Distributorid

- 初始达人清单（预留可扩展）：
  - 驴哥：1842666484369707
  - 小何：1842848339210377
  - 柴总：1842861960992777
  - 落安：1842787993889802
  - 小红：1842865091654731
  - 大王哥：1842868343384201

在 src/config/creators.ts 中以数组维护：

```typescript
export interface Creator {
  name: string
  distributorId: string
  douyinName?: string // 从订单里的 promotion_name 解析得到后可缓存
  hidden?: boolean // 是否隐藏（用于显示/隐藏控制）
  order?: number // 排序序号（用于拖拽排序）
}
export const CREATORS: Creator[] = [
  { name: '驴哥', distributorId: '1842666484369707' },
  { name: '小何', distributorId: '1842848339210377' },
  { name: '柴总', distributorId: '1842861960992777' },
  { name: '落安', distributorId: '1842787993889802' },
  { name: '小红', distributorId: '1842865091654731' },
  { name: '大王哥', distributorId: '1842868343384201' },
]
```

---

## **鉴权与请求头约定**

> 除 Distributorid 外，其他头字段固定一致（你已授权）。在开发态可以写在 .env.local，也可放到一个本地 JSON 配置中，通过设置页写入 localStorage（仅自用）。

**统一请求头：**

- Cookie: passport*csrf_token=788d3e04f9407f3c74d2453202b66e85; passport_csrf_token_default=788d3e04f9407f3c74d2453202b66e85; n_mh=MPHRKGEs6Mdv8j9-lYQ_xItbJLeVCy02zT61y*-m6jI; sid_guard=694d5e888044fd977e589c5cec9562bc%7C1757482512%7C5184000%7CSun%2C+09-Nov-2025+05%3A35%3A12+GMT; uid_tt=44c3c21b4f2cbffa895645f632931ae7; uid_tt_ss=44c3c21b4f2cbffa895645f632931ae7; sid_tt=694d5e888044fd977e589c5cec9562bc; sessionid=694d5e888044fd977e589c5cec9562bc; sessionid_ss=694d5e888044fd977e589c5cec9562bc; session_tlb_tag=sttt%7C3%7CaU1eiIBE_Zd-WJxc7JVivP**\_\_\_\_**-5wSFWtPw75eHhcvRsDHoIn18RPAQ-g8JJkplEzPDtx4s%3D; is_staff_user=false; sid_ucp_v1=1.0.0-KGE2N2M5ZGVhOGZhYzRlYjEzNmVkZTQ5MDkzZDJjMDc3NDMyMjEzODEKFgi66cCnt81WEJCchMYGGKYMOAFA6gcaAmxmIiA2OTRkNWU4ODgwNDRmZDk3N2U1ODljNWNlYzk1NjJiYw; ssid_ucp_v1=1.0.0-KGE2N2M5ZGVhOGZhYzRlYjEzNmVkZTQ5MDkzZDJjMDc3NDMyMjEzODEKFgi66cCnt81WEJCchMYGGKYMOAFA6gcaAmxmIiA2OTRkNWU4ODgwNDRmZDk3N2U1ODljNWNlYzk1NjJiYw; gfkadpd=4842%2C34653; csrf_session_id=b5260866318a8cd82fcaef3d7a88784c; tt_scid=NM3kZyQPW6Ng6L3kdtoIeOREvLeBNSqFbb1Oym3hP9lwl2Oo.YXFJ68LaabChF2Fd137; distributorId=1842666484369707; isOaLinkedMpSecondLevel=false; isH5RevisitAppSecondLevel=false; isOaLinkedMpThirdLevel=false; isH5RevisitAppThirdLevel=false; enableQuickApp=true; enableWechatH5=false; enableWechatApp=false; enableDouYinMp=false; enableDouYinBookMp=false; enableDouYinFreeSeriesMp=false; enableDouYinVipStoryMp=false; loginType=0; adUserId=380892546610362; rootAdUserId=380892546610362; isUg=false
- Appid: 40012555
- Apptype: 7
- Distributorid: 动态取当前 Tab 的 distributorId

实现方式：

- 建立 api/http.ts，创建 axios 实例；在请求拦截器里合并上述固定头，并把 Distributorid 从 Pinia 的 activeCreator 里注入。
- .env 中配置 VITE_BASE_URL=https://www.changdunovel.com。
- 为避免泄露 Cookie，上线前推荐用本机 Node 代理（见“可选后端代理”），但此项目默认先走纯前端直连（仅自用）。

---

## **API 接口与封装**

### **A. 数据概览（默认展示）**

- URL 示例：

```markdown
https://www.changdunovel.com/novelsale/distributor/application_overview/v1?msToken=kNAI5fcKLSjcW6bar-q9RAZoN4nf7INmWXFddO0_HOEbpfoqx9PYmzlzi0_DDLXlihJ0tUQxTMZU-jxififnglwlDymABMY2JuimHqtK0xWAcFB0vJEhvjm2DGIYOylu2OVwSNLHINfVfroD4Hm71Bb8FoXiGVM60yF6YA0L9uYxcQ%3D%3D&a_bogus=OjsfhHSyOq%2FbKpAS8cDjC6nUASIANPWyU1iQS7Yy9OEYcXlGc8HvDPamjxFKx%2FR1%2FRBZqO3HokG%2FPxrbzAwzZoepKsZfuu76u0IAIt0LZ1wVTthBgrD8CzuFKX0YUQUo-%2F5fi1WvMU7L2DO-qNd8%2FB-HtCnCQQRkKqdRk%2FTGOoGZZ88Io1ZTi%2Fs2tfj95P28M86hCE%3D%3D
```

- 返回结构（直接是字段）：

  ```json
  {
    "all_data": 113520,
    "code": 0,
    "message": "success",
    "month_data": 113520,
    "today_data": 3070,
    "today_wx_vc_hot_data": 0,
    "today_wx_vc_nature_data": 0,
    "update_ts": "2025-09-13 23:37:28"
  }
  ```

  - 金额单位均为“分”，前端统一格式化为“元”，保留 1 位小数（四舍五入）

### **B. 数据报表（可筛日期）**

- URL 示例（begin/end 为 yyyymmdd；分页与日期可变）：

  ```markdown
  https://www.changdunovel.com/novelsale/distributor/application_overview_list/v1?begin=20250908&end=20250914&is_optimizer_view=false&date_type=1&page_index=0&page_size=10&msToken=kNAI5fcKLSjcW6bar-q9RAZoN4nf7INmWXFddO0_HOEbpfoqx9PYmzlzi0_DDLXlihJ0tUQxTMZU-jxififnglwlDymABMY2JuimHqtK0xWAcFB0vJEhvjm2DGIYOylu2OVwSNLHINfVfroD4Hm71Bb8FoXiGVM60yF6YA0L9uYxcQ%3D%3D&a_bogus=xXsVDwyLDoRVcpltucmyCXQl1A2ANBWyzqToR78yCNoROXtbUbevDOa0cxqFvu63O8BpqO5HukGASDpcz5wiZoCkusZDSuzSmsIII78og1q3GeXBDHmuCwuFoX0b0Q0oe5VRiAU3gU7yIxc-qqQL%2Fp-HyCjeQmRkKrQSk%2FYGToa2ZuuId3MsiMsgHfnq5sKDQuUZCE%3D%3D
  ```

  - 关注字段（从 daily_data[] 每日项中展示）：
    - new_user_amount（新用户充值金额，分 → 元）
    - new_user_cnt（新用户数）
    - paid_new_order（新用户充值订单数）
    - paid_new_order_rate（新用户订单完成率）
    - paid_new_user（新用户充值人数）
    - paid_new_user_rate（新用户充值率）
    - paid_order（全用户充值订单数）
    - paid_order_rate（全用户订单完成率）
    - paid_user（全用户充值人数）
    - total_amount（全用户充值金额，分 → 元）

  - 注意：该接口总体返回形如 { code, message, total, daily_data }

### **C. 订单统计（可筛“订单创建时间”、“支付状态”）**

- URL 示例（begin_time/end_time 为秒级时间戳；pay_status 0=成功，1=未支付，不传=全部）：

```markdown
https://www.changdunovel.com/novelsale/distributor/promotion/detail/v2?begin_time=1757433600&end_time=1757865599&promotion_type=0&media_source=0&display_type=1&page_index=0&page_size=10&msToken=kNAI5fcKLSjcW6bar-q9RAZoN4nf7INmWXFddO0_HOEbpfoqx9PYmzlzi0_DDLXlihJ0tUQxTMZU-jxififnglwlDymABMY2JuimHqtK0xWAcFB0vJEhvjm2DGIYOylu2OVwSNLHINfVfroD4Hm71Bb8FoXiGVM60yF6YA0L9uYxcQ%3D%3D&a_bogus=E74jDtXiEZQfcpeGuCmjCVelRy9lNT8ypNi2bxyyexxpOHlTdSetENa8bxwFiuvvQmBNqOC7uktAzn3bz%2Fz0ZoapzshfSKXS8sIIItmo%2F1wVTt7BgHDYCuYFKXMG0mUolQVWiIU3%2FUHyIEQ-pNQ8%2FQ-HtCjC5mbkQHQSkZTaPoG1Z%2F8I23ZsiMs2yfnq5B%2FDOR6MyE%3D%3D
```

- 关注字段（表格列）：
  - device_id（用户 id）
  - order_create_time（订单创建时间）
  - order_paid_time（订单支付时间）
  - pay_amount（支付金额，分 → 元）
  - pay_status（支付状态）
  - pay_way（支付方式）
  - promotion_name（推广链来源，需要“智能解析”，见下）

## **“推广链来源”字段解析规则（很关键）**

示例：

```markdown
promotion_name: "1842754778072330-CC-虎雨 8384-73-昭然赴礼-小何-安贺剧场"
```

解析要求：

- 账户：**第一个连字符之前** → 1842754778072330
- 固定结构段：CC-虎雨 8384-73（具体编号可能不同，但结构固定，可忽略不展示）
- 剧名：**下一个字段** → 昭然赴礼
- 达人名称：**剧名后面第一个字段** → 小何（与当前 Tab 的达人名应一致）
- 抖音号：**达人名称后面剩余的所有字符（保留中间的 -）** → 安贺剧场（若包含多个 - 也全部并入）

要求在订单表格渲染前，根据当前激活达人名精确切分，并在表格中新增一列“解析信息”，以 tag 形式展示：账户、剧名、抖音号（达人名可省略）。

---

## **UI / 交互规范**

### **布局**

- 顶部：标题 + 设置（右上角齿轮：维护授权头/默认日期/分页大小）
- 主体：达人维度横向 Tab（按达人列表生成）
- 二级 Tab：数据分析 / 短剧排行榜
- 切换达人 Tab：立即触发数据刷新
- 数据分析包含：概览卡片 → 数据报表 → 订单统计

### **概览卡片（接口 A）**

- 采用 2×3 卡片栅格（Element Card + Tailwind）

- 展示并格式化：
  - today_data 今日金额（元，1 位小数）
  - month_data 本月金额（元）
  - all_data 累计金额（元）
  - update_ts 更新时间（右上角浅色文案）

- 骨架屏与错误态展示

### **数据报表（接口 B）**

- 头部筛选：日期范围（默认近 7 天，begin/end 以 YYYYMMDD 传参）、分页（page_index/page_size）

- 表格列（仅需求字段，金额与百分比格式化）：
  - 日期（由返回的 date 秒时间戳转为 YYYY-MM-DD）
  - 新用户数（new_user_cnt）
  - 新用户充值金额（元，new_user_amount）
  - 新用户充值订单数（paid_new_order）
  - 新用户订单完成率（paid_new_order_rate，百分号显示 1 位小数）
  - 新用户充值人数（paid_new_user）
  - 新用户充值率（paid_new_user_rate）
  - 全用户充值订单数（paid_order）
  - 全用户订单完成率（paid_order_rate）
  - 全用户充值人数（paid_user）
  - 全用户充值金额（元，total_amount）

### **C. 订单统计（可筛时间和支付状态）**

- 头部筛选：
  - 订单创建时间（时间范围，精确到日；转为秒级 begin_time/end_time）
  - 支付状态 pay_status（全部/支付成功/未支付）
  - 分页

- 表格列：
  - 用户 ID（device_id）
  - 创建时间（order_create_time）
  - 支付时间（order_paid_time）
  - 支付金额（元，pay_amount）
  - 支付状态（彩色 Tag：成功=绿、未支付=灰）
  - 支付方式（pay_way）
  - 推广链来源（原始 promotion_name，提供 tooltip 全量）
  - 解析信息（账户 / 剧名，以 Tag 组展示）_注：抖音号字段已移除_

### **D. 短剧排行榜（新增功能）**

- URL 示例：

  ```markdown
  https://www.changdunovel.com/novelsale/distributor/drama_ranking/v1?...
  ```

- 头部筛选：
  - 时间范围（开始时间/结束时间）
  - 排序方式（收入、观看量等）
  - 数据类型筛选

- 主要字段：
  - 短剧名称和封面
  - 观看数据统计
  - 收入数据分析
  - 排行变化趋势

### **E. 达人信息获取（管理功能）**

- URL：`/novelsale/distributor/login/v1/`
- 特殊要求：请求头中 `Distributorid` 必须设置为 `0`（管理员权限）
- 返回：`distributor_info_list` 数组，包含 `nick_name` 和 `distributor_id`
- 用途：自动获取和同步达人列表

---

---

## **高级功能特性（已实现）**

### **1. 列管理系统**

- **功能说明**：支持用户自定义表格列显示和排序
- **适用范围**：数据报表、订单统计表格
- **主要特性**：
  - 拖拽调整列顺序
  - 勾选控制列显示/隐藏
  - 配置持久化存储
  - 重置为默认配置

### **2. 自动刷新机制**

- **功能说明**：定时自动刷新数据，保持信息最新
- **配置选项**：
  - 开启/关闭自动刷新
  - 自定义刷新间隔（30-600秒）
  - 手动刷新重置定时器
- **实现原理**：基于 Vue3 Composables 的响应式定时器

### **3. 智能达人管理**

- **API 自动获取**：从服务器实时同步达人列表
- **手动管理**：添加、编辑、删除达人信息
- **显示控制**：隐藏/显示特定达人
- **拖拽排序**：自定义达人显示顺序
- **数据验证**：完整的输入验证和重复检查

### **4. 推广链智能解析**

- **解析算法**：自动分析 promotion_name 字段结构
- **提取信息**：账户、剧名、达人名称
- **可视化展示**：Tag 组形式直观显示解析结果
- **错误处理**：解析失败时的兜底机制

### **5. 数据管理工具**

- **缓存管理**：一键清除本地缓存数据
- **设置备份**：配置信息持久化到 localStorage
- **批量重置**：恢复所有设置为默认状态
- **数据迁移**：兼容旧版本配置格式

### **6. 响应式设计增强**

- **移动端适配**：支持移动设备浏览
- **弹性布局**：自适应不同屏幕尺寸
- **交互优化**：触摸友好的操作体验
- **性能优化**：虚拟滚动、懒加载等技术

---

## **验收标准（Checklist）**

### **基础功能**

- 切换不同达人 Tab 时，Distributorid 请求头实时变更，数据正确联动刷新
- 金额字段（所有 _\_amount / _\_data / pay_amount）均按"分 → 元"展示，**保留 1 位小数**
- 报表日期筛选可工作，分页可工作；date 秒级时间戳正确转 YYYY-MM-DD
- 订单统计的"支付状态"筛选（全部/成功/未支付）正确生效；时间范围传参为秒级
- promotion_name 解析正确（账户/剧名），格式化为 Tag 组展示
- 错误态（code ≠ 0 或网络异常）有明显提示且不阻塞其他模块
- 加载态均有 Skeleton；交互 ≥ 60fps，无明显抖动
- 所有常量与 Token 可在设置里编辑并持久化（localStorage）

### **高级功能验收**

- 列管理功能：拖拽排序和显示控制正常工作，配置持久化有效
- 自动刷新功能：定时刷新和手动刷新均正常，设置实时生效
- 达人管理功能：API 获取、手动管理、拖拽排序、显示控制均正常
- 短剧排行榜：数据展示和筛选功能正常，与达人维度正确关联
- 数据管理工具：缓存清理和设置重置功能正常，无数据丢失风险
- 响应式设计：在不同设备和屏幕尺寸下均有良好的用户体验

### **多账号功能验收**

- 账号选择器：顶部导航栏的账号下拉框显示正常，可正常切换
- 散柔账号：默认账号，显示多达人Tab和完整功能模块
- 牵龙账号：显示达人收入聚合页面，隐藏达人Tab导航
- 账号切换：切换时正确清空缓存，使用对应的API配置和请求头
- 数据聚合：牵龙账号正确解析推广链信息，按达人分组统计收入
- 牵龙API：使用专用Cookie和配置，Distributorid设置为固定值
- 数据展示：统计概览、排行榜、详细表格均正确显示
- 导出功能：支持CSV格式导出达人收入明细数据

### **性能与稳定性**

- 大数据量下表格渲染性能良好（1000+ 条记录）
- 长时间运行稳定，无内存泄漏
- 网络异常时有完善的错误处理和恢复机制
- 本地存储容量控制合理，避免超出浏览器限制

---

## **扩展功能说明**

### **环境与部署**

- **开发环境**：配置 Vite 代理解决 CORS 问题，支持热重载开发
- **生产环境**：支持直连 API 或 Node.js 代理部署
- **配置管理**：支持环境变量和本地配置文件
- **构建优化**：代码分割、Tree Shaking、资源压缩

### **用户体验优化**

- **加载体验**：Skeleton 骨架屏、Loading 状态、错误边界
- **交互反馈**：操作成功/失败提示、确认对话框、进度指示
- **键盘支持**：支持键盘导航和快捷键操作
- **无障碍性**：遵循 WCAG 2.1 标准，支持屏幕阅读器

### **数据处理增强**

- **智能缓存**：合理的缓存策略，减少重复请求
- **数据校验**：前端表单验证和后端数据校验
- **异常处理**：网络超时、数据格式错误等异常场景处理
- **状态管理**：基于 Pinia 的集中式状态管理

### **维护与扩展性**

- **代码规范**：ESLint + Prettier 确保代码质量
- **类型安全**：TypeScript 提供完整的类型定义
- **组件化**：高度可复用的组件设计
- **文档完善**：详细的代码注释和使用文档

---

## **技术特色亮点**

1. **Vue 3 Composition API**：充分利用 Vue 3 的组合式 API 和响应式特性
2. **TypeScript 全栈支持**：从 API 到 UI 的完整类型安全
3. **现代 UI 库整合**：Element Plus + Naive UI + TailwindCSS 的最佳实践
4. **自定义 Composables**：可复用的业务逻辑抽象
5. **智能状态管理**：Pinia 的模块化状态管理设计
6. **响应式设计系统**：移动优先的自适应布局
