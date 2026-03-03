import Koa from 'koa'
import Router from '@koa/router'
import cors from '@koa/cors'
import { koaBody } from 'koa-body'
import serve from 'koa-static'
import mount from 'koa-mount'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// 导入路由模块
import feishuRoutes from './server/routes/feishu.js'
import novelsaleRoutes from './server/routes/novelsale.js'
import nodeRoutes from './server/routes/node.js'
import thirdPartyRoutes from './server/routes/third-party.js'
import xtRoutes from './server/routes/xt.js'
import materialRoutes from './server/routes/material.js'
import djdataRoutes from './server/routes/djdata.js'
import jiliangRoutes from './server/routes/jiliang.js'
import darenRoutes from './server/routes/daren.js'
import dailyBuildRoutes from './server/routes/dailyBuild.js'
import douyinMaterialRoutes from './server/routes/douyinMaterial.js'
import authRoutes from './server/routes/auth.js'
import autoSubmitRoutes from './server/routes/autoSubmit.js'
import adxRoutes from './server/routes/adx.js'
import configRoutes from './server/routes/config.js'
import { initScheduler } from './server/services/dailyBuildScheduler.js'
import { initScheduler as initAutoSubmitScheduler } from './server/services/autoSubmitScheduler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Koa()
const router = new Router()

// 中间件配置
app.use(
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'distributorid',
      'appid',
      'apptype',
      'cookie',
      'Distributorid',
      'Appid',
      'Apptype',
      'aduserid',
      'rootaduserid',
      'Aduserid',
      'Rootaduserid',
    ],
    credentials: true,
  })
)

app.use(
  koaBody({
    multipart: true,
    formidable: {
      maxFileSize: 1000 * 1024 * 1024, // 1000MB
      uploadDir: './uploads', // 临时上传目录
      keepExtensions: true,
    },
    jsonLimit: '10mb',
    formLimit: '10mb',
    textLimit: '10mb',
    // 默认不解析 DELETE，需要显式开启
    parsedMethods: ['POST', 'PUT', 'PATCH', 'GET', 'DELETE'],
  })
)

// 错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    console.error('Server Error:', err)
    ctx.status = err.status || 500
    ctx.body = {
      error: 'Internal Server Error',
      message: err.message,
      timestamp: new Date().toISOString(),
    }
  }
})

// 日志中间件已移除

// API 路由

router.use('/api/feishu', feishuRoutes.routes(), feishuRoutes.allowedMethods())
router.use('/api/novelsale', novelsaleRoutes.routes(), novelsaleRoutes.allowedMethods())
router.use('/api/node/api', nodeRoutes.routes(), nodeRoutes.allowedMethods())
router.use('/api/xt', xtRoutes.routes(), xtRoutes.allowedMethods())
router.use('/api/djdata', djdataRoutes.routes(), djdataRoutes.allowedMethods())
router.use('/api/daren', darenRoutes.routes(), darenRoutes.allowedMethods())
router.use('/api/auth', authRoutes.routes(), authRoutes.allowedMethods())
router.use('/api/adx', adxRoutes.routes(), adxRoutes.allowedMethods())
router.use('/api/config', configRoutes.routes(), configRoutes.allowedMethods())
router.use(
  '/api/douyin-material',
  douyinMaterialRoutes.routes(),
  douyinMaterialRoutes.allowedMethods()
)
router.use(jiliangRoutes.routes(), jiliangRoutes.allowedMethods())
router.use('/api', materialRoutes.routes(), materialRoutes.allowedMethods())
router.use(thirdPartyRoutes.routes(), thirdPartyRoutes.allowedMethods())
router.use(dailyBuildRoutes.routes(), dailyBuildRoutes.allowedMethods())
router.use(autoSubmitRoutes.routes(), autoSubmitRoutes.allowedMethods())

// 健康检查端点
router.get('/health', ctx => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() }
})

app.use(router.routes())
app.use(router.allowedMethods())

// 静态文件服务 - 用于生产环境
if (process.env.NODE_ENV === 'production') {
  app.use(mount('/', serve(path.join(__dirname, 'dist'))))

  // SPA 路由回退
  app.use(async ctx => {
    if (!ctx.path.startsWith('/api')) {
      ctx.type = 'html'
      ctx.body = readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8')
    }
  })
}

const PORT = process.env.PORT || 3000

// 初始化后台调度器（恢复之前的状态）
initScheduler().catch(err => {
  console.error('初始化后台搭建调度器失败:', err)
})

// 初始化自动提交下载调度器
initAutoSubmitScheduler().catch(err => {
  console.error('初始化自动提交下载调度器失败:', err)
})

app.listen(PORT, () => {
  console.log(`服务器已启动，端口: ${PORT}`)
})

export default app
