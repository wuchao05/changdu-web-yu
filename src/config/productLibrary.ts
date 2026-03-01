const ADMIN_USER_ID = '2peWAuMpDOqXGj8'

/**
 * 商品库配置策略：
 * - 管理员（小红）：使用超琦配置
 * - 其他用户（包括达人）：统一使用欣雅配置
 *
 * 注意：不需要区分达人和普通用户，都使用欣雅配置即可
 */

/**
 * 商品库配置 - 按主体划分
 */
export const PRODUCT_LIBRARY_CONFIGS = {
  // 超琦主体 - 小红使用
  chaoqi: {
    adAccountId: '1850380906618891',
    productPlatformId: '4382498222065454',
  },
  // 欣雅主体 - 达人使用
  xinya: {
    adAccountId: '1841508218277271',
    productPlatformId: '4133763453880083',
  },
} as const

/**
 * 小红（管理员）主体对应的商品库配置映射
 */
export const ADMIN_SUBJECT_CONFIG_MAP: Record<
  string,
  (typeof PRODUCT_LIBRARY_CONFIGS)[keyof typeof PRODUCT_LIBRARY_CONFIGS]
> = {
  超琦: PRODUCT_LIBRARY_CONFIGS.chaoqi,
  欣雅: PRODUCT_LIBRARY_CONFIGS.xinya,
} as const

/**
 * 达人主体对应的商品库配置映射
 */
export const DAREN_SUBJECT_CONFIG_MAP: Record<
  string,
  (typeof PRODUCT_LIBRARY_CONFIGS)[keyof typeof PRODUCT_LIBRARY_CONFIGS]
> = {
  欣雅: PRODUCT_LIBRARY_CONFIGS.xinya,
} as const

/**
 * 根据用户 ID 获取默认商品库配置
 * @param userId 用户 ID
 * @returns 商品库配置
 */
export function getProductLibraryConfig(userId?: string) {
  if (userId === ADMIN_USER_ID) {
    // 管理员使用超琦配置
    return PRODUCT_LIBRARY_CONFIGS.chaoqi
  }
  // 其他所有用户（包括达人）使用欣雅配置
  return PRODUCT_LIBRARY_CONFIGS.xinya
}

/**
 * 根据用户 ID 和主体获取商品库配置
 *
 * 配置选择逻辑：
 * - 管理员（小红）：根据主体参数选择配置
 * - 其他所有用户：统一使用欣雅配置，忽略主体参数
 *
 * @param userId 用户 ID
 * @param subject 主体名称（如 "超琦"、"欣雅"），从飞书表格中获取
 * @returns 商品库配置
 */
export function getProductLibraryConfigBySubject(
  userId?: string,
  subject?: string
): (typeof PRODUCT_LIBRARY_CONFIGS)[keyof typeof PRODUCT_LIBRARY_CONFIGS] {
  if (userId === ADMIN_USER_ID) {
    // 管理员：根据主体选择配置，找不到对应主体时默认使用超琦配置
    return ADMIN_SUBJECT_CONFIG_MAP[subject || ''] || PRODUCT_LIBRARY_CONFIGS.chaoqi
  }

  // 其他所有用户（包括达人）统一使用欣雅配置，忽略主体参数
  return PRODUCT_LIBRARY_CONFIGS.xinya
}

/**
 * 判断用户是否为管理员
 * @param userId 用户 ID
 * @returns 是否为管理员
 */
export function isAdminUser(userId?: string): boolean {
  return userId === ADMIN_USER_ID
}
