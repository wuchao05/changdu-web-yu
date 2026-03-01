<template>
  <div class="drama-status-board">
    <!-- 看板头部 -->
    <div class="board-header">
      <div class="flex items-center justify-between mb-4"></div>

      <!-- 控制面板 -->
      <div
        class="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200/60 p-3 sm:p-4 mb-4 shadow-sm"
      >
        <div class="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
          <!-- 时间范围选择器 -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            <div class="flex items-center gap-2">
              <Icon icon="mdi:calendar-range" class="w-4 h-4 text-slate-600" />
              <span class="text-sm font-semibold text-slate-700">时间范围</span>
            </div>
            <div class="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                v-for="option in dateRangeOptions"
                :key="option.value"
                @click="selectedDateRange = option.value"
                :class="[
                  'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border mobile-optimized',
                  selectedDateRange === option.value
                    ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/25'
                    : 'bg-white text-slate-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm',
                ]"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <!-- 排序维度选择器 -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            <div class="flex items-center gap-2">
              <Icon icon="mdi:sort-variant" class="w-4 h-4 text-slate-600" />
              <span class="text-sm font-semibold text-slate-700">排序维度</span>
            </div>
            <div class="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                v-for="option in sortOptions"
                :key="option.value"
                @click="sortDimension = option.value"
                :class="[
                  'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border mobile-optimized',
                  sortDimension === option.value
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/25'
                    : 'bg-white text-slate-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600 hover:shadow-sm',
                ]"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <Icon icon="mdi:loading" class="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <p class="text-gray-600">正在加载剧集状态数据...</p>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
      <div class="flex items-center space-x-3">
        <Icon icon="mdi:alert-circle" class="w-6 h-6 text-red-500" />
        <div>
          <h3 class="text-lg font-semibold text-red-800">加载失败</h3>
          <p class="text-red-600">{{ error }}</p>
        </div>
      </div>
      <button
        @click="refreshData"
        class="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        重试
      </button>
    </div>

    <!-- 看板内容 -->
    <div v-else-if="boardData" class="board-content">
      <!-- 搜索结果显示 -->
      <div
        v-if="searchKeyword.trim()"
        class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
      >
        <div class="flex items-center gap-2">
          <Icon icon="mdi:magnify" class="w-4 h-4 text-blue-600" />
          <span class="text-sm text-blue-800">
            搜索 "{{ searchKeyword }}" 找到 {{ filteredBoardData?.rows?.length || 0 }} 个匹配的剧集
          </span>
          <button
            @click="clearSearch"
            class="ml-auto text-blue-600 hover:text-blue-800 text-sm underline"
          >
            清空搜索
          </button>
        </div>
      </div>

      <!-- 状态表格 -->
      <div
        ref="tableContainer"
        class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mobile-optimized"
      >
        <div class="overflow-auto max-h-[660px]">
          <table class="w-full table-fixed min-w-[800px] sm:min-w-full">
            <thead class="sticky top-0 z-[100] bg-gray-50 border-b border-gray-200">
              <!-- 第一行：日期 -->
              <tr>
                <!-- 序号列 -->
                <th
                  class="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-semibold text-gray-900 w-[50px] sm:w-[60px] sticky left-0 top-0 bg-gray-50 z-[110]"
                >
                  序号
                </th>
                <th
                  @click="toggleStatsDisplay"
                  :class="[
                    'px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 w-[150px] sm:w-[200px] sticky left-[50px] sm:left-[60px] top-0 bg-gray-50 z-[110] cursor-pointer transition-colors',
                    showStats ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-100',
                  ]"
                  :title="showStats ? '隐藏统计' : '显示统计'"
                >
                  <div class="flex items-center space-x-1 sm:space-x-2">
                    <span class="font-bold text-sm sm:text-lg text-gray-900">剧名</span>
                    <span
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-1 rounded-full"
                    >
                      {{ getTotalDramaCount() }} 部
                    </span>
                  </div>
                </th>
                <th
                  v-for="date in filteredBoardData?.dates || []"
                  :key="date"
                  class="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-semibold text-gray-900 w-[100px] sm:w-[120px] bg-gray-50"
                >
                  <div class="flex flex-col items-center space-y-1">
                    <span class="font-bold text-sm sm:text-lg text-gray-900">{{
                      formatDateHeader(date)
                    }}</span>
                    <span
                      class="text-xs px-2 py-1 rounded-full cursor-pointer transition-colors"
                      :class="{
                        'bg-blue-100 text-blue-600': sortByDate === date,
                        'bg-green-100 text-green-600 border-2 border-green-300':
                          hasSelectedCells(date) && sortByDate !== date,
                        'bg-gray-100 text-gray-500 hover:bg-gray-200':
                          !hasSelectedCells(date) && sortByDate !== date,
                      }"
                      @click="handleDateCountClick(date)"
                    >
                      {{ getDateDramaCount(date) }} 部
                    </span>
                  </div>
                </th>
              </tr>
              <!-- 第二行：统计概览（可切换显示） -->
              <tr v-if="showStats" class="bg-gray-100">
                <th
                  class="px-3 py-2 text-center text-xs font-medium text-gray-600 sticky left-0 top-0 bg-gray-100 z-[110] w-[60px]"
                >
                  —
                </th>
                <th
                  class="px-6 py-2 text-left text-xs font-medium text-gray-600 sticky left-[60px] top-0 bg-gray-100 z-[110] w-[200px]"
                >
                  状态统计
                </th>
                <th
                  v-for="date in filteredBoardData?.dates || []"
                  :key="`stats-${date}`"
                  class="px-2 py-2 text-center w-[120px]"
                >
                  <div class="space-y-1.5">
                    <StatusTag
                      v-for="stat in getDateStats(date)"
                      :key="stat.status"
                      :status="stat.status"
                      :count="stat.count"
                      :is-selected="
                        filterState?.date === date && filterState?.status === stat.status
                      "
                      size="sm"
                      variant="default"
                      class="w-full justify-center"
                      @click="toggleStatusFilter(date, stat.status)"
                    />
                  </div>
                </th>
              </tr>
            </thead>

            <!-- 表体 -->
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="row in filteredBoardData?.rows || []"
                :key="row.dramaName"
                :class="[
                  'transition-colors',
                  hasPendingStatus(row)
                    ? 'bg-gray-100 opacity-60 cursor-not-allowed'
                    : 'hover:bg-gray-50',
                ]"
              >
                <!-- 序号列 -->
                <td
                  :class="[
                    'px-2 sm:px-3 py-4 text-center text-xs sm:text-sm font-medium sticky left-0 z-[90] border-r border-gray-200 w-[50px] sm:w-[60px]',
                    hasPendingStatus(row) ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900',
                  ]"
                >
                  <span class="text-gray-600 font-mono">{{
                    (filteredBoardData?.rows?.indexOf(row) ?? -1) + 1
                  }}</span>
                </td>
                <!-- 剧名列 -->
                <td
                  :class="[
                    'px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium sticky left-[50px] sm:left-[60px] z-[90] border-r border-gray-200 w-[150px] sm:w-[200px]',
                    hasPendingStatus(row) ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900',
                  ]"
                >
                  <div class="flex flex-col">
                    <span class="truncate max-w-[130px] sm:max-w-[180px]" :title="row.dramaName">
                      {{ row.dramaName }}
                    </span>
                    <!-- 显示排序相关的统计信息 -->
                    <div class="text-xs text-gray-500 mt-1">
                      <span v-if="sortDimension === 'recharge_orders'">
                        充值订单: {{ getDramaOrderCount(row.dramaName) }}
                      </span>
                      <span v-else-if="sortDimension === 'recharge_amount'">
                        充值金额: ¥{{ getDramaRechargeAmount(row.dramaName).toLocaleString() }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- 状态列 -->
                <td
                  v-for="date in filteredBoardData?.dates || []"
                  :key="`${row.dramaName}-${date}`"
                  class="px-2 sm:px-4 py-4 text-center w-[100px] sm:w-[120px]"
                >
                  <!-- 如果是待剪辑状态，显示可点击的选中状态 -->
                  <div
                    v-if="row.statusByDate[date] === '待剪辑'"
                    :class="[
                      'flex items-center justify-center cursor-pointer rounded-lg p-2 transition-colors group h-full',
                      'bg-blue-100 border-2 border-blue-300',
                      isCellProcessing(row, date) || isCellDisabled(row, date)
                        ? 'opacity-50 cursor-not-allowed'
                        : '',
                    ]"
                    @click="!isCellDisabled(row, date) && handleCellClick(row, date)"
                  >
                    <Icon
                      :icon="
                        isCellProcessing(row, date) ? 'mdi:loading' : 'mdi:radio-button-checked'
                      "
                      :class="[
                        'w-4 h-4 transition-colors mr-2 flex-shrink-0',
                        isCellProcessing(row, date)
                          ? 'text-gray-400 animate-spin'
                          : 'text-blue-600',
                      ]"
                    />
                    <span
                      :class="[
                        'text-xs transition-colors',
                        isCellProcessing(row, date) || isCellDisabled(row, date)
                          ? 'text-gray-400'
                          : 'text-blue-700 font-medium',
                      ]"
                    >
                      {{ isCellProcessing(row, date) ? '处理中...' : '待剪辑' }}
                    </span>
                  </div>
                  <!-- 如果有其他状态，显示状态徽章 -->
                  <StatusBadge
                    v-else-if="row.statusByDate[date] && row.statusByDate[date] !== '—'"
                    :status="row.statusByDate[date]"
                  />
                  <!-- 如果没有状态且剧集没有待下载状态，显示可点击的单选框 -->
                  <div
                    v-else-if="!hasPendingStatus(row)"
                    :class="[
                      'flex items-center justify-center cursor-pointer rounded-lg p-2 transition-colors group h-full',
                      isCellProcessing(row, date)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-green-50 hover:border-green-200',
                      isCellDisabled(row, date) ? 'opacity-50 cursor-not-allowed' : '',
                    ]"
                    @click="!isCellDisabled(row, date) && handleCellClick(row, date)"
                  >
                    <Icon
                      :icon="
                        isCellProcessing(row, date)
                          ? 'mdi:loading'
                          : 'mdi:checkbox-blank-circle-outline'
                      "
                      :class="[
                        'w-4 h-4 transition-colors mr-2 flex-shrink-0',
                        isCellProcessing(row, date)
                          ? 'text-gray-400 animate-spin'
                          : 'text-green-500 group-hover:text-green-600',
                      ]"
                    />
                    <span
                      :class="[
                        'text-xs transition-colors',
                        isCellProcessing(row, date) || isCellDisabled(row, date)
                          ? 'text-gray-400'
                          : 'text-green-700',
                      ]"
                    >
                      {{ isCellProcessing(row, date) ? '处理中...' : '选中' }}
                    </span>
                  </div>
                  <!-- 如果剧集有待下载状态，显示灰色状态 -->
                  <div v-else class="flex items-center justify-center text-xs text-gray-400 h-full">
                    —
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <UploadModal ref="uploadModalRef" v-model:show="showUploadModal" :board-data="boardData" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useMessage } from 'naive-ui'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// 配置 dayjs 插件
dayjs.extend(utc)
dayjs.extend(timezone)
import {
  dramaStatusService,
  type DramaStatusBoard,
  type DramaStatusRow,
} from '@/services/dramaStatusService'
import { feishuApi } from '@/api/feishu'
import { getOrders, getQianlongOrders } from '@/api'
import { checkProductExists } from '@/api/productLib'
import { parsePromotionName } from '@/utils/qianlong'
import {
  searchSplayAlbums,
  getSplayMiniProgramUrl,
  createSplayProduct,
  findMatchingAlbum,
} from '@/api/splay'
import { editJiliangAccountRemark } from '@/api/jiliang'
import { useCreatorStore } from '@/stores/creator'
import { useAccountStore } from '@/stores/account'
import { useApiConfigStore } from '@/stores/apiConfig'
import { useDramaSubjectStore } from '@/stores/dramaSubject'
import { useGlobalDateRange } from '@/composables/useGlobalDateRange'
import { useUserAuth } from '@/composables/useUserAuth'
import { getProductLibraryConfigBySubject } from '@/config/productLibrary'
import { dateToTimestamp, normalizeToDayStart, normalizeToDayEnd } from '@/utils/format'
import type { OrderItem, SplayCreateProductParams } from '@/api/types'
import StatusBadge from './StatusBadge.vue'
import StatusTag from './StatusTag.vue'
import UploadModal from './UploadModal.vue'

