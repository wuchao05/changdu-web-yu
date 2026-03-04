<script setup lang="ts">
import { ref, watch, computed, h } from 'vue'
import {
  NModal,
  NButton,
  NAlert,
  NSpin,
  NInputNumber,
  NForm,
  NFormItem,
  NDataTable,
  NTooltip,
  useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { Icon } from '@iconify/vue'
import {
  getSmartSchedulerStatus,
  startSmartScheduler,
  stopSmartScheduler,
  triggerSmartScheduler,
  type SmartSchedulerStatus,
  type SmartSchedulerTask,
} from '@/api/dailyBuild'

const message = useMessage()
const dialog = useDialog()

interface Props {
  show: boolean
}

interface Emits {
  'update:show': [value: boolean]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 状态管理
const schedulerStatus = ref<SmartSchedulerStatus | null>(null)
const isLoading = ref(false)
const isRefreshingTasks = ref(false) // 刷新任务列表的加载状态
const isTriggeringBuild = ref(false) // 触发立即搭建的加载状态
const interval = ref(30) // 默认30分钟
const isSubmitting = ref(false)

// 获取当前用户名称（用于API调用）
const userName = computed(() => {
  // 当前仅保留每日账号调度标识
  return 'xh-sr'
})

// 计算是否已启动
const isSchedulerEnabled = computed(() => schedulerStatus.value?.enabled === true)

// 任务详情弹窗状态
const showDetailModal = ref(false)
const detailLogs = ref<string[]>([])
const detailLoading = ref(false)

// 任务列表表格列定义
const taskColumns: DataTableColumns<SmartSchedulerTask> = [
  {
    title: 'ID',
    key: 'taskId',
    width: 150,
    render(row) {
      return h(
        NTooltip,
        { placement: 'top' },
        {
          trigger: () =>
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                text: true,
                onClick: () => fetchTaskDetail(row.taskId),
                style: {
                  maxWidth: '130px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                },
              },
              () => row.taskId
            ),
          default: () => row.taskId,
        }
      )
    },
  },
  {
    title: '剧名',
    key: 'dramaName',
    minWidth: 200,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '日期',
    key: 'date',
    width: 80,
  },
  {
    title: '上架时间',
    key: 'releaseTime',
    width: 150,
    render: row => {
      return row.releaseTime || '-'
    },
  },
  {
    title: '搭建时间',
    key: 'buildTime',
    width: 150,
  },
  {
    title: '搭建状态',
    key: 'status',
    width: 100,
    render: row => {
      const statusMap: Record<string, { text: string; class: string }> = {
        success: { text: '成功', class: 'text-green-600' },
        failed: { text: '失败', class: 'text-red-600' },
        running: { text: '运行中', class: 'text-blue-600' },
        pending: { text: '待执行', class: 'text-yellow-600' },
      }
      const status = statusMap[row.status] || { text: row.status, class: 'text-gray-600' }
      return h('span', { class: `font-medium ${status.class}` }, status.text)
    },
  },
  {
    title: '失败原因',
    key: 'error',
    minWidth: 200,
    ellipsis: {
      tooltip: true,
    },
    render: row => {
      return row.error
        ? h('span', { class: 'text-red-600 text-sm' }, row.error)
        : h('span', { class: 'text-gray-400 text-sm' }, '-')
    },
  },
  {
    title: '账户',
    key: 'mediaAccount',
    width: 160,
  },
]

// 任务列表数据
const taskList = computed(() => schedulerStatus.value?.taskList || [])

// 查询调度器状态
async function fetchStatus(showLoading = true) {
  if (showLoading) {
    isLoading.value = true
  }
  try {
    const response = await getSmartSchedulerStatus({ user: userName.value })
    // 查找当前用户的调度器状态
    const userScheduler = response.schedulers.find(s => s.user === userName.value)
    schedulerStatus.value = userScheduler || null

    // 如果找到状态且已启动，更新interval显示值
    if (userScheduler && userScheduler.enabled) {
      interval.value = userScheduler.interval
    }
  } catch (error) {
    console.error('查询智能调度器状态失败:', error)
    message.error(error instanceof Error ? error.message : '查询调度器状态失败')
    schedulerStatus.value = null
  } finally {
    if (showLoading) {
      isLoading.value = false
    }
  }
}

// 刷新任务列表
async function handleRefreshTasks() {
  isRefreshingTasks.value = true
  try {
    await fetchStatus(false) // 不显示全局加载状态
    message.success('任务列表已刷新')
  } catch {
    // 错误已在 fetchStatus 中处理
  } finally {
    isRefreshingTasks.value = false
  }
}

// 启动智能调度器
async function handleStart() {
  // 验证输入
  if (interval.value < 1 || interval.value > 1440) {
    message.error('时间间隔必须在 1-1440 分钟之间')
    return
  }

  isSubmitting.value = true
  try {
    const response = await startSmartScheduler({
      interval: interval.value,
      user: userName.value,
    })

    message.success(response.message || '智能调度器已启动')

    // 刷新状态
    await fetchStatus()
  } catch (error) {
    console.error('启动智能调度器失败:', error)
    message.error(error instanceof Error ? error.message : '启动调度器失败')
  } finally {
    isSubmitting.value = false
  }
}

// 停止智能调度器
async function handleStop() {
  dialog.warning({
    title: '确认停止',
    content: '确定要停止智能调度器吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      isSubmitting.value = true
      try {
        const response = await stopSmartScheduler({
          user: userName.value,
        })

        message.success(response.message || '智能调度器已停止')

        // 刷新状态
        await fetchStatus()
      } catch (error) {
        console.error('停止智能调度器失败:', error)
        message.error(error instanceof Error ? error.message : '停止调度器失败')
      } finally {
        isSubmitting.value = false
      }
    },
  })
}

