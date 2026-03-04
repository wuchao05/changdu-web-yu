/**
 * 自动提交下载后台调度服务
 * 将前端的自动提交下载功能迁移到服务端，支持定时轮询、状态持久化
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { FEISHU_CONFIG, getFeishuConfig } from '../config/feishu.js'
import { AUTO_SUBMIT_CONFIG } from '../config/autoSubmit.js'
import { buildChangduGetHeaders } from '../utils/changduSign.js'
import { CHANGDU_BASE_URL } from '../config/changdu.js'
import { readAuthConfig } from '../routes/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 将 ISO 时间字符串转换为北京时间格式
 * @param {string | null} isoString - ISO 格式的时间字符串
 * @returns {string | null} 北京时间格式 "YYYY-MM-DD HH:mm:ss"
 */
function toBeijingTime(isoString) {
  if (!isoString) return null
  const date = new Date(isoString)
  // 转换为北京时间（UTC+8）
  const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const year = beijingDate.getUTCFullYear()
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(beijingDate.getUTCDate()).padStart(2, '0')
  const hours = String(beijingDate.getUTCHours()).padStart(2, '0')
  const minutes = String(beijingDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(beijingDate.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const isProduction = process.env.NODE_ENV === 'production'

/**
 * 安全解析 JSON 响应
 */
async function safeJsonParse(response, context = '') {
  const status = response.status
  const text = await response.text()
  if (!text || text.trim() === '') {
    console.error(`[自动提交] ${context} 响应为空, HTTP状态: ${status}, URL: ${response.url}`)
    throw new Error(`${context ? context + ': ' : ''}响应为空 (HTTP ${status})`)
  }
  try {
    return JSON.parse(text)
  } catch (e) {
    console.error(
      `[自动提交] JSON解析失败 ${context}, HTTP状态: ${status}:`,
      text.substring(0, 500)
    )
    throw new Error(`${context ? context + ': ' : ''}JSON解析失败 - ${e.message}`)
  }
}

// 状态文件路径
const STATE_FILE_PATH = isProduction
  ? '/data/changdu-web-yu/auto-submit-scheduler-state.json'
  : path.join(__dirname, '../data/auto-submit-scheduler-state.json')

// 创建默认状态对象
function createDefaultState() {
  return {
    enabled: false,
    intervalMinutes: 5,
    nextRunTime: null,
    lastRunTime: null,
    running: false,
    stats: {
      totalProcessed: 0,
      successCount: 0,
      failCount: 0,
      skipCount: 0,
    },
    currentTask: null,
    progress: {
      current: 0,
      total: 0,
      currentDate: '',
      currentDrama: '',
    },
    taskHistory: [],
  }
}

// 调度器状态
const scheduler = {
  state: createDefaultState(),
  timer: null,
}

// ============== 工具函数 ==============

/**
 * 延时函数
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 获取北京时间的今天/明天/后天日期
 */
function getDateRanges() {
  const now = new Date()
  // 转换为北京时间 (UTC+8)
  const beijingOffset = 8 * 60 * 60 * 1000
  const beijingNow = new Date(now.getTime() + beijingOffset)

  const todayStart = new Date(beijingNow)
  todayStart.setUTCHours(0, 0, 0, 0)

  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const dayAfterTomorrowStart = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000)
  const dayAfterTomorrowEnd = new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000)

  return {
    today: todayStart,
    tomorrow: tomorrowStart,
    dayAfterTomorrow: dayAfterTomorrowStart,
    dayAfterTomorrowEnd: dayAfterTomorrowEnd,
    // 用于API请求的时间戳（秒）
    startTime: Math.floor((todayStart.getTime() - 30 * 24 * 60 * 60 * 1000) / 1000),
    endTime: Math.floor(dayAfterTomorrowEnd.getTime() / 1000),
  }
}

/**
 * 判断两个日期是否是同一天（北京时间）
 */
function isSameDay(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  )
}

/**
 * 格式化日期为可读字符串
 */
