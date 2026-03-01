import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ACCOUNT_API_DEFAULTS } from '@/config/accountApiDefaults'
import { useAccountStore } from './account'
import { useQianlongApiConfigStore } from './qianlongApiConfig'

export interface ApiConfig {
  cookie: string
  userId?: string
  xtToken?: string
  autoDownloadEnabled?: boolean
  autoDownloadIntervalMinutes?: number
  distributorId?: string
}

const DEFAULT_API_CONFIG: ApiConfig = {
  cookie: '',
  userId: '',
  xtToken: '',
  autoDownloadEnabled: false,
  autoDownloadIntervalMinutes: 20,
  distributorId: '',
}

const ACCOUNT_DEFAULTS: Record<SanrouLikeAccount, ApiConfig> = {
  sanrou: { ...DEFAULT_API_CONFIG, ...ACCOUNT_API_DEFAULTS.sanrou },
  daily: { ...DEFAULT_API_CONFIG, ...ACCOUNT_API_DEFAULTS.daily },
  daren: { ...DEFAULT_API_CONFIG, ...ACCOUNT_API_DEFAULTS.daren },
}

type SanrouLikeAccount = 'sanrou' | 'daren' | 'daily'

const STORAGE_KEYS: Record<SanrouLikeAccount, string> = {
  sanrou: 'apiConfig',
  daily: 'apiConfig_daily',
  daren: 'apiConfig_daren',
}

const COOKIE_STORAGE_KEYS: Record<SanrouLikeAccount, string> = {
  sanrou: 'apiHeaders_cookie',
  daily: 'apiHeaders_cookie_daily',
  daren: 'apiHeaders_cookie_daren',
}

