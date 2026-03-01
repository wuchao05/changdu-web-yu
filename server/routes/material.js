import Router from '@koa/router'
import axios from 'axios'

const router = new Router({ prefix: '/material' })
const SPLAY_TEAM_ID = '500039'

const getXtToken = ctx => {
  const token = ctx.headers['x-xt-token']
  if (!token) {
    ctx.status = 400
    ctx.body = {
      code: -1,
      message: '缺少 xt token',
    }
    return null
  }
  return token
}

router.post('/add', async ctx => {
  const token = getXtToken(ctx)
  if (!token) return

  try {
    const response = await axios.post(
      'https://splay-admin.lnkaishi.cn/material/add',
      ctx.request.body,
      {
        headers: {
          token,
        },
        timeout: 10000,
        params: {
          team_id: SPLAY_TEAM_ID,
        },
      }
    )

    ctx.body = response.data
  } catch (error) {
    console.error('提交素材失败:', error.response?.data || error.message)
    ctx.status = error.response?.status || 500
    ctx.body = {
      code: -1,
      message: error.response?.data?.message || error.message || '提交素材失败',
      data: null,
    }
  }
})

export default router
