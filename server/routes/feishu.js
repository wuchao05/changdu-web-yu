import Router from '@koa/router'
import { FEISHU_CONFIG, getFeishuConfig } from '../config/feishu.js'

const router = new Router()

/**
 * 记录飞书上游请求失败日志，便于排查 4xx/5xx 问题
 */
function logFeishuUpstreamError(scene, options = {}) {
  const { status, code, msg, url, tableId, appToken, requestData, responseData, responseText } =
    options

  const safeResponseText =
    typeof responseText === 'string' ? responseText.slice(0, 2000) : responseText

  console.error(`[飞书上游失败][${scene}]`, {
    status,
    code,
    msg,
    url,
    appToken,
    tableId,
    requestData,
    responseData,
    responseText: safeResponseText,
    timestamp: new Date().toISOString(),
  })
}

// 飞书获取 tenant_access_token 代理API
router.post('/token', async ctx => {
  try {
    const requestData = {
      app_id: FEISHU_CONFIG.app_id,
      app_secret: FEISHU_CONFIG.app_secret,
    }

    const response = await fetch(`${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    const data = await response.text()

    // 尝试解析为 JSON
    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    // 返回 JSON 数据
    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书更新文件md5字段代理API
router.put('/bitable/records/:recordId/file-md5', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { recordId } = ctx.params
    const { fileMd5 } = ctx.request.body

    if (!recordId || !fileMd5) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameters: recordId, fileMd5' }
      return
    }

    // 获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token
    if (!accessToken) {
      logFeishuUpstreamError('create-drama-list-record:get-token-empty', {
        status: tokenResponse.status,
        code: tokenJson.code,
        msg: tokenJson.msg,
        url: `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
        responseData: tokenJson,
        responseText: tokenData,
      })
      ctx.status = 500
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }
    if (!accessToken) {
      logFeishuUpstreamError('create-drama-status-record:get-token-empty', {
        status: tokenResponse.status,
        code: tokenJson.code,
        msg: tokenJson.msg,
        url: `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
        responseData: tokenJson,
        responseText: tokenData,
      })
      ctx.status = 500
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }
    if (!accessToken) {
      logFeishuUpstreamError('huyu-accounts:get-token-empty', {
        status: tokenResponse.status,
        code: tokenJson.code,
        msg: tokenJson.msg,
        url: `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
        responseData: tokenJson,
        responseText: tokenData,
      })
      ctx.status = 500
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    // 构建更新请求体
    const updateRequestBody = {
      fields: {
        文件md5: fileMd5,
      },
    }

    // 调用飞书更新记录 API
    const targetTableId = config.table_ids.drama_status
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/${recordId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequestBody),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

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
})

