<script setup lang="ts">
import { ref, computed, h, watch } from 'vue'
import {
  NModal,
  NButton,
  NAlert,
  NSteps,
  NStep,
  NDataTable,
  NTag,
  NTooltip,
  NRadioGroup,
  NRadio,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { feishuApi } from '@/api/feishu'
import * as dailyBuildApi from '@/api/dailyBuild'
import { filterMaterials, sortMaterialsBySequence, type Material } from '@/utils/materialFilter'
import {
  parsePromotionUrl,
  parseDouyinMaterialFromFeishu,
  type DouyinMaterialConfig,
} from '@/utils/dailyBuild'
import { generateMicroAppLink, extractAppIdFromParams } from '@/utils/microAppLink'
import BuildProgressTable, { type BuildDramaRecord } from './BuildProgressTable.vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const message = useMessage()

// 辅助函数：获取错误消息
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

// 清理剧名中的特殊标点符号
function sanitizeDramaName(name: string): string {
  return name.replace(
    /[，。：；！？、''""（）《》【】……—·\s,.:;!?()\[\]{}'"<>\/\\|~`@#$%^&*+=]/g,
    ''
  )
}

// 飞书记录类型定义
interface FeishuDramaRecord {
  record_id: string
  _tableId?: string // 记录所在的表ID，用于更新时使用正确的表
  fields: {
    剧名?: [{ text: string }]
    短剧ID?: { value?: [{ text: string }] }
    账户?: [{ text: string }]
    日期?: number // 13位时间戳
    上架时间?: { type: number; value: [number] } // DateTime 字段格式
    当前状态?: string
    抖音素材?: [{ text: string }] // 抖音素材字段，从飞书状态表获取
    备注?: [{ text: string }] | string // 备注字段，用于记录失败或跳过原因
  }
}

// 初始化数据（资产化流程的输出）
interface InitializationData {
  assets_id: string | number
  micro_app_instance_id: string
  app_id: string
  start_page: string
  app_type: number
  start_params: string
  link: string
  product_image_width: number
  product_image_height: number
  product_image_uri: string
}

// 自动搭建记录类型
interface AutoBuildRecord extends BuildDramaRecord {
  currentPhase: '资产化' | '搭建' | '完成'
  assetizationStep?: number // 资产化步骤 1-6
  failedPhase?: '资产化' | '搭建'
  douyinConfigs?: DouyinMaterialConfig[] // 该剧集的抖音配置
}

interface Props {
  show: boolean
}

interface Emits {
  'update:show': [value: boolean]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 状态定义
const dramas = ref<FeishuDramaRecord[]>([])
const buildRecords = ref<AutoBuildRecord[]>([])
const isBuilding = ref(false)
const isLoadingDramas = ref(false) // 是否正在加载剧集列表
const buildError = ref<string | null>(null)
const currentDramaIndex = ref(0)
const currentPhase = ref<'资产化' | '搭建' | '完成'>('资产化')
const currentAssetizationStep = ref(0)
const isCreatingMicroApp = ref(false)
const waitingCountdown = ref(0)
const currentBatchInfo = ref<string>('') // 当前搭建批次信息

// 自动轮询相关状态
const autoPollingEnabled = ref(false) // 是否启用自动轮询
const pollingInterval = ref<number | null>(null) // 轮询间隔（分钟）
const pollingTimer = ref<NodeJS.Timeout | null>(null) // 轮询定时器
const countdownTimer = ref<NodeJS.Timeout | null>(null) // 倒计时定时器
const nextPollingTime = ref<number>(0) // 下次轮询时间戳
const countdown = ref<number>(0) // 倒计时秒数
const pollingStats = ref({
  totalBuilt: 0, // 已搭建数量
  successCount: 0, // 成功数量
  failCount: 0, // 失败数量
})

// 轮询间隔选项
const pollingOptions = [
  { label: '10分钟', value: 10 },
  { label: '15分钟', value: 15 },
  { label: '20分钟', value: 20 },
  { label: '30分钟', value: 30 },
  { label: '1小时', value: 60 },
  { label: '1.5小时', value: 90 },
  { label: '2小时', value: 120 },
]

// 运行模式相关状态
type RunMode = 'frontend' | 'backend'
const runMode = ref<RunMode>('frontend') // 运行模式：前台/后台
const showRunModeSelector = ref(false) // 是否显示运行模式选择器

// 后台调度器状态
const backgroundSchedulerStatus = ref<dailyBuildApi.BackgroundSchedulerStatus | null>(null)
const isLoadingBackgroundStatus = ref(false)
const backgroundPollingTimer = ref<NodeJS.Timeout | null>(null) // 后台状态轮询定时器

// 选中的剧集
const selectedRowKeys = ref<string[]>([])
// 手动搭建中的剧集ID集合
const manuallyBuildingIds = ref<Set<string>>(new Set())

// 抖音号配置列表（从飞书状态表的"抖音素材"字段解析）
const douyinConfigs = ref<DouyinMaterialConfig[]>([])

// 获取当前日期（YYYYMMDD格式）
const buildDate = computed(() => dayjs().tz('Asia/Shanghai').format('YYYYMMDD'))

// 剧集列表表格列定义
const dramasColumns: DataTableColumns<FeishuDramaRecord> = [
  {
    type: 'selection',
  },
  {
    title: '剧名',
    key: 'dramaName',
    width: 180,
    ellipsis: {
      tooltip: true,
    },
    render: row => row.fields['剧名']?.[0]?.text || '-',
  },
  {
    title: '账户',
    key: 'accountId',
    width: 140,
    render: row => row.fields['账户']?.[0]?.text || '-',
  },
  {
    title: '日期',
    key: 'date',
    width: 110,
    render: row => {
      const timestamp = row.fields['日期']
      if (!timestamp) return '-'
      return dayjs(timestamp).format('YYYY-MM-DD')
    },
  },
  {
    title: '短剧ID',
    key: 'bookId',
    width: 160,
    render: row => row.fields['短剧ID']?.value?.[0]?.text || '-',
  },
  {
    title: '上架时间',
    key: 'publishTime',
    width: 140,
    render: row => {
      const timeField = row.fields['上架时间']
      if (!timeField || !timeField.value || !timeField.value[0]) return '-'
      const timestamp = timeField.value[0]
      return dayjs(timestamp).format('YYYY-MM-DD HH:mm')
    },
  },
  {
    title: '当前状态',
    key: 'status',
    width: 80,
    render: row => {
      const status = row.fields['当前状态'] || '-'
      const typeMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
        待搭建: 'warning',
        已完成: 'success',
        待资产化: 'info',
        搭建失败: 'error',
        跳过搭建: 'default',
      }
      return h(
        NTag,
        {
          type: typeMap[status] || 'default',
          size: 'small',
        },
        { default: () => status }
      )
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: row => {
      const isBuilding = manuallyBuildingIds.value.has(row.record_id)
      // 只有后台模式正在运行且有任务执行时，才禁用按钮
      const isBackgroundRunning = backgroundSchedulerStatus.value?.enabled === true
      const hasRunningTask =
        isBackgroundRunning && backgroundSchedulerStatus.value?.currentTask !== null
      const disabled = isBuilding || hasRunningTask

      return h(
        NButton,
        {
          text: true,
          type: 'primary',
          size: 'small',
          disabled,
          onClick: () => handleBuildSingleDrama(row),
        },
        {
          default: () =>
            isBuilding ? h('span', { style: { color: '#999' } }, '搭建中...') : '开始搭建',
        }
      )
    },
  },
]

/**
 * 按优先级排序剧集
 * 注意：只有当前时间 >= 上架时间 - 30分钟 时，该剧才能被选中搭建
 * 优先级：过期/今天剧优先于未来剧，同优先级按上架时间升序
 * @param dramas 待搭建剧集列表
 * @returns 排序后的最高优先级剧集，如果没有符合条件的返回 null
 */
function selectHighestPriorityDrama(dramas: FeishuDramaRecord[]): FeishuDramaRecord | null {
  const now = dayjs().tz('Asia/Shanghai')
  const todayEnd = now.endOf('day')

  // 最多提前30分钟搭建
  const ADVANCE_BUILD_MINUTES = 30

  // 提取上架时间
  const getPublishTime = (drama: FeishuDramaRecord): dayjs.Dayjs | null => {
    const timeField = drama.fields['上架时间']
    if (!timeField?.value?.[0]) return null
    return dayjs(timeField.value[0]).tz('Asia/Shanghai')
  }

  // 检查剧集是否可以开始搭建（当前时间 >= 上架时间 - 30分钟）
  const canBuildNow = (drama: FeishuDramaRecord): boolean => {
    const publishTime = getPublishTime(drama)
    if (!publishTime) return false
    // 允许搭建的最早时间 = 上架时间 - 30分钟
    const earliestBuildTime = publishTime.subtract(ADVANCE_BUILD_MINUTES, 'minute')
    return now.isAfter(earliestBuildTime) || now.isSame(earliestBuildTime)
  }

  // 过滤出可以搭建的剧集
  const buildableDramas = dramas.filter(drama => {
    const publishTime = getPublishTime(drama)
    if (!publishTime) return false

    if (!canBuildNow(drama)) {
      const dramaName = drama.fields['剧名']?.[0]?.text || '未知'
      console.log(
        `[优先级选择] 跳过 "${dramaName}"：上架时间 ${publishTime.format('YYYY-MM-DD HH:mm')}，还未到可搭建时间（最早提前${ADVANCE_BUILD_MINUTES}分钟）`
      )
      return false
    }
    return true
  })

  if (buildableDramas.length === 0) return null

  // 按优先级排序
  buildableDramas.sort((a, b) => {
    const aPublishTime = getPublishTime(a)!
    const bPublishTime = getPublishTime(b)!

    // 判断是否是过期或今天的剧
    const aIsExpiredOrToday = aPublishTime.isBefore(todayEnd) || aPublishTime.isSame(todayEnd)
    const bIsExpiredOrToday = bPublishTime.isBefore(todayEnd) || bPublishTime.isSame(todayEnd)

    // 过期/今天的剧优先于未来的剧
    if (aIsExpiredOrToday !== bIsExpiredOrToday) {
      return aIsExpiredOrToday ? -1 : 1
    }

    // 同优先级按上架时间升序
    return aPublishTime.valueOf() - bPublishTime.valueOf()
  })

  return buildableDramas[0]
}

// 资产化步骤定义
const assetizationSteps = computed(() => [
  { key: 1, title: '上传账户头像' },
  { key: 2, title: '创建推广链接' },
  { key: 3, title: isCreatingMicroApp.value ? '创建小程序' : '查询小程序' },
  { key: 4, title: '创建小程序资产' },
  { key: 5, title: '添加付费事件' },
])

// 获取步骤状态
function getStepStatus(stepKey: number): 'process' | 'finish' | 'error' | 'wait' {
  if (currentAssetizationStep.value > stepKey) {
    return 'finish'
  }
  if (currentAssetizationStep.value === stepKey) {
    return isBuilding.value ? 'process' : 'error'
  }
  return 'wait'
}

// 统计信息
const statistics = computed(() => {
  const total = buildRecords.value.length
  const success = buildRecords.value.filter(r => r.status === 'success').length
  const failed = buildRecords.value.filter(r => r.status === 'failed').length
  const running = buildRecords.value.filter(r => r.status === 'running').length
  const pending = buildRecords.value.filter(r => r.status === 'pending').length

  return { total, success, failed, running, pending }
})

// 是否显示进度
const showProgress = computed(() => buildRecords.value.length > 0)

// 监听显示状态变化
function handleUpdateShow(show: boolean) {
  if (!show) {
    resetState()
  }
  emit('update:show', show)
}

// 监听弹窗显示状态，自动加载数据
watch(
  () => props.show,
  async (newShow, oldShow) => {
    // 从关闭到打开时，自动加载数据
    if (newShow && !oldShow) {
      await Promise.all([loadPendingDramas(), loadBackgroundSchedulerStatus()])
      // 如果后台调度器正在运行，开始轮询状态
      if (backgroundSchedulerStatus.value?.enabled) {
        startBackgroundStatusPolling()
      }
    }
    // 弹窗关闭时，清理定时器
    if (!newShow) {
      stopAutoPolling()
      stopBackgroundStatusPolling()
      showRunModeSelector.value = false
    }
  },
  { immediate: false }
)

// 加载待资产化的剧集列表
async function loadPendingDramas() {
  if (isLoadingDramas.value || isBuilding.value) return

  try {
    isLoadingDramas.value = true
    buildError.value = null

    console.log('========== 查询待搭建剧集 ==========')
    const result = await feishuApi.getPendingSetupDramas(undefined, undefined, true, true)
    const items = result.data?.items || []

    // 按日期排序（日期早的排在前面）
    dramas.value = items.sort((a, b) => {
      const dateA = a.fields['日期'] || 0
      const dateB = b.fields['日期'] || 0
      return dateA - dateB
    })

    console.log(`找到 ${dramas.value.length} 部待搭建剧集（已按日期排序）`)

    // 从飞书状态表的"抖音素材"字段解析抖音号配置
    if (dramas.value.length > 0) {
      const firstDrama = dramas.value[0]
      const douyinMaterialField = firstDrama.fields['抖音素材']?.[0]?.text
      douyinConfigs.value = parseDouyinMaterialFromFeishu(douyinMaterialField)
      console.log(
        `从飞书状态表解析到 ${douyinConfigs.value.length} 个抖音号配置:`,
        douyinConfigs.value
      )
    } else {
      douyinConfigs.value = []
    }
  } catch (error) {
    console.error('查询待资产化剧集失败:', error)
    buildError.value = getErrorMessage(error)
  } finally {
    isLoadingDramas.value = false
  }
}

/**
 * 开始自动轮询
 */
async function startAutoPolling(intervalMinutes: number) {
  if (!intervalMinutes) return

  pollingInterval.value = intervalMinutes
  autoPollingEnabled.value = true
  pollingStats.value = { totalBuilt: 0, successCount: 0, failCount: 0 }

  message.success(`已启动自动搭建，轮询间隔：${intervalMinutes}分钟`)

  // 立即执行第一次轮询
  await executePollingCycle()
}

/**
 * 执行一次轮询周期
 */
async function executePollingCycle() {
  if (!autoPollingEnabled.value) return

  try {
    // 1. 加载待搭建剧集
    console.log('========== 开始轮询周期 ==========')
    isLoadingDramas.value = true
    const result = await feishuApi.getPendingSetupDramas(
      undefined,
      undefined,
      true, // 使用每日主体表格
      true // 包含短剧ID字段
    )
    dramas.value = result.data?.items || []
    isLoadingDramas.value = false

    console.log(`查询到 ${dramas.value.length} 部待搭建剧集`)

    // 2. 选择最高优先级剧集
    const selectedDrama = selectHighestPriorityDrama(dramas.value)

    if (!selectedDrama) {
      console.log('未找到符合条件的剧集，等待下次轮询')
      scheduleNextPolling()
      return
    }

    // 3. 搭建该剧集
    console.log(`选中剧集: ${selectedDrama.fields['剧名']?.[0]?.text}`)
    await buildSingleDramaInPolling(selectedDrama)

    // 4. 统计
    pollingStats.value.totalBuilt++
    pollingStats.value.successCount++

    // 5. 安排下次轮询
    scheduleNextPolling()
  } catch (error) {
    console.error('轮询周期失败:', error)
    stopAutoPolling()
    buildError.value = `自动搭建失败: ${getErrorMessage(error)}`
    pollingStats.value.failCount++
  }
}

/**
 * 在轮询模式下搭建单个剧集
 */
async function buildSingleDramaInPolling(drama: FeishuDramaRecord) {
  isBuilding.value = true

  // 从当前剧集的"抖音素材"字段解析配置
  const douyinMaterialField = drama.fields['抖音素材']?.[0]?.text
  const dramaDouyinConfigs = parseDouyinMaterialFromFeishu(douyinMaterialField)
  console.log(
    `剧集 ${drama.fields['剧名']?.[0]?.text} 解析到 ${dramaDouyinConfigs.length} 个抖音号配置`
  )

  // 初始化搭建记录（showProgress会自动变为true）
  buildRecords.value = [
    {
      id: drama.record_id,
      index: 1,
      dramaName: drama.fields['剧名']?.[0]?.text || '未知',
      accountId: drama.fields['账户']?.[0]?.text || '未知',
      date: drama.fields['日期'] || undefined,
      publishTime: drama.fields['上架时间']?.value?.[0] || undefined,
      status: 'pending',
      totalBatches: dramaDouyinConfigs.length,
      completedBatches: 0,
      currentPhase: '资产化',
      douyinConfigs: dramaDouyinConfigs, // 存储该剧集的抖音配置
    },
  ]

  currentDramaIndex.value = 0

  try {
    await executeSingleDramaBuild(drama, buildRecords.value[0])
    buildRecords.value[0].status = 'success'
  } catch (error) {
    buildRecords.value[0].status = 'failed'
    throw error
  } finally {
    isBuilding.value = false
  }
}

/**
 * 安排下次轮询
 */
function scheduleNextPolling() {
  if (!pollingInterval.value || !autoPollingEnabled.value) return

  const intervalMs = pollingInterval.value * 60 * 1000
  nextPollingTime.value = Date.now() + intervalMs
  countdown.value = pollingInterval.value * 60

  // 开始倒计时
  startCountdown()

  // 设置下次轮询
  pollingTimer.value = setTimeout(() => {
    executePollingCycle()
  }, intervalMs)
}

/**
 * 开始倒计时
 */
function startCountdown() {
  stopCountdown()
  countdownTimer.value = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      stopCountdown()
    }
  }, 1000)
}

