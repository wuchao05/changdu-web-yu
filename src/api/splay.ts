import { ENV } from '@/config/env'
import type {
  SplayAlbumItem,
  SplayAlbumSearchResponse,
  SplayCreateProductParams,
  SplayCreateProductResponse,
  SplayMiniProgramResponse,
} from './types'

const BASE_URL = `${ENV.BASE_URL}/xt/splay`

function buildHeaders(token: string, extra: HeadersInit = {}) {
  if (!token) {
    throw new Error('请在设置中配置 XT token')
  }

  return {
    ...extra,
    'X-Xt-Token': token,
  }
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, options)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || '番茄后台请求失败')
  }
  return (await response.json()) as T
}

export function searchSplayAlbums(title: string, token: string) {
  const encodedTitle = encodeURIComponent(title)
  const queryString = `team_id=500039&title=${encodedTitle}&page=1&page_size=100&dy_audit_status=-1&from=1&category_id=-1`
  return request<SplayAlbumSearchResponse>(`/album/search?${queryString}`, {
    method: 'GET',
    headers: buildHeaders(token),
  })
}

export function getSplayMiniProgramUrl(albumId: number, token: string) {
  const params = new URLSearchParams({ album_id: String(albumId) })
  return request<SplayMiniProgramResponse>(`/product/mini-url?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(token),
  })
}

export function createSplayProduct(payload: SplayCreateProductParams, token: string) {
  return request<SplayCreateProductResponse>('/product/create', {
    method: 'POST',
    headers: buildHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })
}

/**
 * 添加番茄剧集（用于 is_delete === 1 的剧集）
 * @param bookId 版权内容ID (copyright_content_id)
 * @param token XT token
 */
export async function addTomatoAlbum(bookId: string, token: string): Promise<void> {
  try {
    await fetch(`${ENV.BASE_URL}/xt/config/tomatoAlbum`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Xt-Token': token,
      },
      body: JSON.stringify({
        book_id: bookId,
        category_id: 1,
      }),
    })
    console.log('成功添加番茄剧集:', bookId)
  } catch (error) {
    console.error('添加番茄剧集失败:', error)
  }
}

/**
 * 从剧集列表中查找匹配的剧集
 * 优先查找 promotion_status === 1 且 publish_status === 1 的剧集
 * 其次查找 promotion_status === 1 的剧集
 * 如果匹配到的剧集 is_delete === 1，会自动调用添加番茄剧集接口
 *
 * @param albums 剧集列表
 * @param dramaName 剧名
 * @param token XT token
 * @returns 匹配的剧集或 null
 */
export async function findMatchingAlbum(
  albums: SplayAlbumItem[],
  dramaName: string,
  token: string
): Promise<SplayAlbumItem | null> {
  // 先找 promotion_status === 1 且 publish_status === 1 的
  const exactlyMatched = albums.find(
    album => album.title === dramaName && album.promotion_status === 1 && album.publish_status === 1
  )
  console.log('exactlyMatched', exactlyMatched)

  // 如果找到了并且有 is_delete 字段且等于 1，则要单独处理
  if (exactlyMatched && exactlyMatched.is_delete === 1) {
    // 只有在 is_delete === 1 时才调用添加番茄剧集接口
    if (exactlyMatched.copyright_content_id) {
      await addTomatoAlbum(exactlyMatched.copyright_content_id, token)
    }
    return exactlyMatched
  }
  if (exactlyMatched) return exactlyMatched

  // 其次找 promotion_status === 1 的
  const matched = albums.find(album => album.title === dramaName && album.promotion_status === 1)
  if (matched && matched.is_delete === 1) {
    // 只有在 is_delete === 1 时才调用添加番茄剧集接口
    if (matched.copyright_content_id) {
      await addTomatoAlbum(matched.copyright_content_id, token)
    }
    return matched
  }
  if (matched) return matched

  return null
}
