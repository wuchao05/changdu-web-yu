import Router from '@koa/router'
import fs from 'fs'
import path from 'path'
import FormData from 'form-data'
import https from 'https'
import axios from 'axios'
import { execFile } from 'child_process'
import { promisify } from 'util'
import crypto from 'crypto'
import { getProductLibraryConfigBySubject, DEFAULT_TEAM_ID } from '../config/productLibrary.js'
import { readAuthConfig } from './auth.js'

const execFileAsync = promisify(execFile)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const calcFileMd5 = filePath =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5')
    const stream = fs.createReadStream(filePath)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })

const router = new Router()

// 默认基础路径配置
const DEFAULT_BASE_PATH = 'D:\\短剧剪辑\\'
const SPLAY_BASE_URL = 'https://splay-admin.lnkaishi.cn'
const getVideoBasePath = () => process.env.XT_VIDEO_BASE_PATH || DEFAULT_BASE_PATH

const resolveProductConfig = ctx => {
  // 从请求头读取前端传递的 user_id 和 subject
  const userId = (ctx.headers['x-user-id'] || '').toString()
  const subject = (ctx.headers['x-subject'] || '').toString()
  return getProductLibraryConfigBySubject(userId || undefined, subject || undefined)
}

const splayRequest = axios.create({
  baseURL: SPLAY_BASE_URL,
  timeout: 15000,
})

// 获取视频信息的函数
const getVideoInfo = async (filePath, maxRetry = 3) => {
  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    try {
      // 使用 execFile 而非 shell，避免路径中的空格/中文导致解析失败
      // 使用 ffprobe 获取视频信息
      const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ])
      const videoData = JSON.parse(stdout)

      // 查找视频流
      const videoStream = videoData.streams.find(stream => stream.codec_type === 'video')
      const format = videoData.format

      if (videoStream) {
        return {
          width: parseInt(videoStream.width) || 0,
          height: parseInt(videoStream.height) || 0,
          duration: parseFloat(format.duration) || 0,
        }
      }

      return {
        width: 0,
        height: 0,
        duration: 0,
      }
    } catch (error) {
      const isLastAttempt = attempt === maxRetry
      console.error(
        `获取视频信息失败(${attempt}/${maxRetry}): ${filePath}`,
        error?.stderr ? error.stderr.toString() : error.message
      )
      if (!isLastAttempt) {
        // 简单退避，避免持续高频触发 ffprobe
        await sleep(200 * attempt)
      }
    }
  }

  return {
    width: 0,
    height: 0,
    duration: 0,
  }
}

function getXtToken(ctx) {
  const token = ctx.headers['x-xt-token']
  if (!token) {
    ctx.status = 400
    ctx.body = {
      code: -1,
      message: '缺少 xt token',
    }
    return null
  }
  return token
}

