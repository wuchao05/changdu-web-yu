# 多主体代码清理总结

## 清理目标

移除散柔(sanrou)、牵龙(qianlong)、达人(daren)相关代码，只保留每日(daily)主体。

## 已完成的清理

### 后端文件

1. ✅ `server/services/autoSubmitScheduler.js` - 从1807行简化到约700行
   - 移除多主体调度器，改为单一调度器
   - 移除散柔渠道对比逻辑（增剧/红标剧）
   - 移除商品新增相关函数
   - 移除用户ID相关配置（Aduserid等）
   - 简化为只使用每日主体配置

2. ✅ `server/routes/autoSubmit.js`
   - 移除subject参数验证
   - 简化API接口，不再需要传递主体参数

3. ✅ `server/config/autoSubmit.js`
   - 移除散柔渠道配置
   - 只保留每日渠道配置

4. ✅ `server.js`
   - 移除散柔和牵龙的抖音素材路由

### 前端文件

1. ✅ `src/stores/apiConfig.ts` - 从449行简化到231行
   - 移除散柔、达人、牵龙配置
   - 只保留每日配置
   - 简化URL userId处理逻辑

2. ✅ `src/stores/account.ts` - 从126行简化到约95行
   - 移除多主体判断逻辑
   - 简化API配置获取

3. ✅ `src/api/autoSubmit.ts`
   - 移除多主体状态类型
   - 简化为单一主体状态

4. ✅ `src/api/types.ts`
   - AccountType只保留'daily'

5. ✅ `src/config/feishu.ts`
   - 移除table_ids和qianlong_table_ids
   - 只保留daily_table_ids

6. ✅ `src/config/accounts.ts`
   - 只保留daily账号配置

7. ✅ `src/config/accountApiDefaults.ts`
   - 只保留daily默认配置

8. ✅ `src/config/creators.ts`
   - 移除牵龙相关注释

9. ✅ `src/main.ts`
   - 移除qianlongApiConfigStore引用

### 已删除的文件

1. ✅ `server/routes/douyinMaterialSanrou.js`
2. ✅ `server/routes/douyinMaterialQianlong.js`
3. ✅ `src/stores/douyinMaterialSanrou.ts`
4. ✅ `src/stores/douyinMaterialQianlong.ts`
5. ✅ `src/stores/qianlongApiConfig.ts`
6. ✅ `src/utils/qianlong.ts`
7. ✅ `src/views/QianlongSettings.vue`
8. ✅ `src/components/QianlongSmartBuildModal.vue`
9. ✅ `src/components/QianlongCreatorStats.vue`
10. ✅ `src/components/QianlongCreatorDetail.vue`

## 移除的功能

1. ❌ 多主体切换功能
2. ❌ 增剧对比（红标剧/黄标剧）
3. ❌ 商品自动新增功能
4. ❌ 散柔、牵龙、达人主体的所有配置和逻辑
5. ❌ 多主体的抖音素材配置
6. ❌ 用户ID相关的下载中心头部配置

## 保留的功能

1. ✅ 每日主体的自动提交下载
2. ✅ 飞书多维表格集成
3. ✅ 巨量账户备注更新
4. ✅ 抖音素材配置（仅每日主体）
5. ✅ 下载任务状态检查

## 注意事项

- 前端组件中可能还有部分引用需要清理（如NewDramaPreview.vue）
- 需要测试启动和基本功能是否正常
- 日志输出已简化，不再包含主体标识
