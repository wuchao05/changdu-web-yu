import Router from 'koa-router'
import { DAILY_BUILD_CONFIG } from '../config/dailyBuild.js'
import { readAuthConfig } from './auth.js'
import { buildChangduPostHeaders } from '../utils/changduSign.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import FormData from 'form-data'
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerSchedulerBuild,
} from '../services/dailyBuildScheduler.js'
import {
  generateMicroAppLink,
  parsePromotionUrl,
  extractAppIdFromParams,
} from '../utils/dailyBuildUtils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = new Router({
  prefix: '/api/daily-build',
})

// 工具函数：清除剧名中的特殊符号
function cleanDramaName(name) {
  if (!name) return ''
  return name.replace(/[：，！?"']/g, '').trim()
}

// 工具函数：生成推广链接名称
function generatePromotionName(dramaName) {
  return `小鱼-${cleanDramaName(dramaName)}`
}

async function getJiliangCookie() {
  const config = await readAuthConfig()
  return config.platforms?.jiliang?.cookie || ''
}

function toDistributorIdNumber(rawDistributorId) {
  const value = String(rawDistributorId || '').trim()
  if (!/^\d+$/.test(value)) {
    throw new Error('auth.headers.distributorId 必须是数字')
  }

  return Number(value)
}

async function getChangduSignConfig() {
  const config = await readAuthConfig()
  const distributorId = config.headers?.distributorId
  if (!distributorId) {
    throw new Error('缺少 auth.headers.distributorId 配置')
  }
  const secretKey = config.buildConfig?.secretKey
  if (!secretKey) {
    throw new Error('缺少 auth.buildConfig.secretKey 配置')
  }
  return { distributorId: toDistributorIdNumber(distributorId), secretKey }
}

function toRechargeTemplateIdNumber(rawRechargeTemplateId) {
  const value = String(rawRechargeTemplateId || '').trim()
  if (!/^\d+$/.test(value)) {
    throw new Error('auth.buildConfig.rechargeTemplateId 必须是数字')
  }

  return Number(value)
}

function toBidNumber(rawBid) {
  const value = String(rawBid || '').trim()
  if (!value) {
    return 2
  }
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error('auth.buildConfig.bid 必须是数字')
  }

  return Number(value)
}

async function getBuildConfig() {
  const config = await readAuthConfig()
  const buildConfig = config.buildConfig || {}

  const requiredKeys = [
    'ccId',
    'microAppName',
    'microAppId',
    'productId',
    'productPlatformId',
    'landingUrl',
    'rechargeTemplateId',
  ]

  for (const key of requiredKeys) {
    if (!buildConfig[key]) {
      throw new Error(`缺少 auth.buildConfig.${key} 配置`)
    }
  }

  return {
    ccId: buildConfig.ccId,
    microAppName: buildConfig.microAppName,
    microAppId: buildConfig.microAppId,
    source: buildConfig.source || DAILY_BUILD_CONFIG.build.promotion.source,
    productId: buildConfig.productId,
    productPlatformId: buildConfig.productPlatformId,
    landingUrl: buildConfig.landingUrl,
    bid: toBidNumber(buildConfig.bid),
    rechargeTemplateId: toRechargeTemplateIdNumber(buildConfig.rechargeTemplateId),
  }
}

/**
 * 创建推广链接（常读openapi）
 */
router.post('/create-promotion-link', async ctx => {
  const startedAt = Date.now()
  const traceId = `promotion-link-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
  const logPrefix = `[create-promotion-link][${traceId}]`

  try {
    const { book_id, drama_name, promotion_name } = ctx.request.body

    console.log(`${logPrefix} 开始处理请求`)
    console.log(`${logPrefix} 入参:`, {
      book_id,
      drama_name,
      promotion_name,
      method: ctx.method,
      path: ctx.path,
      ip: ctx.ip,
    })

    if (!book_id || !drama_name) {
      console.warn(`${logPrefix} 参数缺失: book_id 或 drama_name`)
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: book_id, drama_name' }
      return
    }

    // 使用传入的 promotion_name，如果没有则使用默认格式
    const finalPromotionName = promotion_name || generatePromotionName(drama_name)

    console.log(`${logPrefix} 最终推广名: ${finalPromotionName}`)
    console.log(`${logPrefix} 请求URL: ${DAILY_BUILD_CONFIG.changdu.baseUrl}/promotion/create/v1`)

    const { distributorId, secretKey } = await getChangduSignConfig()
    const buildConfig = await getBuildConfig()
    console.log(`${logPrefix} 配置快照:`, {
      distributorId,
      secretKeyLength: secretKey.length,
      rechargeTemplateId: buildConfig.rechargeTemplateId,
      mediaSource: DAILY_BUILD_CONFIG.promotion.mediaSource,
      price: DAILY_BUILD_CONFIG.promotion.price,
      startChapter: DAILY_BUILD_CONFIG.promotion.startChapter,
    })

    // 构建请求体
    const requestBody = {
      distributor_id: distributorId,
      book_id: book_id,
      index: DAILY_BUILD_CONFIG.promotion.index,
      promotion_name: finalPromotionName,
      recharge_template_id: buildConfig.rechargeTemplateId,
      media_source: DAILY_BUILD_CONFIG.promotion.mediaSource,
      price: DAILY_BUILD_CONFIG.promotion.price,
      start_chapter: DAILY_BUILD_CONFIG.promotion.startChapter,
    }

    console.log(`${logPrefix} 请求体:`, requestBody)

    // 生成签名头部
    const { headers: signHeaders } = buildChangduPostHeaders(
      requestBody,
      undefined,
      distributorId,
      secretKey
    )

    console.log(`${logPrefix} 签名头部:`, signHeaders)

    // 调用常读openapi
    const upstreamStartAt = Date.now()
    const response = await fetch(`${DAILY_BUILD_CONFIG.changdu.baseUrl}/promotion/create/v1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...signHeaders,
      },
      body: JSON.stringify(requestBody),
    })

    const upstreamCost = Date.now() - upstreamStartAt
    console.log(
      `${logPrefix} 上游响应状态: ${response.status} ${response.statusText}, 耗时: ${upstreamCost}ms`
    )

    // 获取响应文本
    const responseText = await response.text()
    console.log(`${logPrefix} 上游响应内容:`, responseText)

    // 尝试解析JSON
    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error(`${logPrefix} 解析常读API响应失败:`, parseError)
      ctx.status = 500
      ctx.body = {
        error: '常读API返回了无效的JSON响应',
        response_text: responseText.substring(0, 500), // 只返回前500个字符
      }
      return
    }

    console.log(`${logPrefix} 创建推广链接完成:`, {
      code: result?.code,
      message: result?.message || result?.msg,
      totalCost: `${Date.now() - startedAt}ms`,
    })
    ctx.body = result
  } catch (error) {
    console.error(`${logPrefix} 创建推广链接失败, 耗时: ${Date.now() - startedAt}ms`, error)
    ctx.status = 500
    ctx.body = { error: error.message || '创建推广链接失败' }
  }
})