/**
 * 停止倒计时
 */
function stopCountdown() {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }
}

/**
 * 停止自动轮询
 */
function stopAutoPolling() {
  autoPollingEnabled.value = false

  if (pollingTimer.value) {
    clearTimeout(pollingTimer.value)
    pollingTimer.value = null
  }

  stopCountdown()

  // message.info('已停止自动搭建')
}

// ============== 后台调度器相关方法 ==============

/**
 * 加载后台调度器状态
 */
async function loadBackgroundSchedulerStatus() {
  try {
    isLoadingBackgroundStatus.value = true
    const result = await dailyBuildApi.getBackgroundSchedulerStatus()
    backgroundSchedulerStatus.value = result.data

    // 如果后台没有正在运行的任务，清空搭建中状态
    if (!result.data.currentTask) {
      manuallyBuildingIds.value.clear()
    }
  } catch (error) {
    console.error('加载后台调度器状态失败:', error)
  } finally {
    isLoadingBackgroundStatus.value = false
  }
}

/**
 * 启动后台调度器
 */
async function startBackgroundScheduler(intervalMinutes: number) {
  try {
    const result = await dailyBuildApi.startBackgroundScheduler(intervalMinutes)
    backgroundSchedulerStatus.value = result.data
    message.success(`后台调度器已启动，轮询间隔：${intervalMinutes}分钟`)

    // 开始轮询后台状态
    startBackgroundStatusPolling()
  } catch (error) {
    console.error('启动后台调度器失败:', error)
    message.error(`启动后台调度器失败: ${getErrorMessage(error)}`)
  }
}

