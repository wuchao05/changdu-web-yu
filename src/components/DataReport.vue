<template>
  <div class="data-report">
    <!-- 卡片容器 -->
    <n-card class="report-card" :bordered="false">
      <!-- 卡片头部 -->
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-gray-900 flex items-center">
              <Icon icon="mdi:chart-box" class="w-6 h-6 mr-2 text-blue-500" />
              数据报表
            </h2>
            <p class="text-sm text-gray-500 mt-1">详细的用户充值数据分析</p>
          </div>

          <!-- 筛选器和工具栏 -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <DateRangePicker
              v-model="dateRange"
              @update:model-value="handleDateChange"
              select-class-name="w-full sm:w-40"
            />
            <div class="flex items-center gap-2">
              <n-button
                type="primary"
                :loading="reportLoading"
                @click="fetchReportData"
                class="flex-shrink-0"
              >
                <template #icon>
                  <Icon icon="mdi:magnify" />
                </template>
                查询
              </n-button>

              <n-button
                quaternary
                @click="showColumnManager = true"
                class="flex-shrink-0"
                title="列设置"
              >
                <template #icon>
                  <Icon icon="fluent:table-settings-20-filled" />
                </template>
              </n-button>
            </div>
          </div>
        </div>
      </template>

      <!-- 错误状态 -->
      <n-alert v-if="reportError" type="error" :title="reportError" show-icon class="mb-6" />

      <!-- 数据表格 -->
      <div class="overflow-hidden">
        <n-data-table
          :columns="displayColumns"
          :data="tableData"
          :loading="reportLoading"
          :bordered="false"
          striped
          class="report-table"
          :scroll-x="1200"
        />
      </div>

      <!-- 分页器 -->
      <div
        class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mt-4"
      >
        <!-- 总数显示 -->
        <div class="text-sm text-gray-500">共 {{ reportData?.total || 0 }} 条</div>

        <!-- 分页器 -->
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :page-count="Math.ceil((reportData?.total || 0) / pageSize)"
          :show-size-picker="!isMobile"
          :page-sizes="[10, 20, 50, 100]"
          :size="isMobile ? 'small' : 'medium'"
          :show-quick-jumper="false"
          class="mobile-pagination"
          @update:page="fetchReportData"
          @update:page-size="
            () => {
              currentPage = 1
              fetchReportData()
            }
          "
        />
      </div>
    </n-card>

    <!-- 列管理器 -->
    <ColumnManager
      v-model:show="showColumnManager"
      :columns="originalColumns"
      v-model:config="columnConfig"
      @apply="applyColumnConfig"
      @cancel="handleColumnCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, h } from 'vue'
import { Icon } from '@iconify/vue'
import { useMessage, type DataTableColumns } from 'naive-ui'
import { useCreatorStore } from '@/stores/creator'
import { useDataStore } from '@/stores/data'
import { useSettingsStore } from '@/stores/settings'
import { useAccountStore } from '@/stores/account'
import { getReport } from '@/api'
import type { DailyData, ReportParams } from '@/api/types'
import type { ExtendedError } from '@/api/http'
import {
  formatCentToYuan,
  formatPercentage,
  formatTimestamp,
  dateStringToTimestamp,
} from '@/utils/format'
import ColumnManager, { type ColumnConfig } from './ColumnManager.vue'
import DateRangePicker from './DateRangePicker.vue'
import { useGlobalDateRange } from '@/composables/useGlobalDateRange'

const message = useMessage()
const creatorStore = useCreatorStore()
const dataStore = useDataStore()
const settingsStore = useSettingsStore()
const accountStore = useAccountStore()

// 使用全局日期范围管理
const { sanrouDateRange, setSanrouDateRange, sanrouDefaultRange } = useGlobalDateRange()

// 响应式数据 - 使用全局日期范围
const dateRange = computed({
  get: () => sanrouDateRange.value,
  set: value => setSanrouDateRange(value),
})
const currentPage = ref(1)
const pageSize = ref(10)
const showColumnManager = ref(false)
const columnConfig = ref<ColumnConfig[]>([])

