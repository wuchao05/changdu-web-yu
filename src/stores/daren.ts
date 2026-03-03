import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getDarenConfig,
  addDaren as addDarenApi,
  updateDaren as updateDarenApi,
  deleteDaren as deleteDarenApi,
  type DarenInfo,
} from '@/api/daren'

const STORAGE_KEY = 'daren-selected-user'
const DAREN_LIST_CACHE_KEY = 'daren-list-cache'
const CACHE_VERSION = 1 // 缓存版本，用于强制刷新
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时缓存

interface DarenCacheData {
  version: number
  timestamp: number
  darenList: DarenInfo[]
}

// 导出类型供其他模块使用
export type { DarenInfo }

/**
 * 达人Store
 * 管理达人相关的全局状态，包括达人列表、选中的达人和抖音号配置
 */
export const useDarenStore = defineStore('daren', () => {
  // 当前选中的达人userId（管理员可切换，普通达人用户自动使用自己的ID）
  const selectedDarenUserId = ref<string | null>(null)

  // 达人列表（完全由用户配置）
  const darenList = ref<DarenInfo[]>([])

  /**
   * 获取当前应该使用的用户ID
   * 如果管理员选择了特定达人，使用选中的达人ID
   * 否则返回 undefined
   */
  const effectiveUserId = computed(() => {
    return selectedDarenUserId.value || undefined
  })

  /**
   * 根据用户ID查找达人信息
   */
  function findDarenByUserId(userId: string): DarenInfo | undefined {
    // 确保 darenList 是数组
    if (!Array.isArray(darenList.value)) {
      console.error('darenList.value 不是数组:', darenList.value)
      darenList.value = []
      return undefined
    }
    return darenList.value.find(daren => daren.id === userId)
  }

  /**
   * 获取当前应该使用的抖音号列表
   */
  const currentDouyinAccounts = computed(() => {
    // 确定要查找的用户ID
    // 1. 优先使用管理员选择的达人ID
    // 2. 否则返回空数组
    const targetUserId = selectedDarenUserId.value

    // 如果没有有效的用户ID，返回空数组
    if (!targetUserId) {
      return []
    }

    // 查找达人配置
    const daren = findDarenByUserId(targetUserId)

    // 如果找不到达人配置（比如管理员不在达人列表中），返回空数组
    // 这样管理员选择"全部"时不会进行抖音号过滤
    return daren?.douyinAccounts || []
  })

  /**
   * 获取抖音号查询参数（逗号分隔的字符串）
   */
  const douyinAccountsParam = computed(() => {
    const accounts = currentDouyinAccounts.value
    return accounts.length > 0 ? accounts.join(',') : ''
  })

  /**
   * 获取当前达人的抖音号素材配置（格式化为文本）
   */
  const currentDouyinMaterialText = computed(() => {
    // 确定要查找的用户ID
    const targetUserId = selectedDarenUserId.value

    // 如果没有有效的用户ID，返回空字符串
    if (!targetUserId) {
      return ''
    }

    // 查找达人配置
    const daren = findDarenByUserId(targetUserId)

    // 如果找不到达人配置或没有素材配置，返回空字符串
    if (!daren?.douyinMaterialMatches || daren.douyinMaterialMatches.length === 0) {
      return ''
    }

    // 格式化为多行文本：每行格式为 "抖音号名称 抖音号ID 素材范围"
    return daren.douyinMaterialMatches
      .map(m => `${m.douyinAccount} ${m.douyinAccountId} ${m.materialRange}`)
      .join('\n')
  })

  /**
   * 设置选中的达人用户ID（管理员使用）
   */
  function setSelectedDarenUserId(userId: string | null) {
    selectedDarenUserId.value = userId
    saveSelectedUser()
  }

  /**
   * 添加达人
   */
  async function addDaren(daren: DarenInfo) {
    try {
      const newDaren = await addDarenApi(daren)
      darenList.value.push(newDaren)
      // 更新缓存
      saveToCache()
      return newDaren
    } catch (error) {
      console.error('添加达人失败:', error)
      throw error
    }
  }

  /**
   * 更新达人信息
   */
  async function updateDaren(userId: string, updates: Partial<DarenInfo>) {
    try {
      const updatedDaren = await updateDarenApi(userId, updates)
      // 查找旧的达人索引
      const oldIndex = darenList.value.findIndex(d => d.id === userId)
      if (oldIndex >= 0) {
        // 如果ID发生了变化，需要特殊处理
        if (updates.id && updates.id !== userId) {
          // 删除旧的
          darenList.value.splice(oldIndex, 1)
          // 添加新的
          darenList.value.push(updatedDaren)
        } else {
          // ID没变，直接更新
          darenList.value[oldIndex] = updatedDaren
        }
      }
      // 更新缓存
      saveToCache()
      return updatedDaren
    } catch (error) {
      console.error('更新达人失败:', error)
      throw error
    }
  }

  /**
   * 删除达人
   */
  async function deleteDaren(userId: string) {
    try {
      await deleteDarenApi(userId)
      const index = darenList.value.findIndex(d => d.id === userId)
      if (index >= 0) {
        darenList.value.splice(index, 1)
      }
      // 如果删除的是当前选中的达人，清除选中
      if (selectedDarenUserId.value === userId) {
        selectedDarenUserId.value = null
        saveSelectedUser()
      }
      // 更新缓存
      saveToCache()
    } catch (error) {
      console.error('删除达人失败:', error)
      throw error
    }
  }

  /**
   * 获取指定用户的抖音号配置
   */
  function getDouyinConfigForUser(userId: string): string[] {
    const daren = findDarenByUserId(userId)
    return daren?.douyinAccounts || []
  }

  /**
   * 从本地缓存加载达人配置
   */
  function loadFromCache(): boolean {
    try {
      const cached = localStorage.getItem(DAREN_LIST_CACHE_KEY)
      if (!cached) return false

      const cacheData: DarenCacheData = JSON.parse(cached)
      const now = Date.now()

      // 检查缓存版本和过期时间
      if (
        cacheData.version === CACHE_VERSION &&
        now - cacheData.timestamp < CACHE_DURATION &&
        Array.isArray(cacheData.darenList) // 确保是数组
      ) {
        darenList.value = cacheData.darenList
        console.log('✅ 从缓存加载达人配置')
        return true
      }

      // 缓存过期或版本不匹配
      console.log('⏰ 达人配置缓存已过期')
      return false
    } catch (error) {
      console.error('读取达人配置缓存失败:', error)
      return false
    }
  }

  /**
   * 保存达人配置到本地缓存
   */
  function saveToCache() {
    try {
      const cacheData: DarenCacheData = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        darenList: darenList.value,
      }
      localStorage.setItem(DAREN_LIST_CACHE_KEY, JSON.stringify(cacheData))
      console.log('💾 已缓存达人配置到本地')
    } catch (error) {
      console.error('保存达人配置缓存失败:', error)
    }
  }

  /**
   * 从服务器加载达人配置
   * @param forceRefresh 是否强制刷新，忽略缓存
   */
  async function loadFromServer(forceRefresh = false) {
    // 如果不是强制刷新，先尝试从缓存加载
    if (!forceRefresh && loadFromCache()) {
      loadSelectedUser()
      return
    }

    try {
      console.log('🌐 从服务器加载达人配置...')
      const list = await getDarenConfig()
      // 确保返回的是数组
      if (Array.isArray(list)) {
        darenList.value = list
        // 保存到缓存
        saveToCache()
      } else {
        console.error('服务器返回的数据不是数组:', list)
        darenList.value = []
      }
      // 同时加载本地保存的选中用户
      loadSelectedUser()
    } catch (error) {
      console.error('加载达人配置失败:', error)
      // 如果服务器加载失败，尝试使用本地缓存
      if (!loadFromCache()) {
        darenList.value = []
      }
    }
  }

  /**
   * 从localStorage加载选中的用户ID
   */
  function loadSelectedUser() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        selectedDarenUserId.value = stored
      }
    } catch (error) {
      console.error('加载选中用户失败:', error)
    }
  }

  /**
   * 保存选中的用户ID到localStorage
   */
  function saveSelectedUser() {
    try {
      if (selectedDarenUserId.value) {
        localStorage.setItem(STORAGE_KEY, selectedDarenUserId.value)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (error) {
      console.error('保存选中用户失败:', error)
    }
  }

  /**
   * 刷新达人列表（强制从服务器重新加载）
   */
  async function refreshDarenList() {
    await loadFromServer(true) // 强制刷新
  }

  /**
   * 清除缓存
   */
  function clearCache() {
    try {
      localStorage.removeItem(DAREN_LIST_CACHE_KEY)
      console.log('🗑️ 已清除达人配置缓存')
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  }

  /**
   * 重置所有配置（清空选中状态和缓存）
   */
  function reset() {
    selectedDarenUserId.value = null
    localStorage.removeItem(STORAGE_KEY)
    clearCache()
  }

  /**
   * 格式化指定用户的抖音素材配置为文本（用于写入飞书）
   */
  function formatDouyinMaterialConfigForUser(userId: string): string {
    const daren = findDarenByUserId(userId)
    if (!daren?.douyinMaterialMatches || daren.douyinMaterialMatches.length === 0) {
      return ''
    }
    return daren.douyinMaterialMatches
      .filter(m => m.douyinAccount && m.douyinAccountId && m.materialRange) // 过滤掉不完整的数据
      .map(m => `${m.douyinAccount} ${m.douyinAccountId} ${m.materialRange}`)
      .join('\n')
  }

  /**
   * 获取指定用户的抖音素材配置数组
   */
  function getDouyinMaterialMatchesForUser(userId: string) {
    const daren = findDarenByUserId(userId)
    return daren?.douyinMaterialMatches || []
  }

  return {
    // State
    selectedDarenUserId,
    darenList,

    // Computed
    effectiveUserId,
    currentDouyinAccounts,
    douyinAccountsParam,
    currentDouyinMaterialText,

    // Actions
    setSelectedDarenUserId,
    addDaren,
    updateDaren,
    deleteDaren,
    findDarenByUserId,
    getDouyinConfigForUser,
    formatDouyinMaterialConfigForUser,
    getDouyinMaterialMatchesForUser,
    loadFromServer,
    loadSelectedUser,
    saveSelectedUser,
    refreshDarenList,
    clearCache,
    reset,
  }
})
