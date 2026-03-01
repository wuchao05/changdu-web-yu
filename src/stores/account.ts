import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AccountType, AccountConfig } from '@/api/types'
import { ACCOUNT_CONFIGS, DEFAULT_ACCOUNT } from '@/config/accounts'
import { ACCOUNT_API_DEFAULTS } from '@/config/accountApiDefaults'
import { useQianlongApiConfigStore } from './qianlongApiConfig'
import { useApiConfigStore } from './apiConfig'

export const useAccountStore = defineStore('account', () => {
  // 当前活跃账号
  const currentAccount = ref<AccountType>(DEFAULT_ACCOUNT)
  const MAIN_QIANLONG_DISTRIBUTOR_ID =
    ACCOUNT_API_DEFAULTS.daren.distributorId || '1841149910426777'

  // 是否正在切换账号
  const isSwitching = ref(false)

  // 计算属性
  const currentAccountConfig = computed((): AccountConfig => {
    return ACCOUNT_CONFIGS[currentAccount.value]
  })

  const isQianlongAccount = computed((): boolean => {
    return currentAccount.value === 'qianlong'
  })

  const isDarenAccount = computed((): boolean => {
    return currentAccount.value === 'daren'
  })

  const isSanrouAccount = computed((): boolean => {
    return currentAccount.value === 'sanrou'
  })

  const isDailyAccount = computed((): boolean => {
    return currentAccount.value === 'daily'
  })

  const isSanrouLikeAccount = computed((): boolean => {
    return (
      currentAccount.value === 'sanrou' ||
      currentAccount.value === 'daren' ||
      currentAccount.value === 'daily'
    )
  })

  // 切换账号
  async function switchAccount(accountType: AccountType) {
    if (accountType === currentAccount.value) return

    isSwitching.value = true
    try {
      currentAccount.value = accountType

      // 保存到本地存储
      localStorage.setItem('current-account', accountType)

      // 等待一下确保切换完成
      await new Promise(resolve => setTimeout(resolve, 100))
    } finally {
      isSwitching.value = false
    }
  }

  // 初始化账号（从本地存储恢复）
  function initAccount() {
    const saved = localStorage.getItem('current-account') as AccountType
    if (saved && ACCOUNT_CONFIGS[saved]) {
      currentAccount.value = saved
    }
  }

  // 获取当前账号的API配置
  function getCurrentApiConfig() {
    if (currentAccount.value === 'qianlong') {
      // 牵龙账号使用动态配置
      const qianlongApiConfigStore = useQianlongApiConfigStore()
      return {
        cookie: qianlongApiConfigStore.config.cookie || ACCOUNT_API_DEFAULTS.qianlong.cookie,
        distributorId:
          qianlongApiConfigStore.config.distributorId ||
          ACCOUNT_API_DEFAULTS.qianlong.distributorId,
      }
    } else if (currentAccount.value === 'daren') {
      const apiConfigStore = useApiConfigStore()
      const config = apiConfigStore.getConfigByAccount('daren')
      return {
        cookie: config.cookie,
        distributorId: config.distributorId || MAIN_QIANLONG_DISTRIBUTOR_ID,
      }
    } else if (currentAccount.value === 'daily') {
      const apiConfigStore = useApiConfigStore()
      const config = apiConfigStore.getConfigByAccount('daily')
      return {
        cookie: config.cookie,
        distributorId: config.distributorId || ACCOUNT_API_DEFAULTS.daily.distributorId,
      }
    } else {
      // 散柔账号使用动态配置，不是静态配置
      const apiConfigStore = useApiConfigStore()
      const config = apiConfigStore.getConfigByAccount('sanrou')
      return {
        cookie: config.cookie,
      }
    }
  }

  return {
    // 状态
    currentAccount,
    isSwitching,

    // 计算属性
    currentAccountConfig,
    isQianlongAccount,
    isDarenAccount,
    isSanrouAccount,
    isDailyAccount,
    isSanrouLikeAccount,

    // 方法
    switchAccount,
    initAccount,
    getCurrentApiConfig,
  }
})
