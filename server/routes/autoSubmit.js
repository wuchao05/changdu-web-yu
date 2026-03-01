/**
 * 自动提交下载 API 路由
 */
import Router from '@koa/router'
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerManualRun,
  resetStats,
} from '../services/autoSubmitScheduler.js'

const router = new Router({
  prefix: '/api/auto-submit',
})

/**
 * 启动自动提交调度器
 * POST /api/auto-submit/start
 * Body: {
 *   intervalMinutes: number,  // 轮询间隔（分钟）
 *   subject: 'daily' | 'sanrou' | 'qianlong',  // 主体
 *   onlyRedFlag: boolean,  // 是否只提交红标剧（仅每日主体有效）
 * }
 */
router.post('/start', async ctx => {
  try {
    const { intervalMinutes, subject, onlyRedFlag } = ctx.request.body || {}

    if (!subject || !['daily', 'sanrou', 'qianlong'].includes(subject)) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: 'subject 参数必须是 daily、sanrou 或 qianlong',
      }
      return
    }

    const result = await startScheduler(subject, {
      intervalMinutes: intervalMinutes || 5,
      onlyRedFlag: onlyRedFlag || false,
    })

    ctx.body = {
      code: result.success ? 0 : -1,
      message: result.message,
      data: getSchedulerStatus(),
    }
  } catch (error) {
    console.error('[自动提交API] 启动失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: error.message || '启动失败',
    }
  }
})

/**
 * 停止自动提交调度器
 * POST /api/auto-submit/stop
 * Body: {
 *   subject: 'daily' | 'sanrou' | 'qianlong'  // 要停止的主体
 * }
 */
router.post('/stop', async ctx => {
  try {
    const { subject } = ctx.request.body || {}

    if (!subject || !['daily', 'sanrou', 'qianlong'].includes(subject)) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: 'subject 参数必须是 daily、sanrou 或 qianlong',
      }
      return
    }

    const result = await stopScheduler(subject)

    ctx.body = {
      code: result.success ? 0 : -1,
      message: result.message,
      data: getSchedulerStatus(),
    }
  } catch (error) {
    console.error('[自动提交API] 停止失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: error.message || '停止失败',
    }
  }
})

/**
 * 获取调度器状态
 * GET /api/auto-submit/status
 * 返回所有主体的状态
 */
router.get('/status', async ctx => {
  try {
    const status = getSchedulerStatus()

    ctx.body = {
      code: 0,
      message: 'ok',
      data: status,
    }
  } catch (error) {
    console.error('[自动提交API] 获取状态失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: error.message || '获取状态失败',
    }
  }
})

/**
 * 手动触发一次执行
 * POST /api/auto-submit/trigger
 * Body: {
 *   subject: 'daily' | 'sanrou' | 'qianlong'  // 要触发的主体
 * }
 */
router.post('/trigger', async ctx => {
  try {
    const { subject } = ctx.request.body || {}

    if (!subject || !['daily', 'sanrou', 'qianlong'].includes(subject)) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: 'subject 参数必须是 daily、sanrou 或 qianlong',
      }
      return
    }

    const result = await triggerManualRun(subject)

    ctx.body = {
      code: result.success ? 0 : -1,
      message: result.message,
      data: getSchedulerStatus(),
    }
  } catch (error) {
    console.error('[自动提交API] 触发执行失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: error.message || '触发执行失败',
    }
  }
})

/**
 * 重置统计数据
 * POST /api/auto-submit/reset-stats
 * Body: {
 *   subject: 'daily' | 'sanrou' | 'qianlong'  // 要重置的主体
 * }
 */
router.post('/reset-stats', async ctx => {
  try {
    const { subject } = ctx.request.body || {}

    if (!subject || !['daily', 'sanrou', 'qianlong'].includes(subject)) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: 'subject 参数必须是 daily、sanrou 或 qianlong',
      }
      return
    }

    const result = await resetStats(subject)

    ctx.body = {
      code: result.success ? 0 : -1,
      message: result.message,
      data: getSchedulerStatus(),
    }
  } catch (error) {
    console.error('[自动提交API] 重置统计失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: error.message || '重置统计失败',
    }
  }
})

export default router