// 文件上传接口（处理实际文件上传）
router.post('/upload', async ctx => {
  try {
    const { filePath } = ctx.request.body
    const token = getXtToken(ctx)
    if (!token) return

    // 如果传递了文件路径，直接读取本地文件上传
    if (filePath) {
      console.log('上传本地文件:', filePath)

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        ctx.status = 400
        ctx.body = {
          error: 'File not found',
          message: '文件不存在: ' + filePath,
        }
        return
      }

      const fileName = path.basename(filePath)
      const fileStats = fs.statSync(filePath)

      console.log('文件信息:', {
        filePath,
        fileName,
        size: fileStats.size,
      })

      // 创建form-data
      const formData = new FormData()
      const fileStream = fs.createReadStream(filePath)
      formData.append('file', fileStream, {
        filename: fileName,
        contentType: 'application/octet-stream',
      })

      // 使用Promise包装http请求
      const uploadUrl = new URL('https://splay-admin.lnkaishi.cn/material/upload')
      uploadUrl.searchParams.set('team_id', DEFAULT_TEAM_ID)

      const uploadResponse = await new Promise((resolve, reject) => {
        const req = https.request(
          uploadUrl,
          {
            method: 'POST',
            headers: {
              token,
              ...formData.getHeaders(),
            },
          },
          res => {
            let data = ''
            res.on('data', chunk => (data += chunk))
            res.on('end', () => {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                text: () => Promise.resolve(data),
              })
            })
          }
        )

        req.on('error', reject)
        formData.pipe(req)
      })

      const responseData = await uploadResponse.text()

      let jsonData
      try {
        jsonData = JSON.parse(responseData)
      } catch (parseError) {
        console.error('JSON解析失败:', parseError)
        console.error('原始响应内容:', responseData)
        console.log('响应状态:', uploadResponse.status)
        console.log('响应内容类型:', uploadResponse.headers['content-type'])

        // 如果响应是HTML，可能是错误页面
        if (
          responseData.trim().startsWith('<html') ||
          responseData.trim().startsWith('<!DOCTYPE')
        ) {
          ctx.status = 500
          ctx.body = {
            error: 'Server returned HTML error page',
            message: '目标服务器返回了HTML错误页面，可能是认证失败或服务器错误',
            status: uploadResponse.status,
            responsePreview: responseData.substring(0, 500),
          }
        } else {
          ctx.status = uploadResponse.status
          ctx.body = {
            error: 'Invalid JSON response',
            message: '服务器返回的不是有效的JSON格式',
            rawResponse: responseData,
          }
        }
        return
      }

      ctx.status = uploadResponse.status
      ctx.body = jsonData
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      error: 'Upload failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 获取所有视频素材，按剧分组
router.get('/video-materials', async ctx => {
  try {
    const materials = []
    const { date } = ctx.query // 获取日期参数，如 "10.8"

    const BASE_PATH = getVideoBasePath()
    console.log('视频素材查询 - 基础路径:', BASE_PATH)

    // 读取基础路径下的所有日期文件夹
    if (!fs.existsSync(BASE_PATH)) {
      ctx.body = {
        success: true,
        materials: [],
        message: '基础路径不存在: ' + BASE_PATH,
      }
      return
    }

    let dateFolders = fs.readdirSync(BASE_PATH).filter(folder => {
      const fullPath = path.join(BASE_PATH, folder)
      return fs.statSync(fullPath).isDirectory() && folder.includes('导出')
    })

    // 如果指定了日期参数，只处理该日期的文件夹
    if (date) {
      const targetFolder = `${date}导出`
      dateFolders = dateFolders.filter(folder => folder === targetFolder)
    }

    // 统一的视频后缀判断
    const isVideoFile = file => {
      const ext = path.extname(file).toLowerCase()
      return ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm'].includes(ext)
    }

    // 安全追加素材，单个文件出错时跳过，避免整个接口 500
    const pushMaterial = async ({ filePath, dramaName, dateLabel }) => {
      try {
        if (!fs.existsSync(filePath)) {
          console.warn(`视频文件不存在，已跳过: ${filePath}`)
          return
        }

        const stats = fs.statSync(filePath)
        if (!stats.isFile()) {
          console.warn(`路径不是文件，已跳过: ${filePath}`)
          return
        }

        let videoInfo = { width: 0, height: 0, duration: 0 }
        try {
          videoInfo = await getVideoInfo(filePath)
        } catch (error) {
          console.warn(`获取视频信息失败，使用默认值: ${filePath}`, error.message)
        }

        materials.push({
          fileName: path.basename(filePath),
          filePath,
          dramaName,
          date: dateLabel,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modifiedTime: stats.mtime,
          extension: path.extname(filePath),
          status: '待上传', // 默认状态
          progress: 0,
          // 视频信息 - 只保留宽高和时长
          materialWidth: videoInfo.width,
          materialHeight: videoInfo.height,
          materialDuration: Math.round(videoInfo.duration * 100) / 100, // 保留两位小数
        })
      } catch (error) {
        console.warn(`处理视频文件失败，已跳过: ${filePath}`, error.message)
      }
    }

    // 遍历每个日期文件夹
    for (const dateFolder of dateFolders) {
      const datePath = path.join(BASE_PATH, dateFolder)
      const dateLabel = dateFolder.replace('导出', '')
      const entries = fs.readdirSync(datePath, { withFileTypes: true })

      // 只处理剧集目录，保持与现有目录结构一致
      const dramaDirs = entries.filter(entry => entry.isDirectory())

      for (const dirEntry of dramaDirs) {
        const dramaFolder = dirEntry.name
        const dramaPath = path.join(datePath, dramaFolder)
        let files = []
        try {
          files = fs.readdirSync(dramaPath)
        } catch (error) {
          console.warn(`读取剧集目录失败，已跳过: ${dramaPath}`, error.message)
          continue
        }

        const videoFiles = files.filter(isVideoFile)

        for (const fileName of videoFiles) {
          const filePath = path.join(dramaPath, fileName)
          await pushMaterial({ filePath, dramaName: dramaFolder, dateLabel })
        }
      }
    }

    ctx.body = {
      success: true,
      materials,
      totalMaterials: materials.length,
      message: `找到 ${materials.length} 个视频素材`,
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      error: 'Failed to get video materials',
      message: error.message,
    }
  }
})

// 获取TOS临时凭证
router.get('/getTosKey', async ctx => {
  try {
    const token = getXtToken(ctx)
    if (!token) return

    const response = await axios.get('https://splay-admin.lnkaishi.cn/material/getTosKey', {
      headers: {
        token,
      },
      timeout: 10000,
      params: {
        team_id: DEFAULT_TEAM_ID,
      },
    })

    ctx.body = {
      success: true,
      data: response.data,
    }
  } catch (error) {
    console.error('获取TOS凭证失败:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      error: 'Failed to get TOS credentials',
      message: error.message,
    }
  }
})

// 获取本地文件
router.get('/getFile', async ctx => {
  try {
    const { path: filePath } = ctx.query

    if (!filePath) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: 'Missing file path parameter',
        message: '缺少文件路径参数',
      }
      return
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      ctx.status = 404
      ctx.body = {
        success: false,
        error: 'File not found',
        message: '文件不存在: ' + filePath,
      }
      return
    }

    // 获取文件信息
    const stats = fs.statSync(filePath)
    const fileName = path.basename(filePath)
    const ext = path.extname(fileName).toLowerCase()
    let fileMd5 = ''
    try {
      fileMd5 = await calcFileMd5(filePath)
    } catch (error) {
      console.error('计算文件MD5失败:', error)
    }

    // 设置响应头
    ctx.set('Content-Type', getContentType(ext))
    ctx.set('Content-Length', stats.size)
    ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    if (fileMd5) {
      ctx.set('X-File-Md5', fileMd5)
      ctx.set('Access-Control-Expose-Headers', 'X-File-Md5')
    }

    // 创建文件流并返回
    const fileStream = fs.createReadStream(filePath)
    ctx.body = fileStream
  } catch (error) {
    console.error('获取文件失败:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      error: 'Failed to get file',
      message: error.message,
    }
  }
})

