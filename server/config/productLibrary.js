import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 全局固定的 teamId
export const DEFAULT_TEAM_ID = '500039'

// 服务端商品库配置（与前端保持一致，可按需同步修改）
const PRODUCT_LIBRARY_CONFIGS = {
  // 欣雅主体 - 达人使用
  xinya: {
    adAccountId: '1841508218277271',
    productPlatformId: '4133763453880083',
  },
  // 超琦主体 - 小红使用
  chaoqi: {
    adAccountId: '1850380906618891',
    productPlatformId: '4382498222065454',
  },
}

const ADMIN_USER_ID = '2peWAuMpDOqXGj8'

// 达人配置缓存
let darenConfigCache = null
let darenConfigLastLoad = 0
const CACHE_TTL = 60000 // 缓存 1 分钟

/**
 * 从配置文件读取达人列表
 */
function loadDarenConfig() {
  const now = Date.now()
  // 如果缓存有效，直接返回
  if (darenConfigCache && now - darenConfigLastLoad < CACHE_TTL) {
    return darenConfigCache
  }

  try {
    const configPath = path.join(__dirname, '../data/daren-config.json')
    const configData = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(configData)
    darenConfigCache = config
    darenConfigLastLoad = now
    return config
  } catch (error) {
    console.error('读取达人配置失败:', error)
    // 降级方案：返回空列表
    return { darenList: [] }
  }
}

/**
 * 检查用户是否是达人
 */
function isDarenUser(userId) {
  if (!userId) return false
  const config = loadDarenConfig()
  return config.darenList.some(daren => daren.id === userId)
}

/**
 * 根据用户 ID 获取默认商品库配置
 * @param {string} userId 用户 ID
 * @returns 商品库配置
 */
export function getProductLibraryConfig(userId = '') {
  if (userId === ADMIN_USER_ID) {
    // 管理员默认使用超琦配置
    return PRODUCT_LIBRARY_CONFIGS.chaoqi
  }
  if (isDarenUser(userId)) {
    // 达人使用欣雅配置（从配置文件动态读取）
    return PRODUCT_LIBRARY_CONFIGS.xinya
  }
  // 默认返回超琦配置
  return PRODUCT_LIBRARY_CONFIGS.chaoqi
}

/**
 * 根据用户 ID 和主体获取商品库配置
 * @param {string} userId 用户 ID
 * @param {string} subject 主体名称（如 "超琦"、"欣雅"）
 * @returns 商品库配置
 */
export function getProductLibraryConfigBySubject(userId = '', subject = '') {
  if (userId === ADMIN_USER_ID) {
    // 管理员：根据主体选择配置，默认超琦
    if (subject === '欣雅') {
      return PRODUCT_LIBRARY_CONFIGS.xinya
    }
    return PRODUCT_LIBRARY_CONFIGS.chaoqi
  }
  if (isDarenUser(userId)) {
    // 达人固定使用欣雅配置（从配置文件动态读取）
    return PRODUCT_LIBRARY_CONFIGS.xinya
  }
  // 默认返回超琦配置
  return PRODUCT_LIBRARY_CONFIGS.chaoqi
}