/**
 * 查询小程序（巨量API）
 */
router.post('/query-microapp', async ctx => {
  try {
    const { account_id } = ctx.request.body

    if (!account_id) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id' }
      return
    }

    // 从配置获取巨量cookie
    const cookie = await getJiliangCookie()

    console.log('========== 查询小程序 ==========')
    console.log('account_id:', account_id)

    const { ccId } = await getBuildConfig()

    // 构建URL和查询参数
    const url = new URL('https://business.oceanengine.com/app_package/microapp/applet/list')
    url.searchParams.set('page_no', '1')
    url.searchParams.set('page_size', '10')
    url.searchParams.set('search_key', '')
    url.searchParams.set('search_type', '1')
    url.searchParams.set('status', '-1') // 查询所有状态的小程序
    url.searchParams.set('adv_id', account_id)
    url.searchParams.set('cc_id', ccId)
    url.searchParams.set('operator', ccId)
    url.searchParams.set('operation_type', '1')

    console.log('请求URL:', url.toString())

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-tt-hume-platform': 'bp',
        Cookie: cookie,
      },
    })

    const result = await response.json()

    console.log('查询小程序响应:', JSON.stringify(result, null, 2))
    console.log('查询到的小程序数量:', result.data?.applets?.length || 0)
    if (result.data?.applets && result.data.applets.length > 0) {
      console.log('第一个小程序:', JSON.stringify(result.data.applets[0], null, 2))
    }
    console.log('====================================')

    // 转换响应格式以保持前端兼容性
    // 新接口返回 data.applets，旧接口返回 data.micro_app
    // 新接口字段名是 instance_id，需要映射为 micro_app_instance_id
    if (result.data) {
      // 映射字段名以保持兼容性
      const applets = result.data.applets || []
      const mappedApplets = applets.map(applet => ({
        ...applet,
        micro_app_instance_id: applet.instance_id, // 映射字段名
      }))

      ctx.body = {
        ...result,
        data: {
          ...result.data,
          micro_app: mappedApplets, // 映射为旧字段名（即使是空数组也要返回）
        },
      }
    } else {
      // 如果连 data 字段都没有，返回空结构
      ctx.body = {
        ...result,
        data: {
          micro_app: [],
        },
      }
    }
  } catch (error) {
    console.error('查询小程序失败:', error)
    ctx.status = 500
    ctx.body = { error: error.message || '查询小程序失败' }
  }
})

/**
 * 查询被共享的已审核通过的小程序（search_type=2）
 * 用于优化资产化流程，优先使用被共享的已审核通过的小程序
 */
router.post('/query-approved-microapp', async ctx => {
  try {
    const { account_id } = ctx.request.body

    if (!account_id) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id' }
      return
    }

    const cookie = await getJiliangCookie()

    console.log('========== 查询被共享的已审核通过的小程序 ==========')
    console.log('account_id:', account_id)

    const { ccId, microAppId } = await getBuildConfig()

    // 使用 search_type=2 查询被共享的已审核通过的小程序
    const url = new URL('https://business.oceanengine.com/app_package/microapp/applet/list')
    url.searchParams.set('page_no', '1')
    url.searchParams.set('page_size', '10')
    url.searchParams.set('search_key', '')
    url.searchParams.set('search_type', '2') // search_type=2 查询被共享的已审核通过的小程序
    url.searchParams.set('status', '-1')
    url.searchParams.set('adv_id', account_id)
    url.searchParams.set('cc_id', ccId)
    url.searchParams.set('operator', ccId)
    url.searchParams.set('operation_type', '1')

    console.log('请求URL:', url.toString())

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-tt-hume-platform': 'bp',
        Cookie: cookie,
      },
    })

    const result = await response.json()

    console.log('查询被共享的已审核通过的小程序响应:', JSON.stringify(result, null, 2))
    console.log('查询到的小程序数量:', result.data?.applets?.length || 0)
    console.log('====================================')

    // 从返回结果中找到 status=1 的小程序
    const applets = result.data?.applets || []
    const approvedApplets = applets.filter(applet => applet.status === 1)
    let approvedApplet = approvedApplets[0]

    // 如果有多个候选，优先匹配配置中的 microAppId（对应返回的 app_id）
    if (approvedApplets.length > 1 && microAppId) {
      const matchedApplets = approvedApplets.filter(
        applet => String(applet.app_id || '') === String(microAppId)
      )
      if (matchedApplets.length > 0) {
        approvedApplet = matchedApplets[matchedApplets.length - 1]
      }
      console.log('匹配配置 app_id 的候选数量:', matchedApplets.length)
    }

    console.log('已审核通过的小程序数量:', approvedApplets.length)
    console.log('配置的 microAppId:', microAppId)
    console.log('最终选中的 app_id:', approvedApplet?.app_id || '未选中')

    if (approvedApplet) {
      console.log('找到被共享的已审核通过的小程序:', approvedApplet.instance_id)
      ctx.body = {
        code: 0,
        message: 'success',
        data: {
          found: true,
          micro_app: {
            ...approvedApplet,
            micro_app_instance_id: approvedApplet.instance_id,
          },
        },
      }
    } else {
      console.log('未找到被共享的已审核通过的小程序')
      ctx.body = {
        code: 0,
        message: 'success',
        data: {
          found: false,
          micro_app: null,
        },
      }
    }
  } catch (error) {
    console.error('查询被共享的已审核通过的小程序失败:', error)
    ctx.status = 500
    ctx.body = { error: error.message || '查询被共享的已审核通过的小程序失败' }
  }
})

/**
 * 查询小程序资产列表
 */
router.post('/list-assets', async ctx => {
  const startedAt = Date.now()
  const traceId = `list-assets-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
  const logPrefix = `[list-assets][${traceId}]`

  try {
    const { account_id } = ctx.request.body

    if (!account_id) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id' }
      return
    }

    const cookie = await getJiliangCookie()

    console.log(`${logPrefix} 开始查询小程序资产, account_id: ${account_id}`)

    const response = await fetch(
      `https://ad.oceanengine.com/event_manager/v2/api/assets/ad/list?aadvid=${account_id}`,
      {
        method: 'POST',
        headers: {
          platform: 'ad',
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assets_types: [1, 3, 2, 7, 4, 5],
          role: 1,
        }),
      }
    )

    const result = await response.json()
    const microAppAssets = Array.isArray(result?.data?.micro_app) ? result.data.micro_app : []

    console.log(`${logPrefix} 查询小程序资产结果:`, JSON.stringify(result, null, 2))
    console.log(`${logPrefix} micro_app 数量: ${microAppAssets.length}`)
    if (microAppAssets.length === 0) {
      console.log(`${logPrefix} 未找到小程序资产，下一步应调用 /api/daily-build/create-asset`)
    } else {
      console.log(
        `${logPrefix} 已找到小程序资产，首个 assets_id: ${microAppAssets[0]?.assets_id || '未知'}`
      )
    }
    console.log(`${logPrefix} 完成, 耗时: ${Date.now() - startedAt}ms`)

    ctx.body = result
  } catch (error) {
    console.error(`${logPrefix} 查询小程序资产失败, 耗时: ${Date.now() - startedAt}ms`, error)
    ctx.status = 500
    ctx.body = { error: error.message || '查询小程序资产失败' }
  }
})

