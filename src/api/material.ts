import { ENV } from '@/config/env'
import { useApiConfigStore } from '@/stores/apiConfig'

/**
 * 素材添加项接口
 */
export interface MaterialAddItem {
  /**
   * @description 素材名称
   */
  name: string
  /**
   * @description 内容名称
   */
  content_name: string
  /**
   * @description 剪辑师
   */
  editor: string
  /**
   * @description 素材大小 单位 MB 取整
   */
  size: number
  /**
   * @description 备注
   */
  remark: string
  /**
   * @description 素材地址 上传接口返回
   */
  url: string
  /**
   * @description 素材类型0：视频 1：图片
   */
  type: number
  /**
   * @description 时长 单位秒
   */
  duration: number
  /**
   * @description 宽
   */
  width: number
  /**
   * @description 高
   */
  height: number
  /**
   * @description 是否改变 md5
   */
  is_change_md5?: number // 0: 未改 1: 已改
  /**
   * @description 来源
   */
  from?: number // 0: 剪辑上传 1: 懂小剧
  /**
   * @description md5
   */
  md5?: string
}

/**
 * 素材添加请求接口
 */
export interface MaterialAddReq {
  /**
   * @description 内容类型 内容类型0：短剧 1小说
   */
  content_type: number | null
  /**
   * @description 文件夹
   */
  category_id: number | undefined
  list: MaterialAddItem[]
}

/**
 * 基础响应接口
 */
export interface BaseResp<T> {
  code: number
  message: string
  data: T
}

/**
 * 素材服务类
 */
export class MaterialService {
  /**
   * 新增素材
   */
  static async Add(req: MaterialAddReq): Promise<BaseResp<null>> {
    const apiConfigStore = useApiConfigStore()
    const token = apiConfigStore.config.xtToken
    if (!token) {
      throw new Error('请先在设置中配置 XT token')
    }

    const response = await fetch(`${ENV.BASE_URL}/material/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Xt-Token': token,
      },
      body: JSON.stringify(req),
    })

    if (!response.ok) {
      throw new Error(`提交素材失败: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }
}
