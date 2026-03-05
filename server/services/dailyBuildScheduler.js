/**
 * 每日搭建后台调度服务
 * 支持定时轮询搭建，状态持久化
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { FEISHU_CONFIG, getFeishuConfig } from '../config/feishu.js'
import { DAILY_BUILD_CONFIG } from '../config/dailyBuild.js'
import { JILIANG_CONFIG } from '../config/jiliang.js'
import { buildChangduPostHeaders } from '../utils/changduSign.js'
import FormData from 'form-data'
import { readAuthConfig } from '../routes/auth.js'
import {
  parsePromotionUrl,
  generateMicroAppLink,
  extractAppIdFromParams,
  filterMaterials,
  sortMaterialsBySequence,
  sanitizeDramaName,
  formatBuildDate,
  parseDouyinMaterialFromFeishu,
} from '../utils/dailyBuildUtils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 状态文件路径
const isProduction = process.env.NODE_ENV === 'production'
const STATE_FILE_PATH = isProduction
  ? '/data/changdu-web-yu/daily-build-scheduler-state.json'
  : path.join(__dirname, '../data/daily-build-scheduler-state.json')

// 调度器状态
let schedulerState = {
  enabled: false,
  intervalMinutes: null,
  nextRunTime: null,
  lastRunTime: null,
  stats: {
    totalBuilt: 0,
    successCount: 0,
    failCount: 0,
  },
  currentTask: null, // 当前正在执行的任务
  taskHistory: [], // 最近的任务历史（最多保留20条）
}

// 定时器引用
let pollingTimer = null

/**
 * 获取飞书 access token
 */
async function getFeishuAccessToken() {
  const response = await fetch(`${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_CONFIG.app_id,
      app_secret: FEISHU_CONFIG.app_secret,
    }),
  })

  const data = await response.json()
  if (data.code !== 0) {
    throw new Error(`获取飞书 access token 失败: ${data.msg}`)
  }
  return data.tenant_access_token
}

/**
 * 查询待搭建剧集（从飞书）
 */
async function getPendingSetupDramas() {
  const config = await getFeishuConfig()
  const accessToken = await getFeishuAccessToken()
  const dailyTableId = config.table_ids.drama_status

  // 查询每日表
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${dailyTableId}/records/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        field_names: [
          '剧名',
          '短剧ID',
          '账户',
          '主体',
          '日期',
          '当前状态',
          '上架时间',
          '抖音素材',
          '备注',
        ],
        page_size: 100,
        filter: {
          conjunction: 'and',
          conditions: [
            {
              field_name: '当前状态',
              operator: 'is',
              value: ['待搭建'],
            },
          ],
        },
      }),
    }
  )

  const result = await response.json()
  if (result.code !== 0) {
    throw new Error(`查询飞书待搭建剧集失败: ${result.msg}`)
  }

  // 为每条记录添加 _tableId 属性
  const items = result.data?.items || []
  items.forEach(item => {
    item._tableId = dailyTableId
  })
  return items
}

/**
 * 更新飞书剧集状态
 * @param {string} recordId - 记录ID
 * @param {string} status - 新状态
 * @param {number} buildTime - 搭建时间
 * @param {string} tableId - 表ID（可选，默认使用每日表）
 * @param {string} remark - 备注（可选，用于记录失败或跳过原因）
 */
async function updateDramaStatus(recordId, status, buildTime, tableId, remark) {
  const config = await getFeishuConfig()
  const accessToken = await getFeishuAccessToken()
  const targetTableId = tableId || config.table_ids.drama_status

  const fields = { 当前状态: status }
  if (buildTime) {
    fields['搭建时间'] = buildTime
  }
  if (remark) {
    fields['备注'] = remark
  }

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/${recordId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ fields }),
    }
  )

  const result = await response.json()
  if (result.code !== 0) {
    throw new Error(`更新飞书状态失败: ${result.msg}`)
  }

  return result
}

/**
 * 按优先级选择剧集
 * 注意：只有当前时间 >= 上架时间 - 30分钟 时，该剧才能被选中搭建
 * 优先级：过期剧优先于未来剧；同优先级按上架时间升序
 */
function selectHighestPriorityDrama(dramas) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // 最多提前30分钟搭建
  const ADVANCE_BUILD_MINUTES = 30

  const getPublishTime = drama => {
    const timeField = drama.fields['上架时间']
    if (!timeField?.value?.[0]) return null
    return new Date(timeField.value[0])
  }

  // 检查剧集是否可以开始搭建（当前时间 >= 上架时间 - 30分钟）
  const canBuildNow = drama => {
    const publishTime = getPublishTime(drama)
    if (!publishTime) return false
    // 允许搭建的最早时间 = 上架时间 - 30分钟
    const earliestBuildTime = new Date(publishTime.getTime() - ADVANCE_BUILD_MINUTES * 60 * 1000)
    return now >= earliestBuildTime
  }

  // 过滤出可以搭建的剧集
  const buildableDramas = dramas.filter(drama => {
    const publishTime = getPublishTime(drama)
    if (!publishTime) return false

    if (!canBuildNow(drama)) {
      const dramaName = drama.fields['剧名']?.[0]?.text || '未知'
      console.log(
        `[优先级选择] 跳过 "${dramaName}"：上架时间 ${publishTime.toLocaleString()}，还未到可搭建时间（最早提前${ADVANCE_BUILD_MINUTES}分钟）`
      )
      return false
    }
    return true
  })

  if (buildableDramas.length === 0) return null

  // 按优先级排序：
  // 1. 时间优先级：过期/今天 > 未来
  // 2. 同优先级按上架时间升序（早的先搭建）

  buildableDramas.sort((a, b) => {
    const aPublishTime = getPublishTime(a)
    const bPublishTime = getPublishTime(b)

    // 判断是否是过期或今天的剧
    const aIsExpiredOrToday =
      aPublishTime <= new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
    const bIsExpiredOrToday =
      bPublishTime <= new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    // 过期/今天的剧优先于未来的剧
    if (aIsExpiredOrToday !== bIsExpiredOrToday) {
      return aIsExpiredOrToday ? -1 : 1
    }

    // 同优先级按上架时间升序
    return aPublishTime.getTime() - bPublishTime.getTime()
  })

  return buildableDramas[0]
}

/**
 * 获取抖音号配置列表
 * @param {Object} drama - 飞书记录对象，包含"抖音素材"字段
 * @returns {Array} 抖音号配置列表
 */
async function getDouyinConfigs(drama) {
  // 从飞书状态表的"抖音素材"字段解析配置
  // 飞书多行文本字段可能有多种格式：
  // 1. 数组格式: [{text: "...", type: "text"}]
  // 2. 直接字符串格式: "..."
  const rawField = drama?.fields?.['抖音素材']
  let douyinMaterialText = ''

  if (typeof rawField === 'string') {
    // 直接字符串格式
    douyinMaterialText = rawField
  } else if (Array.isArray(rawField) && rawField[0]?.text) {
    // 数组格式
    douyinMaterialText = rawField[0].text
  } else if (rawField && typeof rawField === 'object') {
    // 其他对象格式，尝试获取 text 或 value
    douyinMaterialText = rawField.text || rawField.value || ''
  }

  console.log(`[后台搭建] 抖音素材原始字段:`, JSON.stringify(rawField))
  console.log(`[后台搭建] 抖音素材解析后文本:`, douyinMaterialText)

  const configs = parseDouyinMaterialFromFeishu(douyinMaterialText)
  console.log(`[后台搭建] 从飞书状态表解析到 ${configs.length} 个抖音号配置:`, configs)
  return configs
}

async function getChangduSignConfig() {
  const authConfig = await readAuthConfig()
  const distributorId = authConfig.headers?.distributorId
  if (!distributorId) {
    throw new Error('缺少 auth.headers.distributorId 配置')
  }
  const secretKey = authConfig.buildConfig?.secretKey
  if (!secretKey) {
    throw new Error('缺少 auth.buildConfig.secretKey 配置')
  }
  return { distributorId: toDistributorIdNumber(distributorId), secretKey }
}

function toDistributorIdNumber(rawDistributorId) {
  const value = String(rawDistributorId || '').trim()
  if (!/^\d+$/.test(value)) {
    throw new Error('auth.headers.distributorId 必须是数字')
  }

  return Number(value)
}

function toRechargeTemplateIdNumber(rawRechargeTemplateId) {
  const value = String(rawRechargeTemplateId || '').trim()
  if (!/^\d+$/.test(value)) {
    throw new Error('auth.buildConfig.rechargeTemplateId 必须是数字')
  }

  return Number(value)
}

async function getBuildConfig() {
  const authConfig = await readAuthConfig()
  const buildConfig = authConfig.buildConfig || {}

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
    rechargeTemplateId: toRechargeTemplateIdNumber(buildConfig.rechargeTemplateId),
  }
}

// ============== API 调用函数 ==============

/**
 * 创建推广链接
 */
async function createPromotionLink(params) {
  const { book_id, drama_name, promotion_name } = params
  const finalPromotionName = promotion_name || `小鱼-${sanitizeDramaName(drama_name)}`
  const { distributorId, secretKey } = await getChangduSignConfig()
  const buildConfig = await getBuildConfig()

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

  const { headers: signHeaders } = buildChangduPostHeaders(
    requestBody,
    undefined,
    distributorId,
    secretKey
  )

  const response = await fetch(`${DAILY_BUILD_CONFIG.changdu.baseUrl}/promotion/create/v1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...signHeaders },
    body: JSON.stringify(requestBody),
  })

  const result = await response.json()
  if (result.code !== 200) {
    throw new Error(result.message || '创建推广链接失败')
  }
  return result
}

