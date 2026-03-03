/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, nextTick } from 'vue'
import TOS from '@volcengine/tos-sdk'
import {
  getChunkConfig,
  generateFilePath,
  getMd5FileName,
  getFileFromPath,
} from '@/utils/tosUpload'

// 从文件路径中提取文件名（支持 Unix 和 Windows 路径）
const getFileNameFromPath = (filePath: string): string => {
  // 确定使用哪种路径分隔符
  const pathSeparator = filePath.includes('\\') ? '\\' : '/'
  return filePath.split(pathSeparator).pop() || filePath
}

interface UseTosUploadOptions {
  maxConcurrentUploads?: number
  onStart?: (fileName: string) => void
  onSuccess?: (fileName: string, url?: string) => void
  onError?: (fileName: string, error: Error) => void
  onProgress?: (fileName: string, percent: number) => void
  customUploadHandler?: (payload: {
    filePath: string
    fileName: string
    signal?: AbortSignal
  }) => Promise<{ url?: string } | void>
  customUploadHandlerRef?: {
    value?: UseTosUploadOptions['customUploadHandler'] | null
  }
}

export function useTosUpload(options: UseTosUploadOptions = {}) {
  const {
    maxConcurrentUploads: initialMaxConcurrent = 5,
    onStart,
    onSuccess,
    onError,
    onProgress,
    customUploadHandler,
    customUploadHandlerRef,
  } = options

  const uploadQueue = ref<string[]>([])
  const uploadingCount = ref(0)
  const totalStartTime = ref(0)
  const tosClient = ref<TOS>()
  const uploadCancelTokens = ref<Record<string, { uploadSource?: any; checkpoint?: any }>>({})
  const uploadTimeoutTimers = new Map<string, number>()
  const resolveCustomUploadHandler = () => {
    if (customUploadHandlerRef?.value) return customUploadHandlerRef.value
    return customUploadHandler
  }

  // 使用响应式的并发数，支持动态更新
  const maxConcurrentUploads = ref(initialMaxConcurrent)

  const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000

  const clearUploadTracking = (fileName: string) => {
    const timer = uploadTimeoutTimers.get(fileName)
    if (timer) {
      clearTimeout(timer)
      uploadTimeoutTimers.delete(fileName)
    }
  }

  // 检查是否所有文件都已上传完成
  const isAllDone = (fileList: any[]) =>
    fileList.every((file: any) => file.status === '已完成' || file.status === '失败')

  // 处理上传队列
  const processUploadQueue = async () => {
    console.log(
      `processUploadQueue 开始 - 当前上传数: ${uploadingCount.value}, 最大并发: ${maxConcurrentUploads.value}, 队列长度: ${uploadQueue.value.length}`
    )

    // 持续处理队列，直到达到最大并发数或队列为空
    while (uploadingCount.value < maxConcurrentUploads.value && uploadQueue.value.length > 0) {
      // 如果是第一个文件开始上传，记录开始时间
      if (uploadingCount.value === 0 && totalStartTime.value === 0) {
        totalStartTime.value = performance.now()
      }

      // 从队列中取出文件并上传
      const filePath = uploadQueue.value.shift()
      if (!filePath) {
        break
      }

      uploadingCount.value++
      console.log(`启动上传: ${filePath}, 当前上传数: ${uploadingCount.value}`)

      // 异步处理单个文件上传，不阻塞队列处理
      uploadSingleFile(filePath).finally(() => {
        uploadingCount.value--
        console.log(`上传完成: ${filePath}, 当前上传数: ${uploadingCount.value}`)
        // 上传完成后，继续处理队列中的下一个文件
        if (uploadQueue.value.length > 0) {
          nextTick(() => {
            processUploadQueue()
          })
        }
      })
    }

    console.log(
      `processUploadQueue 结束 - 当前上传数: ${uploadingCount.value}, 队列长度: ${uploadQueue.value.length}`
    )
  }

  // 上传单个文件
  const uploadSingleFile = async (filePath: string) => {
    // 验证文件路径的完整性
    if (!filePath || typeof filePath !== 'string') {
      const error = new Error('文件路径不能为空')
      onError?.('unknown', error)
      return
    }

    // 检查是否是相对路径（只有文件名）
    if (!filePath.startsWith('/') && !filePath.includes('\\')) {
      const error = new Error(`文件路径不完整，缺少完整路径: ${filePath}`)
      onError?.(filePath, error)
      return
    }

    const fileName = getFileNameFromPath(filePath)
    console.log('uploadSingleFile - 接收到的filePath:', filePath)
    console.log('uploadSingleFile - 提取的fileName:', fileName)

    try {
      const currentCustomHandler = resolveCustomUploadHandler()
      if (currentCustomHandler) {
        const controller = new AbortController()
        uploadCancelTokens.value[fileName] = {
          ...uploadCancelTokens.value[fileName],
          uploadSource: {
            cancel: () => controller.abort(),
          },
        }

        const timeoutId = window.setTimeout(() => {
          if (uploadCancelTokens.value[fileName]) {
            controller.abort()
            clearUploadTracking(fileName)
          }
        }, UPLOAD_TIMEOUT_MS)
        uploadTimeoutTimers.set(fileName, timeoutId)

        onStart?.(fileName)
        const result = await currentCustomHandler({
          filePath,
          fileName,
          signal: controller.signal,
        })

        delete uploadCancelTokens.value[fileName]
        clearUploadTracking(fileName)
        onSuccess?.(fileName, result?.url)
        return
      }

      // 先获取本地文件，确认有可上传的内容再去拿凭证
      console.log('准备调用getFileFromPath，传递的路径:', filePath)
      const file = await getFileFromPath(filePath)

      // 初始化/复用客户端（默认不强制刷新，避免每个文件都取一次凭证）
      await initTosClient()
      if (!tosClient.value) {
        throw new Error('初始化TOS客户端失败')
      }

      const cancelTokenSource = TOS.CancelToken.source()
      uploadCancelTokens.value[fileName] = {
        ...uploadCancelTokens.value[fileName],
        uploadSource: cancelTokenSource,
      }

      const timeoutId = window.setTimeout(() => {
        // 仅当仍在上传时才触发超时
        if (uploadCancelTokens.value[fileName]) {
          cancelTokenSource.cancel('upload timeout')
          clearUploadTracking(fileName)
        }
      }, UPLOAD_TIMEOUT_MS)
      uploadTimeoutTimers.set(fileName, timeoutId)

      const tosFilePath = generateFilePath(getMd5FileName(file.name))
      console.log('filename', file.name, tosFilePath)

      const { partSize, taskNum } = getChunkConfig(file.size)
      console.log(`开始上传${file.name}，当前队列中存在${uploadingCount.value}个文件在上传`)

      // 调用onStart回调
      onStart?.(fileName)

      await tosClient.value.uploadFile({
        key: tosFilePath,
        file: file,
        partSize,
        taskNum,
        cancelToken: cancelTokenSource.token,
        progress: (p: number) => {
          if (uploadCancelTokens.value[fileName]) {
            uploadCancelTokens.value[fileName].checkpoint = null
          }
          const percent = Number(p.toFixed(2)) * 100
          const resPercent = percent > 98 ? 98 : Math.round(percent)
          onProgress?.(fileName, resPercent)
        },
      })

      // 上传成功
      const url = `/${tosFilePath}`
      console.log('上传成功', fileName, url)
      delete uploadCancelTokens.value[fileName]
      clearUploadTracking(fileName)
      onSuccess?.(fileName, url)
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // 用户取消上传
      } else if (error.message === 'cancel uploadFile') {
        // 用户取消上传
      } else {
        onError?.(fileName, error)
      }

      const tokens = uploadCancelTokens.value[fileName]
      if (tokens?.uploadSource) {
        delete uploadCancelTokens.value[fileName]
      }
      clearUploadTracking(fileName)
      return

      // 下面是TOS上传错误处理，保留以防逻辑回退
    }
  }

  // 添加文件到上传队列
  const addToQueue = async (filePath: string, immediate = true) => {
    console.log(`add to queue: ${filePath}, immediate: ${immediate}`)
    uploadQueue.value.push(filePath)
    console.log(`队列长度: ${uploadQueue.value.length}`)
    // 启动处理队列（如果immediate为true）
    if (immediate) {
      processUploadQueue()
    }
  }

  // 重新上传文件
  const reupload = (filePath: string) => {
    uploadQueue.value.unshift(filePath)
    // 启动处理队列
    processUploadQueue()
  }

  // 取消上传
  const cancelUpload = (fileName: string) => {
    const tokens = uploadCancelTokens.value[fileName]
    if (tokens?.uploadSource) {
      tokens.uploadSource.cancel('用户取消上传')
      delete uploadCancelTokens.value[fileName]
    }
    clearUploadTracking(fileName)
  }

  // 取消所有上传
  const cancelAllUploads = () => {
    Object.entries(uploadCancelTokens.value).forEach(([, tokens]) => {
      if (tokens?.uploadSource) {
        tokens.uploadSource.cancel('用户取消上传')
      }
    })
    uploadCancelTokens.value = {}
    uploadQueue.value = []
    uploadingCount.value = 0
    uploadTimeoutTimers.forEach(timer => clearTimeout(timer))
    uploadTimeoutTimers.clear()
  }

  // 删除单个文件
  const deleteFile = (fileList: any[], index: number) => {
    const file = fileList[index]
    // 如果文件正在上传，先取消上传
    if (file.status === '上传中') {
      uploadingCount.value--
      cancelUpload(file.fileName)
      nextTick(() => {
        processUploadQueue()
      })
    }
    // 如果文件在上传队列中，从队列中移除
    const queueIndex = uploadQueue.value.findIndex(f => f === file.fileName)
    if (queueIndex !== -1) {
      uploadQueue.value.splice(queueIndex, 1)
    }
    // 删除文件
    fileList.splice(index, 1)
  }

  // 获取上传耗时（秒）
  const getUploadDuration = () => {
    if (totalStartTime.value === 0) return 0
    const duration = ((performance.now() - totalStartTime.value) / 1000).toFixed(2)
    totalStartTime.value = 0 // 重置计时器
    return duration
  }

  // 初始化TOS客户端
  const initTosClient = async (force = false) => {
    void force
    throw new Error('TOS 上传功能已禁用')
  }

  // 更新并发数
  const updateMaxConcurrent = (newMax: number) => {
    if (newMax >= 1 && newMax <= 10) {
      maxConcurrentUploads.value = newMax
      console.log('并发数已更新为:', newMax)

      // 如果当前有队列在等待，尝试处理更多文件
      if (uploadQueue.value.length > 0 && uploadingCount.value < maxConcurrentUploads.value) {
        nextTick(() => {
          processUploadQueue()
        })
      }
    }
  }

  return {
    uploadQueue,
    uploadingCount,
    addToQueue,
    reupload,
    cancelUpload,
    cancelAllUploads,
    deleteFile,
    isAllDone,
    getUploadDuration,
    initTosClient,
    processUploadQueue,
    updateMaxConcurrent,
    maxConcurrentUploads,
  }
}