function formatDate(date) {
  const d = new Date(date)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// ============== 状态持久化 ==============

/**
 * 保存状态到文件
 */
async function saveState() {
  try {
    const dir = path.dirname(STATE_FILE_PATH)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(STATE_FILE_PATH, JSON.stringify(scheduler.state, null, 2))
  } catch (error) {
    console.error('[自动提交] 保存状态失败:', error.message)
  }
}

/**
 * 加载状态
 */
async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE_PATH, 'utf-8')
    const savedState = JSON.parse(data)
    scheduler.state = { ...scheduler.state, ...savedState }
    console.log('[自动提交] 已加载保存的状态')
  } catch {
    console.log('[自动提交] 未找到状态文件，使用默认状态')
  }
}

/**
 * 添加任务历史记录
 */
function addTaskHistory(record) {
  scheduler.state.taskHistory.unshift({
    ...record,
    timestamp: new Date().toISOString(),
  })
  // 只保留最近50条
  if (scheduler.state.taskHistory.length > 50) {
    scheduler.state.taskHistory = scheduler.state.taskHistory.slice(0, 50)
  }
}

// ============== 飞书 API ==============

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

  const data = await safeJsonParse(response, '获取飞书token')
  if (data.code !== 0) {
    throw new Error(`获取飞书 access token 失败: ${data.msg}`)
  }
  return data.tenant_access_token
}

/**
 * 搜索飞书剧集清单
 */
async function searchDramaList(dramaName) {
  const config = await getFeishuConfig()
  const accessToken = await getFeishuAccessToken()
  const tableIds = config.table_ids

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${tableIds.drama_list}/records/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        field_names: ['剧名', '上架时间'],
        filter: {
          conjunction: 'and',
          conditions: [
            {
              field_name: '剧名',
              operator: 'contains',
              value: [dramaName],
            },
          ],
        },
        page_size: 20,
      }),
    }
  )

  return safeJsonParse(response, '搜索剧集清单')
}
async function createDramaRecord(dramaName, publishTime, bookId) {
  const config = await getFeishuConfig()
  const accessToken = await getFeishuAccessToken()
  const tableIds = config.table_ids

  const fields = { 剧名: dramaName }

  if (bookId) {
    fields['短剧ID'] = bookId
  }

  if (publishTime) {
    try {
      const timestamp = new Date(publishTime).getTime()
      if (!isNaN(timestamp)) {
        fields['上架时间'] = timestamp
      }
    } catch {}
  }

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${tableIds.drama_list}/records`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ fields }),
    }
  )

  const result = await safeJsonParse(response, '创建剧集清单记录')
  if (result.code !== 0) {
    throw new Error(`创建剧集清单记录失败: ${result.msg}`)
  }
  return result
}

/**
 * 查询可用的虎鱼账户
 */
async function getAvailableHuyuAccounts() {
  const config = await getFeishuConfig()
  const accessToken = await getFeishuAccessToken()
  const tableIds = config.table_ids

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${tableIds.account}/records/search?ignore_consistency_check=true`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        field_names: ['账户', '是否已用'],
        page_size: 1000,
      }),
    }
  )

  const result = await safeJsonParse(response, '查询账户列表')
  if (result.code !== 0) {
    throw new Error(`查询账户列表失败: ${result.msg}`)
  }

  // 过滤出未使用的账户
  const accounts = result.data?.items || []
  const availableAccounts = accounts.filter(item => {
    const isUsed = item.fields?.['是否已用']
    // 未使用的账户：字段为空、为"否"或不存在
    return !isUsed || isUsed === '否' || (Array.isArray(isUsed) && isUsed.length === 0)
  })

  return availableAccounts
}

/**
 * 获取抖音素材配置
 * @returns {string} 格式化后的抖音素材配置字符串
 */
async function getDouyinMaterialConfig() {
  try {
    const authConfig = await readAuthConfig()
    const matches = Array.isArray(authConfig.douyinMaterialMatches)
      ? authConfig.douyinMaterialMatches
      : []

    if (matches.length === 0) {
      return ''
    }

    // 格式化为与前端一致的格式：每行 "抖音号 抖音号ID 素材范围"
    return matches
      .filter(match => match.douyinAccount && match.douyinAccountId && match.materialRange)
      .map(match => `${match.douyinAccount} ${match.douyinAccountId} ${match.materialRange}`)
      .join('\n')
  } catch (error) {
    console.error('[自动提交] 读取抖音素材配置失败:', error.message)
    return ''
  }
}