/**
 * 创建小程序资产
 */
router.post('/create-asset', async ctx => {
  const startedAt = Date.now()
  const traceId = `create-asset-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
  const logPrefix = `[create-asset][${traceId}]`

  try {
    const { account_id, micro_app_instance_id } = ctx.request.body

    if (!account_id || !micro_app_instance_id) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id, micro_app_instance_id' }
      return
    }

    const cookie = await getJiliangCookie()
    const buildConfig = await getBuildConfig()
    console.log(`${logPrefix} 开始创建小程序资产:`, {
      account_id,
      micro_app_instance_id,
      micro_app_id: buildConfig.microAppId,
      micro_app_name: buildConfig.microAppName,
    })

    const requestBody = {
      assets_type: 4,
      micro_app: {
        assets_name: buildConfig.microAppName,
        micro_app_id: buildConfig.microAppId,
        micro_app_name: buildConfig.microAppName,
        micro_app_type: 1,
        micro_app_instance_id: micro_app_instance_id,
      },
    }
    console.log(`${logPrefix} 请求体:`, requestBody)

    const response = await fetch(
      `https://ad.oceanengine.com/event_manager/api/assets/create?aadvid=${account_id}`,
      {
        method: 'POST',
        headers: {
          platform: 'ad',
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    const result = await response.json()
    console.log(`${logPrefix} 上游响应状态: ${response.status} ${response.statusText}`)
    console.log(`${logPrefix} 创建小程序资产结果:`, JSON.stringify(result, null, 2))
    console.log(`${logPrefix} 完成, 耗时: ${Date.now() - startedAt}ms`)

    ctx.body = result
  } catch (error) {
    console.error(`${logPrefix} 创建小程序资产失败, 耗时: ${Date.now() - startedAt}ms`, error)
    ctx.status = 500
    ctx.body = { error: error.message || '创建小程序资产失败' }
  }
})

/**
 * 查询事件状态
 */
router.post('/check-event', async ctx => {
  const startedAt = Date.now()
  const traceId = `check-event-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
  const logPrefix = `[check-event][${traceId}]`

  try {
    const { account_id, assets_id } = ctx.request.body

    if (!account_id || !assets_id) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id, assets_id' }
      return
    }

    const cookie = await getJiliangCookie()

    console.log(`${logPrefix} 开始查询事件状态:`, { account_id, assets_id })

    const response = await fetch(
      `https://ad.oceanengine.com/event_manager/v2/api/event/track/status/${assets_id}?aadvid=${account_id}`,
      {
        method: 'GET',
        headers: {
          platform: 'ad',
          Cookie: cookie,
        },
      }
    )

    const result = await response.json()
    console.log(`${logPrefix} 查询事件状态结果:`, JSON.stringify(result, null, 2))

    // 检查是否已存在"付费"事件
    const hasPaymentEvent = result.data?.track_status?.some(event => event.event_name === '付费')

    console.log(`${logPrefix} 是否已存在付费事件:`, hasPaymentEvent)
    if (!hasPaymentEvent) {
      console.log(`${logPrefix} 未检测到付费事件，下一步应调用 /api/daily-build/add-event`)
    }
    console.log(`${logPrefix} 完成, 耗时: ${Date.now() - startedAt}ms`)

    ctx.body = {
      ...result,
      has_payment_event: hasPaymentEvent,
    }
  } catch (error) {
    console.error(`${logPrefix} 查询事件状态失败, 耗时: ${Date.now() - startedAt}ms`, error)
    ctx.status = 500
    ctx.body = { error: error.message || '查询事件状态失败' }
  }
})

/**
 * 添加付费事件
 */
router.post('/add-event', async ctx => {
  const startedAt = Date.now()
  const traceId = `add-event-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
  const logPrefix = `[add-event][${traceId}]`

  try {
    const { account_id, assets_id } = ctx.request.body

    if (!account_id || !assets_id) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id, assets_id' }
      return
    }

    const cookie = await getJiliangCookie()
    console.log(`${logPrefix} 开始添加付费事件:`, { account_id, assets_id })

    const requestBody = {
      link_name: DAILY_BUILD_CONFIG.event.linkName,
      events: [
        {
          event_enum: DAILY_BUILD_CONFIG.event.eventEnum,
          event_type: DAILY_BUILD_CONFIG.event.eventType,
          event_name: DAILY_BUILD_CONFIG.event.eventName,
          track_types: DAILY_BUILD_CONFIG.event.trackTypes,
          statistical_method_type: DAILY_BUILD_CONFIG.event.statisticalMethodType,
          discrimination_value: {
            value_type: 0,
            dimension: 0,
            groups: [],
          },
        },
      ],
      assets_id: assets_id,
    }
    console.log(`${logPrefix} 请求体:`, requestBody)

    const response = await fetch(
      `https://ad.oceanengine.com/event_manager/v2/api/event/config/create?aadvid=${account_id}`,
      {
        method: 'POST',
        headers: {
          platform: 'ad',
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    const result = await response.json()
    console.log(`${logPrefix} 上游响应状态: ${response.status} ${response.statusText}`)
    console.log(`${logPrefix} 添加付费事件结果:`, JSON.stringify(result, null, 2))
    console.log(`${logPrefix} 完成, 耗时: ${Date.now() - startedAt}ms`)

    ctx.body = result
  } catch (error) {
    console.error(`${logPrefix} 添加付费事件失败, 耗时: ${Date.now() - startedAt}ms`, error)
    ctx.status = 500
    ctx.body = { error: error.message || '添加付费事件失败' }
  }
})

/**
 * 上传头像图片
 */
router.post('/upload-avatar-image', async ctx => {
  try {
    const { account_id } = ctx.request.body

    if (!account_id) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id' }
      return
    }

    const cookie = await getJiliangCookie()

    console.log('========== 上传头像图片 ==========')
    console.log('account_id:', account_id)

    // 读取图片文件
    const imagePath = path.join(__dirname, '../assets/cover.png')
    console.log('图片路径:', imagePath)

    if (!fs.existsSync(imagePath)) {
      ctx.status = 500
      ctx.body = { error: '头像图片文件不存在' }
      return
    }

    const imageBuffer = fs.readFileSync(imagePath)
    console.log('图片大小:', imageBuffer.length, 'bytes')

    // 构建 FormData
    const formData = new FormData()
    formData.append('file', imageBuffer, {
      filename: 'cover.png',
      contentType: 'image/png',
    })
    formData.append('width', '300')
    formData.append('height', '300')

    // 获取 FormData 的 headers（包含正确的 Content-Type 和 boundary）
    const formHeaders = formData.getHeaders()
    console.log('FormData Content-Type:', formHeaders['content-type'])

    // 上传图片 - 注意：需要将 formData 转换为 buffer 或 stream
    const response = await fetch(
      `https://ad.oceanengine.com/aadv/api/account/upload_image_v2?aadvid=${account_id}`,
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'content-type': formHeaders['content-type'], // 只设置 content-type，包含 boundary
        },
        body: formData.getBuffer(), // 使用 getBuffer() 获取完整的 FormData buffer
      }
    )

    console.log('上传图片响应状态:', response.status, response.statusText)

    // 获取响应文本
    const responseText = await response.text()
    console.log('上传图片响应内容:', responseText)

    // 尝试解析JSON
    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('解析巨量API响应失败:', parseError)
      ctx.status = 500
      ctx.body = {
        error: '巨量API返回了无效的JSON响应',
        response_text: responseText.substring(0, 500), // 只返回前500个字符
      }
      return
    }

    console.log('上传头像图片结果:', JSON.stringify(result, null, 2))
    console.log('====================================')

    ctx.body = result
  } catch (error) {
    console.error('上传头像图片失败:', error)
    ctx.status = 500
    ctx.body = { error: error.message || '上传头像图片失败' }
  }
})

