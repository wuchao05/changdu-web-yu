import type { AccountConfig, AccountType } from '@/api/types'

// 账号配置
export const ACCOUNT_CONFIGS: Record<AccountType, AccountConfig> = {
  sanrou: {
    id: 'sanrou',
    name: '散柔',
    description: '默认散柔账号，展示多达人数据',
    apiConfig: {
      cookie: '', // 使用默认的Cookie配置
      appid: '40012555',
      apptype: '7',
      distributorId: '1842865091654731', // 散柔的distributorId
    },
  },
  daily: {
    id: 'daily',
    name: '每日',
    description: '每日账号，使用固定常读配置',
    apiConfig: {
      cookie: '', // 使用默认的Cookie配置
      appid: '40011566',
      apptype: '7',
      distributorId: '1844565955364887',
    },
  },
  daren: {
    id: 'daren',
    name: '达人',
    description: '达人账号，沿用散柔视图与功能',
    apiConfig: {
      cookie: '', // 使用默认的Cookie配置
      appid: '40011555',
      apptype: '7',
      distributorId: '1841149910426777', // 固定达人，不需要选择
    },
  },
  qianlong: {
    id: 'qianlong',
    name: '牵龙',
    description: '牵龙账号，展示聚合达人收入数据',
    apiConfig: {
      cookie: '', // 使用默认的Cookie配置
      appid: '40011555',
      apptype: '7',
      distributorId: '1841142223098969',
    },
  },
}

// 默认账号
export const DEFAULT_ACCOUNT: AccountType = 'sanrou'

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
