<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    size="large"
    style="width: 800px"
    :bordered="false"
    :segmented="false"
    :mask-closable="false"
  >
    <template #header>
      <div class="modal-header">
        <div class="modal-header-title">视频素材上传</div>
        <n-button
          type="primary"
          ghost
          size="small"
          class="refresh-button"
          :loading="isManualRefreshing"
          :disabled="isTabLoading || isUploadProcessRunning"
          @click="handleManualRefresh"
        >
          刷新数据
        </n-button>
      </div>
    </template>
    <div class="upload-modal">
      <div v-if="showAutoUploadOverlay" class="auto-upload-overlay">
        <div class="overlay-card">
          <n-spin size="large" stroke="#34d399" />
          <div class="overlay-text">
            <p class="overlay-title">自动上传已开启</p>
            <p class="overlay-desc">
              {{ autoUploadNotice || '正在轮询导出素材，请稍候…' }}
            </p>
            <p class="overlay-meta">
              {{ autoRefreshInfo }}
            </p>
          </div>
          <div class="overlay-indicator">
            <span class="pulse"></span>
            <span>轮询中</span>
          </div>
        </div>
      </div>
      <template v-else>
        <!-- 日期标签页 -->
        <div class="date-tabs">
          <n-tabs v-model:value="activeTab" type="line" animated @update:value="handleTabChange">
            <n-tab-pane
              v-for="date in dateList"
              :key="date"
              :name="date"
              :tab="formatDate(date)"
              :disabled="isUploading"
            >
              <!-- 当前日期统计信息 -->
              <div class="current-date-stats">
                <!-- Loading状态 -->
                <div v-if="isTabLoading && activeTab === date" class="tab-loading">
                  <n-spin size="small" />
                  <span class="loading-text">正在加载视频素材...</span>
                </div>

                <!-- 正常内容 -->
                <div v-else>
                  <div class="stats-grid">
                    <div class="stat-item">
                      <div class="stat-label">已上传剧集</div>
                      <div class="stat-value">{{ uploadedDramaCount }}/{{ totalDramaCount }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">已上传视频</div>
                      <div class="stat-value">
                        {{ uploadedVideoCount }}/{{ totalVideoStatCount }}
                      </div>
                    </div>
                  </div>

                  <!-- 当前日期整体进度条 -->
                  <div
                    v-if="isUploading || totalVideoStatCount > 0"
                    class="overall-progress-container"
                  >
                    <div class="progress-card">
                      <div class="progress-header">
                        <div class="progress-title">
                          <n-icon size="16" color="#1890ff">
                            <svg viewBox="0 0 24 24">
                              <path
                                fill="currentColor"
                                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                              />
                            </svg>
                          </n-icon>
                          <span class="progress-label">上传进度</span>
                        </div>
                        <div class="progress-stats">
                          <span class="progress-count"
                            >{{ uploadedVideoCount }}/{{ totalVideoStatCount }}</span
                          >
                          <span class="progress-percentage">{{ overallProgressPercentage }}%</span>
                        </div>
                      </div>

                      <!-- 自定义进度条 -->
                      <div class="custom-progress-bar">
                        <div class="progress-track">
                          <div
                            class="progress-fill"
                            :style="{ width: overallProgressPercentage + '%' }"
                          >
                            <div class="progress-shine"></div>
                          </div>
                        </div>
                      </div>

                      <!-- 上传状态信息 -->
                      <div v-if="isUploadProcessRunning" class="upload-status-info">
                        <div class="status-indicator">
                          <div class="pulse-dot"></div>
                          <span class="status-text">
                            正在上传
                            <span v-if="!isConcurrentUploading"
                              >({{ formatElapsedTime(elapsedTime) }})</span
                            >
                            <span v-else
                              >({{ queueStatus.active }}/{{ queueStatus.maxConcurrent }} 并发) 队列:
                              {{ queueStatus.pending }}</span
                            >
                          </span>
                        </div>
                      </div>
                      <div
                        v-else-if="isAllUploadsCompleted && totalCount > 0"
                        class="upload-status-info completed"
                      >
                        <div class="status-indicator">
                          <div class="status-text">
                            上传完成！耗时 {{ formatElapsedTime(elapsedTime) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="autoUploadEnabledSetting && autoUploadNotice"
                    class="auto-upload-notice"
                  >
                    <span>{{ autoUploadNotice }}</span>
                  </div>
                </div>
              </div>
              <div class="drama-list">
                <div class="materials-section">
                  <div class="section-header">
                    <div v-if="currentDateGroupedMaterials.length > 0" class="selection-controls">
                      <n-checkbox
                        :checked="isAllSelected"
                        :indeterminate="isIndeterminate"
                        @update:checked="toggleAllSelection"
                      >
                        全选
                      </n-checkbox>
                      <span class="selection-count">
                        已选择
                        {{
                          currentDateAllVideos.filter(v => selectedVideos.has(v.fileName)).length
                        }}
                        /
                        {{ currentDateAllVideos.length }}
                        个视频
                      </span>
                    </div>
                    <div class="section-actions"></div>
                  </div>
                  <template v-if="currentDateGroupedMaterials.length > 0">
                    <n-collapse
                      v-for="group in currentDateGroupedMaterials"
                      :key="group.dramaName"
                      class="drama-group"
                    >
                      <n-collapse-item
                        :name="group.dramaName"
                        :expanded="group.expanded"
                        :class="{ selected: isDramaSelected(group.dramaName) }"
                        @update:expanded="(expanded: boolean) => (group.expanded = expanded)"
                      >
                        <template #header>
                          <div class="drama-header">
                            <div class="drama-header-left">
                              <n-checkbox
                                :checked="isDramaSelected(group.dramaName)"
                                :indeterminate="isDramaIndeterminate(group.dramaName)"
                                @update:checked="toggleDramaSelection(group.dramaName)"
                                @click.stop
                                class="drama-checkbox"
                              />
                              <div class="drama-info">
                                <div class="drama-title">{{ group.dramaName }}</div>
                                <div class="drama-meta">
                                  <span class="video-count">{{ group.videos.length }}个视频</span>
                                  <span class="drama-separator">•</span>
                                  <span class="drama-size">{{
                                    getDramaTotalSize(group.videos)
                                  }}</span>
                                  <span class="drama-separator">•</span>
                                  <span class="drama-progress"
                                    >已完成：{{ getDramaCompletedVideoCount(group) }}/{{
                                      group.videos.length
                                    }}</span
                                  >
                                </div>
                              </div>
                            </div>
                          </div>
                        </template>
                        <template #header-extra>
                          <div class="group-header-extra">
                            <n-tag :type="getDramaStatusType(group.status)" size="small">
                              {{ getDramaStatusText(group.status) }}
                            </n-tag>
                          </div>
                        </template>

                        <div class="videos-list">
                          <div
                            v-for="video in group.videos"
                            :key="video.fileName"
                            class="video-item"
                          >
                            <div class="video-checkbox">
                              <n-checkbox
                                :checked="isVideoSelected(video.fileName)"
                                @update:checked="toggleVideoSelection(video.fileName)"
                              />
                            </div>
                            <div class="video-info">
                              <div class="video-name">{{ video.fileName }}</div>
                              <div class="video-details">
                                <span class="video-size">{{ video.sizeFormatted }}</span>
                                <!-- 简化的上传进度条 - 放在中间位置 -->
                                <div
                                  v-if="video.status === '上传中' && video.progress !== undefined"
                                  class="simple-progress-container"
                                >
                                  <div class="simple-progress-bar">
                                    <div class="simple-progress-track">
                                      <div
                                        class="simple-progress-fill"
                                        :style="{ width: video.progress + '%' }"
                                      ></div>
                                    </div>
                                    <span class="simple-progress-text">{{ video.progress }}%</span>
                                  </div>
                                </div>
                                <div
                                  class="status-badge"
                                  :class="getVideoStatusClass(video.status)"
                                >
                                  <div class="status-dot"></div>
                                  <span class="status-text">{{ getStatusText(video.status) }}</span>
                                </div>
                                <div
                                  v-if="video.retryCount && video.retryCount > 0"
                                  class="retry-badge"
                                >
                                  <n-icon size="12" color="#faad14">
                                    <svg viewBox="0 0 24 24">
                                      <path
                                        fill="currentColor"
                                        d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                                      />
                                    </svg>
                                  </n-icon>
                                  <span>重试 {{ video.retryCount }} 次</span>
                                </div>
                              </div>
                              <!-- 错误信息显示 -->
                              <div
                                v-if="video.status === '失败' && video.lastError"
                                class="video-error-details"
                              >
                                <div class="error-message">
                                  <span class="fail-reason-label">失败原因：</span>
                                  <span class="fail-reason-text">
                                    {{ video.lastError.error
                                    }}<span v-if="video.lastError.message"
                                      >：{{ video.lastError.message }}</span
                                    >
                                  </span>
                                </div>
                                <div class="error-timestamp">
                                  时间: {{ formatErrorTimestamp(video.lastError.timestamp) }}
                                </div>
                              </div>
                            </div>
                            <!-- 重新上传按钮 -->
                            <div v-if="video.status === '失败'" class="video-actions">
                              <n-button
                                type="primary"
                                size="small"
                                @click="retryUpload(video)"
                                :loading="activeUploads.has(video.fileName)"
                              >
                                重新上传
                              </n-button>
                            </div>
                          </div>
                        </div>
                      </n-collapse-item>
                    </n-collapse>
                  </template>

                  <!-- 空状态 -->
                  <div v-else class="empty-state">
                    <n-empty description="该日期暂无视频素材" />
                  </div>
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="modal-footer">
        <n-space>
          <template v-if="isUploadProcessRunning">
            <n-button @click="handleCancelUpload" type="error"> 取消上传 </n-button>
          </template>
          <template v-else>
            <n-button @click="showModal = false"> 关闭 </n-button>
          </template>
          <template v-if="isUploadProcessRunning">
            <!-- nothing else -->
          </template>
          <n-button
            v-else-if="isAllUploadsCompleted && totalCount > 0"
            type="primary"
            @click="handleUploadComplete"
          >
            完成
          </n-button>
          <n-button
            v-else
            type="primary"
            @click="handleBatchUpload"
            :disabled="getCurrentDateSelectedVideoCount(activeTab) === 0"
          >
            批量上传 ({{ getCurrentDateSelectedVideoCount(activeTab) }})
          </n-button>
        </n-space>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import {
  NModal,
  NTabs,
  NTabPane,
  NTag,
  NButton,
  NSpace,
  NEmpty,
  useMessage,
  NCollapse,
  NCollapseItem,
  NSpin,
} from 'naive-ui'
import type { DramaStatusBoard } from '@/services/dramaStatusService'
// import { xtApi } from '@/api/xt' // 不再需要，使用TOS直传
import { feishuApi } from '@/api/feishu'
import { djdataApi } from '@/api/djdata'
import { MaterialService, type MaterialAddItem } from '@/api/material'
import { useTosUpload } from '@/composables/useTosUpload'
import { getVideoInfo } from '@/utils/videoHelper'
import { getFileFromPath, getFileWithMd5FromPath } from '@/utils/tosUpload'
import { useSettingsStore } from '@/stores/settings'
import { useApiConfigStore } from '@/stores/apiConfig'
import { useDramaSubjectStore } from '@/stores/dramaSubject'

interface Drama {
  id: string
  name: string
  date: string
  status: string
  recordId: string
  account?: string
}

interface UploadItem {
  id: string
  name: string
  date: string
  status: '等待中' | '上传中' | '已完成' | '失败'
  error?: string
}

// 视频素材状态枚举
type VideoStatus = '待上传' | '上传中' | '已完成' | '失败'

// 剧集状态枚举
type DramaStatus = '待上传' | '上传中' | '待搭建' | '已完成' | '失败'

interface VideoMaterial {
  fileName: string
  filePath: string
  status: VideoStatus
  dramaName: string
  date: string
  size: number
  sizeFormatted: string
  error?: string
  retryCount?: number // 重试次数
  progress?: number // 上传进度 (0-100)
  lastError?: {
    // 最后一次错误信息
    error: string
    message: string
    timestamp: string
  }
  materialUrl?: string // 上传后的文件URL
  materialWidth?: number // 视频宽度
  materialHeight?: number // 视频高度
  materialDuration?: number // 视频时长（秒）
  materialBitrate?: number // 视频码率
  materialCodec?: string // 视频编码格式
  materialFps?: number // 视频帧率
  materialContentName?: string // 内容名称（从文件名解析）
  materialEditorName?: string // 剪辑师（从文件名解析）
  materialRemark?: string // 备注
  isSubmitted?: boolean // 是否已提交到素材库
}

interface DramaGroup {
  dramaName: string
  videos: VideoMaterial[]
  uploading: boolean
  allUploaded: boolean
  expanded: boolean
  status: DramaStatus
}

type RawVideoMaterial = {
  fileName: string
  filePath: string
  dramaName: string
  date: string
  size: number
  sizeFormatted: string
  status?: string
  progress?: number
  materialWidth?: number
  materialHeight?: number
  materialDuration?: number
  materialBitrate?: number
  materialCodec?: string
  materialFps?: number
}

const mapRawMaterial = (item: RawVideoMaterial): VideoMaterial => ({
  fileName: item.fileName,
  filePath: item.filePath,
  status: (item.status as VideoStatus) || '待上传',
  dramaName: item.dramaName,
  date: item.date,
  size: item.size,
  sizeFormatted: item.sizeFormatted,
  materialWidth: item.materialWidth,
  materialHeight: item.materialHeight,
  materialDuration: item.materialDuration,
  materialBitrate: item.materialBitrate,
  materialCodec: item.materialCodec,
  materialFps: item.materialFps,
})

// Props
const props = defineProps<{
  show: boolean
  boardData: DramaStatusBoard | null
}>()

// Emits
const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

// Message实例
const message = useMessage()
const settingsStore = useSettingsStore()
const apiConfigStore = useApiConfigStore()
const dramaSubjectStore = useDramaSubjectStore()

// 响应式数据
const showModal = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})

const activeTab = ref<string>('')
const isUploading = ref(false)
const currentUpload = ref<UploadItem | null>(null)
const isTabLoading = ref(false) // 日期tab切换loading状态
// const uploadController = ref<AbortController | null>(null) // 不再需要，使用TOS上传

// 视频素材相关数据
const videoMaterials = ref<VideoMaterial[]>([])
const groupedMaterials = ref<DramaGroup[]>([])
const currentDateGroupedMaterials = ref<DramaGroup[]>([]) // 当前日期的分组素材
const materialsCache = ref<Record<string, VideoMaterial[]>>({})
const loadedTabs = ref<Set<string>>(new Set())
const uploadStartTime = ref<Date | null>(null)
const elapsedTime = ref(0)
const timeInterval = ref<number | null>(null)
const isManualRefreshing = ref(false)

// 并发上传相关数据 - 固定并发数为5
const DEFAULT_MAX_CONCURRENT_UPLOADS = 5
const activeUploads = ref<Set<string>>(new Set())
const uploadQueue = ref<VideoMaterial[]>([])
const isConcurrentUploading = ref(false)

// 提交状态跟踪
const submittingDramas = ref<Set<string>>(new Set()) // 正在提交的剧集

const dailyUploadHandler = async ({
  filePath,
  signal,
}: {
  filePath: string
  fileName: string
  signal?: AbortSignal
}) => {
  if (!dramaSubjectStore.isDailySubject) {
    throw new Error('当前主体不支持每日上传流程')
  }

  const { advertiserId } = await resolveDailyUploadMeta(filePath)
  const { file, md5 } = await getFileWithMd5FromPath(filePath, signal)
  if (!md5) {
    throw new Error('未获取到文件MD5')
  }

  const uploadUrlResult = await djdataApi.getOssUploadUrl({
    name: file.name,
    md5,
    advertiserId,
    signal,
  })

  const uploadUrl = uploadUrlResult.data?.url
  const uploadToken = uploadUrlResult.data?.upload_token
  const outAdvertiserId = uploadUrlResult.data?.advertiser_id
  if (!uploadUrl || !uploadToken || !outAdvertiserId) {
    throw new Error('上传地址返回数据不完整')
  }

  await djdataApi.uploadVideoFile({
    url: uploadUrl,
    file,
    md5,
    uploadToken,
    advertiserId: outAdvertiserId,
    signal,
  })
}

const dailyUploadHandlerRef = computed(() =>
  dramaSubjectStore.isDailySubject ? dailyUploadHandler : null
)

// 使用TOS上传Hook
const {
  uploadQueue: tosUploadQueue,
  uploadingCount: tosUploadingCount,
  addToQueue: addToTosQueue,
  reupload: tosReupload,
  cancelUpload: tosCancelUpload,
  cancelAllUploads: tosCancelAllUploads,
  // deleteFile: tosDeleteFile, // 暂时不使用
  isAllDone: tosIsAllDone,
  getUploadDuration: tosGetUploadDuration,
  initTosClient,
  updateMaxConcurrent: tosUpdateMaxConcurrent,
  maxConcurrentUploads: tosMaxConcurrentUploads,
} = useTosUpload({
  maxConcurrentUploads: dramaSubjectStore.isDailySubject ? 1 : DEFAULT_MAX_CONCURRENT_UPLOADS,
  customUploadHandlerRef: dailyUploadHandlerRef,
  onStart: (fileName: string) => {
    // 视频开始上传时立即更新状态
    const video = videoMaterials.value.find(v => v.fileName === fileName)
    if (video) {
      video.status = '上传中'
      video.progress = 0 // 初始化进度为0
      console.log(`视频 ${fileName} 开始上传，状态更新为上传中`)

      // 更新对应剧集状态为"上传中"并同步到飞书
      const dramaGroup = currentDateGroupedMaterials.value.find(
        group => group.dramaName === video.dramaName
      )
      if (dramaGroup && dramaGroup.status !== '上传中') {
        console.log(`剧集 ${video.dramaName} 开始上传，状态更新为上传中`)
        dramaGroup.status = '上传中'
        updateDramaStatusToFeishu(video.dramaName, '上传中')
      }
    }
  },
  onSuccess: (fileName: string, url?: string) => {
    // 更新视频状态为已完成
    const video = videoMaterials.value.find(v => v.fileName === fileName)
    if (video) {
      video.status = '已完成'
      video.progress = 100 // 设置进度为100%
      video.error = undefined
      video.lastError = undefined
      video.retryCount = 0

      // 保存上传后的URL
      if (url) {
        video.materialUrl = url
      }

      if (dramaSubjectStore.isDailySubject) {
        video.isSubmitted = true
      }

      // 解析文件名获取内容名称和剪辑师
      const { contentName, editorName } = parseFileName(video.fileName)
      video.materialContentName = contentName
      video.materialEditorName = editorName

      // 更新剧集状态
      updateDramaStatus(video.dramaName)

      // 检查当前剧集是否所有视频都已完成上传
      const dramaGroup = currentDateGroupedMaterials.value.find(
        group => group.dramaName === video.dramaName
      )

      if (dramaGroup && isDramaAllVideosCompleted(dramaGroup)) {
        if (!dramaSubjectStore.isDailySubject) {
          console.log(`剧集 ${video.dramaName} 所有视频上传完成，开始提交到素材库`)
          // 自动提交该剧集的所有视频到素材库
          submitVideoMaterials(dramaGroup.videos, video.dramaName)
        }
      } else if (dramaGroup && !dramaSubjectStore.isDailySubject) {
        submitPartialIfReady(video.dramaName)
      }
    }

    // 检查是否所有文件都已上传完成
    if (tosIsAllDone(videoMaterials.value)) {
      finishUploadTips()
    }
  },
  onError: (fileName: string, error: Error) => {
    console.error('TOS上传失败:', fileName, error)
    handleTosRetry(fileName, error)
  },
  onProgress: (fileName: string, percent: number) => {
    // 更新视频进度
    const video = videoMaterials.value.find(v => v.fileName === fileName)
    if (video) {
      video.status = '上传中'
      video.progress = percent
      console.log(`视频 ${fileName} 上传进度: ${percent}%`)
    }
  },
})

watch(
  () => dramaSubjectStore.isDailySubject,
  isDaily => {
    tosUpdateMaxConcurrent(isDaily ? 1 : DEFAULT_MAX_CONCURRENT_UPLOADS)
  },
  { immediate: true }
)

// 选中状态管理
const selectedVideos = ref<Set<string>>(new Set()) // 存储选中的视频fileName
const selectedDramas = ref<Set<string>>(new Set()) // 存储选中的剧集名称

// 待上传剧集数据（已移除，直接通过API获取）

// 日期统计信息
const dateStats = ref<
  Record<
    string,
    {
      pendingDramaCount: number
      selectedVideoCount: number
    }
  >
>({})

// 缓存已获取的剧集数据，避免重复API调用
const dramaCache = ref<Record<string, Drama[]>>({})
const advertiserCache = ref<Record<string, number | null>>({})

const getTextFromFieldArray = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''
  const first = value[0]
  if (first && typeof first === 'object' && 'text' in first) {
    return (first as { text?: string }).text || ''
  }
  return ''
}