/**
 * 保存头像
 */
router.post('/save-avatar', async ctx => {
  try {
    const { account_id, web_uri, width, height } = ctx.request.body

    if (!account_id || !web_uri) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id, web_uri' }
      return
    }

    const cookie = await getJiliangCookie()

    console.log('========== 保存头像 ==========')
    console.log('account_id:', account_id)
    console.log('web_uri:', web_uri)
    console.log('width:', width)
    console.log('height:', height)

    const response = await fetch(
      `https://ad.oceanengine.com/account/api/v2/adv/saveAvatar?accountId=${account_id}&aadvid=${account_id}`,
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatarInfo: {
            webUri: web_uri,
            width: width || 300,
            height: height || 300,
          },
        }),
      }
    )

    const result = await response.json()
    console.log('保存头像结果:', JSON.stringify(result, null, 2))
    console.log('====================================')

    // code 200 表示成功，410001 表示"没有任何修改"（也算成功）
    if (result.code === 200 || result.code === 410001) {
      ctx.body = { code: 200, message: 'success', data: result.data }
    } else {
      ctx.body = result
    }
  } catch (error) {
    console.error('保存头像失败:', error)
    ctx.status = 500
    ctx.body = { error: error.message || '保存头像失败' }
  }
})

/**
 * 获取小程序详情
 */
router.post('/get-microapp-detail', async ctx => {
  try {
    const { account_id, micro_app_instance_id } = ctx.request.body

    if (!account_id || !micro_app_instance_id) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id, micro_app_instance_id' }
      return
    }

    const cookie = await getJiliangCookie()

    console.log('========== 获取小程序详情 ==========')
    console.log('account_id:', account_id)
    console.log('micro_app_instance_id:', micro_app_instance_id)

    // 使用正确的接口地址（参考需求文档 3.4节）
    const url = new URL('https://ad.oceanengine.com/superior/api/v2/ad/applet/link')
    url.searchParams.set('aadvid', account_id)
    url.searchParams.set('micro_app_instance_id', micro_app_instance_id)
    url.searchParams.set('page', '1')
    url.searchParams.set('page_size', '20')
    url.searchParams.set('search_key', '')
    url.searchParams.set('order_type', '4')
    url.searchParams.set('app_status', '1')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Cookie: cookie,
      },
    })

    console.log('获取小程序详情响应状态:', response.status, response.statusText)

    // 获取响应文本
    const responseText = await response.text()
    console.log('获取小程序详情响应内容:', responseText.substring(0, 500))

    // 尝试解析JSON
    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('解析巨量API响应失败:', parseError)
      ctx.status = 500
      ctx.body = {
        error: '巨量API返回了无效的JSON响应',
        response_text: responseText.substring(0, 500),
      }
      return
    }

    console.log('获取小程序详情结果:', JSON.stringify(result, null, 2))
    console.log('====================================')

    ctx.body = result
  } catch (error) {
    console.error('获取小程序详情失败:', error)
    ctx.status = 500
    ctx.body = { error: error.message || '获取小程序详情失败' }
  }
})

/**
 * 上传主图
 */
router.post('/upload-product-image', async ctx => {
  try {
    const { account_id } = ctx.request.body

    if (!account_id) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id' }
      return
    }

    const cookie = await getJiliangCookie()

    console.log('========== 上传主图 ==========')
    console.log('account_id:', account_id)

    // 读取 cover.png 图片文件
    const imagePath = path.join(__dirname, '../assets/cover.png')
    console.log('图片路径:', imagePath)

    if (!fs.existsSync(imagePath)) {
      ctx.status = 500
      ctx.body = { error: '主图文件不存在: ' + imagePath }
      return
    }

    const imageBuffer = fs.readFileSync(imagePath)
    console.log('图片大小:', imageBuffer.length, 'bytes')

    // 构建 FormData（字段名使用 fileData，与 curl 命令保持一致）
    const formData = new FormData()
    formData.append('fileData', imageBuffer, {
      filename: 'cover.png',
      contentType: 'image/png',
    })

    const formHeaders = formData.getHeaders()

    // 上传图片（使用正确的接口地址）
    const response = await fetch(
      `https://ad.oceanengine.com/superior/api/v2/creative/material/picture/upload?aadvid=${account_id}`,
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'content-type': formHeaders['content-type'],
        },
        body: formData.getBuffer(),
      }
    )

    console.log('上传主图响应状态:', response.status, response.statusText)

    const responseText = await response.text()
    console.log('上传主图响应内容:', responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('解析巨量API响应失败:', parseError)
      ctx.status = 500
      ctx.body = {
        error: '巨量API返回了无效的JSON响应',
        response_text: responseText.substring(0, 500),
      }
      return
    }

    console.log('上传主图结果:', JSON.stringify(result, null, 2))
    console.log('====================================')

    ctx.body = result
  } catch (error) {
    console.error('上传主图失败:', error)
    ctx.status = 500
    ctx.body = { error: error.message || '上传主图失败' }
  }
})

/**
 * 创建项目
 */