// 响应式数据
const loading = ref(false)
const error = ref<string | null>(null)
const boardData = ref<DramaStatusBoard | null>(null)
const showUploadModal = ref(false)
const uploadModalRef = ref<InstanceType<typeof UploadModal> | null>(null)
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
const showUploadButton = import.meta.env.DEV && !isMobile
const canOpenUpload = showUploadButton
// 跟踪选中的单元格：剧名-日期 -> 是否选中
const selectedCells = ref<Set<string>>(new Set())
// 跟踪单元格的record_id：剧名-日期 -> record_id
const cellRecordIds = ref<Map<string, string>>(new Map())
// 跟踪正在处理的单元格，防止重复点击
const processingCells = ref<Set<string>>(new Set())
// 当前正在操作的单元格（用于全局禁用）
const activeOperationCellKey = ref<string | null>(null)

// 控制统计信息的显示
const showStats = ref(false)

// 排序相关
const sortByDate = ref<string | null>(null) // 当前按日期排序的日期

// 过滤状态
const filterState = ref<{
  date: string
  status: string
} | null>(null)

// 订单数据相关
const orderData = ref<OrderItem[]>([])
const orderLoading = ref(false)

// 处理后的订单数据：剧名 -> 订单统计
const processedOrderData = ref<
  Map<
    string,
    {
      rechargeOrders: number
      totalOrders: number
      rechargeAmount: number
    }
  >
