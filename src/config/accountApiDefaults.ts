// 各账号的默认 API 配置
// ⚠️ 注意：认证配置统一从 /api/auth/config 加载
// 这里不再提供 distributorId 等字段兜底，避免与服务端配置不一致
export const ACCOUNT_API_DEFAULTS = {
  daily: {
    cookie: '',
    distributorId: '',
  },
} as const