router.post('/create-project', async ctx => {
  try {
    const {
      account_id,
      drama_name,
      douyin_account_name,
      assets_id,
      micro_app_instance_id,
      project_name,
    } = ctx.request.body

    if (!account_id || !drama_name || !assets_id || !micro_app_instance_id) {
      ctx.status = 400
      ctx.body = {
        error: '缺少必要参数: account_id, drama_name, assets_id, micro_app_instance_id',
      }
      return
    }

    const cookie = await getJiliangCookie()
    const projectConfig = DAILY_BUILD_CONFIG.build.project
    const buildConfig = await getBuildConfig()

    console.log('========== 创建项目 ==========')
    console.log('account_id:', account_id)
    console.log('drama_name:', drama_name)
    console.log('douyin_account_name:', douyin_account_name)
    console.log('assets_id:', assets_id)
    console.log('micro_app_instance_id:', micro_app_instance_id)
    console.log('project_name (custom):', project_name)

    // 使用前端传递的项目名称，如果没有则使用默认规则
    const finalProjectName =
      project_name ||
      (douyin_account_name ? `${drama_name}-小鱼-${douyin_account_name}` : `${drama_name}`)

    // 根据需求文档和 curl 示例构建完整请求体
    const requestBody = {
      track_url_group_info: {},
      track_url: [],
      action_track_url: [],
      first_frame: [],
      last_frame: [],
      effective_frame: [],
      track_url_send_type: '2',
      smart_bid_type: 0,
      bid: buildConfig.bid,
      is_search_speed_phase_four: false,
      budget: projectConfig.budget,
      inventory_catalog: projectConfig.inventory_catalog,
      flow_control_mode: projectConfig.flow_control_mode,
      delivery_mode: 3,
      delivery_package: 0,
      landing_type: 16,
      delivery_related_num: 1,
      name: finalProjectName,
      schedule_type: 1,
      week_schedule_type: 0,
      pricing_type: 9,
      product_platform_id: buildConfig.productPlatformId,
      product_id: buildConfig.productId,
      district: 'all',
      gender: '0',
      age: [['0', '17']],
      retargeting_tags: [],
      platform: ['0'],
      hide_if_converted: '1',
      cdp_marketing_goal: 1,
      asset_ids: [assets_id.toString()],
      external_action: '14',
      budget_mode: projectConfig.budget_mode,
      campaign_type: 1,
      micro_promotion_type: 4,
      asset_name: '',
      smart_inventory: 3,
      auto_ad_type: 1,
      micro_app_instance_id: micro_app_instance_id,
      products: [],
      aigc_dynamic_creative_switch: 0,
      is_search_3_online: true,
    }

    console.log('请求体:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(
      `https://ad.oceanengine.com/superior/api/v2/project/create?aadvid=${account_id}`,
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    const result = await response.json()
    console.log('创建项目结果:', JSON.stringify(result, null, 2))
    console.log('====================================')

    ctx.body = result
  } catch (error) {
    console.error('创建项目失败:', error)
    ctx.status = 500
    ctx.body = { error: error.message || '创建项目失败' }
  }
})

/**
 * 获取抖音号原始ID
 */
router.post('/get-douyin-account-info', async ctx => {
  try {
    const { account_id, douyin_account_id } = ctx.request.body

    if (!account_id || !douyin_account_id) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id, douyin_account_id' }
      return
    }

    const cookie = await getJiliangCookie()

    console.log('========== 获取抖音号原始ID ==========')
    console.log('account_id:', account_id)
    console.log('douyin_account_id:', douyin_account_id)

    // 根据需求文档和 curl 示例构建请求体
    const requestBody = {
      page_index: 1,
      page_size: 100,
      uniq_id_or_short_id: douyin_account_id,
      need_limits_info: true,
      need_limit_scenes: [4],
      level: [1, 4, 5, 7],
      need_auth_extra_info: true,
      dpa_id: '',
    }

    console.log('请求体:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(
      `https://ad.oceanengine.com/superior/api/v2/ad/authorize/list?aadvid=${account_id}`,
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    const result = await response.json()
    console.log('获取抖音号信息结果:', JSON.stringify(result, null, 2))
    console.log('====================================')

    ctx.body = result
  } catch (error) {
    console.error('获取抖音号信息失败:', error)
    ctx.status = 500
    ctx.body = { error: error.message || '获取抖音号信息失败' }
  }
})

/**
 * 获取素材列表
 */
router.post('/get-material-list', async ctx => {
  try {
    const { account_id, aweme_id, aweme_account } = ctx.request.body

    if (!account_id || !aweme_id || !aweme_account) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: account_id, aweme_id, aweme_account' }
      return
    }

    const cookie = await getJiliangCookie()

    console.log('========== 获取素材列表 ==========')
    console.log('account_id:', account_id)
    console.log('aweme_id:', aweme_id)
    console.log('aweme_account:', aweme_account)

    // 根据需求文档和 curl 示例构建 GET 请求 URL
    const queryParams = new URLSearchParams({
      aadvid: account_id,
      image_mode: '5,15',
      sort_type: 'desc',
      metric_names: 'create_time,stat_cost,ctr',
      aweme_id: aweme_id,
      aweme_account: aweme_account,
      'auth_level[]': '5',
      landing_type: '16',
      external_action: '14',
      page: '1',
      limit: '100',
      version: 'v2',
      operation_platform: '1',
    })

    const url = `https://ad.oceanengine.com/superior/api/v2/video/list?${queryParams.toString()}`
    console.log('请求URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Cookie: cookie,
      },
    })

    const responseText = await response.text()
    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('JSON解析失败:', parseError)
      console.error('响应内容:', responseText.substring(0, 500))
      ctx.status = 500
      ctx.body = {
        error: `JSON解析失败: ${parseError.message}`,
        response: responseText.substring(0, 500),
      }
      return
    }

    console.log('获取素材列表结果 (视频数量):', result.data?.videos?.length || 0)
    console.log('====================================')

    ctx.body = result
  } catch (error) {
    console.error('获取素材列表失败:', error)
    ctx.status = 500
    ctx.body = { error: error.message || '获取素材列表失败' }
  }
})

/**
 * 创建广告
 */
