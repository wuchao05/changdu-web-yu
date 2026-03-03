import { buildHeaders, buildDownloadCenterHeaders } from '../config/headers.js'

/**
 * 通用API处理函数
 * @param {Object} ctx - Koa 上下文对象
 * @param {Object} config - 配置对象
 * @param {string} config.apiName - API名称（用于日志）
 * @param {string} config.targetPath - 目标API路径
 * @param {string} config.method - 允许的请求方法 ('GET' | 'POST' | 'GET,POST')
 * @param {boolean} config.filterCookie - 是否过滤cookie参数，默认true
 */
export default async function apiHandler(ctx, config) {
  const { targetPath, method = 'GET', filterCookie = true } = config

  // 检查请求方法
  const allowedMethods = method.split(',').map(m => m.trim())
  if (!allowedMethods.includes(ctx.method)) {
    ctx.status = 405
    ctx.body = { error: 'Method not allowed' }
    return
  }

  try {
    // 构建目标URL
    let targetUrl = `https://www.changdunovel.com${targetPath}`
    let requestBody = null

    // 📊 打印 data_overview 接口的详细日志
    // const isDataOverviewApi = targetPath.includes('/data_overview/v1')
    // if (isDataOverviewApi) {
    //   console.log('\n========== 【apiHandler data_overview/v1】 ==========')
    //   console.log('⏰ 时间:', new Date().toLocaleString('zh-CN'))
    //   console.log('🌐 目标URL:', targetUrl)
    //   console.log('📋 请求方法:', ctx.method)
    //   console.log('📥 原始查询参数:', ctx.query)
    //   console.log('📥 原始请求体:', ctx.request.body)
    //   console.log('==================================================\n')
    // }

    if (ctx.method === 'GET') {
      // console.log('🌐 [apiHandler] GET请求')
      // console.log('🌐 [apiHandler] ctx.query:', ctx.query)
      // console.log(
      //   '🌐 [apiHandler] 包含 daren_douyin_accounts:',
      //   'daren_douyin_accounts' in ctx.query
      // )

      // GET 请求：构建查询参数
      if (filterCookie) {
        // 过滤掉cookie参数（cookie会被设置到请求头中）
        const queryParams = new URLSearchParams()
        Object.keys(ctx.query).forEach(key => {
          if (key !== 'cookie') {
            queryParams.append(key, ctx.query[key])
          }
        })
        const queryString = queryParams.toString()
        // console.log('🌐 [apiHandler] 构建的查询字符串:', queryString)
        if (queryString) {
          targetUrl += `?${queryString}`
        }
      } else {
        // 不过滤cookie参数
        const queryString = new URLSearchParams(ctx.query).toString()
        if (queryString) {
          targetUrl += `?${queryString}`
        }
      }
    } else if (ctx.method === 'POST') {
      // POST 请求：处理请求体
      if (filterCookie) {
        // 过滤掉cookie参数后使用请求体
        const bodyData = ctx.request.body || {}
        const bodyWithoutCookie = { ...bodyData }
        delete bodyWithoutCookie.cookie
        requestBody = JSON.stringify(bodyWithoutCookie)
      } else {
        // 不过滤cookie参数
        requestBody = JSON.stringify(ctx.request.body || {})
      }
    }

    // 使用统一的请求头配置
    const headers = buildHeaders(ctx)

    // 打印 application_overview_list 接口的实际请求参数和请求头
    const isApplicationOverviewApi = targetPath.includes(
      '/novelsale/distributor/application_overview_list/v1'
    )
    if (isApplicationOverviewApi) {
      const requestUrl = new URL(targetUrl)
      const actualParams = {}
      requestUrl.searchParams.forEach((value, key) => {
        if (Object.prototype.hasOwnProperty.call(actualParams, key)) {
          const previous = actualParams[key]
          actualParams[key] = Array.isArray(previous) ? [...previous, value] : [previous, value]
        } else {
          actualParams[key] = value
        }
      })

      console.log('\n========== 【application_overview_list/v1 实际请求】 ==========')
      console.log('⏰ 时间:', new Date().toLocaleString('zh-CN'))
      console.log('🌐 请求URL:', targetUrl)
      console.log('📋 请求方法:', ctx.method)
      console.log('📥 请求参数:', actualParams)
      console.log('📦 请求头:', headers)
      console.log('============================================================\n')
    }

    // 📊 打印 data_overview 接口的请求前日志
    // if (isDataOverviewApi) {
    //   console.log('\n========== 【apiHandler 发起请求】 ==========')
    //   console.log('⏰ 时间:', new Date().toLocaleString('zh-CN'))
    //   console.log('🌐 最终目标URL:', targetUrl)
    //   console.log('📦 请求头 Appid:', headers.appid)
    //   console.log('📦 请求头 Apptype:', headers.apptype)
    //   console.log('📦 请求头 Distributorid:', headers.distributorid)
    //   console.log('🍪 请求头 Cookie 长度:', headers.Cookie?.length || 0)
    //   console.log('🍪 请求头 Cookie 前100字符:', headers.Cookie?.substring(0, 100) || '无')
    //   console.log('==========================================\n')
    // }

    // 发起请求
    const response = await fetch(targetUrl, {
      method: ctx.method,
      headers: headers,
      body: requestBody,
    })

    const data = await response.text()

    // 📊 打印 data_overview 接口的响应日志
    // if (isDataOverviewApi) {
    //   console.log('\n========== 【apiHandler 响应】 ==========')
    //   console.log('⏰ 时间:', new Date().toLocaleString('zh-CN'))
    //   console.log('📊 响应状态码:', response.status)
    //   console.log('📊 响应头:', Object.fromEntries(response.headers.entries()))
    //   console.log('📄 响应数据前500字符:', data.substring(0, 500))
    //   console.log('========================================\n')
    // }

    // 尝试解析为 JSON
    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      // 如果不是 JSON，返回原始文本
      ctx.status = response.status
      ctx.body = data
      return
    }

    // 返回 JSON 数据
    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * 简化的GET请求处理函数
 * @param {string} apiName - API名称
 * @param {string} targetPath - 目标API路径
 */
export function createGetHandler(apiName, targetPath) {
  return async function handler(ctx) {
    return apiHandler(ctx, {
      apiName,
      targetPath,
      method: 'GET',
      filterCookie: true,
    })
  }
}

/**
 * 简化的POST请求处理函数
 * @param {string} apiName - API名称
 * @param {string} targetPath - 目标API路径
 */
export function createPostHandler(apiName, targetPath) {
  return async function handler(ctx) {
    return apiHandler(ctx, {
      apiName,
      targetPath,
      method: 'POST',
      filterCookie: true,
    })
  }
}

/**
 * 下载中心专用的GET请求处理函数
 * @param {string} apiName - API名称
 * @param {string} targetPath - 目标API路径
 */
export function createDownloadCenterHandler(apiName, targetPath) {
  // const { logRequest = false } = options
  return async function handler(ctx) {
    // 允许 GET 和 POST 请求
    if (ctx.method !== 'GET' && ctx.method !== 'POST') {
      ctx.status = 405
      ctx.body = { error: 'Method not allowed' }
      return
    }

    try {
      // 统一将所有请求转换为 GET 请求发送给后端
      let params = {}

      if (ctx.method === 'GET') {
        // GET 请求：直接使用查询参数
        params = { ...ctx.query }
      } else {
        // POST 请求：使用请求体中的参数
        params = { ...ctx.request.body }
      }

      // 提取 cookie（用于请求头），并从参数中移除
      const cookieFromParams = params.cookie || process.env.DEFAULT_COOKIE
      // console.log('========== cookie 传递情况 ==========')
      // console.log('params.cookie 存在:', !!params.cookie)
      // console.log('params.cookie 长度:', params.cookie?.length || 0)
      // console.log('cookieFromParams 来源:', params.cookie ? '前端传入' : '环境变量')
      // console.log('cookieFromParams 长度:', cookieFromParams?.length || 0)
      delete params.cookie

      // 构建查询参数字符串
      const queryParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value))
        }
      })

      const queryString = queryParams.toString()
      const targetUrl = queryString
        ? `https://www.changdunovel.com${targetPath}?${queryString}`
        : `https://www.changdunovel.com${targetPath}`

      // 使用下载中心专用的请求头配置（会从ctx.headers获取前端传来的值）
      const headers = buildDownloadCenterHeaders(ctx)
      // console.log('buildDownloadCenterHeaders 返回的 Cookie 长度:', headers.Cookie?.length || 0)

      // 如果参数中有 cookie，使用参数的 cookie；否则使用 buildDownloadCenterHeaders 已经设置的值
      if (cookieFromParams && cookieFromParams !== headers.Cookie) {
        headers.Cookie = cookieFromParams
        // console.log('使用 cookieFromParams 覆盖，长度:', cookieFromParams.length)
      } else {
        // console.log('使用 buildDownloadCenterHeaders 的 Cookie')
      }
      // console.log('最终发送的 Cookie 长度:', headers.Cookie?.length || 0)
      // console.log('======================================')

      // 打印 task_list 接口的详细日志
      // if (targetPath.includes('/download_center/task_list')) {
      //   console.log('\n========== 【爆剧爆剪 task_list 接口】 ==========')
      //   console.log('⏰ 时间:', new Date().toLocaleString('zh-CN'))
      //   console.log('📝 API名称:', apiName)
      //   console.log('🌐 请求方法:', ctx.method)
      //   console.log('🎯 目标URL:', targetUrl)
      //   console.log('\n📋 请求参数 (params):')
      //   console.log(JSON.stringify(params, null, 2))
      //   console.log('\n📦 请求头 (headers):')
      //   console.log(JSON.stringify(headers, null, 2))
      //   console.log('\n🍪 Cookie 长度:', headers.Cookie?.length || 0)
      //   console.log('🍪 Cookie 前100字符:', headers.Cookie?.substring(0, 100) || '无')
      //   console.log('===============================================\n')
      // }

      // if (logRequest) {
      //   console.log('cookiehahahah', cookieFromParams)
      //   console.log(`[${apiName}] 请求参数:`, {
      //     method: ctx.method,
      //     params,
      //     headers,
      //     targetUrl,
      //   })
      // }

      // 统一使用 GET 方法发送给后端
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: headers,
      })

      const data = await response.text()

      // 尝试解析为 JSON
      let jsonData
      try {
        jsonData = JSON.parse(data)
      } catch {
        // 如果不是 JSON，返回原始文本
        ctx.status = response.status
        ctx.body = data
        return
      }

      // 注意：下载任务列表的过滤逻辑已移至前端处理，避免重复过滤

      // 返回 JSON 数据
      ctx.status = response.status
      ctx.body = jsonData
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }
}