>(new Map())

// 控制面板相关
const selectedDateRange = ref<string>('7') // 默认近7日
const sortDimension = ref<string>('recharge_orders') // 默认按充值订单数排序

// 选项数据
const dateRangeOptions = [
  { value: 'today', label: '今日' },
  { value: '3', label: '近3日' },
  { value: '7', label: '近7日' },
  { value: 'month', label: '本月' },
  { value: 'all', label: '至今' },
]

const sortOptions = [
  { value: 'recharge_orders', label: '充值订单数' },
  { value: 'recharge_amount', label: '充值金额' },
]

// 搜索过滤相关
const searchKeyword = ref<string>('')

// Store 实例
const creatorStore = useCreatorStore()
const accountStore = useAccountStore()
const apiConfigStore = useApiConfigStore()
const dramaSubjectStore = useDramaSubjectStore()
const { isDarenUser } = useUserAuth()

// 使用全局日期范围管理
const { sanrouDateRange, setSanrouDateRange } = useGlobalDateRange()

// 使用 Naive UI 的 message API
const message = useMessage()

// 表格容器引用
const tableContainer = ref<HTMLElement | null>(null)

function openUploadModal() {
  if (!canOpenUpload) return
  showUploadModal.value = true
}

// 格式化日期表头
function formatDateHeader(dateString: string): string {
  const date = new Date(dateString)
  return `${date.getMonth() + 1}-${date.getDate()}`
}

// 切换统计信息显示
function toggleStatsDisplay() {
  showStats.value = !showStats.value
}

// 切换状态过滤
function toggleStatusFilter(date: string, status: string) {
  // 如果当前已经选中了这个状态，则取消选中
  if (filterState.value?.date === date && filterState.value?.status === status) {
    filterState.value = null
  } else {
    // 否则选中这个状态
    filterState.value = { date, status }
  }
}