/**
 * 获取第一个可用账户
 */
async function getFirstAvailableAccount() {
  const accounts = await getAvailableHuyuAccounts()
  if (accounts.length === 0) {
    return null
  }

  const first = accounts[0]
  // 飞书返回的账户字段可能是数组格式 [{text: "xxx", type: "text"}] 或字符串
  const accountField = first.fields?.['账户']
  let accountValue = ''
  if (typeof accountField === 'string') {
    accountValue = accountField
  } else if (Array.isArray(accountField) && accountField[0]?.text) {
    accountValue = accountField[0].text
  }

  return {
    account: accountValue,
    recordId: first.record_id,
  }
}

/**
 * 创建剧集状态记录
 */
async function createDramaStatusRecord(params) {
  const config = await getFeishuConfig()
  const { dramaName, publishTime, account, subjectValue, status, douyinMaterial } = params
  const accessToken = await getFeishuAccessToken()
  const tableIds = config.table_ids

  // 计算日期时间戳（与前端逻辑一致）
  // 将首发时间转换为当天00:00:00的13位时间戳
  let dateTimestamp = Date.now()
  if (publishTime) {
    try {
      const dateOnly = publishTime.split(' ')[0] // 提取日期部分 YYYY-MM-DD
      const publishDateAtMidnight = new Date(`${dateOnly} 00:00:00`)

      // 获取今天00:00:00的时间戳
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTimestamp = today.getTime()

      // 如果首发时间早于今天00:00:00，则使用今天00:00:00的时间戳
      dateTimestamp =
        publishDateAtMidnight.getTime() < todayTimestamp
          ? todayTimestamp
          : publishDateAtMidnight.getTime()
    } catch {
      // 解析失败则使用当前时间
    }
  }

  const fields = {
    剧名: dramaName,
    当前状态: status || '待提交',
    日期: dateTimestamp,
  }

  if (account) {
    fields['账户'] = account
  }

  if (subjectValue) {
    fields['主体'] = subjectValue
  }

  if (publishTime) {
    try {
      const timestamp = new Date(publishTime).getTime()
      if (!isNaN(timestamp)) {
        fields['上架时间'] = timestamp
      }
    } catch {}
  }

  if (douyinMaterial) {
    fields['抖音素材'] = douyinMaterial
  }

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${tableIds.drama_status}/records`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ fields }),
    }
  )

  const result = await safeJsonParse(response, '创建剧集状态记录')
  if (result.code !== 0) {
    console.error('[自动提交] 创建剧集状态记录失败，请求字段:', JSON.stringify(fields))
    console.error('[自动提交] 飞书返回:', JSON.stringify(result))
    throw new Error(`创建剧集状态记录失败: ${result.msg}`)
  }
  return result
}

/**
 * 更新账户使用状态
 */
async function updateAccountUsedStatus(recordId) {
  const config = await getFeishuConfig()
  const accessToken = await getFeishuAccessToken()
  const tableIds = config.table_ids

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${tableIds.account}/records/${recordId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fields: {
          是否已用: '是',
        },
      }),
    }
  )

  const result = await safeJsonParse(response, '更新账户状态')
  if (result.code !== 0) {
    throw new Error(`更新账户状态失败: ${result.msg}`)
  }
  return result
}

// ============== 常读平台 API ==============

/**
 * 获取剧集清单表ID（用于API请求）
 */
async function getDramaListTableId() {
  const config = await getFeishuConfig()
  return config.table_ids.drama_list
}

/**
 * 获取当前主体的cookie
 */
async function getSubjectCookie() {
  const authConfig = await readAuthConfig()
  return authConfig.changduCookie || ''
}

function extractCsrfToken(cookie = '') {
  const match = cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match?.[1] || ''
}

async function getJiliangAuth() {
  const authConfig = await readAuthConfig()
  const cookie = authConfig.juliangCookie || ''

  return {
    cookie,
    csrfToken: extractCsrfToken(cookie),
  }
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
  return { distributorId, secretKey }
}

/**
 * 获取新剧列表 - 使用常读开放平台 API（签名认证）
 * @param {Object} params - 请求参数
 * @param {number} params.pageIndex - 页码
 * @param {number} params.pageSize - 每页数量
 */
async function getNewDramaList(params = {}) {
  const { pageIndex = 0, pageSize = 100, dramaListTableId } = params

  const { distributorId, secretKey } = await getChangduSignConfig()

  // 构建请求参数（与手动刷新一致）
  const requestParams = {
    distributor_id: distributorId,
    page_index: pageIndex,
    page_size: pageSize,
  }

  // 添加飞书清单表 ID（用于判断剧集是否已存在）
  if (dramaListTableId) {
    requestParams.drama_list_table_id = dramaListTableId
  }

  // 添加授权状态过滤
  if (AUTO_SUBMIT_CONFIG.filter.permissionStatuses) {
    requestParams.permission_statuses = AUTO_SUBMIT_CONFIG.filter.permissionStatuses
  }

  // 生成签名头部
  const { headers: signHeaders } = buildChangduGetHeaders(
    requestParams,
    undefined,
    distributorId,
    secretKey
  )

  // 构建查询字符串
  const queryString = new URLSearchParams(
    Object.entries(requestParams).map(([k, v]) => [k, String(v)])
  ).toString()

  // 请求常读开放平台 API（与手动刷新使用相同的 API）
  const apiUrl = `${CHANGDU_BASE_URL}/content/series/list/v1/?${queryString}`

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      ...signHeaders,
      'Content-Type': 'application/json',
    },
  })

  // 检查 HTTP 状态码
  if (!response.ok) {
    const text = await response.text()
    console.error(`[自动提交] 获取新剧列表 HTTP ${response.status}:`, text.substring(0, 200))
    throw new Error(`获取新剧列表: HTTP ${response.status} - ${response.statusText}`)
  }

  const apiResult = await safeJsonParse(response, '获取新剧列表')

  // 转换数据格式以保持兼容性
  // 新 API 返回: { code: 200, message, total, data: [] }
  // 转换为: { code: 0, data: { data: [], total } }
  if (apiResult.code === 200) {
    const transformedData = (apiResult.data || []).map(item => {
      const seriesInfo = item.series_info || {}
      return {
        ...seriesInfo,
        media_config: item.media_config,
        book_paywall: item.book_paywall,
        series_paywall: item.series_paywall,
        free_series_paywall: item.free_series_paywall,
        free_book_paywall: item.free_book_paywall,
        price_changed: item.price_changed,
        unit_price: item.unit_price,
        start_chapter: item.start_chapter,
        ad_episode: item.ad_episode,
        ad_word_number: item.ad_word_number,
        short_book_ad_episode: item.short_book_ad_episode,
      }
    })

    return {
      code: 0,
      message: apiResult.message || 'success',
      data: {
        data: transformedData,
        total: apiResult.total || 0,
      },
    }
  } else {
    // API 返回错误
    return {
      code: apiResult.code,
      message: apiResult.message || '请求失败',
      data: {
        data: [],
        total: 0,
      },
    }
  }
}

/**
 * 带重试的获取新剧列表
 */
async function getNewDramaListWithRetry(
  params,
  retries = AUTO_SUBMIT_CONFIG.pagination.maxRetries
) {
  try {
    const result = await getNewDramaList(params)

    // 检查是否是速率限制错误（兼容新旧 API 的错误码）
    const isRateLimited =
      (result.code === 500 || result.code === 429) &&
      (result.message?.includes('访问速度过快') || result.message?.includes('rate limit'))

    if (isRateLimited && retries > 0) {
      console.log(`[自动提交] 请求被限速，${AUTO_SUBMIT_CONFIG.pagination.retryDelay}ms后重试...`)
      await wait(AUTO_SUBMIT_CONFIG.pagination.retryDelay)
      return getNewDramaListWithRetry(params, retries - 1)
    }

    return result
  } catch (error) {
    // 网络错误等异常情况下的重试
    if (retries > 0) {
      console.log(
        `[自动提交] 请求失败: ${error.message}，${AUTO_SUBMIT_CONFIG.pagination.retryDelay}ms后重试...`
      )
      await wait(AUTO_SUBMIT_CONFIG.pagination.retryDelay)
      return getNewDramaListWithRetry(params, retries - 1)
    }
    throw error
  }
}

/**
 * 获取下载任务列表
 */
async function getDownloadTaskList(startTime, endTime) {
  const queryParams = new URLSearchParams({
    start_time: String(startTime),
    end_time: String(endTime),
    page_index: '0',
    page_size: '20000',
  })

  // 使用代理服务器
  const url = `https://www.changdunovel.com/node/api/platform/distributor/download_center/task_list/?${queryParams.toString()}`

  // 获取cookie
  const authConfig = await readAuthConfig()
  const headerAuthConfig = authConfig.headers || {}
  const cookie = await getSubjectCookie()

  // 仅使用 auth 配置中的 headers.*，不再使用旧结构兜底
  if (!headerAuthConfig.appid) {
    throw new Error('自动提交配置缺失: auth.headers.appid')
  }
  if (!headerAuthConfig.apptype) {
    throw new Error('自动提交配置缺失: auth.headers.apptype')
  }
  if (!headerAuthConfig.distributorId) {
    throw new Error('自动提交配置缺失: auth.headers.distributorId')
  }
  if (!headerAuthConfig.adUserId) {
    throw new Error('自动提交配置缺失: auth.headers.adUserId')
  }
  if (!headerAuthConfig.rootAdUserId) {
    throw new Error('自动提交配置缺失: auth.headers.rootAdUserId')
  }

  const headerConfig = {
    Appid: headerAuthConfig.appid,
    Apptype: headerAuthConfig.apptype,
    Distributorid: headerAuthConfig.distributorId,
    Aduserid: headerAuthConfig.adUserId,
    Rootaduserid: headerAuthConfig.rootAdUserId,
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...headerConfig,
      Cookie: cookie,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })

  return safeJsonParse(response, '获取下载任务列表')
}