// 响应式检测
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

// 计算属性
const reportData = computed(() => dataStore.reportData)
const reportLoading = computed(() => dataStore.reportLoading)
const reportError = computed(() => dataStore.reportError)

const tableData = computed(() => reportData.value?.daily_data || [])

// 原始表格列配置
const originalColumns: DataTableColumns<DailyData> = [
  // 核心列（排在前面）
  {
    title: '日期',
    key: 'date',
    width: 120,
    align: 'center',
    resizable: true,
    render: row => {
      // 牵龙账号的日期是字符串格式，转换为时间戳后再格式化
      // 散柔账号的日期是时间戳，直接格式化为可读日期
      const timestamp = typeof row.date === 'string' ? dateStringToTimestamp(row.date) : row.date
      return formatTimestamp(timestamp)
    },
  },
  {
    title: '全用户充值金额',
    key: 'total_amount',
    width: 140,
    align: 'right',
    resizable: true,
    render: row =>
      h('span', { class: 'font-semibold text-blue-600' }, `¥${formatCentToYuan(row.total_amount)}`),
  },
  {
    title: '全用户充值人数',
    key: 'paid_user',
    width: 140,
    align: 'center',
    resizable: true,
    render: row =>
      h('span', { class: 'font-medium text-gray-900' }, row.paid_user.toLocaleString()),
  },
  {
    title: '全用户充值订单数',
    key: 'paid_order',
    width: 160,
    align: 'center',
    resizable: true,
    render: row =>
      h('span', { class: 'font-medium text-gray-900' }, row.paid_order.toLocaleString()),
  },
  {
    title: '全用户订单完成率',
    key: 'paid_order_rate',
    width: 160,
    align: 'center',
    resizable: true,
    render: row =>
      h(
        'span',
        {
          class: `font-medium ${row.paid_order_rate > 0.5 ? 'text-green-600' : 'text-orange-600'}`,
        },
        formatPercentage(row.paid_order_rate)
      ),
  },

  // 新用户相关列（排在后面）
  {
    title: '新用户数',
    key: 'new_user_cnt',
    width: 100,
    align: 'center',
    resizable: true,
    render: row =>
      h('span', { class: 'font-medium text-gray-900' }, row.new_user_cnt.toLocaleString()),
  },
  {
    title: '新用户充值金额',
    key: 'new_user_amount',
    width: 140,
    align: 'right',
    resizable: true,
    render: row =>
      h(
        'span',
        { class: 'font-semibold text-emerald-600' },
        `¥${formatCentToYuan(row.new_user_amount)}`
      ),
  },
  {
    title: '新用户充值率',
    key: 'paid_new_user_rate',
    width: 130,
    align: 'center',
    resizable: true,
    render: row =>
      h(
        'span',
        {
          class: `font-medium ${row.paid_new_user_rate > 0.3 ? 'text-green-600' : 'text-orange-600'}`,
        },
        formatPercentage(row.paid_new_user_rate)
      ),
  },
  {
    title: '新用户充值人数',
    key: 'paid_new_user',
    width: 140,
    align: 'center',
    resizable: true,
    render: row =>
      h('span', { class: 'font-medium text-gray-900' }, row.paid_new_user.toLocaleString()),
  },
  {
    title: '新用户充值订单数',
    key: 'paid_new_order',
    width: 150,
    align: 'center',
    resizable: true,
    render: row =>
      h('span', { class: 'font-medium text-gray-900' }, row.paid_new_order.toLocaleString()),
  },
  {
    title: '新用户订单完成率',
    key: 'paid_new_order_rate',
    width: 160,
    align: 'center',
    resizable: true,
    render: row =>
      h(
        'span',
        {
          class: `font-medium ${row.paid_new_order_rate > 0.5 ? 'text-green-600' : 'text-orange-600'}`,
        },
        formatPercentage(row.paid_new_order_rate)
      ),
  },
]