// 优化未支付订单：相同用户ID的未支付订单只保留最后一个
function optimizeUnpaidOrders(orders: OrderItem[]): OrderItem[] {
  const userUnpaidOrders = new Map<string, OrderItem[]>()
  const result: OrderItem[] = []

  // 按用户ID分组未支付订单
  orders.forEach(order => {
    if (order.pay_status === 1) {
      // 未支付订单
      if (!userUnpaidOrders.has(order.device_id)) {
        userUnpaidOrders.set(order.device_id, [])
      }
      userUnpaidOrders.get(order.device_id)!.push(order)
    } else {
      // 已支付订单直接保留
      result.push(order)
    }
  })

  // 对每个用户的未支付订单，按创建时间排序，只保留最后一个
  userUnpaidOrders.forEach(unpaidOrders => {
    if (unpaidOrders.length > 0) {
      // 按创建时间降序排序，取第一个（最新的）
      const sortedOrders = unpaidOrders.sort(
        (a, b) => new Date(b.order_create_time).getTime() - new Date(a.order_create_time).getTime()
      )
      result.push(sortedOrders[0])
    }
  })

  return result
}

// 获取剧名的充值订单数量
function getDramaOrderCount(dramaName: string): number {
  const normalizedDramaName = normalizeDramaName(dramaName)

  // 遍历所有订单数据，找到匹配的剧名
  for (const [orderDramaName, stats] of processedOrderData.value.entries()) {
    if (normalizeDramaName(orderDramaName) === normalizedDramaName) {
      return stats.rechargeOrders
    }
  }

  return 0
}

// 获取剧名的充值金额
function getDramaRechargeAmount(dramaName: string): number {
  const normalizedDramaName = normalizeDramaName(dramaName)

  // 遍历所有订单数据，找到匹配的剧名
  for (const [orderDramaName, stats] of processedOrderData.value.entries()) {
    if (normalizeDramaName(orderDramaName) === normalizedDramaName) {
      return stats.rechargeAmount
    }
  }

  return 0
}

// 计算过滤后的数据
const filteredBoardData = computed(() => {
  if (!boardData.value) {
    return null
  }

  let rows = boardData.value.rows
  let dates = boardData.value.dates

  // 根据搜索关键词过滤剧名
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    rows = rows.filter(row => {
      return row.dramaName.toLowerCase().includes(keyword)
    })
  }

  // 根据选择的日期范围过滤日期
  if (selectedDateRange.value !== 'all') {
    const [startDate] = calculateDateRange(selectedDateRange.value)
    const cutoffDate = new Date(startDate)

    dates = dates.filter(date => {
      const dateObj = new Date(date)
      return dateObj >= cutoffDate
    })
  }

  if (filterState.value) {
    const { date, status } = filterState.value
    rows = rows.filter(row => {
      return row.statusByDate[date] === status
    })
  }

  // 如果设置了按日期排序
  if (sortByDate.value) {
    const targetDate = sortByDate.value

    // 分离有状态和无状态的剧
    const rowsWithStatus = rows.filter(row => {
      const status = row.statusByDate[targetDate]
      return status && status !== '—'
    })

    const rowsWithoutStatus = rows.filter(row => {
      const status = row.statusByDate[targetDate]
      return !status || status === '—'
    })

    // 对有状态的剧按状态优先级排序
    rowsWithStatus.sort((a, b) => {
      const statusA = a.statusByDate[targetDate]
      const statusB = b.statusByDate[targetDate]
      const priorityA = getStatusPriority(statusA)
      const priorityB = getStatusPriority(statusB)
      return priorityA - priorityB
    })

    // 合并：有状态的剧在前，无状态的剧在后
    rows = [...rowsWithStatus, ...rowsWithoutStatus]
  } else {
    // 根据选择的排序维度排序
    rows = [...rows].sort((a, b) => {
      let valueA: number
      let valueB: number

      switch (sortDimension.value) {
        case 'recharge_orders':
          valueA = getDramaOrderCount(a.dramaName)
          valueB = getDramaOrderCount(b.dramaName)
          break
        case 'recharge_amount':
          valueA = getDramaRechargeAmount(a.dramaName)
          valueB = getDramaRechargeAmount(b.dramaName)
          break
        default:
          valueA = getDramaOrderCount(a.dramaName)
          valueB = getDramaOrderCount(b.dramaName)
      }

      return valueB - valueA // 降序排列
    })
  }

  return {
    ...boardData.value,
    rows: rows,
    dates: dates,
  }
})

// 获取指定日期的统计数据
function getDateStats(date: string) {
  if (!boardData.value) return []

  const statusOrder = ['待下载', '待剪辑', '剪辑中', '待上传', '上传中', '待搭建', '已完成']
  const stats: { [key: string]: number } = {}

  // 初始化所有状态计数为0
  statusOrder.forEach(status => {
    stats[status] = 0
  })

  // 统计每个状态的数量
  boardData.value.rows.forEach(row => {
    const status = row.statusByDate[date]
    if (status && status !== '—' && statusOrder.includes(status)) {
      stats[status]++
    }
  })

  // 返回有数据的统计项
  return statusOrder
    .map(status => ({
      status,
      count: stats[status],
    }))
    .filter(stat => stat.count > 0)
}

