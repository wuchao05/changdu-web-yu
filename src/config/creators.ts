/**
 * 牵龙平台创作者配置
 *
 * 用途：管理牵龙平台的创作者/分销商信息
 * 场景：牵龙 tab 数据展示
 *
 * 注意：这与 daren-config.json（达人账号配置）是不同的概念！
 * - CREATORS: 牵龙平台的创作者（使用 distributorId 标识）
 * - daren-config: 达人账号（使用 userId + douyinAccounts 标识）
 *
 * 搭建接口鉴权说明：
 * - 搭建接口的 userId 来自 URL 参数或 API 配置（apiConfigStore.effectiveUserId）
 * - 不需要在 CREATORS 中配置 userId
 */
export interface Creator {
  name: string
  distributorId: string
  douyinName?: string // 从订单里的 promotion_name 解析得到后可缓存
  hidden?: boolean // 是否隐藏该达人
  order?: number // 排序顺序
}

export const CREATORS: Creator[] = [{ name: '小红', distributorId: '1842865091654731' }]
