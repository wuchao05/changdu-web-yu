import Router from '@koa/router'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const router = new Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 配置文件路径
 * 优先使用环境变量 AUTH_CONFIG_PATH 指定的路径
 * 生产环境：/data/changdu-web-yu/auth.json
 * 开发环境：降级到项目内路径
 */
let CONFIG_FILE_PATH = process.env.AUTH_CONFIG_PATH || '/data/changdu-web-yu/auth.json'

// 检测是否在开发环境
const isProduction = process.env.NODE_ENV === 'production'
if (!isProduction) {
  // 开发环境使用项目内路径
  CONFIG_FILE_PATH = path.join(__dirname, '../data/auth.json')
}

// 启动时打印配置文件路径
console.log('🔐 认证配置文件路径:', CONFIG_FILE_PATH)
console.log('🔐 环境: ', isProduction ? '生产环境' : '开发环境')
console.log('🔐 环境变量 AUTH_CONFIG_PATH:', process.env.AUTH_CONFIG_PATH || '未设置')

/**
 * 默认配置结构（v2: tokens + platforms + users）
 */
const DEFAULT_CONFIG = {
  tokens: {
    xh: '', // 散柔+牵龙共用的形天 token
    daren: '', // 达人的形天 token
  },
  users: {
    admin: '2peWAuMpDOqXGj8', // 管理员用户 ID（小红）
  },
  platforms: {
    changdu: {
      cookie: '',
      sr: { cookie: '', distributorId: '1842865091654731', adUserId: '', rootAdUserId: '' },
      ql: { cookie: '', distributorId: '1841142223098969', adUserId: '', rootAdUserId: '' },
      mr: { cookie: '', distributorId: '1844565955364887', adUserId: '', rootAdUserId: '' },
      dr: { cookie: '', distributorId: '1841149910426777' },
    },
    jiliang: {
      cookie: '',
    },
    ocean: {
      sr: '', // 散柔 Ocean Cookie
      ql: '', // 牵龙 Ocean Cookie
      mr: '', // 每日 Ocean Cookie
    },
    adx: {
      cookie: '',
    },
  },
  lastUpdated: new Date().toISOString(),
  version: '2.0.0',
}

/**
 * 读取认证配置
 */
async function readAuthConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8')
    const config = JSON.parse(data)
    // 确保配置结构完整（深度合并默认值）
    return {
      ...DEFAULT_CONFIG,
      ...config,
      tokens: {
        ...DEFAULT_CONFIG.tokens,
        ...config.tokens,
      },
      users: {
        ...DEFAULT_CONFIG.users,
        ...config.users,
      },
      platforms: {
        changdu: {
          cookie:
            config.platforms?.changdu?.cookie ||
            config.platforms?.changdu?.mr?.cookie ||
            config.platforms?.changdu?.sr?.cookie ||
            DEFAULT_CONFIG.platforms.changdu.cookie,
          sr: { ...DEFAULT_CONFIG.platforms.changdu.sr, ...config.platforms?.changdu?.sr },
          ql: { ...DEFAULT_CONFIG.platforms.changdu.ql, ...config.platforms?.changdu?.ql },
          mr: { ...DEFAULT_CONFIG.platforms.changdu.mr, ...config.platforms?.changdu?.mr },
          dr: { ...DEFAULT_CONFIG.platforms.changdu.dr, ...config.platforms?.changdu?.dr },
        },
        jiliang: {
          ...DEFAULT_CONFIG.platforms.jiliang,
          ...config.platforms?.jiliang,
          cookie:
            config.platforms?.jiliang?.cookie ||
            config.platforms?.ocean?.mr ||
            DEFAULT_CONFIG.platforms.jiliang.cookie,
        },
        ocean: {
          ...DEFAULT_CONFIG.platforms.ocean,
          ...config.platforms?.ocean,
        },
        adx: {
          ...DEFAULT_CONFIG.platforms.adx,
          ...config.platforms?.adx,
        },
      },
    }
  } catch (error) {
    // 如果文件不存在，返回默认配置
    if (error.code === 'ENOENT') {
      console.log('🔐 配置文件不存在，创建默认配置')
      await writeAuthConfig(DEFAULT_CONFIG)
      return DEFAULT_CONFIG
    }
    throw error
  }
}

/**
 * 写入认证配置
 */
async function writeAuthConfig(config) {
  // 确保目录存在
  const dir = path.dirname(CONFIG_FILE_PATH)
  await fs.mkdir(dir, { recursive: true })

  // 添加更新时间
  const configWithTimestamp = {
    ...config,
    lastUpdated: new Date().toISOString(),
  }

  // 写入文件，格式化为易读的 JSON
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(configWithTimestamp, null, 2), 'utf-8')
}

/**
 * 获取认证配置
 * GET /api/auth/config
 */