// 触发立即搭建
async function handleTriggerBuild() {
  isTriggeringBuild.value = true
  try {
    await triggerSmartScheduler({
      user: userName.value,
    })

    message.success('已执行一次搭建任务，请稍后刷新任务列表')
  } catch (error) {
    console.error('触发智能调度器失败:', error)
    message.error(error instanceof Error ? error.message : '触发立即搭建失败')
  } finally {
    isTriggeringBuild.value = false
  }
}

// 获取任务详情日志
async function fetchTaskDetail(taskId: string) {
  showDetailModal.value = true
  detailLoading.value = true
  detailLogs.value = []

  try {
    const response = await fetch(`https://ad-runner.cxyy.top/feishu/run/${taskId}`)
    if (!response.ok) {
      throw new Error('获取任务详情失败')
    }
    const data = await response.json()
    detailLogs.value = data.logs || []
  } catch (err) {
    console.error('获取任务详情失败:', err)
    message.error('获取任务详情失败')
  } finally {
    detailLoading.value = false
  }
}

// 关闭模态框
function handleClose() {
  emit('update:show', false)
}

// 监听模态框显示状态，打开时自动查询状态
watch(
  () => props.show,
  newShow => {
    if (newShow) {
      fetchStatus()
    }
  }
)
</script>

