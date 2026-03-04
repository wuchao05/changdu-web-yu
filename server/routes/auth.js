import Router from '@koa/router'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { clearFeishuConfigCache } from '../config/feishu.js'

const router = new Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 配置文件路径
 * 优先使用环境变量 AUTH_CONFIG_PATH
 * 生产环境：/data/changdu-web-yu/auth.json
 * 开发环境：server/config/auth.json（与旧 /api/config 一致）
 */
let CONFIG_FILE_PATH = process.env.AUTH_CONFIG_PATH || '/data/changdu-web-yu/auth.json'
const isProduction = process.env.NODE_ENV === 'production'

if (!isProduction) {
  CONFIG_FILE_PATH = path.join(__dirname, '../config/auth.json')
}

const DEFAULT_ADMIN_USER_ID = '2peWAuMpDOqXGj8'

const DEFAULT_SIMPLE_CONFIG = {
  changduCookie: '',
  juliangCookie: '',
  headers: {
    appid: '',
    apptype: '',
    distributorId: '',
    adUserId: '',
    rootAdUserId: '',
  },
  buildConfig: {
    secretKey: '',
    productId: '',
    productPlatformId: '',
    landingUrl: '',
    microAppName: '',
    microAppId: '',
    ccId: '',
    operator: '',
    rechargeTemplateId: '',
  },
  feishu: {
    app_token: '',
    table_ids: {
      drama_list: '',
      drama_status: '',
      account: '',
    },
  },
  douyinMaterialMatches: [],
}

const DEFAULT_PLATFORM_CONFIG = {
  changdu: {
    cookie: '',
    mr: { cookie: '', distributorId: '', adUserId: '', rootAdUserId: '' },
  },
  jiliang: {
    cookie: '',
  },
  ocean: {
    mr: '',
  },
  adx: {
    cookie: '',
  },
}

function normalizeDouyinMaterialMatches(matches = []) {
  if (!Array.isArray(matches)) {
    return []
  }

  return matches
    .filter(match => match && typeof match === 'object')
    .map((match, index) => {
      const now = new Date().toISOString()
      const douyinAccount =
        typeof match.douyinAccount === 'string' ? match.douyinAccount.trim() : ''
      const douyinAccountId =
        typeof match.douyinAccountId === 'string' ? match.douyinAccountId.trim() : ''
      const materialRange =
        typeof match.materialRange === 'string' ? match.materialRange.trim() : ''
      const createdAt =
        typeof match.createdAt === 'string' && match.createdAt ? match.createdAt : now
      const updatedAt =
        typeof match.updatedAt === 'string' && match.updatedAt ? match.updatedAt : now
      const id =
        typeof match.id === 'string' && match.id.trim() ? match.id.trim() : `${Date.now()}_${index}`

      return {
        id,
        douyinAccount,
        douyinAccountId,
        materialRange,
        createdAt,
        updatedAt,
      }
    })
    .filter(match => match.douyinAccount && match.douyinAccountId && match.materialRange)
}

