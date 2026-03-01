<template>
  <div class="settings-page min-h-screen bg-gray-50">
    <!-- 顶部导航 -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center space-x-4">
        <n-button text @click="$router.back()" class="!text-gray-500 hover:!text-gray-700">
          <template #icon>
            <Icon icon="mdi:arrow-left" />
          </template>
          返回
        </n-button>
        <h1 class="text-xl font-semibold text-gray-900">牵龙设置</h1>
      </div>
    </header>

    <!-- 设置内容 -->
    <main class="px-6 py-8">
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- 牵龙API配置 -->
        <n-card class="shadow-sm border border-gray-200">
          <template #header>
            <div class="flex items-center space-x-3">
              <Icon icon="mdi:api" class="w-5 h-5 text-gray-600" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900">牵龙API配置</h3>
                <p class="text-sm text-gray-500">牵龙账号专用接口配置</p>
              </div>
            </div>
          </template>
          <div class="space-y-4">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-700">Cookie 认证</label>
                <n-input
                  v-model:value="localQianlongApiConfig.cookie"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入牵龙账号的 Cookie 值"
                  @update:value="updateQianlongApiConfig"
                  class="font-mono text-sm"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-700">达人 ID</label>
                <n-input
                  v-model:value="localQianlongApiConfig.distributorId"
                  placeholder="达人的 Distributor ID"
                  @update:value="updateQianlongApiConfig"
                  class="font-mono text-sm"
                />
              </div>
            </div>

            <div class="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div class="flex items-center space-x-2 mb-1">
                <Icon icon="mdi:information" class="w-4 h-4" />
                <span class="font-medium">配置说明</span>
              </div>
              <p>
                用于牵龙账号的专用数据接口，包括达人收入聚合、订单详情等核心功能。配置将安全存储在本地并自动保存。
              </p>
            </div>
          </div>
        </n-card>

        <!-- 抖音号匹配素材 - 牵龙专用 -->
        <n-card class="shadow-sm border border-gray-200">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <Icon icon="mdi:link-variant" class="w-5 h-5 text-gray-600" />
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">抖音号匹配素材</h3>
                  <p class="text-sm text-gray-500">配置抖音号与素材序号的映射关系</p>
                </div>
              </div>
              <n-button type="primary" size="small" @click="handleAddMaterialMatch">
                <template #icon>
                  <Icon icon="mdi:plus" />
                </template>
                添加规则
              </n-button>
            </div>
          </template>

          <!-- 搜索框 -->
          <div class="mb-4">
            <n-input
              v-model:value="materialSearchKeyword"
              placeholder="搜索抖音号..."
              clearable
              class="max-w-md"
            >
              <template #prefix>
                <Icon icon="mdi:magnify" />
              </template>
            </n-input>
          </div>

          <!-- 匹配规则列表 -->
          <div v-if="filteredMaterialMatches.length > 0" class="space-y-2">
            <div
              v-for="match in filteredMaterialMatches"
              :key="match.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div class="flex items-center space-x-4">
                <div class="flex items-center space-x-2">
                  <Icon icon="mdi:account" class="w-4 h-4 text-gray-500" />
                  <span class="font-medium text-gray-900">{{ match.douyinAccount }}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <Icon icon="mdi:identifier" class="w-4 h-4 text-gray-500" />
                  <span class="text-gray-600 text-sm">{{ match.douyinAccountId }}</span>
                </div>
                <Icon icon="mdi:arrow-right" class="w-4 h-4 text-gray-400" />
                <div class="flex items-center space-x-2">
                  <Icon icon="mdi:video" class="w-4 h-4 text-gray-500" />
                  <span class="text-gray-700 font-mono">{{ match.materialRange }}</span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <n-button size="small" @click="handleEditMaterialMatch(match)">编辑</n-button>
                <n-popconfirm @positive-click="handleDeleteMaterialMatch(match.id)">
                  <template #trigger>
                    <n-button size="small" type="error">删除</n-button>
                  </template>
                  确定删除这条匹配规则吗？
                </n-popconfirm>
              </div>
            </div>
          </div>
          <n-empty v-else description="暂无匹配规则，点击上方按钮添加" class="py-8" />
        </n-card>

        <!-- 数据管理 -->
        <n-card class="shadow-sm border border-gray-200">
          <template #header>
            <div class="flex items-center space-x-3">
              <Icon icon="mdi:database" class="w-5 h-5 text-gray-600" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900">数据管理</h3>
                <p class="text-sm text-gray-500">缓存和存储管理</p>
              </div>
            </div>
          </template>
          <div class="space-y-4">
            <div
              class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div class="flex items-start space-x-3">
                <Icon icon="mdi:delete-sweep" class="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 class="text-base font-medium text-gray-900">清除缓存数据</h4>
                  <p class="text-sm text-gray-600">清除本地缓存数据</p>
                </div>
              </div>
              <n-button type="warning" size="medium" @click="clearCache" class="px-4 py-2">
                <template #icon>
                  <Icon icon="mdi:delete-sweep" class="w-4 h-4" />
                </template>
                清除缓存
              </n-button>
            </div>
          </div>
        </n-card>

        <!-- 操作按钮区域 -->
        <n-card class="shadow-sm bg-gray-50 border border-gray-200">
          <div
            class="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-6"
          >
            <div class="flex items-center space-x-3">
              <n-button
                type="primary"
                size="medium"
                :loading="testingQianlongConnection"
                @click="testQianlongConnection"
                class="px-4 py-2"
              >
                <template #icon>
                  <Icon icon="mdi:wifi" class="w-4 h-4" />
                </template>
                测试牵龙连接
              </n-button>
              <n-button size="medium" @click="resetQianlongApiConfig" class="px-4 py-2">
                <template #icon>
                  <Icon icon="mdi:restore" class="w-4 h-4" />
                </template>
                重置配置
              </n-button>
            </div>
            <div class="flex items-center space-x-2 text-sm text-gray-500">
              <Icon icon="mdi:clock-outline" class="w-4 h-4" />
              <span>自动保存</span>
            </div>
          </div>
        </n-card>

        <!-- 素材预览配置 -->
        <n-card class="shadow-sm border border-gray-200">
          <template #header>
            <div class="flex items-center space-x-3">
              <Icon icon="mdi:eye" class="w-5 h-5 text-gray-600" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900">素材预览</h3>
                <p class="text-sm text-gray-500">定时生成素材预览</p>
              </div>
            </div>
          </template>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-base font-medium text-gray-900">启用素材预览</h4>
                <p class="text-sm text-gray-500">
                  启用后，系统将定时查询飞书剧集状态表并生成素材预览
                </p>
              </div>
              <n-switch v-model:value="previewEnabled" />
            </div>

            <div v-if="previewEnabled" class="space-y-4 pl-4 border-l-2 border-cyan-200">
              <!-- 抖音号列表（只读） -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-700">抖音号列表</label>
                <n-space v-if="previewAwemeList.length > 0">
                  <n-tag
                    v-for="(account, index) in previewAwemeList"
                    :key="index"
                    type="info"
                    size="small"
                  >
                    {{ account }}
                  </n-tag>
                </n-space>
                <n-empty v-else description="尚未配置抖音号" size="small" class="py-2" />
                <p class="text-xs text-gray-500">抖音号来自"抖音号匹配素材"配置</p>
              </div>

              <!-- 轮询间隔时间 -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-700">轮询间隔时间（分钟）</label>
                <n-input-number
                  v-model:value="previewIntervalMinutes"
                  :min="20"
                  :max="60"
                  :step="5"
                  placeholder="20-60分钟"
                  class="w-full"
                />
                <p class="text-xs text-gray-500">最低 20 分钟，最高 60 分钟</p>
              </div>

              <!-- 时间窗口起始 -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-700">时间窗口起始（分钟）</label>
                <n-input-number
                  v-model:value="previewBuildTimeWindowStart"
                  :min="1"
                  :step="5"
                  placeholder="默认 90 分钟"
                  class="w-full"
                />
              </div>

              <!-- 时间窗口结束 -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-700">时间窗口结束（分钟）</label>
                <n-input-number
                  v-model:value="previewBuildTimeWindowEnd"
                  :min="1"
                  :step="5"
                  placeholder="默认 20 分钟"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </n-card>
      </div>
    </main>

    <!-- 添加/编辑素材匹配弹窗 -->
    <n-modal
      v-model:show="showMaterialMatchModal"
      preset="card"
      :title="editingMaterialMatchId ? '编辑匹配规则' : '添加匹配规则'"
      style="width: 500px"
    >
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700">抖音号</label>
          <n-input
            v-model:value="materialMatchForm.douyinAccount"
            placeholder="例如：小红看剧"
            clearable
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700">抖音号ID</label>
          <n-input
            v-model:value="materialMatchForm.douyinAccountId"
            placeholder="例如：123456789"
            clearable
          />
          <p class="text-xs text-gray-500">请输入抖音号的数字ID</p>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700">素材序号</label>
          <n-input
            v-model:value="materialMatchForm.materialRange"
            placeholder="例如：01 或 01-04"
            clearable
          />
          <p class="text-xs text-gray-500">支持 "01" 单个序号 或 "01-04" 连续范围格式</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="handleCancelMaterialMatch">取消</n-button>
          <n-button type="primary" @click="handleSaveMaterialMatch">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import {
  useMessage,
  NButton,
  NCard,
  NInput,
  NInputNumber,
  NModal,
  NPopconfirm,
  NEmpty,
  NSwitch,
  NTag,
  NSpace,
} from 'naive-ui'
import { useQianlongApiConfigStore } from '@/stores/qianlongApiConfig'
import {
  useDouyinMaterialQianlongStore,
  type DouyinMaterialMatch,
} from '@/stores/douyinMaterialQianlong'
import { testQianlongConnection as apiTestQianlongConnection } from '@/api/index'
import type { ExtendedError } from '@/api/http'
import { startPreview, stopPreview, updatePreview, getPreviewStatus } from '@/api/previewManager'

