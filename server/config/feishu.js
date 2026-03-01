/**
 * 飞书配置
 * 共享配置，供 routes/feishu.js 和 services/dailyBuildScheduler.js 使用
 */
export const FEISHU_CONFIG = {
  app_id: 'cli_a870f7611b7b1013',
  app_secret: 'NTwHbZG8rpOQyMEnXGPV6cNQ84KEqE8z',
  api_base_url: 'https://open.feishu.cn/open-apis',
  app_token: 'WdWvbGUXXaokk8sAS94c00IZnsf',
  token_endpoint: '/auth/v3/tenant_access_token/internal',
  table_ids: {
    // 剧集清单 - 散柔（超琦）主体
    drama_list: 'tblvuZhBd4drW26n',
    // 剧集状态 - 散柔（超琦）主体
    drama_status: 'tblDOyi2Lzs80sv0',
    // 超琦账户表（默认）
    chaoqi_account: 'tbl0PVvAOHKGcWLs',
    account: 'tbl0PVvAOHKGcWLs',
  },
  // 牵龙（欣雅）主体表格 ID 配置
  // 注意：剧集清单和剧集状态表与散柔共用，只有账户表独立
  qianlong_table_ids: {
    // 剧集清单 - 与散柔共用
    drama_list: 'tblvuZhBd4drW26n',
    // 剧集状态 - 与散柔共用
    drama_status: 'tblDOyi2Lzs80sv0',
    // 欣雅账户表（独立）
    account: 'tblh9obuLh1g7hOS',
  },
  // 每日账号表格 ID 配置
  daily_table_ids: {
    // 剧集清单
    drama_list: 'tblYEW4YqqSmnsB5',
    // 剧集状态
    drama_status: 'tblJcLhLpEkmFkga',
    // 账户表
    account: 'tblrlxmzydVtPcbW',
  },
}
