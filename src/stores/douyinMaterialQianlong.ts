import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as douyinMaterialApi from '@/api/douyinMaterial'

export interface DouyinMaterialMatch {
  id: string
  douyinAccount: string
  douyinAccountId: string
  materialRange: string
  createdAt: string
  updatedAt: string
}

const CACHE_KEY = 'douyin_material_matches_qianlong_cache'
const CACHE_VERSION = 1
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

interface CacheData {
  version: number
  timestamp: number
  matches: DouyinMaterialMatch[]
}

export const useDouyinMaterialQianlongStore = defineStore('douyinMaterialQianlong', () => {
  // 抖音号匹配素材列表（牵龙专用）
  const matches = ref<DouyinMaterialMatch[]>([])

  /**
   * 从本地缓存加载数据
   */
  function loadFromCache(): boolean {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return false

      const cacheData: CacheData = JSON.parse(cached)

      // 验证缓存版本
      if (cacheData.version !== CACHE_VERSION) {
        console.log('⚠️ 抖音号素材匹配配置(牵龙)缓存版本不匹配，已清除')
        localStorage.removeItem(CACHE_KEY)
        return false
      }

      // 验证缓存是否过期
      const now = Date.now()
      if (now - cacheData.timestamp > CACHE_TTL) {
        console.log('⏰ 抖音号素材匹配配置(牵龙)缓存已过期')
        return false
      }

      // 使用缓存
      matches.value = cacheData.matches
      console.log('💾 已从缓存加载抖音号素材匹配配置(牵龙)')
      return true
    } catch (error) {
      console.error('读取抖音号素材匹配配置(牵龙)缓存失败:', error)
      return false
    }
  }

  /**
   * 保存到本地缓存
   */
  function saveToCache() {
    try {
      const cacheData: CacheData = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        matches: matches.value,
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      console.log('💾 已缓存抖音号素材匹配配置(牵龙)到本地')
    } catch (error) {
      console.error('保存抖音号素材匹配配置(牵龙)缓存失败:', error)
    }
  }

  /**
   * 从服务器加载配置
   * @param forceRefresh 是否强制刷新，忽略缓存
   */
  async function loadFromServer(forceRefresh = false) {
    // 如果不是强制刷新，先尝试从缓存加载
    if (!forceRefresh && loadFromCache()) {
      return
    }

    try {
      console.log('🌐 从服务器加载抖音号素材匹配配置(牵龙)...')
      const list = await douyinMaterialApi.getDouyinMaterialConfigQianlong()
      // 确保返回的是数组
      if (Array.isArray(list)) {
        matches.value = list
        // 保存到缓存
        saveToCache()
      } else {
        console.error('服务器返回的数据不是数组:', list)
        matches.value = []
      }
    } catch (error) {
      console.error('从服务器加载抖音号素材匹配配置(牵龙)失败:', error)
      // 如果服务器加载失败，尝试使用本地缓存
      if (!loadFromCache()) {
        matches.value = []
      }
    }
  }

  /**
   * 从 localStorage 加载数据（兼容旧版本，迁移后删除）
   */
  function loadFromStorage() {
    // 优先从服务器加载
    loadFromServer()
  }

  /**
   * 添加匹配规则
   */
  async function addMatch(douyinAccount: string, douyinAccountId: string, materialRange: string) {
    try {
      const newMatch = await douyinMaterialApi.addDouyinMaterialMatchQianlong({
        douyinAccount,
        douyinAccountId,
        materialRange,
      })
      matches.value.push(newMatch)
      saveToCache()
      return newMatch
    } catch (error) {
      console.error('添加抖音号素材匹配规则(牵龙)失败:', error)
      throw error
    }
  }

  /**
   * 更新匹配规则
   */
  async function updateMatch(
    id: string,
    douyinAccount: string,
    douyinAccountId: string,
    materialRange: string
  ) {
    try {
      const updatedMatch = await douyinMaterialApi.updateDouyinMaterialMatchQianlong(id, {
        douyinAccount,
        douyinAccountId,
        materialRange,
      })
      const index = matches.value.findIndex(m => m.id === id)
      if (index !== -1) {
        matches.value[index] = updatedMatch
        saveToCache()
      }
      return updatedMatch
    } catch (error) {
      console.error('更新抖音号素材匹配规则(牵龙)失败:', error)
      throw error
    }
  }

  /**
   * 删除匹配规则
   */
  async function deleteMatch(id: string) {
    try {
      await douyinMaterialApi.deleteDouyinMaterialMatchQianlong(id)
      const index = matches.value.findIndex(m => m.id === id)
      if (index !== -1) {
        matches.value.splice(index, 1)
        saveToCache()
      }
    } catch (error) {
      console.error('删除抖音号素材匹配规则(牵龙)失败:', error)
      throw error
    }
  }

  /**
   * 根据抖音号查找素材序号
   */
  function findMaterialRange(douyinAccount: string): string | undefined {
    return matches.value.find(m => m.douyinAccount === douyinAccount)?.materialRange
  }

  return {
    matches,
    loadFromStorage,
    loadFromServer,
    addMatch,
    updateMatch,
    deleteMatch,
    findMaterialRange,
  }
})
