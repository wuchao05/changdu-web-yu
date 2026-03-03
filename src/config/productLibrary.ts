/**
 * 每日主体商品库配置
 * 单主体版本，固定使用每日配置
 */
export const PRODUCT_LIBRARY_CONFIG = {
  adAccountId: '1841508218277271',
  productPlatformId: '4133763453880083',
} as const

/**
 * 获取商品库配置
 * @returns 商品库配置
 */
export function getProductLibraryConfig() {
  return PRODUCT_LIBRARY_CONFIG
}
