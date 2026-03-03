/**
 * 创作者配置
 *
 * 用途：管理平台的创作者/分销商信息
 * 场景：数据展示
 */
export interface Creator {
  name: string
  distributorId: string
  douyinName?: string // 从订单里的 promotion_name 解析得到后可缓存
  hidden?: boolean // 是否隐藏该达人
  order?: number // 排序顺序
}

export const CREATORS: Creator[] = [{ name: '小红', distributorId: '1842865091654731' }]