// 定义组件名称
defineOptions({
  name: 'QianlongSettingsPage',
})

// 组合式API
const message = useMessage()
const qianlongApiConfigStore = useQianlongApiConfigStore()
const douyinMaterialQianlongStore = useDouyinMaterialQianlongStore()

// 抖音号匹配素材相关
const materialSearchKeyword = ref('')
const showMaterialMatchModal = ref(false)
const editingMaterialMatchId = ref<string | null>(null)
const materialMatchForm = ref({
  douyinAccount: '',
  douyinAccountId: '',
  materialRange: '',
})

// 过滤后的素材匹配
const filteredMaterialMatches = computed(() => {
  const matches = douyinMaterialQianlongStore.matches
  if (!materialSearchKeyword.value) {
    return matches
  }
  return matches.filter(m =>
    m.douyinAccount.toLowerCase().includes(materialSearchKeyword.value.toLowerCase())
  )
})

// 响应式数据
const localQianlongApiConfig = ref({
  cookie: '',
  distributorId: '',
})

const testingQianlongConnection = ref(false)

// 初始化本地状态
function initLocalState() {
  const qianlongApiConfig = qianlongApiConfigStore.config

  localQianlongApiConfig.value = {
    cookie: qianlongApiConfig.cookie,
    distributorId: qianlongApiConfig.distributorId,
  }
}

