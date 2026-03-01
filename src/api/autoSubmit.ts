/**
 * 自动提交下载 API
 * 调用服务端的自动提交调度器
 */
import httpInstance from './http'

// 单个主体的状态类型
export interface AutoSubmitStatusItem {
  enabled: boolean
  running: boolean
  intervalMinutes: number
  onlyRedFlag: boolean
  nextRunTime: string | null
  lastRunTime: string | null
  stats: {
    totalProcessed: number
    successCount: number
    failCount: number
    skipCount: number
  }
  progress: {
    current: number
    total: number
    currentDate: string
    currentDrama: string
  }
  taskHistory: Array<{
    timestamp: string
    status: 'completed' | 'error'
    processed?: number
    success?: number
    fail?: number
    skip?: number
    error?: string
  }>
}

// 所有主体的状态类型
export interface AutoSubmitStatusAll {
  daily: AutoSubmitStatusItem
  sanrou: AutoSubmitStatusItem
  qianlong: AutoSubmitStatusItem
}

// API 响应类型
export interface AutoSubmitResponse {
  code: number
  message: string
  data?: AutoSubmitStatusAll
}

// 启动参数类型
export interface StartAutoSubmitParams {
  intervalMinutes?: number
  subject: 'daily' | 'sanrou' | 'qianlong'
  onlyRedFlag?: boolean
}

/**
 * 启动自动提交调度器
 */
export function startAutoSubmit(params: StartAutoSubmitParams): Promise<AutoSubmitResponse> {
  return httpInstance.post('/auto-submit/start', params).then(res => res.data)
}

/**
 * 停止自动提交调度器
 */
export function stopAutoSubmit(
  subject: 'daily' | 'sanrou' | 'qianlong'
): Promise<AutoSubmitResponse> {
  return httpInstance.post('/auto-submit/stop', { subject }).then(res => res.data)
}

/**
 * 获取调度器状态（返回所有主体的状态）
 */
export function getAutoSubmitStatus(): Promise<{
  code: number
  message: string
  data: AutoSubmitStatusAll
}> {
  return httpInstance.get('/auto-submit/status').then(res => res.data)
}

/**
 * 手动触发一次执行
 */
export function triggerAutoSubmit(
  subject: 'daily' | 'sanrou' | 'qianlong'
): Promise<AutoSubmitResponse> {
  return httpInstance.post('/auto-submit/trigger', { subject }).then(res => res.data)
}

/**
 * 重置统计数据
 */
export function resetAutoSubmitStats(
  subject: 'daily' | 'sanrou' | 'qianlong'
): Promise<AutoSubmitResponse> {
  return httpInstance.post('/auto-submit/reset-stats', { subject }).then(res => res.data)
}
