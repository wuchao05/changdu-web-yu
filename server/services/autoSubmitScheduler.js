/**
 * 自动提交下载后台调度服务
 * 将前端的自动提交下载功能迁移到服务端，支持定时轮询、状态持久化
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { FEISHU_CONFIG } from '../config/feishu.js'
import { AUTO_SUBMIT_CONFIG } from '../config/autoSubmit.js'
import { buildChangduGetHeaders } from '../utils/changduSign.js'
import {
  CHANGDU_BASE_URL,
  CHANGDU_DISTRIBUTOR_ID,
  CHANGDU_SECRET_KEY,
  CHANGDU_DAILY_DISTRIBUTOR_ID,
  CHANGDU_DAILY_SECRET_KEY,
} from '../config/changdu.js'
import { readAuthConfig } from '../routes/auth.js'
import { getProductLibraryConfigBySubject, DEFAULT_TEAM_ID } from '../config/productLibrary.js'

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

// 抖音素材配置文件路径（与 douyinMaterial 路由保持一致）
const isProduction = process.env.NODE_ENV === 'production'
const DOUYIN_MATERIAL_CONFIG_FILES = {
  daily: isProduction
    ? '/data/changdu-web/douyin-material-config.json'
    : path.join(__dirname, '../data/douyin-material-config.json'),
  sanrou: isProduction
    ? '/data/changdu-web/douyin-material-config_sanrou.json'
    : path.join(__dirname, '../data/douyin-material-config_sanrou.json'),
  qianlong: isProduction
    ? '/data/changdu-web/douyin-material-config_qianlong.json'
    : path.join(__dirname, '../data/douyin-material-config_qianlong.json'),
}

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

// 状态文件路径（按主体分离）
function getStateFilePath(subject) {
  const fileName = `auto-submit-scheduler-state-${subject}.json`
  return isProduction
    ? `/data/changdu-web/${fileName}`
    : path.join(__dirname, `../data/${fileName}`)
}

// 旧状态文件路径（用于迁移）
const OLD_STATE_FILE_PATH = isProduction
  ? '/data/changdu-web/auto-submit-scheduler-state.json'
  : path.join(__dirname, '../data/auto-submit-scheduler-state.json')

// 创建默认状态对象
function createDefaultState() {
  return {
    enabled: false,
    intervalMinutes: 5,
    nextRunTime: null,
    lastRunTime: null,
    running: false,
    onlyRedFlag: false,
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

// 多主体调度器状态（每个主体独立）
const schedulers = {
  daily: {
    state: createDefaultState(),
    timer: null,
  },
  sanrou: {
    state: createDefaultState(),
    timer: null,
  },
  qianlong: {
    state: createDefaultState(),
    timer: null,
  },
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
async function saveState(subject) {
  try {
    const stateFilePath = getStateFilePath(subject)
    const dir = path.dirname(stateFilePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(stateFilePath, JSON.stringify(schedulers[subject].state, null, 2))
  } catch (error) {
    console.error(`[自动提交-${subject}] 保存状态失败:`, error.message)
  }
}

/**
 * 加载状态
 */
async function loadState(subject) {
  try {
    const stateFilePath = getStateFilePath(subject)
    const data = await fs.readFile(stateFilePath, 'utf-8')
    const savedState = JSON.parse(data)
    schedulers[subject].state = { ...schedulers[subject].state, ...savedState }
    console.log(`[自动提交-${subject}] 已加载保存的状态`)
  } catch {
    console.log(`[自动提交-${subject}] 未找到状态文件，使用默认状态`)
  }
}

/**
 * 迁移旧状态文件到新的按主体分离的文件
 */
async function migrateOldState() {
  try {
    const data = await fs.readFile(OLD_STATE_FILE_PATH, 'utf-8')
    const oldState = JSON.parse(data)

    // 根据旧状态的 subject 字段迁移到对应的新文件
    const subject = oldState.subject || 'daily'
    if (schedulers[subject]) {
      schedulers[subject].state = { ...schedulers[subject].state, ...oldState }
      await saveState(subject)
      console.log(`[自动提交] 已迁移旧状态文件到 ${subject} 主体`)

      // 删除旧文件
      await fs.unlink(OLD_STATE_FILE_PATH)
      console.log('[自动提交] 已删除旧状态文件')
    }
  } catch {
    // 旧文件不存在或读取失败，忽略
  }
}

/**
 * 添加任务历史记录
 */