router.post('/create-promotion', async ctx => {
  try {
    const {
      account_id,
      project_id,
      ad_name,
      drama_name,
      ies_core_user_id,
      materials,
      app_id,
      start_page,
      app_type,
      start_params,
      link,
      product_image_uri,
      product_image_width,
      product_image_height,
    } = ctx.request.body

    if (
      !account_id ||
      !project_id ||
      !ad_name ||
      !drama_name ||
      !ies_core_user_id ||
      !materials ||
      !Array.isArray(materials) ||
      materials.length === 0 ||
      !app_id ||
      !product_image_uri
    ) {
      ctx.status = 400
      ctx.body = {
        error:
          '缺少必要参数: account_id, project_id, ad_name, drama_name, ies_core_user_id, materials (数组), app_id, product_image_uri',
      }
      return
    }

    const cookie = await getJiliangCookie()
    const promotionConfig = DAILY_BUILD_CONFIG.build.promotion
    const buildConfig = await getBuildConfig()

    console.log('========== 创建广告 ==========')
    console.log('account_id:', account_id)
    console.log('project_id:', project_id)
    console.log('ad_name:', ad_name)
    console.log('drama_name:', drama_name)
    console.log('ies_core_user_id:', ies_core_user_id)
    console.log('素材数量:', materials.length)
    console.log('素材IDs:', materials.map(m => m.video_id).join(', '))

    // 将所有素材转换为 video_material_info 数组
    const videoMaterialInfo = materials.map(material => {
      // 处理 image_info，确保包含 sign_url
      let imageInfo
      if (
        material.image_info &&
        Array.isArray(material.image_info) &&
        material.image_info.length > 0
      ) {
        // 如果素材已经有 image_info 数组，使用它并确保有 sign_url
        imageInfo = material.image_info.map(img => ({
          width: img.width || material.video_info?.width || 1080,
          height: img.height || material.video_info?.height || 1920,
          web_uri: img.web_uri || material.cover_uri || '',
          sign_url: img.sign_url || material.sign_url || '',
        }))
      } else {
        // 如果没有 image_info，构建默认的
        imageInfo = [
          {
            width: material.video_info?.width || 1080,
            height: material.video_info?.height || 1920,
            web_uri: material.image_info?.web_uri || material.cover_uri || '',
            sign_url: material.sign_url || '',
          },
        ]
      }

      return {
        image_info: imageInfo,
        video_info: {
          height: material.video_info?.height || 1920,
          width: material.video_info?.width || 1080,
          bitrate: material.video_info?.bitrate || 0,
          thumb_height: material.video_info?.thumb_height || 1920,
          thumb_width: material.video_info?.thumb_width || 1080,
          duration: material.video_info?.duration || 0,
          status: material.video_info?.status || 10,
          initial_size: material.video_info?.initial_size || 0,
          file_md5: material.video_info?.file_md5 || '',
          video_id: material.video_id,
          cover_uri: material.cover_uri || material.video_poster_uri || '',
          vid: material.video_id,
        },
        is_ebp_share: false,
        image_mode: 15,
        f_f_see_setting: 1,
        cover_type: 1,
      }
    })

    // 根据需求文档和 curl 示例构建完整请求体
    const requestBody = {
      promotion_data: {
        client_settings: {
          is_comment_disable: '0',
        },
        native_info: {
          is_feed_and_fav_see: 2,
          anchor_related_type: 0,
          ies_core_user_id: ies_core_user_id,
        },
        enable_personal_action: true,
        micro_app_info: {
          app_id: app_id,
          start_path: start_page || '',
          micro_app_type: app_type || 2,
          params: start_params || '',
          url: link || '',
        },
        source: buildConfig.source,
      },
      material_group: {
        playable_material_info: [],
        video_material_info: videoMaterialInfo, // 包含所有筛选出的素材
        image_material_info: [],
        aweme_photo_material_info: [],
        external_material_info: [
          {
            external_url: buildConfig.landingUrl,
          },
        ],
        component_material_info: [],
        call_to_action_material_info: [
          {
            call_to_action: promotionConfig.call_to_action,
            suggestion_usage_type: 0,
          },
        ],
        product_info: {
          product_name: {
            name: promotionConfig.product_name,
          },
          product_images: [
            {
              image_uri: product_image_uri,
              width: product_image_width || 108,
              height: product_image_height || 108,
            },
          ],
          product_selling_points: [
            {
              selling_point: promotionConfig.selling_point,
              suggestion_usage_type: 0,
            },
          ],
        },
        title_material_info: [
          {
            title: `#短剧推荐#${drama_name}`,
            word_list: [],
            bidword_list: [],
            dpa_word_list: [],
            is_dynamic: 0,
            suggestion_usage_type: 0,
            request_id: '0',
          },
        ],
      },
      name: ad_name,
      project_id: project_id.toString(),
      check_hash: Date.now().toString(),
      is_auto_delivery_mode: false,
    }

    console.log('请求体:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(
      `https://ad.oceanengine.com/superior/api/v2/promotion/create_promotion?aadvid=${account_id}`,
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    const result = await response.json()
    console.log('创建广告结果:', JSON.stringify(result, null, 2))
    console.log('====================================')

    ctx.body = result
  } catch (error) {
    console.error('创建广告失败:', error)
    ctx.status = 500
    ctx.body = { error: error.message || '创建广告失败' }
  }
})

/**
 * 创建小程序
 */
router.post('/create-microapp', async ctx => {
  try {
    const { account_id, app_id, path, query, remark, link } = ctx.request.body

    if (!account_id || !app_id || !path || !query || !remark || !link) {
      ctx.status = 400
      ctx.body = {
        error: '缺少必要参数: account_id, app_id, path, query, remark, link',
      }
      return
    }

    const cookie = await getJiliangCookie()

    console.log('========== 创建小程序 ==========')
    console.log('account_id:', account_id)
    console.log('app_id:', app_id)
    console.log('path:', path)
    console.log('query:', query)
    console.log('remark:', remark)
    console.log('link length:', link.length)
    console.log('link 内容:', link)

    const requestBody = {
      instance_id: '',
      adv_id: account_id,
      app_id: app_id,
      remark: '',
      schema_info: [
        {
          path: path,
          query: query,
          remark: remark,
          link: link,
          operate_type: '1',
        },
      ],
      data: {
        tag_info:
          '{"category_id":1050000000,"category_name":"小程序","categories":[{"category_id":1050100000,"category_name":"短剧","categories":[{"category_id":1050107001,"category_name":"其他"}]}]}',
      },
    }

    const { ccId } = await getBuildConfig()
    const url = `https://business.oceanengine.com/app_package/microapp/applet/create?cc_id=${ccId}&operator=${ccId}&operation_type=1`
    const headers = {
      'Content-Type': 'application/json',
      Cookie: cookie,
      'x-tt-hume-platform': 'bp',
    }

    console.log('-------- 请求详情 --------')
    console.log('请求 URL:', url)
    console.log('请求方法: POST')
    console.log('请求头:', JSON.stringify(headers, null, 2))
    console.log('请求体:', JSON.stringify(requestBody, null, 2))
    console.log('-------------------------')

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log('创建小程序响应:', responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('解析响应失败:', parseError)
      ctx.status = 500
      ctx.body = {
        error: '创建小程序失败: 响应格式错误',
        details: responseText.substring(0, 200),
      }
      return
    }

    console.log('创建小程序结果:', JSON.stringify(result, null, 2))
    console.log('====================================')

    // 判断是否成功：status: 0 表示成功
    // 或者 status: 1 且提示小程序已存在（可以继续使用）
    const isAlreadyExists =
      result.status === 1 && result.message && result.message.includes('账户内已存在相同AppId')

    if (result.status === 0 || isAlreadyExists) {
      if (isAlreadyExists) {
        console.log('⚠️ 小程序已存在，跳过创建步骤，继续后续流程')
      }
      ctx.body = {
        code: 0,
        message: isAlreadyExists ? '小程序已存在，跳过创建' : 'success',
        data: result,
        skipped: isAlreadyExists, // 标记是否跳过了创建步骤
      }
    } else {
      // 失败
      ctx.body = {
        code: result.status || -1,
        msg: result.message || '创建小程序失败',
        data: result,
      }
    }
  } catch (error) {
    console.error('创建小程序失败:', error)
    ctx.status = 500
    ctx.body = { error: error.message || '创建小程序失败' }
  }
})

/**
 * 验证并创建小程序（带重试机制）
 *
 * 使用场景：在新增待下载/待剪辑时，先验证账户的小程序审核状态
 *
 * 流程：
 * 1. 尝试用账户创建小程序（或查询已有小程序）
 * 2. 检查审核状态（status === 1 为通过）
 * 3. 如果不通过，弃用该账户（修改巨量备注为空，账户表"是否已用"改为"是"）
 * 4. 继续尝试下一个账户，最多重试5个
 * 5. 如果都失败，使用最后1个账户
 *
 * POST /api/daily-build/validate-and-create-microapp
 * Body: { drama_name: string, account_candidates: string[] }
 * Response: {
 *   success: boolean,
 *   account_id: string,
 *   message: string,
 *   microapp_status?: number,
 *   attempts_used: number,
 *   microapp_info?: any
 * }
 */
router.post('/validate-and-create-microapp', async ctx => {
  try {
    const { drama_name, book_id, account_candidates } = ctx.request.body

    if (!drama_name || !account_candidates || !Array.isArray(account_candidates)) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数: drama_name, account_candidates (数组)' }
      return
    }

    console.log('========== 验证并创建小程序 ==========')
    console.log('剧名:', drama_name)
    console.log('book_id:', book_id || '(空)')
    console.log('候选账户:', account_candidates)
    console.log('====================================')

    const cookie = await getJiliangCookie()
    const MAX_RETRY = 5
    const candidates = account_candidates.slice(0, MAX_RETRY)
    const attempts = []
    let successAccount = null
    let lastCleanAccount = null // 记录最后一个没有小程序的账户

    for (let i = 0; i < candidates.length; i++) {
      const accountId = candidates[i]
      const attemptNum = i + 1

      console.log(`----- 尝试第 ${attemptNum} 个账户: ${accountId} -----`)

      try {
        // 1. 先查询该账户是否已有小程序
        const queryResult = await queryMicroAppForAccount(accountId, cookie)

        // 2. 如果账户已有小程序（不管审核状态），直接弃用
        if (queryResult.applets && queryResult.applets.length > 0) {
          const existingStatus = queryResult.applets[0].status
          console.log(`⚠️ 账户 ${accountId} 已有小程序 (status=${existingStatus})，弃用此账户`)

          // 弃用账户：修改巨量备注为空，账户表"是否已用"改为"是"
          await discardAccount(accountId, cookie)

          attempts.push({
            account_id: accountId,
            status: existingStatus,
            message: `已有小程序 (status=${existingStatus})，已弃用`,
          })
          continue // 继续下一个账户
        }

        // 3. 账户没有小程序，记录为最后一个干净账户
        console.log(`✓ 账户 ${accountId} 没有小程序，可以使用`)
        lastCleanAccount = accountId

        // 4. 创建推广链接并创建小程序
        console.log(`  -> 为账户 ${accountId} 创建推广链接...`)
        const promotionUrl = await createPromotionLinkForMicroapp(drama_name, book_id)

        // 解析推广链接
        const parsed = parsePromotionUrl(promotionUrl.promotion_url)
        const appId = extractAppIdFromParams(parsed.launchParams)

        if (!appId) {
          throw new Error('无法从推广链接参数中提取 app_id')
        }

        const cleanedParams = parsed.launchParams
          .split('&')
          .filter(param => !param.startsWith('app_id='))
          .join('&')

        const microAppLink = generateMicroAppLink({
          appId,
          startPage: parsed.launchPage,
          startParams: cleanedParams,
        })

        // 创建小程序
        console.log(`  -> 为账户 ${accountId} 创建小程序...`)
        await createMicroAppForAccount(
          accountId,
          {
            app_id: appId,
            path: parsed.launchPage,
            query: parsed.launchParams,
            remark: promotionUrl.promotion_name,
            link: microAppLink,
          },
          cookie
        )

        // 等待30秒
        console.log(`  -> 等待30秒后查询小程序状态...`)
        await sleep(30000)

        // 重新查询
        const recheckResult = await queryMicroAppForAccount(accountId, cookie)
        const microAppStatus = recheckResult.applets?.[0]?.status
        const microAppInfo = recheckResult.applets?.[0]

        console.log(
          `  -> 查询结果: status=${microAppStatus}, hasValid=${recheckResult.hasValidMicroApp}`
        )

        // 5. 检查审核状态
        if (microAppStatus === 1) {
          // 审核通过
          console.log(`✓ 账户 ${accountId} 小程序审核通过`)
          successAccount = {
            account_id: accountId,
            status: microAppStatus,
            info: microAppInfo,
            skip_create: false,
          }
          attempts.push({
            account_id: accountId,
            status: microAppStatus,
            message: '创建后审核通过',
          })
          break
        } else {
          // 审核不通过，弃用账户
          console.log(`✗ 账户 ${accountId} 小程序审核不通过 (status=${microAppStatus})，弃用此账户`)

          // 弃用账户
          await discardAccount(accountId, cookie)

          attempts.push({
            account_id: accountId,
            status: microAppStatus,
            message: `审核未通过 (status=${microAppStatus})，已弃用`,
          })
          // 继续下一个账户
        }
      } catch (error) {
        console.error(`✗ 账户 ${accountId} 处理失败:`, error.message)

        // 弃用账户
        try {
          await discardAccount(accountId, cookie)
        } catch (discardError) {
          console.error(`弃用账户 ${accountId} 失败:`, discardError.message)
        }

        attempts.push({
          account_id: accountId,
          status: null,
          message: `处理失败: ${error.message}`,
        })
        // 继续下一个账户
      }
    }

    // 如果没有找到成功的账户，使用最后一个没有小程序的账户
    if (!successAccount && lastCleanAccount) {
      console.log(`⚠️ 所有账户都未通过审核，使用最后一个干净账户: ${lastCleanAccount}`)
      successAccount = {
        account_id: lastCleanAccount,
        status: null,
        info: null,
        skip_create: false,
        force_use: true,
      }
      attempts.push({
        account_id: lastCleanAccount,
        status: null,
        message: '所有账户审核未通过，使用最后一个干净账户',
      })
    }

    if (!successAccount) {
      throw new Error('没有可用的账户')
    }

    console.log('========== 验证完成 ==========')
    console.log('最终使用账户:', successAccount.account_id)
    console.log('小程序状态:', successAccount.status)
    console.log('尝试次数:', attempts.length)
    console.log('====================================')

    ctx.body = {
      success: true,
      account_id: successAccount.account_id,
      microapp_status: successAccount.status,
      microapp_info: successAccount.info,
      skip_create: successAccount.skip_create || false,
      force_use: successAccount.force_use || false,
      attempts_used: attempts.length,
      attempts: attempts,
      message: successAccount.force_use
        ? '已尝试所有账户，使用最后一个账户'
        : `成功找到可用账户（第 ${attempts.length} 次尝试）`,
    }
  } catch (error) {
    console.error('验证并创建小程序失败:', error)
    ctx.status = 500
    ctx.body = {
      error: error.message || '验证并创建小程序失败',
      success: false,
    }
  }
})