// 获取指定日期下已有状态的剧数量（包含选中状态）
function getDateDramaCount(date: string): number {
  if (!boardData.value) return 0

  let count = 0
  boardData.value.rows.forEach(row => {
    const status = row.statusByDate[date]
    const cellKey = `${row.dramaName}-${date}`

    // 如果已有状态或者是选中的待剪辑状态，都计入数量
    if ((status && status !== '—') || selectedCells.value.has(cellKey)) {
      count++
    }
  })

  return count
}

// 判断指定日期是否有选中的待剪辑状态
function hasSelectedCells(date: string): boolean {
  if (!boardData.value) return false

  return boardData.value.rows.some(row => {
    const cellKey = `${row.dramaName}-${date}`
    return selectedCells.value.has(cellKey)
  })
}

// 获取当前剧的总数
function getTotalDramaCount(): number {
  if (!boardData.value) return 0
  return boardData.value.rows.length
}

// 点击日期剧数量进行排序
function handleDateCountClick(date: string) {
  if (!boardData.value) return

  // 如果点击的是当前排序日期，则取消排序
  if (sortByDate.value === date) {
    sortByDate.value = null
    return
  }

  // 设置新的排序日期
  sortByDate.value = date
}

// 获取状态优先级
function getStatusPriority(status: string): number {
  const statusOrder = ['待下载', '待剪辑', '剪辑中', '待上传', '上传中', '待搭建', '已完成']
  return statusOrder.indexOf(status)
}

// 判断某部剧是否包含待下载状态
function hasPendingStatus(row: DramaStatusRow): boolean {
  return Object.values(row.statusByDate).some(status => status === '待下载')
}

// ============ 商品相关常量和函数 ============

// 默认商品分类配置（都市-其他，其他频）
const DEFAULT_PRODUCT_CONFIG = {
  firstCategoryId: '2019',
  firstCategoryName: '短剧',
  subCategoryId: '201901',
  subCategoryName: '都市',
  thirdCategoryId: '20190133',
  thirdCategoryName: '其他',
  playletGender: '3' as const,
}

// 商品创建重试延迟配置
const PRODUCT_CREATE_INITIAL_DELAY = 1000
const PRODUCT_CREATE_MAX_DELAY = 8000
const SPLAY_AD_CARRIER = '字节小程序'

// 等待函数
function wait(duration: number) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

// 重试创建商品
async function createProductWithRetry(
  payload: SplayCreateProductParams,
  token: string,
  dramaName: string
) {
  let delay = PRODUCT_CREATE_INITIAL_DELAY

  while (true) {
    const response = await createSplayProduct(payload, token)
    const result = response.data?.[0]

    if (result && !result.result && result.product_id) {
      return result
    }

    if (result?.result?.includes('系统请求频率超限')) {
      await wait(delay)
      delay = Math.min(delay * 2, PRODUCT_CREATE_MAX_DELAY)
      continue
    }

    throw new Error(result?.result || `新增商品失败：${dramaName}`)
  }
}

// 为单个剧集新增商品
async function addProductForDrama(
  dramaName: string,
  token: string,
  subject?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 根据用户 ID 和主体获取对应的商品库配置
    const productLibConfig = getProductLibraryConfigBySubject(
      apiConfigStore.effectiveUserId,
      subject
    )

    // 1. 查询番茄后台剧集
    const albumResponse = await searchSplayAlbums(dramaName, token)
    if (albumResponse.code !== 0 || !albumResponse.data) {
      throw new Error(albumResponse.message || '番茄后台查询剧集失败')
    }

    // 2. 查找匹配的专辑
    const album = await findMatchingAlbum(albumResponse.data.list || [], dramaName, token)
    if (!album) {
      throw new Error(`番茄后台未找到符合条件的剧：${dramaName}`)
    }

    // 3. 获取小程序链接
    const miniProgramResponse = await getSplayMiniProgramUrl(album.id, token)
    if (miniProgramResponse.code !== 0 || !miniProgramResponse.data) {
      throw new Error(miniProgramResponse.message || '获取小程序链接失败')
    }

    // 4. 构建商品数据
    const productPayload: SplayCreateProductParams = {
      product_list: [
        {
          mini_program_info: miniProgramResponse.data,
          playlet_gender: DEFAULT_PRODUCT_CONFIG.playletGender,
          name: dramaName,
          ad_carrier: SPLAY_AD_CARRIER,
          album_id: album.id,
          image_url: album.cover || '',
          first_category: DEFAULT_PRODUCT_CONFIG.firstCategoryName,
          sub_category: DEFAULT_PRODUCT_CONFIG.subCategoryName,
          third_category: DEFAULT_PRODUCT_CONFIG.thirdCategoryName,
          first_category_id: DEFAULT_PRODUCT_CONFIG.firstCategoryId,
          sub_category_id: DEFAULT_PRODUCT_CONFIG.subCategoryId,
          third_category_id: DEFAULT_PRODUCT_CONFIG.thirdCategoryId,
        },
      ],
      ad_account_id: productLibConfig.adAccountId,
      is_free: 0,
      product_platform_id: productLibConfig.productPlatformId,
    }

    // 5. 创建商品（带重试）
    await createProductWithRetry(productPayload, token, dramaName)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '新增商品失败，请稍后重试'
    return { success: false, error: errorMessage }
  }
}

// ============ 商品相关函数结束 ============

