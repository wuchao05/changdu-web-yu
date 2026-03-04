import Router from '@koa/router'
import { createGetHandler } from '../utils/apiHandler.js'
import { buildChangduGetHeaders } from '../utils/changduSign.js'
import { CHANGDU_BASE_URL } from '../config/changdu.js'
import { readAuthConfig } from './auth.js'
import { FEISHU_CONFIG, getFeishuConfig } from '../config/feishu.js'

const router = new Router()

// 形天后台配置
const SPLAY_BASE_URL = 'https://splay-admin.lnkaishi.cn'

// 判断是否为纯数字（ID）
function isNumericId(str) {
  return /^\d+$/.test(str)
}

// 通过短剧名称获取 copyright_content_id
async function getDramaIdByTitle(title) {
  try {
    // 从 auth 配置读取 xh xtToken
    const authConfig = await readAuthConfig()
    const xtToken = authConfig.tokens?.xh

    if (!xtToken) {
      throw new Error('未配置形天 XT Token (tokens.xh)')
    }

    // 形天接口要求除 title 外其余参数为数值，先按 number 维护再序列化
    const splayParams = {
      team_id: 500039,
      title,
      page: 1,
      page_size: 10,
      dy_audit_status: -1,
      total: 1,
      category_id: 1,
      promotion_status: 1,
    }

    const url = new URL(`${SPLAY_BASE_URL}/album/search`)
    Object.entries(splayParams).forEach(([key, value]) => {
      url.searchParams.set(key, String(value))
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        token: xtToken,
      },
    })

    const result = await response.json()
    // console.log('[名称转ID] 接口响应', {
    //   title,
    //   params: splayParams,
    //   code: result.code,
    //   total: result.data?.total,
    //   listLength: result.data?.list?.length,
    //   titles: result.data?.list?.slice(0, 3)?.map(item => item.title),
    //   allResults: result.data?.list?.map(item => ({
    //     title: item.title,
    //     id: item.copyright_content_id,
    //     is_delete: item.is_delete,
    //   })),
    // })

    if (result.code === 0 && result.data?.list?.length > 0) {
      // 查找完全匹配的项（且未删除）
      const exactMatch = result.data.list.find(item => item.title === title && item.is_delete === 0)
      if (exactMatch?.copyright_content_id) {
        // console.log(`[名称转ID] 成功: "${title}" -> ${exactMatch.copyright_content_id}`)
        return exactMatch.copyright_content_id
      }
      // 如果没有完全匹配的，尝试第一个未删除的结果
      const firstValid = result.data.list.find(item => item.is_delete === 0)
      if (firstValid?.copyright_content_id) {
        // console.log(
        //   `[名称转ID] 模糊匹配: "${title}" -> ${firstValid.copyright_content_id} (${firstValid.title})`
        // )
        return firstValid.copyright_content_id
      }
    }
    // console.log(`[名称转ID] 失败: "${title}" - 未找到匹配的短剧`)
    return null
  } catch (error) {
    console.error(`[名称转ID] 错误: "${title}"`, error.message)
    return null
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

router.get(
  '/distributor/application_overview_list/v1',
  createGetHandler(
    'Application Overview List',
    '/novelsale/distributor/application_overview_list/v1/'
  )
)

router.get(
  '/distributor/promotion/detail/v2',
  createGetHandler('Promotion Detail', '/novelsale/distributor/promotion/detail/v2/')
)

// 登录
router.get('/distributor/login/v1', createGetHandler('Login', '/novelsale/distributor/login/v1/'))

// 系列列表 - 使用常读开放平台 API（签名认证），同步获取飞书剧集清单数据
router.get('/distributor/content/series/list/v1', async ctx => {
  try {
    const config = await getFeishuConfig()
    const { distributorId, secretKey } = await getChangduSignConfig()

    // 构建请求参数
    const params = {
      distributor_id: distributorId,
      page_index: parseInt(ctx.query.page_index) || 0,
      page_size: parseInt(ctx.query.page_size) || 100,
    }

    // 添加可选参数
    if (ctx.query.permission_statuses) {
      params.permission_statuses = ctx.query.permission_statuses
    }
    // 处理 query 参数：如果是名称则先转换为 ID
    if (ctx.query.query) {
      let queryValue = ctx.query.query
      if (!isNumericId(queryValue)) {
        // 输入的是名称，需要先转换为 ID
        const dramaId = await getDramaIdByTitle(queryValue)
        if (dramaId) {
          queryValue = dramaId
        } else {
          // 名称转 ID 失败，返回空结果
          ctx.status = 200
          ctx.body = {
            code: 0,
            message: `未找到短剧: ${queryValue}`,
            data: {
              data: [],
              total: 0,
            },
          }
          return
        }
      }
      params.query = queryValue
    }
    if (ctx.query.gender !== undefined) {
      params.gender = parseInt(ctx.query.gender)
    }
    if (ctx.query.creation_status !== undefined) {
      params.creation_status = parseInt(ctx.query.creation_status)
    }
    if (ctx.query.delivery_status !== undefined) {
      params.delivery_status = parseInt(ctx.query.delivery_status)
    }

    // 生成签名头部
    const { headers: signHeaders } = buildChangduGetHeaders(
      params,
      undefined,
      distributorId,
      secretKey
    )

    // 构建查询字符串
    const queryString = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString()

    // 请求常读开放平台 API
    const apiUrl = `${CHANGDU_BASE_URL}/content/series/list/v1/?${queryString}`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        ...signHeaders,
        'Content-Type': 'application/json',
      },
    })

    const responseData = await response.text()
    let apiResult

    try {
      apiResult = JSON.parse(responseData)
    } catch {
      ctx.status = 500
      ctx.body = {
        code: 500,
        message: '解析常读 API 响应失败',
        timestamp: new Date().toISOString(),
      }
      return
    }

    // 转换数据格式以保持前端兼容性
    // 新 API 返回: { code: 200, message, total, data: [] }
    // 前端期望: { code: 0, data: { data: [], total } }
    if (apiResult.code === 200) {
      // 将 series_info 展开到顶层，保持与原有格式兼容
      const transformedData = (apiResult.data || []).map(item => {
        const seriesInfo = item.series_info || {}
        return {
          ...seriesInfo,
          // 保留原始的 media_config 等信息
          media_config: item.media_config,
          book_paywall: item.book_paywall,
          series_paywall: item.series_paywall,
          free_series_paywall: item.free_series_paywall,
          free_book_paywall: item.free_book_paywall,
          // 兼容字段映射
          price_changed: item.price_changed,
          unit_price: item.unit_price,
          start_chapter: item.start_chapter,
          ad_episode: item.ad_episode,
          ad_word_number: item.ad_word_number,
          short_book_ad_episode: item.short_book_ad_episode,
        }
      })

      ctx.status = 200
      ctx.body = {
        code: 0,
        message: apiResult.message || 'success',
        data: {
          data: transformedData,
          total: apiResult.total || 0,
        },
      }
    } else {
      // API 返回错误
      ctx.status = 200
      ctx.body = {
        code: apiResult.code,
        message: apiResult.message || '请求失败',
        data: {
          data: [],
          total: 0,
        },
      }
      return
    }

    // 如果新剧抢跑列表获取成功，继续获取飞书剧集清单数据
    if (ctx.body && ctx.body.code === 0) {
      try {
        // 获取飞书访问令牌
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
          return
        }

        if (tokenJson.code !== 0) {
          return
        }

        const accessToken = tokenJson.tenant_access_token

        // 获取飞书剧集清单数据 - 支持分页查询
        let allFeishuItems = []
        let pageToken = undefined
        let totalRecords = 0

        // 统一使用设置页保存的飞书配置
        const targetTableId = config.table_ids.drama_list

        do {
          // 构建 URL 参数，使用 GET 接口代替 search 接口
          const urlParams = new URLSearchParams({
            page_size: '500',
          })
          if (pageToken) {
            urlParams.set('page_token', pageToken)
          }

          const feishuResponse = await fetch(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records?${urlParams.toString()}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          )

          const feishuData = await feishuResponse.text()
          let feishuJson
          try {
            feishuJson = JSON.parse(feishuData)
          } catch {
            break
          }

          if (feishuJson.code === 0 && feishuJson.data && feishuJson.data.items) {
            allFeishuItems = allFeishuItems.concat(feishuJson.data.items)
            const newPageToken = feishuJson.data.page_token
            pageToken = newPageToken
            // 第一次请求时记录总数
            if (totalRecords === 0 && feishuJson.data.total !== undefined) {
              totalRecords = feishuJson.data.total
            }
            // 使用 total 判断是否还需要继续获取
            if (totalRecords > 0 && allFeishuItems.length >= totalRecords) {
              break
            }
          } else {
            break
          }
        } while (pageToken)

        if (allFeishuItems.length > 0) {
          // 创建剧名到下载状态的映射
          const dramaDownloadStatusMap = new Map()
          // 创建剧名到是否在飞书清单中存在的映射
          const dramaExistsInFeishuMap = new Map()

          allFeishuItems.forEach(item => {
            // 获取剧名 - 兼容两种格式：字符串或数组
            let dramaName = null
            const dramaField = item.fields?.['剧名']
            if (typeof dramaField === 'string') {
              dramaName = dramaField
            } else if (Array.isArray(dramaField) && dramaField[0]?.text) {
              dramaName = dramaField[0].text
            }

            if (dramaName) {
              // 修正逻辑：处理多种可能的字段数据结构
              let isDownloaded = false
              const downloadField = item.fields['是否已下载']

              if (downloadField) {
                // 情况1: 数组形式 [{text: "是"}]
                if (Array.isArray(downloadField) && downloadField[0] && downloadField[0].text) {
                  isDownloaded = downloadField[0].text === '是'
                }
                // 情况2: 对象形式带value数组 {value: [{text: "是"}]}
                else if (
                  downloadField.value &&
                  Array.isArray(downloadField.value) &&
                  downloadField.value[0]
                ) {
                  isDownloaded = downloadField.value[0].text === '是'
                }
                // 情况3: 直接的value字符串 {value: "是"}
                else if (typeof downloadField.value === 'string') {
                  isDownloaded = downloadField.value === '是'
                }
                // 情况4: 直接是字符串
                else if (typeof downloadField === 'string') {
                  isDownloaded = downloadField === '是'
                }
              }

              // 记录下载状态
              dramaDownloadStatusMap.set(dramaName, isDownloaded)
              // 记录是否在飞书清单中存在（只要在飞书清单中就是存在）
              dramaExistsInFeishuMap.set(dramaName, true)
            }
          })

          // 为新剧抢跑列表中的每个剧集添加下载状态信息
          if (ctx.body.data && ctx.body.data.data && Array.isArray(ctx.body.data.data)) {
            ctx.body.data.data.forEach(drama => {
              if (drama.series_name) {
                const isDownloaded = dramaDownloadStatusMap.get(drama.series_name)
                const existsInFeishu = dramaExistsInFeishuMap.get(drama.series_name)

                // 设置是否已下载状态
                drama.feishu_downloaded = isDownloaded === true
                // 设置是否在飞书清单中存在
                drama.feishu_exists = existsInFeishu === true
              }
            })
          }
        }
      } catch {
        // 即使飞书数据获取失败，也继续返回新剧抢跑列表数据
      }
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      code: 500,
      message: '获取系列列表失败',
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 系列详情
router.get(
  '/distributor/content/series/detail/v1',
  createGetHandler('Series Detail', '/novelsale/distributor/content/series/detail/v1/')
)

// 数据概览
router.get(
  '/distributor/dashboard/data_overview/v1',
  createGetHandler('Data Overview', '/novelsale/distributor/dashboard/data_overview/v1/')
)

// 充值分析
router.get(
  '/distributor/dashboard/recharge_analyze/v1',
  createGetHandler('Recharge Analyze', '/novelsale/distributor/dashboard/recharge_analyze/v1/')
)

// 排行榜列表 - 增强版，同步获取飞书剧集清单数据
router.get('/distributor/statistic/rank/series/quality/list/v2', async ctx => {
  try {
    const config = await getFeishuConfig()
    // 首先获取排行榜数据
    const rankingListHandler = createGetHandler(
      'Ranking List',
      '/novelsale/distributor/statistic/rank/series/quality/list/v2/'
    )
    await rankingListHandler(ctx)

    // 如果排行榜数据获取成功，继续获取飞书剧集清单数据
    if (ctx.status === 200 && ctx.body && ctx.body.code === 0) {
      try {
        // 获取飞书访问令牌
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
          // Warning logging removed
          return
        }

        if (tokenJson.code !== 0) {
          // Warning logging removed
          return
        }

        const accessToken = tokenJson.tenant_access_token

        // 获取飞书剧集清单数据 - 支持分页查询
        let allFeishuItems = []
        let pageToken = undefined
        // let pageCount = 0

        // 统一使用设置页保存的飞书配置
        const targetTableId = config.table_ids.drama_list

        do {
          // 构建 URL 参数，使用 GET 接口代替 search 接口
          const urlParams = new URLSearchParams({
            page_size: '500',
          })
          if (pageToken) {
            urlParams.set('page_token', pageToken)
          }

          const feishuResponse = await fetch(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.app_token}/tables/${targetTableId}/records?${urlParams.toString()}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          )

          const feishuData = await feishuResponse.text()
          let feishuJson
          try {
            feishuJson = JSON.parse(feishuData)
          } catch {
            break
          }

          if (feishuJson.code === 0 && feishuJson.data && feishuJson.data.items) {
            allFeishuItems = allFeishuItems.concat(feishuJson.data.items)
            pageToken = feishuJson.data.page_token
          } else {
            break
          }
        } while (pageToken)

        // console.log(`[排行榜] 飞书清单总共获取 ${allFeishuItems.length} 条记录，共 ${pageCount} 页`)

        if (allFeishuItems.length > 0) {
          // 创建剧名到下载状态的映射
          const dramaDownloadStatusMap = new Map()
          // 创建剧名到是否在飞书清单中存在的映射
          const dramaExistsInFeishuMap = new Map()

          allFeishuItems.forEach(item => {
            // 获取剧名 - 兼容两种格式：字符串或数组
            let dramaName = null
            const dramaField = item.fields?.['剧名']
            if (typeof dramaField === 'string') {
              dramaName = dramaField
            } else if (Array.isArray(dramaField) && dramaField[0]?.text) {
              dramaName = dramaField[0].text
            }

            if (dramaName) {
              // 修正逻辑：处理多种可能的字段数据结构
              let isDownloaded = false
              const downloadField = item.fields['是否已下载']

              if (downloadField) {
                // 情况1: 数组形式 [{text: "是"}]
                if (Array.isArray(downloadField) && downloadField[0] && downloadField[0].text) {
                  isDownloaded = downloadField[0].text === '是'
                }
                // 情况2: 对象形式带value数组 {value: [{text: "是"}]}
                else if (
                  downloadField.value &&
                  Array.isArray(downloadField.value) &&
                  downloadField.value[0]
                ) {
                  isDownloaded = downloadField.value[0].text === '是'
                }
                // 情况3: 直接的value字符串 {value: "是"}
                else if (typeof downloadField.value === 'string') {
                  isDownloaded = downloadField.value === '是'
                }
                // 情况4: 直接是字符串
                else if (typeof downloadField === 'string') {
                  isDownloaded = downloadField === '是'
                }
              }

              // 记录下载状态
              dramaDownloadStatusMap.set(dramaName, isDownloaded)
              // 记录是否在飞书清单中存在（只要在飞书清单中就是存在）
              dramaExistsInFeishuMap.set(dramaName, true)
            }
          })

          // 为排行榜列表中的每个剧集添加下载状态信息
          if (ctx.body.data && Array.isArray(ctx.body.data)) {
            ctx.body.data.forEach(drama => {
              if (drama.book_name) {
                const isDownloaded = dramaDownloadStatusMap.get(drama.book_name)
                const existsInFeishu = dramaExistsInFeishuMap.get(drama.book_name)

                // 调试：打印每部剧的匹配情况
                console.log(
                  `[排行榜] 剧名: "${drama.book_name}", 飞书已下载: ${isDownloaded}, 飞书存在: ${existsInFeishu}`
                )

                // 设置是否已下载状态
                drama.feishu_downloaded = isDownloaded === true
                // 设置是否在飞书清单中存在
                drama.feishu_exists = existsInFeishu === true
              }
            })
          }
        }
      } catch {
        // Warning logging removed
        // 即使飞书数据获取失败，也继续返回排行榜数据
      }
    }
  } catch (error) {
    // Error logging removed
    ctx.status = 500
    ctx.body = {
      code: 500,
      message: '获取排行榜数据失败',
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

export default router
