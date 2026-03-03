import { ENV } from '@/config/env'
import { useApiConfigStore } from '@/stores/apiConfig'

/**
 * XT API 服务类
 * 处理与XT相关的API调用
 */
export class XtApiService {
  private getUserId() {
    return undefined
  }

  /**
   * 通过文件路径上传文件（直接在后端读取文件上传）
   * @param filePath 文件路径
   * @returns 上传结果
   */
  async uploadFileByPath(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // 监听请求完成
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText)
            resolve(result)
          } catch (error) {
            reject(new Error('解析响应失败'))
          }
        } else {
          reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`))
        }
      })

      // 监听请求错误
      xhr.addEventListener('error', () => {
        reject(new Error('网络错误'))
      })

      // 监听请求超时
      xhr.addEventListener('timeout', () => {
        reject(new Error('上传超时'))
      })

      // 设置超时时间（30分钟）
      xhr.timeout = 30 * 60 * 1000

      // 发送请求
      xhr.open('POST', `${ENV.BASE_URL}/xt/upload`)
      xhr.setRequestHeader('Content-Type', 'application/json')
      const userId = this.getUserId()
      if (userId) {
        xhr.setRequestHeader('x-user-id', userId)
      }

      xhr.send(JSON.stringify({ filePath }))
    })
  }

  /**
   * 获取视频素材列表
   * @param date 日期（可选）
   * @returns 视频素材列表
   */
  async getVideoMaterials(date?: string): Promise<any> {
    let url = `${ENV.BASE_URL}/xt/video-materials`
    if (date) {
      url += `?date=${encodeURIComponent(date)}`
    }

    const userId = this.getUserId()
    const response = await fetch(url, {
      headers: userId ? { 'x-user-id': userId } : undefined,
    })

    if (!response.ok) {
      throw new Error(`获取视频素材失败: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }
}

// 导出单例实例
export const xtApi = new XtApiService()
export default xtApi
