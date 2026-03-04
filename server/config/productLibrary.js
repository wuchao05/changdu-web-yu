// 全局固定的 teamId
export const DEFAULT_TEAM_ID = '500039'

// 商品库统一配置（仅保留单一主体）
const PRODUCT_LIBRARY_CONFIG = {
  adAccountId: '1850380906618891',
  productPlatformId: '4382498222065454',
}

/**
 * 根据用户 ID 获取默认商品库配置
 * 兼容旧签名，统一返回单一配置
 */
export function getProductLibraryConfig() {
  return PRODUCT_LIBRARY_CONFIG
}

/**
 * 根据用户 ID 和主体获取商品库配置
 * 兼容旧签名，统一返回单一配置
 */
export function getProductLibraryConfigBySubject() {
  return PRODUCT_LIBRARY_CONFIG
}