// 处理单元格点击事件
async function handleCellClick(row: DramaStatusRow, date: string) {
  const cellKey = `${row.dramaName}-${date}`

  // 如果已有其他单元格正在操作，阻止并发
  if (activeOperationCellKey.value && activeOperationCellKey.value !== cellKey) {
    return
  }

  // 处理阶段锁定其他已选中的单元格，防止并发操作
  if (isCellDisabled(row, date)) {
    return
  }

  // 如果正在处理中，忽略点击
  if (processingCells.value.has(cellKey)) {
    return
  }

  try {
    activeOperationCellKey.value = cellKey
    processingCells.value.add(cellKey)

    // 如果状态是"待剪辑"或者是已选中的单元格，则执行删除操作
    if (row.statusByDate[date] === '待剪辑' || selectedCells.value.has(cellKey)) {
      // 获取记录ID：优先从缓存获取，如果是"待剪辑"状态则查询
      let recordId = cellRecordIds.value.get(cellKey)

      // 如果是"待剪辑"状态，总是尝试获取recordId（优先缓存，否则查询）
      if (row.statusByDate[date] === '待剪辑') {
        if (!recordId) {
          try {
            const timestamp = new Date(date).getTime()
            const searchResult = await feishuApi.searchDramaStatusRecord(row.dramaName, timestamp)
            if (searchResult.data && searchResult.data.total > 0) {
              // 找到对应的记录，获取recordId
              const record = searchResult.data.items.find(item => {
                const itemDramaName = item.fields['剧名']?.[0]?.text
                const itemTimestamp = item.fields['日期']?.value || item.fields['日期']
                return itemDramaName === row.dramaName && itemTimestamp === timestamp
              })
              if (record) {
                recordId = record.record_id
                // 缓存recordId
                cellRecordIds.value.set(cellKey, recordId)
              }
            }
          } catch (searchError) {
            console.error('查询待剪辑记录失败:', searchError)
            message.error('查询待剪辑记录失败，请重试')
            return
          }
        } else {
          console.log('使用缓存的recordId:', recordId)
        }
      }

      if (recordId) {
        try {
          // 先获取剪辑记录详情，获取账户信息
          const recordDetail = await feishuApi.getClipRecordById(recordId)
          const accountName = recordDetail.data?.record?.fields?.账户

          // 删除剪辑记录
          await feishuApi.deleteClipRecord(recordId)

          // 如果有账户信息，将其标记为未使用
          if (accountName) {
            try {
              // 自动根据达人/主体配置获取正确的账户表
              const huyuAccountRecordId = await feishuApi.findHuyuAccountRecordId(accountName)
              if (huyuAccountRecordId) {
                await feishuApi.updateHuyuAccountUnusedStatus(huyuAccountRecordId)
                console.log('账户已释放:', accountName, huyuAccountRecordId)
              }
            } catch (accountError) {
              console.error('释放账户失败:', accountError)
              // 不中断删除流程，只记录错误
            }
          }

          cellRecordIds.value.delete(cellKey)
          console.log('删除剪辑记录:', row.dramaName, date, recordId)

          // 删除成功后只刷新状态数据，不重新拉取订单数据
          await refreshStatusDataOnly()
        } catch (error) {
          console.error('删除剪辑记录失败:', error)
          message.error('删除剪辑记录失败，请重试')
          return
        }
      }
      selectedCells.value.delete(cellKey)
    } else {
      // 如果未选中，则创建记录并选中
      const timestamp = new Date(date).getTime()

      try {
        // 获取可用的账户（自动根据达人/主体配置获取正确的账户表）
        const availableAccount = await feishuApi.getAvailableHuyuAccount()

        if (availableAccount) {
          // 创建剪辑记录，包含剧名、账户和主体（没有上架时间，达人不传主体）
          const clipStatus = isDarenUser.value ? '待剪辑' : '待下载'
          const result = await feishuApi.createClipRecord(
            row.dramaName,
            timestamp,
            availableAccount.account,
            undefined, // DramaStatusBoard 中没有上架时间信息
            isDarenUser.value ? undefined : dramaSubjectStore.subjectFieldValue,
            undefined, // douyinMaterial
            undefined, // rating
            clipStatus
          )
          // 更新账户的"是否已用"状态为"是"（自动根据达人/主体配置获取正确的账户表）
          await feishuApi.updateHuyuAccountUsedStatus(availableAccount.recordId)

          if (result.data?.record?.record_id) {
            cellRecordIds.value.set(cellKey, result.data.record.record_id)
            selectedCells.value.add(cellKey)
            // 立即更新本地状态为待剪辑，避免等待下次刷新才显示
            row.statusByDate[date] = '待剪辑'
            console.log('创建剪辑记录:', row.dramaName, date, result.data.record.record_id)

            // 如果是每日主体，更新巨量账户备注（账户字段即为巨量账户ID）
            if (dramaSubjectStore.isDailySubject && availableAccount.account) {
              try {
                const remark = `小红-${row.dramaName}`
                await editJiliangAccountRemark({
                  account_id: availableAccount.account,
                  remark,
                })
                console.log('更新巨量账户备注成功:', availableAccount.account, remark)
              } catch (jiliangError) {
                console.error('更新巨量账户备注失败:', jiliangError)
                // 不中断主流程，只记录错误
              }
            }

            // 创建剪辑记录成功后，检查并新增商品
            const xtToken = apiConfigStore.config.xtToken
            if (xtToken) {
              try {
                const exists = await checkProductExists(
                  row.dramaName,
                  xtToken,
                  undefined,
                  dramaSubjectStore.subjectFieldValue
                )
                if (!exists) {
                  console.log('商品不存在，开始新增商品:', row.dramaName)
                  const productResult = await addProductForDrama(
                    row.dramaName,
                    xtToken,
                    dramaSubjectStore.subjectFieldValue
                  )
                  if (productResult.success) {
                    console.log('新增商品成功:', row.dramaName)
                  } else {
                    console.warn('新增商品失败:', row.dramaName, productResult.error)
                  }
                } else {
                  console.log('商品已存在，跳过新增:', row.dramaName)
                }
              } catch (productError) {
                console.error('检查/新增商品失败:', productError)
                // 不中断主流程，只记录错误
              }
            }

            // 选中操作后不立即刷新数据，保持选中状态
            // 只在删除操作后刷新数据
          }
        } else {
          // 没有可用账户，显示提示
          message.error('暂无可用的账户，请及时联系管理员添加并完成录户')
          return
        }
      } catch (accountError) {
        console.error('分配账户失败:', accountError)
        // 分配账户失败，显示错误提示
        const errorMessage = accountError instanceof Error ? accountError.message : '未知错误'
        message.error(`分配账户失败：${errorMessage}`)
        return
      }
    }
  } catch (err) {
    console.error('处理单元格点击失败:', err)
    // 显示错误提示
    error.value = err instanceof Error ? err.message : '操作失败，请重试'
  } finally {
    processingCells.value.delete(cellKey)

    // 如果没有其他处理中的单元格，释放操作锁
    if (processingCells.value.size === 0) {
      activeOperationCellKey.value = null
    }
  }
}