// 显示的列配置（基于用户设置）
const displayColumns = computed(() => {
  if (columnConfig.value.length === 0) {
    return originalColumns
  }

  // 按照columnConfig的顺序重新排列列，并过滤掉不可见的列
  const orderedColumns: DataTableColumns<DailyData> = []

  columnConfig.value.forEach(config => {
    if (config.visible) {
      const originalColumn = originalColumns.find(col => 'key' in col && col.key === config.key)
      if (originalColumn) {
        orderedColumns.push(originalColumn)
      }
    }
  })

  return orderedColumns
})

const DEFAULT_SANROU_CREATOR_ID = '1842865091654731'
const sanrouDistributorId = computed(
  () => settingsStore.settings.sanrouDistributorId || DEFAULT_SANROU_CREATOR_ID
)

// 初始化日期范围 - 现在由全局日期范围管理自动处理

// 获取报表数据
async function fetchReportData() {
  // 散柔类账号和牵龙账号需要加载数据
  const needCreator = accountStore.isSanrouAccount
  if (!accountStore.isSanrouLikeAccount && !accountStore.isQianlongAccount) {
    return
  }
  if (needCreator && !creatorStore.activeCreatorId) {
    creatorStore.setActiveCreator(sanrouDistributorId.value)
    if (!creatorStore.activeCreatorId) {
      return
    }
  }
  if (!dateRange.value) {
    setSanrouDateRange(sanrouDefaultRange.value)
    return
  }

  try {
    dataStore.setReportLoading(true)
    dataStore.setReportError('')

    const [startDate, endDate] = dateRange.value

    // 验证日期是否有效
    if (!startDate || !endDate) {
      console.error('数据报表获取失败: 无效的日期范围', { startDate, endDate })
      const errorMsg = '日期范围无效，请重新选择'
      dataStore.setReportError(errorMsg)
      message.error(errorMsg)
      return
    }

    const params: ReportParams = {
      begin: startDate,
      end: endDate,
      page_index: currentPage.value - 1, // API使用0基索引
      page_size: pageSize.value,
    }

    const data = await getReport(params)

    dataStore.setReportData(data)
  } catch (error: unknown) {
    console.error('fetchReportData error:', error)
    const errorMsg = error instanceof Error ? error.message : '获取数据报表失败'
    dataStore.setReportError(errorMsg)
    // 只有在拦截器未处理时才显示错误消息
    if (!(error as ExtendedError)?.handledByInterceptor) {
      message.error(errorMsg)
    }
  } finally {
    dataStore.setReportLoading(false)
  }
}

// 事件处理
function handleDateChange() {
  currentPage.value = 1
  fetchReportData()
}

// 应用列配置
function applyColumnConfig(config: ColumnConfig[]) {
  columnConfig.value = [...config]
  // 保存到本地存储
  localStorage.setItem('dataReport_columnConfig', JSON.stringify(config))
}

// 处理列配置取消
function handleColumnCancel() {
  // 取消时不需要额外处理，因为ColumnManager会自动还原配置
  // 列配置已取消
}

// 初始化列配置
function initColumnConfig() {
  try {
    const saved = localStorage.getItem('dataReport_columnConfig')
    if (saved) {
      // 解析保存的配置
      const savedConfig = JSON.parse(saved)

      // 检查是否需要重置配置（比如列数量不匹配，说明列定义已更新）
      const currentColumnKeys = originalColumns
        .filter(col => 'key' in col)
        .map(col => (col as { key: string }).key)

      const savedColumnKeys = savedConfig.map((config: ColumnConfig) => config.key)

      // 如果保存的列和当前列不完全匹配，则重置配置
      if (
        currentColumnKeys.length !== savedColumnKeys.length ||
        !currentColumnKeys.every(key => savedColumnKeys.includes(key))
      ) {
        // 列配置已更新，重置为默认顺序
        localStorage.removeItem('dataReport_columnConfig')
        columnConfig.value = []
      } else {
        columnConfig.value = savedConfig
      }
    }
  } catch (error) {
    console.warn('Failed to load column config:', error)
    localStorage.removeItem('dataReport_columnConfig')
  }
}

