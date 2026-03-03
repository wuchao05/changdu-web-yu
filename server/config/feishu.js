import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 飞书配置
 */
export const FEISHU_CONFIG = {
  app_id: 'cli_a870f7611b7b1013',
  app_secret: 'NTwHbZG8rpOQyMEnXGPV6cNQ84KEqE8z',
  api_base_url: 'https://open.feishu.cn/open-apis',
  app_token: 'WdWvbGUXXaokk8sAS94c00IZnsf',
  token_endpoint: '/auth/v3/tenant_access_token/internal',
  // 表格 ID 配置（默认值，会被 auth.json 覆盖）
  table_ids: {
    // 剧集清单
    drama_list: 'tblYEW4YqqSmnsB5',
    // 剧集状态
    drama_status: 'tblJcLhLpEkmFkga',
    // 账户表
    account: 'tblrlxmzydVtPcbW',
  },
}

// 配置缓存
let cachedConfig = null
let lastFetchTime = 0
const CACHE_TTL = 60000 // 1分钟缓存

// 配置文件路径：优先使用生产环境路径，否则使用开发环境路径
const productionConfigPath = '/data/changdu-web-yu/auth.json'
const developmentConfigPath = path.join(__dirname, 'auth.json')

async function getConfigPath() {
  try {
    await fs.access(productionConfigPath)
    return productionConfigPath
  } catch {
    return developmentConfigPath
  }
}

/**
 * 从 auth.json 读取飞书配置
 */
export async function getFeishuConfig() {
  const now = Date.now()

  // 使用缓存
  if (cachedConfig && now - lastFetchTime < CACHE_TTL) {
    return cachedConfig
  }

  try {
    const configPath = await getConfigPath()
    const configContent = await fs.readFile(configPath, 'utf-8')
    const authConfig = JSON.parse(configContent)

    // 合并配置：auth.json 中的配置会覆盖默认配置
    cachedConfig = {
      ...FEISHU_CONFIG,
      app_token: authConfig.feishu?.app_token || FEISHU_CONFIG.app_token,
      table_ids: {
        drama_list: authConfig.feishu?.table_ids?.drama_list || FEISHU_CONFIG.table_ids.drama_list,
        drama_status:
          authConfig.feishu?.table_ids?.drama_status || FEISHU_CONFIG.table_ids.drama_status,
        account: authConfig.feishu?.table_ids?.account || FEISHU_CONFIG.table_ids.account,
      },
    }

    lastFetchTime = now
    return cachedConfig
  } catch (error) {
    console.error('读取飞书配置失败，使用默认配置:', error)
    // 如果读取失败，返回默认配置
    return FEISHU_CONFIG
  }
}

/**
 * 清除配置缓存（配置更新时调用）
 */
export function clearFeishuConfigCache() {
  cachedConfig = null
  lastFetchTime = 0
}