// 飞书多维表格创建
router.post('/bitable/create', async ctx => {
  try {
    const { token, table_id, fields } = ctx.request.body

    if (!token || !table_id || !fields) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameters: token, table_id, fields' }
      return
    }

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${table_id}/tables`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: {
            name: fields.name || 'New Table',
            fields: fields.fields || [],
          },
        }),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书多维表格搜索
router.post('/bitable/search', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { searchValue } = ctx.request.body

    if (!searchValue) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameter: searchValue' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token
    if (!accessToken) {
      logFeishuUpstreamError('create-drama-clip-record:get-token-empty', {
        status: tokenResponse.status,
        code: tokenJson.code,
        msg: tokenJson.msg,
        url: `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
        responseData: tokenJson,
        responseText: tokenData,
      })
      ctx.status = 500
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    // 构建搜索请求体
    const searchRequestBody = {
      field_names: ['剧名', '上架时间'],
      filter: {
        conjunction: 'and',
        conditions: [
          {
            field_name: '剧名',
            operator: 'contains',
            value: [searchValue],
          },
        ],
      },
      page_size: 20,
    }

    // 调用飞书搜索API
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${config.table_ids.drama_list}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequestBody),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书多维表格新增记录
router.post('/bitable/records', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { dramaName, publishTime, bookId } = ctx.request.body
    console.log('调用飞书新增剧集清单记录 API', JSON.stringify(ctx.request.body))

    if (!dramaName) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameter: dramaName' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建新增记录请求体
    const createRequestBody = {
      fields: {
        剧名: dramaName,
      },
    }

    // 如果有短剧ID，添加到字段中
    if (bookId) {
      createRequestBody.fields['短剧ID'] = bookId
    }

    // 如果有上架时间，转换为13位Unix时间戳并添加到字段中
    if (publishTime) {
      try {
        // 将时间字符串转换为13位Unix时间戳（毫秒）
        const timestamp = new Date(publishTime).getTime()
        if (!isNaN(timestamp)) {
          createRequestBody.fields['上架时间'] = timestamp
        }
      } catch {
        // 如果转换失败，不添加上架时间字段
      }
    }

    // 调用飞书新增记录API
    const targetTableId = config.table_ids.drama_list
    const upstreamUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records`
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createRequestBody),
    })
    console.log('调用飞书新增剧集清单记录 API', JSON.stringify(createRequestBody))

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    if (!response.ok || jsonData.code !== 0) {
      logFeishuUpstreamError('create-drama-list-record', {
        status: response.status,
        code: jsonData.code,
        msg: jsonData.msg,
        url: upstreamUrl,
        appToken: config.app_token,
        tableId: targetTableId,
        requestData: createRequestBody,
        responseData: jsonData,
        responseText: data,
      })
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    console.error('[飞书路由异常][create-drama-list-record]', error)
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书账户查询代理API（支持动态账户表）
router.post('/bitable/huyu-accounts', async ctx => {
  try {
    const config = await getFeishuConfig()
    // 从请求体获取账户表 ID，默认使用超琦账户表
    const targetTableId = config.table_ids.account

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建查询账户请求体
    const searchRequestBody = {
      field_names: ['账户', '是否已用'],
      page_size: 1000,
    }

    // 调用飞书账户查询API
    const upstreamUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/search?ignore_consistency_check=true`
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchRequestBody),
    })

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    if (!response.ok || jsonData.code !== 0) {
      logFeishuUpstreamError('huyu-accounts:search', {
        status: response.status,
        code: jsonData.code,
        msg: jsonData.msg,
        url: upstreamUrl,
        appToken: config.app_token,
        tableId: targetTableId,
        requestData: searchRequestBody,
        responseData: jsonData,
        responseText: data,
      })
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    console.error('[飞书路由异常][huyu-accounts:search]', error)
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书更新剧集账户信息代理API
router.put('/bitable/records/:recordId/account', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { recordId } = ctx.params
    const { account, publishTime } = ctx.request.body

    if (!recordId || !account) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameters: recordId, account' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token
    if (!accessToken) {
      logFeishuUpstreamError('huyu-accounts:used:get-token-empty', {
        status: tokenResponse.status,
        code: tokenJson.code,
        msg: tokenJson.msg,
        url: `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
        responseData: tokenJson,
        responseText: tokenData,
      })
      ctx.status = 500
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    // 构建更新记录请求体
    const updateRequestBody = {
      fields: {
        账户: account,
        主体: '超琦',
      },
    }

    // 如果有上架时间，转换为13位Unix时间戳并添加到更新字段中
    if (publishTime) {
      try {
        // 将时间字符串转换为13位Unix时间戳（毫秒）
        const timestamp = new Date(publishTime).getTime()
        if (!isNaN(timestamp)) {
          updateRequestBody.fields['上架时间'] = timestamp
        }
      } catch {
        // Warning logging removed
      }
    }

    // 调用飞书更新记录API
    const targetTableId = config.table_ids.drama_list
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/${recordId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequestBody),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书更新账户是否已用状态代理API（支持动态账户表）
router.put('/bitable/huyu-accounts/:recordId/used', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { recordId } = ctx.params
    // 从请求体获取账户表 ID，默认使用超琦账户表
    const targetTableId = config.table_ids.account

    if (!recordId) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameter: recordId' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建更新记录请求体
    const updateRequestBody = {
      fields: {
        是否已用: '是',
      },
    }

    // 调用飞书更新账户记录API
    const upstreamUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/${recordId}?ignore_consistency_check=true`
    const response = await fetch(upstreamUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateRequestBody),
    })

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    if (!response.ok || jsonData.code !== 0) {
      logFeishuUpstreamError('huyu-accounts:used:update', {
        status: response.status,
        code: jsonData.code,
        msg: jsonData.msg,
        url: upstreamUrl,
        appToken: config.app_token,
        tableId: targetTableId,
        requestData: updateRequestBody,
        responseData: jsonData,
        responseText: data,
      })
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    console.error('[飞书路由异常][huyu-accounts:used:update]', error)
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书更新账户是否已用状态为"否"代理API（支持动态账户表）
router.put('/bitable/huyu-accounts/:recordId/unused', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { recordId } = ctx.params
    // 从请求体获取账户表 ID，默认使用超琦账户表
    const targetTableId = config.table_ids.account

    if (!recordId) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameter: recordId' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建更新记录请求体
    const updateRequestBody = {
      fields: {
        是否已用: '否',
      },
    }

    // 调用飞书更新账户记录API
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/${recordId}?ignore_consistency_check=true`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequestBody),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书剧集清单查询代理API - 获取剧名和是否已下载状态
router.post('/bitable/drama-list', async ctx => {
  try {
    const config = await getFeishuConfig()

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建查询剧集清单请求体
    const searchRequestBody = {
      field_names: ['剧名', '是否已下载'],
      page_size: 10000,
    }

    // 调用飞书剧集清单查询API
    const targetTableId = config.table_ids.drama_list
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequestBody),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书剧集状态表查询接口 - 按剧名和日期查询
router.post('/bitable/drama-status/search', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { dramaName, timestamp } = ctx.request.body

    if (!dramaName || !timestamp) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameters: dramaName, timestamp' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建查询请求体
    const searchRequestBody = {
      field_names: ['剧名', '日期'],
      page_size: 10,
      filter: {
        conjunction: 'and',
        conditions: [
          {
            field_name: '剧名',
            operator: 'is',
            value: [dramaName],
          },
          {
            field_name: '日期',
            operator: 'is',
            value: ['ExactDate', timestamp.toString()],
          },
        ],
      },
    }

    // 调用飞书剧集状态表查询API
    const targetTableId = config.table_ids.drama_status
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequestBody),
      }
    )

    const data = await response.text()
    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书剧集状态表新增记录
router.post('/bitable/drama-status', async ctx => {
  try {
    const config = await getFeishuConfig()
    const {
      dramaName,
      timestamp,
      status = '待下载',
      account,
      publishTime,
      subject,
      douyinMaterial,
    } = ctx.request.body

    if (!dramaName || !timestamp) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameters: dramaName, timestamp' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      logFeishuUpstreamError('create-drama-status-record:get-token', {
        status: tokenResponse.status,
        code: tokenJson.code,
        msg: tokenJson.msg,
        url: `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
        responseData: tokenJson,
        responseText: tokenData,
      })
      ctx.status = 400
      ctx.body = tokenJson
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 调用飞书API创建剧集状态记录
    const requestData = {
      fields: {
        剧名: dramaName,
        日期: timestamp,
        当前状态: status,
        账户: account,
      },
    }

    // 如果有抖音素材配置，添加到字段中（必须是非空字符串）
    if (douyinMaterial && douyinMaterial.trim()) {
      requestData.fields['抖音素材'] = douyinMaterial.trim()
    }

    // 如果有主体，添加到字段中
    if (subject) {
      requestData.fields['主体'] = subject
    }

    // 如果有上架时间，转换为13位Unix时间戳并添加到字段中
    if (publishTime) {
      try {
        // 将时间字符串转换为13位Unix时间戳（毫秒）
        const publishTimestamp = new Date(publishTime).getTime()
        if (!isNaN(publishTimestamp)) {
          requestData.fields['上架时间'] = publishTimestamp
        }
      } catch {
        // 如果转换失败，不添加上架时间字段
      }
    }

    const targetTableId = config.table_ids.drama_status
    const upstreamUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records`
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestData),
    })
    console.log('调用飞书新增剧集状态记录 API', JSON.stringify(requestData))

    const data = await response.text()
    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      console.error('飞书API返回非JSON响应:', data)
      ctx.status = response.status
      ctx.body = data
      return
    }

    if (!response.ok || jsonData.code !== 0) {
      logFeishuUpstreamError('create-drama-status-record', {
        status: response.status,
        code: jsonData.code,
        msg: jsonData.msg,
        url: upstreamUrl,
        appToken: config.app_token,
        tableId: targetTableId,
        requestData: requestData,
        responseData: jsonData,
        responseText: data,
      })
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    console.error('[飞书路由异常][create-drama-status-record]', error)
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书剧集状态表查询待下载剧集接口
router.post('/bitable/drama-status/pending-download', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { field_names, page_size, filter } = ctx.request.body

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建查询请求体
    const searchRequestBody = {
      field_names: field_names || ['剧名'],
      page_size: page_size || 100,
      filter: filter || {
        conjunction: 'and',
        conditions: [
          {
            field_name: '当前状态',
            operator: 'is',
            value: ['待下载'],
          },
        ],
      },
    }

    // 调用飞书剧集状态表查询API
    const targetTableId = config.table_ids.drama_status

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequestBody),
      }
    )

    const data = await response.text()
    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书剧集状态表查询待上传剧集接口
router.post('/bitable/drama-status/pending-upload', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { field_names, page_size, filter } = ctx.request.body

    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    const searchRequestBody = {
      field_names: field_names || ['剧名'],
      page_size: page_size || 100,
      filter: filter || {
        conjunction: 'and',
        conditions: [
          {
            field_name: '当前状态',
            operator: 'is',
            value: ['待上传'],
          },
        ],
      },
    }

    const targetTableId = config.table_ids.drama_status
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequestBody),
      }
    )

    const data = await response.text()
    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

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
})

// 飞书剧集状态表查询待搭建剧集接口
router.post('/bitable/drama-status/pending-build', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { field_names, page_size, filter, use_daily } = ctx.request.body

    console.log('========== pending-build 接收参数 ==========')
    console.log('use_daily:', use_daily)
    console.log('==========================================')

    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    const searchRequestBody = {
      field_names: field_names || ['剧名', '当前状态'],
      page_size: page_size || 100,
      filter: filter || {
        conjunction: 'and',
        conditions: [
          {
            field_name: '当前状态',
            operator: 'is',
            value: ['待搭建'],
          },
        ],
      },
    }

    // 统一使用设置页保存的飞书状态表配置
    const targetTableId = config.table_ids.drama_status

    // 打印日志
    console.log('========== 每日搭建 - 查询飞书状态表 ==========')
    console.log('use_daily:', use_daily)
    console.log('使用的表格配置:', '统一配置')
    console.log('表格 ID:', targetTableId)
    console.log('查询字段:', field_names)
    console.log('过滤条件:', filter)
    console.log('==========================================')

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequestBody),
      }
    )

    const data = await response.text()
    let resultData
    try {
      resultData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    // 为每条记录添加 _tableId 属性
    if (resultData.data?.items) {
      resultData.data.items.forEach(item => {
        item._tableId = targetTableId
      })
    }

    // 打印返回的数据样例
    if (resultData.data?.items?.length > 0) {
      console.log('========== 飞书返回数据样例 ==========')
      console.log('第一条记录的字段:', JSON.stringify(resultData.data.items[0].fields, null, 2))
      console.log('=====================================')
    }

    ctx.status = response.status
    ctx.body = resultData
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书剧集清单查询接口 - 获取所有剧名（用于看板）
router.post('/bitable/drama-list/all', async ctx => {
  try {
    const config = await getFeishuConfig()

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建查询剧集清单请求体 - 只获取剧名字段
    const searchRequestBody = {
      field_names: ['剧名'],
      page_size: 10000,
    }

    // 调用飞书剧集清单查询API
    const targetTableId = config.table_ids.drama_list
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequestBody),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书剧集状态查询接口 - 根据日期和状态筛选
router.post('/bitable/drama-status/filter', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { date, status, field_names } = ctx.request.body

    if (!date || !status) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameters: date, status' }
      return
    }

    const statusArray = Array.isArray(status) ? status : [status]
    if (statusArray.length === 0) {
      ctx.status = 400
      ctx.body = { error: 'Status array cannot be empty' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 将日期字符串转换为时间戳
    const dateTimestamp = new Date(date).getTime()

    // 构建查询请求体 - 根据日期和状态筛选
    const searchRequestBody = {
      field_names: field_names || ['剧名', '日期', '当前状态'],
      page_size: 1000,
      filter: {
        conjunction: 'and',
        conditions: [
          {
            field_name: '日期',
            operator: 'is',
            value: ['ExactDate', dateTimestamp.toString()],
          },
          {
            field_name: '当前状态',
            operator: 'is',
            value: statusArray,
          },
        ],
      },
    }

    // 调用飞书剧集状态查询API
    const targetTableId = config.table_ids.drama_status
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequestBody),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

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
})

// 飞书剧集状态查询接口 - 获取所有状态数据（用于看板）
router.post('/bitable/drama-status/all', async ctx => {
  try {
    const config = await getFeishuConfig()
    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建查询剧集状态请求体 - 获取剧名、日期、状态字段，范围与前端一致（昨天、今天、未来3天）
    const dateOffsets = [-1, 0, 1, 2, 3]
    const baseDate = new Date()
    baseDate.setHours(0, 0, 0, 0)

    const dateConditions = dateOffsets.map(offset => {
      const targetDate = new Date(baseDate)
      targetDate.setDate(baseDate.getDate() + offset)

      return {
        field_name: '日期',
        operator: 'is',
        value: ['ExactDate', targetDate.getTime().toString()],
      }
    })

    const searchRequestBody = {
      field_names: ['剧名', '日期', '当前状态'],
      page_size: 100000,
      filter: {
        conjunction: 'or',
        conditions: dateConditions,
      },
    }

    // 调用飞书剧集状态查询API
    const targetTableId = config.table_ids.drama_status
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequestBody),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书剧集状态表创建剪辑记录接口
router.post('/bitable/drama-status/clip', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { dramaName, timestamp, account, publishTime, subject, douyinMaterial, status } =
      ctx.request.body
    console.log('调用飞书创建剪辑记录 API', JSON.stringify(ctx.request.body))

    if (!dramaName || !timestamp) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameters: dramaName, timestamp' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      logFeishuUpstreamError('create-drama-clip-record:get-token', {
        status: tokenResponse.status,
        code: tokenJson.code,
        msg: tokenJson.msg,
        url: `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
        responseData: tokenJson,
        responseText: tokenData,
      })
      ctx.status = 400
      ctx.body = tokenJson
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 调用飞书API创建剪辑记录
    const requestData = {
      fields: {
        剧名: dramaName,
        日期: timestamp,
        当前状态: status || '待剪辑',
        账户: account,
      },
    }

    // 如果有主体，添加到字段中
    if (subject) {
      requestData.fields['主体'] = subject
    }

    // 如果有抖音素材配置，添加到字段中（必须是非空字符串）
    if (douyinMaterial && douyinMaterial.trim()) {
      requestData.fields['抖音素材'] = douyinMaterial.trim()
    }

    // 如果有上架时间，转换为13位Unix时间戳并添加到字段中
    if (publishTime) {
      try {
        // 将时间字符串转换为13位Unix时间戳（毫秒）
        const publishTimestamp = new Date(publishTime).getTime()
        if (!isNaN(publishTimestamp)) {
          requestData.fields['上架时间'] = publishTimestamp
        }
      } catch {
        // 如果转换失败，不添加上架时间字段
      }
    }

    const targetTableId = config.table_ids.drama_status
    const upstreamUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records`
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestData),
    })

    const data = await response.text()
    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    if (!response.ok || jsonData.code !== 0) {
      logFeishuUpstreamError('create-drama-clip-record', {
        status: response.status,
        code: jsonData.code,
        msg: jsonData.msg,
        url: upstreamUrl,
        appToken: config.app_token,
        tableId: targetTableId,
        requestData: requestData,
        responseData: jsonData,
        responseText: data,
      })
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    console.error('[飞书路由异常][create-drama-clip-record]', error)
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书剧集状态表获取剪辑记录详情接口
router.get('/bitable/drama-status/clip/:recordId', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { recordId } = ctx.params

    if (!recordId) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameter: recordId' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = tokenJson
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 调用飞书API获取剪辑记录详情
    const targetTableId = config.table_ids.drama_status
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/${recordId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const data = await response.text()
    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书剧集状态表删除剪辑记录接口
router.delete('/bitable/drama-status/clip/:recordId', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { recordId } = ctx.params

    if (!recordId) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameter: recordId' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = tokenJson
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 调用飞书API删除剪辑记录
    const targetTableId = config.table_ids.drama_status
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/${recordId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const data = await response.text()
    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书更新剧集状态代理API
router.put('/bitable/records/:recordId/status', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { recordId } = ctx.params
    const { status } = ctx.request.body

    if (!recordId || !status) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameters: recordId, status' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建更新记录请求体
    const updateRequestBody = {
      fields: {
        当前状态: status,
      },
    }

    // 如果传了搭建时间，同时更新搭建时间字段
    if (build_time) {
      updateRequestBody.fields['搭建时间'] = build_time
    }

    // 调用飞书更新记录API
    const targetTableId = config.table_ids.drama_status
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/${recordId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequestBody),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 飞书批量创建每日账户记录代理API
router.post('/bitable/daily-accounts/batch-create', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { accounts } = ctx.request.body

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameter: accounts (non-empty array)' }
      return
    }

    // 首先获取 tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建批量创建请求体
    const records = accounts.map(acc => ({
      fields: {
        账户: acc.account,
        是否已用: acc.isUsed,
      },
    }))

    const batchCreateRequestBody = {
      records,
    }

    // 调用飞书批量创建记录API
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${config.table_ids.account}/records/batch_create`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchCreateRequestBody),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

