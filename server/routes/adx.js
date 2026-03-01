import Router from '@koa/router'
import { readAuthConfig } from './auth.js'

const router = new Router()

/**
 * ADX 榜单代理
 * POST /api/adx/ranking
 */
router.post('/ranking', async ctx => {
  try {
    const config = await readAuthConfig()
    const adxCookie = config.platforms?.adx?.cookie

    if (!adxCookie) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: '未配置 ADX Cookie，请先在抽屉中配置',
      }
      return
    }

    const {
      type = 'day',
      dateValue = '',
      searchKey = '',
      pageId = 1,
      pageSize = 50,
      sortBy = '',
      isNewPlaylet = '',
    } = ctx.request.body

    // 构建 form-urlencoded 参数
    const params = new URLSearchParams()
    if (type === 'day') {
      params.append('day', dateValue)
    } else {
      params.append('week', dateValue)
    }
    params.append('searchKey', searchKey)
    params.append('pageId', String(pageId))
    params.append('pageSize', String(pageSize))
    if (sortBy) params.append('sortBy', sortBy)
    if (isNewPlaylet) params.append('isNewPlaylet', isNewPlaylet)

    const response = await fetch('https://adxray-app.dataeye.com/api/app/playlet/listRanking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: adxCookie,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      body: params.toString(),
    })

    const data = await response.json()
    ctx.body = data
  } catch (error) {
    console.error('ADX 榜单代理请求失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: 'ADX 榜单请求失败',
      error: error.message,
    }
  }
})

export default router