// 更新牵龙API配置
function updateQianlongApiConfig() {
  qianlongApiConfigStore.updateConfig(localQianlongApiConfig.value)
  message.success('牵龙API配置已更新')
}

// 重置牵龙API配置
function resetQianlongApiConfig() {
  qianlongApiConfigStore.resetConfig()
  initLocalState()
  message.success('牵龙API配置已重置')
}

// 测试牵龙连接
async function testQianlongConnection() {
  testingQianlongConnection.value = true
  try {
    // 验证必填字段
    if (!localQianlongApiConfig.value.cookie.trim()) {
      throw new Error('请填写Cookie认证信息')
    }

    if (!localQianlongApiConfig.value.distributorId.trim()) {
      throw new Error('请填写达人ID')
    }

    // 先保存当前配置，确保测试时使用最新的配置
    qianlongApiConfigStore.updateConfig(localQianlongApiConfig.value)

    // 调用真实的牵龙API进行连接测试
    const response = await apiTestQianlongConnection()

    // 验证响应数据
    if (response && response.code === 0) {
      message.success(`牵龙API连接测试成功！`)
    } else if (response && response.code !== 0) {
      throw new Error(response.message || `API返回错误代码: ${response.code}`)
    } else {
      throw new Error('API返回了无效的响应格式')
    }
  } catch (error) {
    console.error('牵龙API连接测试失败:', error)

    // 处理不同类型的错误
    let errorMessage = '连接测试失败'

    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('认证')) {
        errorMessage = 'Cookie认证信息无效或已过期，请检查Cookie是否正确'
      } else if (error.message.includes('403') || error.message.includes('权限')) {
        errorMessage = '没有访问权限，请检查达人ID是否正确'
      } else if (error.message.includes('4001')) {
        errorMessage = 'Cookie认证信息无效或已过期，请重新获取Cookie'
      } else if (error.message.includes('网络')) {
        errorMessage = '网络连接失败，请检查网络设置'
      } else {
        errorMessage = error.message || '连接测试失败'
      }
    }

    // 只有在拦截器未处理时才显示错误消息
    if (!(error as ExtendedError)?.handledByInterceptor) {
      message.error(errorMessage)
    }
  } finally {
    testingQianlongConnection.value = false
  }
}

