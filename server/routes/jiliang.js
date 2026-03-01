/**
 * 巨量引擎 API 代理路由（模板版）
 */
import Router from '@koa/router'
import { readAuthConfig } from './auth.js'

const router = new Router()

function extractCsrfToken(cookie = '') {
  const match = cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match?.[1] || ''
}

async function getJiliangAuth() {
  const config = await readAuthConfig()
  const cookie =
    config.platforms?.jiliang?.cookie ||
    config.platforms?.ocean?.mr ||
    config.platforms?.ocean?.sr ||
    ''
  return {
    cookie,
    csrfToken: extractCsrfToken(cookie),
  }
}

// 获取账户列表
router.post('/api/jiliang/get_account_list', async ctx => {
  try {
    const params = ctx.request.body
    const { cookie, csrfToken } = await getJiliangAuth()

    const response = await fetch(
      'https://business.oceanengine.com/nbs/api/bm/promotion/ad/get_account_list',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(params),
      }
    )

    const data = await response.json()
    ctx.body = data
  } catch (error) {
    console.error('获取巨量账户列表失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      msg: error.message || '获取账户列表失败',
    }
  }
})

// 编辑账户备注
router.post('/api/jiliang/edit_account_remark', async ctx => {
  try {
    const { account_id, remark } = ctx.request.body
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
        body: JSON.stringify({ account_id, remark }),
      }
    )

    const data = await response.json()
    ctx.body = data
  } catch (error) {
    console.error('编辑账户备注失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      msg: error.message || '编辑账户备注失败',
    }
  }
})

export default router
