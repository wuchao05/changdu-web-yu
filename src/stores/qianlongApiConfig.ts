import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ACCOUNT_API_DEFAULTS } from '@/config/accountApiDefaults'

export interface QianlongApiConfig {
  cookie: string
  distributorId: string
}

const DEFAULT_QIANLONG_CONFIG: QianlongApiConfig = {
  cookie: ACCOUNT_API_DEFAULTS.qianlong.cookie,
  distributorId: ACCOUNT_API_DEFAULTS.qianlong.distributorId || '',
}

export const useQianlongApiConfigStore = defineStore('qianlongApiConfig', () => {
  const config = ref<QianlongApiConfig>({ ...DEFAULT_QIANLONG_CONFIG })

  function updateConfig(newConfig: Partial<QianlongApiConfig>) {
    config.value = { ...config.value, ...newConfig }
    saveToStorage()
  }

  function resetConfig() {
    config.value = { ...DEFAULT_QIANLONG_CONFIG }
    saveToStorage()
  }

  function saveToStorage() {
    try {
      localStorage.setItem('qianlongApiConfig', JSON.stringify(config.value))
      console.log('牵龙API配置已保存')
    } catch (error) {
      console.warn('保存牵龙API配置失败:', error)
    }
  }

  function loadFromStorage() {
    try {
      const savedConfig = localStorage.getItem('qianlongApiConfig')
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig) as QianlongApiConfig
        config.value = { ...DEFAULT_QIANLONG_CONFIG, ...parsedConfig }
        console.log('牵龙API配置已加载')
      } else {
        console.log('牵龙API配置未找到，使用默认配置')
        config.value = { ...DEFAULT_QIANLONG_CONFIG }
      }
    } catch (error) {
      console.warn('加载牵龙API配置失败:', error)
      config.value = { ...DEFAULT_QIANLONG_CONFIG }
    }
  }

  function getApiHeaders() {
    return {
      Cookie: config.value.cookie,
      Distributorid: config.value.distributorId,
    }
  }

  return {
    config,
    updateConfig,
    resetConfig,
    saveToStorage,
    loadFromStorage,
    getApiHeaders,
  }
})