// ============== 辅助函数 ==============

/**
 * 查询账户的小程序状态
 */
async function queryMicroAppForAccount(accountId, cookie) {
  const { ccId } = await getBuildConfig()

  const url = new URL('https://business.oceanengine.com/app_package/microapp/applet/list')
  url.searchParams.set('page_no', '1')
  url.searchParams.set('page_size', '10')
  url.searchParams.set('search_key', '')
  url.searchParams.set('search_type', '1')
  url.searchParams.set('status', '-1')
  url.searchParams.set('adv_id', accountId)
  url.searchParams.set('cc_id', ccId)
  url.searchParams.set('operator', ccId)
  url.searchParams.set('operation_type', '1')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-tt-hume-platform': 'bp',
      Cookie: cookie,
    },
  })

  const result = await response.json()
  const applets = result.data?.applets || []

  // 检查是否有审核通过的小程序 (status === 1)
  const hasValidMicroApp = applets.some(applet => applet.status === 1)
  const validApplet = hasValidMicroApp ? applets.find(applet => applet.status === 1) : null

  return {
    hasValidMicroApp,
    applets,
    validApplet,
  }
}

/**
 * 为小程序创建推广链接
 */
async function createPromotionLinkForMicroapp(drama_name, book_id) {
  const { distributorId, secretKey } = await getChangduSignConfig()
  const buildConfig = await getBuildConfig()

  const requestBody = {
    distributor_id: distributorId,
    book_id: book_id || '', // 使用传入的 book_id
    index: DAILY_BUILD_CONFIG.promotion.index,
    promotion_name: `小鱼-${cleanDramaName(drama_name)}`,
    recharge_template_id: buildConfig.rechargeTemplateId,
    media_source: DAILY_BUILD_CONFIG.promotion.mediaSource,
    price: DAILY_BUILD_CONFIG.promotion.price,
    start_chapter: DAILY_BUILD_CONFIG.promotion.startChapter,
  }

  const { headers: signHeaders } = buildChangduPostHeaders(
    requestBody,
    undefined,
    distributorId,
    secretKey
  )

  const response = await fetch(`${DAILY_BUILD_CONFIG.changdu.baseUrl}/promotion/create/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...signHeaders,
    },
    body: JSON.stringify(requestBody),
  })

  const result = await response.json()
  if (result.code !== 200) {
    throw new Error(result.message || '创建推广链接失败')
  }
  return result
}

/**
 * 创建小程序
 */
async function createMicroAppForAccount(accountId, params, cookie) {
  const { app_id, path, query, remark, link } = params

  const requestBody = {
    instance_id: '',
    adv_id: accountId,
    app_id: app_id,
    remark: '',
    schema_info: [
      {
        path: path,
        query: query,
        remark: remark,
        link: link,
        operate_type: '1',
      },
    ],
    data: {
      tag_info:
        '{"category_id":1050000000,"category_name":"小程序","categories":[{"category_id":1050100000,"category_name":"短剧","categories":[{"category_id":1050107001,"category_name":"其他"}]}]}',
    },
  }

  const { ccId } = await getBuildConfig()
  const url = `https://business.oceanengine.com/app_package/microapp/applet/create?cc_id=${ccId}&operator=${ccId}&operation_type=1`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      'x-tt-hume-platform': 'bp',
    },
    body: JSON.stringify(requestBody),
  })

  const result = await response.json()

  // status: 0 表示成功，或者小程序已存在
  const isAlreadyExists =
    result.status === 1 && result.message && result.message.includes('账户内已存在相同AppId')

  if (result.status !== 0 && !isAlreadyExists) {
    throw new Error(result.message || '创建小程序失败')
  }

  return result
}