/**
 * 停止后台调度器
 */
async function stopBackgroundScheduler() {
  try {
    const result = await dailyBuildApi.stopBackgroundScheduler()
    backgroundSchedulerStatus.value = result.data
    message.info('后台调度器已停止')

    // 停止轮询后台状态
    stopBackgroundStatusPolling()
  } catch (error) {
    console.error('停止后台调度器失败:', error)
    message.error(`停止后台调度器失败: ${getErrorMessage(error)}`)
  }
}

/**
 * 开始轮询后台调度器状态
 */
function startBackgroundStatusPolling() {
  stopBackgroundStatusPolling()
  // 每10秒轮询一次状态
  backgroundPollingTimer.value = setInterval(() => {
    loadBackgroundSchedulerStatus()
  }, 10000)
}

/**
 * 停止轮询后台调度器状态
 */
function stopBackgroundStatusPolling() {
  if (backgroundPollingTimer.value) {
    clearInterval(backgroundPollingTimer.value)
    backgroundPollingTimer.value = null
  }
}

/**
 * 处理轮询间隔选择变化
 */
function handlePollingIntervalChange(value: number) {
  pollingInterval.value = value
  showRunModeSelector.value = true
}

/**
 * 确认开始轮询（根据运行模式）
 */
async function confirmStartPolling() {
  if (!pollingInterval.value) {
    message.warning('请先选择轮询间隔')
    return
  }

  showRunModeSelector.value = false

  if (runMode.value === 'frontend') {
    // 前台运行
    await startAutoPolling(pollingInterval.value)
  } else {
    // 后台运行
    await startBackgroundScheduler(pollingInterval.value)
  }
}

/**
 * 取消运行模式选择
 */
function cancelRunModeSelection() {
  showRunModeSelector.value = false
  pollingInterval.value = null
}

/**
 * 格式化后台调度器时间
 */
function formatBackgroundTime(timeStr: string | null): string {
  if (!timeStr) return '-'
  return dayjs(timeStr).format('MM-DD HH:mm:ss')
}

/**
 * 格式化任务历史中的日期（飞书时间戳）
 */
function formatTaskDate(timestamp: number | null): string {
  if (!timestamp) return ''
  return dayjs(timestamp).format('MM-DD')
}

/**
 * 格式化任务历史中的上架时间（飞书时间戳）
 */
function formatTaskPublishTime(timestamp: number | null): string {
  if (!timestamp) return ''
  return dayjs(timestamp).format('MM-DD HH:mm')
}

/**
 * 格式化倒计时显示
 */
