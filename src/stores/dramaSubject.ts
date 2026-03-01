import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { FEISHU_CONFIG } from '@/config/feishu'

/**
 * 模板版仅展示每日主体，但保留历史枚举以兼容旧逻辑分支
 */
export type DramaSubjectType = '每日' | '散柔' | '牵龙' | '达人'

export const useDramaSubjectStore = defineStore('dramaSubject', () => {
  const currentSubject = ref<DramaSubjectType>('每日')

  const subjectOptions: { label: string; value: DramaSubjectType }[] = [
    { label: '每日', value: '每日' },
  ]

  const dramaListTableId = computed(() => FEISHU_CONFIG.daily_table_ids.drama_list)
  const dramaStatusTableId = computed(() => FEISHU_CONFIG.daily_table_ids.drama_status)
  const accountTableId = computed(() => FEISHU_CONFIG.daily_table_ids.account)
  const subjectFieldValue = computed(() => currentSubject.value)
  const isDailySubject = computed(() => currentSubject.value === '每日')

  function setSubject(subject: DramaSubjectType) {
    currentSubject.value = subject
    saveToStorage()
  }

  function saveToStorage() {
    try {
      localStorage.setItem('dramaSubject', JSON.stringify({ currentSubject: currentSubject.value }))
    } catch (error) {
      console.warn('保存主体配置失败:', error)
    }
  }

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem('dramaSubject')
      if (!saved) return
      JSON.parse(saved)
      // 模板版强制固定为每日
      currentSubject.value = '每日'
    } catch (error) {
      console.warn('加载主体配置失败:', error)
    }
  }

  loadFromStorage()
  watch(currentSubject, saveToStorage)

  return {
    currentSubject,
    subjectOptions,
    dramaListTableId,
    dramaStatusTableId,
    accountTableId,
    subjectFieldValue,
    isDailySubject,
    setSubject,
    loadFromStorage,
  }
})