export const useApiConfigStore = defineStore('apiConfig', () => {
  const configs = ref<Record<SanrouLikeAccount, ApiConfig>>({
    sanrou: { ...ACCOUNT_DEFAULTS.sanrou },
    daily: { ...ACCOUNT_DEFAULTS.daily },
    daren: { ...ACCOUNT_DEFAULTS.daren },
  })
  const urlUserId = ref('')
  let ADMIN_USER_ID = '2peWAuMpDOqXGj8' // 默认值，会从服务器配置更新

  const accountStore = useAccountStore()

  // 辅助函数：检查是否是达人用户ID
  // 注意：为避免循环依赖和初始化时序问题，这里简化逻辑
  // 只保留已配置的达人 userId，不做精确的达人身份判断
  // 精确的达人判断在 Dashboard 等组件中通过 darenStore 进行
  const isDarenUserId = (userId: string): boolean => {
    // 触发达人配置异步加载（不等待结果）
    import('./daren')
      .then(({ useDarenStore }) => {
        const darenStore = useDarenStore()
        if (darenStore.darenList.length === 0) {
          darenStore.loadFromServer()
        }
      })
      .catch(error => {
        console.error('无法加载达人配置:', error)
      })

    // 简单判断：只要不是管理员，就当作可能是达人
    // 实际的达人身份判断由 useUserAuth 和 darenStore 负责
    return userId !== '2peWAuMpDOqXGj8'
  }

  const updateUrlUserId = () => {
    if (typeof window === 'undefined') return
    const searchParams = new URLSearchParams(window.location.search)
    const urlUserIdParam = searchParams.get('user_id')?.trim() || ''

    // 如果 URL 中有 user_id，保存到对应的配置中
    if (urlUserIdParam) {
      urlUserId.value = urlUserIdParam
      if (isDarenUserId(urlUserIdParam)) {
        // 达人用户：保存到 daren 配置
        configs.value.daren.userId = urlUserIdParam
        saveToStorage('daren')
      } else {
        // 非达人用户（管理员等）：保存到 sanrou 配置
        configs.value.sanrou.userId = urlUserIdParam
        saveToStorage('sanrou')
      }
      // 记录最后设置的userId到localStorage，用于URL去掉user_id后仍能保持
      try {
        localStorage.setItem('last_set_user_id', urlUserIdParam)
      } catch (e) {
        console.error('保存last_set_user_id失败:', e)
      }
    } else {
      // URL 中没有 user_id 时，优先使用最后一次从URL设置的userId
      try {
        const lastSetUserId = localStorage.getItem('last_set_user_id')?.trim()
        if (lastSetUserId) {
          urlUserId.value = lastSetUserId
          console.log('使用最后设置的 userId:', lastSetUserId)
          // 移除 applyRoleDefaults() 调用，避免重复加载配置
          // 配置加载由 main.ts 中的 loadFromStorage() 统一处理
          return
        }
      } catch (e) {
        console.error('读取last_set_user_id失败:', e)
      }

      // 如果没有last_set_user_id，则从已保存的配置中恢复
      const savedUserId =
        configs.value.daren.userId?.trim() ||
        configs.value.sanrou.userId?.trim() ||
        configs.value.daily.userId?.trim() ||
        ''
      if (savedUserId) {
        urlUserId.value = savedUserId
        console.log('从本地配置恢复 userId:', savedUserId)
      } else {
        urlUserId.value = ''
      }
    }
    applyRoleDefaults()
  }

  // 先从 localStorage 加载保存的配置��再处理 URL 参数
  // 注意：loadFromStorage() 现在是异步的，会在 main.ts 中被 await
  // 这里不等待，只做触发
  // loadFromStorage() 已移到 main.ts 中统一调用，避免重复加载
  updateUrlUserId()

  // 监听URL变化（用于浏览器前进/后退或手动修改URL）
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', updateUrlUserId)
    // 也监听pushState和replaceState（需要自定义事件）
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args)
      setTimeout(updateUrlUserId, 0)
    }

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(window.history, args)
      setTimeout(updateUrlUserId, 0)
    }
  }

  function getActiveAccount(type?: SanrouLikeAccount): SanrouLikeAccount {
    if (type) return type
    if (accountStore.currentAccount === 'daren') return 'daren'
    if (accountStore.currentAccount === 'daily') return 'daily'
    return 'sanrou'
  }

  const config = computed<ApiConfig>(() => {
    const key = getActiveAccount()
    if (key === 'daily') {
      return {
        ...configs.value.daily,
        userId: configs.value.sanrou.userId,
        xtToken: '',
      }
    }
    return configs.value[key]
  })

  const effectiveUserId = computed(() => {
    // 优先使用 URL 参数
    if (urlUserId.value) {
      return urlUserId.value
    }

    // 尝试从各个配置中读取 userId（优先级：sanrou > daren > daily）
    return (
      configs.value.sanrou.userId?.trim() ||
      configs.value.daren.userId?.trim() ||
      configs.value.daily.userId?.trim() ||
      ''
    )
  })

  function getConfigByAccount(type: SanrouLikeAccount): ApiConfig {
    return configs.value[getActiveAccount(type)]
  }

  function updateConfig(newConfig: Partial<ApiConfig>, type?: SanrouLikeAccount) {
    const key = getActiveAccount(type)
    if (key === 'daily') {
      const { userId, ...rest } = newConfig
      configs.value.daily = {
        ...configs.value.daily,
        ...rest,
        xtToken: configs.value.daily.xtToken,
      }
      saveToStorage('daily')
      if (userId !== undefined) {
        configs.value.sanrou = { ...configs.value.sanrou, userId }
        saveToStorage('sanrou')
      }
      return
    }
    configs.value[key] = { ...configs.value[key], ...newConfig }
    saveToStorage(key)
  }

  function resetConfig(type?: SanrouLikeAccount) {
    const key = getActiveAccount(type)
    configs.value[key] = { ...ACCOUNT_DEFAULTS[key] }
    saveToStorage(key)
  }

  function saveToStorage(type?: SanrouLikeAccount) {
    const targets: SanrouLikeAccount[] = type ? [type] : ['sanrou', 'daily', 'daren']
    targets.forEach(key => {
      try {
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(configs.value[key]))

        // 兼容旧版本存储的 cookie 字段（只对散柔生效，保持原行为）
        if (key === 'sanrou') {
          localStorage.setItem(COOKIE_STORAGE_KEYS[key], configs.value[key].cookie)
        }
      } catch (error) {
        console.warn('保存API配置失败:', error)
      }
    })
  }

  function loadSingleFromStorage(key: SanrouLikeAccount) {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEYS[key])
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig) as ApiConfig
        configs.value[key] = { ...ACCOUNT_DEFAULTS[key], ...parsedConfig }
        return
      }

      // 兼容旧版散柔存储
      if (key === 'sanrou') {
        const legacyCookie = localStorage.getItem(COOKIE_STORAGE_KEYS[key]) || ''
        configs.value[key] = {
          ...ACCOUNT_DEFAULTS[key],
          cookie: legacyCookie,
        }
        if (legacyCookie) {
          saveToStorage(key)
        }
      }
    } catch (error) {
      console.warn('加载API配置失败:', error)
      configs.value[key] = { ...ACCOUNT_DEFAULTS[key] }
    }
  }

  async function loadFromStorage() {
    loadSingleFromStorage('sanrou')
    loadSingleFromStorage('daily')
    loadSingleFromStorage('daren')
    await applyRoleDefaults()
  }

  /**
   * 应用角色默认配置
   * 从服务器 auth.json 同步最新配置到本地
   */
  async function applyRoleDefaults() {
    // 根据当前活跃账号类型取 userId，避免 localStorage 残留的达人 userId 干扰管理员逻辑
    const activeAccount = getActiveAccount()
    const currentUserId =
      urlUserId.value || configs.value[activeAccount].userId || configs.value.sanrou.userId || ''

    // 从服务器获取最新的认证配置
    try {
      const response = await fetch('/api/auth/config')
      if (response.ok) {
        const { data } = await response.json()
        if (data && data.platforms?.changdu) {
          const cd = data.platforms.changdu
          const tokens = data.tokens || {}

          // 更新管理员用户 ID（从服务器配置读取）
          if (data.users?.admin) {
            ADMIN_USER_ID = data.users.admin
            console.log('✅ 已从服务器同步管理员用户 ID:', ADMIN_USER_ID)
          }

          // 使用服务器配置更新本地配置（auth.json 为权威数据源，直接覆盖）
          if (currentUserId === ADMIN_USER_ID) {
            configs.value.sanrou = {
              ...configs.value.sanrou,
              cookie: cd.sr?.cookie ?? configs.value.sanrou.cookie,
              xtToken: tokens.xh ?? configs.value.sanrou.xtToken,
              distributorId: cd.sr?.distributorId || configs.value.sanrou.distributorId,
              userId: currentUserId,
            }
            const darenUserIdToKeep =
              configs.value.daren.userId && isDarenUserId(configs.value.daren.userId)
                ? configs.value.daren.userId
                : ''
            configs.value.daren = {
              ...configs.value.daren,
              cookie: cd.dr?.cookie ?? configs.value.daren.cookie,
              xtToken: tokens.daren ?? configs.value.daren.xtToken,
              distributorId: cd.dr?.distributorId || configs.value.daren.distributorId,
              userId: darenUserIdToKeep,
            }
            // 同步 daily 配置
            configs.value.daily = {
              ...configs.value.daily,
              cookie: cd.mr?.cookie ?? configs.value.daily.cookie,
              distributorId: cd.mr?.distributorId || configs.value.daily.distributorId,
            }
            saveToStorage()
          }

          if (isDarenUserId(currentUserId)) {
            configs.value.daren = {
              ...configs.value.daren,
              cookie: cd.dr?.cookie ?? configs.value.daren.cookie,
              xtToken: tokens.daren ?? configs.value.daren.xtToken,
              distributorId: cd.dr?.distributorId || configs.value.daren.distributorId,
              userId: currentUserId,
            }
            saveToStorage('daren')
          }

          // 无条件更新牵龙配置
          const qianlongStore = useQianlongApiConfigStore()
          qianlongStore.updateConfig({
            cookie: cd.ql?.cookie || '',
            distributorId: cd.ql?.distributorId || '',
          })

          console.log('✅ applyRoleDefaults: 已从服务器同步认证配置')
          return
        }
      }
    } catch (error) {
      console.warn('⚠️ applyRoleDefaults: 从服务器同步配置失败，使用本地配置', error)
    }

    // 如果服务器配置获取失败，使用本地已有配置（不再使用硬编码的默认值）
    if (currentUserId === ADMIN_USER_ID) {
      configs.value.sanrou = {
        ...configs.value.sanrou,
        userId: currentUserId,
        distributorId:
          configs.value.sanrou.distributorId || ACCOUNT_API_DEFAULTS.sanrou.distributorId,
      }
      const darenUserIdToKeep =
        configs.value.daren.userId && isDarenUserId(configs.value.daren.userId)
          ? configs.value.daren.userId
          : ''
      configs.value.daren = {
        ...configs.value.daren,
        userId: darenUserIdToKeep,
        distributorId:
          configs.value.daren.distributorId || ACCOUNT_API_DEFAULTS.daren.distributorId,
      }
      saveToStorage()

      const qianlongStore = useQianlongApiConfigStore()
      qianlongStore.updateConfig({
        cookie: configs.value.sanrou.cookie,
        distributorId: ACCOUNT_API_DEFAULTS.qianlong.distributorId,
      })
    }

    if (isDarenUserId(currentUserId)) {
      configs.value.daren = {
        ...configs.value.daren,
        userId: currentUserId,
        distributorId:
          configs.value.daren.distributorId || ACCOUNT_API_DEFAULTS.daren.distributorId,
      }
      saveToStorage('daren')
    }
  }

  /**
   * 从认证配置 API 更新配置
   * 用于从服务器的 auth.json 文件同步最新配置
   * @param authData - 新结构: { tokens, platforms }
   */
  function updateFromAuthConfig(authData: {
    tokens?: Record<string, string>
    platforms?: { changdu?: Record<string, Partial<ApiConfig>> }
  }) {
    try {
      const cd = authData.platforms?.changdu || {}
      const tokens = authData.tokens || {}

      // 更新散柔配置
      if (cd.sr) {
        configs.value.sanrou = {
          ...configs.value.sanrou,
          cookie: cd.sr.cookie ?? configs.value.sanrou.cookie,
          xtToken: tokens.xh ?? configs.value.sanrou.xtToken,
          distributorId: cd.sr.distributorId || configs.value.sanrou.distributorId,
        }
        saveToStorage('sanrou')
      }

      // 更新每日配置
      if (cd.mr) {
        configs.value.daily = {
          ...configs.value.daily,
          cookie: cd.mr.cookie ?? configs.value.daily.cookie,
          distributorId: cd.mr.distributorId || configs.value.daily.distributorId,
        }
        saveToStorage('daily')
      }

      // 更新达人配置
      if (cd.dr || tokens.daren) {
        configs.value.daren = {
          ...configs.value.daren,
          cookie: cd.dr?.cookie ?? configs.value.daren.cookie,
          xtToken: tokens.daren ?? configs.value.daren.xtToken,
          distributorId: cd.dr?.distributorId || configs.value.daren.distributorId,
        }
        saveToStorage('daren')
      }

      console.log('✅ 已从服务器同步最新认证配置')
    } catch (error) {
      console.error('更新认证配置失败:', error)
    }
  }

  return {
    config,
    effectiveUserId,
    getConfigByAccount,
    updateConfig,
    resetConfig,
    saveToStorage,
    loadFromStorage,
    applyRoleDefaults,
    updateFromAuthConfig,
  }
})