// 删除指定剧集目录
router.delete('/drama-dir', async ctx => {
  const token = getXtToken(ctx)
  if (!token) return

  const { date, dramaName } = ctx.request.body || {}

  if (!date || !dramaName) {
    ctx.status = 400
    ctx.body = {
      success: false,
      message: '缺少 date 或 dramaName',
    }
    return
  }

  const BASE_PATH = getVideoBasePath()

  const resolvedBase = path.resolve(BASE_PATH)
  const targetDir = path.join(BASE_PATH, `${date}导出`, dramaName)
  const resolvedTarget = path.resolve(targetDir)

  // 防止目录越界
  if (!resolvedTarget.startsWith(resolvedBase)) {
    ctx.status = 400
    ctx.body = {
      success: false,
      message: '目录越界，拒绝删除',
    }
    return
  }

  // 校验目录存在且为目录
  if (!fs.existsSync(resolvedTarget)) {
    ctx.status = 404
    ctx.body = {
      success: false,
      message: '目录不存在',
    }
    return
  }

  const stat = fs.lstatSync(resolvedTarget)
  if (!stat.isDirectory()) {
    ctx.status = 400
    ctx.body = {
      success: false,
      message: '目标不是目录，拒绝删除',
    }
    return
  }

  try {
    await fs.promises.rm(resolvedTarget, { recursive: true, force: true })
    ctx.body = {
      success: true,
      message: '目录已删除',
    }
  } catch (error) {
    console.error('删除剧集目录失败:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '删除目录失败',
      error: error.message,
    }
  }
})