router.get('/config', async ctx => {
  try {
    const config = await readAuthConfig()
    ctx.body = {
      code: 0,
      message: 'success',
      data: config,
    }
  } catch (error) {
    console.error('读取认证配置失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '读取认证配置失败',
      error: error.message,
    }
  }
})

/**
 * 更新认证配置
 * PUT /api/auth/config
 * Body: { tokens: { ... }, platforms: { ... } }
 */
router.put('/config', async ctx => {
  try {
    const newConfig = ctx.request.body

    // 验证请求体
    if (!newConfig || typeof newConfig !== 'object') {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: '无效的配置数据',
      }
      return
    }

    // 读取现有配置
    const currentConfig = await readAuthConfig()

    // 合并配置（深度合并 tokens、users 和 platforms）
    const updatedConfig = {
      ...currentConfig,
      ...newConfig,
      tokens: {
        ...currentConfig.tokens,
        ...(newConfig.tokens || {}),
      },
      users: {
        ...currentConfig.users,
        ...(newConfig.users || {}),
      },
      platforms: {
        changdu: {
          cookie: newConfig.platforms?.changdu?.cookie ?? currentConfig.platforms.changdu.cookie,
          sr: {
            ...currentConfig.platforms.changdu.sr,
            ...(newConfig.platforms?.changdu?.sr || {}),
          },
          ql: {
            ...currentConfig.platforms.changdu.ql,
            ...(newConfig.platforms?.changdu?.ql || {}),
          },
          mr: {
            ...currentConfig.platforms.changdu.mr,
            ...(newConfig.platforms?.changdu?.mr || {}),
          },
          dr: {
            ...currentConfig.platforms.changdu.dr,
            ...(newConfig.platforms?.changdu?.dr || {}),
          },
        },
        jiliang: {
          ...currentConfig.platforms.jiliang,
          ...(newConfig.platforms?.jiliang || {}),
        },
        ocean: {
          ...currentConfig.platforms.ocean,
          ...(newConfig.platforms?.ocean || {}),
        },
        adx: {
          ...currentConfig.platforms.adx,
          ...(newConfig.platforms?.adx || {}),
        },
      },
    }

    // 写入配置
    await writeAuthConfig(updatedConfig)

    ctx.body = {
      code: 0,
      message: '配置更新成功',
      data: updatedConfig,
    }
  } catch (error) {
    console.error('更新认证配置失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '更新认证配置失败',
      error: error.message,
    }
  }
})

/**
 * 更新单个常读平台账号配置
 * PUT /api/auth/config/:account
 * account: sr | ql | mr
 * Body: { cookie, distributorId, adUserId, rootAdUserId }
 */
router.put('/config/:account', async ctx => {
  try {
    const { account } = ctx.params
    const accountData = ctx.request.body

    // 验证账号名称
    const validAccounts = ['sr', 'ql', 'mr', 'dr']
    if (!validAccounts.includes(account)) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: `无效的账号名称，必须是: ${validAccounts.join(', ')}`,
      }
      return
    }

    // 验证请求体
    if (!accountData || typeof accountData !== 'object') {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: '无效的账号配置数据',
      }
      return
    }

    // 读取现有配置
    const config = await readAuthConfig()

    // 更新指定账号的配置
    config.platforms.changdu[account] = {
      ...config.platforms.changdu[account],
      ...accountData,
    }

    // 写入配置
    await writeAuthConfig(config)

    ctx.body = {
      code: 0,
      message: `${account} 账号配置更新成功`,
      data: config.platforms.changdu[account],
    }
  } catch (error) {
    console.error('更新账号配置失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '更新账号配置失败',
      error: error.message,
    }
  }
})

/**
 * 更新 Ocean 配置
 * PUT /api/auth/config/ocean/:account
 * account: sr | ql | mr
 * Body: { cookie: "ocean_cookie_value" }
 */
router.put('/config/ocean/:account', async ctx => {
  try {
    const { account } = ctx.params
    const { cookie } = ctx.request.body

    // 验证账号名称
    const validAccounts = ['sr', 'ql', 'mr', 'dr']
    if (!validAccounts.includes(account)) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: `无效的 Ocean 账号名称，必须是: ${validAccounts.join(', ')}`,
      }
      return
    }

    // 验证请求体
    if (typeof cookie !== 'string') {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: '无效的 Cookie 数据',
      }
      return
    }

    // 读取现有配置
    const config = await readAuthConfig()

    // 更新指定账号的 Cookie
    config.platforms.ocean[account] = cookie

    // 写入配置
    await writeAuthConfig(config)

    ctx.body = {
      code: 0,
      message: `Ocean ${account} 账号配置更新成功`,
      data: {
        account,
        cookie: cookie.substring(0, 50) + '...', // 只返回前 50 个字符
      },
    }
  } catch (error) {
    console.error('更新 Ocean 配置失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '更新 Ocean 配置失败',
      error: error.message,
    }
  }
})

// 导出读写函数供其他路由使用
export { readAuthConfig, writeAuthConfig }
export default router
