/**
 * 飞书多维表格配置
 */
export const FEISHU_CONFIG = {
  // 应用配置
  app_id: import.meta.env.VITE_FEISHU_APP_ID,
  app_secret: import.meta.env.VITE_FEISHU_APP_SECRET,
  app_token: import.meta.env.VITE_FEISHU_APP_TOKEN,

  // API 端点
  api_base_url: 'https://open.feishu.cn/open-apis',

  // 表格 ID 配置 - 吴超
  // table_ids: {
  //   // 剧集清单
  //   drama_list: 'tblV32RKxtPeT6xC',
  //   // 剧集状态
  //   drama_status: 'tblVC9djdl4PSqIG',
  // },

  // 表格 ID 配置 - 散柔（超琦）主体
  table_ids: {
    // 剧集清单
    drama_list: 'tblvuZhBd4drW26n',
    // 剧集状态
    drama_status: 'tblDOyi2Lzs80sv0',
    // 超琦账户表
    chaoqi_account: 'tbl0PVvAOHKGcWLs',
    // 欣雅账户表
    xinya_account: 'tblh9obuLh1g7hOS',
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

  // API 路径
  endpoints: {
    // 获取 app_access_token
    get_app_access_token: '/auth/v3/app_access_token/internal',
    // 多维表格 API 基础路径
    bitable_base: '/bitable/v1/apps',
  },
} as const

/**
 * 飞书 API 请求配置
 */
export const FEISHU_API_CONFIG = {
  // 请求头配置
  headers: {
    'Content-Type': 'application/json',
  },

  // 超时时间（毫秒）
  timeout: 10000,

  // 重试次数
  retry_count: 3,
} as const