// ============== 巨量 API ==============

/**
 * 更新巨量账户备注
 */
async function editJiliangAccountRemark(accountId, remark) {
  const { cookie, csrfToken } = await getJiliangAuth()

  const response = await fetch(
    'https://business.oceanengine.com/nbs/api/bm/promotion/edit_account_remark',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ account_id: accountId, remark }),
    }
  )

  return safeJsonParse(response, '更新巨量账户备注')
}

// ============== 核心业务逻辑 ==============

/**
 * 获取并过滤今天/明天/后天的剧集
 */
async function fetchAutoSubmitDramas() {
  const dateRanges = getDateRanges()

  console.log('[自动提交] ========== 获取剧集 ==========')
  console.log('[自动提交] 今天:', formatDate(dateRanges.today))
  console.log('[自动提交] 明天:', formatDate(dateRanges.tomorrow))
  console.log('[自动提交] 后天:', formatDate(dateRanges.dayAfterTomorrow))

  const dramaListTableId = await getDramaListTableId()
  const { batchSize, batchDelay, totalPages } = AUTO_SUBMIT_CONFIG.pagination

  // 并发获取下载任务列表
  const downloadResult = await getDownloadTaskList(dateRanges.startTime, dateRanges.endTime)
  const downloadList = downloadResult.data || []
  console.log('[自动提交] 下载任务列表:', downloadList.length, '条')

  // 分批获取剧集列表
  const dramaResults = []
  for (let batchStart = 0; batchStart < totalPages; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalPages)
    const batchPromises = Array.from({ length: batchEnd - batchStart }, (_, i) =>
      getNewDramaListWithRetry({
        pageIndex: batchStart + i,
        pageSize: 100,
        dramaListTableId,
      })
    )
    const batchResults = await Promise.all(batchPromises)
    dramaResults.push(...batchResults)

    if (batchEnd < totalPages) {
      await wait(batchDelay)
    }
  }

  // 合并并去重
  const allDramaData = dramaResults.flatMap(result => result.data?.data || [])
  const uniqueDramas = allDramaData.reduce((acc, drama) => {
    if (!acc.find(item => item.book_id === drama.book_id)) {
      acc.push(drama)
    }
    return acc
  }, [])

  console.log('[自动提交] 去重后的剧集总数:', uniqueDramas.length)

  // 过滤剧集
  const filteredDramas = uniqueDramas.filter(drama => {
    if (drama.dy_audit_status !== AUTO_SUBMIT_CONFIG.filter.dyAuditStatus) return false
    if (drama.episode_amount && drama.episode_amount < AUTO_SUBMIT_CONFIG.filter.minEpisodeAmount)
      return false
    return true
  })

  console.log('[自动提交] 过滤后的剧集总数:', filteredDramas.length)

  // 按日期分组
  const todayDramas = []
  const tomorrowDramas = []
  const dayAfterTomorrowDramas = []

  for (const drama of filteredDramas) {
    if (!drama.publish_time) continue

    const publishTime = new Date(drama.publish_time)

    if (isSameDay(publishTime, dateRanges.today)) {
      todayDramas.push(drama)
    } else if (isSameDay(publishTime, dateRanges.tomorrow)) {
      tomorrowDramas.push(drama)
    } else if (isSameDay(publishTime, dateRanges.dayAfterTomorrow)) {
      dayAfterTomorrowDramas.push(drama)
    }
  }

  console.log('[自动提交] 今天的剧集数:', todayDramas.length)
  console.log('[自动提交] 明天的剧集数:', tomorrowDramas.length)
  console.log('[自动提交] 后天的剧集数:', dayAfterTomorrowDramas.length)

  return {
    today: todayDramas,
    tomorrow: tomorrowDramas,
    dayAfterTomorrow: dayAfterTomorrowDramas,
    downloadList,
  }
}