// 获取指定日期的待上传/上传中剧集
const getPendingUploadDramasByDate = async (
  date: string,
  forceRefresh = false
): Promise<Drama[]> => {
  if (forceRefresh) {
    delete dramaCache.value[date]
  }

  if (dramaCache.value[date]) {
    return dramaCache.value[date]
  }

  try {
    const fieldNames = dramaSubjectStore.isDailySubject
      ? ['剧名', '日期', '当前状态', '账户']
      : undefined
    const response = await feishuApi.filterDramaStatusByDateAndStatus(date, '待上传', fieldNames)

    const dramas: Drama[] = response.data.items.map(
      (record: { fields: Record<string, unknown>; record_id: string }) => {
        const dramaName = getTextFromFieldArray(record.fields['剧名'])
        const account = getTextFromFieldArray(record.fields['账户'])
        return {
          id: `${dramaName}-${date}`,
          name: dramaName,
          date,
          status: '待上传',
          recordId: record.record_id,
          account: account || undefined,
        }
      }
    )

    // 缓存结果
    dramaCache.value[date] = dramas
    return dramas
  } catch (error) {
    console.error('获取待上传剧集失败:', error)
    return []
  }
}

const getDramaAccountByName = (dramaName: string, date?: string) => {
  const targetDate = date || activeTab.value
  if (!targetDate) return ''
  const dramas = dramaCache.value[targetDate] || []
  return dramas.find(drama => drama.name === dramaName)?.account || ''
}

