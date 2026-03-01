<template>
  <div class="qianlong-stats space-y-6">
    <!-- 控制面板 -->
    <n-card class="shadow-sm">
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <!-- 时间范围选择 -->
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-700 whitespace-nowrap">时间范围:</label>
          <DateRangePicker
            v-model="dateRange"
            @update:model-value="handleDateChange"
            select-class-name="w-40"
            :preset-options="qianlongDateOptions"
          />
        </div>

        <!-- 支付状态筛选 -->
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-700 whitespace-nowrap">支付状态:</label>
          <n-select
            v-model:value="payStatus"
            :options="payStatusOptions"
            @update:value="handlePayStatusChange"
            class="w-32"
          />
        </div>

        <!-- 刷新按钮 -->
        <n-button
          type="primary"
          :loading="isLoading"
          @click="refreshData"
          class="whitespace-nowrap"
        >
          <template #icon>
            <Icon icon="mdi:refresh" />
          </template>
          刷新数据
        </n-button>
      </div>
    </n-card>

    <!-- 统计概览 -->
    <div v-if="aggregateData" class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <n-card class="shadow-sm">
        <n-statistic label="活跃达人数" :value="aggregateData.summary.totalCreators">
          <template #prefix>
            <Icon icon="mdi:account-group" class="text-blue-500" />
          </template>
        </n-statistic>
      </n-card>

      <n-card class="shadow-sm">
        <n-statistic label="总收入" :value="aggregateData.summary.totalAmount" :precision="1">
          <template #prefix>
            <Icon icon="mdi:currency-cny" class="text-green-500" />
          </template>
          <template #suffix>元</template>
        </n-statistic>
      </n-card>

      <n-card class="shadow-sm">
        <n-statistic label="数据天数" :value="dateDays">
          <template #prefix>
            <Icon icon="mdi:calendar-range" class="text-purple-500" />
          </template>
          <template #suffix>天</template>
        </n-statistic>
      </n-card>

      <n-card class="shadow-sm">
        <n-statistic label="日均收入" :value="dailyAverage" :precision="1">
          <template #prefix>
            <Icon icon="mdi:trending-up" class="text-orange-500" />
          </template>
          <template #suffix>元</template>
        </n-statistic>
      </n-card>
    </div>

    <!-- 达人排行榜 -->
    <n-card title="达人收入排行" class="shadow-sm">
      <template #header-extra>
        <n-tag type="info" size="small">按总收入排序</n-tag>
      </template>

      <div v-if="creatorRanking.length === 0" class="text-center py-8 text-gray-500">
        <Icon icon="mdi:chart-line" class="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>暂无数据</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(item, index) in creatorRanking"
          :key="item.creatorName"
          class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
        >
          <div class="flex items-center space-x-3">
            <div
              class="flex items-center justify-center w-8 h-8 rounded-full font-bold text-white"
              :class="{
                'bg-yellow-500': index === 0,
                'bg-gray-400': index === 1,
                'bg-orange-500': index === 2,
                'bg-blue-500': index > 2,
              }"
            >
              {{ index + 1 }}
            </div>
            <div>
              <h4 class="font-medium text-gray-900">{{ item.creatorName }}</h4>
              <p class="text-sm text-gray-500">活跃{{ item.activeDays }}天</p>
            </div>
          </div>

          <div class="text-right">
            <p class="font-semibold text-lg text-gray-900">￥{{ item.totalAmount }}</p>
            <p class="text-sm text-gray-500">
              {{ item.totalOrders }}单 | 日均￥{{ item.avgDailyAmount }}
            </p>
          </div>
        </div>
      </div>
    </n-card>

    <!-- 详细数据表格 -->
    <n-card title="详细数据" class="shadow-sm">
      <template #header-extra>
        <div class="flex items-center space-x-2">
          <n-button size="small" @click="exportData">
            <template #icon>
              <Icon icon="mdi:download" />
            </template>
            导出
          </n-button>
        </div>
      </template>

      <n-data-table
        :columns="tableColumns"
        :data="tableData"
        :loading="isLoading"
        :pagination="{
          pageSize: 20,
          showSizePicker: !isMobile,
          pageSizes: [10, 20, 50, 100],
          size: isMobile ? 'small' : 'medium',
          showQuickJumper: false,
          class: 'mobile-pagination',
        }"
        :scroll-x="800"
        striped
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useAccountStore } from '@/stores/account'
import { useSettingsStore } from '@/stores/settings'
import { getQianlongOrders } from '@/api'
import type { QianlongOrderParams, OrderData, CreatorDailyData } from '@/api/types'
import type { ExtendedError } from '@/api/http'
import { aggregateOrdersByCreator, getCreatorRanking } from '@/utils/qianlong'
import { getQianlongDateRangeByMode } from '@/utils/format'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import DateRangePicker from './DateRangePicker.vue'

