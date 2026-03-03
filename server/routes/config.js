import Router from '@koa/router'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { clearFeishuConfigCache } from '../config/feishu.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = new Router()

// 配置文件路径：优先使用生产环境路径，否则使用开发环境路径
const productionConfigPath = '/data/changdu-web-yu/auth.json'
const developmentConfigPath = path.join(__dirname, '../config/auth.json')

async function getConfigPath() {
  try {
    await fs.access(productionConfigPath)
    return productionConfigPath
  } catch {
    return developmentConfigPath
  }
}

// 获取配置
router.get('/', async ctx => {
  try {
    const configPath = await getConfigPath()
    const configContent = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)
    ctx.body = { code: 0, data: config }
  } catch (error) {
    console.error('读取配置文件失败:', error)
    ctx.body = { code: -1, message: '读取配置失败', error: error.message }
  }
})

// 更新配置
router.put('/', async ctx => {
  try {
    const newConfig = ctx.request.body
    const configPath = await getConfigPath()

    // 写入配置文件
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2), 'utf-8')

    // 清除飞书配置缓存，使新配置立即生效
    clearFeishuConfigCache()

    ctx.body = { code: 0, message: '配置更新成功' }
  } catch (error) {
    console.error('更新配置文件失败:', error)
    ctx.body = { code: -1, message: '更新配置失败', error: error.message }
  }
})

export default router
