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

function getAllSubjectStatus() {
  return {
    daily: getSchedulerStatus(),
  }
}

/**
 * 启动自动提交调度器
 * POST /api/auto-submit/start
 * Body: {
 *   intervalMinutes: number,  // 轮询间隔（分钟）
 * }
 */
router.post('/start', async ctx => {
  try {
    const { intervalMinutes } = ctx.request.body || {}

    const result = await startScheduler({
      intervalMinutes: intervalMinutes || 5,
    })

    ctx.body = {
      code: result.success ? 0 : -1,
      message: result.message,
      data: getAllSubjectStatus(),
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
 */
router.post('/stop', async ctx => {
  try {
    const result = await stopScheduler()

    ctx.body = {
      code: result.success ? 0 : -1,
      message: result.message,
      data: getAllSubjectStatus(),
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
    ctx.body = {
      code: 0,
      message: 'ok',
      data: getAllSubjectStatus(),
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
 */
router.post('/trigger', async ctx => {
  try {
    const result = await triggerManualRun()

    ctx.body = {
      code: result.success ? 0 : -1,
      message: result.message,
      data: getAllSubjectStatus(),
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
 */
router.post('/reset-stats', async ctx => {
  try {
    const result = await resetStats()

    ctx.body = {
      code: result.success ? 0 : -1,
      message: result.message,
      data: getAllSubjectStatus(),
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
