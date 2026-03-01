<template>
  <!-- 提交搭建日期选择弹窗 -->
  <n-modal
    v-model:show="visible"
    preset="card"
    title="选择搭建日期"
    class="build-date-modal"
    style="width: 420px"
  >
    <div class="space-y-4">
      <div
        v-if="missingUserId"
        class="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg"
      >
        <Icon icon="mdi:alert-circle" class="w-5 h-5 text-orange-500 mt-0.5" />
        <div class="flex-1">
          <p class="text-sm font-semibold text-orange-700">未配置散柔用户ID</p>
          <p class="text-xs text-orange-600 mt-1">请前往设置页的「API配置」填写后再提交搭建。</p>
        </div>
        <n-button size="small" type="warning" secondary @click="goToSettings">去设置</n-button>
      </div>

      <div>
        <p class="text-gray-600 text-sm mb-3">请选择要提交搭建的日期：</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="dateOption in buildDateOptions"
            :key="dateOption.value"
            @click="toggleDate(dateOption.timestamp)"
            :class="[
              'min-w-[60px] px-3 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-all duration-150',
              selectedBuildDates.includes(dateOption.timestamp)
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200',
            ]"
          >
            {{ dateOption.day }}
          </button>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-3">
        <n-button round @click="visible = false">取消</n-button>
        <n-button
          type="warning"
          round
          :disabled="selectedBuildDates.length === 0 || missingUserId"
          :loading="buildSubmitting"
          @click="submitBuildTask"
        >
          确认
        </n-button>
      </div>
    </template>
  </n-modal>

  <!-- 搭建任务提交成功提示弹窗 -->
  <n-modal
    v-model:show="showBuildResultModal"
    preset="dialog"
    title="搭建任务已提交"
    type="success"
  >
    <p class="text-gray-600">搭建任务正在处理中，请前往飞书表格中查看剧集的搭建状态。</p>
    <template #action>
      <n-button type="primary" @click="showBuildResultModal = false">确认</n-button>
    </template>
  </n-modal>

  <!-- 搭建日志列表弹窗 -->
  <n-modal
    v-model:show="logVisible"
    preset="card"
    title="搭建日志"
    class="build-log-modal"
    style="width: 800px; max-width: 95vw"
  >
    <div class="space-y-4">
      <!-- 用户筛选（仅管理员可见） -->
      <div v-if="isAdminUser" class="flex items-center gap-3">
        <span class="text-gray-600 text-sm">筛选用户：</span>
        <div class="flex gap-2">
          <button
            v-for="user in filterUsers"
            :key="user"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
              selectedFilterUser === user
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200',
            ]"
            @click="onFilterUserClick(user)"
          >
            {{ getUserDisplayName(user) }}
          </button>
        </div>
      </div>
      <div class="flex justify-between items-center">
        <p class="text-gray-500 text-sm">共 {{ tasks.length }} 条记录</p>
        <n-button size="small" :loading="tasksLoading" @click="fetchTasks">
          <template #icon>
            <Icon icon="mdi:refresh" class="w-4 h-4" />
          </template>
          刷新
        </n-button>
      </div>
      <n-data-table
        :columns="taskColumns"
        :data="tasks"
        :loading="tasksLoading"
        :bordered="false"
        :single-line="false"
        size="small"
        :row-key="(row: BuildTask) => row.id"
        max-height="400px"
      />
    </div>
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

<script setup lang="ts">
import { computed, ref, watch, h, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { NButton, NTag, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useDarenStore } from '@/stores/daren'
import { useAccountStore } from '@/stores/account'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const darenStore = useDarenStore()
const accountStore = useAccountStore()

// 组件挂载时加载达人配置
onMounted(async () => {
  if (darenStore.darenList.length === 0) {
    await darenStore.loadFromServer()
  }
})

interface DateOption {
  value: string
  day: string
  timestamp: number
}

interface BuildTask {
  id: string
  status: string
  user: string
  date?: string
  dates: string[]
  source: string
  createTime: string
  buildTime?: string
  startedAt: string
  endedAt: string
}

const props = defineProps<{
  show: boolean
  showLog: boolean
  userId?: string | null
}>()

const emit = defineEmits<{
  'update:show': [boolean]
  'update:showLog': [boolean]
  submitted: []
}>()

const router = useRouter()
const message = useMessage()

const visible = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})

