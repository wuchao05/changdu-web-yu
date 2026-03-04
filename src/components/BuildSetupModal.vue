<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NButton, NAlert, NSpin, useMessage } from 'naive-ui'
import { feishuApi } from '@/api/feishu'
import * as dailyBuildApi from '@/api/dailyBuild'
import { useDouyinMaterialStore, type DouyinMaterialMatch } from '@/stores/douyinMaterial'
import { filterMaterials, sortMaterialsBySequence, type Material } from '@/utils/materialFilter'
import { parsePromotionUrl } from '@/utils/dailyBuild'
import { generateMicroAppLink, extractAppIdFromParams } from '@/utils/microAppLink'
import BuildProgressTable, { type BuildDramaRecord } from './BuildProgressTable.vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const message = useMessage()
const douyinMaterialStore = useDouyinMaterialStore()

// 清理剧名中的特殊标点符号
function sanitizeDramaName(name: string): string {
  // 移除中文和英文的特殊标点符号
  return name.replace(
    /[，。：；！？、''""（）《》【】……—·\s,.:;!?()\[\]{}'"<>\/\\|~`@#$%^&*+=]/g,
    ''
  )
}

// 飞书记录类型定义
interface FeishuDramaRecord {
  record_id: string
  fields: {
    剧名?: [{ text: string }]
    短剧ID?: { value?: [{ text: string }] }
    账户?: [{ text: string }]
  }
}

// 初始化数据
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

interface Props {
  show: boolean
}

interface Emits {
  'update:show': [value: boolean]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 状态定义
const currentStep = ref(0) // 0: 选择日期, 1+: 搭建流程
const selectedDate = ref<string>('')
const dramas = ref<FeishuDramaRecord[]>([])
const buildRecords = ref<BuildDramaRecord[]>([])
const isBuilding = ref(false)
const isInitializing = ref(false)
const isFetchingDramas = ref(false) // 正在获取飞书记录
const buildError = ref<string | null>(null)
const initError = ref<string | null>(null)
// 初始化数据缓存（按账户ID存储，同一账户的剧集共享）
const initDataCache = ref<Map<string, InitializationData>>(new Map())

// 抖音号配置列表
const douyinConfigs = computed(() => douyinMaterialStore.matches)

// 生成日期选项（前7天 + 今天 + 后7天）
const buildDateOptions = computed(() => {
  const options = []
  const today = dayjs().tz('Asia/Shanghai').startOf('day')

  // 前7天
  for (let i = 7; i >= 1; i--) {
    const date = today.subtract(i, 'day')
    options.push({
      value: `past-${i}`,
      day: date.format('M.D'),
      date: date.format('YYYY-MM-DD'),
    })
  }

  // 今天
  options.push({
    value: 'today',
    day: today.format('M.D'),
    date: today.format('YYYY-MM-DD'),
  })

  // 后7天
  for (let i = 1; i <= 7; i++) {
    const date = today.add(i, 'day')
    options.push({
      value: `future-${i}`,
      day: date.format('M.D'),
      date: date.format('YYYY-MM-DD'),
    })
  }

  return options
})

// 辅助函数：获取错误消息
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

// 选择日期
function handleDateSelect(dateStr: string) {
  selectedDate.value = dateStr
  buildError.value = null
}

// 开始搭建流程
async function handleStartBuild() {
  if (!selectedDate.value) {
    message.warning('请选择搭建日期')
    return
  }

  if (douyinConfigs.value.length === 0) {
    message.warning('请先在设置中配置抖音号与素材序号的匹配规则')
    return
  }

  try {
    // 进入搭建流程
    currentStep.value = 1

    // 1. 获取待搭建剧集（每日主体，状态为"待搭建"）
    isFetchingDramas.value = true
    const result = await feishuApi.getPendingSetupDramas(
      selectedDate.value,
      undefined,
      true, // 使用每日主体表格
      true // 包含短剧ID字段
    )
    dramas.value = result.data?.items || []
    isFetchingDramas.value = false

    if (dramas.value.length === 0) {
      message.warning('该日期没有待搭建的剧集')
      currentStep.value = 0
      return
    }

    // 2. 初始化搭建记录
    buildRecords.value = dramas.value.map((drama, index) => {
      return {
        id: drama.record_id,
        index: index + 1,
        dramaName: drama.fields['剧名']?.[0]?.text || '未知',
        accountId: drama.fields['账户']?.[0]?.text || '未知',
        status: 'pending' as const,
        totalBatches: douyinConfigs.value.length,
        completedBatches: 0,
      }
    })

    // 3. 开始搭建流程（初始化会在每个剧集开始前按需执行）
    isBuilding.value = true
    await executeBuildProcess()
    isBuilding.value = false

    // 4. 完成
    message.success('搭建流程已完成')
  } catch (error) {
    console.error('搭建流程出错:', error)
    message.error(`搭建失败: ${getErrorMessage(error)}`)
    isBuilding.value = false
    isInitializing.value = false
    isFetchingDramas.value = false
  }
}

// 执行初始化（按账户ID缓存，同一账户只初始化一次）
async function executeInitialization(accountId: string): Promise<InitializationData> {
  // 如果已经初始化过该账户，直接返回缓存的数据
  if (initDataCache.value.has(accountId)) {
    console.log(`账户 ${accountId} 已初始化，使用缓存数据`)
    return initDataCache.value.get(accountId)!
  }

  console.log(`========== 开始初始化阶段：账户 ${accountId} ==========`)

  try {
    // 1. 查询小程序
    console.log('1. 查询小程序')
    const microAppResult = await dailyBuildApi.queryMicroApp(accountId)
    if (!microAppResult.data?.micro_app || microAppResult.data.micro_app.length === 0) {
      throw new Error('小程序不存在，请先创建小程序')
    }
    const microApp = microAppResult.data.micro_app[0]

    // 2. 查询小程序资产
    console.log('2. 查询小程序资产')
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

    // 3. 上传主图
    console.log('3. 上传主图')
    const uploadResult = await dailyBuildApi.uploadProductImage(accountId)
    if (uploadResult.code !== 0) {
      throw new Error(uploadResult.msg || uploadResult.message || '上传主图失败')
    }
    const imageInfo = uploadResult.data

    // 初始化完成，构造数据（micro_app_info 相关字段将在 buildBatchForDouyin 中填充）
    const initData: InitializationData = {
      assets_id: assetsId,
      micro_app_instance_id: microApp.micro_app_instance_id,
      app_id: '', // 将在创建推广链接后填充
      start_page: '', // 将在创建推广链接后填充
      app_type: 0, // 将在创建推广链接后填充
      start_params: '', // 将在创建推广链接后填充
      link: '', // 将在创建推广链接后填充
      product_image_width: imageInfo.width,
      product_image_height: imageInfo.height,
      product_image_uri: imageInfo.web_uri, // 使用 web_uri 而不是 uri
    }

    // 缓存该账户的初始化数据
    initDataCache.value.set(accountId, initData)

    console.log(`账户 ${accountId} 初始化完成:`, initData)
    console.log('====================================')

    return initData
  } catch (error) {
    console.error(`账户 ${accountId} 初始化失败:`, error)
    initError.value = getErrorMessage(error)
    throw error
  }
}

// 执行搭建流程
async function executeBuildProcess(): Promise<void> {
  for (let i = 0; i < dramas.value.length; i++) {
    const drama = dramas.value[i]
    const record = buildRecords.value[i]
    const accountId = drama.fields['账户']?.[0]?.text

    if (!accountId) {
      record.status = 'failed'
      record.errorMessage = '账户ID不存在'
      continue
    }

    // 更新状态为"搭建中"
    record.status = 'running'

    try {
      // 1. 为当前账户执行初始化（如果尚未初始化）
      isInitializing.value = true
      initError.value = null
      const initData = await executeInitialization(accountId)
      isInitializing.value = false

      // 2. 搭建该剧集
      await buildSingleDrama(drama, initData, record)

      // 3. 更新飞书状态为"已完成"，同时更新搭建时间
      try {
        const buildTime = Date.now() // 当前13位时间戳
        await feishuApi.updateDramaStatus(drama.record_id, '已完成', buildTime)
        console.log(
          `✅ 剧集 ${drama.fields['剧名']?.[0]?.text} 状态已更新为"已完成"，搭建时间: ${buildTime}`
        )
      } catch (statusError) {
        console.error('❌ 更新飞书状态失败，这可能导致该剧被重复搭建！:', statusError)
        // 显示警告但不影响搭建流程
        message.warning(
          `剧集 ${drama.fields['剧名']?.[0]?.text} 搭建成功，但飞书状态更新失败，请手动检查！`
        )
      }

      // 成功
      record.status = 'success'
    } catch (error) {
      console.error(`❌ 剧集 ${drama.fields['剧名']?.[0]?.text} 搭建失败:`, error)
      record.status = 'failed'
      record.errorMessage = getErrorMessage(error)
      record.failedDrama = drama // 保存失败的剧集数据，供重试使用
      isInitializing.value = false
      // 继续下一个剧集
    }
  }
}

// 搭建单个剧集
async function buildSingleDrama(
  drama: FeishuDramaRecord,
  initData: InitializationData,
  record: BuildDramaRecord
): Promise<void> {
  const dramaName = drama.fields['剧名']?.[0]?.text
  const accountId = drama.fields['账户']?.[0]?.text

  if (!dramaName || !accountId) {
    throw new Error('剧集信息不完整')
  }

  const skippedBatches: Array<{ account: string; reason: string }> = []
  let hasSuccessBatch = false

  // 生成日期字符串（YYYYMMDD格式）
  const buildDate = dayjs(selectedDate.value).format('YYYYMMDD')

  // 遍历每个抖音号批次
  for (const config of douyinConfigs.value) {
    try {
      await buildBatchForDouyin(drama, config, initData, record, dramaName, accountId, buildDate)
      // 批次成功，更新已完成批次数
      record.completedBatches++
      hasSuccessBatch = true
      console.log(`✅ 抖音号 ${config.douyinAccount} 批次完成`)
    } catch (error) {
      const errorMsg = getErrorMessage(error)
      console.warn(`⚠️ 抖音号 ${config.douyinAccount} 批次跳过: ${errorMsg}`)

      // 记录跳过的批次
      skippedBatches.push({
        account: config.douyinAccount,
        reason: errorMsg,
      })

      // 继续下一个批次，不抛出错误
      continue
    }
  }

  // 如果所有批次都失败了，才抛出错误
  if (!hasSuccessBatch) {
    const skippedInfo = skippedBatches.map(b => `${b.account}: ${b.reason}`).join('; ')
    throw new Error(`所有抖音号批次均失败: ${skippedInfo}`)
  }

  // 保存跳过的批次信息到 record，用于UI显示
  if (skippedBatches.length > 0) {
    record.skippedBatches = skippedBatches
    console.log(
      `📊 剧集 ${dramaName} 完成，成功: ${record.completedBatches}/${douyinConfigs.value.length}，` +
        `跳过: ${skippedBatches.map(b => b.account).join(', ')}`
    )
  }
}

// 为单个抖音号批次创建项目和广告
async function buildBatchForDouyin(
  drama: FeishuDramaRecord,
  config: DouyinMaterialMatch,
  initData: InitializationData,
  record: BuildDramaRecord,
  dramaName: string,
  accountId: string,
  buildDate: string
): Promise<void> {
  // 0. 创建推广链接（新增步骤）
  record.failedStep = '创建推广链接'
  const bookId = drama.fields['短剧ID']?.value?.[0]?.text
  if (!bookId) {
    throw new Error('短剧ID不存在')
  }

  // 清理剧名中的特殊标点符号
  const cleanDramaName = sanitizeDramaName(dramaName)
  // 推广链接命名规则：小鱼-抖音号-剧名-账户
  const promotionName = `小鱼-${config.douyinAccount}-${cleanDramaName}-${accountId}`
  console.log(`创建推广链接: ${promotionName} (原始剧名: ${dramaName})`)

  const promotionResult = await dailyBuildApi.createPromotionLink({
    book_id: bookId,
    drama_name: dramaName,
    promotion_name: promotionName,
  })

  // 解析推广链接
  const parsed = parsePromotionUrl(promotionResult.promotion_url)
  const appId = extractAppIdFromParams(parsed.launchParams)
  if (!appId) {
    throw new Error('无法从推广链接参数中提取 app_id')
  }

  // 清理 launchParams 中的 app_id
  const cleanedParams = parsed.launchParams
    .split('&')
    .filter(param => !param.startsWith('app_id='))
    .join('&')

  console.log('推广链接解析结果:', {
    appId,
    startPage: parsed.launchPage,
    cleanedParams,
  })

  // 生成小程序链接
  const microAppLink = generateMicroAppLink({
    appId,
    startPage: parsed.launchPage,
    startParams: cleanedParams,
  })

  console.log('生成的小程序链接:', microAppLink)

  // 更新 initData（填充从推广链接获取的数据）
  initData.app_id = appId
  initData.start_page = parsed.launchPage
  initData.start_params = cleanedParams
  initData.link = microAppLink
  initData.app_type = 2 // 固定为2

  // 1. 创建项目
  record.failedStep = '创建项目'
  // 项目名称格式：小鱼-抖音号-剧名-日期
  const projectName = `小鱼-${config.douyinAccount}-${dramaName}-${buildDate}`

  const projectResult = await dailyBuildApi.createProject({
    account_id: accountId,
    drama_name: dramaName,
    douyin_account_name: config.douyinAccount,
    assets_id: initData.assets_id,
    micro_app_instance_id: initData.micro_app_instance_id,
    project_name: projectName, // 添加项目名称
  })

  // 处理项目名称重复的情况（code 50100）
  if (projectResult.code === 50100) {
    throw new Error(`项目名称重复（已跳过）：${projectName}`)
  }

  if (projectResult.code !== 0) {
    throw new Error(projectResult.msg || projectResult.message || '创建项目失败')
  }

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

  // 返回的是数组，取第一个结果
  const accountInfo = accountInfoResult.data?.[0]
  if (!accountInfo) {
    throw new Error('未找到抖音号信息')
  }

  // 验证抖音号名称是否匹配
  if (accountInfo.ies_user_name !== config.douyinAccount) {
    throw new Error(
      `抖音号名称不匹配：期望"${config.douyinAccount}"，实际"${accountInfo.ies_user_name}"`
    )
  }

  const iesCoreUserId = accountInfo.ies_core_id

  // 3. 获取素材列表
  record.failedStep = '获取素材'
  const materialListResult = await dailyBuildApi.getMaterialList({
    account_id: accountId,
    aweme_id: config.douyinAccountId,
    aweme_account: iesCoreUserId,
  })

  if (materialListResult.code !== 0) {
    throw new Error(
      materialListResult.msg ||
        materialListResult.error ||
        materialListResult.message ||
        '获取素材列表失败'
    )
  }

  // 将 API 返回的数据格式转换为 Material 格式
  const allMaterials: Material[] =
    materialListResult.data.videos?.map((video: Material & { video_name?: string }) => ({
      ...video,
      filename: video.video_name || video.filename, // 将 video_name 映射为 filename
    })) || []

  // 4. 筛选素材
  record.failedStep = '筛选素材'

  // 将 buildDate (YYYYMMDD) 转换为 "M.D" 格式用于素材筛选
  const date = dayjs(buildDate, 'YYYYMMDD')
  const dateString = `${date.month() + 1}.${date.date()}`
  console.log(`使用日期筛选素材: ${buildDate} -> ${dateString}`)

  const filteredMaterials = filterMaterials(
    allMaterials,
    dramaName,
    config.materialRange,
    dateString
  )

  if (filteredMaterials.length === 0) {
    throw new Error(
      `素材不足：未找到符合条件的素材（日期=${dateString}，范围=${config.materialRange}）`
    )
  }

  // 按序号排序
  const sortedMaterials = sortMaterialsBySequence(filteredMaterials)

  // 5. 创建广告（一个抖音号创建一条广告，包含所有筛选出的素材）
  record.failedStep = '创建广告'
  // 广告名称格式：小鱼-抖音号-剧名-日期
  const adName = `小鱼-${config.douyinAccount}-${dramaName}-${buildDate}`

  // 创建广告函数（封装以便重试）
  const createAdPromotion = async () => {
    const promotionResult = await dailyBuildApi.createPromotion({
      account_id: accountId,
      project_id: projectId,
      ad_name: adName,
      drama_name: dramaName,
      ies_core_user_id: iesCoreUserId,
      materials: sortedMaterials, // 传递所有筛选出的素材数组
      app_id: initData.app_id,
      start_page: initData.start_page,
      app_type: initData.app_type,
      start_params: initData.start_params,
      link: initData.link,
      product_image_uri: initData.product_image_uri,
      product_image_width: initData.product_image_width,
      product_image_height: initData.product_image_height,
    })

    if (promotionResult.code !== 0) {
      throw new Error(
        promotionResult.msg || promotionResult.error || promotionResult.message || `创建广告失败`
      )
    }

    return promotionResult
  }

  // 第一次尝试创建广告
  try {
    await createAdPromotion()
    console.log(`✅ 广告创建成功: ${adName}, 包含 ${sortedMaterials.length} 个素材`)
  } catch (error) {
    const errorMsg = getErrorMessage(error)
    console.warn(`⚠️ 广告创建失败（第1次）: ${errorMsg}，准备重试...`)

    // 第二次尝试（重试一次）
    try {
      await createAdPromotion()
      console.log(`✅ 广告创建成功（重试）: ${adName}, 包含 ${sortedMaterials.length} 个素材`)
    } catch (retryError) {
      const retryErrorMsg = getErrorMessage(retryError)
      console.error(`❌ 广告创建失败（第2次）: ${retryErrorMsg}`)
      throw new Error(`创建广告失败（已重试1次）: ${retryErrorMsg}`)
    }
  }
}

// 关闭弹窗
function handleClose() {
  if (isBuilding.value || isInitializing.value || isFetchingDramas.value) {
    message.warning('操作进行中，无法关闭')
    return
  }
  emit('update:show', false)
}

// 重置状态
function resetState() {
  currentStep.value = 0
  selectedDate.value = ''
  dramas.value = []
  buildRecords.value = []
  isBuilding.value = false
  isInitializing.value = false
  isFetchingDramas.value = false
  buildError.value = null
  initError.value = null
  initDataCache.value.clear() // 清空初始化缓存
}

// 监听弹窗显示状态
watch(
  () => props.show,
  newVal => {
    if (newVal) {
      // 打开时加载抖音号配置
      douyinMaterialStore.loadFromStorage()
    } else {
      // 关闭时重置状态
      resetState()
    }
  }
)
</script>

<template>
  <n-modal
    :show="props.show"
    @update:show="handleClose"
    preset="card"
    title="每日剧场-提交搭建"
    style="width: 800px; max-height: 90vh; display: flex; flex-direction: column"
    content-style="overflow-y: auto; flex: 1; min-height: 0"
    :mask-closable="!isBuilding && !isInitializing && !isFetchingDramas"
    :closable="!isBuilding && !isInitializing && !isFetchingDramas"
  >
    <!-- 步骤0: 选择日期 -->
    <div v-if="currentStep === 0" class="space-y-4">
      <div>
        <p class="text-gray-600 text-sm mb-3">请选择要提交搭建的日期：</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="dateOption in buildDateOptions"
            :key="dateOption.value"
            @click="handleDateSelect(dateOption.date)"
            :class="[
              'min-w-[60px] px-3 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-all duration-150',
              selectedDate === dateOption.date
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200',
            ]"
          >
            {{ dateOption.day }}
          </button>
        </div>
      </div>

      <n-alert v-if="douyinConfigs.length === 0" type="warning" title="未配置抖音号">
        请先在设置页面配置抖音号与素材序号的匹配规则
      </n-alert>

      <n-alert v-if="buildError" type="error" title="错误">
        {{ buildError }}
      </n-alert>
    </div>

    <!-- 获取飞书记录中 -->
    <div v-if="currentStep >= 1 && isFetchingDramas" class="text-center py-8">
      <div class="flex flex-col items-center gap-4">
        <n-spin size="large" />
        <div>
          <p class="text-lg font-medium text-gray-800">正在获取飞书"待搭建"数据...</p>
          <p class="text-sm text-gray-500 mt-2">查询日期: {{ selectedDate }}</p>
        </div>
      </div>
    </div>

    <!-- 初始化阶段 -->
    <div v-if="currentStep >= 1 && !isFetchingDramas && isInitializing" class="text-center py-8">
      <div class="flex flex-col items-center gap-4">
        <n-spin size="large" />
        <div>
          <p class="text-lg font-medium text-gray-800">正在初始化...</p>
          <p class="text-sm text-gray-500 mt-2">获取小程序信息、上传主图等</p>
        </div>
      </div>
    </div>

    <!-- 初始化错误 -->
    <div v-if="initError && !isInitializing && !isFetchingDramas && currentStep >= 1" class="mb-4">
      <n-alert type="error" title="初始化失败">
        {{ initError }}
      </n-alert>
    </div>

    <!-- 搭建进度 -->
    <div v-if="currentStep >= 1 && !isInitializing && !isFetchingDramas && buildRecords.length > 0">
      <BuildProgressTable :records="buildRecords" />
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="flex justify-end gap-3">
        <n-button
          round
          @click="handleClose"
          :disabled="isBuilding || isInitializing || isFetchingDramas"
        >
          取消
        </n-button>
        <n-button
          v-if="currentStep === 0"
          round
          type="success"
          @click="handleStartBuild"
          :disabled="!selectedDate || douyinConfigs.length === 0"
          :loading="isBuilding || isInitializing || isFetchingDramas"
        >
          确认
        </n-button>
      </div>
    </template>
  </n-modal>
</template>
