import axios from 'axios'

const PREVIEW_API_BASE = 'https://ad-runner.cxyy.top/preview-manager'

export interface StartPreviewParams {
  user: string
  intervalMinutes: number
  buildTimeWindowStart: number
  buildTimeWindowEnd: number
  subject: string
  aweme_white_list: string[]
}

export interface StartPreviewResponse {
  message: string
  user: string
  intervalMinutes: number
  nextRun: string
}

export interface StopPreviewParams {
  user: string
}

export interface StopPreviewResponse {
  message: string
  user: string
  runCount: number
}

/**
 * 启动素材预览程序
 */
export function startPreview(params: StartPreviewParams): Promise<StartPreviewResponse> {
  return axios
    .post<StartPreviewResponse>(`${PREVIEW_API_BASE}/start`, params, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(res => res.data)
}

/**
 * 停止素材预览程序
 */
export function stopPreview(params: StopPreviewParams): Promise<StopPreviewResponse> {
  return axios
    .post<StopPreviewResponse>(`${PREVIEW_API_BASE}/stop`, params, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(res => res.data)
}

/**
 * 更新素材预览配置
 */
export function updatePreview(params: StartPreviewParams): Promise<StartPreviewResponse> {
  return axios
    .post<StartPreviewResponse>(`${PREVIEW_API_BASE}/update`, params, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(res => res.data)
}

export interface PreviewProgram {
  user: string
  enabled: boolean
  intervalMinutes: number
  buildTimeWindowStart: number
  buildTimeWindowEnd: number
  aweme_white_list: string[]
  [key: string]: any
}

export interface PreviewStatusResponse {
  total: number
  programs: PreviewProgram[]
}

/**
 * 查询素材预览状态
 */
export function getPreviewStatus(user: string): Promise<PreviewStatusResponse> {
  return axios
    .get<PreviewStatusResponse>(`${PREVIEW_API_BASE}/status`, {
      params: { user },
    })
    .then(res => res.data)
}
