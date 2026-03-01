import Router from '@koa/router'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const router = new Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 配置文件路径 - 牵龙专用
 * 优先使用环境变量 DOUYIN_MATERIAL_CONFIG_QIANLONG_PATH 指定的路径
 * 生产环境：/data/changdu-web/douyin-material-config_qianlong.json
 * 开发环境：降级到项目内路径
 */
let CONFIG_FILE_PATH =
  process.env.DOUYIN_MATERIAL_CONFIG_QIANLONG_PATH ||
  '/data/changdu-web/douyin-material-config_qianlong.json'

// 检测是否在开发环境（/data 目录不存在或无权限）
const isProduction = process.env.NODE_ENV === 'production'
if (!isProduction) {
  // 开发环境使用项目内路径
  CONFIG_FILE_PATH = path.join(__dirname, '../data/douyin-material-config_qianlong.json')
}

// 启动时打印配置文件路径，方便确认环境变量是否生效
console.log('📁 抖音号素材匹配配置文件路径(牵龙):', CONFIG_FILE_PATH)
console.log('📁 环境: ', isProduction ? '生产环境' : '开发环境')
console.log(
  '📁 环境变量 DOUYIN_MATERIAL_CONFIG_QIANLONG_PATH:',
  process.env.DOUYIN_MATERIAL_CONFIG_QIANLONG_PATH || '未设置'
)

/**
 * 规范化抖音号素材匹配数据，确保所有字段都存在
 */
function normalizeMatchData(match) {
  return {
    id: match.id || '',
    douyinAccount: match.douyinAccount || '',
    douyinAccountId: match.douyinAccountId || '',
    materialRange: match.materialRange || '',
    createdAt: match.createdAt || new Date().toISOString(),
    updatedAt: match.updatedAt || new Date().toISOString(),
  }
}

/**
 * 读取配置
 */
async function readConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8')
    const config = JSON.parse(data)
    // 规范化匹配列表数据
    if (config.matches && Array.isArray(config.matches)) {
      config.matches = config.matches.map(normalizeMatchData)
    }
    return config
  } catch (error) {
    // 如果文件不存在，返回默认配置
    if (error.code === 'ENOENT') {
      const defaultConfig = { matches: [] }
      await writeConfig(defaultConfig)
      return defaultConfig
    }
    throw error
  }
}

/**
 * 写入配置
 */
async function writeConfig(config) {
  // 确保目录存在
  const dir = path.dirname(CONFIG_FILE_PATH)
  await fs.mkdir(dir, { recursive: true })

  // 写入文件，格式化为易读的 JSON
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * 获取所有抖音号素材匹配配置（牵龙）
 * GET /api/douyin-material-qianlong/config
 */
router.get('/config', async ctx => {
  try {
    const config = await readConfig()
    ctx.body = {
      code: 0,
      message: 'success',
      data: config.matches,
    }
  } catch (error) {
    console.error('读取抖音号素材匹配配置(牵龙)失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '读取配置失败',
      error: error.message,
    }
  }
})

/**
 * 获取格式化的抖音号素材配置（牵龙） - 供外部服务使用
 * GET /api/douyin-material-qianlong/formatted
 * 返回格式化的多行文本，每行格式：抖音号名称 抖音号ID 素材范围
 */
router.get('/formatted', async ctx => {
  try {
    const config = await readConfig()

    // 格式化为多行文本
    const formattedText = config.matches
      .map(match => `${match.douyinAccount} ${match.douyinAccountId} ${match.materialRange}`)
      .join('\n')

    ctx.body = {
      code: 0,
      message: 'success',
      data: {
        text: formattedText,
        count: config.matches.length,
        matches: config.matches,
      },
    }
  } catch (error) {
    console.error('读取抖音号素材匹配配置(牵龙)失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '读取配置失败',
      error: error.message,
    }
  }
})

/**
 * 添加抖音号素材匹配规则（牵龙）
 * POST /api/douyin-material-qianlong/config
 * Body: { douyinAccount, douyinAccountId, materialRange }
 */
router.post('/config', async ctx => {
  try {
    const { douyinAccount, douyinAccountId, materialRange } = ctx.request.body

    // 验证必填字段
    if (!douyinAccount || !douyinAccountId || !materialRange) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: '抖音号、抖音号ID和素材序号范围为必填项',
      }
      return
    }

    const config = await readConfig()

    // 检查抖音号是否已存在
    const existingIndex = config.matches.findIndex(m => m.douyinAccount === douyinAccount)
    if (existingIndex >= 0) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: '该抖音号已存在',
      }
      return
    }

    // 添加新匹配规则（规范化数据）
    const newMatch = normalizeMatchData({
      id: Date.now().toString(),
      douyinAccount,
      douyinAccountId,
      materialRange,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    config.matches.push(newMatch)

    await writeConfig(config)

    ctx.body = {
      code: 0,
      message: '添加成功',
      data: newMatch,
    }
  } catch (error) {
    console.error('添加抖音号素材匹配规则(牵龙)失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '添加失败',
      error: error.message,
    }
  }
})

/**
 * 更新抖音号素材匹配规则（牵龙）
 * PUT /api/douyin-material-qianlong/config/:id
 * Body: { douyinAccount?, douyinAccountId?, materialRange? }
 */
router.put('/config/:id', async ctx => {
  try {
    const { id } = ctx.params
    const updates = ctx.request.body

    const config = await readConfig()

    // 查找匹配规则
    const index = config.matches.findIndex(m => m.id === id)
    if (index < 0) {
      ctx.status = 404
      ctx.body = {
        code: -1,
        message: '匹配规则不存在',
      }
      return
    }

    // 如果更新了抖音号，检查是否与其他规则冲突
    if (updates.douyinAccount && updates.douyinAccount !== config.matches[index].douyinAccount) {
      const existingIndex = config.matches.findIndex(m => m.douyinAccount === updates.douyinAccount)
      if (existingIndex >= 0) {
        ctx.status = 400
        ctx.body = {
          code: -1,
          message: '该抖音号已存在',
        }
        return
      }
    }

    // 更新匹配规则（规范化数据）
    const updatedMatch = normalizeMatchData({
      ...config.matches[index],
      ...updates,
      id, // 保持ID不变
      updatedAt: new Date().toISOString(),
    })
    config.matches[index] = updatedMatch

    await writeConfig(config)

    ctx.body = {
      code: 0,
      message: '更新成功',
      data: updatedMatch,
    }
  } catch (error) {
    console.error('更新抖音号素材匹配规则(牵龙)失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '更新失败',
      error: error.message,
    }
  }
})

/**
 * 删除抖音号素材匹配规则（牵龙）
 * DELETE /api/douyin-material-qianlong/config/:id
 */
router.delete('/config/:id', async ctx => {
  try {
    const { id } = ctx.params

    const config = await readConfig()

    // 查找匹配规则
    const index = config.matches.findIndex(m => m.id === id)
    if (index < 0) {
      ctx.status = 404
      ctx.body = {
        code: -1,
        message: '匹配规则不存在',
      }
      return
    }

    // 删除匹配规则
    const deletedMatch = config.matches.splice(index, 1)[0]

    await writeConfig(config)

    ctx.body = {
      code: 0,
      message: '删除成功',
      data: deletedMatch,
    }
  } catch (error) {
    console.error('删除抖音号素材匹配规则(牵龙)失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '删除失败',
      error: error.message,
    }
  }
})

export default router