/**
 * 查询小程序
 * 返回格式：{ hasValidMicroApp: boolean, result: any }
 */
async function queryMicroApp(accountId) {
  const { ccId } = await getBuildConfig()

  const url = new URL('https://business.oceanengine.com/app_package/microapp/applet/list')
  url.searchParams.set('page_no', '1')
  url.searchParams.set('page_size', '10')
  url.searchParams.set('search_key', '')
  url.searchParams.set('search_type', '1')
  url.searchParams.set('status', '-1') // 查询所有状态的小程序
  url.searchParams.set('adv_id', accountId)
  url.searchParams.set('cc_id', ccId)
  url.searchParams.set('operator', ccId)
  url.searchParams.set('operation_type', '1')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-tt-hume-platform': 'bp',
      Cookie: JILIANG_CONFIG.cookie,
    },
  })

  const result = await response.json()
  const applets = result.data?.applets || []

  // ✅ 检查是否有 status === 1 的小程序
  const hasValidMicroApp = applets.some(applet => applet.status === 1)

  console.log('[查询小程序] 查询结果:')
  console.log('  - 小程序总��:', applets.length)
  console.log('  - status === 1 的数量:', applets.filter(a => a.status === 1).length)
  console.log('  - 是否有有效小程序:', hasValidMicroApp)

  if (applets.length > 0 && !hasValidMicroApp) {
    console.log(
      '[查询小程序] ⚠️ 小程序存在但 status 都不等于 1:',
      applets.map(a => ({ instance_id: a.instance_id, status: a.status }))
    )
  }

  const mappedApplets = applets.map(applet => ({
    ...applet,
    micro_app_instance_id: applet.instance_id,
  }))

  return {
    hasValidMicroApp,
    result: { ...result, data: { ...result.data, micro_app: mappedApplets } },
  }
}

/**
 * 查询被共享的已审核通过的小程序（search_type=2）
 * 用于优化资产化流程，优先使用被共享的已审核通过的小程序
 */