const fetchAdvertiserIdByAccount = async (account: string) => {
  if (!account) return null
  if (Object.prototype.hasOwnProperty.call(advertiserCache.value, account)) {
    return advertiserCache.value[account]
  }

  const result = await djdataApi.getAdvertiserIdByAccount(account)
  if (!result.success) {
    throw new Error(result.message || '查询广告主失败')
  }

  const advertiserId = result.advertiserId ?? result.data?.data?.list?.[0]?.id ?? null
  advertiserCache.value[account] = advertiserId
  return advertiserId
}

const ensureDailyAdvertisers = async (date: string) => {
  if (!dramaSubjectStore.isDailySubject) return
  const dramas = dramaCache.value[date] || []
  const accounts = Array.from(
    new Set(dramas.map(drama => drama.account).filter(Boolean))
  ) as string[]
  if (!accounts.length) {
    message.warning('未获取到待上传剧集的账户信息')
    return
  }

  await Promise.all(
    accounts.map(async account => {
      try {
        await fetchAdvertiserIdByAccount(account)
      } catch (error) {
        console.error(`查询广告主失败: ${account}`, error)
        message.error(`账户 ${account} 查询广告主失败`)
      }
    })
  )
}

const resolveDailyUploadMeta = async (filePath: string) => {
  const video = videoMaterials.value.find(item => item.filePath === filePath)
  if (!video) {
    throw new Error('未找到视频素材信息')
  }

  const account = getDramaAccountByName(video.dramaName)
  if (!account) {
    throw new Error(`剧集 ${video.dramaName} 缺少账户信息`)
  }

  const advertiserId = await fetchAdvertiserIdByAccount(account)
  if (!advertiserId) {
    throw new Error(`账户 ${account} 未匹配到广告主`)
  }

  return { advertiserId, account, dramaName: video.dramaName }
}

const fetchMaterialsForDate = async (date: string) => {
  try {
    const formattedDate = formatDateForUpload(date)
    const url = `/api/xt/video-materials?date=${encodeURIComponent(formattedDate)}`
    const userId = apiConfigStore.effectiveUserId
    const headers: HeadersInit = {}
    if (userId) {
      headers['x-user-id'] = userId
    }
    const response = await fetch(url, { headers })
    if (!response.ok) {
      return []
    }
    const result = await response.json()
    if (!result.success) {
      return []
    }
    return result.materials.map(mapRawMaterial) as VideoMaterial[]
  } catch (error) {
    console.error('检测视频素材失败:', error)
    return []
  }
}

const hasPendingLocalMaterials = async (date: string) => {
  const pendingDramas = await getPendingUploadDramasByDate(date, true)
  if (!pendingDramas.length) return null
  const dramaNames = new Set(pendingDramas.map(drama => drama.name))
  const materials = await fetchMaterialsForDate(date)
  if (!materials.length) return null
  const hasPending = materials.some(
    material =>
      dramaNames.has(material.dramaName) &&
      (material.status === '待上传' || material.status === '失败')
  )
  if (!hasPending) return null
  return {
    dramas: pendingDramas,
    materials,
  }
}

// 更新日期统计信息
const hasSelectedPendingVideos = (videos: VideoMaterial[]) => {
  return videos.some(
    video =>
      selectedVideos.value.has(video.fileName) &&
      (video.status === '待上传' || video.status === '失败')
  )
}

const updateDateStats = async (date: string) => {
  // 直接使用已缓存的剧集数据，避免重复API调用
  const dateDramas = dramaCache.value[date] || []
  const formattedDate = formatDateForUpload(date)

  // 将剧集转换为DramaGroup格式，并从videoMaterials中获取对应的视频
  const groups: DramaGroup[] = dateDramas.map(drama => {
    const videos = videoMaterials.value.filter(
      video => video.dramaName === drama.name && video.date === formattedDate
    )

    const allUploaded = videos.every(video => video.status === '已完成')
    const hasUploading = videos.some(video => video.status === '上传中')
    const allFailed = videos.every(video => video.status === '失败')

    let status: DramaStatus = (drama.status as DramaStatus) || '待上传'

    const shouldHoldUploadingStatus = isUploading.value && hasSelectedPendingVideos(videos)

    // 优先级1: 如果有任何视频正在上传中，剧集状态为上传中
    if (hasUploading || shouldHoldUploadingStatus) {
      status = '上传中'
    }
    // 优先级2: 如果所有视频都已提交到素材库，剧集状态为待搭建
    else if (allUploaded && videos.every(video => video.isSubmitted)) {
      status = '待搭建'
    }
    // 优先级3: 如果所有视频都已完成但未全部提交，剧集状态为已完成
    else if (allUploaded) {
      status = '已完成'
    }
    // 优先级4: 如果所有视频都失败，剧集状态为失败
    else if (allFailed) {
      status = '失败'
    }
    // 默认: 待上传

    return {
      dramaName: drama.name,
      videos,
      uploading: false,
      allUploaded,
      expanded: false,
      status,
    }
  })

  // 更新当前日期的分组素材
  currentDateGroupedMaterials.value = groups

  const pendingDramaCount = groups.filter(group => group.status === '待上传').length

  // 计算当前日期实际选中的视频数量
  const selectedVideoCount = getCurrentDateSelectedVideoCount(date)

  dateStats.value[date] = {
    pendingDramaCount,
    selectedVideoCount,
  }
}

// 计算属性 - 获取所有日期列表（从boardData中获取）
const dateList = computed(() => {
  if (!props.boardData) return []
  return props.boardData.dates
})

// 计算属性 - 上传进度相关
const totalCount = computed(() => {
  // 计算当前日期选中的视频数量（包括禁用的视频）
  if (!activeTab.value || !currentDateGroupedMaterials.value) return 0

  let count = 0
  currentDateGroupedMaterials.value.forEach(group => {
    const selectedVideosInGroup = group.videos.filter(video =>
      selectedVideos.value.has(video.fileName)
    )
    count += selectedVideosInGroup.length
  })
  return count
})

const overallProgressPercentage = computed(() => {
  if (totalVideoStatCount.value === 0) return 0
  return Math.round((uploadedVideoCount.value / totalVideoStatCount.value) * 100)
})

const isAllUploadsCompleted = computed(() => {
  return totalVideoStatCount.value > 0 && uploadedVideoCount.value >= totalVideoStatCount.value
})

const isUploadProcessRunning = computed(() => isUploading.value && !isAllUploadsCompleted.value)

const totalDramaCount = computed(() => currentDateGroupedMaterials.value.length || 0)

const uploadedDramaCount = computed(() => {
  if (!currentDateGroupedMaterials.value) return 0
  return currentDateGroupedMaterials.value.filter(group => group.status !== '待上传').length
})

const totalVideoStatCount = computed(() => {
  if (!currentDateGroupedMaterials.value) return 0
  let total = 0
  currentDateGroupedMaterials.value.forEach(group => {
    total += group.videos.length
  })
  return total
})

const uploadedVideoCount = computed(() => {
  if (!currentDateGroupedMaterials.value) return 0
  let uploaded = 0
  currentDateGroupedMaterials.value.forEach(group => {
    group.videos.forEach(video => {
      if (video.status === '已完成') {
        uploaded++
      }
    })
  })
  return uploaded
})

const autoUploadEnabledSetting = computed(() => settingsStore.settings.autoUploadEnabled)
const autoUploadIntervalSetting = computed(() =>
  Math.max(settingsStore.settings.autoUploadInterval || 300, 30)
)
const shouldAutoUpload = computed(() => showModal.value && autoUploadEnabledSetting.value)
const autoUploadIntervalMs = computed(() => autoUploadIntervalSetting.value * 1000)
const autoUploadTimer = ref<number | null>(null)
const autoUploadRunning = ref(false)
const autoUploadNotice = ref('')
const lastAutoRefreshAt = ref<number | null>(null)
const nextAutoRefreshAt = ref<number | null>(null)
const skipNextTabWatch = ref(false)
const autoUploadStandby = ref(false)
const showAutoUploadOverlay = computed(() => {
  if (!autoUploadEnabledSetting.value) return false
  if (isUploading.value || isTabLoading.value) return false
  return autoUploadRunning.value || autoUploadStandby.value
})

// 将时间戳或日期字符串转换为 YYYY-MM-DD
const toDateString = (value: unknown): string | null => {
  const format = (date: Date) => {
    const y = date.getFullYear()
    const m = `${date.getMonth() + 1}`.padStart(2, '0')
    const d = `${date.getDate()}`.padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  if (typeof value === 'number') {
    return format(new Date(value))
  }
  if (typeof value === 'string') {
    // 兼容飞书返回的字符串时间戳
    const num = Number(value)
    if (!Number.isNaN(num)) {
      return format(new Date(num))
    }
    // 已经是 YYYY-MM-DD 直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value
    }
  }
  return null
}

// 从飞书获取所有待上传日期，防止日期窗口未覆盖导致漏扫
const getPendingDatesFromFeishu = async (): Promise<string[]> => {
  try {
    const res = await feishuApi.getPendingUploadDramas()
    const items = res.data?.items || []
    const dateSet = new Set<string>()
    items.forEach(item => {
      const dateField = (item as { fields?: Record<string, unknown> })?.fields?.['日期']
      const dateStr = toDateString(dateField)
      if (dateStr) {
        dateSet.add(dateStr)
      }
    })
    return Array.from(dateSet)
  } catch (error) {
    console.error('获取飞书待上传日期失败:', error)
    return []
  }
}

watch(isAllUploadsCompleted, completed => {
  if (completed && isUploading.value) {
    isUploading.value = false
    stopTimeTracking()
  }

  if (
    completed &&
    shouldAutoUpload.value &&
    !autoUploadRunning.value &&
    !isTabLoading.value &&
    !isUploading.value
  ) {
    autoUploadStandby.value = true
    autoUploadNotice.value = `自动上传完成：${formatDate(activeTab.value || '')}`
  }
})

// 计算属性 - 队列状态相关
const queueStatus = computed(() => {
  const pending = tosUploadQueue.value.length
  const active = tosUploadingCount.value
  const total = pending + active
  return {
    total,
    active,
    pending,
    maxConcurrent: tosMaxConcurrentUploads.value,
  }
})

// 计算属性 - 选中状态相关
const currentDateAllVideos = computed(() => {
  if (!activeTab.value || !currentDateGroupedMaterials.value) return []

  // 基于当前日期的分组素材来获取所有视频，这样与数量统计保持一致
  const allVideos: VideoMaterial[] = []
  currentDateGroupedMaterials.value.forEach(group => {
    // 包含所有视频
    allVideos.push(...group.videos)
  })

  return allVideos
})

const isAllSelected = computed(() => {
  if (currentDateAllVideos.value.length === 0) return false

  // 考虑所有视频
  return currentDateAllVideos.value.every(video => selectedVideos.value.has(video.fileName))
})

const isIndeterminate = computed(() => {
  // 考虑所有视频
  if (currentDateAllVideos.value.length === 0) return false

  const selectedCount = currentDateAllVideos.value.filter(video =>
    selectedVideos.value.has(video.fileName)
  ).length
  return selectedCount > 0 && selectedCount < currentDateAllVideos.value.length
})

// 方法
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