// 检查单元格是否正在处理中
function isCellProcessing(row: DramaStatusRow, date: string): boolean {
  const cellKey = `${row.dramaName}-${date}`
  return processingCells.value.has(cellKey)
}

// 判断单元格是否需要禁用
function isCellDisabled(row: DramaStatusRow, date: string): boolean {
  const cellKey = `${row.dramaName}-${date}`
  // 任意处理中的单元格时，所有可操作单元格禁用
  if (processingCells.value.size > 0) {
    return true
  }
  // 有操作锁时，除当前操作单元格外全部禁用
  if (activeOperationCellKey.value && activeOperationCellKey.value !== cellKey) {
    return true
  }
  return false
}

// 获取订单数据
async function fetchOrderData() {
  // 只有散柔账号才需要加载订单数据
  const needCreator = accountStore.isSanrouAccount
  if (
    !accountStore.isSanrouLikeAccount ||
    (needCreator && !creatorStore.activeCreatorId) ||
    !sanrouDateRange.value
  ) {
    return
  }

  try {
    orderLoading.value = true

    const [startDate, endDate] = sanrouDateRange.value

    // 验证日期是否有效
    if (!startDate || !endDate) {
      console.error('订单数据获取失败: 无效的日期范围', { startDate, endDate })
      return
    }

    const startDateObj = normalizeToDayStart(new Date(startDate))
    const endDateObj = normalizeToDayEnd(new Date(endDate))

    const beginTime = dateToTimestamp(startDateObj)
    const endTime_ts = dateToTimestamp(endDateObj)

    const params = {
      begin_time: beginTime,
      end_time: endTime_ts,
      page_index: 0,
      page_size: 10000, // 获取所有订单数据
      pay_status: 0, // 只获取已支付的订单
    }

    // 根据主体选择不同的API
    if (dramaSubjectStore.currentSubject === '牵龙') {
      // 牵龙主体：使用 getQianlongOrders，然后过滤出小红的订单
      const data = await getQianlongOrders(params)
      const allOrders = data.data || []

      // 过滤出小红的订单
      orderData.value = allOrders.filter(order => {
        const parsedInfo = parsePromotionName(order.promotion_name)
        return parsedInfo?.creatorName === '小红'
      })
    } else {
      // 散柔和每日主体：使用原有的 getOrders
      const data = await getOrders(params)
      orderData.value = data.data || []
    }
  } catch (error) {
    console.error('获取订单数据失败:', error)
    orderData.value = []
  } finally {
    orderLoading.value = false
  }
}

// 标准化剧名：去除所有符号，只保留中文、英文、数字
function normalizeDramaName(name: string): string {
  return name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
}

// 处理订单数据，提取剧名并创建映射
function processOrderData() {
  if (!orderData.value || orderData.value.length === 0) {
    processedOrderData.value.clear()
    return
  }

  // 优化未支付订单：相同用户ID的未支付订单只保留最后一个
  const optimizedOrders = optimizeUnpaidOrders(orderData.value)

  // 创建剧名到订单统计的映射
  const dramaStats = new Map<
    string,
    {
      rechargeOrders: number
      totalOrders: number
      rechargeAmount: number
    }
  >()

  optimizedOrders.forEach(order => {
    try {
      const parts = order.promotion_name.split('-')
      if (parts.length >= 5) {
        const dramaName = parts[4]

        // 初始化剧名统计
        if (!dramaStats.has(dramaName)) {
          dramaStats.set(dramaName, {
            rechargeOrders: 0,
            totalOrders: 0,
            rechargeAmount: 0,
          })
        }

        const stats = dramaStats.get(dramaName)!

        // 统计总订单数
        stats.totalOrders++

        // 如果是已支付订单，统计充值订单数和金额
        if (order.pay_status === 0) {
          stats.rechargeOrders++
          // 将分转换为元
          stats.rechargeAmount += Number((order.pay_amount / 100).toFixed(2))
        }
      }
    } catch {
      // 忽略解析错误的订单
    }
  })

  processedOrderData.value = dramaStats
}