function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`
  }
  if (minutes > 0) {
    return `${minutes}分${secs}秒`
  }
  return `${secs}秒`
}

// 重置状态
function resetState() {
  dramas.value = []
  buildRecords.value = []
  isBuilding.value = false
  buildError.value = null
  currentDramaIndex.value = 0
  currentPhase.value = '资产化'
  currentAssetizationStep.value = 0
  isCreatingMicroApp.value = false
  waitingCountdown.value = 0

  // 清理轮询相关状态
  stopAutoPolling()
  pollingStats.value = { totalBuilt: 0, successCount: 0, failCount: 0 }

  // 清理运行模式选择和后台调度器状态轮询
  showRunModeSelector.value = false
  runMode.value = 'frontend'
  stopBackgroundStatusPolling()
}

// 开始搭建单个剧集
async function handleBuildSingleDrama(drama: FeishuDramaRecord) {
  // 如果后台调度器正在运行，使用后台手动搭建模式
  if (backgroundSchedulerStatus.value?.enabled) {
    await handleBackgroundManualBuild(drama)
  } else {
    await startAutoBuildWithDramas([drama])
  }
}

// 后台模式下的手动搭建
async function handleBackgroundManualBuild(drama: FeishuDramaRecord) {
  const dramaId = drama.record_id
  const dramaName = drama.fields['剧名']?.[0]?.text || '未知'

  // 添加到搭建中集合
  manuallyBuildingIds.value.add(dramaId)

  // 立即返回提示
  message.success(`已提交至后台搭建：${dramaName}`)

  // 异步调用后台搭建API，不等待结果
  dailyBuildApi
    .triggerBackgroundSchedulerBuild({
      dramaId: dramaId, // 传递剧集ID，指定搭建该剧集
    })
    .then(() => {
      // 刷新状态
      loadBackgroundSchedulerStatus()
    })
    .catch(error => {
      console.error('提交手动搭建失败:', error)
      message.error(`提交搭建失败: ${getErrorMessage(error)}`)
      // 失败时移除搭建中状态
      manuallyBuildingIds.value.delete(dramaId)
    })
}

// 开始批量搭建（选中的剧集）
async function startAutoBuild() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要搭建的剧集')
    return
  }

  // 根据选中的 record_id 筛选剧集
  const selectedDramas = dramas.value.filter(drama =>
    selectedRowKeys.value.includes(drama.record_id)
  )

  if (selectedDramas.length === 0) {
    message.warning('没有找到选中的剧集')
    return
  }

  await startAutoBuildWithDramas(selectedDramas)
}

// 执行搭建流程
async function startAutoBuildWithDramas(dramasToBeBuilt: FeishuDramaRecord[]) {
  try {
    isBuilding.value = true
    buildError.value = null

    // 初始化搭建记录（使用待搭建的剧集数据）
    buildRecords.value = dramasToBeBuilt.map((drama, index) => {
      // 从当前剧集的"抖音素材"字段解析配置
      const douyinMaterialField = drama.fields['抖音素材']?.[0]?.text
      const dramaDouyinConfigs = parseDouyinMaterialFromFeishu(douyinMaterialField)
      console.log(
        `剧集 ${drama.fields['剧名']?.[0]?.text} 解析到 ${dramaDouyinConfigs.length} 个抖音号配置`
      )

      return {
        id: drama.record_id,
        index: index + 1,
        dramaName: drama.fields['剧名']?.[0]?.text || '未知',
        accountId: drama.fields['账户']?.[0]?.text || '未知',
        date: drama.fields['日期'] || undefined,
        publishTime: drama.fields['上架时间']?.value?.[0] || undefined,
        status: 'pending',
        currentPhase: '资产化',
        totalBatches: dramaDouyinConfigs.length,
        completedBatches: 0,
        douyinConfigs: dramaDouyinConfigs, // 存储该剧集的抖音配置
      }
    })

    console.log('开始自动搭建流程:', buildRecords.value.length, '部剧')

    // 临时替换 dramas 以便 executeBuildProcess 使用
    const originalDramas = dramas.value
    dramas.value = dramasToBeBuilt

    // 执行主流程
    await executeBuildProcess()

    // 恢复原始 dramas
    dramas.value = originalDramas

    isBuilding.value = false
    message.success('自动搭建流程已完成')

    // 清空选中状态
    selectedRowKeys.value = []

    // 刷新剧集列表
    await loadPendingDramas()
  } catch (error) {
    console.error('自动搭建失败:', error)
    buildError.value = getErrorMessage(error)
    isBuilding.value = false
  }
}

// 主流程循环
async function executeBuildProcess() {
  for (let i = 0; i < dramas.value.length; i++) {
    const drama = dramas.value[i]
    const record = buildRecords.value[i]
    currentDramaIndex.value = i + 1

    // 更新状态为运行中
    record.status = 'running'
    record.currentPhase = '资产化'

    try {
      // 执行资产化
      console.log(
        `\n========== [${i + 1}/${dramas.value.length}] 开始资产化: ${record.dramaName} ==========`
      )
      currentPhase.value = '资产化'
      const initData = await executeAssetization(drama, record)

      // 执行搭建
      console.log(
        `\n========== [${i + 1}/${dramas.value.length}] 开始搭建: ${record.dramaName} ==========`
      )
      currentPhase.value = '搭建'
      record.currentPhase = '搭建'
      await executeSetup(drama, initData, record)

      // 更新飞书状态为"已完成"
      try {
        const buildTime = Date.now()
        await feishuApi.updateDramaStatus(drama.record_id, '已完成', buildTime)
        console.log(`✅ 剧集 ${record.dramaName} 状态已更新为"已完成"，搭建时间: ${buildTime}`)
      } catch (statusError) {
        console.error('❌ 更新飞书状态失败:', statusError)
        message.warning(`剧集 ${record.dramaName} 搭建成功，但飞书状态更新失败，请手动检查！`)
      }

      // 标记为成功
      record.status = 'success'
      record.currentPhase = '完成'
      console.log(`✅ 剧集 ${record.dramaName} 完成`)
    } catch (error: any) {
      // 如果是小程序未审核通过的特定错误，显示警告并跳过
      if (error?.code === 'MICROAPP_NOT_APPROVED') {
        console.warn(`⚠️ 剧集 ${record.dramaName} 跳过: ${error.message}`)
        message.warning(`⚠️ ${record.dramaName}: ${error.message}`)
        record.status = 'skipped'
        record.errorMessage = error.message

        // 更新飞书状态为"跳过搭建"
        try {
          await feishuApi.updateDramaStatus(drama.record_id, '跳过搭建')
          console.log(`✅ 剧集 ${record.dramaName} 状态已更新为"跳过搭建"`)
        } catch (statusError) {
          console.error('❌ 更新飞书状态失败:', statusError)
        }

        // 继续下一个剧集
        continue
      }

      console.error(`❌ 剧集 ${record.dramaName} 失败:`, error)
      record.status = 'failed'
      record.errorMessage = getErrorMessage(error)

      // 如果是资产化阶段失败，记录失败阶段
      if (record.currentPhase === '资产化') {
        record.failedPhase = '资产化'
      } else {
        record.failedPhase = '搭建'
      }

      // 更新飞书状态为"搭建失败"
      try {
        await feishuApi.updateDramaStatus(drama.record_id, '搭建失败')
        console.log(`✅ 剧集 ${record.dramaName} 状态已更新为"搭建失败"`)
      } catch (statusError) {
        console.error('❌ 更新飞书状态失败:', statusError)
      }

      // 继续下一个剧集
      continue
    }
  }
}

// 执行单个剧集的完整搭建流程（用于轮询模式）
async function executeSingleDramaBuild(
  drama: FeishuDramaRecord,
  record: AutoBuildRecord
): Promise<void> {
  // 更新状态为运行中
  record.status = 'running'
  record.currentPhase = '资产化'

  try {
    // 执行资产化
    console.log(`\n========== 开始资产化: ${record.dramaName} ==========`)
    currentPhase.value = '资产化'
    const initData = await executeAssetization(drama, record)

    // 执行搭建
    console.log(`\n========== 开始搭建: ${record.dramaName} ==========`)
    currentPhase.value = '搭建'
    record.currentPhase = '搭建'
    await executeSetup(drama, initData, record)

    // 更新飞书状态为"已完成"
    try {
      const buildTime = Date.now()
      await feishuApi.updateDramaStatus(drama.record_id, '已完成', buildTime)
      console.log(`✅ 剧集 ${record.dramaName} 状态已更新为"已完成"，搭建时间: ${buildTime}`)
    } catch (statusError) {
      console.error('❌ 更新飞书状态失败:', statusError)
      message.warning(`剧集 ${record.dramaName} 搭建成功，但飞书状态更新失败，请手动检查！`)
    }

    // 标记为成功
    record.status = 'success'
    record.currentPhase = '完成'
    console.log(`✅ 剧集 ${record.dramaName} 完成`)
  } catch (error: any) {
    console.error(`❌ 剧集 ${record.dramaName} 失败:`, error)
    record.status = 'failed'
    record.errorMessage = getErrorMessage(error)

    // 如果是资产化阶段失败，记录失败阶段
    if (record.currentPhase === '资产化') {
      record.failedPhase = '资产化'
    } else {
      record.failedPhase = '搭建'
    }

    // 判断是跳过还是失败
    const isSkip = error?.code === 'MICROAPP_NOT_APPROVED'
    const statusText = isSkip ? '跳过搭建' : '搭建失败'

    // 更新飞书状态
    try {
      await feishuApi.updateDramaStatus(drama.record_id, statusText)
      console.log(`✅ 剧集 ${record.dramaName} 状态已更新为"${statusText}"`)
    } catch (statusError) {
      console.error('❌ 更新飞书状态失败:', statusError)
    }

    throw error // 在轮询模式下，抛出错误以停止轮询
  }
}

// 执行资产化（6步）
async function executeAssetization(
  drama: FeishuDramaRecord,
  record: AutoBuildRecord
): Promise<InitializationData> {
  const dramaName = drama.fields['剧名']?.[0]?.text
  const bookId = drama.fields['短剧ID']?.value?.[0]?.text
  const accountId = drama.fields['账户']?.[0]?.text

  if (!dramaName || !bookId || !accountId) {
    throw new Error('剧集信息不完整')
  }

  // 步骤1: 上传账户头像
  currentAssetizationStep.value = 1
  record.assetizationStep = 1
  console.log('步骤1: 上传账户头像')
  const avatarUploadResult = await dailyBuildApi.uploadAvatarImage(accountId)
  await dailyBuildApi.saveAvatar({
    account_id: accountId,
    web_uri: avatarUploadResult.data.image_info.web_uri,
    width: 300,
    height: 300,
  })

  // 步骤2: 创建推广链接（用于小程序资产）
  currentAssetizationStep.value = 2
  record.assetizationStep = 2
  console.log('步骤2: 创建推广链接（用于小程序资产）')
  const promotionResult = await dailyBuildApi.createPromotionLink({
    book_id: bookId,
    drama_name: dramaName,
  })

  // 步骤3: 查询/创建小程序
  currentAssetizationStep.value = 3
  record.assetizationStep = 3
  console.log('步骤3: 查询/创建小程序')

  let microApp

  // 1. 首先查询账户自己的已审核通过的小程序（search_type=1）
  console.log('查询账户自己的小程序 (search_type=1)...')
  const microAppResult = await dailyBuildApi.queryMicroApp(accountId)

  if (microAppResult.data?.micro_app && microAppResult.data.micro_app.length > 0) {
    // 检查是否有已审核通过的小程序
    const approvedMicroApp = microAppResult.data.micro_app.find(
      (app: { status: number }) => app.status === 1
    )
    if (approvedMicroApp) {
      microApp = approvedMicroApp
      console.log('✓ 找到账户自己的已审核通过的小程序:', microApp.micro_app_instance_id)
    }
  }

  // 2. 如果没有找到账户自己的已审核通过的小程序，查询被共享的小程序（search_type=2）
  if (!microApp) {
    console.log('未找到账户自己的已审核通过的小程序，查询被共享的小程序 (search_type=2)...')
    const approvedResult = await dailyBuildApi.queryApprovedMicroApp(accountId)

    if (approvedResult.data?.found && approvedResult.data.micro_app) {
      microApp = approvedResult.data.micro_app
      console.log('✓ 找到被共享的已审核通过的小程序:', microApp.micro_app_instance_id)
    }
  }

  // 3. 如果都没有找到，检查是否需要创建
  if (!microApp) {
    console.log('未找到任何已审核通过的小程序，检查是否需要创建...')

    // 检查是否有未审核通过的小程序
    if (microAppResult.data?.micro_app && microAppResult.data.micro_app.length > 0) {
      // 有小程序但都未审核通过，跳过搭建
      const firstMicroApp = microAppResult.data.micro_app[0]
      console.log('小程序存在但未审核通过，状态:', firstMicroApp.status)
      const error = new Error('小程序未审核通过，跳过此剧集的搭建') as any
      error.code = 'MICROAPP_NOT_APPROVED'
      throw error
    }

    // 小程序不存在，自动创建
    console.log('小程序不存在，开始自动创建')
    isCreatingMicroApp.value = true

    const parsed = parsePromotionUrl(promotionResult.promotion_url)
    const appId = extractAppIdFromParams(parsed.launchParams)

    if (!appId) {
      throw new Error('无法从推广链接参数中提取 app_id')
    }

    const cleanedParams = parsed.launchParams
      .split('&')
      .filter(param => !param.startsWith('app_id='))
      .join('&')

    const microAppLink = generateMicroAppLink({
      appId,
      startPage: parsed.launchPage,
      startParams: cleanedParams,
    })

    // 调用创建 API
    await dailyBuildApi.createMicroApp({
      account_id: accountId,
      app_id: appId,
      path: parsed.launchPage,
      query: parsed.launchParams,
      remark: promotionResult.promotion_name,
      link: microAppLink,
    })

    console.log('小程序创建成功，等待30秒后查询...')
    waitingCountdown.value = 30
    for (let i = 30; i > 0; i--) {
      waitingCountdown.value = i
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    waitingCountdown.value = 0

    // 第一次重新查询
    let recheckResult = await dailyBuildApi.queryMicroApp(accountId)

    if (!recheckResult.data?.micro_app || recheckResult.data.micro_app.length === 0) {
      console.log('第一次未查询到小程序，等待10秒后重试...')
      waitingCountdown.value = 10
      for (let i = 10; i > 0; i--) {
        waitingCountdown.value = i
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      waitingCountdown.value = 0

      recheckResult = await dailyBuildApi.queryMicroApp(accountId)

      if (!recheckResult.data?.micro_app || recheckResult.data.micro_app.length === 0) {
        isCreatingMicroApp.value = false
        throw new Error('小程序创建后查询失败（已重试2次）')
      }
    }

    microApp = recheckResult.data.micro_app[0]
    isCreatingMicroApp.value = false
  }

  // 步骤4: 查询/创建小程序资产
  currentAssetizationStep.value = 4
  record.assetizationStep = 4
  console.log('步骤4: 查询/创建小程序资产')
  const assetsListResult = await dailyBuildApi.listMicroAppAssets(accountId)

  let assetsId: string | number

  if (assetsListResult.data?.micro_app && assetsListResult.data.micro_app.length > 0) {
    assetsId = assetsListResult.data.micro_app[0].assets_id
    console.log('小程序资产已存在，assets_id:', assetsId)
  } else {
    console.log('小程序资产不存在，开始创建')
    const assetResult = await dailyBuildApi.createMicroAppAsset({
      account_id: accountId,
      micro_app_instance_id: microApp.micro_app_instance_id,
    })
    assetsId = assetResult.assets_id
  }

  // 步骤5: 检查并添加付费事件
  currentAssetizationStep.value = 5
  record.assetizationStep = 5
  console.log('步骤5: 检查并添加付费事件')
  const eventStatusResult = await dailyBuildApi.checkEventStatus({
    account_id: accountId,
    assets_id: assetsId,
  })

  if (eventStatusResult.has_payment_event) {
    console.log('付费事件已存在，跳过添加')
  } else {
    console.log('付费事件不存在，开始添加')
    await dailyBuildApi.addPaymentEvent({
      account_id: accountId,
      assets_id: assetsId,
    })
  }

  // 上传主图
  console.log('上传主图')
  const uploadResult = await dailyBuildApi.uploadProductImage(accountId)
  if (uploadResult.code !== 0) {
    throw new Error(uploadResult.msg || uploadResult.message || '上传主图失败')
  }
  const imageInfo = uploadResult.data

  // 返回初始化数据
  const initData: InitializationData = {
    assets_id: assetsId,
    micro_app_instance_id: microApp.micro_app_instance_id,
    app_id: microApp.app_id || '',
    start_page: microApp.start_page || '',
    app_type: 2,
    start_params: '',
    link: '',
    product_image_width: imageInfo.width,
    product_image_height: imageInfo.height,
    product_image_uri: imageInfo.web_uri,
  }

  console.log('资产化完成，initData:', initData)
  return initData
}

// 执行搭建（N个抖音号批次）
async function executeSetup(
  drama: FeishuDramaRecord,
  initData: InitializationData,
  record: AutoBuildRecord
): Promise<void> {
  const dramaName = drama.fields['剧名']?.[0]?.text
  const accountId = drama.fields['账户']?.[0]?.text

  if (!dramaName || !accountId) {
    throw new Error('剧集信息不完整')
  }

  // 使用当前剧集的抖音配置
  const configs = record.douyinConfigs || []
  if (configs.length === 0) {
    throw new Error('该剧集没有配置抖音号，请检查飞书状态表的"抖音素材"字段')
  }

  const skippedBatches: Array<{ account: string; reason: string }> = []
  let hasSuccessBatch = false

  // 遍历每个抖音号批次
  for (const config of configs) {
    try {
      // 更新当前批次信息
      currentBatchInfo.value = `正在搭建抖音号-${config.douyinAccount}`

      await buildBatchForDouyin(drama, config, initData, record, dramaName, accountId)
      record.completedBatches++
      hasSuccessBatch = true
      console.log(`✅ 抖音号 ${config.douyinAccount} 批次完成`)
    } catch (error) {
      const errorMsg = getErrorMessage(error)
      console.warn(`⚠️ 抖音号 ${config.douyinAccount} 批次跳过: ${errorMsg}`)

      skippedBatches.push({
        account: config.douyinAccount,
        reason: errorMsg,
      })

      continue
    }
  }

  // 清空批次信息
  currentBatchInfo.value = ''

  // 如果所有批次都失败，抛出错误
  if (!hasSuccessBatch) {
    const skippedInfo = skippedBatches.map(b => `${b.account}: ${b.reason}`).join('; ')
    throw new Error(`所有抖音号批次均失败: ${skippedInfo}`)
  }

  // 保存跳过的批次信息
  if (skippedBatches.length > 0) {
    record.skippedBatches = skippedBatches
    console.log(
      `📊 剧集 ${dramaName} 完成，成功: ${record.completedBatches}/${configs.length}，` +
        `跳过: ${skippedBatches.map(b => b.account).join(', ')}`
    )
  }
}

// 为单个抖音号批次创建项目和广告
async function buildBatchForDouyin(
  drama: FeishuDramaRecord,
  config: { douyinAccount: string; douyinAccountId: string; materialRange: string },
  initData: InitializationData,
  record: AutoBuildRecord,
  dramaName: string,
  accountId: string
): Promise<void> {
  // 0. 创建推广链接（每个批次独立，用于广告）
  record.failedStep = '创建推广链接'
  const bookId = drama.fields['短剧ID']?.value?.[0]?.text
  if (!bookId) {
    throw new Error('短剧ID不存在')
  }

  const cleanDramaName = sanitizeDramaName(dramaName)
  const promotionName = `小红-${config.douyinAccount}-${cleanDramaName}-${accountId}`

  const promotionResult = await dailyBuildApi.createPromotionLink({
    book_id: bookId,
    drama_name: dramaName,
    promotion_name: promotionName,
  })

  const parsed = parsePromotionUrl(promotionResult.promotion_url)
  const appId = extractAppIdFromParams(parsed.launchParams)
  if (!appId) {
    throw new Error('无法从推广链接参数中提取 app_id')
  }

  const cleanedParams = parsed.launchParams
    .split('&')
    .filter(param => !param.startsWith('app_id='))
    .join('&')

  const microAppLink = generateMicroAppLink({
    appId,
    startPage: parsed.launchPage,
    startParams: cleanedParams,
  })

  initData.app_id = appId
  initData.start_page = parsed.launchPage
  initData.start_params = cleanedParams
  initData.link = microAppLink
  initData.app_type = 2

  // 1. 创建项目
  record.failedStep = '创建项目'
  const projectName = `小红-${config.douyinAccount}-${dramaName}-${buildDate.value}`

  const projectResult = await dailyBuildApi.createProject({
    account_id: accountId,
    drama_name: dramaName,
    douyin_account_name: config.douyinAccount,
    assets_id: initData.assets_id,
    micro_app_instance_id: initData.micro_app_instance_id,
    project_name: projectName,
  })

  const projectId = projectResult.data.id

  // 2. 获取抖音号原始ID
  record.failedStep = '获取抖音号信息'
  const accountInfoResult = await dailyBuildApi.getDouyinAccountInfo({
    account_id: accountId,
    douyin_account_id: config.douyinAccountId,
  })

  if (accountInfoResult.code !== 0) {
    throw new Error(accountInfoResult.msg || accountInfoResult.message || '获取抖音号信息失败')
  }

  const accountInfo = accountInfoResult.data?.[0]
  if (!accountInfo) {
    throw new Error(`找不到抖音号 ${config.douyinAccount} 的信息`)
  }

  const iesCoreUserId = accountInfo.ies_core_id

  // 3. 获取素材列表
  record.failedStep = '获取素材列表'
  const materialsResult = await dailyBuildApi.getMaterialList({
    account_id: accountId,
    aweme_id: config.douyinAccountId,
    aweme_account: iesCoreUserId,
  })

  // 检查返回结果
  if (materialsResult.code !== 0) {
    throw new Error(
      materialsResult.msg || materialsResult.error || materialsResult.message || '获取素材列表失败'
    )
  }

  // 4. 过滤素材
  record.failedStep = '过滤素材'

  // 将 API 返回的数据格式转换为 Material 格式（video_name -> filename）
  const allMaterials: Material[] =
    materialsResult.data.videos?.map((video: Material & { video_name?: string }) => ({
      ...video,
      filename: video.video_name || video.filename, // 将 video_name 映射为 filename
    })) || []

  // 从飞书记录中提取日期并转换为 "M.D" 格式
  let dateString: string | undefined
  const feishuDate = drama.fields['日期']
  if (feishuDate) {
    const date = new Date(feishuDate)
    dateString = `${date.getMonth() + 1}.${date.getDate()}` // 转换为 "M.D" 格式
    console.log(`飞书日期: ${feishuDate} -> ${dateString}`)
  }

  const filteredMaterials = filterMaterials(
    allMaterials,
    dramaName,
    config.materialRange,
    dateString
  )
  const sortedMaterials = sortMaterialsBySequence(filteredMaterials)

  if (sortedMaterials.length === 0) {
    throw new Error(`素材不足：没有找到符合条件的素材（日期=${dateString || '不限'}）`)
  }

  // 5. 创建广告（最多重试1次）
  record.failedStep = '创建广告'
  const adName = `小红-${config.douyinAccount}-${dramaName}-${buildDate.value}`

  let promotionId: string | undefined
  let retryCount = 0
  const maxRetries = 1

  while (retryCount <= maxRetries) {
    try {
      const promotionResult = await dailyBuildApi.createPromotion({
        account_id: accountId,
        project_id: projectId,
        ad_name: adName,
        drama_name: dramaName,
        ies_core_user_id: iesCoreUserId,
        materials: sortedMaterials.slice(0, 6),
        app_id: initData.app_id,
        start_page: initData.start_page,
        app_type: initData.app_type,
        start_params: initData.start_params,
        link: initData.link,
        product_image_uri: initData.product_image_uri,
        product_image_width: initData.product_image_width,
        product_image_height: initData.product_image_height,
      })

      // 检查返回结果的 code
      if (promotionResult.code !== 0) {
        throw new Error(
          promotionResult.msg || promotionResult.error || promotionResult.message || '创建广告失败'
        )
      }

      promotionId = promotionResult.data.promotion_id
      console.log(`✅ 广告创建成功: ${promotionId}`)
      break
    } catch (error) {
      const errorMsg = getErrorMessage(error)

      // 如果是项目名称重复错误，直接跳过
      if (errorMsg.includes('项目名称重复') || errorMsg.includes('code 50100')) {
        throw new Error(`项目名称重复：${projectName}`)
      }

      // 其他错误，尝试重试
      if (retryCount < maxRetries) {
        console.warn(`广告创建失败，重试 ${retryCount + 1}/${maxRetries}...`)
        retryCount++
        await new Promise(resolve => setTimeout(resolve, 2000))
      } else {
        throw error
      }
    }
  }

  if (!promotionId) {
    throw new Error('广告创建失败')
  }
}

// 继续搭建（返回列表状态）
async function handleContinueBuild() {
  // 清空搭建记录，切换到列表状态
  buildRecords.value = []
  selectedRowKeys.value = []

  // 刷新剧集列表
  await loadPendingDramas()
}

// 关闭弹窗
function handleClose() {
  if (isBuilding.value) {
    message.warning('搭建正在进行中，请稍候...')
    return
  }
  emit('update:show', false)
}
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    :style="{ width: '90%', maxWidth: '1200px' }"
    :segmented="{ content: true, footer: 'soft' }"
    :closable="!isBuilding"
    :mask-closable="false"
    @update:show="handleUpdateShow"
  >
    <!-- 自定义标题 -->
    <template #header>
      <div class="modal-header">
        <span>提交搭建</span>
        <div class="header-actions">
          <n-select
            v-model:value="pollingInterval"
            :options="pollingOptions"
            placeholder="开始自动搭建"
            :disabled="
              autoPollingEnabled ||
              isBuilding ||
              backgroundSchedulerStatus?.enabled ||
              showRunModeSelector
            "
            style="width: 160px"
            @update:value="handlePollingIntervalChange"
          />
          <!-- 运行模式选择器 -->
          <template v-if="showRunModeSelector">
            <n-radio-group v-model:value="runMode" size="small">
              <n-radio value="frontend">前台运行</n-radio>
              <n-radio value="backend">后台运行</n-radio>
            </n-radio-group>
            <n-button type="primary" size="small" @click="confirmStartPolling"> 确定 </n-button>
            <n-button size="small" @click="cancelRunModeSelection"> 取消 </n-button>
          </template>
        </div>
      </div>
    </template>

    <div class="auto-build-modal">
      <!-- 智能搭建规则说明 -->
      <n-alert type="info" class="build-rules-alert">
        <template #icon>
          <Icon icon="mdi:robot-outline" />
        </template>
        <div class="build-rules-header">
          <span class="rules-title">智能搭建模式</span>
          <n-tooltip placement="bottom" trigger="hover" :width="380">
            <template #trigger>
              <span class="rules-link">
                <Icon icon="mdi:help-circle-outline" class="help-icon" />
                查看搭建规则
              </span>
            </template>
            <div class="priority-rules-tooltip">
              <div class="rules-section">
                <div class="rules-section-title">
                  <Icon icon="mdi:clock-outline" />
                  搭建时机
                </div>
                <div class="rules-note">只有当前时间 ≥ 上架时间 - 30分钟时，才会开始搭建</div>
              </div>
              <div class="rules-section">
                <div class="rules-section-title">
                  <Icon icon="mdi:sort-ascending" />
                  搭建优先级（从高到低）
                </div>
                <div class="rules-grid">
                  <div class="rule-row">
                    <span class="priority-num p1">1</span>
                    <span class="rule-text">过期/今天上架</span>
                  </div>
                  <div class="rule-row">
                    <span class="priority-num p2">2</span>
                    <span class="rule-text">未来上架</span>
                  </div>
                </div>
              </div>
              <div class="rules-footer">
                <Icon icon="mdi:information-outline" />
                同优先级按上架时间升序排列
              </div>
            </div>
          </n-tooltip>
        </div>
        <div class="build-rules-desc">启动后将按上架时间自动选择最高优先级的剧集进行搭建</div>
      </n-alert>

      <!-- 后台调度器运行状态 -->
      <div v-if="backgroundSchedulerStatus?.enabled" class="polling-state">
        <n-alert type="success" class="polling-info">
          <template #icon>
            <Icon icon="mdi:cloud-sync-outline" class="polling-icon" />
          </template>
          <div class="polling-status">
            <div class="polling-header">
              <div class="polling-title-wrapper">
                <span class="polling-title">后台自动搭建运行中</span>
                <n-tag type="success" size="small" round>后台模式</n-tag>
              </div>
              <n-button size="small" type="error" secondary @click="stopBackgroundScheduler">
                <template #icon>
                  <Icon icon="mdi:stop" />
                </template>
                停止
              </n-button>
            </div>

            <div class="polling-details-inline">
              <div class="polling-item-inline">
                <span class="label">轮询间隔:</span>
                <span class="value">{{ backgroundSchedulerStatus.intervalMinutes }}分钟</span>
              </div>
              <div class="polling-item-inline">
                <span class="label">上次运行:</span>
                <span class="value">{{
                  formatBackgroundTime(backgroundSchedulerStatus.lastRunTime)
                }}</span>
              </div>
              <div class="polling-item-inline">
                <span class="label">下次运行:</span>
                <span class="value countdown">{{
                  formatBackgroundTime(backgroundSchedulerStatus.nextRunTime)
                }}</span>
              </div>
              <div class="polling-item-inline">
                <span class="label">已搭建:</span>
                <span class="value success"
                  >{{ backgroundSchedulerStatus.stats.successCount }} 部</span
                >
              </div>
              <div class="polling-item-inline">
                <span class="label">失败:</span>
                <span class="value error">{{ backgroundSchedulerStatus.stats.failCount }} 部</span>
              </div>
            </div>

            <!-- 当前任务状态 -->
            <div v-if="backgroundSchedulerStatus.currentTask" class="current-task">
              <n-tag type="info" size="small">
                <template #icon>
                  <Icon icon="mdi:loading" class="animate-spin" />
                </template>
                正在搭建: {{ backgroundSchedulerStatus.currentTask.dramaName || '查询中...' }}
              </n-tag>
            </div>

            <!-- 最近任务历史 -->
            <div v-if="backgroundSchedulerStatus.taskHistory.length > 0" class="task-history">
              <div class="history-title">最近搭建记录</div>
              <div class="history-list">
                <div
                  v-for="(task, index) in backgroundSchedulerStatus.taskHistory.slice(0, 20)"
                  :key="index"
                  class="history-item"
                  :class="task.status"
                >
                  <n-tooltip
                    v-if="(task.status === 'failed' || task.status === 'skipped') && task.error"
                    placement="top"
                  >
                    <template #trigger>
                      <Icon icon="mdi:alert-circle" class="history-icon" />
                    </template>
                    <div
                      class="error-tooltip"
                      :class="{ 'skipped-tooltip': task.status === 'skipped' }"
                    >
                      <div class="error-title">
                        {{ task.status === 'skipped' ? '跳过原因' : '失败原因' }}
                      </div>
                      <div class="error-message">{{ task.error }}</div>
                    </div>
                  </n-tooltip>
                  <Icon v-else icon="mdi:check-circle" class="history-icon" />
                  <div class="history-main">
                    <span class="history-drama">{{ task.dramaName }}</span>
                    <div class="history-meta">
                      <span v-if="task.date" class="meta-date">
                        {{ formatTaskDate(task.date) }}
                      </span>
                      <span v-if="task.publishTime" class="meta-publish">
                        上架{{ formatTaskPublishTime(task.publishTime) }}
                      </span>
                    </div>
                  </div>
                  <span class="history-time">{{ formatBackgroundTime(task.completedAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </n-alert>

        <!-- 提示：可关闭弹窗 -->
        <n-alert type="info" class="background-tip">
          <template #icon>
            <Icon icon="mdi:information-outline" />
          </template>
          后台模式运行中，您可以安全关闭此弹窗。搭建任务将在后台持续运行，即使刷新页面也不会中断。
        </n-alert>
      </div>

      <!-- 前台轮询态：显示轮询信息和进度 -->
      <div v-else-if="autoPollingEnabled" class="polling-state">
        <!-- 轮询信息卡片 -->
        <n-alert type="info" class="polling-info">
          <template #icon>
            <Icon icon="mdi:robot-outline" class="polling-icon" />
          </template>
          <div class="polling-status">
            <div class="polling-header">
              <div class="polling-title-wrapper">
                <span class="polling-title">自动搭建运行中</span>
                <n-tooltip placement="bottom" trigger="hover">
                  <template #trigger>
                    <Icon icon="mdi:information-outline" class="info-icon" />
                  </template>
                  <div class="priority-rules">
                    <div class="rule-title">剧集搭建优先级规则</div>
                    <div class="rule-note" style="margin-bottom: 8px">
                      <Icon icon="mdi:clock-outline" class="note-icon" />
                      当前时间 ≥ 上架时间 - 30分钟时开始搭建
                    </div>
                    <div class="rule-item">
                      <span class="priority-badge priority-1">优先级1</span>
                      <span class="rule-desc">过期/今天上架</span>
                    </div>
                    <div class="rule-item">
                      <span class="priority-badge priority-2">优先级2</span>
                      <span class="rule-desc">未来上架</span>
                    </div>
                    <div class="rule-note">
                      <Icon icon="mdi:lightbulb-outline" class="note-icon" />
                      同优先级按上架时间升序排列
                    </div>
                  </div>
                </n-tooltip>
              </div>
              <n-button
                size="small"
                type="error"
                secondary
                @click="stopAutoPolling"
                :disabled="isBuilding"
              >
                <template #icon>
                  <Icon icon="mdi:stop" />
                </template>
                停止
              </n-button>
            </div>

            <div class="polling-details">
              <div class="polling-item">
                <span class="label">轮询间隔：</span>
                <span class="value">{{ pollingInterval }}分钟</span>
              </div>
              <div class="polling-item">
                <span class="label">下次轮询：</span>
                <span class="value countdown">{{ formatCountdown(countdown) }}</span>
              </div>
              <div class="polling-item">
                <span class="label">已搭建：</span>
                <span class="value success">{{ pollingStats.successCount }} 部</span>
              </div>
              <div class="polling-item">
                <span class="label">失败：</span>
                <span class="value error">{{ pollingStats.failCount }} 部</span>
              </div>
            </div>
          </div>
        </n-alert>

        <!-- 当前搭建进度 -->
        <div v-if="showProgress && buildRecords.length > 0" class="build-progress">
          <BuildProgressTable :records="buildRecords" />
        </div>

        <!-- 等待下次轮询 -->
        <div v-if="!isBuilding && !showProgress" class="waiting-next-poll">
          <Icon icon="mdi:timer-sand" class="waiting-icon" />
          <p>等待下次轮询...</p>
        </div>
      </div>

      <!-- 初始状态和后台模式：显示待搭建剧集列表 -->
      <div v-if="!showProgress && !autoPollingEnabled" class="initial-state">
        <!-- 剧集列表 -->
        <div class="dramas-list-section">
          <div class="section-header">
            <h3>待搭建剧集列表</h3>
            <n-button
              text
              :loading="isLoadingDramas"
              @click="loadPendingDramas"
              class="refresh-button"
            >
              <template #icon>
                <Icon icon="mdi:refresh" />
              </template>
              刷新
            </n-button>
          </div>

          <!-- 加载中 -->
          <div v-if="isLoadingDramas" class="loading-state">
            <n-spin size="large" />
            <p>正在查询飞书数据...</p>
          </div>

          <!-- 空状态 -->
          <div v-if="dramas.length === 0 && !isLoadingDramas" class="empty-state-container">
            <div class="empty-state-content">
              <div class="empty-icon-wrapper">
                <Icon icon="mdi:inbox-outline" class="empty-icon" />
              </div>
              <div class="empty-title">暂无待搭建剧集</div>
              <div class="empty-description">当前没有需要搭建的剧集，请稍后再试</div>
              <n-button
                type="primary"
                ghost
                @click="loadPendingDramas"
                :loading="isLoadingDramas"
                class="empty-refresh-btn"
              >
                <template #icon>
                  <Icon icon="mdi:refresh" />
                </template>
                刷新列表
              </n-button>
            </div>
          </div>

          <!-- 剧集表格 -->
          <div v-else class="dramas-table-wrapper">
            <n-data-table
              v-model:checked-row-keys="selectedRowKeys"
              :columns="dramasColumns"
              :data="dramas"
              :row-key="(row: FeishuDramaRecord) => row.record_id"
              :bordered="false"
              :single-line="false"
              size="small"
            />
            <div class="dramas-count">
              共 <span class="count-number">{{ dramas.length }}</span> 部剧待搭建
              <span v-if="selectedRowKeys.length > 0" class="selected-count">
                （已选中 <span class="count-number">{{ selectedRowKeys.length }}</span> 部）
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 进度显示（仅手动搭建时显示） -->
      <div v-if="showProgress && !autoPollingEnabled" class="progress-section">
        <!-- 统计信息 -->
        <div class="statistics-bar">
          <div class="stat-item">
            <span class="stat-label">总计:</span>
            <span class="stat-value">{{ statistics.total }}</span>
          </div>
          <div class="stat-item stat-success">
            <Icon icon="mdi:check-circle" />
            <span class="stat-label">成功:</span>
            <span class="stat-value">{{ statistics.success }}</span>
          </div>
          <div class="stat-item stat-failed">
            <Icon icon="mdi:alert-circle" />
            <span class="stat-label">失败:</span>
            <span class="stat-value">{{ statistics.failed }}</span>
          </div>
          <div v-if="statistics.running > 0" class="stat-item stat-running">
            <Icon icon="mdi:loading" class="animate-spin" />
            <span class="stat-label">进行中:</span>
            <span class="stat-value">{{ statistics.running }}</span>
          </div>
        </div>

        <!-- 当前阶段指示 -->
        <div v-if="isBuilding" class="current-phase">
          <div class="phase-header">
            <span class="phase-title"
              >剧集 {{ currentDramaIndex }}/{{ dramas.length }} - {{ currentPhase }}</span
            >
            <span v-if="currentPhase === '资产化'" class="phase-subtitle"
              >步骤 {{ currentAssetizationStep }}/5</span
            >
          </div>

          <!-- 批次信息 -->
          <n-alert v-if="currentBatchInfo" type="info" class="batch-info">
            <template #icon>
              <Icon icon="mdi:account-arrow-right" />
            </template>
            {{ currentBatchInfo }}
          </n-alert>

          <!-- 资产化步骤 -->
          <div v-if="currentPhase === '资产化'" class="assetization-steps">
            <n-steps :current="currentAssetizationStep" :status="isBuilding ? 'process' : 'wait'">
              <n-step
                v-for="step in assetizationSteps"
                :key="step.key"
                :title="step.title"
                :status="getStepStatus(step.key)"
              />
            </n-steps>

            <!-- 等待倒计时 -->
            <n-alert v-if="waitingCountdown > 0" type="info" class="mt-4">
              <template #icon>
                <Icon icon="mdi:timer-sand" class="animate-pulse" />
              </template>
              等待小程序创建完成，剩余 {{ waitingCountdown }} 秒...
            </n-alert>
          </div>
        </div>

        <!-- 进度表格 -->
        <div class="progress-table-wrapper">
          <BuildProgressTable :records="buildRecords" />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <n-button v-if="!isBuilding" @click="handleClose">关闭</n-button>

        <!-- 列表状态：开始搭建按钮 -->
        <n-button
          v-if="!showProgress"
          type="primary"
          :loading="isBuilding"
          :disabled="isLoadingDramas || selectedRowKeys.length === 0"
          @click="startAutoBuild"
        >
          <template #icon>
            <Icon icon="mdi:rocket-launch" />
          </template>
          开始搭建{{ selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length}部)` : '' }}
        </n-button>

        <!-- 进度状态：搭建完成后显示继续搭建按钮 -->
        <n-button v-if="showProgress && !isBuilding" type="primary" @click="handleContinueBuild">
          <template #icon>
            <Icon icon="mdi:refresh" />
          </template>
          继续搭建
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.auto-build-modal {
  min-height: 400px;
}