// 监听活跃达人变化
watch(
  () => creatorStore.activeCreatorId,
  newId => {
    if ((accountStore.isSanrouLikeAccount || accountStore.isQianlongAccount) && newId) {
      currentPage.value = 1
      fetchReportData()
    }
  }
)

// 监听账号切换
watch(
  () => accountStore.currentAccount,
  () => {
    if (accountStore.isSanrouLikeAccount || accountStore.isQianlongAccount) {
      currentPage.value = 1
      fetchReportData()
    } else {
      dataStore.clearReportData()
    }
  }
)

// 监听日期范围变化，确保切换账号后日期初始化也能触发查询
watch(
  () => dateRange.value,
  newRange => {
    if (!newRange) return
    if (accountStore.isSanrouLikeAccount || accountStore.isQianlongAccount) {
      currentPage.value = 1
      fetchReportData()
    }
  }
)

// 监听设置变化
watch(
  () => settingsStore.settings.pageSize,
  newPageSize => {
    pageSize.value = newPageSize
    currentPage.value = 1
    if (creatorStore.activeCreatorId) {
      fetchReportData()
    }
  }
)

// 监听默认查询天数变化 - 现在由全局日期范围管理自动处理

onMounted(() => {
  pageSize.value = settingsStore.settings.pageSize
  initColumnConfig()

  // 初始化响应式检测
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 只有散柔类账号和牵龙账号才加载报表数据
  if (accountStore.isSanrouLikeAccount || accountStore.isQianlongAccount) {
    fetchReportData()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.data-report {
  @apply space-y-6;
}

.report-card {
  @apply shadow-sm border border-gray-200/60 rounded-2xl overflow-hidden backdrop-blur-sm;
  background: rgba(255, 255, 255, 0.8);
}

:deep(.report-card .n-card-header) {
  @apply border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-blue-50/80 px-6 py-4;
}

:deep(.report-card .n-card__content) {
  @apply p-6;
}

:deep(.report-table .n-data-table-thead) {
  @apply bg-gradient-to-r from-gray-50 to-blue-50;
}

:deep(.report-table .n-data-table-th) {
  @apply text-gray-700 font-semibold border-b border-gray-200;
}

:deep(.report-table .n-data-table-td) {
  @apply text-gray-900 border-b border-gray-100;
}

:deep(.report-table .n-data-table-tr:hover .n-data-table-td) {
  @apply bg-blue-50/50;
}

/* 分页器样式优化 */
:deep(.mobile-pagination) {
  @apply flex items-center gap-2;
}

:deep(.mobile-pagination .n-pagination-item) {
  @apply min-w-[36px] h-[36px] text-sm flex items-center justify-center;
}

:deep(.mobile-pagination .n-pagination-item--button) {
  @apply min-w-[36px] h-[36px] flex items-center justify-center;
}

/* 页面大小选择器对齐优化 */
:deep(.mobile-pagination .n-pagination-size-picker) {
  @apply flex items-center;
}

:deep(.mobile-pagination .n-pagination-size-picker .n-select) {
  @apply h-[36px];
}

:deep(.mobile-pagination .n-pagination-size-picker .n-base-selection) {
  @apply h-[36px] min-h-[36px] flex items-center;
}

:deep(.mobile-pagination .n-pagination-size-picker .n-base-selection-input) {
  @apply h-[36px] flex items-center;
}

@media (max-width: 768px) {
  :deep(.mobile-pagination) {
    @apply pr-4;
  }

  :deep(.mobile-pagination .n-pagination-item) {
    @apply min-w-[32px] h-[32px] text-xs;
  }

  :deep(.mobile-pagination .n-pagination-item--button) {
    @apply min-w-[32px] h-[32px];
  }

  :deep(.mobile-pagination .n-pagination-prefix) {
    @apply hidden;
  }

  :deep(.mobile-pagination .n-pagination-suffix) {
    @apply hidden;
  }
}

/* 响应式优化 */
@media (max-width: 640px) {
  :deep(.report-card .n-card-header) {
    @apply px-4 py-3;
  }

  :deep(.report-card .n-card__content) {
    @apply p-4;
  }
}
</style>
