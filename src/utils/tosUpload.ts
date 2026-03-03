import md5 from 'crypto-js/md5'

// 分片大小配置（字节）
export const CHUNK_SIZE = {
  SMALL: 5 * 1024 * 1024, // 5MB
  MEDIUM: 10 * 1024 * 1024, // 10MB
  LARGE: 20 * 1024 * 1024, // 20MB
  XLARGE: 40 * 1024 * 1024, // 40MB
} as const

// 并发分片数配置
export const CONCURRENT_CHUNKS = {
  SMALL: 4,
  MEDIUM: 6,
  LARGE: 8,
  XLARGE: 10,
} as const

// 文件大小阈值（字节）
export const FILE_SIZE_THRESHOLD = {
  SMALL: 50 * 1024 * 1024, // 50MB
  MEDIUM: 200 * 1024 * 1024, // 200MB
  LARGE: 500 * 1024 * 1024, // 500MB
} as const

// 根据文件大小获取最优分片配置
export const getChunkConfig = (fileSize: number) => {
  if (fileSize > FILE_SIZE_THRESHOLD.LARGE) {
    return {
      partSize: CHUNK_SIZE.XLARGE,
      taskNum: CONCURRENT_CHUNKS.XLARGE,
    }
  } else if (fileSize > FILE_SIZE_THRESHOLD.MEDIUM) {
    return {
      partSize: CHUNK_SIZE.LARGE,
      taskNum: CONCURRENT_CHUNKS.LARGE,
    }
  } else if (fileSize > FILE_SIZE_THRESHOLD.SMALL) {
    return {
      partSize: CHUNK_SIZE.MEDIUM,
      taskNum: CONCURRENT_CHUNKS.MEDIUM,
    }
  } else {
    return {
      partSize: CHUNK_SIZE.SMALL,
      taskNum: CONCURRENT_CHUNKS.SMALL,
    }
  }
}

// 生成按年月日分类的文件路径
export function generateFilePath(fileName: string) {
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `material/${year}/${month}/${day}/${fileName}`
}

// 将文件名处理为 md5 命名
export const getMd5FileName = (originalName: string): string => {
  const dotIndex = originalName.lastIndexOf('.')
  const ext = dotIndex !== -1 ? originalName.slice(dotIndex) : ''
  const nameOnly = dotIndex !== -1 ? originalName.slice(0, dotIndex) : originalName

  const md5Name = md5(nameOnly).toString()
  return `${md5Name}${ext}`
}

// 获取 TOS 临时凭证
export async function getTosKey() {
  throw new Error('TOS 上传功能已禁用')
}

// 从本地路径获取文件
export async function getFileFromPath(filePath: string): Promise<File> {
  try {
    console.log('getFileFromPath - 接收到的filePath:', filePath)

    // 验证文件路径的完整性
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('文件路径不能为空')
    }

    // 检查是否是相对路径（只有文件名）
    if (!filePath.startsWith('/') && !filePath.includes('\\')) {
      throw new Error(`文件路径不完整，缺少完整路径: ${filePath}`)
    }

    // 检查路径是否包含必要的目录结构（支持 Unix 和 Windows 路径）
    // 确定使用哪种路径分隔符
    const pathSeparator = filePath.includes('\\') ? '\\' : '/'
    if (!filePath.includes('/') && !filePath.includes('\\')) {
      throw new Error(`文件路径格式不正确，应该是完整路径: ${filePath}`)
    }
    if (filePath.split(pathSeparator).length < 3) {
      throw new Error(`文件路径格式不正确，应该是完整路径: ${filePath}`)
    }

    const encodedPath = encodeURIComponent(filePath)
    console.log('getFileFromPath - 编码后的路径:', encodedPath)
    const url = `/api/xt/getFile?path=${encodedPath}`
    console.log('getFileFromPath - 请求URL:', url)

    const response = await fetch(url, {
      method: 'GET',
    })

    console.log('getFileFromPath - 响应状态:', response.status)
    if (!response.ok) {
      const errorText = await response.text()
      console.error('getFileFromPath - 响应错误:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const blob = await response.blob()
    console.log('getFileFromPath - 获取到blob，大小:', blob.size)

    // 从文件路径中提取文件名
    const fileName = filePath.split(pathSeparator).pop() || 'unknown'
    console.log('getFileFromPath - 提取的文件名:', fileName)

    // 创建File对象
    return new File([blob], fileName, { type: blob.type })
  } catch (error) {
    console.error('获取文件失败:', error)
    throw error
  }
}

// 从本地路径获取文件并读取MD5
export async function getFileWithMd5FromPath(
  filePath: string,
  signal?: AbortSignal
): Promise<{ file: File; md5: string }> {
  try {
    console.log('getFileWithMd5FromPath - 接收到的filePath:', filePath)

    if (!filePath || typeof filePath !== 'string') {
      throw new Error('文件路径不能为空')
    }

    if (!filePath.startsWith('/') && !filePath.includes('\\')) {
      throw new Error(`文件路径不完整，缺少完整路径: ${filePath}`)
    }

    // 检查路径是否包含必要的目录结构（支持 Unix 和 Windows 路径）
    // 确定使用哪种路径分隔符
    const pathSeparator = filePath.includes('\\') ? '\\' : '/'
    if (!filePath.includes('/') && !filePath.includes('\\')) {
      throw new Error(`文件路径格式不正确，应该是完整路径: ${filePath}`)
    }
    if (filePath.split(pathSeparator).length < 3) {
      throw new Error(`文件路径格式不正确，应该是完整路径: ${filePath}`)
    }

    const encodedPath = encodeURIComponent(filePath)
    const url = `/api/xt/getFile?path=${encodedPath}`
    const response = await fetch(url, {
      method: 'GET',
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const md5 = response.headers.get('x-file-md5') || ''
    const blob = await response.blob()
    // 从文件路径中提取文件名
    const fileName = filePath.split(pathSeparator).pop() || 'unknown'
    const file = new File([blob], fileName, { type: blob.type })

    return { file, md5 }
  } catch (error) {
    console.error('获取文件或MD5失败:', error)
    throw error
  }
}