const logVisible = computed({
  get: () => props.showLog,
  set: value => emit('update:showLog', value),
})

const buildDateOptions = computed<DateOption[]>(() => {
  const options: DateOption[] = []
  const today = dayjs().tz('Asia/Shanghai').startOf('day')

  // 前7天
  for (let i = 7; i >= 1; i--) {
    const date = today.subtract(i, 'day')
    options.push({
      value: `past-${i}`,
      day: date.format('M.D'),
      timestamp: date.valueOf(),
    })
  }

  // 当天
  options.push({
    value: 'today',
    day: today.format('M.D'),
    timestamp: today.valueOf(),
  })

  // 后7天
  for (let i = 1; i <= 7; i++) {
    const date = today.add(i, 'day')
    options.push({
      value: `future-${i}`,
      day: date.format('M.D'),
      timestamp: date.valueOf(),
    })
  }

  return options
})

const selectedBuildDates = ref<number[]>([])
const buildSubmitting = ref(false)
const showBuildResultModal = ref(false)

// 搭建日志相关
const tasks = ref<BuildTask[]>([])
const tasksLoading = ref(false)
const showDetailModal = ref(false)
const detailLogs = ref<string[]>([])
const detailLoading = ref(false)

// 根据当前账号类型获取用户简称
const getCurrentUserShortName = computed(() => {
  if (!props.userId) return undefined

  // 达人用户：从达人配置中获取
  const daren = darenStore.darenList.find(d => d.id === props.userId)
  if (daren) {
    return daren.shortName
  }

  // 管理员用户：根据当前账号类型返回
  if (props.userId === '2peWAuMpDOqXGj8') {
    // 管理员在散柔账号下返回 xh-sr，在牵龙账号下返回 xh-ql
    return accountStore.isQianlongAccount ? 'xh-ql' : 'xh-sr'
  }

  return undefined
})

// 从达人配置动态获取用户筛选列表
const filterUsers = computed(() => {
  const users = ['xh-sr', 'xh-ql'] // 散柔和牵龙
  darenStore.darenList.forEach(daren => {
    if (daren.shortName) {
      users.push(daren.shortName)
    }
  })
  return users
})

const selectedFilterUser = ref<string>('xh-sr')

// 用户简称到中文名称的映射
const USER_SHORT_NAME_TO_DISPLAY = computed(() => {
  const mapping: Record<string, string> = {
    'xh-sr': '小红-散柔', // 散柔
    'xh-ql': '小红-牵龙', // 牵龙
  }
  darenStore.darenList.forEach(daren => {
    if (daren.shortName) {
      mapping[daren.shortName] = daren.label
    }
  })
  return mapping
})

const isAdminUser = computed(() => {
  if (!props.userId) return false
  const shortName = getCurrentUserShortName.value
  // 管理员（散柔和牵龙）可以看到用户筛选功能
  return shortName === 'xh-sr' || shortName === 'xh-ql'
})

function onFilterUserClick(user: string) {
  selectedFilterUser.value = user
  fetchTasks()
}

// 获取用户显示名称
function getUserDisplayName(userCode: string): string {
  return USER_SHORT_NAME_TO_DISPLAY.value[userCode] || userCode
}

const missingUserId = computed(() => !props.userId || !props.userId.trim())

// 状态标签配置
const statusConfig: Record<
  string,
  { type: 'success' | 'info' | 'error' | 'warning' | 'default'; label: string }
> = {
  success: { type: 'success', label: '成功' },
  running: { type: 'info', label: '执行中' },
  failed: { type: 'error', label: '失败' },
  pending: { type: 'warning', label: '等待中' },
  skipped: { type: 'default', label: '无剧集' },
}

