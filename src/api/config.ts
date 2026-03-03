import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export interface AppConfig {
  changduCookie: string
  juliangCookie: string
  feishu: {
    app_token: string
    table_ids: {
      drama_list: string
      drama_status: string
      account: string
    }
  }
}

export const configApi = {
  // 获取配置
  async getConfig(): Promise<{ code: number; data: AppConfig }> {
    const response = await axios.get(`${API_BASE_URL}/api/config`)
    return response.data
  },

  // 更新配置
  async updateConfig(config: AppConfig): Promise<{ code: number; message: string }> {
    const response = await axios.put(`${API_BASE_URL}/api/config`, config)
    return response.data
  },
}