// 选中相关方法
const toggleVideoSelection = (fileName: string) => {
  const video = videoMaterials.value.find(v => v.fileName === fileName)
  if (!video) return

  if (selectedVideos.value.has(fileName)) {
    // 取消选择：从选中列表中移除
    selectedVideos.value.delete(fileName)

    // 如果视频正在上传，立即取消上传
    if (isVideoUploading(fileName)) {
      tosCancelUpload(fileName)
      // 将视频状态重置为待上传
      video.status = '待上传'
      video.progress = undefined // 清理进度
    }

    // 如果正在并发上传，需要从队列中移除
    if (isConcurrentUploading.value) {
      removeFromUploadQueue(fileName)
    }
  } else {
    // 选择：添加到选中列表
    selectedVideos.value.add(fileName)

    // 如果正在并发上传，需要添加到队列中
    if (isConcurrentUploading.value) {
      addToUploadQueue(video)
    }
  }

  // 实时更新当前日期的选中视频数量
  updateCurrentDateSelectedCount()
}

const toggleDramaSelection = (dramaName: string) => {
  // 从当前日期的分组素材中查找指定剧集
  const dramaGroup = currentDateGroupedMaterials.value?.find(group => group.dramaName === dramaName)
  if (!dramaGroup) return

  // 考虑所有视频
  const allVideos = dramaGroup.videos

  if (allVideos.length === 0) {
    // 如果没有可选择的视频，直接返回
    return
  }

  const allSelected = allVideos.every(video => selectedVideos.value.has(video.fileName))

  if (allSelected) {
    // 取消选中该剧集的所有视频
    allVideos.forEach(video => {
      selectedVideos.value.delete(video.fileName)

      // 如果视频正在上传，立即取消上传
      if (isVideoUploading(video.fileName)) {
        tosCancelUpload(video.fileName)
        // 将视频状态重置为待上传
        video.status = '待上传'
        video.progress = undefined // 清理进度
      }

      // 如果正在并发上传，从队列中移除
      if (isConcurrentUploading.value) {
        removeFromUploadQueue(video.fileName)
      }
    })
    selectedDramas.value.delete(dramaName)
  } else {
    // 选中该剧集的所有视频
    allVideos.forEach(video => {
      selectedVideos.value.add(video.fileName)
      // 如果正在并发上传，添加到队列中
      if (isConcurrentUploading.value) {
        addToUploadQueue(video)
      }
    })
    selectedDramas.value.add(dramaName)
  }

  // 实时更新当前日期的选中视频数量
  updateCurrentDateSelectedCount()
}

const toggleAllSelection = () => {
  if (isAllSelected.value) {
    // 取消全选
    currentDateAllVideos.value.forEach(video => {
      selectedVideos.value.delete(video.fileName)

      // 如果视频正在上传，立即取消上传
      if (isVideoUploading(video.fileName)) {
        tosCancelUpload(video.fileName)
        // 将视频状态重置为待上传
        video.status = '待上传'
        video.progress = undefined // 清理进度
      }

      // 如果正在并发上传，从队列中移除
      if (isConcurrentUploading.value) {
        removeFromUploadQueue(video.fileName)
      }
    })
    selectedDramas.value.clear()
  } else {
    // 全选 - 选择所有视频
    currentDateAllVideos.value.forEach(video => {
      selectedVideos.value.add(video.fileName)
      // 如果正在并发上传，添加到队列中
      if (isConcurrentUploading.value) {
        addToUploadQueue(video)
      }
    })
    // 选中所有剧集
    const dramaNames = new Set(currentDateAllVideos.value.map(video => video.dramaName))
    selectedDramas.value = new Set(dramaNames)
  }

  // 实时更新当前日期的选中视频数量
  updateCurrentDateSelectedCount()
}

const isVideoSelected = (fileName: string) => {
  return selectedVideos.value.has(fileName)
}

// 判断视频是否正在上传
const isVideoUploading = (fileName: string) => {
  // 首先从当前日期的分组素材中查找
  if (currentDateGroupedMaterials.value) {
    for (const group of currentDateGroupedMaterials.value) {
      const video = group.videos.find(v => v.fileName === fileName)
      if (video) {
        // 如果视频状态是"上传中"，则正在上传
        return video.status === '上传中'
      }
    }
  }

  // 如果没找到，从videoMaterials中查找（兼容性）
  const video = videoMaterials.value.find(v => v.fileName === fileName)
  if (!video) return false

  // 如果视频状态是"上传中"，则正在上传
  return video.status === '上传中'
}

const isDramaSelected = (dramaName: string) => {
  // 从当前日期的分组素材中查找指定剧集
  const dramaGroup = currentDateGroupedMaterials.value?.find(group => group.dramaName === dramaName)
  if (!dramaGroup) return false

  // 考虑所有视频
  if (dramaGroup.videos.length === 0) return false

  return dramaGroup.videos.every(video => selectedVideos.value.has(video.fileName))
}

const isDramaIndeterminate = (dramaName: string) => {
  // 从当前日期的分组素材中查找指定剧集
  const dramaGroup = currentDateGroupedMaterials.value?.find(group => group.dramaName === dramaName)
  if (!dramaGroup) return false

  // 考虑所有视频
  if (dramaGroup.videos.length === 0) return false

  const selectedCount = dramaGroup.videos.filter(video =>
    selectedVideos.value.has(video.fileName)
  ).length
  return selectedCount > 0 && selectedCount < dramaGroup.videos.length
}

// 获取指定日期实际选中的视频数量
const getCurrentDateSelectedVideoCount = (date: string) => {
  if (!date) return 0

  // 使用currentDateGroupedMaterials来计算，与界面显示保持一致
  if (!currentDateGroupedMaterials.value || currentDateGroupedMaterials.value.length === 0) {
    return 0
  }

  // 计算实际选中的视频数量
  let selectedCount = 0
  currentDateGroupedMaterials.value.forEach(group => {
    // 计算所有视频
    group.videos.forEach(video => {
      if (selectedVideos.value.has(video.fileName)) {
        selectedCount++
      }
    })
  })

  return selectedCount
}

// 更新当前日期的选中视频数量统计
const updateCurrentDateSelectedCount = () => {
  if (activeTab.value && dateStats.value[activeTab.value]) {
    const selectedCount = getCurrentDateSelectedVideoCount(activeTab.value)
    dateStats.value[activeTab.value].selectedVideoCount = selectedCount
  }
}

// 首次加载某日期时默认全选
const initializeSelectionForDate = () => {
  const videos = currentDateAllVideos.value
  if (videos.length === 0) {
    selectedVideos.value = new Set()
    selectedDramas.value = new Set()
    if (activeTab.value && dateStats.value[activeTab.value]) {
      dateStats.value[activeTab.value].selectedVideoCount = 0
    }
    return
  }

  const videoNames = videos.map(video => video.fileName)
  selectedVideos.value = new Set(videoNames)
  const dramaNames = new Set(videos.map(video => video.dramaName))
  selectedDramas.value = new Set(dramaNames)
  updateCurrentDateSelectedCount()
}