// 任务列表表格列配置
const taskColumns: DataTableColumns<BuildTask> = [
  {
    title: '用户',
    key: 'user',
    width: 80,
    render(row) {
      return getUserDisplayName(row.user)
    },
  },
  {
    title: '日期',
    key: 'dates',
    width: 120,
    render(row) {
      if (row.dates && row.dates.length > 0) {
        return row.dates.join(', ')
      }
      return row.date || '-'
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      const config = statusConfig[row.status] || { type: 'default' as const, label: row.status }
      return h(NTag, { type: config.type, size: 'small', round: true }, () => config.label)
    },
  },
  {
    title: '来源',
    key: 'source',
    width: 80,
    render(row) {
      if (row.source === 'schedule') return '定时'
      if (row.source === 'smart') return '智能'
      return '手动'
    },
  },
  {
    title: '执行时间',
    key: 'buildTime',
    width: 160,
    render(row) {
      return row.buildTime || row.createTime || '-'
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render(row) {
      return h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          text: true,
          onClick: () => fetchTaskDetail(row.id),
        },
        () => '查看'
      )
    },
  },
]

function toggleDate(timestamp: number) {
  const index = selectedBuildDates.value.indexOf(timestamp)
  if (index > -1) {
    selectedBuildDates.value.splice(index, 1)
  } else {
    selectedBuildDates.value.push(timestamp)
  }
}

watch(
  () => props.show,
  value => {
    if (value) {
      // 默认选中当天
      const todayOption = buildDateOptions.value.find(option => option.value === 'today')
      selectedBuildDates.value = todayOption ? [todayOption.timestamp] : []
    } else {
      selectedBuildDates.value = []
    }
  }
)

function goToSettings() {
  visible.value = false
  router.push({ name: 'settings' })
}

async function submitBuildTask() {
  if (selectedBuildDates.value.length === 0) {
    message.error('请选择日期')
    return
  }

  if (missingUserId.value) {
    message.error('请先在设置中配置散柔用户ID')
    return
  }

  // 将 userId 转换为短名称
  const userShortName = getCurrentUserShortName.value
  if (!userShortName) {
    message.error('未知用户，无法提交搭建任务')
    return
  }

  buildSubmitting.value = true

  try {
    // 将时间戳数组转换为 "M.D" 格式的字符串数组
    const dates = selectedBuildDates.value.map(ts => dayjs(ts).format('M.D'))

    const response = await fetch('https://ad-runner.cxyy.top/feishu/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: userShortName, // 传递用户短名称，如 'xh', 'xl'
        dates: dates, // 改为 dates 数组，如 ["12.3", "12.4"]
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || '请求失败')
    }

    visible.value = false
    selectedBuildDates.value = []
    showBuildResultModal.value = true
    emit('submitted')
  } catch (err) {
    console.error('提交搭建任务失败:', err)
    message.error(err instanceof Error ? err.message : '提交搭建任务失败，请重试')
  } finally {
    buildSubmitting.value = false
  }
}

// 获取任务列表
async function fetchTasks() {
  // 管理员使用筛选的用户，非管理员使用当前用户
  let userShortName: string
  if (isAdminUser.value) {
    userShortName = selectedFilterUser.value
  } else {
    if (!props.userId) return
    const shortName = getCurrentUserShortName.value
    if (!shortName) {
      message.error('未知用户，无法查询任务列表')
      return
    }
    userShortName = shortName
  }

  tasksLoading.value = true
  try {
    const response = await fetch(`https://ad-runner.cxyy.top/feishu/tasks?user=${userShortName}`)
    if (!response.ok) {
      throw new Error('获取任务列表失败')
    }
    const data = await response.json()
    tasks.value = data.tasks || []
  } catch (err) {
    console.error('获取任务列表失败:', err)
    message.error('获取任务列表失败')
  } finally {
    tasksLoading.value = false
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

// 监听日志弹窗打开时自动加载数据
watch(logVisible, value => {
  if (value) {
    // 根据当前用户设置默认选中的筛选用户
    if (props.userId) {
      const shortName = getCurrentUserShortName.value
      // 散柔 tab 默认选中 xh-sr，牵龙 tab 默认选中 xh-ql
      if (shortName === 'xh-ql') {
        selectedFilterUser.value = 'xh-ql'
      } else {
        selectedFilterUser.value = 'xh-sr'
      }
    }
    fetchTasks()
  }
})
</script>

<style scoped>
.build-date-modal {
  --n-card-padding: 20px;
}

.build-log-modal {
  --n-card-padding: 20px;
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
