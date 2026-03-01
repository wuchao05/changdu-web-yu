import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { CREATORS, type Creator } from '@/config/creators'
import { setCurrentDistributorId } from '@/api/http'
import { getDistributors } from '@/api/index'
import type { DistributorInfo } from '@/api/types'

export const useCreatorStore = defineStore('creator', () => {
  // 状态
  const activeCreatorId = ref<string>('')
  const creators = ref<Creator[]>([...CREATORS])
  const isLoading = ref(false)
  const lastFetchTime = ref<Date | null>(null)
  const fetchError = ref<string | null>(null)

  // 计算属性
  const activeCreator = computed(() => {
    return creators.value.find(creator => creator.distributorId === activeCreatorId.value) || null
  })

  const activeCreatorName = computed(() => {
    return activeCreator.value?.name || ''
  })

  // 获取可见的达人列表（用于首页tab显示）
  const visibleCreators = computed(() => {
    return creators.value
      .filter(creator => !creator.hidden)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  })

  // 操作
  function setActiveCreator(distributorId: string) {
    const creator = creators.value.find(c => c.distributorId === distributorId)
    if (creator) {
      activeCreatorId.value = distributorId
      // 同步更新 HTTP 请求头
      setCurrentDistributorId(distributorId)

      // 持久化到 localStorage
      localStorage.setItem('activeCreatorId', distributorId)
    }
  }

  function initActiveCreator() {
    // 从 localStorage 恢复活跃达人
    const savedCreatorId = localStorage.getItem('activeCreatorId')
    if (savedCreatorId && creators.value.find(c => c.distributorId === savedCreatorId)) {
      setActiveCreator(savedCreatorId)
    } else if (creators.value.length > 0) {
      // 默认选择第一个达人
      setActiveCreator(creators.value[0].distributorId)
    }
  }

  function updateCreatorDouYinName(distributorId: string, douyinName: string) {
    const creator = creators.value.find(c => c.distributorId === distributorId)
    if (creator) {
      creator.douyinName = douyinName
      // 持久化到 localStorage
      localStorage.setItem('creators', JSON.stringify(creators.value))
    }
  }

  function loadCreatorsFromStorage() {
    try {
      const saved = localStorage.getItem('creators')
      if (saved) {
        const savedCreators = JSON.parse(saved) as Creator[]
        // 如果localStorage中有达人数据，则使用保存的数据替换默认数据
        if (savedCreators.length > 0) {
          creators.value = savedCreators
        } else {
          // 如果没有保存的数据，合并抖音号信息
          savedCreators.forEach(savedCreator => {
            const creator = creators.value.find(c => c.distributorId === savedCreator.distributorId)
            if (creator && savedCreator.douyinName) {
              creator.douyinName = savedCreator.douyinName
            }
          })
        }
      }
    } catch (error) {
      console.warn('加载达人信息失败:', error)
    }
  }

  function saveCreatorsToStorage() {
    try {
      localStorage.setItem('creators', JSON.stringify(creators.value))
    } catch (error) {
      console.error('保存达人信息失败:', error)
    }
  }

  // 注意：达人列表现在完全由API控制，不支持手动添加、编辑或删除达人
  // 保留的手动操作仅限于更新抖音号信息

  /**
   * 从API获取达人数据
   * 将API返回的DistributorInfo转换为Creator格式
   */
  async function fetchCreatorsFromAPI(): Promise<void> {
    if (isLoading.value) {
      return // 防止重复请求
    }

    isLoading.value = true
    fetchError.value = null

    try {
      const response = await getDistributors()

      if (response.code === 4001) {
        throw new Error('用户未登录，请检查Cookie设置')
      }

      if (response.code !== 0) {
        throw new Error(response.message || '获取达人数据失败')
      }

      // 转换API数据为Creator格式
      const apiCreators: Creator[] = response.distributor_info_list.map(
        (distributor: DistributorInfo, index: number) => ({
          name: distributor.nick_name,
          distributorId: distributor.distributor_id.toString(),
          douyinName: undefined, // API中没有抖音号信息，保持为空
          hidden: false, // 默认不隐藏
          order: index, // 默认按API返回顺序
        })
      )

      // 合并现有的达人信息（抖音号、隐藏状态、排序）
      const existingCreators = creators.value
      apiCreators.forEach(apiCreator => {
        const existing = existingCreators.find(c => c.distributorId === apiCreator.distributorId)
        if (existing) {
          // 保留已有的抖音号、隐藏状态和排序信息
          if (existing.douyinName) {
            apiCreator.douyinName = existing.douyinName
          }
          if (existing.hidden !== undefined) {
            apiCreator.hidden = existing.hidden
          }
          if (existing.order !== undefined) {
            apiCreator.order = existing.order
          }
        }
      })

      // 更新达人列表
      creators.value = apiCreators
      lastFetchTime.value = new Date()

      // 保存到localStorage
      saveCreatorsToStorage()

      // 如果当前没有活跃达人或活跃达人不在新列表中，重新初始化
      if (
        !activeCreatorId.value ||
        !apiCreators.find(c => c.distributorId === activeCreatorId.value)
      ) {
        initActiveCreator()
      }

      // 成功从API获取达人数据
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取达人数据失败'
      fetchError.value = errorMessage
      console.error('❌ 获取达人数据失败:', error)

      // 如果API获取失败，使用localStorage中的数据或默认数据
      if (creators.value.length === 0) {
        loadCreatorsFromStorage()
        if (creators.value.length === 0) {
          creators.value = [...CREATORS]
          saveCreatorsToStorage()
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 刷新达人数据（强制从API重新获取）
   */
  async function refreshCreators(): Promise<void> {
    await fetchCreatorsFromAPI()
  }

  /**
   * 切换达人的隐藏状态
   */
  function toggleCreatorVisibility(distributorId: string) {
    const creator = creators.value.find(c => c.distributorId === distributorId)
    if (creator) {
      creator.hidden = !creator.hidden
      saveCreatorsToStorage()
    }
  }

  /**
   * 重新排序达人列表
   */
  function reorderCreators(newCreators: Creator[]) {
    // 更新排序
    newCreators.forEach((creator, index) => {
      creator.order = index
    })
    creators.value = newCreators
    saveCreatorsToStorage()
  }

  return {
    // 状态
    activeCreatorId,
    creators,
    isLoading,
    lastFetchTime,
    fetchError,

    // 计算属性
    activeCreator,
    activeCreatorName,
    visibleCreators,

    // 操作
    setActiveCreator,
    initActiveCreator,
    updateCreatorDouYinName,
    loadCreatorsFromStorage,
    fetchCreatorsFromAPI,
    refreshCreators,
    toggleCreatorVisibility,
    reorderCreators,
  }
})