// 将日期格式从 "2025-10-08" 转换为 "10.8"
const formatDateForUpload = (dateStr: string) => {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}.${day}`
}

// 获取视频状态样式类名
const getVideoStatusClass = (status: VideoStatus) => {
  switch (status) {
    case '待上传':
      return 'status-pending'
    case '上传中':
      return 'status-uploading'
    case '已完成':
      return 'status-completed'
    case '失败':
      return 'status-failed'
    default:
      return 'status-pending'
  }
}

// 获取状态文本
const getStatusText = (status: VideoStatus) => {
  switch (status) {
    case '待上传':
      return '待上传'
    case '上传中':
      return '上传中'
    case '已完成':
      return '已完成'
    case '失败':
      return '失败'
    default:
      return status
  }
}

// 格式化错误时间戳
const formatErrorTimestamp = (timestamp: string) => {
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return timestamp
  }
}

// TOS重试处理
const handleTosRetry = async (fileName: string, error: Error) => {
  const video = videoMaterials.value.find(v => v.fileName === fileName)
  if (!video) return

  if (dramaSubjectStore.isDailySubject) {
    video.status = '失败'
    video.progress = undefined
    video.lastError = {
      error: error.name || 'Upload Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
    updateDramaStatus(video.dramaName)
    console.error(`每日上传失败: ${fileName}`, error)
    return
  }

  const currentRetryCount = video.retryCount || 0
  if (currentRetryCount < 1) {
    // 自动重试一次
    video.retryCount = currentRetryCount + 1
    video.status = '待上传'
    video.progress = undefined // 清理进度
    video.lastError = {
      error: error.name || 'Upload Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
    console.log(`TOS上传失败，准备重试: ${fileName} (第 ${video.retryCount} 次重试)`, error)

    // 将重试任务加入队列 - 传递完整的文件路径
    tosReupload(video.filePath)
  } else {
    // 重试次数已达上限，标记为最终失败
    video.status = '失败'
    video.progress = undefined // 清理进度
    video.lastError = {
      error: error.name || 'Upload Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
    // 更新剧集状态
    updateDramaStatus(video.dramaName)
    console.error(`TOS上传最终失败: ${fileName} (已重试 ${currentRetryCount} 次)`, error)
    submitPartialIfReady(video.dramaName)
  }
}

// 上传完成提示
const finishUploadTips = () => {
  const failList = videoMaterials.value.filter(item => item.status === '失败')
  const successList = videoMaterials.value.filter(item => item.status === '已完成')

  const tipsStr = failList.length
    ? `执行完成。${failList.length}个视频未上传成功，请检查。`
    : `执行完成。本批次${successList.length}个视频全部上传成功！`

  // 获取总耗时
  const totalDuration = tosGetUploadDuration()
  const formattedTotalDuration =
    Number(totalDuration) < 60
      ? `${totalDuration}秒`
      : `${Math.floor(Number(totalDuration) / 60)}分${(Number(totalDuration) % 60).toFixed(1)}秒`

  // 计算总大小
  const totalSize = videoMaterials.value.reduce((sum, file) => sum + file.size, 0)

  // 打印统计信息
  console.log(`\n所有文件上传完成:
  - 总耗时: ${formattedTotalDuration}
  - 处理文件数: ${videoMaterials.value.length}
  - 文件总大小: ${formatFileSize(totalSize)}
  - 成功数量: ${successList.length}
  - 失败数量: ${failList.length}
  - 完成时间: ${new Date().toLocaleTimeString()}
  - 平均每个文件耗时: ${(Number(totalDuration) / videoMaterials.value.length).toFixed(2)}秒
  - 平均处理速度: ${formatFileSize(totalSize / Number(totalDuration))}/s`)

  if (failList.length) {
    message.warning(tipsStr)
  } else {
    message.success(tipsStr)
  }
}

// 手动重新上传
const retryUpload = async (video: VideoMaterial) => {
  try {
    // 重置重试计数和错误信息
    video.retryCount = 0
    video.error = undefined
    video.lastError = undefined
    video.status = '待上传'
    video.progress = undefined // 清理进度

    // 使用TOS重试 - 传递完整的文件路径
    tosReupload(video.filePath)
    console.log(`手动重试TOS上传: ${video.fileName}`)
  } catch (error) {
    console.error(`手动重试上传失败: ${video.fileName}`, error)
  }
}

// 获取剧集状态类型
const getDramaStatusType = (status: DramaStatus) => {
  switch (status) {
    case '待上传':
      return 'default'
    case '上传中':
      return 'info'
    case '待搭建':
      return 'warning'
    case '已完成':
      return 'success'
    case '失败':
      return 'error'
    default:
      return 'default'
  }
}

// 获取剧集状态文本
const getDramaStatusText = (status: DramaStatus) => {
  switch (status) {
    case '待上传':
      return '待上传'
    case '上传中':
      return '上传中'
    case '待搭建':
      return '待搭建'
    case '已完成':
      return '已完成'
    case '失败':
      return '失败'
    default:
      return status
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 解析文件名，提取内容名称和剪辑师
const parseFileName = (fileName: string) => {
  const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('')
  const [, contentName = '', editorName = ''] = fileNameWithoutExt.split('-')

  return {
    contentName: contentName || '未知内容',
    editorName: editorName || '未知剪辑师',
  }
}

// 获取视频信息
const getVideoInfoFromFile = async (file: File) => {
  try {
    const videoInfo = await getVideoInfo(file)
    return {
      width: videoInfo.width,
      height: videoInfo.height,
      duration: videoInfo.duration,
    }
  } catch (error) {
    console.error('获取视频信息失败:', error)
    // 如果获取失败，返回默认值
    return {
      width: 1280,
      height: 720,
      duration: 60,
    }
  }
}

// 提交视频素材到素材库
const submitVideoMaterials = async (videos: VideoMaterial[], dramaName: string) => {
  if (dramaSubjectStore.isDailySubject) {
    console.log(`每日账号跳过素材库提交: ${dramaName}`)
    return
  }

  // 检查是否正在提交该剧集
  if (submittingDramas.value.has(dramaName)) {
    console.log(`剧集 ${dramaName} 正在提交中，跳过重复提交`)
    return
  }

  try {
    console.log(`开始提交剧集 ${dramaName} 的视频素材到素材库:`, videos.length, '个视频')

    // 标记剧集为正在提交
    submittingDramas.value.add(dramaName)

    // 过滤出已完成上传且未提交的视频
    const completedVideos = videos.filter(
      video => video.status === '已完成' && video.materialUrl && !video.isSubmitted
    )

    if (completedVideos.length === 0) {
      console.log(`剧集 ${dramaName} 没有需要提交的视频素材`)
      return
    }

    // 准备提交数据
    const materialList: MaterialAddItem[] = []

    for (const video of completedVideos) {
      // 解析文件名获取内容名称和剪辑师
      const { contentName, editorName } = parseFileName(video.fileName)

      // 使用从后端获取的视频信息（已经通过ffprobe获取了真实信息）
      const videoInfo = {
        width: video.materialWidth || 1280,
        height: video.materialHeight || 720,
        duration: video.materialDuration || 60,
      }
      console.log(`从后端获取到的视频信息-videoInfo`, videoInfo)

      // 如果后端没有获取到视频信息，且有原始文件对象，则尝试从前端获取
      if (!video.materialWidth || !video.materialHeight || !video.materialDuration) {
        try {
          console.log(`后端未获取到视频 ${video.fileName} 的完整信息，尝试从前端获取`)
          const localFile = await getFileFromPath(video.filePath)
          const realVideoInfo = await getVideoInfoFromFile(localFile)
          videoInfo.width = realVideoInfo.width
          videoInfo.height = realVideoInfo.height
          videoInfo.duration = realVideoInfo.duration
          // 保存获取到的真实视频信息
          video.materialWidth = realVideoInfo.width
          video.materialHeight = realVideoInfo.height
          video.materialDuration = realVideoInfo.duration
        } catch (error) {
          console.warn(`获取视频 ${video.fileName} 信息失败，使用默认值:`, error)
        }
      }

      const materialItem: MaterialAddItem = {
        name: video.fileName,
        content_name: video.materialContentName || contentName,
        editor: video.materialEditorName || editorName,
        size: Math.ceil((video.size / 1024 / 1024) * 1000), // 转换为MB并放大1000倍
        remark: video.materialRemark || '',
        url: video.materialUrl!,
        type: 0, // 0表示视频
        duration: Math.round(videoInfo.duration || 0),
        width: videoInfo.width,
        height: videoInfo.height,
        from: 0, // 0表示剪辑上传
      }

      materialList.push(materialItem)
    }

    // 提交到素材库
    const requestData = {
      category_id: 36243, // 固定文件夹ID
      content_type: 0, // 0表示短剧
      list: materialList,
    }

    console.log(`提交剧集 ${dramaName} 素材数据:`, requestData)

    const response = await MaterialService.Add(requestData)

    if (response.code === 0) {
      // 标记视频为已提交
      completedVideos.forEach(video => {
        video.isSubmitted = true
      })

      console.log(`剧集 ${dramaName} 视频素材提交成功:`, completedVideos.length, '个视频')
      message.success(`剧集 ${dramaName} 成功提交 ${completedVideos.length} 个视频素材到素材库`)
      // 更新剧集状态，触发飞书同步
      updateDramaStatus(dramaName)
    } else {
      console.error(`剧集 ${dramaName} 视频素材提交失败:`, response.message)
      message.error(`剧集 ${dramaName} 视频素材提交失败: ${response.message}`)
    }
  } catch (error) {
    console.error(`提交剧集 ${dramaName} 视频素材时发生错误:`, error)
    message.error(`提交剧集 ${dramaName} 视频素材失败，请重试`)
  } finally {
    // 移除提交状态标记
    submittingDramas.value.delete(dramaName)
  }
}

// 检查剧集是否所有视频都已完成上传
const isDramaAllVideosCompleted = (dramaGroup: DramaGroup) => {
  return dramaGroup.videos.every(video => video.status === '已完成')
}

const shouldSubmitPartialDrama = (dramaGroup: DramaGroup) => {
  const allSettled = dramaGroup.videos.every(
    video => video.status === '已完成' || video.status === '失败'
  )
  const hasFailed = dramaGroup.videos.some(video => video.status === '失败')
  const hasUnsubmittedSuccess = dramaGroup.videos.some(
    video => video.status === '已完成' && !video.isSubmitted
  )
  return allSettled && hasFailed && hasUnsubmittedSuccess
}

const submitPartialIfReady = (dramaName: string) => {
  const dramaGroup = currentDateGroupedMaterials.value.find(group => group.dramaName === dramaName)
  if (!dramaGroup) return
  if (shouldSubmitPartialDrama(dramaGroup)) {
    submitVideoMaterials(dramaGroup.videos, dramaName)
  }
}

const getDramaCompletedVideoCount = (dramaGroup: DramaGroup) => {
  return dramaGroup.videos.filter(video => video.status === '已完成').length
}

// 检查剧集是否所有视频都已提交到素材库
// const isDramaAllVideosSubmitted = (dramaGroup: DramaGroup) => {
//   return dramaGroup.videos.every(video => video.isSubmitted === true)
// }

// 计算剧集总大小
const getDramaTotalSize = (videos: VideoMaterial[]) => {
  const totalBytes = videos.reduce((sum, video) => sum + video.size, 0)
  return formatFileSize(totalBytes)
}

// 状态变化监听器
const dramaStatusWatcher = new Map<string, DramaStatus>()
const cleaningDramaDirs = new Set<string>()
const cleanedDramaDirs = new Set<string>()

const findDramaGroupByName = (dramaName: string): DramaGroup | undefined => {
  return (
    currentDateGroupedMaterials.value.find(g => g.dramaName === dramaName) ||
    groupedMaterials.value.find(g => g.dramaName === dramaName)
  )
}

// 删除本地剧集目录（仅在待搭建时触发，避免重复删除）
const cleanupDramaDirectory = async (dramaName: string) => {
  const group = findDramaGroupByName(dramaName)
  const firstVideo = group?.videos?.[0]
  const date = firstVideo?.date

  if (!date) {
    console.warn(`删除目录时缺少日期信息: ${dramaName}`)
    return
  }

  const key = `${date}::${dramaName}`
  if (cleanedDramaDirs.has(key) || cleaningDramaDirs.has(key)) {
    return
  }

  const token = apiConfigStore.config.xtToken
  if (!token) {
    console.warn('缺少 XT token，跳过删除本地目录')
    return
  }

  cleaningDramaDirs.add(key)

  try {
    const res = await fetch('/api/xt/drama-dir', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Xt-Token': token,
      },
      body: JSON.stringify({ date, dramaName }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`删除剧集目录失败: ${dramaName}`, res.status, text)
      return
    }

    const result = await res.json()
    if (!result.success) {
      console.error(`删除剧集目录失败: ${dramaName}`, result.message || result.error)
      return
    }

    cleanedDramaDirs.add(key)
    console.log(`已删除本地剧集目录: ${date} -> ${dramaName}`)
  } catch (error) {
    console.error(`删除剧集目录请求失败: ${dramaName}`, error)
  } finally {
    cleaningDramaDirs.delete(key)
  }
}

// 监听剧集状态变化并通知飞书API
const watchDramaStatusChange = (dramaName: string, newStatus: DramaStatus) => {
  const oldStatus = dramaStatusWatcher.get(dramaName)

  // 如果状态没有变化，跳过
  if (oldStatus === newStatus) {
    return
  }

  // 更新监听器状态
  dramaStatusWatcher.set(dramaName, newStatus)

  // 只有特定状态才更新飞书：待搭建状态才更新飞书，已完成状态不更新飞书
  if (newStatus === '待搭建') {
    updateDramaStatusToFeishu(dramaName, newStatus)
    cleanupDramaDirectory(dramaName)
  }
}

// 更新剧集状态（只更新本地状态，不调用飞书API）
const updateDramaStatus = (dramaName: string) => {
  // 优先从currentDateGroupedMaterials中查找（当前日期的剧集）
  let group = currentDateGroupedMaterials.value.find(g => g.dramaName === dramaName)

  // 如果没找到，再从groupedMaterials中查找（兼容性）
  if (!group) {
    group = groupedMaterials.value.find(g => g.dramaName === dramaName)
  }

  if (!group) {
    console.warn(`未找到剧集组: ${dramaName}`)
    return
  }

  const videos = group.videos
  const completedVideos = videos.filter(v => v.status === '已完成').length
  const uploadingVideos = videos.filter(v => v.status === '上传中').length
  const failedVideos = videos.filter(v => v.status === '失败').length
  const shouldHoldUploadingStatus = isUploading.value && hasSelectedPendingVideos(videos)

  let newStatus: DramaStatus = '待上传'

  // 优先级1: 如果有任何视频正在上传中，剧集状态为上传中
  if (uploadingVideos > 0 || shouldHoldUploadingStatus) {
    newStatus = '上传中'
  }
  // 优先级2: 如果所有视频都已提交到素材库，剧集状态为待搭建
  else if (completedVideos === videos.length && videos.every(video => video.isSubmitted)) {
    newStatus = '待搭建'
  }
  // 优先级3: 如果所有视频都已完成但未全部提交，剧集状态为已完成
  else if (completedVideos === videos.length) {
    newStatus = '已完成'
  }
  // 优先级4: 如果所有视频都失败，剧集状态为失败
  else if (failedVideos === videos.length) {
    newStatus = '失败'
  }
  // 默认: 待上传
  else {
    newStatus = '待上传'
  }

  // 更新本地状态
  group.status = newStatus

  // 同时更新两个数据源，保持一致性
  const otherGroup =
    currentDateGroupedMaterials.value.find(g => g.dramaName === dramaName) !== group
      ? groupedMaterials.value.find(g => g.dramaName === dramaName)
      : null
  if (otherGroup) {
    otherGroup.status = newStatus
  }

  // 监听状态变化并通知飞书API
  watchDramaStatusChange(dramaName, newStatus)
}

// 根据剧集名称查找recordId
const findRecordIdByDramaName = (dramaName: string): string | null => {
  // 从当前日期的剧集列表中查找
  const currentDateDramas = dramaCache.value[activeTab.value] || []
  const drama = currentDateDramas.find(d => d.name === dramaName)
  return drama ? drama.recordId : null
}

// 调用飞书API更新状态
const updateDramaStatusToFeishu = async (dramaName: string, newStatus: DramaStatus) => {
  try {
    console.log(`状态变化，更新飞书表格: ${dramaName} -> ${newStatus}`)

    // 根据剧集名称查找recordId
    const recordId = findRecordIdByDramaName(dramaName)
    if (!recordId) {
      console.error(`未找到剧集 ${dramaName} 的recordId`)
      return
    }

    await feishuApi.updateDramaStatus(recordId, newStatus)
    console.log(`成功更新飞书表格状态: ${dramaName} (${recordId}) -> ${newStatus}`)
  } catch (error) {
    console.error(`更新飞书表格状态失败: ${dramaName} -> ${newStatus}`, error)
  }
}

const handleBatchUpload = async () => {
  console.log('handleBatchUpload 被调用')
  // 开始上传，不关闭弹窗
  isUploading.value = true

  // 直接开始上传，使用已经加载的视频素材
  await startAutoUpload()
}

const handleUploadComplete = () => {
  isUploading.value = false
  stopTimeTracking()
  showModal.value = false
}

// 加载视频素材（带缓存）
const loadVideoMaterials = async (
  date?: string,
  options: { forceReload?: boolean } = {}
): Promise<boolean> => {
  if (!date) return false

  const { forceReload = false } = options

  if (!forceReload && materialsCache.value[date]) {
    console.log(`命中缓存，使用 ${date} 的素材数据`)
    videoMaterials.value = materialsCache.value[date]
    await groupMaterialsByDrama()
    return true
  }

  try {
    const formattedDate = formatDateForUpload(date)
    const url = `/api/xt/video-materials?date=${encodeURIComponent(formattedDate)}`
    console.log('请求URL:', url)
    const userId = apiConfigStore.effectiveUserId
    const headers: HeadersInit = {}
    if (userId) {
      headers['x-user-id'] = userId
    }
    const response = await fetch(url, { headers })
    console.log('响应状态:', response.status)
    const result = await response.json()
    console.log('响应结果:', result)

    if (result.success) {
      // 将后端返回的数据转换为前端需要的格式
      const materials: VideoMaterial[] = result.materials.map(mapRawMaterial)

      materialsCache.value[date] = materials
      videoMaterials.value = materials
      await groupMaterialsByDrama()

      return true
    } else {
      console.error('获取视频素材失败:', result.message)
      message.error('获取视频素材失败: ' + result.message)
      return false
    }
  } catch (error) {
    console.error('获取视频素材失败:', error)
    message.error('获取视频素材失败')
    return false
  }
}

// 加载指定日期的数据（支持强制刷新）
const loadDateData = async (
  date: string,
  options: {
    force?: boolean
    prefetchedDramas?: Drama[]
    prefetchedMaterials?: VideoMaterial[]
  } = {}
) => {
  const { force = false, prefetchedDramas, prefetchedMaterials } = options
  let dramas = prefetchedDramas
  if (dramas) {
    dramaCache.value[date] = dramas
  } else {
    dramas = await getPendingUploadDramasByDate(date, force)
  }

  if (!dramas || dramas.length === 0) {
    materialsCache.value[date] = []
    if (activeTab.value === date) {
      videoMaterials.value = []
      currentDateGroupedMaterials.value = []
    }
    await updateDateStats(date)
    return true
  }

  let success = true
  if (prefetchedMaterials) {
    materialsCache.value[date] = prefetchedMaterials
    videoMaterials.value = prefetchedMaterials
    await groupMaterialsByDrama()
  } else {
    success = await loadVideoMaterials(date, { forceReload: force })
  }

  if (success) {
    await updateDateStats(date)
    if (force || !loadedTabs.value.has(date)) {
      initializeSelectionForDate()
      if (!loadedTabs.value.has(date)) {
        loadedTabs.value.add(date)
      }
    }
  }
  return success
}

// 按剧分组视频素材，并根据弹窗剧集列表进行匹配排序
const groupMaterialsByDrama = async () => {
  const groups: { [key: string]: VideoMaterial[] } = {}

  // 只处理当前选中日期的视频素材
  const currentDateFormatted = activeTab.value ? formatDateForUpload(activeTab.value) : null

  videoMaterials.value.forEach(video => {
    // 如果指定了日期，只处理该日期的视频
    if (currentDateFormatted && video.date !== currentDateFormatted) {
      return
    }

    const dramaName = video.dramaName
    if (!groups[dramaName]) {
      groups[dramaName] = []
    }
    groups[dramaName].push(video)
  })

  // 获取当前选中日期的剧集列表
  const currentDateDramas = await getPendingUploadDramasByDate(activeTab.value)

  // 按照弹窗剧集列表的顺序进行排序
  const sortedDramaNames = currentDateDramas.map(drama => drama.name)

  // 创建匹配的剧集组
  const matchedGroups: DramaGroup[] = []

  // 首先添加匹配的剧集（按弹窗顺序）
  sortedDramaNames.forEach(dramaName => {
    if (groups[dramaName]) {
      const videos = groups[dramaName]
      const allUploaded = videos.every(video => video.status === '已完成')
      const hasUploading = videos.some(video => video.status === '上传中')
      const allFailed = videos.every(video => video.status === '失败')

      let status: DramaStatus = '待上传'

      const shouldHoldUploadingStatus = isUploading.value && hasSelectedPendingVideos(videos)

      // 优先级1: 如果有任何视频正在上传中，剧集状态为上传中
      if (hasUploading || shouldHoldUploadingStatus) {
        status = '上传中'
      }
      // 优先级2: 如果所有视频都已提交到素材库，剧集状态为待搭建
      else if (allUploaded && videos.every(video => video.isSubmitted)) {
        status = '待搭建'
      }
      // 优先级3: 如果所有视频都已完成但未全部提交，剧集状态为已完成
      else if (allUploaded) {
        status = '已完成'
      }
      // 优先级4: 如果所有视频都失败，剧集状态为失败
      else if (allFailed) {
        status = '失败'
      }
      // 默认: 待上传
      else {
        status = '待上传'
      }

      matchedGroups.push({
        dramaName,
        videos,
        uploading: false,
        allUploaded,
        expanded: false,
        status,
      })
    }
  })

  // 然后添加未匹配的剧集（本地有但弹窗没有的）
  Object.keys(groups).forEach(dramaName => {
    if (!sortedDramaNames.includes(dramaName)) {
      const videos = groups[dramaName]
      const allUploaded = videos.every(video => video.status === '已完成')
      const hasUploading = videos.some(video => video.status === '上传中')
      const allFailed = videos.every(video => video.status === '失败')

      let status: DramaStatus = '待上传'

      const shouldHoldUploadingStatus = isUploading.value && hasSelectedPendingVideos(videos)

      // 优先级1: 如果有任何视频正在上传中，剧集状态为上传中
      if (hasUploading || shouldHoldUploadingStatus) {
        status = '上传中'
      }
      // 优先级2: 如果所有视频都已提交到素材库，剧集状态为待搭建
      else if (allUploaded && videos.every(video => video.isSubmitted)) {
        status = '待搭建'
      }
      // 优先级3: 如果所有视频都已完成但未全部提交，剧集状态为已完成
      else if (allUploaded) {
        status = '已完成'
      }
      // 优先级4: 如果所有视频都失败，剧集状态为失败
      else if (allFailed) {
        status = '失败'
      }
      // 默认: 待上传
      else {
        status = '待上传'
      }

      matchedGroups.push({
        dramaName,
        videos,
        uploading: false,
        allUploaded,
        expanded: false,
        status,
      })
    }
  })

  groupedMaterials.value = matchedGroups
}

// 自动开始上传所有视频
const startAutoUpload = async () => {
  console.log('startAutoUpload 被调用')
  console.log('当前视频素材数量:', videoMaterials.value.length)
  console.log('当前选中的日期:', activeTab.value)

  // 如果没有视频素材，先加载当前选中日期的素材
  if (videoMaterials.value.length === 0) {
    console.log('没有视频素材，开始加载...')
    const currentDate = activeTab.value
    if (!currentDate) {
      message.warning('请先选择日期')
      isUploading.value = false
      return
    }
    console.log('当前日期:', currentDate)
    const success = await loadVideoMaterials(currentDate)
    console.log('加载结果:', success)
    if (!success) {
      console.log('加载失败，停止上传')
      isUploading.value = false
      return
    }
  }

  // 如果加载后仍然没有素材，显示警告
  if (videoMaterials.value.length === 0) {
    console.log('加载后仍然没有素材')
    message.warning('没有找到视频素材')
    isUploading.value = false
    return
  }

  console.log('开始上传，素材数量:', videoMaterials.value.length)
  // 开始时间统计
  uploadStartTime.value = new Date()
  startTimeTracking()

  // 一次性上传所有剧的视频
  await uploadAllDramasVideos()

  // 等待TOS上传完成
  await waitForTosUploadComplete()

  // 停止时间统计
  stopTimeTracking()

  // 清理当前上传状态
  currentUpload.value = null
  isUploading.value = false

  // 显示完成消息 - 只统计当前选中日期的视频
  const selectedVideoList = videoMaterials.value.filter((v: VideoMaterial) =>
    selectedVideos.value.has(v.fileName)
  )
  const completedCount = selectedVideoList.filter(v => v.status === '已完成').length
  const totalCount = selectedVideoList.length
  message.success(`上传完成！成功上传 ${completedCount}/${totalCount} 个视频`)

  console.log('上传完成')
}

// 等待TOS上传完成
const waitForTosUploadComplete = async () => {
  return new Promise<void>(resolve => {
    const checkComplete = () => {
      // 检查是否所有选中的视频都已完成或失败
      const selectedVideoList = videoMaterials.value.filter((v: VideoMaterial) =>
        selectedVideos.value.has(v.fileName)
      )
      const allDone = selectedVideoList.every(
        (v: VideoMaterial) => v.status === '已完成' || v.status === '失败'
      )

      if (allDone) {
        console.log('TOS上传完成')
        resolve()
      } else {
        // 继续等待
        setTimeout(checkComplete, 1000)
      }
    }

    checkComplete()
  })
}

// 开始时间追踪
const startTimeTracking = () => {
  if (timeInterval.value) {
    clearInterval(timeInterval.value)
  }

  timeInterval.value = window.setInterval(() => {
    if (uploadStartTime.value) {
      elapsedTime.value = new Date().getTime() - uploadStartTime.value.getTime()
    }
  }, 1000)
}

// 停止时间追踪
const stopTimeTracking = () => {
  if (timeInterval.value) {
    clearInterval(timeInterval.value)
    timeInterval.value = null
  }
}

// 格式化时间显示（毫秒转MM:SS格式）
const formatElapsedTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// 格式化时间为 HH:mm:ss
const formatClock = (timestamp: number | null) => {
  if (!timestamp) return '--:--:--'
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

const autoRefreshInfo = computed(() => {
  const last = formatClock(lastAutoRefreshAt.value)
  const next = formatClock(nextAutoRefreshAt.value)
  return `上次刷新 ${last} · 下次刷新 ${next}`
})

// 一次性上传所有选中的视频（TOS并发上传）
const uploadAllDramasVideos = async () => {
  console.log('uploadAllDramasVideos 开始执行 - 并发上传模式')
  console.log('当前视频素材数量:', videoMaterials.value.length)
  console.log('当前剧组数量:', groupedMaterials.value.length)

  // 重置所有未完成、选中且未禁用的视频的状态为等待中
  videoMaterials.value.forEach(video => {
    if (video.status !== '已完成' && selectedVideos.value.has(video.fileName)) {
      video.status = '待上传'
      video.progress = undefined // 清理进度
    }
  })

  // 重置并发上传状态
  activeUploads.value.clear()
  uploadQueue.value = []
  isConcurrentUploading.value = true

  try {
    if (dramaSubjectStore.isDailySubject && activeTab.value) {
      await ensureDailyAdvertisers(activeTab.value)
    }

    // 按剧集顺序构建TOS上传队列
    const uploadQueueList = buildTosUploadQueue()
    console.log(`构建TOS上传队列完成，共 ${uploadQueueList.length} 个视频`)

    // 有需要上传的文件时，刷新一次凭证
    if (uploadQueueList.length > 0 && !dramaSubjectStore.isDailySubject) {
      try {
        await initTosClient(true)
      } catch (error) {
        console.error('初始化TOS客户端失败:', error)
        message.error('初始化上传服务失败，请重试')
        return
      }
    }

    // 开始TOS上传
    if (uploadQueueList.length > 0) {
      console.log('开始TOS上传...')
      // 一次性添加所有文件到TOS上传队列（立即处理）
      uploadQueueList.forEach(filePath => {
        console.log('添加文件到TOS队列:', filePath)
        addToTosQueue(filePath, true)
      })
    } else {
      console.log('没有需要上传的文件')
    }

    console.log('所有剧组处理完成')
  } catch (error) {
    console.error('批量上传过程中发生错误:', error)
  } finally {
    isConcurrentUploading.value = false
    activeUploads.value.clear()
  }
}

// 按剧集顺序构建TOS上传队列
const buildTosUploadQueue = () => {
  const queue: string[] = []
  // 只处理当前日期的剧集，而不是所有日期的剧集
  const currentDateGroups = currentDateGroupedMaterials.value || []
  console.log('当前日期的剧集数量:', currentDateGroups.length)

  // 按剧集顺序遍历
  for (const drama of currentDateGroups) {
    // 获取该剧集中未完成、选中且未禁用的视频
    const pendingVideos = drama.videos.filter(video => {
      const isSelected = selectedVideos.value.has(video.fileName)
      const isPendingStatus = video.status === '待上传' || video.status === '失败'
      return isSelected && isPendingStatus
    })

    console.log(`剧集 ${drama.dramaName} 待上传视频数量:`, pendingVideos.length)

    // 如果有待上传的视频，记录日志但不立即改变状态
    if (pendingVideos.length > 0) {
      console.log(
        `剧集 ${drama.dramaName} 有待上传视频 ${pendingVideos.length} 个，将在视频开始上传时更新状态`
      )
    }

    // 按文件名排序，确保顺序一致
    pendingVideos.sort((a, b) => a.fileName.localeCompare(b.fileName))

    // 添加到TOS队列
    pendingVideos.forEach(video => {
      queue.push(video.filePath)
    })
  }

  console.log('TOS上传队列构建完成:', queue)
  console.log('队列长度:', queue.length)
  return queue
}

// 注意：原来的buildUploadQueue函数已被buildTosUploadQueue替代

// 动态添加视频到上传队列
const addToUploadQueue = (video: VideoMaterial) => {
  // 检查视频状态是否为待上传
  if (video.status !== '待上传') {
    console.log(`视频 ${video.fileName} 状态为 ${video.status}，不能加入队列`)
    return
  }

  // 添加到TOS上传队列
  addToTosQueue(video.filePath)
  console.log(`动态添加视频到TOS队列: ${video.fileName}`)
}

// 动态从上传队列中移除视频
const removeFromUploadQueue = (fileName: string) => {
  // 根据文件名找到对应的视频对象，获取filePath
  const video = videoMaterials.value.find(v => v.fileName === fileName)
  if (!video) {
    console.log(`未找到视频对象: ${fileName}`)
    return
  }

  // 从TOS队列中移除
  const index = tosUploadQueue.value.findIndex(f => f === video.filePath)
  if (index !== -1) {
    tosUploadQueue.value.splice(index, 1)
    console.log(`从TOS队列中移除视频: ${fileName}`)
  } else {
    console.log(`视频 ${fileName} 不在TOS队列中`)
  }

  // 注意：正在上传的视频复选框已被禁用，用户无法取消选择
  // 因此不需要处理正在上传视频的取消选择情况
}

// 注意：原来的上传相关函数已被TOS上传替代，这些函数已删除

const handleCancelUpload = () => {
  // 取消TOS上传
  tosCancelAllUploads()

  // 重置所有正在上传的视频状态
  videoMaterials.value.forEach(video => {
    if (video.status === '上传中') {
      video.status = '待上传'
      video.progress = undefined // 清理进度
    }
  })

  isUploading.value = false
  currentUpload.value = null
  stopTimeTracking()
  message.info('上传已取消')
}

const refreshMaterialsState = async () => {
  if (!showModal.value || !activeTab.value) {
    return
  }

  const date = activeTab.value
  isTabLoading.value = true
  try {
    await loadDateData(date, { force: true })
  } finally {
    isTabLoading.value = false
  }
}

const handleManualRefresh = async () => {
  if (!activeTab.value || isManualRefreshing.value) {
    return
  }

  isManualRefreshing.value = true
  try {
    // 自动上传开启时，顺带刷新所有日期的飞书数据，避免只刷新当前标签
    if (shouldAutoUpload.value && dateList.value.length) {
      for (const date of dateList.value) {
        await getPendingUploadDramasByDate(date, true)
      }
    }

    await refreshMaterialsState()
  } finally {
    isManualRefreshing.value = false
  }
}

const startAutoUploadTimer = () => {
  stopAutoUploadTimer()
  autoUploadStandby.value = false
  nextAutoRefreshAt.value = Date.now() + autoUploadIntervalMs.value
  autoUploadTimer.value = window.setInterval(() => {
    runAutoUploadCycle()
  }, autoUploadIntervalMs.value)
}

const stopAutoUploadTimer = () => {
  if (autoUploadTimer.value) {
    clearInterval(autoUploadTimer.value)
    autoUploadTimer.value = null
  }
  nextAutoRefreshAt.value = null
  autoUploadStandby.value = false
}

const getAutoUploadDates = async () => {
  // 基本的日期列表来自看板
  const baseDates = dateList.value || []
  // 额外补充飞书返回的所有待上传日期，防止时间窗口未覆盖
  const pendingDates = await getPendingDatesFromFeishu()
  const merged = new Set<string>(baseDates)
  pendingDates.forEach(d => merged.add(d))
  return Array.from(merged)
}

const runAutoUploadCycle = async () => {
  if (!shouldAutoUpload.value || autoUploadRunning.value || isUploading.value) {
    return
  }

  // 标记为自动上传运行中，防止下一轮定时器重入
  autoUploadRunning.value = true
  const now = Date.now()
  lastAutoRefreshAt.value = now
  nextAutoRefreshAt.value = now + autoUploadIntervalMs.value
  autoUploadStandby.value = false

  try {
    // 单轮处理：按日期顺序处理所有有待上传/失败素材的日期，直到没有待上传
    while (true) {
      const datesToCheck = await getAutoUploadDates()
      if (!datesToCheck.length) {
        autoUploadStandby.value = true
        autoUploadNotice.value = '自动上传：暂无待上传素材'
        currentDateGroupedMaterials.value = []
        videoMaterials.value = []
        break
      }

      const pendingList: {
        date: string
        pendingData: { dramas: Drama[]; materials: VideoMaterial[] }
      }[] = []

      for (const date of datesToCheck) {
        const pendingData = await hasPendingLocalMaterials(date)
        if (pendingData) {
          pendingList.push({ date, pendingData })
        }
      }

      if (!pendingList.length) {
        autoUploadStandby.value = true
        autoUploadNotice.value = '自动上传：暂无待上传素材'
        // 清空当前展示，回到轮询等待视图
        currentDateGroupedMaterials.value = []
        videoMaterials.value = []
        break
      }

      for (const { date, pendingData } of pendingList) {
        await processAutoUploadForDate(date, pendingData)
      }

      // 本轮处理完后，刷新所有日期的飞书数据，确保最新状态；若仍有待上传则继续循环
      for (const date of datesToCheck) {
        await getPendingUploadDramasByDate(date, true)
      }
    }
  } finally {
    autoUploadRunning.value = false
  }
}

const processAutoUploadForDate = async (
  date: string,
  pendingData?: { dramas: Drama[]; materials: VideoMaterial[] }
) => {
  autoUploadNotice.value = `自动上传：${formatDate(date)}`
  try {
    if (activeTab.value !== date) {
      skipNextTabWatch.value = true
      activeTab.value = date
      currentDateGroupedMaterials.value = []
      videoMaterials.value = []
    }
    isTabLoading.value = true
    const loaded = await loadDateData(date, {
      force: true,
      prefetchedDramas: pendingData?.dramas,
      prefetchedMaterials: pendingData?.materials,
    })
    isTabLoading.value = false
    if (!loaded) {
      autoUploadNotice.value = `自动上传失败：${formatDate(date)}`
      return
    }
    initializeSelectionForDate()
    await handleBatchUpload()
    autoUploadNotice.value = `自动上传完成：${formatDate(date)}`
  } catch (error) {
    isTabLoading.value = false
    console.error('自动上传失败:', error)
    autoUploadNotice.value = `自动上传失败：${formatDate(date)}`
  }
}

// 监听弹窗显示状态，设置默认选中的标签页
watch(showModal, async newVal => {
  if (newVal && dateList.value.length > 0) {
    // 设置默认选中的标签页，这会触发activeTab的监听器来加载数据
    activeTab.value = dateList.value[0]
    console.log('弹窗打开，设置默认标签页:', dateList.value[0])
  } else if (!newVal) {
    // 弹窗关闭时清除所有状态
    dramaCache.value = {}
    dateStats.value = {}
    materialsCache.value = {}
    loadedTabs.value = new Set()
    videoMaterials.value = []
    currentDateGroupedMaterials.value = []
    isManualRefreshing.value = false
    stopAutoUploadTimer()
    autoUploadStandby.value = false

    // 清理TOS上传相关状态
    tosCancelAllUploads()
    isUploading.value = false
    isConcurrentUploading.value = false
    currentUpload.value = null
    activeUploads.value.clear()
    uploadQueue.value = []

    // 停止时间统计
    stopTimeTracking()

    console.log('弹窗关闭，已清理所有上传状态')
  }
})

watch(
  shouldAutoUpload,
  enabled => {
    if (enabled) {
      startAutoUploadTimer()
      runAutoUploadCycle()
    } else {
      stopAutoUploadTimer()
      lastAutoRefreshAt.value = null
    }
  },
  { immediate: true }
)

watch(autoUploadIntervalMs, () => {
  if (shouldAutoUpload.value) {
    startAutoUploadTimer()
  }
})

onBeforeUnmount(() => {
  stopAutoUploadTimer()
})

// 处理tab切换
const handleTabChange = (newTab: string) => {
  // 如果正在上传，则阻止切换
  if (isUploading.value) {
    message.warning('当前有视频正在上传，请等待上传完成后再切换日期')
    return
  }

  // 允许切换
  activeTab.value = newTab
}

// 监听tab切换，加载对应日期的视频素材
watch(activeTab, async newTab => {
  if (!newTab || !showModal.value) {
    return
  }

  if (skipNextTabWatch.value) {
    skipNextTabWatch.value = false
    return
  }

  console.log('切换日期tab:', newTab)
  autoUploadStandby.value = false
  currentDateGroupedMaterials.value = []
  videoMaterials.value = []
  isTabLoading.value = true

  try {
    await loadDateData(newTab)
  } catch (error) {
    console.error('切换日期tab时加载视频素材失败:', error)
    message.error('加载视频素材失败，请重试')
  } finally {
    isTabLoading.value = false
  }
})

defineExpose({
  refreshMaterialsState,
})
</script>

<style scoped>
.upload-modal {
  padding: 0;
}

/* Tab loading样式 */
.tab-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #666;
}

.loading-text {
  font-size: 14px;
}

/* 选中控制区域样式 */
.selection-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.selection-count {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.refresh-button {
  min-width: 96px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
}

.auto-upload-notice {
  margin-top: 12px;
  padding: 8px 12px;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  color: #047857;
  font-size: 13px;
}

.auto-upload-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 420px;
  text-align: center;
}

.overlay-card {
  background: linear-gradient(135deg, #f0fdf4, #ecfeff);
  border-radius: 16px;
  padding: 32px 40px;
  box-shadow: 0 15px 35px rgba(15, 118, 110, 0.15);
  border: 1px solid rgba(45, 212, 191, 0.4);
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.overlay-text {
  color: #0369a1;
}

.overlay-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.overlay-desc {
  font-size: 14px;
  color: #0f172a;
}

.overlay-meta {
  margin-top: 4px;
  font-size: 13px;
  color: #0f172a;
  opacity: 0.85;
}

.overlay-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 999px;
  color: #047857;
  font-size: 13px;
}

.overlay-indicator .pulse {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #10b981;
  position: relative;
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(0.9);
    opacity: 0.6;
  }
}

/* 剧集头部样式 */
.drama-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.drama-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.drama-checkbox {
  flex-shrink: 0;
}

.drama-info {
  padding-right: 10px;
  flex: 1;
  min-width: 0;
}

.drama-title {
  font-weight: 600;
  color: #1a1a1a;
  font-size: 15px;
  margin-bottom: 2px;
  line-height: 1.3;
}

.drama-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.video-count {
  font-weight: 500;
  color: #4a90e2;
}

.drama-progress {
  color: #16a34a;
  font-weight: 500;
}

.drama-separator {
  color: #ccc;
  font-weight: bold;
}

.drama-size {
  color: #888;
}

/* 视频项样式 */
.video-item {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.video-item:hover {
  border-color: #cbd3da;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.video-item:last-child {
  margin-bottom: 0;
}

.video-checkbox {
  flex-shrink: 0;
}

.video-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.video-name {
  font-weight: 500;
  color: #1a1a1a;
  font-size: 14px;
  line-height: 1.4;
  flex: 1;
  margin-right: 12px;
}

.video-details {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  flex-shrink: 0;
  color: #666;
}

.video-size {
  font-weight: 500;
  color: #4a90e2;
}

/* 统计信息样式 */
.stats-section {
  margin-bottom: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: white;
}

/* 整体进度条容器样式 */
.overall-progress-container {
  margin-top: 16px;
}

.progress-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
  position: relative;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-label {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.progress-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-count {
  font-size: 13px;
  font-weight: 400;
  color: #595959;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.progress-percentage {
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
}

/* 自定义进度条样式 - 简洁版 */
.custom-progress-bar {
  margin-bottom: 16px;
}

.progress-track {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: #1890ff;
  border-radius: 3px;
  position: relative;
  transition: width 0.3s ease;
}

/* 上传状态信息样式 */
.upload-status-info {
  margin-top: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: #1890ff;
  border-radius: 50%;
}

.status-text {
  font-size: 13px;
  color: #595959;
  font-weight: 400;
}

/* 上传进度样式 */
.upload-progress {
  min-height: 400px;
}

/* 视频进度条容器样式 */
.video-progress-container {
  margin-top: 8px;
  padding: 4px 6px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.video-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.progress-label {
  font-size: 12px;
  font-weight: 500;
  color: #595959;
}

.progress-percentage {
  font-size: 12px;
  font-weight: 600;
  color: #1890ff;
}

/* 视频进度条样式 */
.video-progress-bar {
  margin-top: 0;
}

.video-progress-track {
  height: 2px;
  background: #e9ecef;
  border-radius: 1px;
  overflow: hidden;
}

.video-progress-fill {
  height: 100%;
  background: #1890ff;
  border-radius: 1px;
  transition: width 0.2s ease;
}

/* 状态标签样式 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 400;
  border: 1px solid #d9d9d9;
}

.status-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-pending {
  background: #f5f5f5;
  color: #595959;
  border: 1px solid #d9d9d9;
}

.status-pending .status-dot {
  background: #8c8c8c;
}

.status-uploading {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.status-uploading .status-dot {
  background: #1890ff;
}

.status-completed {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.status-completed .status-dot {
  background: #52c41a;
}

.status-failed {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.status-failed .status-dot {
  background: #ff4d4f;
}

/* 重试标签样式 */
.retry-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(250, 173, 20, 0.1);
  color: #faad14;
  border: 1px solid rgba(250, 173, 20, 0.2);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

/* 简化的进度条样式 */
.simple-progress-container {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 8px;
}

.simple-progress-bar {
  display: flex;
  align-items: center;
  gap: 6px;
}

.simple-progress-track {
  width: 60px;
  height: 3px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
}

.simple-progress-fill {
  height: 100%;
  background: #1890ff;
  border-radius: 2px;
  transition: width 0.2s ease;
}

.simple-progress-text {
  font-size: 11px;
  color: #1890ff;
  font-weight: 500;
  min-width: 28px;
}

.upload-list {
  max-height: 300px;
  overflow-y: auto;
}

.upload-item {
  padding: 12px 16px;
  margin-bottom: 8px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.upload-item.uploading {
  background: #f0f9ff;
  border-color: #1890ff;
}

.upload-item.completed {
  background: #f6ffed;
  border-color: #52c41a;
}

.upload-item.failed {
  background: #fff2f0;
  border-color: #ff4d4f;
}

.item-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #212529;
}

.item-status {
  display: flex;
  align-items: center;
}

.item-progress {
  margin-top: 8px;
}

.item-error {
  margin-top: 8px;
  font-size: 12px;
  color: #f44336;
}

/* 日期标签页样式 */
.date-tabs {
  min-height: 400px;
}

.drama-list {
  padding: 16px 0;
}

/* 视频素材区域样式 */
.materials-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e9ecef;
}

.drama-group {
  margin-bottom: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.drama-group:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.group-header-extra {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 状态标签样式 - 简洁版 */
.upload-modal :deep(.n-tag) {
  border-radius: 4px !important;
  font-weight: 400 !important;
  font-size: 12px !important;
  padding: 2px 8px !important;
  border: 1px solid !important;
}

.upload-modal :deep(.n-tag--default) {
  background: #f5f5f5 !important;
  color: #666 !important;
  border-color: #d9d9d9 !important;
}

.upload-modal :deep(.n-tag--info) {
  background: #e6f7ff !important;
  color: #1890ff !important;
  border-color: #91d5ff !important;
}

.upload-modal :deep(.n-tag--success) {
  background: #f6ffed !important;
  color: #52c41a !important;
  border-color: #b7eb8f !important;
}

.upload-modal :deep(.n-tag--warning) {
  background: #fffbe6 !important;
  color: #faad14 !important;
  border-color: #ffe58f !important;
}

.upload-modal :deep(.n-tag--error) {
  background: #fff2f0 !important;
  color: #ff4d4f !important;
  border-color: #ffccc7 !important;
}

.video-count {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
}

/* 折叠面板样式优化 */
.upload-modal :deep(.n-collapse-item__header) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
  border: 1px solid #e1e5e9 !important;
  border-radius: 8px !important;
  padding: 16px 20px !important;
  font-weight: 600 !important;
  color: #212529 !important;
  transition: all 0.2s ease !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}

.upload-modal :deep(.n-collapse-item__header:hover) {
  background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%) !important;
  border-color: #cbd3da !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
  transform: translateY(-1px) !important;
}

:deep(.n-collapse-item__header-main) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.upload-modal :deep(.n-collapse-item__arrow) {
  color: #6c757d !important;
  font-size: 16px !important;
  transition: all 0.2s ease !important;
  margin-left: 12px !important;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
  border-radius: 6px !important;
  padding: 4px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
}

.upload-modal :deep(.n-collapse-item__arrow:hover) {
  color: #495057 !important;
  transform: scale(1.1) !important;
  background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
}

:deep(.n-collapse-item__content-wrapper) {
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-top: none;
  border-radius: 0 0 8px 8px;
  margin-top: -1px;
}

:deep(.n-collapse-item__content-inner) {
  padding: 0;
}

/* 选中状态的剧集头部样式 */
.upload-modal :deep(.n-collapse-item__header.selected) {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
  border-color: #90caf9 !important;
}

.upload-modal :deep(.n-collapse-item__header.selected:hover) {
  background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%) !important;
}

.videos-list {
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 0 0 8px 8px;
}

.video-item {
  padding: 12px 16px;
  margin-bottom: 8px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.video-item:hover {
  background: #f8f9fa;
  border-color: #dee2e6;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.video-item:last-child {
  margin-bottom: 0;
}

.video-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.video-name {
  font-size: 13px;
  font-weight: 500;
  color: #212529;
  flex: 1;
  margin-right: 12px;
  word-break: break-all;
}

.video-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.video-size {
  font-size: 12px;
  color: #6c757d;
}

.video-error {
  margin-top: 6px;
  font-size: 12px;
  color: #dc3545;
  background: #f8d7da;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
}

.video-error-details {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 6px;
  font-size: 12px;
}

.error-message {
  color: #c53030;
  margin-bottom: 4px;
  line-height: 1.4;
}

.error-message strong {
  font-weight: 600;
}

.fail-reason-label {
  color: #c53030;
  font-weight: 600;
}

.fail-reason-text {
  color: #c53030;
}

.error-timestamp {
  color: #718096;
  font-size: 11px;
}

.video-actions {
  flex-shrink: 0;
  margin-left: auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.upload-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-status .status-text {
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

/* 当前日期统计信息样式 */
.current-date-stats {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.current-date-stats .stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.current-date-stats .stat-item {
  text-align: center;
  padding: 12px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.current-date-stats .stat-label {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 4px;
}

.current-date-stats .stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #212529;
}

.current-date-stats .overall-progress {
  margin-top: 12px;
}

.current-date-stats .progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.current-date-stats .progress-label {
  font-size: 13px;
  font-weight: 500;
  color: #495057;
}

.current-date-stats .progress-text {
  font-size: 12px;
  color: #6c757d;
}

/* 待上传剧集区域样式 */
.pending-dramas-section {
  margin-top: 24px;
}

.drama-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: #fff3cd;
  border-radius: 8px;
  border: 1px solid #ffeaa7;
  transition: all 0.2s ease;
}

.drama-item:hover {
  background: #ffeaa7;
  border-color: #fdcb6e;
}

.drama-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.drama-name {
  font-size: 14px;
  font-weight: 500;
  color: #212529;
}

.drama-status {
  display: flex;
  align-items: center;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.modal-header-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

/* 标签页样式优化 */
:deep(.n-tabs-nav) {
  margin-bottom: 16px;
}

:deep(.n-tabs-tab) {
  padding: 8px 16px;
  font-size: 14px;
}

:deep(.n-tabs-tab--active) {
  font-weight: 500;
}
</style>
