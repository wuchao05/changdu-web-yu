import httpInstance from './http'

export interface DouyinMaterialMatch {
  id: string
  douyinAccount: string
  douyinAccountId: string
  materialRange: string
  createdAt: string
  updatedAt: string
}

/**
 * 获取所有抖音号素材匹配配置
 */
export function getDouyinMaterialConfig(): Promise<DouyinMaterialMatch[]> {
  return httpInstance.get('/douyin-material/config').then(res => res.data.data)
}

/**
 * 添加抖音号素材匹配规则
 */
export function addDouyinMaterialMatch(match: {
  douyinAccount: string
  douyinAccountId: string
  materialRange: string
}): Promise<DouyinMaterialMatch> {
  return httpInstance.post('/douyin-material/config', match).then(res => res.data.data)
}

/**
 * 更新抖音号素材匹配规则
 */
export function updateDouyinMaterialMatch(
  id: string,
  updates: Partial<DouyinMaterialMatch>
): Promise<DouyinMaterialMatch> {
  return httpInstance.put(`/douyin-material/config/${id}`, updates).then(res => res.data.data)
}

/**
 * 删除抖音号素材匹配规则
 */
export function deleteDouyinMaterialMatch(id: string): Promise<DouyinMaterialMatch> {
  return httpInstance.delete(`/douyin-material/config/${id}`).then(res => res.data.data)
}

// ==================== 散柔专用 API ====================

/**
 * 获取所有抖音号素材匹配配置（散柔）
 */
export function getDouyinMaterialConfigSanrou(): Promise<DouyinMaterialMatch[]> {
  return httpInstance.get('/douyin-material-sanrou/config').then(res => res.data.data)
}

/**
 * 添加抖音号素材匹配规则（散柔）
 */
export function addDouyinMaterialMatchSanrou(match: {
  douyinAccount: string
  douyinAccountId: string
  materialRange: string
}): Promise<DouyinMaterialMatch> {
  return httpInstance.post('/douyin-material-sanrou/config', match).then(res => res.data.data)
}

/**
 * 更新抖音号素材匹配规则（散柔）
 */
export function updateDouyinMaterialMatchSanrou(
  id: string,
  updates: Partial<DouyinMaterialMatch>
): Promise<DouyinMaterialMatch> {
  return httpInstance
    .put(`/douyin-material-sanrou/config/${id}`, updates)
    .then(res => res.data.data)
}

/**
 * 删除抖音号素材匹配规则（散柔）
 */
export function deleteDouyinMaterialMatchSanrou(id: string): Promise<DouyinMaterialMatch> {
  return httpInstance.delete(`/douyin-material-sanrou/config/${id}`).then(res => res.data.data)
}

// ==================== 牵龙专用 API ====================

/**
 * 获取所有抖音号素材匹配配置（牵龙）
 */
export function getDouyinMaterialConfigQianlong(): Promise<DouyinMaterialMatch[]> {
  return httpInstance.get('/douyin-material-qianlong/config').then(res => res.data.data)
}

/**
 * 添加抖音号素材匹配规则（牵龙）
 */
export function addDouyinMaterialMatchQianlong(match: {
  douyinAccount: string
  douyinAccountId: string
  materialRange: string
}): Promise<DouyinMaterialMatch> {
  return httpInstance.post('/douyin-material-qianlong/config', match).then(res => res.data.data)
}

/**
 * 更新抖音号素材匹配规则（牵龙）
 */
export function updateDouyinMaterialMatchQianlong(
  id: string,
  updates: Partial<DouyinMaterialMatch>
): Promise<DouyinMaterialMatch> {
  return httpInstance
    .put(`/douyin-material-qianlong/config/${id}`, updates)
    .then(res => res.data.data)
}

/**
 * 删除抖音号素材匹配规则（牵龙）
 */
export function deleteDouyinMaterialMatchQianlong(id: string): Promise<DouyinMaterialMatch> {
  return httpInstance.delete(`/douyin-material-qianlong/config/${id}`).then(res => res.data.data)
}