// 配置dayjs插件
dayjs.extend(utc)
dayjs.extend(timezone)

// 定义组件名称
defineOptions({
  name: 'QianlongCreatorStats',
})

const message = useMessage()
const accountStore = useAccountStore()
const settingsStore = useSettingsStore()

// 响应式数据
const isLoading = ref(false)
const dateRange = ref<[string, string] | null>(null)
const payStatus = ref<number | undefined>(0) // 默认只显示支付成功
const rawData = ref<OrderData | null>(null)
const aggregateData = ref<ReturnType<typeof aggregateOrdersByCreator> | null>(null)

// 响应式检测
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

// 获取默认日期范围（字符串格式）
function getDefaultDateRange(): [string, string] {
  const [start, end] = getQianlongDateRangeByMode(settingsStore.settings.qianlongDateRangeMode)
  return [
    dayjs(start).tz('Asia/Shanghai').format('YYYY-MM-DD'),
    dayjs(end).tz('Asia/Shanghai').format('YYYY-MM-DD'),
  ]
}

// 牵龙日期范围选项
const qianlongDateOptions = [
  { label: '今日', value: 'today' },
  { label: '近3日', value: '3days' },
  { label: '近7日', value: '7days' },
  { label: '本月', value: 'month' },
  { label: '上个月', value: 'lastMonth' },
  { label: '至今', value: 'all' },
]

// 支付状态选项
const payStatusOptions = [
  { label: '支付成功', value: 0 },
  { label: '未支付', value: 1 },
  { label: '全部', value: undefined },
]

// 计算属性
const dateDays = computed(() => {
  if (!aggregateData.value) return 0
  const { start, end } = aggregateData.value.summary.dateRange
  if (!start || !end) return 0

  // 使用dayjs处理北京时间
  const startDate = dayjs.tz(start, 'Asia/Shanghai')
  const endDate = dayjs.tz(end, 'Asia/Shanghai')

  // 验证日期是否有效
  if (!startDate.isValid() || !endDate.isValid()) {
    console.error('计算日期天数失败: 无效的日期', { start, end })
    return 0
  }

  return endDate.diff(startDate, 'day') + 1
})

const dailyAverage = computed(() => {
  if (!aggregateData.value || dateDays.value === 0) return 0
  return Math.round((aggregateData.value.summary.totalAmount / dateDays.value) * 10) / 10
})

const creatorRanking = computed(() => {
  if (!aggregateData.value) return []
  return getCreatorRanking(aggregateData.value.creatorStats)
})

const tableData = computed(() => {
  if (!aggregateData.value) return []
  return aggregateData.value.creatorStats
})

// 表格列定义
const tableColumns: DataTableColumns<CreatorDailyData> = [
  {
    title: '达人名称',
    key: 'creatorName',
    width: 120,
    fixed: 'left',
  },
  {
    title: '日期',
    key: 'date',
    width: 100,
    sorter: 'default',
  },
  {
    title: '收入金额',
    key: 'totalAmount',
    width: 100,
    render: row => `￥${row.totalAmount}`,
    sorter: (a, b) => a.totalAmount - b.totalAmount,
  },
  {
    title: '订单数量',
    key: 'orderCount',
    width: 100,
    sorter: (a, b) => a.orderCount - b.orderCount,
  },
]

// 方法
function handleDateChange() {
  refreshData()
}

function handlePayStatusChange() {
  refreshData()
}

