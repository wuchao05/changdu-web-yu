/**
 * 搭建系统配置
 */
export const DAILY_BUILD_CONFIG = {
  // 常读openapi配置
  changdu: {
    baseUrl: 'https://www.changdupingtai.com/novelsale/openapi',
  },

  // 创建推广链接固定参数
  promotion: {
    index: 1,
    mediaSource: 1,
    price: 150,
    startChapter: 10,
  },

  // 添加事件固定参数
  event: {
    linkName: '其他',
    eventEnum: '14',
    eventType: 'active_pay',
    eventName: '付费',
    trackTypes: [12],
    statisticalMethodType: 2,
  },

  // 搭建相关配置
  build: {
    // 项目固定参数
    project: {
      budget: 300,
      inventory_catalog: 5, // 穿山甲
      smart_bid_type: 7, // 自定义出价
      flow_control_mode: 0,
      budget_mode: 0, // 0 表示日预算
    },

    // 广告固定参数
    promotion: {
      source: '泰州晴天',
      product_name: '热播短剧',
      selling_point: '爆款短剧推荐',
      call_to_action: '精彩继续',
      pricing: 'PRICING_OCPM', // 出价方式
      smart_bid_type: 'SMART_BID_CUSTOM', // 智能出价类型
      deep_external_action: 'AD_CONVERT_TYPE_GAME_ADDICTION', // 深度转化目标：付费
      external_action: 'AD_CONVERT_TYPE_ACTIVE_REGISTER', // 浅层转化目标：激活
    },
  },
}
