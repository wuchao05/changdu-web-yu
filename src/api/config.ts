import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export interface DouyinMaterialMatch {
  id: string
  douyinAccount: string
  douyinAccountId: string
  materialRange: string
  createdAt: string
  updatedAt: string
}

export interface AppConfig {
  changduCookie: string
  juliangCookie: string
  headers: {
    appid: string
    apptype: string
    distributorId: string
    adUserId: string
    rootAdUserId: string
  }
  buildConfig: {
    secretKey: string
    productId: string
    productPlatformId: string
    landingUrl: string
    microAppName: string
    microAppId: string
    ccId: string
    operator: string
    rechargeTemplateId: string
  }
  feishu: {
    app_token: string
    table_ids: {
      drama_list: string
      drama_status: string
      account: string
    }
  }
  douyinMaterialMatches: DouyinMaterialMatch[]
}

export const configApi = {
  // 获取配置
  async getConfig(): Promise<{ code: number; data: AppConfig }> {
    const response = await axios.get(`${API_BASE_URL}/api/auth/config`)
    return response.data
  },

  // 更新配置
  async updateConfig(config: AppConfig): Promise<{ code: number; message: string }> {
    const response = await axios.put(`${API_BASE_URL}/api/auth/config`, config)
    return response.data
  },
}