/**
 * 更新剧集状态
 */
router.put('/bitable/drama-status/:recordId/status', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { recordId } = ctx.params
    const { status, build_time } = ctx.request.body

    if (!recordId || !status) {
      ctx.status = 400
      ctx.body = { error: 'Missing required parameters: recordId, status' }
      return
    }

    // 首先获�� tenant_access_token
    const tokenResponse = await fetch(
      `${FEISHU_CONFIG.api_base_url}${FEISHU_CONFIG.token_endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.app_id,
          app_secret: FEISHU_CONFIG.app_secret,
        }),
      }
    )

    const tokenData = await tokenResponse.text()
    let tokenJson
    try {
      tokenJson = JSON.parse(tokenData)
    } catch {
      ctx.status = tokenResponse.status
      ctx.body = tokenData
      return
    }

    if (tokenJson.code !== 0) {
      ctx.status = 400
      ctx.body = { error: 'Failed to get access token', details: tokenJson }
      return
    }

    const accessToken = tokenJson.tenant_access_token

    // 构建更新记录请求体
    const updateRequestBody = {
      fields: {
        当前状态: status,
      },
    }

    // 如果传了搭建时间，同时更新搭建时间字段
    if (build_time) {
      updateRequestBody.fields['搭建时间'] = build_time
    }

    // 调用飞书更新记录API
    const targetTableId = config.table_ids.drama_status
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records/${recordId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequestBody),
      }
    )

    const data = await response.text()

    let jsonData
    try {
      jsonData = JSON.parse(data)
    } catch {
      ctx.status = response.status
      ctx.body = data
      return
    }

    ctx.status = response.status
    ctx.body = jsonData
  } catch (error) {
    console.error('更新剧集状态失败:', error)
    ctx.status = 500
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

export default router
