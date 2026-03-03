// 各账号的默认 API 配置
// ⚠️ 注意：敏感配置（Cookie）已迁移至服务器的 /data/changdu-web/auth.json
// 此文件仅保留结构定义和非敏感的默认值（如 distributorId）
// 真实的 Cookie 会在页面加载时从 /api/auth/config 接口自动获取
export const ACCOUNT_API_DEFAULTS = {
  daily: {
    cookie: '',
    distributorId: '1844565955364887',
  },
} as const
