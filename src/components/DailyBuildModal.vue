<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { NModal, NSteps, NStep, NAlert, NButton, NSpin, useMessage } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { feishuApi } from '@/api/feishu'
import { FEISHU_CONFIG } from '@/config/feishu'
import * as dailyBuildApi from '@/api/dailyBuild'
import { parsePromotionUrl, copyToClipboard } from '@/utils/dailyBuild'
import { generateMicroAppLink, extractAppIdFromParams } from '@/utils/microAppLink'

const message = useMessage()

// 辅助函数：获取错误消息
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
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

// 推广信息类型
interface PromotionInfo {
  launchPage: string
  launchParams: string
  promotionName: string
  createUrl: string
}

// 失败记录类型
interface FailedRecord {
  drama: FeishuDramaRecord
  error: string
  step: number
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
const currentStep = ref(0) // 0: 初始, 1-6: 资产化步骤, 7: 完成状态
const dramas = ref<FeishuDramaRecord[]>([])
const currentDramaIndex = ref(0)
const isBuilding = ref(false)
const buildError = ref<string | null>(null)
const errorStep = ref<number | null>(null)
const microAppNotFound = ref(false)
const promotionInfo = ref<PromotionInfo | null>(null)
const successList = ref<FeishuDramaRecord[]>([])
const failedList = ref<FailedRecord[]>([])
const isCreatingMicroApp = ref(false) // 是否正在创建小程序
const waitingCountdown = ref(0) // 等待倒计时（秒）

// 获取步骤状态
function getStepStatus(stepKey: number): 'process' | 'finish' | 'error' | 'wait' {
  if (errorStep.value === stepKey) {
    return 'error'
  }
  if (currentStep.value > stepKey) {
    return 'finish'
  }
  if (currentStep.value === stepKey) {
    return isBuilding.value ? 'process' : 'error'
  }
  return 'wait'
}

// 步骤定义（使用 computed 让步骤4可以动态变化）
const steps = computed(() => [
  { key: 1, title: '获取飞书记录' },
  { key: 2, title: '上传账户头像' },
  { key: 3, title: '创建推广链接' },
  { key: 4, title: isCreatingMicroApp.value ? '创建小程序' : '查询小程序' },
  { key: 5, title: '创建小程序资产' },
  { key: 6, title: '添加付费事件' },
])

// 开始资产化（直接开始，无需选择日期）
async function startBuild() {
  // 重置所有状态
  resetState()

  // 开始执行资产化
  await fetchDramas()
}

// 获取待资产化剧集（不限日期）
async function fetchDramas() {
  try {
    currentStep.value = 1
    errorStep.value = null
    buildError.value = null
    isBuilding.value = true

    // 不传递日期参数，获取所有待资产化的剧集
    const result = await feishuApi.getPendingBuildDramas(undefined, undefined, undefined, true)
    dramas.value = result.data?.items || []

    if (dramas.value.length === 0) {
      isBuilding.value = false
      buildError.value = '当前没有待资产化的剧集'
      errorStep.value = 1
      return
    }

    // 开始执行资产化流程
    await executeBuildProcess()
  } catch (error: unknown) {
    isBuilding.value = false
    buildError.value = getErrorMessage(error) || '获取飞书记录失败'
    errorStep.value = 1
  }
}

// 执行资产化流程
async function executeBuildProcess(startIndex: number = 0) {
  isBuilding.value = true
  buildError.value = null
  errorStep.value = null

  for (let i = startIndex; i < dramas.value.length; i++) {
    currentDramaIndex.value = i + 1
    const drama = dramas.value[i]

    try {
      await buildSingleDrama(drama)

      // 资产化成功后，更新飞书状态为"待搭建"
      try {
        await feishuApi.updateDramaStatus(
          drama.record_id,
          '待搭建',
          FEISHU_CONFIG.daily_table_ids.drama_status
        )
        console.log(`剧集 ${drama.fields['剧名']?.[0]?.text} 状态已更新为"待搭建"`)
      } catch (statusError: unknown) {
        console.error('更新飞书状态失败:', statusError)
        // 状态更新失败不影响资产化流程，继续执行
      }

      successList.value.push(drama)
    } catch (error: unknown) {
      console.error('资产化剧集失败:', error)
      isBuilding.value = false
      buildError.value = getErrorMessage(error) || '未知错误'
      errorStep.value = currentStep.value
      failedList.value.push({
        drama: drama,
        error: getErrorMessage(error),
        step: currentStep.value,
      })
      // 出错后立即停止，不继续处理剩余剧集
      return
    }
  }

  isBuilding.value = false
  currentStep.value = 7 // 完成状态
}

// 资产化单个剧集
async function buildSingleDrama(drama: FeishuDramaRecord) {
  const dramaName = drama.fields['剧名']?.[0]?.text
  const bookId = drama.fields['短剧ID']?.value?.[0]?.text
  const accountId = drama.fields['账户']?.[0]?.text

  if (!dramaName || !bookId || !accountId) {
    throw new Error('剧集信息不完整')
  }

  // 步骤2: 上传账户头像
  currentStep.value = 2
  const uploadResult = await dailyBuildApi.uploadAvatarImage(accountId!)
  await dailyBuildApi.saveAvatar({
    account_id: accountId!,
    web_uri: uploadResult.data.image_info.web_uri,
    width: 300,
    height: 300,
  })

  // 步骤3: 创建推广链接
  currentStep.value = 3
  const promotionResult = await dailyBuildApi.createPromotionLink({
    book_id: bookId!,
    drama_name: dramaName!,
  })

  // 步骤4: 查询/创建小程序
  currentStep.value = 4
  const microAppResult = await dailyBuildApi.queryMicroApp(accountId!)

  let microApp

  if (!microAppResult.data?.micro_app || microAppResult.data.micro_app.length === 0) {
    // 小程序不存在，自动创建
    console.log('小程序不存在，开始自动创建')
    isCreatingMicroApp.value = true // 标记正在创建小程序

    // 从推广链接结果中提取信息
    const parsed = parsePromotionUrl(promotionResult.promotion_url)
    const appId = extractAppIdFromParams(parsed.launchParams)

    if (!appId) {
      throw new Error('无法从推广链接参数中提取 app_id')
    }

    // 从 launchParams 中移除 app_id（因为它会作为顶层参数）
    const cleanedParams = parsed.launchParams
      .split('&')
      .filter(param => !param.startsWith('app_id='))
      .join('&')

    console.log('原始 launchParams:', parsed.launchParams)
    console.log('清理后的 params:', cleanedParams)

    // 生成小程序链接（已包含编码）
    const microAppLink = generateMicroAppLink({
      appId,
      startPage: parsed.launchPage,
      startParams: cleanedParams,
    })

    console.log('========== 小程序链接生成 ==========')
    console.log('生成的小程序链接:', microAppLink)
    console.log('链接长度:', microAppLink.length)

    // 检查关键部分是否被编码
    const hasBdpLogEncoded = microAppLink.includes('bdp_log=%7B')
    const hasStartPageEncoded = microAppLink.includes('start_page=pages%2F')
    console.log('bdp_log 是否已编码:', hasBdpLogEncoded)
    console.log('start_page 是否已编码:', hasStartPageEncoded)
    console.log('====================================')

    // 调用创建 API
    const createResult = await dailyBuildApi.createMicroApp({
      account_id: accountId,
      app_id: appId,
      path: parsed.launchPage,
      query: parsed.launchParams,
      remark: promotionResult.promotion_name,
      link: microAppLink,
    })

    console.log('小程序创建成功:', createResult)

    // 等待 30 秒后查询小程序，显示倒计时
    console.log('等待 30 秒后查询小程序...')
    waitingCountdown.value = 30
    for (let i = 30; i > 0; i--) {
      waitingCountdown.value = i
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    waitingCountdown.value = 0

    // 第一次重新查询
    console.log('开始第一次查询小程序...')
    let recheckResult = await dailyBuildApi.queryMicroApp(accountId!)

    if (!recheckResult.data?.micro_app || recheckResult.data.micro_app.length === 0) {
      // 第一次没找到，再等待 10 秒
      console.log('第一次未查询到小程序，等待 10 秒后重试...')
      waitingCountdown.value = 10
      for (let i = 10; i > 0; i--) {
        waitingCountdown.value = i
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      waitingCountdown.value = 0

      // 第二次查询
      console.log('开始第二次查询小程序...')
      recheckResult = await dailyBuildApi.queryMicroApp(accountId!)

      if (!recheckResult.data?.micro_app || recheckResult.data.micro_app.length === 0) {
        isCreatingMicroApp.value = false
        throw new Error('小程序创建后查询失败（已重试 2 次）')
      }
    }

    microApp = recheckResult.data.micro_app[0]
    console.log('小程序查询成功:', microApp)
    isCreatingMicroApp.value = false // 重置标记
  } else {
    // 小程序已存在
    microApp = microAppResult.data.micro_app[0]
  }

  // 步骤5: 查询小程序资产
  currentStep.value = 5
  const assetsListResult = await dailyBuildApi.listMicroAppAssets(accountId)

  let assetsId: string | number

  // 检查是否已存在小程序资产
  if (assetsListResult.data?.micro_app && assetsListResult.data.micro_app.length > 0) {
    // 已存在，使用第一个资产的 assets_id
    assetsId = assetsListResult.data.micro_app[0].assets_id
    console.log('小程序资产已存在，assets_id:', assetsId)
  } else {
    // 不存在，创建新的小程序资产
    console.log('小程序资产不存在，开始创建')
    const assetResult = await dailyBuildApi.createMicroAppAsset({
      account_id: accountId,
      micro_app_instance_id: microApp.micro_app_instance_id,
    })
    assetsId = assetResult.assets_id
  }

  // 步骤6: 检查并添加付费事件
  currentStep.value = 6
  const eventStatusResult = await dailyBuildApi.checkEventStatus({
    account_id: accountId,
    assets_id: assetsId,
  })

  // 检查是否已存在付费事件
  if (eventStatusResult.has_payment_event) {
    console.log('付费事件已存在，跳过添加')
  } else {
    console.log('付费事件不存在，开始添加')
    await dailyBuildApi.addPaymentEvent({
      account_id: accountId,
      assets_id: assetsId,
    })
  }
}

// 刷新小程序
async function handleRefreshMicroApp() {
  const drama = dramas.value[currentDramaIndex.value - 1]
  const accountId = drama.fields['账户']?.[0]?.text

  if (!accountId) {
    message.error('账户信息不完整')
    return
  }

  try {
    const result = await dailyBuildApi.queryMicroApp(accountId)

    if (result.data?.micro_app && result.data.micro_app.length > 0) {
      // 小程序已创建，从失败列表中移除（如果存在）
      const failedIndex = failedList.value.findIndex(item => item.drama === drama)
      if (failedIndex !== -1) {
        failedList.value.splice(failedIndex, 1)
      }

      // 清除错误状态
      buildError.value = null
      errorStep.value = null
      microAppNotFound.value = false
      isBuilding.value = true

      const microApp = result.data.micro_app[0]

      try {
        // 从步骤4之后继续：查询小程序资产
        currentStep.value = 5
        const assetsListResult = await dailyBuildApi.listMicroAppAssets(accountId)

        let assetsId: string | number

        // 检查是否已存在小程序资产
        if (assetsListResult.data?.micro_app && assetsListResult.data.micro_app.length > 0) {
          // 已存在，使用第一个资产的 assets_id
          assetsId = assetsListResult.data.micro_app[0].assets_id
          console.log('小程序资产已存在，assets_id:', assetsId)
        } else {
          // 不存在，创建新的小程序资产
          console.log('小程序资产不存在，开始创建')
          const assetResult = await dailyBuildApi.createMicroAppAsset({
            account_id: accountId,
            micro_app_instance_id: microApp.micro_app_instance_id,
          })
          assetsId = assetResult.assets_id
        }

        // 步骤6: 检查并添加付费事件
        currentStep.value = 6
        const eventStatusResult = await dailyBuildApi.checkEventStatus({
          account_id: accountId,
          assets_id: assetsId,
        })

        // 检查是否已存在付费事件
        if (eventStatusResult.has_payment_event) {
          console.log('付费事件已存在，跳过添加')
        } else {
          console.log('付费事件不存在，开始添加')
          await dailyBuildApi.addPaymentEvent({
            account_id: accountId,
            assets_id: assetsId,
          })
        }

        // 当前剧集资产化成功
        // 更新飞书状态为"待搭建"
        try {
          await feishuApi.updateDramaStatus(
            drama.record_id,
            '待搭建',
            FEISHU_CONFIG.daily_table_ids.drama_status
          )
          console.log(`剧集 ${drama.fields['剧名']?.[0]?.text} 状态已更新为"待搭建"`)
        } catch (statusError: unknown) {
          console.error('更新飞书状态失败:', statusError)
          // 状态更新失败不影响资产化流程，继续执行
        }

        successList.value.push(drama)

        // 继续处理剩余剧集（从下一部开始）
        await executeBuildProcess(currentDramaIndex.value)
      } catch (error: unknown) {
        console.error('继续资产化失败:', error)
        isBuilding.value = false
        buildError.value = getErrorMessage(error) || '继续资产化失败'
        errorStep.value = currentStep.value
        failedList.value.push({
          drama: drama,
          error: getErrorMessage(error),
          step: currentStep.value,
        })
        // 停止处理
        currentStep.value = 7
      }
    } else {
      message.warning('小程序尚未创建或正在创建中，请稍后再试')
    }
  } catch (error: unknown) {
    message.error(`刷新失败: ${getErrorMessage(error)}`)
  }
}

// 复制到剪贴板
async function handleCopy(text: string) {
  const success = await copyToClipboard(text)
  if (success) {
    message.success('已复制到剪贴板')
  } else {
    message.error('复制失败')
  }
}

// 打开创建小程序页面
function handleCreateMicroApp() {
  if (promotionInfo.value?.createUrl) {
    window.open(promotionInfo.value.createUrl, '_blank')
  }
}

// 关闭弹窗
function handleClose() {
  emit('update:show', false)
}

// 重置状态
function resetState() {
  currentStep.value = 0
  dramas.value = []
  currentDramaIndex.value = 0
  isBuilding.value = false
  buildError.value = null
  errorStep.value = null
  microAppNotFound.value = false
  promotionInfo.value = null
  successList.value = []
  failedList.value = []
  isCreatingMicroApp.value = false
  waitingCountdown.value = 0
}

// 监听弹窗显示状态
watch(
  () => props.show,
  newVal => {
    if (newVal) {
      // 打开弹窗时，直接开始资产化
      startBuild()
    } else {
      // 关闭弹窗时，重置状态
      resetState()
    }
  }
)
</script>

<template>
  <n-modal
    :show="props.show"
    @update:show="$emit('update:show', $event)"
    preset="card"
    title="每日剧场-资产化"
    style="width: 850px"
    :mask-closable="!isBuilding"
    :closable="!isBuilding"
  >
    <!-- 步骤1-6: 搭建流程 -->
    <div v-if="currentStep >= 1 && currentStep <= 6">
      <n-steps :current="currentStep" size="small">
        <n-step
          v-for="step in steps"
          :key="step.key"
          :title="step.title"
          :status="getStepStatus(step.key)"
        />
      </n-steps>

      <div class="mt-6 p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <p class="text-lg font-medium text-gray-900">
            正在处理第 {{ currentDramaIndex }}/{{ dramas.length }} 部剧集
          </p>
          <n-spin v-if="isBuilding" size="small" />
        </div>
        <p v-if="dramas[currentDramaIndex - 1]" class="text-sm text-gray-600">
          剧名: {{ dramas[currentDramaIndex - 1].fields['剧名']?.[0]?.text }}
        </p>
      </div>

      <!-- 创建小程序等待提示 -->
      <n-alert
        v-if="isCreatingMicroApp && waitingCountdown > 0"
        type="info"
        title="正在创建小程序"
        class="mt-4"
      >
        <div class="flex items-center gap-2">
          <n-spin size="small" />
          <p class="text-sm">
            小程序创建成功，等待系统生效中，剩余
            <span class="font-bold text-blue-600">{{ waitingCountdown }}</span>
            秒...
          </p>
        </div>
      </n-alert>

      <!-- 错误提示 -->
      <n-alert v-if="buildError && !microAppNotFound" type="error" title="资产化失败" class="mt-4">
        <p class="text-sm">在步骤「{{ steps[errorStep! - 1]?.title }}」时发生错误：</p>
        <p class="text-sm mt-1 font-mono">{{ buildError }}</p>
      </n-alert>

      <!-- 小程序不存在提示 -->
      <n-alert v-if="microAppNotFound" type="warning" title="未找到小程序" class="mt-4">
        <p class="mb-3 text-sm">请先创建小程序，然后点击"刷新"继续</p>

        <div v-if="promotionInfo" class="space-y-2 text-sm">
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <span class="font-medium w-20">启动页面:</span>
            <button
              @click="handleCopy(promotionInfo!.launchPage)"
              class="flex-1 text-left text-blue-600 hover:text-blue-700 font-mono text-xs truncate"
            >
              {{ promotionInfo!.launchPage }} 📋
            </button>
          </div>
          <div class="flex items-start gap-2 p-2 bg-gray-50 rounded">
            <span class="font-medium w-20 flex-shrink-0">启动参数:</span>
            <button
              @click="handleCopy(promotionInfo!.launchParams)"
              class="flex-1 text-left text-blue-600 hover:text-blue-700 font-mono text-xs break-all"
            >
              {{ promotionInfo!.launchParams }} 📋
            </button>
          </div>
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <span class="font-medium w-20">链接备注:</span>
            <button
              @click="handleCopy(promotionInfo!.promotionName)"
              class="flex-1 text-left text-blue-600 hover:text-blue-700 font-mono text-xs truncate"
            >
              {{ promotionInfo!.promotionName }} 📋
            </button>
          </div>
        </div>

        <div class="mt-4 flex gap-2">
          <n-button type="primary" @click="handleCreateMicroApp"> 去创建小程序 </n-button>
          <n-button @click="handleRefreshMicroApp">刷新小程序</n-button>
        </div>
      </n-alert>
    </div>

    <!-- 步骤7: 完成状态 -->
    <div v-if="currentStep === 7">
      <n-alert type="success" title="资产化完成" class="mb-4">
        <p class="text-sm">成功: {{ successList.length }} 部剧集</p>
        <p class="text-sm">失败: {{ failedList.length }} 部剧集</p>
      </n-alert>

      <div v-if="successList.length > 0" class="mb-4">
        <h4 class="font-medium mb-2 text-green-700">成功列表</h4>
        <ul class="space-y-1">
          <li v-for="drama in successList" :key="drama.record_id" class="text-sm flex items-center">
            <Icon icon="mdi:check-circle" class="w-4 h-4 text-green-500 mr-2" />
            {{ drama.fields['剧名']?.[0]?.text }}
          </li>
        </ul>
      </div>

      <div v-if="failedList.length > 0" class="mb-4">
        <h4 class="font-medium mb-2 text-red-700">失败列表</h4>
        <ul class="space-y-2">
          <li
            v-for="item in failedList"
            :key="item.drama.record_id"
            class="text-sm p-2 bg-red-50 rounded"
          >
            <div class="flex items-center mb-1">
              <Icon icon="mdi:alert-circle" class="w-4 h-4 text-red-500 mr-2" />
              <span class="font-medium">{{ item.drama.fields['剧名']?.[0]?.text }}</span>
            </div>
            <p class="text-xs text-red-600 ml-6">{{ item.error }}</p>
          </li>
        </ul>
      </div>

      <div class="flex justify-end gap-2">
        <n-button type="primary" @click="handleClose">关闭</n-button>
      </div>
    </div>
  </n-modal>
</template>
