/**
 * 商品库 API 服务
 */
import { ENV } from '@/config/env'
import { getProductLibraryConfigBySubject } from '@/config/productLibrary'
import { useApiConfigStore } from '@/stores/apiConfig'

// 全局固定的 teamId
const DEFAULT_TEAM_ID = '500039'

/**
 * 商品库查询参数
 */
export interface ProductQueryParams {
  team_id: number
  ad_account_id: number
  product_platform_id: number
  page: number
  page_size: number
  product_name: string
}

/**
 * 商品项
 */
export interface ProductItem {
  product_id: string
  product_name: string
  [key: string]: any
}

/**
 * 商品查询响应
 */
export interface ProductQueryResponse {
  code?: number
  message?: string
  data?: {
    list?: ProductItem[]
    total?: number
  }
  [key: string]: any
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20

/**
 * 查询商品库
 * @param productName 商品名称（剧名）
 * @param token XT Token
 * @param signal 可选的 AbortSignal，用于取消请求
 * @param subject 主体名称（可选，如 "超琦"、"欣雅"），默认使用超琦配置
 * @returns 商品查询结果
 */
export async function queryProduct(
  productName: string,
  token: string,
  signal?: AbortSignal,
  subject?: string
): Promise<ProductQueryResponse> {
  const apiConfigStore = useApiConfigStore()
  const productConfig = getProductLibraryConfigBySubject(apiConfigStore.effectiveUserId, subject)
  const params = new URLSearchParams({
    team_id: DEFAULT_TEAM_ID,
    ad_account_id: productConfig.adAccountId,
    product_platform_id: productConfig.productPlatformId,
    page: String(DEFAULT_PAGE),
    page_size: String(DEFAULT_PAGE_SIZE),
    product_name: productName,
  })

  const url = `https://splay-admin.lnkaishi.cn/product/list?${params.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'User-Agent': 'PostmanRuntime-ApipostRuntime/1.1.0',
      token: token,
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result: ProductQueryResponse = await response.json()

  return result
}

/**
 * 检查商品是否存在（完全匹配剧名）
 * @param productName 商品名称（剧名）
 * @param token XT Token
 * @param signal 可选的 AbortSignal，用于取消请求
 * @param subject 主体名称（可选，如 "超琦"、"欣雅"），默认使用超琦配置
 * @returns 是否存在完全匹配的商品
 */
export async function checkProductExists(
  productName: string,
  token: string,
  signal?: AbortSignal,
  subject?: string
): Promise<boolean> {
  try {
    const result = await queryProduct(productName, token, signal, subject)

    // 检查是否有完全匹配的商品
    if (result.data?.list && Array.isArray(result.data.list)) {
      return result.data.list.some(item => item.name === productName)
    }

    return false
  } catch (error) {
    // 如果是取消请求，不记录错误
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.error(`查询商品失败: ${productName}`, error)
    return false
  }
}