function normalizeSimpleConfig(config = {}) {
  const headers = config.headers && typeof config.headers === 'object' ? config.headers : {}
  const buildConfig =
    config.buildConfig && typeof config.buildConfig === 'object' ? config.buildConfig : {}
  const feishu = config.feishu && typeof config.feishu === 'object' ? config.feishu : {}
  const tableIds = feishu.table_ids && typeof feishu.table_ids === 'object' ? feishu.table_ids : {}

  return {
    changduCookie: typeof config.changduCookie === 'string' ? config.changduCookie : '',
    juliangCookie: typeof config.juliangCookie === 'string' ? config.juliangCookie : '',
    headers: {
      appid:
        typeof headers.appid === 'string' ? headers.appid : DEFAULT_SIMPLE_CONFIG.headers.appid,
      apptype:
        typeof headers.apptype === 'string'
          ? headers.apptype
          : DEFAULT_SIMPLE_CONFIG.headers.apptype,
      distributorId:
        typeof headers.distributorId === 'string'
          ? headers.distributorId
          : DEFAULT_SIMPLE_CONFIG.headers.distributorId,
      adUserId:
        typeof headers.adUserId === 'string'
          ? headers.adUserId
          : DEFAULT_SIMPLE_CONFIG.headers.adUserId,
      rootAdUserId:
        typeof headers.rootAdUserId === 'string'
          ? headers.rootAdUserId
          : DEFAULT_SIMPLE_CONFIG.headers.rootAdUserId,
    },
    buildConfig: {
      secretKey:
        typeof buildConfig.secretKey === 'string'
          ? buildConfig.secretKey
          : DEFAULT_SIMPLE_CONFIG.buildConfig.secretKey,
      productId:
        typeof buildConfig.productId === 'string'
          ? buildConfig.productId
          : DEFAULT_SIMPLE_CONFIG.buildConfig.productId,
      productPlatformId:
        typeof buildConfig.productPlatformId === 'string'
          ? buildConfig.productPlatformId
          : DEFAULT_SIMPLE_CONFIG.buildConfig.productPlatformId,
      landingUrl:
        typeof buildConfig.landingUrl === 'string'
          ? buildConfig.landingUrl
          : DEFAULT_SIMPLE_CONFIG.buildConfig.landingUrl,
      microAppName:
        typeof buildConfig.microAppName === 'string'
          ? buildConfig.microAppName
          : DEFAULT_SIMPLE_CONFIG.buildConfig.microAppName,
      microAppId:
        typeof buildConfig.microAppId === 'string'
          ? buildConfig.microAppId
          : DEFAULT_SIMPLE_CONFIG.buildConfig.microAppId,
      ccId:
        typeof buildConfig.ccId === 'string'
          ? buildConfig.ccId
          : DEFAULT_SIMPLE_CONFIG.buildConfig.ccId,
      operator:
        typeof buildConfig.operator === 'string'
          ? buildConfig.operator
          : DEFAULT_SIMPLE_CONFIG.buildConfig.operator,
      rechargeTemplateId:
        typeof buildConfig.rechargeTemplateId === 'string'
          ? buildConfig.rechargeTemplateId
          : DEFAULT_SIMPLE_CONFIG.buildConfig.rechargeTemplateId,
    },
    feishu: {
      app_token: typeof feishu.app_token === 'string' ? feishu.app_token : '',
      table_ids: {
        drama_list: typeof tableIds.drama_list === 'string' ? tableIds.drama_list : '',
        drama_status: typeof tableIds.drama_status === 'string' ? tableIds.drama_status : '',
        account: typeof tableIds.account === 'string' ? tableIds.account : '',
      },
    },
    douyinMaterialMatches: normalizeDouyinMaterialMatches(config.douyinMaterialMatches),
  }
}

function buildRuntimeConfig(rawConfig = {}) {
  const simple = normalizeSimpleConfig(rawConfig)
  const headerConfig = simple.headers
  const tokens = rawConfig.tokens && typeof rawConfig.tokens === 'object' ? rawConfig.tokens : {}
  const users = rawConfig.users && typeof rawConfig.users === 'object' ? rawConfig.users : {}
  const platforms =
    rawConfig.platforms && typeof rawConfig.platforms === 'object' ? rawConfig.platforms : {}

  return {
    ...rawConfig,
    ...simple,
    tokens: {
      xh: typeof tokens.xh === 'string' ? tokens.xh : '',
    },
    users: {
      admin: typeof users.admin === 'string' && users.admin ? users.admin : DEFAULT_ADMIN_USER_ID,
    },
    headers: headerConfig,
    buildConfig: simple.buildConfig,
    platforms: {
      changdu: {
        cookie: platforms.changdu?.cookie || platforms.changdu?.mr?.cookie || simple.changduCookie,
        mr: {
          ...DEFAULT_PLATFORM_CONFIG.changdu.mr,
          ...(platforms.changdu?.mr || {}),
          cookie: platforms.changdu?.mr?.cookie || simple.changduCookie,
          distributorId: platforms.changdu?.mr?.distributorId || headerConfig.distributorId,
          adUserId: platforms.changdu?.mr?.adUserId || headerConfig.adUserId,
          rootAdUserId: platforms.changdu?.mr?.rootAdUserId || headerConfig.rootAdUserId,
        },
      },
      jiliang: {
        ...DEFAULT_PLATFORM_CONFIG.jiliang,
        ...(platforms.jiliang || {}),
        cookie: platforms.jiliang?.cookie || platforms.ocean?.mr || simple.juliangCookie,
      },
      ocean: {
        ...DEFAULT_PLATFORM_CONFIG.ocean,
        ...(platforms.ocean || {}),
        mr: platforms.ocean?.mr || simple.juliangCookie,
      },
      adx: {
        ...DEFAULT_PLATFORM_CONFIG.adx,
        ...(platforms.adx || {}),
      },
    },
  }
}

