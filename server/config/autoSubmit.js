/**
 * 自动提交下载配置
 */
export const AUTO_SUBMIT_CONFIG = {
  // 下载中心请求头默认配置（可被 auth.json 中的 mr 配置覆盖）
  downloadCenter: {
    appId: '40011566',
    appType: '7',
    adUserId: '1291245239407612',
    rootAdUserId: '600762415841560',
  },

  // 筛选条件
  filter: {
    // 抖音审核状态：3=审核通过
    dyAuditStatus: 3,
    // 最小集数
    minEpisodeAmount: 40,
    // 授权状态
    permissionStatuses: '3,4',
  },

  // 分页配置
  pagination: {
    pageSize: 100,
    totalPages: 20,
    batchSize: 1, // 改为串行请求，避免并发被服务器限流返回空响应
    batchDelay: 300,
    maxRetries: 3,
    retryDelay: 1000,
  },

  // 下载任务状态
  taskStatus: {
    compressing: 1,
    completed: 2,
    failed: 3,
    encrypting: 4,
    // 可用于提交的状态列表
    readyStatuses: [1, 2, 4],
  },
}