// 只加载订单数据（用于日期切换时）
async function loadOrderDataOnly() {
  // 设置 loading 状态
  loading.value = true
  error.value = null

  try {
    // 只重新获取订单数据，不重新获取剧集状态数据
    await fetchOrderData()
    // 处理订单数据
    processOrderData()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载订单数据失败'
    console.error('加载订单数据失败:', err)
  } finally {
    loading.value = false
  }
}

// 加载数据
async function loadData() {
  loading.value = true
  error.value = null

  try {
    // 并行加载剧集状态数据和订单数据
    const [boardResult] = await Promise.all([
      dramaStatusService.getDramaStatusBoard(),
      fetchOrderData(),
    ])

    boardData.value = boardResult
    // 处理订单数据
    processOrderData()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载数据失败'
    console.error('加载剧集状态看板失败:', err)
  } finally {
    loading.value = false
  }
}

// 轻量级刷新数据（只刷新飞书清单和状态数据，不重新拉取订单数据）
async function refreshStatusDataOnly() {
  try {
    // 只重新获取剧集状态数据，不重新获取订单数据
    const boardResult = await dramaStatusService.getDramaStatusBoard()
    boardData.value = boardResult

    if (showUploadModal.value && uploadModalRef.value?.refreshMaterialsState) {
      await uploadModalRef.value.refreshMaterialsState()
    }
  } catch (err) {
    console.error('刷新状态数据失败:', err)
    // 不设置全局 error，避免影响用户体验
  }
}

// 刷新数据
async function refreshData() {
  await loadData()
}

// 设置搜索关键词
function setSearchKeyword(keyword: string) {
  searchKeyword.value = keyword
}

// 清空搜索
function clearSearch() {
  searchKeyword.value = ''
}

// 暴露方法给父组件
defineExpose({
  refreshData,
  loading,
  setSearchKeyword,
  clearSearch,
  openUploadModal,
  canUpload: canOpenUpload,
})

// 根据选择的日期范围计算实际的日期范围
function calculateDateRange(range: string): [string, string] {
  const today = dayjs().tz('Asia/Shanghai')

  switch (range) {
    case 'today':
      // 今日：当天的开始和结束
      return [today.format('YYYY-MM-DD'), today.format('YYYY-MM-DD')]
    case '3':
      return [today.subtract(2, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')]
    case '7':
      return [today.subtract(6, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')]
    case 'month':
      // 本月：当月第一天到今天
      return [today.startOf('month').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')]
    case 'all':
      // 至今：从2024年1月1日开始
      return ['2024-01-01', today.format('YYYY-MM-DD')]
    default:
      return [today.subtract(6, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')]
  }
}

// 监听日期范围变化，更新全局日期范围并重新加载数据
watch(selectedDateRange, async newRange => {
  const [startDate, endDate] = calculateDateRange(newRange)
  setSanrouDateRange([startDate, endDate])

  // 日期切换时只重新获取订单数据，不重新获取剧集状态数据
  await loadOrderDataOnly()
})

// 组件挂载时初始化日期范围并加载数据
onMounted(() => {
  // 初始化日期范围
  const [startDate, endDate] = calculateDateRange(selectedDateRange.value)
  setSanrouDateRange([startDate, endDate])

  // 加载数据
  loadData()
})

// 组件卸载时清理事件监听器
onUnmounted(() => {})
</script>

<style scoped>
.drama-status-board {
  @apply w-full;
  /* 确保容器不会产生额外的滚动条 */
  overflow: visible;
}

.board-header {
  @apply mb-4;
}

.board-content {
  @apply space-y-6;
}

/* 表格样式优化 */
table {
  @apply border-collapse;
}

th,
td {
  @apply border-gray-200;
}

/* 响应式表格 */
@media (max-width: 768px) {
  .overflow-x-auto {
    @apply -mx-2;
  }

  table {
    @apply min-w-[800px];
  }

  /* 移动端表格优化 */
  .drama-status-board {
    @apply px-2;
  }

  /* 移动端滚动优化 */
  .overflow-auto {
    -webkit-overflow-scrolling: touch;
  }

  /* 移动端触摸优化 */
  .mobile-optimized {
    @apply touch-manipulation;
  }

  /* 移动端按钮最小触摸区域 */
  button,
  .clickable {
    min-height: 44px;
    min-width: 44px;
  }

  /* 移动端表格行高优化 */
  tr {
    min-height: 48px;
  }
}

/* 粘性列样式 */
.sticky {
  position: sticky;
}

.sticky.left-0 {
  left: 0;
}

.sticky.top-0 {
  top: 0;
}

/* 表格滚动容器样式 */
.overflow-auto {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.overflow-auto::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 4px;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* 状态徽章动画 */
.status-badge {
  @apply transition-all duration-200;
}

.status-badge:hover {
  @apply transform scale-105;
}
</style>