<template>
  <n-modal
    :show="show"
    :mask-closable="!isSubmitting"
    @update:show="handleClose"
    preset="card"
    title="智能搭建调度"
    class="smart-build-modal"
    style="max-width: 1000px; width: 90vw"
  >
    <n-spin :show="isLoading">
      <!-- 已启动状态 -->
      <div v-if="isSchedulerEnabled && schedulerStatus" class="space-y-4">
        <!-- 总览信息卡片 -->
        <div
          class="status-card bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Icon icon="mdi:check-circle" class="w-6 h-6 text-green-600" />
              <h3 class="text-lg font-semibold text-green-800">调度器运行中</h3>
            </div>
            <div class="flex items-center gap-2">
              <n-button
                type="primary"
                size="small"
                :loading="isTriggeringBuild"
                @click="handleTriggerBuild"
              >
                <template #icon>
                  <Icon icon="mdi:play" />
                </template>
                立即搭建
              </n-button>
              <n-button type="error" size="small" :loading="isSubmitting" @click="handleStop">
                <template #icon>
                  <Icon icon="mdi:stop-circle" />
                </template>
                停止
              </n-button>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div class="text-gray-600 mb-1">搭建间隔时间</div>
              <div class="text-lg font-semibold text-gray-900">
                每 {{ schedulerStatus.interval }} 分钟
              </div>
            </div>
            <div>
              <div class="text-gray-600 mb-1">上一轮执行时间</div>
              <div class="text-lg font-semibold text-gray-900">
                {{ schedulerStatus.lastRun || '暂无' }}
              </div>
            </div>
            <div>
              <div class="text-gray-600 mb-1">下一轮执行时间</div>
              <div class="text-lg font-semibold text-gray-900">
                {{ schedulerStatus.nextRun || '暂无' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 任务列表表格 -->
        <div class="bg-white rounded-lg border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h4 class="text-sm font-semibold text-gray-700">搭建任务列表</h4>
            <n-button
              size="small"
              :loading="isRefreshingTasks"
              @click="handleRefreshTasks"
              quaternary
            >
              <template #icon>
                <Icon icon="mdi:refresh" class="w-4 h-4" />
              </template>
              刷新
            </n-button>
          </div>
          <n-data-table
            :columns="taskColumns"
            :data="taskList"
            :bordered="false"
            :single-line="false"
            size="small"
            :max-height="400"
            :scroll-x="1000"
          />
        </div>
      </div>

      <!-- 未启动状态 -->
      <div v-else class="space-y-4">
        <!-- 说明信息 -->
        <n-alert type="info" :bordered="false">
          <template #icon>
            <Icon icon="mdi:information" />
          </template>
          执行搭建任务时会智能选择待搭建剧集，每次执行搭建任务只搭建一部剧
        </n-alert>

        <!-- 配置表单 -->
        <n-form>
          <n-form-item label="执行间隔（分钟）">
            <div class="flex items-center gap-2 w-full">
              <span class="text-sm text-gray-600">每隔</span>
              <n-input-number
                v-model:value="interval"
                :min="1"
                :max="1440"
                :step="1"
                placeholder="请输入间隔时间"
                class="flex-1"
                :disabled="isSubmitting"
              />
              <span class="text-sm text-gray-600">分钟执行一次</span>
            </div>
          </n-form-item>
        </n-form>

        <!-- 提示信息 -->
        <div class="text-sm text-gray-500">
          <p>• 间隔时间范围：1-1440 分钟（1天）</p>
        </div>

        <!-- 启动按钮 -->
        <div class="flex justify-end">
          <n-button type="primary" :loading="isSubmitting" @click="handleStart">
            <template #icon>
              <Icon icon="mdi:play-circle" />
            </template>
            启动智能搭建
          </n-button>
        </div>
      </div>
    </n-spin>
  </n-modal>

  <!-- 任务详情日志弹窗 -->
  <n-modal
    v-model:show="showDetailModal"
    preset="card"
    title="执行日志"
    class="build-detail-modal"
    style="width: 900px; max-width: 95vw"
  >
    <n-spin :show="detailLoading">
      <div class="log-container">
        <pre class="log-content">{{ detailLogs.join('\n') }}</pre>
      </div>
    </n-spin>
    <template #footer>
      <div class="flex justify-end">
        <n-button @click="showDetailModal = false">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.smart-build-modal {
  max-width: 1000px;
}

.status-card {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.grid-cols-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.gap-4 {
  gap: 1rem;
}

.build-detail-modal {
  --n-card-padding: 20px;
}

.log-container {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 16px;
  max-height: 500px;
  overflow: auto;
}

.log-content {
  font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

/* 自定义滚动条 */
.log-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #2d2d2d;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #666;
}
</style>
