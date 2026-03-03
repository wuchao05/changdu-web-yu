import type { AccountConfig, AccountType } from '@/api/types'

// 账号配置
export const ACCOUNT_CONFIGS: Record<AccountType, AccountConfig> = {
  daily: {
    id: 'daily',
    name: '每日',
    description: '每日账号',
    apiConfig: {
      cookie: '',
      appid: '40011566',
      apptype: '7',
      distributorId: '1844565955364887',
    },
  },
}

// 默认账号
export const DEFAULT_ACCOUNT: AccountType = 'daily'

// 获取账号配置
export function getAccountConfig(accountType: AccountType): AccountConfig {
  return ACCOUNT_CONFIGS[accountType]
}

// 获取所有账号选项
export function getAccountOptions() {
  return Object.values(ACCOUNT_CONFIGS).map(config => ({
    label: config.name,
    value: config.id,
    description: config.description,
  }))
}
