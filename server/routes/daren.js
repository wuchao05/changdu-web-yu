import Router from '@koa/router'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const router = new Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 配置文件路径
 * 优先使用环境变量 DAREN_CONFIG_PATH 指定的路径
 * 生产环境：/data/changdu-web/daren-config.json（与 deploy.sh 一致）
 * 开发环境：降级到项目内路径
 */
let CONFIG_FILE_PATH = process.env.DAREN_CONFIG_PATH || '/data/changdu-web/daren-config.json'

// 检测是否在开发环境（/data 目录不存在或无权限）
const isProduction = process.env.NODE_ENV === 'production'
if (!isProduction) {
  // 开发环境使用项目内路径
  CONFIG_FILE_PATH = path.join(__dirname, '../data/daren-config.json')
}

// 启动时打印配置文件路径，方便确认环境变量是否生效
console.log('📁 达人配置文件路径:', CONFIG_FILE_PATH)
console.log('📁 环境: ', isProduction ? '生产环境' : '开发环境')
console.log('📁 环境变量 DAREN_CONFIG_PATH:', process.env.DAREN_CONFIG_PATH || '未设置')

/**
 * 规范化达人数据，确保所有字段都存在
 */
function normalizeDarenData(daren) {
  return {
    id: daren.id || '',
    label: daren.label || '',
    shortName: daren.shortName || '',
    douyinAccounts: Array.isArray(daren.douyinAccounts) ? daren.douyinAccounts : [],
    feishuDramaStatusTableId: daren.feishuDramaStatusTableId || daren.feishuTableId || '', // 兼容旧字段名
    feishuDramaListTableId: daren.feishuDramaListTableId || '',
    feishuAccountTableId: daren.feishuAccountTableId || '', // 达人账户表ID
    enableDramaClipEntry: daren.enableDramaClipEntry || false, // 爆剧爆剪入口开关
    douyinMaterialMatches: Array.isArray(daren.douyinMaterialMatches)
      ? daren.douyinMaterialMatches
      : [], // 抖音号素材配置
    // 素材预览配置
    enableMaterialPreview: daren.enableMaterialPreview || false,
    previewIntervalMinutes:
      typeof daren.previewIntervalMinutes === 'number' ? daren.previewIntervalMinutes : 20,
    previewBuildTimeWindowStart:
      typeof daren.previewBuildTimeWindowStart === 'number'
        ? daren.previewBuildTimeWindowStart
        : 90,
    previewBuildTimeWindowEnd:
      typeof daren.previewBuildTimeWindowEnd === 'number' ? daren.previewBuildTimeWindowEnd : 20,
  }
}

/**
 * 读取达人配置
 */
async function readDarenConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8')
    const config = JSON.parse(data)
    // 规范化达人列表数据
    if (config.darenList && Array.isArray(config.darenList)) {
      config.darenList = config.darenList.map(normalizeDarenData)
    }
    return config
  } catch (error) {
    // 如果文件不存在，返回默认配置
    if (error.code === 'ENOENT') {
      const defaultConfig = { darenList: [] }
      await writeDarenConfig(defaultConfig)
      return defaultConfig
    }
    throw error
  }
}

/**
 * 写入达人配置
 */
async function writeDarenConfig(config) {
  // 确保目录存在
  const dir = path.dirname(CONFIG_FILE_PATH)
  await fs.mkdir(dir, { recursive: true })

  // 写入文件，格式化为易读的 JSON
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * 获取所有达人配置
 * GET /api/daren/config
 */
router.get('/config', async ctx => {
  try {
    const config = await readDarenConfig()
    ctx.body = {
      code: 0,
      message: 'success',
      data: config.darenList,
    }
  } catch (error) {
    console.error('读取达人配置失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '读取配置失败',
      error: error.message,
    }
  }
})

/**
 * 添加达人
 * POST /api/daren/config
 * Body: DarenInfo (完整的达人配置对象)
 */
router.post('/config', async ctx => {
  try {
    const darenData = ctx.request.body

    // 验证必填字段
    if (!darenData.id || !darenData.label) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: '达人ID和名称为必填项',
      }
      return
    }

    const config = await readDarenConfig()

    // 检查ID是否已存在
    const existingIndex = config.darenList.findIndex(d => d.id === darenData.id)
    if (existingIndex >= 0) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: '该用户ID已存在',
      }
      return
    }

    // 添加新达人（规范化数据，接收所有字段）
    const newDaren = normalizeDarenData(darenData)
    config.darenList.push(newDaren)

    await writeDarenConfig(config)

    ctx.body = {
      code: 0,
      message: '添加成功',
      data: newDaren,
    }
  } catch (error) {
    console.error('添加达人失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '添加失败',
      error: error.message,
    }
  }
})

/**
 * 更新达人
 * PUT /api/daren/config/:id
 * Body: { label?, douyinAccounts? }
 */
router.put('/config/:id', async ctx => {
  try {
    const { id: oldId } = ctx.params
    const updates = ctx.request.body

    const config = await readDarenConfig()

    // 查找达人
    const index = config.darenList.findIndex(d => d.id === oldId)
    if (index < 0) {
      ctx.status = 404
      ctx.body = {
        code: -1,
        message: '达人不存在',
      }
      return
    }

    // 检查是否修改了ID
    const newId = updates.id || oldId
    if (newId !== oldId) {
      // ID发生变化，检查新ID是否已存在
      const existingIndex = config.darenList.findIndex(d => d.id === newId)
      if (existingIndex >= 0) {
        ctx.status = 400
        ctx.body = {
          code: -1,
          message: '新的用户ID已存在',
        }
        return
      }
    }

    // 更新达人信息（规范化数据）
    const updatedDaren = normalizeDarenData({
      ...config.darenList[index],
      ...updates,
      id: newId, // 使用新的ID（如果有修改）
    })
    config.darenList[index] = updatedDaren

    await writeDarenConfig(config)

    ctx.body = {
      code: 0,
      message: '更新成功',
      data: updatedDaren,
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '更新失败: ' + error.message,
      error: error.message,
    }
  }
})

/**
 * 删除达人
 * DELETE /api/daren/config/:id
 */
router.delete('/config/:id', async ctx => {
  try {
    const { id } = ctx.params

    const config = await readDarenConfig()

    // 查找达人
    const index = config.darenList.findIndex(d => d.id === id)
    if (index < 0) {
      ctx.status = 404
      ctx.body = {
        code: -1,
        message: '达人不存在',
      }
      return
    }

    // 删除达人
    const deletedDaren = config.darenList.splice(index, 1)[0]

    await writeDarenConfig(config)

    ctx.body = {
      code: 0,
      message: '删除成功',
      data: deletedDaren,
    }
  } catch (error) {
    console.error('删除达人失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '删除失败',
      error: error.message,
    }
  }
})

/**
 * 根据用户ID获取达人信息
 * GET /api/daren/info/:userId
 */
router.get('/info/:userId', async ctx => {
  try {
    const { userId } = ctx.params

    const config = await readDarenConfig()
    const daren = config.darenList.find(d => d.id === userId)

    if (!daren) {
      ctx.status = 404
      ctx.body = {
        code: -1,
        message: '达人不存在',
      }
      return
    }

    ctx.body = {
      code: 0,
      message: 'success',
      data: daren,
    }
  } catch (error) {
    console.error('获取达人信息失败:', error)
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: '获取失败',
      error: error.message,
    }
  }
})

export default router
