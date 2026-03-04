import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AccountType, AccountConfig } from '@/api/types'
import { ACCOUNT_CONFIGS, DEFAULT_ACCOUNT } from '@/config/accounts'
import { ACCOUNT_API_DEFAULTS } from '@/config/accountApiDefaults'
import { useApiConfigStore } from './apiConfig'

export const useAccountStore = defineStore('account', () => {
  // 当前活跃账号
  const currentAccount = ref<AccountType>(DEFAULT_ACCOUNT)

  // 是否正在切换账号
  const isSwitching = ref(false)

  // 计算属性
  const currentAccountConfig = computed((): AccountConfig => {
    return ACCOUNT_CONFIGS[currentAccount.value]
  })

  const isDailyAccount = computed((): boolean => {
    return currentAccount.value === 'daily'
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
    const apiConfigStore = useApiConfigStore()
    const config = apiConfigStore.getConfigByAccount('daily')
    return {
      cookie: config.cookie,
      distributorId: config.distributorId || ACCOUNT_API_DEFAULTS.daily.distributorId,
    }
  }

  return {
    // 状态
    currentAccount,
    isSwitching,

    // 计算属性
    currentAccountConfig,
    isDailyAccount,

    // 方法
    switchAccount,
    initAccount,
    getCurrentApiConfig,
  }
})