async function readConfigFile() {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8')
    const config = JSON.parse(data)
    return config && typeof config === 'object' ? config : { ...DEFAULT_SIMPLE_CONFIG }
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeConfigFile(DEFAULT_SIMPLE_CONFIG)
      return { ...DEFAULT_SIMPLE_CONFIG }
    }
    throw error
  }
}

async function writeConfigFile(config) {
  const dir = path.dirname(CONFIG_FILE_PATH)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * 读取认证配置（服务端内部使用）
 */
async function readAuthConfig() {
  const rawConfig = await readConfigFile()
  return buildRuntimeConfig(rawConfig)
}

/**
 * 写入认证配置（服务端内部使用）
 */
async function writeAuthConfig(config) {
  const current = await readConfigFile()
  const nextConfig = {
    ...current,
    ...(config && typeof config === 'object' ? config : {}),
  }
  await writeConfigFile(nextConfig)
}

/**
 * 获取配置
 * GET /api/auth/config
 */
router.get('/config', async ctx => {
  try {
    const rawConfig = await readConfigFile()
    ctx.body = {
      code: 0,
      message: 'success',
      data: normalizeSimpleConfig(rawConfig),
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
 * 更新配置
 * PUT /api/auth/config
 */
router.put('/config', async ctx => {
  try {
    const payload = ctx.request.body
    if (!payload || typeof payload !== 'object') {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: '无效的配置数据',
      }
      return
    }

    const current = await readConfigFile()
    const currentSimple = normalizeSimpleConfig(current)

    const nextSimple = {
      ...currentSimple,
      ...(Object.prototype.hasOwnProperty.call(payload, 'changduCookie')
        ? {
            changduCookie: typeof payload.changduCookie === 'string' ? payload.changduCookie : '',
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, 'juliangCookie')
        ? {
            juliangCookie: typeof payload.juliangCookie === 'string' ? payload.juliangCookie : '',
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, 'headers')
        ? {
            headers: {
              ...currentSimple.headers,
              ...(payload.headers && typeof payload.headers === 'object'
                ? {
                    ...(Object.prototype.hasOwnProperty.call(payload.headers, 'appid')
                      ? {
                          appid:
                            typeof payload.headers.appid === 'string' && payload.headers.appid
                              ? payload.headers.appid
                              : currentSimple.headers.appid,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(payload.headers, 'apptype')
                      ? {
                          apptype:
                            typeof payload.headers.apptype === 'string' && payload.headers.apptype
                              ? payload.headers.apptype
                              : currentSimple.headers.apptype,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(payload.headers, 'distributorId')
                      ? {
                          distributorId:
                            typeof payload.headers.distributorId === 'string' &&
                            payload.headers.distributorId
                              ? payload.headers.distributorId
                              : currentSimple.headers.distributorId,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(payload.headers, 'adUserId')
                      ? {
                          adUserId:
                            typeof payload.headers.adUserId === 'string' && payload.headers.adUserId
                              ? payload.headers.adUserId
                              : currentSimple.headers.adUserId,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(payload.headers, 'rootAdUserId')
                      ? {
                          rootAdUserId:
                            typeof payload.headers.rootAdUserId === 'string' &&
                            payload.headers.rootAdUserId
                              ? payload.headers.rootAdUserId
                              : currentSimple.headers.rootAdUserId,
                        }
                      : {}),
                  }
                : {}),
            },
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, 'buildConfig')
        ? {
            buildConfig: {
              ...currentSimple.buildConfig,
              ...(payload.buildConfig && typeof payload.buildConfig === 'object'
                ? {
                    ...(Object.prototype.hasOwnProperty.call(payload.buildConfig, 'secretKey')
                      ? {
                          secretKey:
                            typeof payload.buildConfig.secretKey === 'string'
                              ? payload.buildConfig.secretKey
                              : currentSimple.buildConfig.secretKey,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(payload.buildConfig, 'productId')
                      ? {
                          productId:
                            typeof payload.buildConfig.productId === 'string'
                              ? payload.buildConfig.productId
                              : currentSimple.buildConfig.productId,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(
                      payload.buildConfig,
                      'productPlatformId'
                    )
                      ? {
                          productPlatformId:
                            typeof payload.buildConfig.productPlatformId === 'string'
                              ? payload.buildConfig.productPlatformId
                              : currentSimple.buildConfig.productPlatformId,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(payload.buildConfig, 'landingUrl')
                      ? {
                          landingUrl:
                            typeof payload.buildConfig.landingUrl === 'string'
                              ? payload.buildConfig.landingUrl
                              : currentSimple.buildConfig.landingUrl,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(payload.buildConfig, 'microAppName')
                      ? {
                          microAppName:
                            typeof payload.buildConfig.microAppName === 'string'
                              ? payload.buildConfig.microAppName
                              : currentSimple.buildConfig.microAppName,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(payload.buildConfig, 'microAppId')
                      ? {
                          microAppId:
                            typeof payload.buildConfig.microAppId === 'string'
                              ? payload.buildConfig.microAppId
                              : currentSimple.buildConfig.microAppId,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(payload.buildConfig, 'ccId')
                      ? {
                          ccId:
                            typeof payload.buildConfig.ccId === 'string'
                              ? payload.buildConfig.ccId
                              : currentSimple.buildConfig.ccId,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(payload.buildConfig, 'operator')
                      ? {
                          operator:
                            typeof payload.buildConfig.operator === 'string'
                              ? payload.buildConfig.operator
                              : currentSimple.buildConfig.operator,
                        }
                      : {}),
                    ...(Object.prototype.hasOwnProperty.call(
                      payload.buildConfig,
                      'rechargeTemplateId'
                    )
                      ? {
                          rechargeTemplateId:
                            typeof payload.buildConfig.rechargeTemplateId === 'string'
                              ? payload.buildConfig.rechargeTemplateId
                              : currentSimple.buildConfig.rechargeTemplateId,
                        }
                      : {}),
                  }
                : {}),
            },
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, 'feishu')
        ? {
            feishu: normalizeSimpleConfig({ feishu: payload.feishu }).feishu,
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, 'douyinMaterialMatches')
        ? {
            douyinMaterialMatches: normalizeDouyinMaterialMatches(payload.douyinMaterialMatches),
          }
        : {}),
    }

    // 保留历史扩展字段，避免覆盖其它功能的配置
    const nextConfig = {
      ...current,
      ...nextSimple,
      ...(payload.tokens && typeof payload.tokens === 'object'
        ? {
            tokens: {
              ...(current.tokens && typeof current.tokens === 'object' ? current.tokens : {}),
              ...payload.tokens,
            },
          }
        : {}),
      ...(payload.users && typeof payload.users === 'object'
        ? {
            users: {
              ...(current.users && typeof current.users === 'object' ? current.users : {}),
              ...payload.users,
            },
          }
        : {}),
      ...(payload.platforms && typeof payload.platforms === 'object'
        ? {
            platforms: {
              ...(current.platforms && typeof current.platforms === 'object'
                ? current.platforms
                : {}),
              ...payload.platforms,
            },
          }
        : {}),
    }

    await writeConfigFile(nextConfig)
    clearFeishuConfigCache()

    ctx.body = {
      code: 0,
      message: '配置更新成功',
      data: normalizeSimpleConfig(nextConfig),
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

export { readAuthConfig, writeAuthConfig }
export default router