async function queryApprovedMicroApp(accountId) {
  const { ccId, microAppId } = await getBuildConfig()

  const url = new URL('https://business.oceanengine.com/app_package/microapp/applet/list')
  url.searchParams.set('page_no', '1')
  url.searchParams.set('page_size', '10')
  url.searchParams.set('search_key', '')
  url.searchParams.set('search_type', '2') // search_type=2 查询被共享的已审核通过的小程序
  url.searchParams.set('status', '-1')
  url.searchParams.set('adv_id', accountId)
  url.searchParams.set('cc_id', ccId)
  url.searchParams.set('operator', ccId)
  url.searchParams.set('operation_type', '1')

  console.log('[查询被共享的小程序] 开始查询 (search_type=2)...')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-tt-hume-platform': 'bp',
      Cookie: JILIANG_CONFIG.cookie,
    },
  })

  const result = await response.json()
  const applets = result.data?.applets || []

  // 找到 status=1 的小程序
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
    console.log('  - 匹配配置 app_id 的候选数量:', matchedApplets.length)
  }

  console.log('[查询被共享的小程序] 查询结果:')
  console.log('  - 小程序总数:', applets.length)
  console.log('  - 已审核通过小程序数量:', approvedApplets.length)
  console.log('  - 配置的 microAppId:', microAppId)
  console.log('  - 最终选中的 app_id:', approvedApplet?.app_id || '未选中')
  console.log('  - 找到已审核通过的小程序:', approvedApplet ? '是' : '否')

  if (approvedApplet) {
    console.log(
      '[查询被共享的小程序] ✓ 找到被共享的已审核通过的小程序:',
      approvedApplet.instance_id
    )
    return {
      found: true,
      microApp: {
        ...approvedApplet,
        micro_app_instance_id: approvedApplet.instance_id,
      },
    }
  }

  console.log('[查询被共享的小程序] 未找到被共享的已审核通过的小程序')
  return {
    found: false,
    microApp: null,
  }
}

/**
 * 创建小程序
 */
async function createMicroApp(params) {
  const { account_id, app_id, path: appPath, query, remark, link } = params

  const requestBody = {
    instance_id: '',
    adv_id: account_id,
    app_id: app_id,
    remark: '',
    schema_info: [
      {
        path: appPath,
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
      Cookie: JILIANG_CONFIG.cookie,
      'x-tt-hume-platform': 'bp',
    },
    body: JSON.stringify(requestBody),
  })

  const result = await response.json()
  const isAlreadyExists =
    result.status === 1 && result.message && result.message.includes('账户内已存在相同AppId')

  if (result.status === 0 || isAlreadyExists) {
    return { code: 0, data: result, skipped: isAlreadyExists }
  }
  throw new Error(result.message || '创建小程序失败')
}

/**
 * 查询小程序资产列表
 */
async function listMicroAppAssets(accountId) {
  const response = await fetch(
    `https://ad.oceanengine.com/event_manager/v2/api/assets/ad/list?aadvid=${accountId}`,
    {
      method: 'POST',
      headers: {
        platform: 'ad',
        Cookie: JILIANG_CONFIG.cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assets_types: [1, 3, 2, 7, 4, 5],
        role: 1,
      }),
    }
  )
  return response.json()
}

/**
 * 创建小程序资产
 */
async function createMicroAppAsset(params) {
  const { account_id, micro_app_instance_id } = params
  const buildConfig = await getBuildConfig()

  const response = await fetch(
    `https://ad.oceanengine.com/event_manager/api/assets/create?aadvid=${account_id}`,
    {
      method: 'POST',
      headers: {
        platform: 'ad',
        Cookie: JILIANG_CONFIG.cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assets_type: 4,
        micro_app: {
          assets_name: buildConfig.microAppName,
          micro_app_id: buildConfig.microAppId,
          micro_app_name: buildConfig.microAppName,
          micro_app_type: 1,
          micro_app_instance_id: micro_app_instance_id,
        },
      }),
    }
  )

  const result = await response.json()
  if (result.code !== 0) {
    throw new Error(result.msg || '创建小程序资产失败')
  }
  return result
}

/**
 * 检查事件状态
 */
async function checkEventStatus(params) {
  const { account_id, assets_id } = params

  const response = await fetch(
    `https://ad.oceanengine.com/event_manager/v2/api/event/track/status/${assets_id}?aadvid=${account_id}`,
    {
      method: 'GET',
      headers: {
        platform: 'ad',
        Cookie: JILIANG_CONFIG.cookie,
      },
    }
  )

  const result = await response.json()
  const hasPaymentEvent = result.data?.track_status?.some(event => event.event_name === '付费')

  return { ...result, has_payment_event: hasPaymentEvent }
}

/**
 * 添加付费事件
 */
async function addPaymentEvent(params) {
  const { account_id, assets_id } = params

  const response = await fetch(
    `https://ad.oceanengine.com/event_manager/v2/api/event/config/create?aadvid=${account_id}`,
    {
      method: 'POST',
      headers: {
        platform: 'ad',
        Cookie: JILIANG_CONFIG.cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        link_name: DAILY_BUILD_CONFIG.event.linkName,
        events: [
          {
            event_enum: DAILY_BUILD_CONFIG.event.eventEnum,
            event_type: DAILY_BUILD_CONFIG.event.eventType,
            event_name: DAILY_BUILD_CONFIG.event.eventName,
            track_types: DAILY_BUILD_CONFIG.event.trackTypes,
            statistical_method_type: DAILY_BUILD_CONFIG.event.statisticalMethodType,
            discrimination_value: { value_type: 0, dimension: 0, groups: [] },
          },
        ],
        assets_id: assets_id,
      }),
    }
  )

  const result = await response.json()
  if (result.code !== 0) {
    throw new Error(result.msg || '添加付费事件失败')
  }
  return result
}

/**
 * 上传头像图片
 */