// 通过短剧名称查询 copyright_content_id（用于名称转 ID）
// 直接使用 auth 配置中的 tokens.xh
router.get('/splay/album/search-by-title', async ctx => {
  const { title = '' } = ctx.query
  if (!title) {
    ctx.status = 400
    ctx.body = {
      code: -1,
      message: '缺少剧名参数',
    }
    return
  }

  // 从 auth 配置读取 xh token
  const authConfig = await readAuthConfig()
  const xtToken = authConfig.tokens?.xh

  if (!xtToken) {
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '未配置形天 XT Token',
    }
    return
  }

  try {
    const response = await splayRequest.get('/album/search', {
      params: {
        team_id: 500039, // 固定值
        title,
        page: 1,
        page_size: 10,
        dy_audit_status: -1,
        total: 1,
        category_id: -1,
        promotion_status: 1,
      },
      headers: {
        token: xtToken,
      },
    })

    ctx.body = response.data
  } catch (error) {
    ctx.status = error.response?.status || 500
    ctx.body = {
      code: -1,
      message: error.response?.data?.message || error.message || '通过名称查询短剧失败',
    }
  }
})

// 番茄后台相关接口
router.get('/splay/album/search', async ctx => {
  const token = getXtToken(ctx)
  if (!token) return

  const { title = '' } = ctx.query
  if (!title) {
    ctx.status = 400
    ctx.body = {
      code: -1,
      message: '缺少剧名参数',
    }
    return
  }

  try {
    const response = await splayRequest.get('/album/search', {
      params: {
        team_id: DEFAULT_TEAM_ID,
        title,
        page: 1,
        page_size: 100,
        dy_audit_status: -1,
        from: 1,
        // is_delete: 0,
        category_id: 1,
      },
      headers: {
        token,
      },
    })

    ctx.body = response.data
  } catch (error) {
    ctx.status = error.response?.status || 500
    ctx.body = {
      code: -1,
      message: error.response?.data?.message || error.message || '番茄后台查询失败',
    }
  }
})

router.get('/splay/product/mini-url', async ctx => {
  const token = getXtToken(ctx)
  if (!token) return

  const { album_id: albumId } = ctx.query
  if (!albumId) {
    ctx.status = 400
    ctx.body = {
      code: -1,
      message: '缺少 album_id 参数',
    }
    return
  }

  try {
    const productConfig = resolveProductConfig(ctx)
    const response = await splayRequest.get('/product/miniUrl', {
      params: {
        team_id: DEFAULT_TEAM_ID,
        ad_account_id: productConfig.adAccountId,
        album_id: albumId,
      },
      headers: {
        token,
      },
    })

    ctx.body = response.data
  } catch (error) {
    ctx.status = error.response?.status || 500
    ctx.body = {
      code: -1,
      message: error.response?.data?.message || error.message || '获取小程序链接失败',
    }
  }
})

router.post('/splay/product/create', async ctx => {
  const token = getXtToken(ctx)
  if (!token) return

  try {
    const response = await splayRequest.post('/product/create', ctx.request.body, {
      params: {
        team_id: DEFAULT_TEAM_ID,
      },
      headers: {
        token,
      },
    })

    ctx.body = response.data
  } catch (error) {
    ctx.status = error.response?.status || 500
    ctx.body = {
      code: -1,
      message: error.response?.data?.message || error.message || '新增商品失败',
    }
  }
})

// 添加番茄剧集到配置
router.post('/config/tomatoAlbum', async ctx => {
  const token = getXtToken(ctx)
  if (!token) return

  const { book_id, category_id } = ctx.request.body

  if (!book_id || !category_id) {
    ctx.status = 400
    ctx.body = {
      code: -1,
      message: '缺少必要参数: book_id 或 category_id',
    }
    return
  }

  try {
    const response = await splayRequest.post(
      '/config/tomatoAlbum',
      {
        book_id,
        category_id,
      },
      {
        params: {
          team_id: DEFAULT_TEAM_ID,
        },
        headers: {
          token,
        },
      }
    )

    ctx.body = response.data
  } catch (error) {
    ctx.status = error.response?.status || 500
    ctx.body = {
      code: -1,
      message: error.response?.data?.message || error.message || '添加番茄剧集失败',
    }
  }
})

// 根据文件扩展名获取Content-Type
function getContentType(ext) {
  const contentTypes = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.webm': 'video/webm',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
  }
  return contentTypes[ext] || 'application/octet-stream'
}

// 工具函数：格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default router