/**
 * 根据剧名获取下载数据
 */
function getDownloadDataForDrama(downloadList, dramaName) {
  const name = dramaName?.trim()
  if (!name) return null
  return downloadList.find(item => item.book_name?.trim() === name) || null
}

/**
 * 按优先级排序剧集
 */
function sortDramasByPriority(dramas, downloadList) {
  return [...dramas].sort((a, b) => {
    // 优先级：飞书清单中不存在 && 下载中心有完成的任务
    const aDownloadData = getDownloadDataForDrama(downloadList, a.series_name)
    const bDownloadData = getDownloadDataForDrama(downloadList, b.series_name)
    const aCanAdd = !a.feishu_downloaded && !a.feishu_exists && aDownloadData?.task_status === 2
    const bCanAdd = !b.feishu_downloaded && !b.feishu_exists && bDownloadData?.task_status === 2
    if (aCanAdd !== bCanAdd) return aCanAdd ? -1 : 1

    return 0
  })
}

/**
 * 处理单部剧的提交
 */
async function processDrama(drama, downloadList) {
  const dramaName = drama.series_name

  try {
    // 1. 检查可用账户
    const availableAccount = await getFirstAvailableAccount()
    if (!availableAccount) {
      console.log('[自动提交] 无可用账户，跳过:', dramaName)
      return { success: false, reason: 'no_account' }
    }

    // 2. 搜索飞书剧集清单，检查是否已存在
    const searchResult = await searchDramaList(dramaName)
    if (searchResult.data && searchResult.data.total > 0) {
      const existingDrama = searchResult.data.items.find(item => {
        const itemDramaName = item.fields['剧名']?.[0]?.text
        return itemDramaName === dramaName
      })

      if (existingDrama) {
        console.log('[自动提交] 剧集已存在，跳过:', dramaName)
        return { success: false, reason: 'already_exists' }
      }
    }

    // 3. 创建飞书剧集清单记录
    await createDramaRecord(dramaName, drama.publish_time, drama.book_id)
    console.log('[自动提交] 创建剧集清单记录成功:', dramaName)

    // 4. 主体字段值固定为每日
    const subjectValue = '每日'

    // 5. 根据下载状态确定飞书状态
    const downloadData = getDownloadDataForDrama(downloadList, dramaName)
    const taskStatus = downloadData?.task_status
    const readyStatuses = AUTO_SUBMIT_CONFIG.taskStatus.readyStatuses
    const feishuStatus =
      taskStatus !== undefined && readyStatuses.includes(taskStatus) ? '待下载' : '待提交'

    // 6. 获取抖音素材配置
    const douyinMaterial = await getDouyinMaterialConfig()

    // 7. 创建剧集状态记录
    await createDramaStatusRecord({
      dramaName,
      publishTime: drama.publish_time,
      account: availableAccount.account,
      subjectValue,
      status: feishuStatus,
      douyinMaterial: douyinMaterial || undefined,
    })
    console.log('[自动提交] 创建剧集状态记录成功，分配账户:', availableAccount.account)

    // 8. 更新账户使用状态
    await updateAccountUsedStatus(availableAccount.recordId)

    // 9. 更新巨量账户备注
    if (availableAccount.account) {
      try {
        const remark = `小鱼-${dramaName}`
        await editJiliangAccountRemark(availableAccount.account, remark)
        console.log('[自动提交] 更新巨量账户备注成功:', availableAccount.account)
      } catch (jiliangError) {
        console.error('[自动提交] 更新巨量账户备注失败:', jiliangError.message)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[自动提交] 处理失败:', dramaName, error.message)
    return { success: false, reason: 'error', error: error.message }
  }
}

/**
 * 执行自动提交流程
 */
async function runAutoSubmitCycle() {
  const state = scheduler.state

  if (!state.enabled) return
  if (state.running) {
    console.log('[自动提交] 上一轮仍在运行，跳过本次')
    return
  }

  state.running = true
  state.currentTask = {
    startTime: new Date().toISOString(),
    status: 'running',
  }
  await saveState()

  try {
    console.log('[自动提交] ========== 开始自动提交流程 ==========')

    // 1. 获取并过滤剧集
    const { today, tomorrow, dayAfterTomorrow, downloadList } = await fetchAutoSubmitDramas()

    // 2. 按日期分组处理
    const dateGroups = [
      { date: '今天', dramas: today },
      { date: '明天', dramas: tomorrow },
      { date: '后天', dramas: dayAfterTomorrow },
    ]

    let processedCount = 0
    let successCount = 0
    let failCount = 0
    let skipCount = 0

    for (const dateGroup of dateGroups) {
      if (!state.enabled) {
        console.log('[自动提交] 已停止')
        break
      }

      state.progress.currentDate = dateGroup.date

      // 3. 过滤符合条件的剧
      const eligibleDramas = dateGroup.dramas.filter(d => {
        // 条件1: 飞书清单中不存在
        if (d.feishu_downloaded || d.feishu_exists) return false

        // 条件2: 下载中心有完成的任务
        const downloadData = getDownloadDataForDrama(downloadList, d.series_name)
        if (!downloadData || downloadData.task_status !== 2) return false

        return true
      })

      if (eligibleDramas.length === 0) {
        console.log(`[自动提交] ${dateGroup.date}没有需要处理的剧集`)
        continue
      }

      // 4. 排序
      const sortedDramas = sortDramasByPriority(eligibleDramas, downloadList)

      console.log(`[自动提交] 开始处理${dateGroup.date}的剧集，共 ${sortedDramas.length} 部`)

      // 5. 依次处理
      state.progress.total = sortedDramas.length
      for (let i = 0; i < sortedDramas.length; i++) {
        if (!state.enabled) {
          console.log('[自动提交] 已停止')
          break
        }

        const drama = sortedDramas[i]
        state.progress.current = i + 1
        state.progress.currentDrama = drama.series_name
        await saveState()

        console.log(`[自动提交] 处理第 ${i + 1}/${sortedDramas.length} 部：${drama.series_name}`)

        const result = await processDrama(drama, downloadList)
        processedCount++

        if (result.success) {
          successCount++
          console.log(`[自动提交] ✓ ${drama.series_name} 处理成功`)
        } else if (result.reason === 'already_exists' || result.reason === 'no_account') {
          skipCount++
        } else {
          failCount++
          console.log(
            `[自动提交] ✗ ${drama.series_name} 处理失败: ${result.error || result.reason}`
          )
        }

        // 等待 1 秒
        await wait(1000)
      }

      console.log(`[自动提交] ${dateGroup.date}的剧集处理完成`)
    }

    // 更新统计
    state.stats.totalProcessed += processedCount
    state.stats.successCount += successCount
    state.stats.failCount += failCount
    state.stats.skipCount += skipCount

    // 记录历史
    addTaskHistory({
      status: 'completed',
      processed: processedCount,
      success: successCount,
      fail: failCount,
      skip: skipCount,
    })

    console.log('[自动提交] ========== 自动提交流程完成 ==========')
    console.log(
      `[自动提交] 本轮统计: 处理 ${processedCount}, 成功 ${successCount}, 失败 ${failCount}, 跳过 ${skipCount}`
    )
  } catch (error) {
    console.error('[自动提交] 执行失败:', error.message)
    addTaskHistory({
      status: 'error',
      error: error.message,
    })
  } finally {
    state.running = false
    state.lastRunTime = new Date().toISOString()
    state.currentTask = null
    state.progress = { current: 0, total: 0, currentDate: '', currentDrama: '' }

    // 如果还启用，设置下次运行
    if (state.enabled) {
      scheduleNextRun()
    }

    await saveState()
  }
}

/**
 * 调度下次运行
 */
function scheduleNextRun() {
  const state = scheduler.state
  const intervalMs = state.intervalMinutes * 60 * 1000
  state.nextRunTime = new Date(Date.now() + intervalMs).toISOString()

  console.log('[自动提交] 下次运行时间:', state.nextRunTime)

  if (scheduler.timer) {
    clearTimeout(scheduler.timer)
  }

  scheduler.timer = setTimeout(() => {
    runAutoSubmitCycle()
  }, intervalMs)
}

// ============== 导出的控制函数 ==============

/**
 * 启动调度器
 */
export async function startScheduler(options = {}) {
  const { intervalMinutes = 5 } = options

  const state = scheduler.state

  if (state.enabled) {
    console.log('[自动提交] 调度器已经在运行')
    return { success: false, message: '调度器已经在运行' }
  }

  state.enabled = true
  state.intervalMinutes = intervalMinutes

  console.log('[自动提交] 启动调度器，轮询间隔:', intervalMinutes, '分钟')

  await saveState()

  // 立即执行一次
  runAutoSubmitCycle()

  return { success: true, message: '调度器已启动' }
}

/**
 * 停止调度器
 */
export async function stopScheduler() {
  console.log('[自动提交] 停止调度器')

  const state = scheduler.state

  state.enabled = false
  state.running = false
  state.nextRunTime = null
  state.currentTask = null
  state.progress = { current: 0, total: 0, currentDate: '', currentDrama: '' }

  if (scheduler.timer) {
    clearTimeout(scheduler.timer)
    scheduler.timer = null
  }

  await saveState()

  return { success: true, message: '调度器已停止' }
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus() {
  const state = scheduler.state
  return {
    enabled: state.enabled,
    running: state.running,
    intervalMinutes: state.intervalMinutes,
    nextRunTime: toBeijingTime(state.nextRunTime),
    lastRunTime: toBeijingTime(state.lastRunTime),
    stats: state.stats,
    progress: state.progress,
    taskHistory: state.taskHistory.slice(0, 10).map(task => ({
      ...task,
      timestamp: toBeijingTime(task.timestamp),
    })),
  }
}

/**
 * 手动触发一次执行
 */
export async function triggerManualRun() {
  const state = scheduler.state

  if (state.running) {
    return { success: false, message: '当前正在运行中' }
  }

  console.log('[自动提交] 手动触发执行')

  // 临时启用以执行一次
  const wasEnabled = state.enabled
  state.enabled = true

  await runAutoSubmitCycle()

  // 如果之前未启用，恢复状态
  if (!wasEnabled) {
    state.enabled = false
    if (scheduler.timer) {
      clearTimeout(scheduler.timer)
      scheduler.timer = null
    }
  }

  return { success: true, message: '手动执行完成' }
}

/**
 * 重置统计数据
 */
export async function resetStats() {
  const state = scheduler.state

  state.stats = {
    totalProcessed: 0,
    successCount: 0,
    failCount: 0,
    skipCount: 0,
  }
  state.taskHistory = []
  await saveState()
  return { success: true, message: '统计已重置' }
}

/**
 * 初始化调度器（服务启动时调用）
 */
export async function initScheduler() {
  // 加载状态
  await loadState()

  // 服务器重启后，重置 running 状态
  scheduler.state.running = false
  scheduler.state.progress = { current: 0, total: 0, currentDate: '', currentDrama: '' }

  // 如果之前是启用状态，自动恢复
  if (scheduler.state.enabled) {
    console.log('[自动提交] 恢复之前的调度状态')
    scheduleNextRun()
  }
}
