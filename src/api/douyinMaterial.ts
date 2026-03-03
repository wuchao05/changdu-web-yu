import httpInstance from './http'

export interface DouyinMaterialMatch {
  id: string
  douyinAccount: string
  douyinAccountId: string
  materialRange: string
  createdAt: string
  updatedAt: string
}

interface AuthConfigResponse {
  code: number
  data?: {
    douyinMaterialMatches?: DouyinMaterialMatch[]
  }
  message?: string
}

function normalizeMatches(matches: unknown): DouyinMaterialMatch[] {
  if (!Array.isArray(matches)) {
    return []
  }

  return matches
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const match = item as Partial<DouyinMaterialMatch>
      const now = new Date().toISOString()
      return {
        id: typeof match.id === 'string' && match.id ? match.id : `${Date.now()}_${index}`,
        douyinAccount: typeof match.douyinAccount === 'string' ? match.douyinAccount.trim() : '',
        douyinAccountId:
          typeof match.douyinAccountId === 'string' ? match.douyinAccountId.trim() : '',
        materialRange: typeof match.materialRange === 'string' ? match.materialRange.trim() : '',
        createdAt: typeof match.createdAt === 'string' && match.createdAt ? match.createdAt : now,
        updatedAt: typeof match.updatedAt === 'string' && match.updatedAt ? match.updatedAt : now,
      }
    })
    .filter(match => match.douyinAccount && match.douyinAccountId && match.materialRange)
}

async function readMatchesFromAuthConfig(): Promise<DouyinMaterialMatch[]> {
  const response = await httpInstance.get('/auth/config')
  const result = response.data as AuthConfigResponse
  if (result.code !== 0) {
    throw new Error(result.message || '读取抖音号素材配置失败')
  }
  return normalizeMatches(result.data?.douyinMaterialMatches)
}

async function writeMatchesToAuthConfig(matches: DouyinMaterialMatch[]): Promise<void> {
  const response = await httpInstance.put('/auth/config', {
    douyinMaterialMatches: matches,
  })
  const result = response.data as AuthConfigResponse
  if (result.code !== 0) {
    throw new Error(result.message || '保存抖音号素材配置失败')
  }
}

/**
 * 获取所有抖音号素材匹配配置
 */
export function getDouyinMaterialConfig(): Promise<DouyinMaterialMatch[]> {
  return readMatchesFromAuthConfig()
}

/**
 * 添加抖音号素材匹配规则
 */
export async function addDouyinMaterialMatch(match: {
  douyinAccount: string
  douyinAccountId: string
  materialRange: string
}): Promise<DouyinMaterialMatch> {
  const list = await readMatchesFromAuthConfig()
  const now = new Date().toISOString()
  const douyinAccount = match.douyinAccount.trim()
  const douyinAccountId = match.douyinAccountId.trim()
  const materialRange = match.materialRange.trim()

  if (list.some(item => item.douyinAccount === douyinAccount)) {
    throw new Error('该抖音号已存在')
  }

  const newMatch: DouyinMaterialMatch = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    douyinAccount,
    douyinAccountId,
    materialRange,
    createdAt: now,
    updatedAt: now,
  }

  await writeMatchesToAuthConfig([...list, newMatch])
  return newMatch
}

/**
 * 更新抖音号素材匹配规则
 */
export async function updateDouyinMaterialMatch(
  id: string,
  updates: Partial<DouyinMaterialMatch>
): Promise<DouyinMaterialMatch> {
  const list = await readMatchesFromAuthConfig()
  const index = list.findIndex(item => item.id === id)
  if (index === -1) {
    throw new Error('匹配规则不存在')
  }

  const current = list[index]
  const nextDouyinAccount =
    typeof updates.douyinAccount === 'string' ? updates.douyinAccount.trim() : current.douyinAccount
  const nextDouyinAccountId =
    typeof updates.douyinAccountId === 'string'
      ? updates.douyinAccountId.trim()
      : current.douyinAccountId
  const nextMaterialRange =
    typeof updates.materialRange === 'string' ? updates.materialRange.trim() : current.materialRange

  const duplicated = list.find(item => item.douyinAccount === nextDouyinAccount && item.id !== id)
  if (duplicated) {
    throw new Error('该抖音号已存在')
  }

  const updatedMatch: DouyinMaterialMatch = {
    ...current,
    ...updates,
    douyinAccount: nextDouyinAccount,
    douyinAccountId: nextDouyinAccountId,
    materialRange: nextMaterialRange,
    updatedAt: new Date().toISOString(),
  }

  const nextList = [...list]
  nextList[index] = updatedMatch
  await writeMatchesToAuthConfig(nextList)
  return updatedMatch
}

/**
 * 删除抖音号素材匹配规则
 */
export async function deleteDouyinMaterialMatch(id: string): Promise<DouyinMaterialMatch> {
  const list = await readMatchesFromAuthConfig()
  const index = list.findIndex(item => item.id === id)
  if (index === -1) {
    throw new Error('匹配规则不存在')
  }

  const deleted = list[index]
  const nextList = list.filter(item => item.id !== id)
  await writeMatchesToAuthConfig(nextList)
  return deleted
}

// ==================== 散柔专用 API ====================

/**
 * 获取所有抖音号素材匹配配置（散柔）
 */
export function getDouyinMaterialConfigSanrou(): Promise<DouyinMaterialMatch[]> {
  return getDouyinMaterialConfig()
}

/**
 * 添加抖音号素材匹配规则（散柔）
 */
export function addDouyinMaterialMatchSanrou(match: {
  douyinAccount: string
  douyinAccountId: string
  materialRange: string
}): Promise<DouyinMaterialMatch> {
  return addDouyinMaterialMatch(match)
}

/**
 * 更新抖音号素材匹配规则（散柔）
 */
export function updateDouyinMaterialMatchSanrou(
  id: string,
  updates: Partial<DouyinMaterialMatch>
): Promise<DouyinMaterialMatch> {
  return updateDouyinMaterialMatch(id, updates)
}

/**
 * 删除抖音号素材匹配规则（散柔）
 */
export function deleteDouyinMaterialMatchSanrou(id: string): Promise<DouyinMaterialMatch> {
  return deleteDouyinMaterialMatch(id)
}

// ==================== 牵龙专用 API ====================

/**
 * 获取所有抖音号素材匹配配置（牵龙）
 */
export function getDouyinMaterialConfigQianlong(): Promise<DouyinMaterialMatch[]> {
  return getDouyinMaterialConfig()
}

/**
 * 添加抖音号素材匹配规则（牵龙）
 */
export function addDouyinMaterialMatchQianlong(match: {
  douyinAccount: string
  douyinAccountId: string
  materialRange: string
}): Promise<DouyinMaterialMatch> {
  return addDouyinMaterialMatch(match)
}

/**
 * 更新抖音号素材匹配规则（牵龙）
 */
export function updateDouyinMaterialMatchQianlong(
  id: string,
  updates: Partial<DouyinMaterialMatch>
): Promise<DouyinMaterialMatch> {
  return updateDouyinMaterialMatch(id, updates)
}

/**
 * 删除抖音号素材匹配规则（牵龙）
 */
export function deleteDouyinMaterialMatchQianlong(id: string): Promise<DouyinMaterialMatch> {
  return deleteDouyinMaterialMatch(id)
}
