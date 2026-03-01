import httpInstance from './http'

export interface DouyinMaterialMatch {
  id: string
  douyinAccount: string
  douyinAccountId: string
  materialRange: string
  createdAt: string
  updatedAt: string
}

export interface DarenInfo {
  id: string
  label: string
  shortName: string // 简称，用于搭建等场景
  douyinAccounts: string[]
  feishuDramaStatusTableId?: string // 飞书剧集状态表格 ID
  feishuDramaListTableId?: string // 飞书剧集清单表格 ID
  feishuAccountTableId?: string // 飞书账户表格 ID
  enableDramaClipEntry?: boolean // 爆剧爆剪入口开关
  douyinMaterialMatches?: DouyinMaterialMatch[] // 抖音号素材配置
  // 素材预览配置
  enableMaterialPreview?: boolean // 素材预览开关
  previewIntervalMinutes?: number // 轮询间隔时间（分钟）
  previewBuildTimeWindowStart?: number // 时间窗口起始（分钟）
  previewBuildTimeWindowEnd?: number // 时间窗口结束（分钟）
  // 兼容旧字段
  feishuTableId?: string
}

/**
 * 获取所有达人配置
 */
export function getDarenConfig(): Promise<DarenInfo[]> {
  return httpInstance.get('/daren/config').then(res => res.data.data)
}

/**
 * 添加达人
 */
export function addDaren(daren: DarenInfo): Promise<DarenInfo> {
  return httpInstance.post('/daren/config', daren).then(res => res.data.data)
}

/**
 * 更新达人
 */
export function updateDaren(id: string, updates: Partial<DarenInfo>): Promise<DarenInfo> {
  return httpInstance.put(`/daren/config/${id}`, updates).then(res => res.data.data)
}

/**
 * 删除达人
 */
export function deleteDaren(id: string): Promise<DarenInfo> {
  return httpInstance.delete(`/daren/config/${id}`).then(res => res.data.data)
}

/**
 * 根据用户ID获取达人信息
 */
export function getDarenInfo(userId: string): Promise<DarenInfo> {
  return httpInstance.get(`/daren/info/${userId}`).then(res => res.data.data)
}
