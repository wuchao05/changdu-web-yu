import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ACCOUNT_API_DEFAULTS } from '@/config/accountApiDefaults'

export interface ApiConfig {
  cookie: string
  autoDownloadEnabled?: boolean
  autoDownloadIntervalMinutes?: number
  distributorId?: string
}

const DEFAULT_API_CONFIG: ApiConfig = {
  cookie: '',
  autoDownloadEnabled: false,
  autoDownloadIntervalMinutes: 20,
  distributorId: '',
}

const ACCOUNT_DEFAULTS: Record<'daily', ApiConfig> = {
  daily: { ...DEFAULT_API_CONFIG, ...ACCOUNT_API_DEFAULTS.daily },
}

type SanrouLikeAccount = 'daily'

const STORAGE_KEYS: Record<SanrouLikeAccount, string> = {
  daily: 'apiConfig_daily',
}

const COOKIE_STORAGE_KEYS: Record<SanrouLikeAccount, string> = {
  daily: 'apiHeaders_cookie_daily',
}

export const useApiConfigStore = defineStore('apiConfig', () => {
  const configs = ref<Record<SanrouLikeAccount, ApiConfig>>({
    daily: { ...ACCOUNT_DEFAULTS.daily },
  })

  function getActiveAccount(type?: SanrouLikeAccount): SanrouLikeAccount {
    if (type) return type
    return 'daily'
  }

  const config = computed<ApiConfig>(() => {
    return configs.value.daily
  })

  function getConfigByAccount(account: SanrouLikeAccount): ApiConfig {
    return configs.value[account]
  }

  function updateConfig(newConfig: Partial<ApiConfig>, type?: SanrouLikeAccount) {
    const key = getActiveAccount(type)
    configs.value[key] = {
      ...configs.value[key],
      ...newConfig,
    }
    saveToStorage(key)
  }

  function saveToStorage(type?: SanrouLikeAccount) {
    const key = getActiveAccount(type)
    const storageKey = STORAGE_KEYS[key]
    const cookieStorageKey = COOKIE_STORAGE_KEYS[key]

    try {
      const configToSave: any = { ...configs.value[key] }
      const cookieToSave = configToSave.cookie
      if (cookieToSave) {
        delete configToSave.cookie
      }

      localStorage.setItem(storageKey, JSON.stringify(configToSave))
      if (cookieToSave) {
        localStorage.setItem(cookieStorageKey, cookieToSave)
      }
    } catch (error) {
      console.error('保存配置失败:', error)
    }
  }

  async function loadFromStorage() {
    try {
      const response = await fetch('/api/auth/config')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const result = await response.json()
      if (result.code === 0 && result.data) {
        const authData = result.data
        if (authData.platforms?.changdu?.mr?.cookie) {
          configs.value.daily.cookie = authData.platforms.changdu.mr.cookie
        }
        console.log('[apiConfig] 已从服务器加载认证配置')
      }
    } catch (error) {
      console.error('[apiConfig] 从服务器加载认证配置失败:', error)
    }

    const key = 'daily'
    const storageKey = STORAGE_KEYS[key]
    const cookieStorageKey = COOKIE_STORAGE_KEYS[key]

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        configs.value[key] = {
          ...configs.value[key],
          ...parsed,
        }
      }

      const savedCookie = localStorage.getItem(cookieStorageKey)
      if (savedCookie && !configs.value[key].cookie) {
        configs.value[key].cookie = savedCookie
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }

  function updateFromAuthConfig(authData: {
    platforms?: { changdu?: Record<string, Partial<ApiConfig>> }
  }) {
    try {
      const cd = authData.platforms?.changdu || {}

      if (cd.mr) {
        configs.value.daily = {
          ...configs.value.daily,
          cookie: cd.mr.cookie ?? configs.value.daily.cookie,
          distributorId: cd.mr.distributorId || configs.value.daily.distributorId,
        }
        saveToStorage('daily')
      }

      console.log('[apiConfig] 已更新认证配置')
    } catch (error) {
      console.error('[apiConfig] 更新认证配置失败:', error)
    }
  }

  return {
    configs,
    config,
    getConfigByAccount,
    updateConfig,
    saveToStorage,
    loadFromStorage,
    updateFromAuthConfig,
  }
})