async function uploadAvatarImage(accountId) {
  const imagePath = path.join(__dirname, '../assets/cover.png')
  const imageBuffer = await fs.readFile(imagePath)

  const formData = new FormData()
  formData.append('file', imageBuffer, { filename: 'cover.png', contentType: 'image/png' })
  formData.append('width', '300')
  formData.append('height', '300')

  const response = await fetch(
    `https://ad.oceanengine.com/aadv/api/account/upload_image_v2?aadvid=${accountId}`,
    {
      method: 'POST',
      headers: {
        Cookie: JILIANG_CONFIG.cookie,
        'content-type': formData.getHeaders()['content-type'],
      },
      body: formData.getBuffer(),
    }
  )

  const result = await response.json()
  if (result.code !== 200) {
    throw new Error(result.message || '上传头像图片失败')
  }
  return result
}

/**
 * 保存头像
 */
async function saveAvatar(params) {
  const { account_id, web_uri, width, height } = params

  const response = await fetch(
    `https://ad.oceanengine.com/account/api/v2/adv/saveAvatar?accountId=${account_id}&aadvid=${account_id}`,
    {
      method: 'POST',
      headers: {
        Cookie: JILIANG_CONFIG.cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        avatarInfo: { webUri: web_uri, width: width || 300, height: height || 300 },
      }),
    }
  )

  const result = await response.json()
  if (result.code !== 200 && result.code !== 410001) {
    throw new Error(result.message || '保存头像失败')
  }
  return result
}

/**
 * 上传主图
 */
async function uploadProductImage(accountId) {
  const imagePath = path.join(__dirname, '../assets/cover.png')
  const imageBuffer = await fs.readFile(imagePath)

  const formData = new FormData()
  formData.append('fileData', imageBuffer, { filename: 'cover.png', contentType: 'image/png' })

  const response = await fetch(
    `https://ad.oceanengine.com/superior/api/v2/creative/material/picture/upload?aadvid=${accountId}`,
    {
      method: 'POST',
      headers: {
        Cookie: JILIANG_CONFIG.cookie,
        'content-type': formData.getHeaders()['content-type'],
      },
      body: formData.getBuffer(),
    }
  )

  const result = await response.json()
  if (result.code !== 0) {
    throw new Error(result.msg || '上传主图失败')
  }
  return result
}

/**
 * 创建项目
 */