async function refreshData() {
  // 只有牵龙账号才需要加载数据
  if (!accountStore.isQianlongAccount) return

  // 如果没有日期范围，使用配置的默认设置
  if (!dateRange.value) {
    dateRange.value = getDefaultDateRange()
  }

  // 验证日期范围是否有效
  if (
    !dateRange.value ||
    dateRange.value.length !== 2 ||
    !dateRange.value[0] ||
    !dateRange.value[1]
  ) {
    console.error('牵龙数据获取失败: 无效的日期范围', dateRange.value)
    message.error('日期范围无效，请重新选择')
    return
  }

  isLoading.value = true
  try {
    // 将字符串日期转换为时间戳
    const startTime = dayjs(dateRange.value[0]).tz('Asia/Shanghai').startOf('day').valueOf()
    const endTime = dayjs(dateRange.value[1]).tz('Asia/Shanghai').endOf('day').valueOf()

    const params: QianlongOrderParams = {
      begin_time: Math.floor(startTime / 1000), // 转换为秒级时间戳
      end_time: Math.floor(endTime / 1000),
      page_index: 0,
      page_size: 1000, // 获取较多数据进行聚合
      pay_status: payStatus.value,
    }

    const response = await getQianlongOrders(params)
    rawData.value = response

    // 处理数据聚合
    if (response.data && Array.isArray(response.data)) {
      aggregateData.value = aggregateOrdersByCreator(response.data)
    } else {
      aggregateData.value = {
        creatorStats: [],
        summary: {
          totalCreators: 0,
          totalAmount: 0,
          dateRange: { start: '', end: '' },
        },
      }
    }
  } catch (error) {
    // 只有在拦截器未处理时才显示错误消息
    if (!(error as ExtendedError)?.handledByInterceptor) {
      message.error(error instanceof Error ? error.message : '获取数据失败')
    }
    console.error('获取牵龙数据失败:', error)
  } finally {
    isLoading.value = false
  }
}

function exportData() {
  if (!tableData.value.length) {
    message.warning('暂无数据可导出')
    return
  }

  // 简单的CSV导出
  const headers = ['达人名称', '日期', '收入金额', '订单数量']
  const csvContent = [
    headers.join(','),
    ...tableData.value.map(row =>
      [row.creatorName, row.date, row.totalAmount, row.orderCount].join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `牵龙达人收入统计_${dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')}.csv`
  link.click()

  message.success('数据导出成功')
}

// 监听账号切换
watch(
  () => accountStore.currentAccount,
  newAccount => {
    if (newAccount === 'qianlong') {
      refreshData()
    }
  }
)

// 初始化
onMounted(() => {
  // 加载设置
  settingsStore.loadFromStorage()

  // 设置默认时间范围为配置的推荐设置
  dateRange.value = getDefaultDateRange()

  // 初始化响应式检测
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 只有牵龙账号才加载初始数据
  if (accountStore.isQianlongAccount) {
    refreshData()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.qianlong-stats :deep(.n-statistic .n-statistic-value__content) {
  font-size: 1.5rem;
  font-weight: 600;
}

.qianlong-stats :deep(.n-data-table) {
  font-size: 0.875rem;
}

.qianlong-stats :deep(.n-data-table th) {
  background-color: #f8fafc;
  font-weight: 600;
}

/* 移动端分页器优化 */
.qianlong-stats :deep(.mobile-pagination .n-pagination-item) {
  min-width: 36px;
  height: 36px;
  font-size: 0.875rem;
}

.qianlong-stats :deep(.mobile-pagination .n-pagination-item--button) {
  min-width: 36px;
  height: 36px;
}

@media (max-width: 768px) {
  .qianlong-stats :deep(.mobile-pagination .n-pagination-item) {
    min-width: 32px;
    height: 32px;
    font-size: 0.75rem;
  }

  .qianlong-stats :deep(.mobile-pagination .n-pagination-item--button) {
    min-width: 32px;
    height: 32px;
  }

  .qianlong-stats :deep(.mobile-pagination .n-pagination-prefix) {
    display: none;
  }

  .qianlong-stats :deep(.mobile-pagination .n-pagination-suffix) {
    display: none;
  }
}
</style>