// 清除缓存
function clearCache() {
  try {
    // 清除localStorage中的数据
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('changdu-') || key.startsWith('creator-') || key.startsWith('data-')) {
        localStorage.removeItem(key)
      }
    })

    // 清除sessionStorage中的数据
    sessionStorage.clear()

    message.success('缓存数据已清除')
  } catch (error) {
    console.error('清除缓存失败:', error)
    // 只有在拦截器未处理时才显示错误消息
    if (!(error as ExtendedError)?.handledByInterceptor) {
      message.error('清除缓存失败')
    }
  }
}

// 抖音号匹配素材方法
function handleAddMaterialMatch() {
  editingMaterialMatchId.value = null
  materialMatchForm.value = {
    douyinAccount: '',
    douyinAccountId: '',
    materialRange: '',
  }
  showMaterialMatchModal.value = true
}

function handleEditMaterialMatch(match: DouyinMaterialMatch) {
  editingMaterialMatchId.value = match.id
  materialMatchForm.value = {
    douyinAccount: match.douyinAccount,
    douyinAccountId: match.douyinAccountId,
    materialRange: match.materialRange,
  }
  showMaterialMatchModal.value = true
}

async function handleSaveMaterialMatch() {
  // 验证
  if (!materialMatchForm.value.douyinAccount.trim()) {
    message.error('请输入抖音号')
    return
  }
  if (!materialMatchForm.value.douyinAccountId.trim()) {
    message.error('请输入抖音号ID')
    return
  }
  if (!materialMatchForm.value.materialRange.trim()) {
    message.error('请输入素材序号')
    return
  }

  // 验证素材序号格式
  const materialPattern = /^\d+(\-\d+)?$/
  if (!materialPattern.test(materialMatchForm.value.materialRange.trim())) {
    message.error('素材序号格式不正确，应为"01"或"01-04"格式')
    return
  }

  try {
    if (editingMaterialMatchId.value) {
      // 更新
      await douyinMaterialQianlongStore.updateMatch(
        editingMaterialMatchId.value,
        materialMatchForm.value.douyinAccount.trim(),
        materialMatchForm.value.douyinAccountId.trim(),
        materialMatchForm.value.materialRange.trim()
      )
      message.success('更新成功')
    } else {
      // 添加
      await douyinMaterialQianlongStore.addMatch(
        materialMatchForm.value.douyinAccount.trim(),
        materialMatchForm.value.douyinAccountId.trim(),
        materialMatchForm.value.materialRange.trim()
      )
      message.success('添加成功')
    }

    showMaterialMatchModal.value = false
  } catch (error) {
    console.error('保存抖音号素材匹配规则失败:', error)
    message.error('保存失败，请重试')
  }
}

function handleCancelMaterialMatch() {
  showMaterialMatchModal.value = false
}

async function handleDeleteMaterialMatch(id: string) {
  try {
    await douyinMaterialQianlongStore.deleteMatch(id)
    message.success('删除成功')
  } catch (error) {
    console.error('删除抖音号素材匹配规则失败:', error)
    message.error('删除失败，请重试')
  }
}

// 素材预览相关
const previewEnabled = ref(false)
const previewIntervalMinutes = ref(20)
const previewBuildTimeWindowStart = ref(90)
const previewBuildTimeWindowEnd = ref(20)
let isPreviewAutoResetting = false

const previewAwemeList = computed(() => {
  return douyinMaterialQianlongStore.matches.map((m: DouyinMaterialMatch) => m.douyinAccount)
})

// 预览配置的 localStorage key
const previewConfigKey = 'preview_config_qianlong'