function addTaskHistory(subject, record) {
  schedulers[subject].state.taskHistory.unshift({
    ...record,
    timestamp: new Date().toISOString(),
  })
  // 只保留最近50条
  if (schedulers[subject].state.taskHistory.length > 50) {
    schedulers[subject].state.taskHistory = schedulers[subject].state.taskHistory.slice(0, 50)
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
 * 获取表ID配置
 */
function getTableIds(subject) {
  if (subject === 'daily') {
    return FEISHU_CONFIG.daily_table_ids
  } else if (subject === 'qianlong') {
    return FEISHU_CONFIG.qianlong_table_ids
  } else {
    return FEISHU_CONFIG.table_ids // 散柔
  }
}

/**
 * 搜索飞书剧集清单
 */
async function searchDramaList(subject, dramaName) {
  const accessToken = await getFeishuAccessToken()
  const tableIds = getTableIds(subject)

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.app_token}/tables/${tableIds.drama_list}/records/search`,
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
async function createDramaRecord(subject, dramaName, publishTime, bookId, rating) {
  const accessToken = await getFeishuAccessToken()
  const tableIds = getTableIds(subject)

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

  // 每日主体才有评级字段
  if (rating && subject === 'daily') {
    fields['评级'] = rating
  }

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.app_token}/tables/${tableIds.drama_list}/records`,
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
async function getAvailableHuyuAccounts(subject) {
  const accessToken = await getFeishuAccessToken()
  const tableIds = getTableIds(subject)

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.app_token}/tables/${tableIds.account}/records/search?ignore_consistency_check=true`,
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
 * 获取抖音素材配置（根据当前主体）
 * @returns {string} 格式化后的抖音素材配置字符串
 */
async function getDouyinMaterialConfig(subject) {
  // 根据主体选择配置文件
  let configFile
  if (subject === 'daily') {
    configFile = DOUYIN_MATERIAL_CONFIG_FILES.daily
  } else if (subject === 'sanrou') {
    configFile = DOUYIN_MATERIAL_CONFIG_FILES.sanrou
  } else if (subject === 'qianlong') {
    configFile = DOUYIN_MATERIAL_CONFIG_FILES.qianlong
  } else {
    return ''
  }

  try {
    const content = await fs.readFile(configFile, 'utf-8')
    const config = JSON.parse(content)
    const matches = config.matches || []

    if (matches.length === 0) {
      return ''
    }

    // 格式化为与前端一致的格式：每行 "抖音号 抖音号ID 素材范围"
    return matches
      .filter(match => match.douyinAccount && match.douyinAccountId && match.materialRange)
      .map(match => `${match.douyinAccount} ${match.douyinAccountId} ${match.materialRange}`)
      .join('\n')
  } catch (error) {
    console.error(`[自动提交-${subject}] 读取抖音素材配置失败: ${error.message}`)
    return ''
  }
}

/**
 * 获取第一个可用账户
 */
async function getFirstAvailableAccount(subject) {
  const accounts = await getAvailableHuyuAccounts(subject)
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
async function createDramaStatusRecord(subject, params) {
  const { dramaName, publishTime, account, subjectValue, status, douyinMaterial, rating } = params
  const accessToken = await getFeishuAccessToken()
  const tableIds = getTableIds(subject)

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

  if (rating) {
    fields['评级'] = rating
  }

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.app_token}/tables/${tableIds.drama_status}/records`,
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
    console.error(`[自动提交-${subject}] 创建剧集状态记录失败，请求字段:`, JSON.stringify(fields))
    console.error(`[自动提交-${subject}] 飞书返回:`, JSON.stringify(result))
    throw new Error(`创建剧集状态记录失败: ${result.msg}`)
  }
  return result
}

/**
 * 更新账户使用状态
 */