async function createProject(params) {
  const {
    account_id,
    drama_name,
    douyin_account_name,
    assets_id,
    micro_app_instance_id,
    project_name,
  } = params
  const projectConfig = DAILY_BUILD_CONFIG.build.project
  const buildConfig = await getBuildConfig()

  const finalProjectName =
    project_name || (douyin_account_name ? `${drama_name}-小鱼-${douyin_account_name}` : drama_name)

  const requestBody = {
    track_url_group_info: {},
    track_url: [],
    action_track_url: [],
    first_frame: [],
    last_frame: [],
    effective_frame: [],
    track_url_send_type: '2',
    smart_bid_type: projectConfig.smart_bid_type,
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

  const response = await fetch(
    `https://ad.oceanengine.com/superior/api/v2/project/create?aadvid=${account_id}`,
    {
      method: 'POST',
      headers: {
        Cookie: JILIANG_CONFIG.cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  )

  const result = await response.json()
  if (result.code !== 0) {
    throw new Error(result.msg || '创建项目失败')
  }
  return result
}

/**
 * 获取抖音号原始ID
 */
async function getDouyinAccountInfo(params) {
  const { account_id, douyin_account_id } = params

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

  const response = await fetch(
    `https://ad.oceanengine.com/superior/api/v2/ad/authorize/list?aadvid=${account_id}`,
    {
      method: 'POST',
      headers: {
        Cookie: JILIANG_CONFIG.cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  )

  return response.json()
}

/**
 * 获取素材列表
 */
async function getMaterialList(params) {
  const { account_id, aweme_id, aweme_account } = params

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

  const response = await fetch(
    `https://ad.oceanengine.com/superior/api/v2/video/list?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: { Cookie: JILIANG_CONFIG.cookie },
    }
  )

  return response.json()
}

/**
 * 创建广告
 */
async function createPromotion(params) {
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
  } = params

  const promotionConfig = DAILY_BUILD_CONFIG.build.promotion
  const buildConfig = await getBuildConfig()

  const videoMaterialInfo = materials.map(material => {
    let imageInfo
    if (
      material.image_info &&
      Array.isArray(material.image_info) &&
      material.image_info.length > 0
    ) {
      imageInfo = material.image_info.map(img => ({
        width: img.width || material.video_info?.width || 1080,
        height: img.height || material.video_info?.height || 1920,
        web_uri: img.web_uri || material.cover_uri || '',
        sign_url: img.sign_url || material.sign_url || '',
      }))
    } else {
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

  const requestBody = {
    promotion_data: {
      client_settings: { is_comment_disable: '0' },
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
      video_material_info: videoMaterialInfo,
      image_material_info: [],
      aweme_photo_material_info: [],
      external_material_info: [{ external_url: buildConfig.landingUrl }],
      component_material_info: [],
      call_to_action_material_info: [
        { call_to_action: promotionConfig.call_to_action, suggestion_usage_type: 0 },
      ],
      product_info: {
        product_name: { name: promotionConfig.product_name },
        product_images: [
          {
            image_uri: product_image_uri,
            width: product_image_width || 108,
            height: product_image_height || 108,
          },
        ],
        product_selling_points: [
          { selling_point: promotionConfig.selling_point, suggestion_usage_type: 0 },
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

  const response = await fetch(
    `https://ad.oceanengine.com/superior/api/v2/promotion/create_promotion?aadvid=${account_id}`,
    {
      method: 'POST',
      headers: {
        Cookie: JILIANG_CONFIG.cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  )

  return response.json()
}

// ============== 搭建流程 ==============

/**
 * 执行资产化流程
 */
async function executeAssetization(drama) {
  const dramaName = drama.fields['剧名']?.[0]?.text
  const bookId = drama.fields['短剧ID']?.value?.[0]?.text
  const accountId = drama.fields['账户']?.[0]?.text

  if (!dramaName || !bookId || !accountId) {
    throw new Error('剧集信息不完整')
  }

  console.log(`[后台搭建] 开始资产化: ${dramaName}`)

  // 步骤1: 上传账户头像
  console.log('[后台搭建] 步骤1: 上传账户头像')
  const avatarUploadResult = await uploadAvatarImage(accountId)
  await saveAvatar({
    account_id: accountId,
    web_uri: avatarUploadResult.data.image_info.web_uri,
    width: 300,
    height: 300,
  })

  // 步骤2: 创建推广链接（用于小程序资产）
  console.log('[后台搭建] 步骤2: 创建推广链接')
  const promotionResult = await createPromotionLink({
    book_id: bookId,
    drama_name: dramaName,
  })

  // 步骤3: 查询/创建小程序
  console.log('[后台搭建] 步骤3: 查询/创建小程序')
  let microApp

  // 1. 首先查询账户自己的已审核通过的小程序（search_type=1）
  const microAppResult = await queryMicroApp(accountId)
  if (microAppResult.hasValidMicroApp) {
    // 找到账户自己的已审核通过的小程序，直接使用
    microApp = microAppResult.result.data.micro_app[0]
    console.log('[后台搭建] ✓ 使用账户自己的已审核通过的小程序:', microApp.micro_app_instance_id)
  } else {
    // 2. 没有找到账户自己的小程序，查询被共享的已审核通过的小程序（search_type=2）
    console.log('[后台搭建] 未找到账户自己的已审核通过的小程序，查询被共享的小程序...')
    const approvedResult = await queryApprovedMicroApp(accountId)
    if (approvedResult.found && approvedResult.microApp) {
      // 找到被共享的已审核通过的小程序，直接使用
      microApp = approvedResult.microApp
      console.log('[后台搭建] ✓ 使用被共享的已审核通过的小程序:', microApp.micro_app_instance_id)
    } else {
      // 3. 都没有找到，检查是否有未审核通过的小程序
      console.log('[后台搭建] 未找到被共享的小程序，检查是否需要创建...')
      const applets = microAppResult.result.data?.applets || []
      if (applets.length > 0) {
        // 有小程序但 status 都不等于 1，跳过这部剧
        console.log('[后台搭建] ⚠️ 小程序存在但未审核通过，跳过这部剧')
        console.log(
          '[后台搭建] 小程序详情:',
          applets.map(a => ({ instance_id: a.instance_id, status: a.status }))
        )
        const error = new Error('小程序未审核通过（status != 1），跳过此剧集的搭建')
        error.code = 'MICROAPP_NOT_APPROVED'
        throw error
      }
      // applets 为空，需要创建小程序
      console.log('[后台搭建] 小程序不存在，开始自动创建')
    }
  }

  // 如果没有有效小程序，则创建
  if (!microApp) {
    const parsed = parsePromotionUrl(promotionResult.promotion_url)
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

    await createMicroApp({
      account_id: accountId,
      app_id: appId,
      path: parsed.launchPage,
      query: parsed.launchParams,
      remark: promotionResult.promotion_name,
      link: microAppLink,
    })

    console.log('[后台搭建] 小程序创建成功，等待30秒后查询...')
    await new Promise(resolve => setTimeout(resolve, 30000))

    let recheckResult = await queryMicroApp(accountId)

    if (!recheckResult.hasValidMicroApp) {
      console.log('[后台搭建] 第一次未查询到有效小程序，等待10秒后重试...')
      await new Promise(resolve => setTimeout(resolve, 10000))
      recheckResult = await queryMicroApp(accountId)

      if (!recheckResult.hasValidMicroApp) {
        throw new Error('小程序创建后查询失败（已重试2次）')
      }
    }

    microApp = recheckResult.result.data.micro_app[0]
  }

  // 步骤4: 查询/创建小程序资产
  console.log('[后台搭建] 步骤4: 查询/创建小程序资产')
  const assetsListResult = await listMicroAppAssets(accountId)
  let assetsId

  if (assetsListResult.data?.micro_app && assetsListResult.data.micro_app.length > 0) {
    assetsId = assetsListResult.data.micro_app[0].assets_id
    console.log('[后台搭建] 小程序资产已存在:', assetsId)
  } else {
    console.log('[后台搭建] 小程序资产不存在，开始创建')
    const assetResult = await createMicroAppAsset({
      account_id: accountId,
      micro_app_instance_id: microApp.micro_app_instance_id,
    })
    assetsId = assetResult.assets_id
  }

  // 步骤5: 检查并添加付费事件
  console.log('[后台搭建] 步骤5: 检查并添加付费事件')
  const eventStatusResult = await checkEventStatus({
    account_id: accountId,
    assets_id: assetsId,
  })

  if (eventStatusResult.has_payment_event) {
    console.log('[后台搭建] 付费事件已存在，跳过添加')
  } else {
    console.log('[后台搭建] 付费事件不存在，开始添加')
    await addPaymentEvent({ account_id: accountId, assets_id: assetsId })
  }

  // 上传主图
  console.log('[后台搭建] 上传主图')
  const uploadResult = await uploadProductImage(accountId)
  const imageInfo = uploadResult.data

  const initData = {
    assets_id: assetsId,
    micro_app_instance_id: microApp.micro_app_instance_id,
    app_id: microApp.app_id || '',
    start_page: microApp.start_page || '',
    app_type: 2,
    start_params: '',
    link: '',
    product_image_width: imageInfo.width,
    product_image_height: imageInfo.height,
    product_image_uri: imageInfo.web_uri,
  }

  console.log('[后台搭建] 资产化完成')
  return initData
}

/**
 * 为单个抖音号批次创建项目和广告
 */
async function buildBatchForDouyin(drama, config, initData, dramaName, accountId, buildDate) {
  const bookId = drama.fields['短剧ID']?.value?.[0]?.text
  if (!bookId) {
    throw new Error('短剧ID不存在')
  }

  const cleanDramaName = sanitizeDramaName(dramaName)
  const promotionName = `小鱼-${config.douyinAccount}-${cleanDramaName}-${accountId}`

  const promotionResult = await createPromotionLink({
    book_id: bookId,
    drama_name: dramaName,
    promotion_name: promotionName,
  })

  const parsed = parsePromotionUrl(promotionResult.promotion_url)
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

  initData.app_id = appId
  initData.start_page = parsed.launchPage
  initData.start_params = cleanedParams
  initData.link = microAppLink
  initData.app_type = 2

  // 1. 创建项目
  const projectName = `小鱼-${config.douyinAccount}-${dramaName}-${buildDate}`
  const projectResult = await createProject({
    account_id: accountId,
    drama_name: dramaName,
    douyin_account_name: config.douyinAccount,
    assets_id: initData.assets_id,
    micro_app_instance_id: initData.micro_app_instance_id,
    project_name: projectName,
  })

  const projectId = projectResult.data.id

  // 2. 获取抖音号原始ID
  const accountInfoResult = await getDouyinAccountInfo({
    account_id: accountId,
    douyin_account_id: config.douyinAccountId,
  })

  if (accountInfoResult.code !== 0) {
    throw new Error(accountInfoResult.msg || '获取抖音号信息失败')
  }

  const accountInfo = accountInfoResult.data?.[0]
  if (!accountInfo) {
    throw new Error(`找不到抖音号 ${config.douyinAccount} 的信息`)
  }

  const iesCoreUserId = accountInfo.ies_core_id

  // 3. 获取素材列表
  const materialsResult = await getMaterialList({
    account_id: accountId,
    aweme_id: config.douyinAccountId,
    aweme_account: iesCoreUserId,
  })

  if (materialsResult.code !== 0) {
    throw new Error(materialsResult.msg || '获取素材列表失败')
  }

  // 4. 过滤素材
  const allMaterials =
    materialsResult.data.videos?.map(video => ({
      ...video,
      filename: video.video_name || video.filename,
    })) || []

  let dateString
  const feishuDate = drama.fields['日期']
  if (feishuDate) {
    const date = new Date(feishuDate)
    dateString = `${date.getMonth() + 1}.${date.getDate()}`
  }

  const filteredMaterials = filterMaterials(
    allMaterials,
    dramaName,
    config.materialRange,
    dateString
  )
  const sortedMaterials = sortMaterialsBySequence(filteredMaterials)

  if (sortedMaterials.length === 0) {
    throw new Error(`素材不足：没有找到符合条件的素材（日期=${dateString || '不限'}）`)
  }

  // 5. 创建广告
  const adName = `小鱼-${config.douyinAccount}-${dramaName}-${buildDate}`
  const promotionCreateResult = await createPromotion({
    account_id: accountId,
    project_id: projectId,
    ad_name: adName,
    drama_name: dramaName,
    ies_core_user_id: iesCoreUserId,
    materials: sortedMaterials,
    app_id: initData.app_id,
    start_page: initData.start_page,
    app_type: initData.app_type,
    start_params: initData.start_params,
    link: initData.link,
    product_image_uri: initData.product_image_uri,
    product_image_width: initData.product_image_width,
    product_image_height: initData.product_image_height,
  })

  if (promotionCreateResult.code !== 0) {
    throw new Error(promotionCreateResult.msg || '创建广告失败')
  }

  return promotionCreateResult
}

/**
 * 执行搭建流程
 */
async function executeSetup(drama, initData) {
  const dramaName = drama.fields['剧名']?.[0]?.text
  const accountId = drama.fields['账户']?.[0]?.text

  if (!dramaName || !accountId) {
    throw new Error('剧集信息不完整')
  }

  console.log(`[后台搭建] 开始搭建: ${dramaName}`)

  const douyinConfigs = await getDouyinConfigs(drama)
  if (douyinConfigs.length === 0) {
    throw new Error('没有配置抖音号')
  }

  const buildDate = formatBuildDate()
  const skippedBatches = []
  let hasSuccessBatch = false

  for (const config of douyinConfigs) {
    try {
      console.log(`[后台搭建] 正在搭建抖音号: ${config.douyinAccount}`)
      await buildBatchForDouyin(drama, config, { ...initData }, dramaName, accountId, buildDate)
      hasSuccessBatch = true
      console.log(`[后台搭建] ✅ 抖音号 ${config.douyinAccount} 批次完成`)
    } catch (error) {
      console.warn(`[后台搭建] ⚠️ 抖音号 ${config.douyinAccount} 批次跳过: ${error.message}`)
      skippedBatches.push({ account: config.douyinAccount, reason: error.message })
    }
  }

  if (!hasSuccessBatch) {
    const skippedInfo = skippedBatches.map(b => `${b.account}: ${b.reason}`).join('; ')
    throw new Error(`所有抖音号批次均失败: ${skippedInfo}`)
  }

  console.log(
    `[后台搭建] 搭建完成，成功批次: ${douyinConfigs.length - skippedBatches.length}/${douyinConfigs.length}`
  )
  return { success: true, skippedBatches }
}

/**
 * 搭建单个剧集
 */
async function buildSingleDrama(drama) {
  const dramaName = drama.fields['剧名']?.[0]?.text || '未知'

  try {
    // 资产化
    const initData = await executeAssetization(drama)

    // 搭建
    await executeSetup(drama, initData)

    // 更新飞书状态
    const buildTime = Date.now()
    await updateDramaStatus(drama.record_id, '已完成', buildTime, drama._tableId)

    console.log(`[后台搭建] ✅ 剧集 ${dramaName} 完成`)
    return { success: true, dramaName }
  } catch (error) {
    console.error(`[后台搭建] ❌ 剧集 ${dramaName} 失败:`, error.message)
    throw error
  }
}

// ============== 调度器控制 ==============

/**
 * 保存状态到文件
 */
async function saveState() {
  try {
    const dir = path.dirname(STATE_FILE_PATH)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(STATE_FILE_PATH, JSON.stringify(schedulerState, null, 2), 'utf-8')
  } catch (error) {
    console.error('[后台搭建] 保存状态失败:', error)
  }
}

/**
 * 从文件加载状态
 */
async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE_PATH, 'utf-8')
    const savedState = JSON.parse(data)
    schedulerState = { ...schedulerState, ...savedState }

    // 如果之前是启用状态，恢复定时器
    if (schedulerState.enabled && schedulerState.intervalMinutes) {
      console.log('[后台搭建] 恢复定时任务...')
      scheduleNextPolling()
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('[后台搭建] 加载状态失败:', error)
    }
  }
}

/**
 * 执行一次轮询周期
 * 成功则结束本次轮询，失败或跳过则继续下一部
 */
async function executePollingCycle() {
  if (!schedulerState.enabled) return

  // 防止并发执行：如果有任务正在执行，跳过本次轮询
  if (schedulerState.currentTask) {
    console.log(
      '[后台搭建] 检测到任务正在执行，跳过本次轮询:',
      schedulerState.currentTask.dramaName
    )
    // 仍然安排下次轮询
    scheduleNextPolling()
    return
  }

  console.log('[后台搭建] ========== 开始轮询周期 ==========')

  // 在轮询开始时立即计算下次运行时间（固定间隔，从现在开始计算）
  const intervalMs = schedulerState.intervalMinutes * 60 * 1000
  const now = new Date()
  schedulerState.lastRunTime = now.toISOString()
  schedulerState.nextRunTime = new Date(now.getTime() + intervalMs).toISOString()
  await saveState()

  try {
    // 1. 查询待搭建剧集
    let dramas = await getPendingSetupDramas()
    console.log('[后台搭建] 查询到 ' + dramas.length + ' 部待搭建剧集')

    // 2. 循环处理，��到成功或没有剧集
    let dramaIndex = 0
    while (dramas.length > 0) {
      console.log(
        `[后台搭建] ====== 第 ${dramaIndex + 1} 次尝试，队列中还有 ${dramas.length} 部剧集 ======`
      )
      const selectedDrama = selectHighestPriorityDrama(dramas)

      if (!selectedDrama) {
        console.log('[后台搭建] 未找到符合条件的剧集，等待下次轮询')
        break
      }

      const dramaName = selectedDrama.fields['剧名']?.[0]?.text || '未知'
      // 提取日期和上架时间用于任务历史记录
      const date = selectedDrama.fields['日期'] || null
      const publishTime = selectedDrama.fields['上架时间']?.value?.[0] || null
      console.log('[后台搭建] 选中剧集: ' + dramaName + ' (剩余 ' + (dramas.length - 1) + ' 部)')
      schedulerState.currentTask = {
        status: 'building',
        dramaName,
        startTime: new Date().toISOString(),
      }
      await saveState()

      // 3. 搭建该剧集
      try {
        await buildSingleDrama(selectedDrama)

        // 成功：更新统计和历史
        schedulerState.stats.totalBuilt++
        schedulerState.stats.successCount++

        schedulerState.taskHistory.unshift({
          dramaName,
          status: 'success',
          date,
          publishTime,
          completedAt: new Date().toISOString(),
        })
        if (schedulerState.taskHistory.length > 20) {
          schedulerState.taskHistory = schedulerState.taskHistory.slice(0, 20)
        }

        console.log('[后台搭建] ✅ 剧集 ' + dramaName + ' 完成，结束本次轮询')

        // 成功后结束本次轮询，等待下一个周期
        schedulerState.currentTask = null
        await saveState()
        scheduleNextPolling()
        return
      } catch (error) {
        // 失败或跳过：记录后继续下一部
        const isSkip = error.code === 'MICROAPP_NOT_APPROVED'
        const action = isSkip ? '跳过' : '失败'

        console.log('[后台搭建] ⚠️ 剧集 ' + dramaName + ' ' + action + ': ' + error.message)

        if (!isSkip) {
          schedulerState.stats.failCount++
        }

        // 更新飞书状态为失败/跳过，并记录原因到备注
        try {
          console.log('[后台搭建] 准备更新飞书状态...')
          await updateDramaStatus(
            selectedDrama.record_id,
            isSkip ? '跳过搭建' : '搭建失败',
            Date.now(),
            selectedDrama._tableId,
            error.message
          )
          console.log('[后台搭建] ✅ 已更新飞书状态为: ' + (isSkip ? '跳过搭建' : '搭建失败'))
        } catch (feishuError) {
          console.error('[后台搭建] ❌ 更新飞书状态失败:', feishuError.message)
        }

        console.log('[后台搭建] 准备更新任务历史...')
        try {
          schedulerState.taskHistory.unshift({
            dramaName,
            status: isSkip ? 'skipped' : 'failed',
            date,
            publishTime,
            error: error.message,
            completedAt: new Date().toISOString(),
          })
          if (schedulerState.taskHistory.length > 20) {
            schedulerState.taskHistory = schedulerState.taskHistory.slice(0, 20)
          }
          console.log('[后台搭建] ✅ 任务历史已更新')
        } catch (historyError) {
          console.error('[后台搭建] ❌ 更新任务历史失败:', historyError.message)
        }

        // 从待处理列表中移除，继续下一部
        console.log('[后台搭建] 准备从列表移除失败剧集...')
        const beforeFilterCount = dramas.length
        const selectedRecordId = selectedDrama.record_id
        console.log(`[后台搭建] 待移除的剧集 record_id: ${selectedRecordId}`)
        dramas = dramas.filter(d => d.record_id !== selectedRecordId)
        const afterFilterCount = dramas.length
        console.log(
          `[后台搭建] 已从列表移除 ${dramaName}，移除前: ${beforeFilterCount} 部，移除后: ${afterFilterCount} 部`
        )
        console.log('[后台搭建] 继续尝试下一部剧集')
        await saveState() // 保存状态，确保 progress 不会丢失
        dramaIndex++ // 增加尝试计数
      }
    }

    schedulerState.currentTask = null
    await saveState()

    // 所有剧集都跳过/失败，安排下次轮询
    scheduleNextPolling()
  } catch (error) {
    console.error('[后台搭建] 轮询周期异常:', error.message)

    schedulerState.currentTask = null
    await saveState()

    // 继续下次轮询（不停止）
    scheduleNextPolling()
  }
}

/**
 * 安排下次轮询
 * 注意：nextRunTime 在 executePollingCycle 开头就已经预先计算好了
 * 这里只负责设置定时器
 */
function scheduleNextPolling() {
  if (!schedulerState.intervalMinutes || !schedulerState.enabled) return

  const intervalMs = schedulerState.intervalMinutes * 60 * 1000

  if (pollingTimer) {
    clearTimeout(pollingTimer)
  }

  pollingTimer = setTimeout(() => {
    executePollingCycle()
  }, intervalMs)

  saveState()
}

/**
 * 启动调度器
 */
export async function startScheduler(intervalMinutes) {
  if (!intervalMinutes || intervalMinutes < 1) {
    throw new Error('轮询间隔必须大于等于1分钟')
  }

  console.log(`[后台搭建] 启动调度器，轮询间隔: ${intervalMinutes} 分钟`)

  schedulerState.enabled = true
  schedulerState.intervalMinutes = intervalMinutes
  schedulerState.stats = { totalBuilt: 0, successCount: 0, failCount: 0 }
  schedulerState.taskHistory = []

  await saveState()

  // 立即执行第一次轮询
  executePollingCycle()

  return getSchedulerStatus()
}

/**
 * 停止调度器
 */
export async function stopScheduler() {
  console.log('[后台搭建] 停止调度器')

  schedulerState.enabled = false

  if (pollingTimer) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }

  await saveState()

  return getSchedulerStatus()
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus() {
  return {
    enabled: schedulerState.enabled,
    intervalMinutes: schedulerState.intervalMinutes,
    nextRunTime: schedulerState.nextRunTime,
    lastRunTime: schedulerState.lastRunTime,
    stats: { ...schedulerState.stats },
    currentTask: schedulerState.currentTask ? { ...schedulerState.currentTask } : null,
    taskHistory: [...schedulerState.taskHistory],
  }
}

/**
 * 初始化调度器（服务启动时调用）
 */
export async function initScheduler() {
  console.log('[后台搭建] 初始化调度器...')
  await loadState()

  // 清除可能遗留的正在执行的任务（服务器重启导致任务中断）
  if (schedulerState.currentTask) {
    console.log('[后台搭建] 检测到遗留任务:', schedulerState.currentTask.dramaName)
    console.log('[后台搭建] 清除遗留任务状态，等待下次轮询重新处理')
    schedulerState.currentTask = null
    await saveState()
  }

  console.log('[后台搭建] 调度器状态:', schedulerState.enabled ? '运行中' : '已停止')
}

/**
 * 触发立即���行一次搭建（手动触发）
 * @param {string} specificDramaId - 可选，指定要搭建的剧集ID
 */
export async function triggerSchedulerBuild(specificDramaId = null) {
  console.log('[后台搭建] 手动触发搭建任务', specificDramaId ? `指定剧集: ${specificDramaId}` : '')

  if (!schedulerState.enabled) {
    throw new Error('后台调度器未启动，无法手动触发搭建')
  }

  // 防止并发执行：如果有任务正在执行，拒绝请求
  if (schedulerState.currentTask) {
    throw new Error(`已有任务正在执行: ${schedulerState.currentTask.dramaName}，请等待完成后再试`)
  }

  // 如果指定了剧集ID，直接搭建该剧集
  if (specificDramaId) {
    await buildSpecificDrama(specificDramaId)
  } else {
    // 立即执行一次轮询周期（自动选择）
    await executePollingCycle()
  }

  return getSchedulerStatus()
}

/**
 * 搭建指定的剧集
 * @param {string} dramaId - 剧集record_id
 */
async function buildSpecificDrama(dramaId) {
  console.log(`[后台搭建] 开始搭建指定剧集: ${dramaId}`)
  schedulerState.lastRunTime = new Date().toISOString()

  try {
    // 1. 查询待搭建剧集
    const dramas = await getPendingSetupDramas()
    console.log(`[后台搭建] 查询到 ${dramas.length} 部待搭建剧集`)

    // 2. 找到指定的剧集
    const targetDrama = dramas.find(d => d.record_id === dramaId)
    if (!targetDrama) {
      throw new Error(`找不到剧集ID: ${dramaId}`)
    }

    const dramaName = targetDrama.fields['剧名']?.[0]?.text || '未知'
    console.log(`[后台搭建] 找到指定剧集: ${dramaName}`)
    schedulerState.currentTask = {
      status: 'building',
      dramaName,
      startTime: new Date().toISOString(),
    }
    await saveState()

    // 3. 搭建该剧集
    await buildSingleDrama(targetDrama)

    // 4. 更新统计
    schedulerState.stats.totalBuilt++
    schedulerState.stats.successCount++

    // 5. 记录历史
    schedulerState.taskHistory.unshift({
      dramaName,
      status: 'success',
      completedAt: new Date().toISOString(),
    })
    if (schedulerState.taskHistory.length > 20) {
      schedulerState.taskHistory = schedulerState.taskHistory.slice(0, 20)
    }

    schedulerState.currentTask = null
    await saveState()
  } catch (error) {
    console.error('[后台搭建] 指定剧集搭建失败:', error.message)
    schedulerState.stats.failCount++

    const dramaName = schedulerState.currentTask?.dramaName || '未知'
    schedulerState.taskHistory.unshift({
      dramaName,
      status: 'failed',
      error: error.message,
      completedAt: new Date().toISOString(),
    })
    if (schedulerState.taskHistory.length > 20) {
      schedulerState.taskHistory = schedulerState.taskHistory.slice(0, 20)
    }

    schedulerState.currentTask = null
    await saveState()
    throw error
  }
}
