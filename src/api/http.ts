import axios, { type AxiosInstance } from 'axios'
import { createDiscreteApi } from 'naive-ui'
import { ENV } from '@/config/env'
import { useApiConfigStore } from '@/stores/apiConfig'

export interface ExtendedError extends Error {
  handledByInterceptor?: boolean
}

const { message } = createDiscreteApi(['message'])

/**
 * 兼容历史调用：模板版固定使用每日请求头，这里保留空实现避免旧模块报错
 */
export function setCurrentDistributorId(_distributorId: string): void {}

const httpInstance: AxiosInstance = axios.create({
  baseURL: ENV.BASE_URL,
  timeout: 30 * 60 * 1000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

function createError(messageText: string, name: string, originalError?: Error): ExtendedError {
  const error = new Error(messageText) as ExtendedError
  error.name = name
  error.handledByInterceptor = true
  if (originalError?.stack) {
    error.stack = originalError.stack
  }
  return error
}

function getCookie(): string {
  const apiConfigStore = useApiConfigStore()
  return apiConfigStore.getConfigByAccount('daily').cookie || apiConfigStore.config.cookie || ''
}

function isDownloadApi(url?: string): boolean {
  if (!url) return false
  return url.includes('/download_center/task_list') || url.includes('/download_center/get_url')
}

function getRequestHeaders(url?: string) {
  const apiConfigStore = useApiConfigStore()
  const dailyConfig = apiConfigStore.getConfigByAccount('daily')

  const missingBase: string[] = []
  if (!dailyConfig.appId) missingBase.push('headers.appid')
  if (!dailyConfig.appType) missingBase.push('headers.apptype')
  if (!dailyConfig.distributorId) missingBase.push('headers.distributorId')
  if (!dailyConfig.adUserId) missingBase.push('headers.adUserId')
  if (missingBase.length > 0) {
    throw createError(`请求头配置缺失: ${missingBase.join(', ')}`, 'ConfigError')
  }

  const dailyHeaders = {
    Appid: dailyConfig.appId,
    Apptype: dailyConfig.appType,
    Distributorid: dailyConfig.distributorId,
    Aduserid: dailyConfig.adUserId,
  }

  if (!isDownloadApi(url)) {
    return dailyHeaders
  }

  if (!dailyConfig.rootAdUserId) {
    throw createError('下载接口请求头配置缺失: headers.rootAdUserId', 'ConfigError')
  }

  return {
    ...dailyHeaders,
    Rootaduserid: dailyConfig.rootAdUserId,
  }
}

httpInstance.interceptors.request.use(
  config => {
    Object.assign(config.headers, getRequestHeaders(config.url))

    const cookie = getCookie()
    if (cookie) {
      if (config.method === 'get') {
        config.params = {
          ...(config.params || {}),
          cookie,
        }
      } else if (typeof config.data === 'object' && config.data !== null) {
        config.data = {
          ...config.data,
          cookie,
        }
      } else {
        config.data = { cookie }
      }
    }

    return config
  },
  error => {
    const errorMessage = error?.message || '请求头配置错误'
    message.error(errorMessage)
    return Promise.reject(error)
  }
)

httpInstance.interceptors.response.use(
  response => {
    const { data } = response
    if (data?.code !== undefined && data.code !== 0) {
      if (data.code === 4001) {
        message.error('Cookie 认证失效，请在设置中更新 Cookie')
        return Promise.reject(createError('Cookie 认证信息无效', 'AuthenticationError'))
      }
      return Promise.reject(createError(data.message || '请求失败', 'BusinessError'))
    }
    return response
  },
  error => {
    let errorMessage: string
    let errorName: string

    if (error.response) {
      errorMessage = error.response.data?.message || `请求失败 (${error.response.status})`
      errorName = 'NetworkError'
    } else if (error.request) {
      errorMessage = '网络连接失败，请检查网络设置'
      errorName = 'ConnectionError'
    } else {
      errorMessage = error.message || '未知错误'
      errorName = 'UnknownError'
    }

    message.error(errorMessage)
    return Promise.reject(createError(errorMessage, errorName, error))
  }
)

export default httpInstance