async function updateAccountUsedStatus(subject, recordId) {
  const accessToken = await getFeishuAccessToken()
  const tableIds = getTableIds(subject)

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.app_token}/tables/${tableIds.account}/records/${recordId}`,
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
function getDramaListTableId(subject) {
  if (subject === 'daily') {
    return FEISHU_CONFIG.daily_table_ids.drama_list
  } else if (subject === 'qianlong') {
    return FEISHU_CONFIG.qianlong_table_ids.drama_list
  }
  return FEISHU_CONFIG.table_ids.drama_list
}

/**
 * 获取当前主体的cookie
 */
async function getSubjectCookie(subject) {
  const authConfig = await readAuthConfig()
  const unifiedCookie = authConfig.platforms?.changdu?.cookie || ''
  if (unifiedCookie) {
    return unifiedCookie
  }

  if (subject === 'daily') {
    return authConfig.platforms?.changdu?.mr?.cookie || ''
  } else if (subject === 'qianlong') {
    return authConfig.platforms?.changdu?.ql?.cookie || ''
  }
  return authConfig.platforms?.changdu?.sr?.cookie || ''
}

function extractCsrfToken(cookie = '') {
  const match = cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match?.[1] || ''
}

async function getJiliangAuth() {
  const authConfig = await readAuthConfig()
  const cookie =
    authConfig.platforms?.jiliang?.cookie ||
    authConfig.platforms?.ocean?.mr ||
    authConfig.platforms?.ocean?.sr ||
    ''

  return {
    cookie,
    csrfToken: extractCsrfToken(cookie),
  }
}

/**
 * 获取新剧列表 - 使用常读开放平台 API（签名认证）
 * @param {Object} params - 请求参数
 * @param {number} params.pageIndex - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.subject - 使用哪个主体的渠道（'daily' | 'sanrou' | 'qianlong'）
 */
async function getNewDramaList(params = {}) {
  const { pageIndex = 0, pageSize = 100, subject, dramaListTableId } = params

  // 根据主体选择 distributorId 和 secretKey
  const isDaily = subject === 'daily'
  const distributorId = isDaily ? CHANGDU_DAILY_DISTRIBUTOR_ID : CHANGDU_DISTRIBUTOR_ID
  const secretKey = isDaily ? CHANGDU_DAILY_SECRET_KEY : CHANGDU_SECRET_KEY

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
async function getDownloadTaskList(subject, startTime, endTime) {
  const queryParams = new URLSearchParams({
    start_time: String(startTime),
    end_time: String(endTime),
    page_index: '0',
    page_size: '20000',
  })

  // 使用代理服务器
  const url = `https://www.changdunovel.com/node/api/platform/distributor/download_center/task_list/?${queryParams.toString()}`

  // 获取cookie
  const cookie = await getSubjectCookie(subject)

  // 下载中心专用头部
  const headerConfig =
    subject === 'daily'
      ? {
          Appid: '40011566',
          Apptype: '7',
          Aduserid: '1291245239407612',
          Rootaduserid: '600762415841560',
          Distributorid: '1844565955364887',
        }
      : {
          Appid: '40012555',
          Apptype: '7',
          Aduserid: '380892546610362',
          Rootaduserid: '380892546610362',
          Distributorid: '1842236883646506',
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

// ============== 商品 API ==============

const SPLAY_BASE_URL = 'https://splay-admin.lnkaishi.cn'

/**
 * 获取XT Token
 */
async function getXtToken(subject) {
  const authConfig = await readAuthConfig()

  // 散柔/每日主体使用 xh token，牵龙主体使用 daren token
  if (subject === 'sanrou' || subject === 'daily') {
    return authConfig.tokens?.xh || ''
  } else if (subject === 'qianlong') {
    return authConfig.tokens?.daren || ''
  }
  return authConfig.tokens?.xh || ''
}

/**
 * 搜索番茄后台剧集
 */
async function searchSplayAlbums(subject, dramaName) {
  const token = await getXtToken(subject)
  if (!token) {
    throw new Error('未配置 XT Token')
  }

  const encodedTitle = encodeURIComponent(dramaName)
  const queryString = `team_id=${DEFAULT_TEAM_ID}&title=${encodedTitle}&page=1&page_size=100&dy_audit_status=-1&from=1&category_id=-1`

  const response = await fetch(`${SPLAY_BASE_URL}/album/search?${queryString}`, {
    method: 'GET',
    headers: {
      token,
    },
  })

  return safeJsonParse(response, '搜索番茄后台剧集')
}

/**
 * 获取小程序链接
 */
async function getSplayMiniProgramUrl(subject, albumId) {
  const token = await getXtToken(subject)
  if (!token) {
    throw new Error('未配置 XT Token')
  }

  // 根据主体获取对应的商品库配置
  const subjectConfigMap = {
    daily: '超琦',
    sanrou: '超琦',
    qianlong: '欣雅',
  }
  const productConfig = getProductLibraryConfigBySubject(undefined, subjectConfigMap[subject])
  const params = new URLSearchParams({
    team_id: DEFAULT_TEAM_ID,
    ad_account_id: productConfig.adAccountId,
    album_id: String(albumId),
  })

  const response = await fetch(`${SPLAY_BASE_URL}/product/miniUrl?${params.toString()}`, {
    method: 'GET',
    headers: {
      token,
    },
  })

  return safeJsonParse(response, '获取小程序链接')
}

/**
 * 添加番茄剧集（用于 is_delete === 1 的剧集）
 */
async function addTomatoAlbum(subject, bookId) {
  const token = await getXtToken(subject)
  if (!token) return

  try {
    await fetch(`${SPLAY_BASE_URL}/config/tomatoAlbum?team_id=${DEFAULT_TEAM_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token,
      },
      body: JSON.stringify({
        book_id: bookId,
        category_id: 1,
      }),
    })
    console.log(`[自动提交-${subject}] 成功添加番茄剧集:`, bookId)
  } catch (error) {
    console.error(`[自动提交-${subject}] 添加番茄剧集失败:`, error.message)
  }
}

/**
 * 查找匹配的剧集
 */
async function findMatchingAlbum(subject, albums, dramaName) {
  // 先找 promotion_status === 1 且 publish_status === 1 的
  const exactlyMatched = albums.find(
    album => album.title === dramaName && album.promotion_status === 1 && album.publish_status === 1
  )

  if (exactlyMatched) {
    if (exactlyMatched.is_delete === 1 && exactlyMatched.copyright_content_id) {
      await addTomatoAlbum(subject, exactlyMatched.copyright_content_id)
    }
    return exactlyMatched
  }

  // 其次找 promotion_status === 1 的
  const matched = albums.find(album => album.title === dramaName && album.promotion_status === 1)
  if (matched) {
    if (matched.is_delete === 1 && matched.copyright_content_id) {
      await addTomatoAlbum(subject, matched.copyright_content_id)
    }
    return matched
  }

  return null
}

/**
 * 创建商品
 */
async function createSplayProduct(subject, payload) {
  const token = await getXtToken(subject)
  if (!token) {
    throw new Error('未配置 XT Token')
  }

  const response = await fetch(`${SPLAY_BASE_URL}/product/create?team_id=${DEFAULT_TEAM_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
    body: JSON.stringify(payload),
  })

  return safeJsonParse(response, '创建商品')
}

/**
 * 查询商品是否存在
 */
async function checkProductExists(subject, dramaName) {
  const token = await getXtToken(subject)
  if (!token) {
    return false
  }

  // 根据主体获取对应的商品库配置
  const subjectConfigMap = {
    daily: '超琦',
    sanrou: '超琦',
    qianlong: '欣雅',
  }
  const productConfig = getProductLibraryConfigBySubject(undefined, subjectConfigMap[subject])
  const params = new URLSearchParams({
    team_id: DEFAULT_TEAM_ID,
    ad_account_id: productConfig.adAccountId,
    product_platform_id: productConfig.productPlatformId,
    page: '1',
    page_size: '20',
    product_name: dramaName,
  })

  try {
    const response = await fetch(`${SPLAY_BASE_URL}/product/list?${params.toString()}`, {
      method: 'GET',
      headers: {
        token,
      },
    })

    const result = await safeJsonParse(response, '查询商品列表')
    if (result.data?.list && Array.isArray(result.data.list)) {
      return result.data.list.some(item => item.name === dramaName)
    }
    return false
  } catch (error) {
    console.log(`[自动提交-${subject}] 查询商品失败: ${dramaName}`, error.message)
    return false
  }
}

/**
 * 处理商品新增（非每日主体时）
 */
async function handleAddProduct(subject, drama) {
  const dramaName = drama.series_name
  if (!dramaName) {
    console.log(`[自动提交-${subject}] 剧名为空，跳过新增商品`)
    return
  }

  const token = await getXtToken(subject)
  if (!token) {
    console.log(`[自动提交-${subject}] 未配置 XT Token，跳过新增商品`)
    return
  }

  try {
    // 1. 检查商品是否已存在
    const exists = await checkProductExists(subject, dramaName)
    if (exists) {
      console.log(`[自动提交-${subject}] ✓ ${dramaName} 商品已存在，无需新增`)
      return
    }

    // 2. 搜索番茄后台剧集
    const albumResponse = await searchSplayAlbums(subject, dramaName)
    if (albumResponse.code !== 0 || !albumResponse.data) {
      console.log(`[自动提交-${subject}] ✗ ${dramaName} 番茄后台查询失败`)
      return
    }

    // 3. 查找匹配的剧集
    const album = await findMatchingAlbum(subject, albumResponse.data.list || [], dramaName)
    if (!album) {
      console.log(`[自动提交-${subject}] ✗ ${dramaName} 番茄后台未找到符合条件的剧`)
      return
    }

    // 4. 获取小程序链接
    const miniProgramResponse = await getSplayMiniProgramUrl(subject, album.id)
    if (miniProgramResponse.code !== 0 || !miniProgramResponse.data) {
      console.log(`[自动提交-${subject}] ✗ ${dramaName} 获取小程序链接失败`)
      return
    }

    // 5. 确定主体对应的商品库配置
    const subjectConfigMap = {
      daily: '超琦', // 每日主体不会走到这里，但保持一致
      sanrou: '超琦', // 散柔 → 超琦
      qianlong: '欣雅', // 牵龙 → 欣雅
    }
    const productConfig = getProductLibraryConfigBySubject(undefined, subjectConfigMap[subject])
    const coverUrl = album.cover || drama.original_thumb_url || ''

    // 固定的商品分类配置
    const productPayload = {
      product_list: [
        {
          mini_program_info: miniProgramResponse.data,
          playlet_gender: '3', // 其他（'1'=男频, '2'=女频, '3'=其他）
          name: dramaName,
          ad_carrier: '字节小程序',
          album_id: album.id,
          image_url: coverUrl,
          first_category: '短剧',
          sub_category: '都市',
          third_category: '其他',
          first_category_id: '2019',
          sub_category_id: '201901',
          third_category_id: '20190133',
        },
      ],
      ad_account_id: productConfig.adAccountId,
      is_free: 0,
      product_platform_id: productConfig.productPlatformId,
    }

    // 6. 创建商品（带重试）
    let delay = 1000
    const maxDelay = 8000
    let retryCount = 0
    const maxRetries = 5

    while (retryCount < maxRetries) {
      const response = await createSplayProduct(subject, productPayload)
      console.log(`[自动提交-${subject}] ${dramaName} 创建商品响应:`, JSON.stringify(response))
      const result = response.data?.[0]

      if (result && !result.result && result.product_id) {
        console.log(`[自动提交-${subject}] ✓ ${dramaName} 商品新增成功`)
        return
      }

      if (result?.result?.includes('系统请求频率超限')) {
        console.log(`[自动提交-${subject}] ${dramaName} 请求频率超限，${delay}ms后重试...`)
        await wait(delay)
        delay = Math.min(delay * 2, maxDelay)
        retryCount++
        continue
      }

      throw new Error(result?.result || '新增商品失败')
    }

    console.log(`[自动提交-${subject}] ✗ ${dramaName} 商品新增失败：重试次数超限`)
  } catch (error) {
    console.log(`[自动提交-${subject}] ✗ ${dramaName} 商品处理失败:`, error.message)
    throw error
  }
}

// ============== 核心业务逻辑 ==============

/**
 * 获取并过滤今天/明天/后天的剧集
 */
async function fetchAutoSubmitDramas(subject) {
  const dateRanges = getDateRanges()

  console.log(`[自动提交-${subject}] ========== 获取剧集 ==========`)
  console.log(`[自动提交-${subject}] 今天:`, formatDate(dateRanges.today))
  console.log(`[自动提交-${subject}] 明天:`, formatDate(dateRanges.tomorrow))
  console.log(`[自动提交-${subject}] 后天:`, formatDate(dateRanges.dayAfterTomorrow))

  const dramaListTableId = getDramaListTableId(subject)
  const { batchSize, batchDelay, totalPages } = AUTO_SUBMIT_CONFIG.pagination

  // 并发获取下载任务列表
  const downloadResult = await getDownloadTaskList(
    subject,
    dateRanges.startTime,
    dateRanges.endTime
  )
  const downloadList = downloadResult.data || []
  console.log(`[自动提交-${subject}] 下载任务列表:`, downloadList.length, '条')

  // 分批获取剧集列表
  const dramaResults = []
  for (let batchStart = 0; batchStart < totalPages; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalPages)
    const batchPromises = Array.from({ length: batchEnd - batchStart }, (_, i) =>
      getNewDramaListWithRetry({
        pageIndex: batchStart + i,
        pageSize: 100,
        subject,
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

  console.log(`[自动提交-${subject}] 去重后的剧集总数:`, uniqueDramas.length)

  // 过滤剧集
  const filteredDramas = uniqueDramas.filter(drama => {
    if (drama.dy_audit_status !== AUTO_SUBMIT_CONFIG.filter.dyAuditStatus) return false
    if (drama.episode_amount && drama.episode_amount < AUTO_SUBMIT_CONFIG.filter.minEpisodeAmount)
      return false
    return true
  })

  console.log(`[自动提交-${subject}] 过滤后的剧集总数:`, filteredDramas.length)

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

  console.log(`[自动提交-${subject}] 今天的剧集数:`, todayDramas.length)
  console.log(`[自动提交-${subject}] 明天的剧集数:`, tomorrowDramas.length)
  console.log(`[自动提交-${subject}] 后天的剧集数:`, dayAfterTomorrowDramas.length)

  // 增剧对比（每日主体）
  const newDramaSet = new Set()
  if (subject === 'daily') {
    try {
      // 获取散柔主体的剧集列表用于对比
      const sanrouResults = []
      for (let batchStart = 0; batchStart < totalPages; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalPages)
        const batchPromises = Array.from({ length: batchEnd - batchStart }, (_, i) =>
          getNewDramaListWithRetry({
            pageIndex: batchStart + i,
            pageSize: 100,
            subject: 'sanrou', // 使用散柔渠道
          })
        )
        const batchResults = await Promise.all(batchPromises)
        sanrouResults.push(...batchResults)

        if (batchEnd < totalPages) {
          await wait(batchDelay)
        }
      }

      const sanrouAllData = sanrouResults.flatMap(result => result.data?.data || [])
      const uniqueSanrouDramas = sanrouAllData.reduce((acc, drama) => {
        if (!acc.find(item => item.book_id === drama.book_id)) {
          acc.push(drama)
        }
        return acc
      }, [])

      const sanrouFiltered = uniqueSanrouDramas.filter(drama => {
        if (drama.dy_audit_status !== AUTO_SUBMIT_CONFIG.filter.dyAuditStatus) return false
        if (
          drama.episode_amount &&
          drama.episode_amount < AUTO_SUBMIT_CONFIG.filter.minEpisodeAmount
        )
          return false
        return true
      })

      console.log(`[自动提交-${subject}] 散柔剧集（过滤后）:`, sanrouFiltered.length)

      const sanrouBookIds = new Set(sanrouFiltered.map(d => d.book_id))

      // 找出增剧
      const allThreeDaysDramas = [...todayDramas, ...tomorrowDramas, ...dayAfterTomorrowDramas]
      for (const drama of allThreeDaysDramas) {
        if (!sanrouBookIds.has(drama.book_id)) {
          newDramaSet.add(drama.book_id)
        }
      }

      console.log(`[自动提交-${subject}] 增剧数量:`, newDramaSet.size)
    } catch (error) {
      console.error(`[自动提交-${subject}] 增剧对比失败:`, error.message)
    }
  }

  return {
    today: todayDramas,
    tomorrow: tomorrowDramas,
    dayAfterTomorrow: dayAfterTomorrowDramas,
    downloadList,
    newDramaSet,
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
function sortDramasByPriority(dramas, downloadList, newDramaSet) {
  return [...dramas].sort((a, b) => {
    // 优先级 1：红标剧（增剧）
    const aIsNew = newDramaSet.has(a.book_id)
    const bIsNew = newDramaSet.has(b.book_id)
    if (aIsNew !== bIsNew) return aIsNew ? -1 : 1

    // 优先级 2：飞书清单中不存在 && 下载中心有完成的任务
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
async function processDrama(subject, drama, downloadList, newDramaSet) {
  const dramaName = drama.series_name

  try {
    // 1. 检查可用账户
    const availableAccount = await getFirstAvailableAccount(subject)
    if (!availableAccount) {
      console.log(`[自动提交-${subject}] 无可用账户，跳过: ${dramaName}`)
      return { success: false, reason: 'no_account' }
    }

    // 2. 搜索飞书剧集清单，检查是否已存在
    const searchResult = await searchDramaList(subject, dramaName)
    if (searchResult.data && searchResult.data.total > 0) {
      const existingDrama = searchResult.data.items.find(item => {
        const itemDramaName = item.fields['剧名']?.[0]?.text
        return itemDramaName === dramaName
      })

      if (existingDrama) {
        console.log(`[自动提交-${subject}] 剧集已存在，跳过: ${dramaName}`)
        return { success: false, reason: 'already_exists' }
      }
    }

    // 3. 确定评级
    let rating
    if (subject === 'daily') {
      const isRedFlagDrama = newDramaSet.has(drama.book_id)
      rating = isRedFlagDrama ? '红标' : '黄标'
    }

    // 4. 创建飞书剧集清单记录
    await createDramaRecord(
      subject,
      dramaName,
      drama.publish_time,
      subject === 'daily' ? drama.book_id : undefined,
      rating
    )
    console.log(`[自动提交-${subject}] 创建剧集清单记录成功: ${dramaName}`)

    // 5. 确定主体字段值
    const subjectValue = subject === 'daily' ? '每日' : subject === 'qianlong' ? '欣雅' : '超琦'

    // 6. 根据下载状态确定飞书状态
    const downloadData = getDownloadDataForDrama(downloadList, dramaName)
    const taskStatus = downloadData?.task_status
    const readyStatuses = AUTO_SUBMIT_CONFIG.taskStatus.readyStatuses
    const feishuStatus =
      taskStatus !== undefined && readyStatuses.includes(taskStatus) ? '待下载' : '待提交'

    // 7. 获取抖音素材配置（根据当前主体）
    const douyinMaterial = await getDouyinMaterialConfig(subject)

    // 8. 创建剧集状态记录
    await createDramaStatusRecord(subject, {
      dramaName,
      publishTime: drama.publish_time,
      account: availableAccount.account,
      subjectValue,
      status: feishuStatus,
      douyinMaterial: douyinMaterial || undefined, // 如果为空字符串则传 undefined
      rating, // 传递评级参数
    })
    console.log(`[自动提交-${subject}] 创建剧集状态记录成功，分配账户: ${availableAccount.account}`)

    // 9. 更新账户使用状态
    await updateAccountUsedStatus(subject, availableAccount.recordId)

    // 10. 更新巨量账户备注（每日主体）
    if (subject === 'daily' && availableAccount.account) {
      try {
        const remark = `小红-${dramaName}`
        await editJiliangAccountRemark(availableAccount.account, remark)
        console.log(`[自动提交-${subject}] 更新巨量账户备注成功: ${availableAccount.account}`)
      } catch (jiliangError) {
        console.error(`[自动提交-${subject}] 更新巨量账户备注失败:`, jiliangError.message)
      }
    }

    // 11. 非每日主体时，需要检查并新增商品
    if (subject !== 'daily') {
      try {
        await handleAddProduct(subject, drama)
      } catch (productError) {
        console.log(`[自动提交-${subject}] ${dramaName} 商品处理失败:`, productError.message)
        // 商品失败不中断整个流程
      }
    }

    return { success: true }
  } catch (error) {
    console.error(`[自动提交-${subject}] 处理失败: ${dramaName}`, error.message)
    return { success: false, reason: 'error', error: error.message }
  }
}

/**
 * 执行自动提交流程
 */
async function runAutoSubmitCycle(subject) {
  const state = schedulers[subject].state

  if (!state.enabled) return
  if (state.running) {
    console.log(`[自动提交-${subject}] 上一轮仍在运行，跳过本次`)
    return
  }

  state.running = true
  state.currentTask = {
    startTime: new Date().toISOString(),
    status: 'running',
  }
  await saveState(subject)

  try {
    console.log(`[自动提交-${subject}] ========== 开始自动提交流程 ==========`)

    // 1. 获取并过滤剧集
    const { today, tomorrow, dayAfterTomorrow, downloadList, newDramaSet } =
      await fetchAutoSubmitDramas(subject)

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
        console.log(`[自动提交-${subject}] 已停止`)
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

        // 条件3: 如果是每日主体且只提交红标剧
        if (subject === 'daily' && state.onlyRedFlag && !newDramaSet.has(d.book_id)) return false

        return true
      })

      if (eligibleDramas.length === 0) {
        console.log(`[自动提交-${subject}] ${dateGroup.date}没有需要处理的剧集`)
        continue
      }

      // 4. 排序
      const sortedDramas = sortDramasByPriority(eligibleDramas, downloadList, newDramaSet)

      const filterMode = subject === 'daily' && state.onlyRedFlag ? '仅红标剧' : '所有剧'
      console.log(
        `[自动提交-${subject}] 开始处理${dateGroup.date}的剧集，共 ${sortedDramas.length} 部（筛选模式：${filterMode}）`
      )

      // 5. 依次处理
      state.progress.total = sortedDramas.length
      for (let i = 0; i < sortedDramas.length; i++) {
        if (!state.enabled) {
          console.log(`[自动提交-${subject}] 已停止`)
          break
        }

        const drama = sortedDramas[i]
        state.progress.current = i + 1
        state.progress.currentDrama = drama.series_name
        await saveState(subject)

        const redFlagLabel = subject === 'daily' && newDramaSet.has(drama.book_id) ? ' [红标]' : ''
        console.log(
          `[自动提交-${subject}] 处理第 ${i + 1}/${sortedDramas.length} 部：${drama.series_name}${redFlagLabel}`
        )

        const result = await processDrama(subject, drama, downloadList, newDramaSet)
        processedCount++

        if (result.success) {
          successCount++
          console.log(`[自动提交-${subject}] ✓ ${drama.series_name} 处理成功`)
        } else if (result.reason === 'already_exists' || result.reason === 'no_account') {
          skipCount++
        } else {
          failCount++
          console.log(
            `[自动提交-${subject}] ✗ ${drama.series_name} 处理失败: ${result.error || result.reason}`
          )
        }

        // 等待 1 秒
        await wait(1000)
      }

      console.log(`[自动提交-${subject}] ${dateGroup.date}的剧集处理完成`)
    }

    // 更新统计
    state.stats.totalProcessed += processedCount
    state.stats.successCount += successCount
    state.stats.failCount += failCount
    state.stats.skipCount += skipCount

    // 记录历史
    addTaskHistory(subject, {
      status: 'completed',
      processed: processedCount,
      success: successCount,
      fail: failCount,
      skip: skipCount,
    })

    console.log(`[自动提交-${subject}] ========== 自动提交流程完成 ==========`)
    console.log(
      `[自动提交-${subject}] 本轮统计: 处理 ${processedCount}, 成功 ${successCount}, 失败 ${failCount}, 跳过 ${skipCount}`
    )
  } catch (error) {
    console.error(`[自动提交-${subject}] 执行失败:`, error.message)
    addTaskHistory(subject, {
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
      scheduleNextRun(subject)
    }

    await saveState(subject)
  }
}

/**
 * 调度下次运行
 */
function scheduleNextRun(subject) {
  const state = schedulers[subject].state
  const intervalMs = state.intervalMinutes * 60 * 1000
  state.nextRunTime = new Date(Date.now() + intervalMs).toISOString()

  console.log(`[自动提交-${subject}] 下次运行时间: ${state.nextRunTime}`)

  if (schedulers[subject].timer) {
    clearTimeout(schedulers[subject].timer)
  }

  schedulers[subject].timer = setTimeout(() => {
    runAutoSubmitCycle(subject)
  }, intervalMs)
}

// ============== 导出的控制函数 ==============

/**
 * 启动调度器
 */
export async function startScheduler(subject, options = {}) {
  const { intervalMinutes = 5, onlyRedFlag = false } = options

  const state = schedulers[subject].state

  if (state.enabled) {
    console.log(`[自动提交-${subject}] 调度器已经在运行`)
    return { success: false, message: '调度器已经在运行' }
  }

  state.enabled = true
  state.intervalMinutes = intervalMinutes
  state.onlyRedFlag = onlyRedFlag

  console.log(`[自动提交-${subject}] 启动调度器，轮询间隔: ${intervalMinutes} 分钟`)
  console.log(`[自动提交-${subject}] 仅红标: ${onlyRedFlag}`)

  await saveState(subject)

  // 立即执行一次
  runAutoSubmitCycle(subject)

  return { success: true, message: '调度器已启动' }
}

/**
 * 停止调度器
 */
export async function stopScheduler(subject) {
  console.log(`[自动提交-${subject}] 停止调度器`)

  const state = schedulers[subject].state

  state.enabled = false
  state.running = false
  state.nextRunTime = null
  state.currentTask = null
  state.progress = { current: 0, total: 0, currentDate: '', currentDrama: '' }

  if (schedulers[subject].timer) {
    clearTimeout(schedulers[subject].timer)
    schedulers[subject].timer = null
  }

  await saveState(subject)

  return { success: true, message: '调度器已停止' }
}

/**
 * 获取调度器状态（单个主体或所有主体）
 */
export function getSchedulerStatus(subject) {
  // 如果指定了主体，返回该主体的状态
  if (subject) {
    const state = schedulers[subject].state
    return {
      enabled: state.enabled,
      running: state.running,
      intervalMinutes: state.intervalMinutes,
      onlyRedFlag: state.onlyRedFlag,
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

  // 否则返回所有主体的状态
  return {
    daily: {
      enabled: schedulers.daily.state.enabled,
      running: schedulers.daily.state.running,
      intervalMinutes: schedulers.daily.state.intervalMinutes,
      onlyRedFlag: schedulers.daily.state.onlyRedFlag,
      nextRunTime: toBeijingTime(schedulers.daily.state.nextRunTime),
      lastRunTime: toBeijingTime(schedulers.daily.state.lastRunTime),
      stats: schedulers.daily.state.stats,
      progress: schedulers.daily.state.progress,
      taskHistory: schedulers.daily.state.taskHistory.slice(0, 10).map(task => ({
        ...task,
        timestamp: toBeijingTime(task.timestamp),
      })),
    },
    sanrou: {
      enabled: schedulers.sanrou.state.enabled,
      running: schedulers.sanrou.state.running,
      intervalMinutes: schedulers.sanrou.state.intervalMinutes,
      onlyRedFlag: schedulers.sanrou.state.onlyRedFlag,
      nextRunTime: toBeijingTime(schedulers.sanrou.state.nextRunTime),
      lastRunTime: toBeijingTime(schedulers.sanrou.state.lastRunTime),
      stats: schedulers.sanrou.state.stats,
      progress: schedulers.sanrou.state.progress,
      taskHistory: schedulers.sanrou.state.taskHistory.slice(0, 10).map(task => ({
        ...task,
        timestamp: toBeijingTime(task.timestamp),
      })),
    },
    qianlong: {
      enabled: schedulers.qianlong.state.enabled,
      running: schedulers.qianlong.state.running,
      intervalMinutes: schedulers.qianlong.state.intervalMinutes,
      onlyRedFlag: schedulers.qianlong.state.onlyRedFlag,
      nextRunTime: toBeijingTime(schedulers.qianlong.state.nextRunTime),
      lastRunTime: toBeijingTime(schedulers.qianlong.state.lastRunTime),
      stats: schedulers.qianlong.state.stats,
      progress: schedulers.qianlong.state.progress,
      taskHistory: schedulers.qianlong.state.taskHistory.slice(0, 10).map(task => ({
        ...task,
        timestamp: toBeijingTime(task.timestamp),
      })),
    },
  }
}

/**
 * 手动触发一次执行
 */
export async function triggerManualRun(subject) {
  const state = schedulers[subject].state

  if (state.running) {
    return { success: false, message: '当前正在运行中' }
  }

  console.log(`[自动提交-${subject}] 手动触发执行`)

  // 临时启用以执行一次
  const wasEnabled = state.enabled
  state.enabled = true

  await runAutoSubmitCycle(subject)

  // 如果之前未启用，恢复状态
  if (!wasEnabled) {
    state.enabled = false
    if (schedulers[subject].timer) {
      clearTimeout(schedulers[subject].timer)
      schedulers[subject].timer = null
    }
  }

  return { success: true, message: '手动执行完成' }
}

/**
 * 重置统计数据
 */
export async function resetStats(subject) {
  const state = schedulers[subject].state

  state.stats = {
    totalProcessed: 0,
    successCount: 0,
    failCount: 0,
    skipCount: 0,
  }
  state.taskHistory = []
  await saveState(subject)
  return { success: true, message: '统计已重置' }
}

/**
 * 初始化调度器（服务启动时调用）
 */
export async function initScheduler() {
  // 尝试迁移旧状态文件
  await migrateOldState()

  // 加载所有主体的状态
  await Promise.all([loadState('daily'), loadState('sanrou'), loadState('qianlong')])

  // 服务器重启后，重置所有主体的 running 状态
  for (const subject of ['daily', 'sanrou', 'qianlong']) {
    schedulers[subject].state.running = false
    schedulers[subject].state.progress = { current: 0, total: 0, currentDate: '', currentDrama: '' }

    // 如果之前是启用状态，自动恢复
    if (schedulers[subject].state.enabled) {
      console.log(`[自动提交-${subject}] 恢复之前的调度状态`)
      scheduleNextRun(subject)
    }
  }
}