/**
 * 弃用账户：修改巨量备注为空，账户表"是否已用"改为"是"
 */
async function discardAccount(accountId, cookie) {
  console.log(`  -> 弃用账户 ${accountId}...`)

  // 1. 修改巨量账户备注为空字符串
  try {
    const updateUrl = `https://ad.oceanengine.com/aadv/api/account/update?accountId=${accountId}&aadvid=${accountId}`
    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        remark: '', // 清空备注
      }),
    })

    if (updateResponse.ok) {
      const updateResult = await updateResponse.json()
      if (updateResult.code === 200) {
        console.log(`    ✓ 已清空巨量账户备注`)
      } else {
        console.error(`    ✗ 清空巨量账户备注失败:`, updateResult.message)
      }
    }
  } catch (error) {
    console.error(`    ✗ 清空巨量账户备注异常:`, error.message)
  }

  return { success: true }
}

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 启动后台调度器
 * POST /api/daily-build/scheduler/start
 * Body: { intervalMinutes: number }
 */
router.post('/scheduler/start', async ctx => {
  try {
    const { intervalMinutes } = ctx.request.body

    if (!intervalMinutes || typeof intervalMinutes !== 'number' || intervalMinutes < 1) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: '轮询间隔必须是大于等于1的数字（单位：分钟）',
      }
      return
    }

    const status = await startScheduler(intervalMinutes)

    ctx.body = {
      code: 0,
      message: '后台调度器已启动',
      data: status,
    }
  } catch (error) {
    console.error('启动后台调度器失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: error.message || '启动后台调度器失败',
    }
  }
})

/**
 * 停止后台调度器
 * POST /api/daily-build/scheduler/stop
 */
router.post('/scheduler/stop', async ctx => {
  try {
    const status = await stopScheduler()

    ctx.body = {
      code: 0,
      message: '后台调度器已停止',
      data: status,
    }
  } catch (error) {
    console.error('停止后台调度器失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: error.message || '停止后台调度器失败',
    }
  }
})

/**
 * 查询后台调度器状态
 * GET /api/daily-build/scheduler/status
 */
router.get('/scheduler/status', async ctx => {
  try {
    const status = getSchedulerStatus()

    ctx.body = {
      code: 0,
      message: 'success',
      data: status,
    }
  } catch (error) {
    console.error('查询后台调度器状态失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: error.message || '查询后台调度器状态失败',
    }
  }
})

/**
 * 触发立即执行一次搭建
 * POST /api/daily-build/scheduler/trigger
 */
router.post('/scheduler/trigger', async ctx => {
  try {
    const { dramaId } = ctx.request.body
    const status = await triggerSchedulerBuild(dramaId || null)

    ctx.body = {
      code: 0,
      message: dramaId ? '已触发指定剧集搭建任务' : '已触发搭建任务',
      data: status,
    }
  } catch (error) {
    console.error('触发搭建任务失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: error.message || '触发搭建任务失败',
    }
  }
})

export default router
