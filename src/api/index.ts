import httpInstance from './http'
import { formatDateToString } from '../utils/format'
import { feishuApi } from './feishu'
import type {
  OverviewData,
  ReportData,
  OrderData,
  OverviewParams,
  ReportParams,
  OrderParams,
  DramaRankingData,
  DramaRankingParams,
  DistributorData,
  NewDramaData,
  NewDramaParams,
  DownloadTaskResponse,
  DownloadTaskParams,
  DownloadUrlResponse,
  NewUserData,
  DramaDetailResponse,
  DramaDetailParams,
  DataOverviewV1Response,
  DataOverviewV1Params,
  MonthlyRechargeAnalyzeResponse,
  MonthlyRechargeAnalyzeParams,
} from './types'

/**
 * 接口B - 获取数据报表
 */
export function getReport(params: ReportParams): Promise<ReportData> {
  return httpInstance
    .get('/novelsale/distributor/application_overview_list/v1', {
      params: {
        is_optimizer_view: false,
        date_type: 1,
        ...params,
      },
    })
    .then(res => res.data)
}

/**
 * 获取新用户数据 - 用于概览卡片
 */
export function getNewUserData(): Promise<NewUserData> {
  // 获取今天的日期（北京时间）
  const today = new Date()
  const todayStr = formatDateToString(today) // YYYYMMDD格式

  return httpInstance
    .get('/novelsale/distributor/application_overview_list/v1', {
      params: {
        begin: todayStr,
        end: todayStr,
        is_optimizer_view: false,
        date_type: 1,
        page_index: 0,
        page_size: 1,
      },
    })
    .then(res => res.data)
}

/**
 * 接口C - 获取订单统计
 */
export function getOrders(params: OrderParams): Promise<OrderData> {
  const finalParams = {
    promotion_type: 0,
    media_source: 0,
    display_type: 1,
    ...params,
  }
  console.log('📡 [API] getOrders 最终参数:', finalParams)
  console.log('📡 [API] 包含 daren_douyin_accounts:', 'daren_douyin_accounts' in finalParams)

  return httpInstance
    .get('/novelsale/distributor/promotion/detail/v2', {
      params: finalParams,
    })
    .then(res => res.data)
}

/**
 * 接口D - 获取短剧排行榜 (已禁用 - 减少Vercel函数数量)
 */
// export function getDramaRanking(params: DramaRankingParams): Promise<DramaRankingData> {
//   return httpInstance
//     .get('/novelsale/distributor/book_recharge/list/v1', {
//       params: {
//         ...params,
//       },
//     })
//     .then(res => res.data)
// }

/**
 * 接口E - 获取达人列表
 * 注意：此接口需要设置 Distributorid 为 0 来获取管理员权限
 */
export function getDistributors(): Promise<DistributorData> {
  return httpInstance
    .get('/novelsale/distributor/login/v1/', {
      params: {},
      headers: {
        // 重要：设置 Distributorid 为 0 表示管理员身份，可以获取所有达人信息
        Distributorid: '0',
      },
    })
    .then(res => res.data)
}

/**
 * 新剧抢跑 - 获取新剧列表（使用常读开放平台 API）
 */
export function getNewDramaList(params: NewDramaParams = {}): Promise<NewDramaData> {
  return httpInstance
    .get('/novelsale/distributor/content/series/list/v1', {
      params: {
        permission_statuses: '3,4',
        page_index: 0,
        page_size: 100,
        ...params,
      },
    })
    .then(res => res.data)
}

/**
 * 新剧抢跑 - 搜索新剧列表（使用常读开放平台 API）
 * 注意：query 参数仅支持短剧 ID，不支持剧名搜索
 */
export function searchNewDramaList(params: NewDramaParams = {}): Promise<NewDramaData> {
  return httpInstance
    .get('/novelsale/distributor/content/series/list/v1', {
      params: {
        permission_statuses: '3,4',
        page_index: 0,
        page_size: 100,
        ...params,
      },
    })
    .then(res => res.data)
}

/**
 * 获取下载任务列表
 */
export function getDownloadTaskList(
  params: DownloadTaskParams = {}
): Promise<DownloadTaskResponse> {
  const requestParams = {
    page_size: 1000,
    ...params,
  }
  console.log('download_center/task_list 请求参数:', requestParams)
  return httpInstance
    .get('/node/api/platform/distributor/download_center/task_list', {
      params: requestParams,
    })
    .then(res => res.data)
}

/**
 * 获取下载链接 - 返回下载URL
 */
export function getDownloadUrl(imagexUri: string): Promise<DownloadUrlResponse> {
  return httpInstance
    .get('/node/api/platform/distributor/download_center/get_url/', {
      params: {
        imagex_uri: imagexUri,
      },
    })
    .then(res => res.data)
}

/**
 * 获取剧集详情 - 用于查看剧集简介
 */
export function getDramaDetail(params: DramaDetailParams): Promise<DramaDetailResponse> {
  return httpInstance
    .get('/novelsale/distributor/content/series/detail/v1', {
      params,
    })
    .then(res => res.data)
}

/**
 * 新API - 获取数据概览v1（今日数据和累计数据）
 */
export function getDataOverviewV1(params: DataOverviewV1Params): Promise<DataOverviewV1Response> {
  return httpInstance
    .get('/novelsale/distributor/dashboard/data_overview/v1', {
      params: {
        is_today: params.is_today,
        app_type: params.app_type,
      },
    })
    .then(res => res.data)
}

/**
 * 本月充值分析接口 - 获取本月充值数据
 */
export function getMonthlyRechargeAnalyze(
  params: MonthlyRechargeAnalyzeParams
): Promise<MonthlyRechargeAnalyzeResponse> {
  return httpInstance
    .get('/novelsale/distributor/dashboard/recharge_analyze/v1', {
      params: {
        begin: params.begin,
        end: params.end,
        analyze_type: params.analyze_type,
        app_type: params.app_type,
      },
    })
    .then(res => res.data)
}

/**
 * 通过短剧名称查询 copyright_content_id（用于名称转 ID）
 * 调用形天后台接口，使用固定的 token
 */
export interface SearchByTitleItem {
  id: number
  title: string
  copyright_content_id: string
  cover: string
  episode_num: number
  is_delete: number
}

export interface SearchByTitleResponse {
  code: number
  message: string
  data: {
    total_count: number
    list: SearchByTitleItem[]
  }
}

export function searchDramaByTitle(title: string): Promise<SearchByTitleResponse> {
  return httpInstance
    .get('/xt/splay/album/search-by-title', {
      params: { title },
    })
    .then(res => res.data)
}

/**
 * 导出飞书 API 服务
 */
export { feishuApi }