.initial-state {
  padding: 20px 0;
}

.dramas-list-section {
  margin-top: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.refresh-button {
  font-size: 14px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.loading-state p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.empty-state {
  padding: 40px 20px;
}

.dramas-table-wrapper {
  border: 1px solid #e0e0e6;
  border-radius: 8px;
  overflow: hidden;
}

.dramas-count {
  padding: 12px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e6;
  font-size: 14px;
  color: #666;
  text-align: right;
}

.count-number {
  color: #667eea;
  font-weight: 600;
  font-size: 16px;
  margin: 0 4px;
}

.selected-count {
  margin-left: 8px;
  color: #2080f0;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.statistics-bar {
  display: flex;
  gap: 24px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.stat-success {
  color: #18a058;
}

.stat-success .stat-value {
  color: #18a058;
}

.stat-failed {
  color: #d03050;
}

.stat-failed .stat-value {
  color: #d03050;
}

.stat-running {
  color: #2080f0;
}

.stat-running .stat-value {
  color: #2080f0;
}

.current-phase {
  padding: 16px 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #2080f0;
}

.phase-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.phase-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.phase-subtitle {
  font-size: 14px;
  color: #666;
}

.batch-info {
  margin-bottom: 16px;
  font-weight: 500;
}

.assetization-steps {
  margin-top: 16px;
}

.progress-table-wrapper {
  margin-top: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.empty-state-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 20px;
}

.empty-state-content {
  text-align: center;
  max-width: 400px;
}

.empty-icon-wrapper {
  display: inline-block;
  margin-bottom: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  border-radius: 50%;
  animation: float 3s ease-in-out infinite;
}

.empty-icon {
  font-size: 64px;
  color: #b4b9c1;
  display: block;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.empty-description {
  font-size: 14px;
  color: #7a8a9e;
  line-height: 1.6;
  margin-bottom: 24px;
}

.empty-refresh-btn {
  border-radius: 8px;
  padding: 8px 24px;
  font-weight: 500;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 轮询态相关样式 */
.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  justify-content: space-between;
}

.polling-state {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.polling-info {
  margin-bottom: 0;
}

.polling-icon {
  font-size: 20px;
  animation: pulse 2s ease-in-out infinite;
}

.polling-status {
  flex: 1;
}

.polling-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.polling-title-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.polling-title {
  font-size: 16px;
  font-weight: 600;
}

.info-icon {
  font-size: 18px;
  color: #2080f0;
  cursor: pointer;
  transition: all 0.3s;
}

.info-icon:hover {
  color: #4098fc;
  transform: scale(1.1);
}

/* 优先级规则提示框样式 */
.priority-rules {
  max-width: 320px;
  padding: 4px;
}

.rule-title {
  font-size: 14px;
  font-weight: 600;
  color: #18a058;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.priority-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
}

.priority-1 {
  background: linear-gradient(135deg, #ff4757, #ff6b81);
  color: white;
}

.priority-2 {
  background: linear-gradient(135deg, #ff6348, #ff7979);
  color: white;
}

.priority-3 {
  background: linear-gradient(135deg, #2ed573, #7bed9f);
  color: white;
}

.priority-4 {
  background: linear-gradient(135deg, #26de81, #6dd5a8);
  color: white;
}

.priority-5 {
  background: linear-gradient(135deg, #ffa502, #ffc837);
  color: white;
}

.priority-6 {
  background: linear-gradient(135deg, #1e90ff, #54a0ff);
  color: white;
}

.rule-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.rule-divider {
  margin: 12px 0 8px;
  padding: 8px;
  font-size: 12px;
  color: #ffa502;
  background: rgba(255, 165, 2, 0.1);
  border-left: 3px solid #ffa502;
  border-radius: 2px;
}

.rule-note {
  margin-top: 12px;
  padding: 8px;
  font-size: 12px;
  color: #909399;
  background: rgba(144, 147, 153, 0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.note-icon {
  font-size: 14px;
  color: #ffa502;
}

/* 智能搭建规则说明样式 */
.build-rules-alert {
  margin-bottom: 16px;
}

.build-rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.rules-title {
  font-weight: 600;
  font-size: 14px;
  color: #18a058;
}

.rules-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #1890ff;
  cursor: pointer;
  transition: all 0.2s;
}

.rules-link:hover {
  color: #40a9ff;
}

.rules-link .help-icon {
  font-size: 14px;
}

.build-rules-desc {
  font-size: 13px;
  color: #666;
}

/* 新版优先级规则提示框 */
.priority-rules-tooltip {
  padding: 4px;
}

.rules-section {
  margin-bottom: 12px;
}

.rules-section.night-section {
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.2);
}

.rules-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 10px;
}

.rules-section-title .iconify {
  font-size: 16px;
  color: #18a058;
}

.night-section .rules-section-title .iconify {
  color: #ffa502;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.rule-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.priority-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 50%;
  flex-shrink: 0;
}

.priority-num.p1,
.priority-num.p2 {
  background: linear-gradient(135deg, #ff4757, #ff6b81);
  color: white;
}

.priority-num.p3,
.priority-num.p4 {
  background: linear-gradient(135deg, #2ed573, #7bed9f);
  color: white;
}

.priority-num.p5,
.priority-num.p6 {
  background: linear-gradient(135deg, #ffa502, #ffc837);
  color: white;
}

.priority-num.p7,
.priority-num.p8,
.priority-num.p9 {
  background: linear-gradient(135deg, #1e90ff, #54a0ff);
  color: white;
}

.rule-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.rules-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px;
  font-size: 11px;
  color: #909399;
  background: rgba(144, 147, 153, 0.1);
  border-radius: 4px;
}

.rules-footer .iconify {
  font-size: 14px;
  color: #ffa502;
}

.polling-details {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.polling-details-inline {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  padding: 12px 0;
}

.polling-item-inline {
  display: flex;
  align-items: center;
  gap: 4px;
}

.polling-item-inline .label {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
}

.polling-item-inline .value {
  font-size: 15px;
  font-weight: 600;
}

.polling-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.polling-item .label {
  font-size: 12px;
  color: #666;
}

.polling-item .value {
  font-size: 16px;
  font-weight: 600;
}

.value.countdown {
  color: #1890ff;
}

.value.success {
  color: #52c41a;
}

.value.error {
  color: #ff4d4f;
}

.waiting-next-poll {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.waiting-icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: spin 3s linear infinite;
}

/* Header 操作区域样式 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 后台调度器样式 */
.current-task {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.task-history {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.history-title {
  font-size: 13px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.02);
}

.history-item.success {
  background: rgba(82, 196, 26, 0.1);
}

.history-item.success .history-icon {
  color: #52c41a;
}

.history-item.failed {
  background: rgba(255, 77, 79, 0.1);
}

.history-item.failed .history-icon {
  color: #ff4d4f;
}

.history-item.skipped {
  background: rgba(250, 173, 20, 0.1);
}

.history-item.skipped .history-icon {
  color: #faad14;
}

.history-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.history-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-drama {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #666;
}

.history-meta .n-tag {
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
}

.meta-date {
  color: #1890ff;
}

.meta-publish {
  color: #999;
}

.history-time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.background-tip {
  margin-top: 16px;
  font-size: 13px;
}

/* 错误提示tooltip样式 */
.error-tooltip {
  max-width: 300px;
}

.error-title {
  font-size: 13px;
  font-weight: 600;
  color: #ff4d4f;
  margin-bottom: 6px;
}

.error-tooltip.skipped-tooltip .error-title {
  color: #faad14;
}

.error-message {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  word-break: break-all;
}
</style>
