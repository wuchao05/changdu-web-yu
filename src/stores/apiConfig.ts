import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ACCOUNT_API_DEFAULTS } from '@/config/accountApiDefaults'

export interface ApiConfig {
  cookie: string
  appId?: string
  appType?: string
  autoDownloadEnabled?: boolean
  autoDownloadIntervalMinutes?: number
  distributorId?: string
  adUserId?: string
  rootAdUserId?: string
}

const DEFAULT_API_CONFIG: ApiConfig = {
  cookie: '',
  appId: '40011566',
  appType: '7',
  autoDownloadEnabled: false,
  autoDownloadIntervalMinutes: 20,
  distributorId: '1844565955364887',
  adUserId: '1291245239407612',
  rootAdUserId: '600762415841560',
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
        if (typeof authData.changduCookie === 'string' && authData.changduCookie) {
          configs.value.daily.cookie = authData.changduCookie
        }
        if (authData.headers && typeof authData.headers === 'object') {
          configs.value.daily.appId = authData.headers.appid || configs.value.daily.appId
          configs.value.daily.appType = authData.headers.apptype || configs.value.daily.appType
          configs.value.daily.distributorId =
            authData.headers.distributorId || configs.value.daily.distributorId
          configs.value.daily.adUserId = authData.headers.adUserId || configs.value.daily.adUserId
          configs.value.daily.rootAdUserId =
            authData.headers.rootAdUserId || configs.value.daily.rootAdUserId
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
    changduCookie?: string
    headers?: {
      appid?: string
      apptype?: string
      distributorId?: string
      adUserId?: string
      rootAdUserId?: string
    }
  }) {
    try {
      configs.value.daily = {
        ...configs.value.daily,
        ...(typeof authData.changduCookie === 'string' && authData.changduCookie
          ? { cookie: authData.changduCookie }
          : {}),
        ...(authData.headers
          ? {
              appId: authData.headers.appid || configs.value.daily.appId,
              appType: authData.headers.apptype || configs.value.daily.appType,
              distributorId: authData.headers.distributorId || configs.value.daily.distributorId,
              adUserId: authData.headers.adUserId || configs.value.daily.adUserId,
              rootAdUserId: authData.headers.rootAdUserId || configs.value.daily.rootAdUserId,
            }
          : {}),
      }

      if (
        (typeof authData.changduCookie === 'string' && authData.changduCookie) ||
        authData.headers
      ) {
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