// 保存预览配置到 localStorage
function savePreviewConfig() {
  const config = {
    enabled: previewEnabled.value,
    intervalMinutes: previewIntervalMinutes.value,
    buildTimeWindowStart: previewBuildTimeWindowStart.value,
    buildTimeWindowEnd: previewBuildTimeWindowEnd.value,
  }
  localStorage.setItem(previewConfigKey, JSON.stringify(config))
}

// 从 localStorage 加载预览配置
function loadPreviewConfig() {
  const saved = localStorage.getItem(previewConfigKey)
  if (saved) {
    try {
      const config = JSON.parse(saved)
      previewEnabled.value = config.enabled ?? false
      previewIntervalMinutes.value = config.intervalMinutes ?? 20
      previewBuildTimeWindowStart.value = config.buildTimeWindowStart ?? 90
      previewBuildTimeWindowEnd.value = config.buildTimeWindowEnd ?? 20
    } catch (error) {
      console.error('加载预览配置失败:', error)
    }
  }
}

// 监听配置变化，自动保存
watch([previewIntervalMinutes, previewBuildTimeWindowStart, previewBuildTimeWindowEnd], () => {
  savePreviewConfig()
  if (previewEnabled.value) {
    updatePreview({
      user: 'xh-ql',
      intervalMinutes: previewIntervalMinutes.value,
      buildTimeWindowStart: previewBuildTimeWindowStart.value,
      buildTimeWindowEnd: previewBuildTimeWindowEnd.value,
      subject: '欣雅',
      aweme_white_list: previewAwemeList.value,
    }).catch((error: any) => {
      console.error('更新预览配置失败:', error)
    })
  }
})

async function handleStartPreview() {
  const awemeList = previewAwemeList.value
  if (awemeList.length === 0) {
    message.error('启用素材预览需要先配置抖音号匹配素材')
    return
  }
  try {
    const result = await startPreview({
      user: 'xh-ql',
      intervalMinutes: previewIntervalMinutes.value,
      buildTimeWindowStart: previewBuildTimeWindowStart.value,
      buildTimeWindowEnd: previewBuildTimeWindowEnd.value,
      subject: '欣雅',
      aweme_white_list: awemeList,
    })
    message.success(result.message || '预览程序已启用')
  } catch (error: any) {
    const errMsg = error?.response?.data?.error || error?.response?.data?.message || ''
    if (errMsg.includes('已在运行中')) {
      message.info(errMsg)
    } else {
      console.error('启动预览程序失败:', error)
      message.error('启动预览程序失败')
      previewEnabled.value = false
    }
  }
}

async function handleStopPreview() {
  try {
    const result = await stopPreview({ user: 'xh-ql' })
    message.success(result.message || '预览程序已停用')
  } catch (error) {
    console.error('停用预览程序失败:', error)
    message.error('停用预览程序失败')
  }
}

watch(
  () => previewEnabled.value,
  async (newVal, oldVal) => {
    savePreviewConfig()
    if (newVal && !oldVal) {
      const awemeList = previewAwemeList.value
      if (awemeList.length === 0) {
        message.warning('请先配置抖音号匹配素材')
        isPreviewAutoResetting = true
        setTimeout(() => {
          previewEnabled.value = false
          setTimeout(() => {
            isPreviewAutoResetting = false
          }, 100)
        }, 0)
        return
      }
      await handleStartPreview()
    } else if (!newVal && oldVal) {
      if (isPreviewAutoResetting) {
        return
      }
      await handleStopPreview()
    }
  }
)

onMounted(async () => {
  initLocalState()
  loadPreviewConfig()
  // 加载抖音素材匹配配置
  douyinMaterialQianlongStore.loadFromStorage()

  // 从远程查询预览状态，同步开关
  try {
    const statusRes = await getPreviewStatus('xh-ql')
    const program = statusRes.programs?.[0]
    if (program) {
      isPreviewAutoResetting = true
      previewEnabled.value = program.enabled
      if (program.intervalMinutes) previewIntervalMinutes.value = program.intervalMinutes
      if (program.buildTimeWindowStart)
        previewBuildTimeWindowStart.value = program.buildTimeWindowStart
      if (program.buildTimeWindowEnd) previewBuildTimeWindowEnd.value = program.buildTimeWindowEnd
      savePreviewConfig()
      setTimeout(() => {
        isPreviewAutoResetting = false
      }, 100)
    }
  } catch (error) {
    console.error('查询预览状态失败:', error)
  }
})
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
}
</style>
