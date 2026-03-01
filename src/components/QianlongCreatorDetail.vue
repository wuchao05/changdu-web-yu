<template>
  <div class="qianlong-creator-detail">
    <n-card class="creator-detail-card" :bordered="false">
      <!-- 卡片头部 -->
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-gray-900 flex items-center">
              <Icon icon="mdi:account-group" class="w-6 h-6 mr-2 text-green-500" />
              牵龙达人收入详情
            </h2>
            <p class="text-sm text-gray-500 mt-1">按达人展示分日期的收入和订单统计</p>
          </div>

          <!-- 筛选器和工具栏 -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <DateRangePicker
              v-model="internalDateRange"
              @update:model-value="handleDateChange"
              select-class-name="w-full sm:w-40"
              :preset-options="qianlongDateOptions"
            />
            <n-select
              v-model:value="payStatusFilter"
              :options="payStatusOptions"
              class="w-full sm:w-28"
              size="medium"
              @update:value="handlePayStatusChange"
            />
            <div class="flex items-center gap-2">
              <n-button
                type="primary"
                :loading="isLoading"
                @click="refreshData"
                class="flex-shrink-0 transition-all duration-300"
                :class="isLoading ? 'animate-pulse' : ''"
              >
                <template #icon>
                  <Icon
                    :icon="isLoading ? 'mdi:loading' : 'mdi:magnify'"
                    :class="isLoading ? 'animate-spin' : ''"
                  />
                </template>
                {{ isLoading ? '加载中...' : '查询' }}
              </n-button>
            </div>
          </div>
        </div>
      </template>

      <!-- 错误状态 -->
      <n-alert v-if="error" type="error" :title="error" show-icon class="mb-6" />

      <!-- 达人概览数据 -->
      <div v-if="currentActiveCreator" class="mb-6">
        <!-- 数据加载时显示骨架屏 -->
        <div v-if="isLoading" class="mb-6">
          <n-grid x-gap="16" y-gap="16" :cols="'1 s:2 m:3'" responsive="screen">
            <n-grid-item v-for="i in 3" :key="i">
              <div class="overview-card-skeleton">
                <div class="overview-card-inner">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="skeleton-text skeleton-title mb-2"></div>
                      <div class="skeleton-text skeleton-amount mb-2"></div>
                      <div class="skeleton-text skeleton-subtitle"></div>
                    </div>
                    <div class="skeleton-icon"></div>
                  </div>
                </div>
              </div>
            </n-grid-item>
          </n-grid>
        </div>

        <!-- 实际数据 -->
        <div v-else-if="creatorOverview" class="overview-data-container">
          <n-grid x-gap="16" y-gap="16" :cols="'1 s:2 m:3'" responsive="screen">
            <n-grid-item>
              <div class="overview-card total-income animate-fade-in" style="animation-delay: 0.1s">
                <div class="overview-card-inner">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-500 mb-1">总收入</p>
                      <p class="text-2xl font-bold text-green-600">
                        ¥{{ creatorOverview.totalAmount.toFixed(1) }}
                      </p>
                      <p class="text-xs text-gray-400 mt-1">
                        {{ creatorOverview.totalOrders }}笔订单
                      </p>
                    </div>
                    <div class="overview-card-icon bg-green-100">
                      <Icon icon="mdi:cash-multiple" class="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            </n-grid-item>

            <n-grid-item>
              <div class="overview-card today-income animate-fade-in" style="animation-delay: 0.2s">
                <div class="overview-card-inner">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-500 mb-1">当日收入</p>
                      <p class="text-2xl font-bold text-orange-600">
                        ¥{{ creatorOverview.todayAmount.toFixed(1) }}
                      </p>
                      <p class="text-xs text-gray-400 mt-1">
                        {{ creatorOverview.todayDate || '暂无数据' }}
                      </p>
                    </div>
                    <div class="overview-card-icon bg-orange-100">
                      <Icon icon="mdi:calendar-today" class="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>
            </n-grid-item>

            <n-grid-item>
              <div
                class="overview-card daily-average animate-fade-in"
                style="animation-delay: 0.3s"
              >
                <div class="overview-card-inner">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-500 mb-1">日均收入</p>
                      <p class="text-2xl font-bold text-blue-600">
                        ¥{{ creatorOverview.avgDailyAmount.toFixed(1) }}
                      </p>
                      <p class="text-xs text-gray-400 mt-1">
                        活跃{{ creatorOverview.activeDays }}天
                      </p>
                    </div>
                    <div class="overview-card-icon bg-blue-100">
                      <Icon icon="mdi:chart-line" class="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            </n-grid-item>
          </n-grid>
        </div>

        <!-- 暂无数据状态 -->
        <div v-else class="overview-empty-state animate-fade-in">
          <n-grid x-gap="16" y-gap="16" :cols="'1 s:2 m:3'" responsive="screen">
            <n-grid-item v-for="i in 3" :key="i">
              <div class="overview-card empty-card">
                <div class="overview-card-inner">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-400 mb-1">
                        {{ i === 1 ? '总收入' : i === 2 ? '当日收入' : '日均收入' }}
                      </p>
                      <p class="text-2xl font-bold text-gray-300">¥0.0</p>
                      <p class="text-xs text-gray-300 mt-1">暂无数据</p>
                    </div>
                    <div class="overview-card-icon bg-gray-50">
                      <Icon
                        :icon="
                          i === 1
                            ? 'mdi:cash-multiple'
                            : i === 2
                              ? 'mdi:calendar-today'
                              : 'mdi:chart-line'
                        "
                        class="w-6 h-6 text-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </n-grid-item>
          </n-grid>
        </div>
      </div>

      <!-- 数据展示区域 -->
      <div v-if="currentActiveCreator" class="overflow-hidden">
        <!-- 视图切换器 -->
        <div class="mb-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center">
              <Icon
                :icon="
                  activeView === 'orders'
                    ? 'mdi:receipt'
                    : activeView === 'income'
                      ? 'mdi:table'
                      : 'mdi:account-group'
                "
                class="w-5 h-5 mr-2"
                :class="
                  activeView === 'orders'
                    ? 'text-indigo-500'
                    : activeView === 'income'
                      ? 'text-purple-500'
                      : 'text-green-500'
                "
              />
              {{ currentActiveCreator }} -
              {{
                activeView === 'orders'
                  ? '订单详情'
                  : activeView === 'income'
                    ? '日收入明细'
                    : '抖音号统计'
              }}
            </h3>

            <!-- 数据统计信息 -->
            <p v-if="!isLoading" class="text-sm text-gray-500">
              {{
                activeView === 'orders'
                  ? `共 ${currentCreatorOrders.length} 笔订单`
                  : activeView === 'income'
                    ? `共 ${currentCreatorData.length} 笔订单`
                    : `共 ${currentCreatorDouyinData.length} 个剧目`
              }}
            </p>
            <div v-else class="skeleton-text skeleton-subtitle"></div>
          </div>

          <!-- 美观的切换按钮组 -->
          <div class="view-switcher-container">
            <div class="view-switcher">
              <button
                :class="[
                  'view-switch-button',
                  activeView === 'orders'
                    ? 'view-switch-button-active'
                    : 'view-switch-button-inactive',
                ]"
                @click="switchView('orders')"
              >
                <Icon icon="mdi:receipt" class="w-4 h-4 mr-2" />
                <span>订单详情</span>
                <div class="view-switch-indicator" v-if="activeView === 'orders'"></div>
              </button>

              <button
                :class="[
                  'view-switch-button',
                  activeView === 'douyin'
                    ? 'view-switch-button-active'
                    : 'view-switch-button-inactive',
                ]"
                @click="switchView('douyin')"
              >
                <Icon icon="mdi:account-group" class="w-4 h-4 mr-2" />
                <span>抖音号统计</span>
                <div class="view-switch-indicator" v-if="activeView === 'douyin'"></div>
              </button>

              <button
                :class="[
                  'view-switch-button',
                  activeView === 'income'
                    ? 'view-switch-button-active'
                    : 'view-switch-button-inactive',
                ]"
                @click="switchView('income')"
              >
                <Icon icon="mdi:table" class="w-4 h-4 mr-2" />
                <span>日收入明细</span>
                <div class="view-switch-indicator" v-if="activeView === 'income'"></div>
              </button>
            </div>
          </div>
        </div>

        <!-- 订单详情视图 -->
        <div v-show="activeView === 'orders'" class="data-view-container">
          <!-- 加载状态的表格骨架屏 -->
          <div v-if="isLoading" class="table-skeleton-container animate-fade-in">
            <div class="table-skeleton-header">
              <div
                v-for="i in 9"
                :key="i"
                class="skeleton-text skeleton-header-cell"
                :style="{ width: getOrderColumnWidth(i) }"
              ></div>
            </div>
            <div class="table-skeleton-body">
              <div v-for="row in 5" :key="row" class="table-skeleton-row">
                <div
                  v-for="col in 9"
                  :key="col"
                  class="skeleton-text skeleton-cell"
                  :style="{ width: getOrderColumnWidth(col) }"
                ></div>
              </div>
            </div>
          </div>

          <!-- 实际表格 -->
          <div v-else-if="currentCreatorOrders.length > 0" class="animate-fade-in">
            <n-data-table
              :columns="orderTableColumns"
              :data="paginatedOrderData"
              :loading="false"
              :bordered="false"
              striped
              class="order-details-table"
              :scroll-x="1200"
            />

            <!-- 分页器 -->
            <div
              class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mt-4"
            >
              <!-- 总数显示 -->
              <div class="text-sm text-gray-500">共 {{ currentCreatorOrders.length }} 笔订单</div>

              <!-- 分页器 -->
              <n-pagination
                v-model:page="orderCurrentPage"
                v-model:page-size="orderPageSize"
                :page-count="Math.ceil(currentCreatorOrders.length / orderPageSize)"
                :show-size-picker="!isMobile"
                :page-sizes="[5, 10, 20, 50]"
                :size="isMobile ? 'small' : 'medium'"
                :show-quick-jumper="false"
                class="mobile-pagination"
                @update:page="() => {}"
                @update:page-size="
                  () => {
                    orderCurrentPage = 1
                  }
                "
              />
            </div>
          </div>

          <!-- 无订单数据状态 -->
          <div v-else class="empty-table-state animate-fade-in">
            <div
              class="text-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200"
            >
              <Icon icon="mdi:receipt-text-outline" class="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p class="text-gray-500 text-lg mb-2">暂无订单数据</p>
              <p class="text-gray-400 text-sm">该达人在选定时间范围内没有订单记录</p>
            </div>
          </div>
        </div>

        <!-- 抖音号统计视图 -->
        <div v-show="activeView === 'douyin'" class="data-view-container">
          <!-- 加载状态的表格骨架屏 -->
          <div v-if="isLoading" class="table-skeleton-container animate-fade-in">
            <div class="table-skeleton-header">
              <div
                v-for="i in 5"
                :key="i"
                class="skeleton-text skeleton-header-cell"
                :style="{ width: getDouyinColumnWidth(i) }"
              ></div>
            </div>
            <div class="table-skeleton-body">
              <div v-for="row in 5" :key="row" class="table-skeleton-row">
                <div
                  v-for="col in 5"
                  :key="col"
                  class="skeleton-text skeleton-cell"
                  :style="{ width: getDouyinColumnWidth(col) }"
                ></div>
              </div>
            </div>
          </div>

          <!-- 抖音号统计展示 -->
          <div v-else-if="currentCreatorDouyinData.length > 0" class="animate-fade-in">
            <!-- 抖音账号列表 -->
            <div class="douyin-accounts-section">
              <div class="douyin-accounts-list space-y-4">
                <div
                  v-for="(group, douyinId) in sortedDouyinData"
                  :key="douyinId"
                  class="douyin-account-group"
                >
                  <!-- 账号头部 - 可点击展开/折叠 -->
                  <div
                    class="account-header"
                    @click="toggleAccount(douyinId)"
                    :class="{ expanded: expandedAccounts.includes(douyinId) }"
                  >
                    <div class="account-info">
                      <div class="account-avatar">
                        <div class="avatar-content">{{ douyinId.slice(0, 2) }}</div>
                      </div>
                      <div class="account-details">
                        <div class="account-name">{{ douyinId }}</div>
                        <div class="account-meta">
                          {{ group.dramaCount }} 个剧目 · {{ group.items.length }} 笔订单 ·
                          <span class="total-amount">{{
                            formatAmountDisplay(group.totalAmount * 100)
                          }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="expand-icon">
                      <Icon
                        icon="mdi:chevron-down"
                        class="w-5 h-5 transition-transform duration-200"
                        :class="{ 'rotate-180': expandedAccounts.includes(douyinId) }"
                      />
                    </div>
                  </div>

                  <!-- 账号详情 - 按剧名分组 -->
                  <div v-show="expandedAccounts.includes(douyinId)" class="account-content">
                    <div
                      v-for="(dramaGroup, dramaName) in groupRecordsByDrama(group.items)"
                      :key="dramaName"
                      class="drama-group"
                    >
                      <div class="drama-header" @click="toggleDramaExpansion(dramaName)">
                        <div class="drama-info">
                          <div class="drama-name">
                            <Icon icon="mdi:movie-open" class="w-4 h-4 text-blue-500" />
                            <span>{{ dramaName }}</span>
                          </div>
                          <div class="drama-stats">
                            <span class="drama-count">{{ dramaGroup.orderCount }} 笔订单</span>
                            <span class="drama-total"
                              >共计{{ formatAmountDisplay(dramaGroup.totalAmount * 100) }}</span
                            >
                          </div>
                        </div>
                        <button
                          @click.stop="toggleDramaExpansion(dramaName)"
                          class="expand-btn"
                          :class="{ expanded: expandedDramas[dramaName] }"
                        >
                          <Icon
                            icon="mdi:chevron-down"
                            class="w-5 h-5 transition-transform duration-200"
                            :class="{ 'rotate-180': expandedDramas[dramaName] }"
                          />
                        </button>
                      </div>
                      <div v-show="expandedDramas[dramaName]" class="drama-records">
                        <div
                          v-for="(record, recordIndex) in dramaGroup.records"
                          :key="recordIndex"
                          class="record-tag"
                          :title="`订单ID: ${record.orderId}`"
                        >
                          <span class="amount">{{ formatAmountDisplay(record.amount * 100) }}</span>
                          <span class="time">{{ formatSimpleTime(record.payTime) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 无抖音号数据状态 -->
          <div v-else class="empty-table-state animate-fade-in">
            <div
              class="text-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200"
            >
              <Icon icon="mdi:account-group" class="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p class="text-gray-500 text-lg mb-2">暂无抖音号数据</p>
              <p class="text-gray-400 text-sm">该达人在选定时间范围内没有抖音号推广记录</p>
            </div>
          </div>
        </div>

        <!-- 日收入明细视图 -->
        <div v-show="activeView === 'income'" class="data-view-container">
          <!-- 加载状态的表格骨架屏 -->
          <div v-if="isLoading" class="table-skeleton-container animate-fade-in">
            <div class="table-skeleton-header">
              <div
                v-for="i in 3"
                :key="i"
                class="skeleton-text skeleton-header-cell"
                :style="{ width: getIncomeColumnWidth(i) }"
              ></div>
            </div>
            <div class="table-skeleton-body">
              <div v-for="row in 10" :key="row" class="table-skeleton-row">
                <div
                  v-for="col in 3"
                  :key="col"
                  class="skeleton-text skeleton-cell"
                  :style="{ width: getIncomeColumnWidth(col) }"
                ></div>
              </div>
            </div>
          </div>

          <!-- 实际表格 -->
          <div v-else-if="currentCreatorData.length > 0" class="animate-fade-in">
            <n-data-table
              :columns="tableColumns"
              :data="paginatedCreatorData"
              :loading="false"
              :bordered="false"
              striped
              class="creator-table"
              :scroll-x="800"
            />

            <!-- 分页器 -->
            <div
              class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mt-4"
            >
              <!-- 总数显示 -->
              <div class="text-sm text-gray-500">共 {{ currentCreatorData.length }} 条</div>

              <!-- 分页器 -->
              <n-pagination
                v-model:page="currentPage"
                v-model:page-size="pageSize"
                :page-count="Math.ceil(currentCreatorData.length / pageSize)"
                :show-size-picker="!isMobile"
                :page-sizes="[10, 20, 50, 100]"
                :size="isMobile ? 'small' : 'medium'"
                :show-quick-jumper="false"
                class="mobile-pagination"
                @update:page="() => {}"
                @update:page-size="
                  () => {
                    currentPage = 1
                  }
                "
              />
            </div>
          </div>

          <!-- 无收入数据状态 -->
          <div v-else class="empty-table-state animate-fade-in">
            <div
              class="text-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200"
            >
              <Icon icon="mdi:chart-line-variant" class="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p class="text-gray-500 text-lg mb-2">暂无收入数据</p>
              <p class="text-gray-400 text-sm">该达人在选定时间范围内没有收入记录</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 无数据状态 -->
      <div
        v-if="!isLoading && !currentActiveCreator && creatorList.length === 0"
        class="animate-fade-in"
      >
        <div
          class="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border-2 border-dashed border-gray-200"
        >
          <div class="max-w-md mx-auto">
            <div class="relative mb-6">
              <Icon icon="mdi:database-search" class="w-20 h-20 mx-auto text-gray-300" />
            </div>
            <h3 class="text-xl font-semibold text-gray-700 mb-3">暂无达人数据</h3>
            <p class="text-gray-500 mb-6 leading-relaxed">
              请选择合适的日期范围并点击查询按钮，<br />
              系统将为您展示牵龙达人的收入详情
            </p>
            <div class="space-y-3 text-sm text-gray-400">
              <div class="flex items-center justify-center space-x-2">
                <Icon icon="mdi:calendar-range" class="w-4 h-4" />
                <span>选择查询时间范围</span>
              </div>
              <div class="flex items-center justify-center space-x-2">
                <Icon icon="mdi:magnify" class="w-4 h-4" />
                <span>点击查询按钮获取数据</span>
              </div>
              <div class="flex items-center justify-center space-x-2">
                <Icon icon="mdi:chart-timeline-variant" class="w-4 h-4" />
                <span>查看达人收入统计</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 无选中达人状态 -->
      <div
        v-if="!isLoading && !currentActiveCreator && creatorList.length > 0"
        class="animate-fade-in"
      >
        <div
          class="text-center py-16 bg-gradient-to-br from-indigo-50 to-purple-50/30 rounded-2xl border-2 border-dashed border-indigo-200"
        >
          <div class="max-w-md mx-auto">
            <div class="relative mb-6">
              <Icon icon="mdi:account-group" class="w-20 h-20 mx-auto text-indigo-300" />
              <div
                class="absolute -top-2 -right-2 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center"
              >
                <Icon icon="mdi:cursor-pointer" class="w-4 h-4 text-indigo-500" />
              </div>
            </div>
            <h3 class="text-xl font-semibold text-gray-700 mb-3">等待加载小红数据</h3>
            <p class="text-gray-500 mb-6 leading-relaxed">
              当前仅展示小红的数据，如未自动加载可点击上方查询按钮刷新
            </p>
            <div class="bg-white/60 rounded-lg p-4 border border-indigo-100">
              <p class="text-sm text-indigo-600 font-medium">
                📊 可查看的数据包括：收入统计、订单详情、日收入明细
              </p>
            </div>
            <div class="mt-4 text-xs text-gray-400">
              💡 提示：牵龙页面已固定小红，无需切换其他达人
            </div>
          </div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, h } from 'vue'
import { Icon } from '@iconify/vue'
import type { DataTableColumns } from 'naive-ui'
import type { OrderItem, CreatorDailyData } from '@/api/types'
import { parsePromotionName, formatAmount, formatAmountDisplay } from '@/utils/qianlong'
import { getQianlongDefaultDateRange } from '@/utils/format'
import { useSettingsStore } from '@/stores/settings'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import DateRangePicker from './DateRangePicker.vue'

// 配置dayjs插件
dayjs.extend(utc)
dayjs.extend(timezone)

// 定义组件属性
interface Props {
  activeCreator?: string
  dateRange?: [number, number] | null
  aggregatedData?: {
    creatorStats: CreatorDailyData[]
    allOrders: OrderItem[]
  } | null
}

const props = withDefaults(defineProps<Props>(), {
  activeCreator: '',
  dateRange: null,
  aggregatedData: null,
})

// 定义组件事件
const emit = defineEmits<{
  'date-range-change': [dateRange: [number, number] | null, payStatus: number | null]
  'refresh-data': [payStatus: number | null]
  // 'update-creator-stats': [creatorName: string, stats: { totalAmount: number; todayAmount: number }]
}>()

const settingsStore = useSettingsStore()

// 响应式数据
const internalDateRange = ref<[string, string] | null>(null)
// 初始化时默认显示loading状态，直到确实有数据时才取消
const isLoading = ref(true)
const error = ref('')

// 牵龙日期范围选项
const qianlongDateOptions = [
  { label: '今日', value: 'today' },
  { label: '近3日', value: '3days' },
  { label: '近7日', value: '7days' },
  { label: '本月', value: 'month' },
  { label: '上个月', value: 'lastMonth' },
  { label: '至今', value: 'all' },
]

// 支付状态筛选（使用字符串以便 n-select 正确显示）
const payStatusFilter = ref<string>('all') // 默认全部
const payStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '支付成功', value: '0' },
  { label: '未支付', value: '1' },
]

// 将字符串支付状态转换为 API 需要的数字类型
function getPayStatusValue(): number | null {
  if (payStatusFilter.value === 'all') return null
  return parseInt(payStatusFilter.value)
}

// 视图切换状态
const activeView = ref<'orders' | 'income' | 'douyin'>('orders')

// 使用传入的聚合数据，不再需要内部状态
const allCreatorData = computed(() => {
  return props.aggregatedData?.creatorStats || []
})

const allOrdersData = computed(() => {
  return props.aggregatedData?.allOrders || []
})

// 分页状态
const currentPage = ref(1)
const pageSize = ref(20)
const orderCurrentPage = ref(1)
const orderPageSize = ref(10)
// const douyinCurrentPage = ref(1)
// const douyinPageSize = ref(10)

// 抖音账号展开状态管理
const expandedAccounts = ref<string[]>([])

// 剧名展开状态管理（默认全部收起）
const expandedDramas = ref<Record<string, boolean>>({})

// 响应式检测
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

// 计算属性
const currentActiveCreator = computed(() => props.activeCreator)

const creatorList = computed(() => {
  const creators = new Set<string>()
  allCreatorData.value.forEach(item => {
    creators.add(item.creatorName)
  })
  return Array.from(creators).sort()
})

const currentCreatorData = computed(() => {
  if (!currentActiveCreator.value) return []

  return allCreatorData.value
    .filter(item => item.creatorName === currentActiveCreator.value)
    .sort((a, b) => b.date.localeCompare(a.date)) // 按日期倒序
})

const currentCreatorOrders = computed(() => {
  if (!currentActiveCreator.value) return []

  const payStatus = getPayStatusValue()
  // 保持与API返回的数据顺序一致，不做额外排序
  return allOrdersData.value.filter(order => {
    // 根据支付状态筛选（null 表示全部）
    if (payStatus !== null && order.pay_status !== payStatus) {
      return false
    }

    const parsedInfo = parsePromotionName(order.promotion_name)
    return parsedInfo?.creatorName === currentActiveCreator.value
  })
})

// 分页数据计算属性
const paginatedOrderData = computed(() => {
  const start = (orderCurrentPage.value - 1) * orderPageSize.value
  const end = start + orderPageSize.value
  return currentCreatorOrders.value.slice(start, end)
})

const paginatedCreatorData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return currentCreatorData.value.slice(start, end)
})

// 抖音号数据聚合（只统计支付成功的订单，不受支付状态筛选影响）
const currentCreatorDouyinData = computed(() => {
  if (!currentActiveCreator.value) return []

  // 只获取支付成功的订单用于抖音号排名统计
  const creatorOrders = allOrdersData.value.filter(order => {
    // 只统计支付成功的订单
    if (order.pay_status !== 0) return false
    const parsedInfo = parsePromotionName(order.promotion_name)
    return parsedInfo?.creatorName === currentActiveCreator.value
  })

  // 按抖音号聚合数据
  const douyinStats = new Map<
    string,
    {
      douyinName: string
      drama: string
      totalAmount: number
      orderCount: number
      lastPayTime: string
    }
  >()

  creatorOrders.forEach(order => {
    const parsedInfo = parsePromotionName(order.promotion_name)
    if (!parsedInfo?.douyinName) return

    const key = `${parsedInfo.douyinName}-${parsedInfo.drama}`
    if (!douyinStats.has(key)) {
      douyinStats.set(key, {
        douyinName: parsedInfo.douyinName,
        drama: parsedInfo.drama,
        totalAmount: 0,
        orderCount: 0,
        lastPayTime: order.order_paid_time || '',
      })
    }

    const stats = douyinStats.get(key)!
    stats.totalAmount += formatAmount(order.pay_amount)
    stats.orderCount += 1

    // 更新最后支付时间（取最新的）
    if (
      order.order_paid_time &&
      (!stats.lastPayTime || order.order_paid_time > stats.lastPayTime)
    ) {
      stats.lastPayTime = order.order_paid_time
    }
  })

  // 转换为数组并按总金额排序
  return Array.from(douyinStats.values()).sort((a, b) => b.totalAmount - a.totalAmount)
})

// const paginatedDouyinData = computed(() => {
//   const start = (douyinCurrentPage.value - 1) * douyinPageSize.value
//   const end = start + douyinPageSize.value
//   return currentCreatorDouyinData.value.slice(start, end)
// })

// 按抖音号分组的数据（用于手风琴展示，只统计支付成功的订单）
const groupedDouyinData = computed(() => {
  if (!currentActiveCreator.value) return {}

  // 只获取支付成功的订单用于抖音号排名统计
  const creatorOrders = allOrdersData.value.filter(order => {
    // 只统计支付成功的订单
    if (order.pay_status !== 0) return false
    const parsedInfo = parsePromotionName(order.promotion_name)
    return parsedInfo?.creatorName === currentActiveCreator.value
  })

  // 按抖音号分组
  const groups: Record<
    string,
    {
      items: Array<{
        drama: string
        amount: number
        payTime: string
        orderId: string
        promotionName: string
      }>
      totalAmount: number
      totalCount: number
      dramaCount: number
    }
  > = {}

  creatorOrders.forEach(order => {
    const parsedInfo = parsePromotionName(order.promotion_name)
    if (!parsedInfo?.douyinName) return

    const douyinName = parsedInfo.douyinName
    const drama = parsedInfo.drama

    if (!groups[douyinName]) {
      groups[douyinName] = {
        items: [],
        totalAmount: 0,
        totalCount: 0,
        dramaCount: 0,
      }
    }

    // 为每个订单创建一条记录
    const orderItem = {
      drama,
      amount: formatAmount(order.pay_amount),
      payTime: order.order_paid_time || '',
      orderId: 'order_id' in order ? (order as { order_id: string }).order_id : '',
      promotionName: order.promotion_name || '',
    }

    groups[douyinName].items.push(orderItem)
    groups[douyinName].totalAmount += orderItem.amount
    groups[douyinName].totalCount += 1
  })

  // 计算剧目数量并排序
  Object.values(groups).forEach(group => {
    const uniqueDramas = new Set(group.items.map(item => item.drama))
    group.dramaCount = uniqueDramas.size
    // 按支付时间排序（最新的在前）
    group.items.sort((a, b) => new Date(b.payTime).getTime() - new Date(a.payTime).getTime())
  })

  return groups
})

// 按充值金额排序的抖音号数据（用于展示）
const sortedDouyinData = computed(() => {
  const groups = groupedDouyinData.value

  // 将对象转换为数组并按totalAmount降序排序
  return Object.entries(groups)
    .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
    .reduce(
      (acc, [douyinId, group]) => {
        acc[douyinId] = group
        return acc
      },
      {} as typeof groups
    )
})

// 这些计算属性已不再需要，因为移除了统计卡片
// const totalDouyinAmount = computed(() => {
//   return Object.values(groupedDouyinData.value).reduce((sum, group) => sum + group.totalAmount, 0)
// })

// const totalDouyinCount = computed(() => {
//   return Object.values(groupedDouyinData.value).reduce((sum, group) => sum + group.totalCount, 0)
// })

const creatorOverview = computed(() => {
  if (!currentActiveCreator.value || currentCreatorData.value.length === 0) return null

  const data = currentCreatorData.value
  const totalAmount = data.reduce((sum, item) => sum + item.totalAmount, 0)
  const totalOrders = data.reduce((sum, item) => sum + item.orderCount, 0)
  const activeDays = data.length
  const avgDailyAmount = activeDays > 0 ? totalAmount / activeDays : 0

  // 计算当日收入（最新日期的收入）
  const todayData = data.length > 0 ? data[0] : null // 数据已按日期倒序排列
  const todayAmount = todayData ? todayData.totalAmount : 0
  const todayOrders = todayData ? todayData.orderCount : 0
  const todayDate = todayData ? todayData.date : ''

  const overview = {
    totalAmount,
    totalOrders,
    activeDays,
    avgDailyAmount,
    todayAmount,
    todayOrders,
    todayDate,
  }

  // 注释掉重复的emit，现在由Dashboard统一管理统计数据
  // if (currentActiveCreator.value) {
  //   emit('update-creator-stats', currentActiveCreator.value, {
  //     totalAmount,
  //     todayAmount,
  //   })
  // }

  return overview
})

// 抖音号统计表格列配置（已废弃，改用手风琴组件）
// const douyinTableColumns: DataTableColumns<{
//   douyinName: string
//   drama: string
//   totalAmount: number
//   orderCount: number
//   lastPayTime: string
// }> = [
//   {
//     title: '抖音号',
//     key: 'douyinName',
//     width: 200,
//     align: 'left',
//     resizable: true,
//     render: (row) => {
//       return h('span', { class: 'text-blue-600 font-medium' }, row.douyinName || '-')
//     },
//   },
//   {
//     title: '推广剧名',
//     key: 'drama',
//     width: 150,
//     align: 'left',
//     resizable: true,
//     render: (row) => {
//       return h('span', { class: 'text-gray-900' }, row.drama || '-')
//     },
//   },
//   {
//     title: '总支付金额',
//     key: 'totalAmount',
//     width: 120,
//     align: 'right',
//     resizable: true,
//     render: (row) =>
//       h(
//         'span',
//         { class: 'font-semibold text-green-600' },
//         `¥${row.totalAmount.toFixed(1)}`,
//       ),
//   },
//   {
//     title: '订单数量',
//     key: 'orderCount',
//     width: 100,
//     align: 'center',
//     resizable: true,
//     render: (row) => h('span', { class: 'font-medium text-gray-900' }, `${row.orderCount}单`),
//   },
//   {
//     title: '最后支付时间',
//     key: 'lastPayTime',
//     width: 160,
//     align: 'center',
//     resizable: true,
//     render: (row) => h('span', { class: 'text-gray-900' }, row.lastPayTime || '-'),
//   },
// ]

// 抖音号详情表格列配置已移除，现在使用卡片展示

// 订单详情表格列配置
const orderTableColumns: DataTableColumns<OrderItem> = [
  {
    title: '创建时间',
    key: 'order_create_time',
    width: 160,
    align: 'center',
    resizable: true,
    render: row => h('span', { class: 'text-gray-700' }, row.order_create_time),
  },
  {
    title: '支付时间',
    key: 'order_paid_time',
    width: 160,
    align: 'center',
    resizable: true,
    render: row => h('span', { class: 'text-gray-900' }, row.order_paid_time || '-'),
  },
  {
    title: '用户ID',
    key: 'device_id',
    width: 80,
    align: 'center',
    resizable: true,
    render: row => {
      // 只显示最后4个字符
      const deviceId = row.device_id || ''
      const lastFour = deviceId.length > 4 ? deviceId.slice(-4) : deviceId
      return h('span', { class: 'font-mono text-gray-600 text-sm' }, lastFour || '-')
    },
  },
  {
    title: '剧名',
    key: 'drama_name',
    width: 150,
    align: 'left',
    resizable: true,
    render: row => {
      const parsedInfo = parsePromotionName(row.promotion_name)
      return h('span', { class: 'text-gray-900' }, parsedInfo?.drama || '未知')
    },
  },
  {
    title: '抖音号',
    key: 'douyinName',
    width: 100,
    align: 'left',
    resizable: true,
    render: row => {
      const parsedInfo = parsePromotionName(row.promotion_name)
      if (parsedInfo?.douyinName) {
        return h('span', { class: 'text-blue-600 font-medium' }, parsedInfo.douyinName)
      } else {
        return h('span', { class: 'text-gray-400 text-sm' }, '-')
      }
    },
  },
  {
    title: '支付金额',
    key: 'pay_amount',
    width: 80,
    align: 'right',
    resizable: true,
    render: row =>
      h('span', { class: 'font-semibold text-green-600' }, formatAmountDisplay(row.pay_amount)),
  },
  {
    title: '支付状态',
    key: 'pay_status',
    width: 100,
    align: 'center',
    resizable: true,
    render: row => {
      const isSuccess = row.pay_status === 0
      return h(
        'span',
        {
          class: isSuccess
            ? 'px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full'
            : 'px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full',
        },
        isSuccess ? '支付成功' : '未支付'
      )
    },
  },
  {
    title: '支付方式',
    key: 'pay_way',
    width: 120,
    align: 'center',
    resizable: true,
    render: row => h('span', { class: 'text-gray-700' }, row.pay_way || '未知'),
  },
  {
    title: '推广链来源',
    key: 'promotion_name',
    width: 200,
    align: 'left',
    resizable: true,
    render: row => h('span', { class: 'text-gray-600 text-sm truncate' }, row.promotion_name),
  },
]

// 表格列配置
const tableColumns: DataTableColumns<CreatorDailyData> = [
  {
    title: '日期',
    key: 'date',
    width: 120,
    align: 'center',
    resizable: true,
    render: row => h('span', { class: 'font-medium text-gray-900' }, row.date),
  },
  {
    title: '收入金额',
    key: 'totalAmount',
    width: 120,
    align: 'right',
    resizable: true,
    render: row =>
      h('span', { class: 'font-semibold text-green-600' }, `¥${row.totalAmount.toFixed(1)}`),
  },
  {
    title: '订单数量',
    key: 'orderCount',
    width: 100,
    align: 'center',
    resizable: true,
    render: row =>
      h('span', { class: 'font-medium text-gray-900' }, row.orderCount.toLocaleString()),
  },
]

// 骨架屏相关工具函数
function getOrderColumnWidth(index: number): string {
  const widths = ['150px', '150px', '120px', '160px', '100px', '120px', '200px', '150px', '160px']
  return widths[index - 1] || '120px'
}

function getIncomeColumnWidth(index: number): string {
  const widths = ['120px', '120px', '100px']
  return widths[index - 1] || '120px'
}

function getDouyinColumnWidth(index: number): string {
  const widths = ['200px', '150px', '120px', '100px', '160px']
  return widths[index - 1] || '120px'
}

// 初始化日期范围
function initDateRange() {
  if (props.dateRange) {
    // 将时间戳转换为字符串格式
    const startDate = dayjs(props.dateRange[0]).tz('Asia/Shanghai').format('YYYY-MM-DD')
    const endDate = dayjs(props.dateRange[1]).tz('Asia/Shanghai').format('YYYY-MM-DD')
    internalDateRange.value = [startDate, endDate]
  } else {
    const [start, end] = getQianlongDefaultDateRange()
    internalDateRange.value = [
      dayjs(start).tz('Asia/Shanghai').format('YYYY-MM-DD'),
      dayjs(end).tz('Asia/Shanghai').format('YYYY-MM-DD'),
    ]
  }
}

// 数据现在由父组件提供，不再需要内部获取

// 刷新数据（通知父组件重新获取数据）
function refreshData() {
  // 设置loading状态
  isLoading.value = true
  // 重置分页
  currentPage.value = 1
  orderCurrentPage.value = 1

  // 检查日期范围是否需要同步
  const needsDateSync = JSON.stringify(internalDateRange.value) !== JSON.stringify(props.dateRange)

  const payStatus = getPayStatusValue()
  if (needsDateSync && internalDateRange.value) {
    // 将字符串日期转换为时间戳
    const startTime = dayjs(internalDateRange.value[0]).tz('Asia/Shanghai').startOf('day').valueOf()
    const endTime = dayjs(internalDateRange.value[1]).tz('Asia/Shanghai').endOf('day').valueOf()
    const correctedDateRange: [number, number] = [startTime, endTime]

    // 如果日期范围有变化，通过date-range-change事件同步并触发刷新，同时传递支付状态
    emit('date-range-change', correctedDateRange, payStatus)
  } else {
    // 如果日期范围没有变化，直接触发数据刷新，传递支付状态
    emit('refresh-data', payStatus)
  }
}

// 处理支付状态变化 - 选择后立即查询
function handlePayStatusChange() {
  refreshData()
}

// 视图切换方法
function switchView(view: 'orders' | 'income' | 'douyin') {
  activeView.value = view
  // 切换视图时重置对应的分页
  if (view === 'orders') {
    orderCurrentPage.value = 1
  } else if (view === 'income') {
    currentPage.value = 1
  } else if (view === 'douyin') {
    // douyinCurrentPage.value = 1 // 不再需要分页
  }
}

// 抖音账号展开/折叠管理
function toggleAccount(accountId: string) {
  const index = expandedAccounts.value.indexOf(accountId)
  if (index > -1) {
    expandedAccounts.value.splice(index, 1)
  } else {
    expandedAccounts.value.push(accountId)
  }
}

// 剧名展开/折叠管理
function toggleDramaExpansion(dramaName: string) {
  expandedDramas.value[dramaName] = !expandedDramas.value[dramaName]
}

// 按剧名分组订单记录
function groupRecordsByDrama(
  records: Array<{
    drama: string
    amount: number
    payTime: string
    orderId: string
    promotionName: string
  }>
) {
  const groups: Record<
    string,
    {
      records: Array<{
        drama: string
        amount: number
        payTime: string
        orderId: string
        promotionName: string
      }>
      totalAmount: number
      orderCount: number
    }
  > = {}

  records.forEach(record => {
    const dramaName = record.drama || '未知剧目'
    if (!groups[dramaName]) {
      groups[dramaName] = {
        records: [],
        totalAmount: 0,
        orderCount: 0,
      }
    }
    groups[dramaName].records.push(record)
    groups[dramaName].totalAmount += record.amount
    groups[dramaName].orderCount++
  })

  // 对每个剧名下的记录按时间排序（最新的在前）
  Object.keys(groups).forEach(dramaName => {
    groups[dramaName].records.sort(
      (a, b) => new Date(b.payTime).getTime() - new Date(a.payTime).getTime()
    )
  })

  // 按充值金额排序剧名，返回排序后的对象
  return Object.entries(groups)
    .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
    .reduce(
      (acc, [dramaName, group]) => {
        acc[dramaName] = group
        return acc
      },
      {} as typeof groups
    )
}

// 格式化时间（显示月-日 时:分）
function formatSimpleTime(dateStr: string) {
  if (!dateStr) return '----'
  try {
    // 使用dayjs处理北京时间
    const date = dayjs.tz(dateStr, 'Asia/Shanghai')
    const month = date.month() + 1
    const day = date.date()
    const hour = date.hour().toString().padStart(2, '0')
    const minute = date.minute().toString().padStart(2, '0')

    return `${month}-${day} ${hour}:${minute}`
  } catch {
    return '----'
  }
}

// 事件处理
function handleDateChange() {
  console.log('子组件日期变化:', internalDateRange.value)

  const payStatus = getPayStatusValue()
  // 如果没有选择日期范围，直接返回
  if (!internalDateRange.value || internalDateRange.value.length !== 2) {
    emit('date-range-change', null, payStatus)
    return
  }

  // 将字符串日期转换为时间戳
  const startTime = dayjs(internalDateRange.value[0]).tz('Asia/Shanghai').startOf('day').valueOf()
  const endTime = dayjs(internalDateRange.value[1]).tz('Asia/Shanghai').endOf('day').valueOf()
  const correctedDateRange: [number, number] = [startTime, endTime]

  console.log('修正后的日期范围:', {
    原始开始: internalDateRange.value[0],
    修正开始: new Date(correctedDateRange[0]),
    原始结束: internalDateRange.value[1],
    修正结束: new Date(correctedDateRange[1]),
  })

  // 重置分页
  currentPage.value = 1
  orderCurrentPage.value = 1

  // 发出修正后的日期范围变化事件，让父组件重新获取数据，同时传递支付状态
  emit('date-range-change', correctedDateRange, payStatus)
}

// 移除了内部的达人切换方法，现在通过外部props控制

// 监听外部传入的达人切换
watch(
  () => props.activeCreator,
  () => {
    // 达人切换
    // 达人切换时重置订单分页
    orderCurrentPage.value = 1
    // 达人切换时自动更新显示的数据，无需重新请求API
  }
)

// 监听外部传入的日期范围变化
watch(
  () => props.dateRange,
  newDateRange => {
    if (newDateRange) {
      // 将时间戳转换为字符串格式
      const startDate = dayjs(newDateRange[0]).tz('Asia/Shanghai').format('YYYY-MM-DD')
      const endDate = dayjs(newDateRange[1]).tz('Asia/Shanghai').format('YYYY-MM-DD')
      internalDateRange.value = [startDate, endDate]
    }
  },
  { deep: true }
)

// 监听聚合数据变化，控制loading状态
watch(
  () => props.aggregatedData,
  newData => {
    if (newData === null || newData === undefined) {
      // 数据被重置，显示loading状态
      isLoading.value = true
    } else {
      // 数据已更新（不管是空数组还是有数据），重置loading状态
      // 这确保了API调用完成后loading状态被正确重置
      setTimeout(() => {
        isLoading.value = false
      }, 100) // 减少延迟以提高响应性
    }
  },
  { immediate: true, deep: true }
)

// 监听设置变化（只更新内部日期范围，数据获取由父组件负责）
watch(
  () => settingsStore.settings.defaultDateRange,
  () => {
    initDateRange()
  }
)

onMounted(() => {
  initDateRange()

  // 初始化响应式检测
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 数据现在由父组件提供，不需要在这里加载
  // 但需要根据初始数据状态设置loading状态
  if (props.aggregatedData !== null && props.aggregatedData !== undefined) {
    // 如果已经有数据，关闭loading状态
    setTimeout(() => {
      isLoading.value = false
    }, 100)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style lang="scss" scoped>
.qianlong-creator-detail {
  @apply space-y-6;
}

.creator-detail-card {
  @apply shadow-sm border border-gray-200/60 rounded-2xl overflow-hidden backdrop-blur-sm;
  background: rgba(255, 255, 255, 0.8);
}

:deep(.creator-detail-card .n-card-header) {
  @apply border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-green-50/80 px-6 py-4;
}

:deep(.creator-detail-card .n-card__content) {
  @apply p-6;
}

/* 达人标签样式 */
:deep(.creator-tabs .n-tabs-tab) {
  @apply transition-all duration-300;
  color: #64748b;
  font-weight: 500;
}

:deep(.creator-tabs .n-tabs-tab:hover) {
  color: #059669;
}

:deep(.creator-tabs .n-tabs-tab--active) {
  color: #059669;
  font-weight: 600;
}

:deep(.creator-tabs .n-tabs-bar) {
  background: linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%);
  height: 3px;
  border-radius: 2px;
}

/* 概览卡片样式 */
.overview-card {
  @apply cursor-default;
}

.overview-card-inner {
  @apply relative p-4 rounded-xl border shadow-sm backdrop-blur-sm transition-all duration-300;
  background: rgba(255, 255, 255, 0.9);
}

.overview-card:hover .overview-card-inner {
  @apply shadow-md border-opacity-80;
}

.overview-card-icon {
  @apply w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-300;
}

/* 订单详情表格样式 */
:deep(.order-details-table .n-data-table-thead) {
  @apply bg-gradient-to-r from-indigo-50 to-blue-50;
}

:deep(.order-details-table .n-data-table-th) {
  @apply text-gray-700 font-semibold border-b border-indigo-200;
}

:deep(.order-details-table .n-data-table-td) {
  @apply text-gray-900 border-b border-gray-100;
}

:deep(.order-details-table .n-data-table-tr:hover .n-data-table-td) {
  @apply bg-indigo-50/50;
}

/* 表格样式 */
:deep(.creator-table .n-data-table-thead) {
  @apply bg-gradient-to-r from-gray-50 to-green-50;
}

:deep(.creator-table .n-data-table-th) {
  @apply text-gray-700 font-semibold border-b border-gray-200;
}

:deep(.creator-table .n-data-table-td) {
  @apply text-gray-900 border-b border-gray-100;
}

:deep(.creator-table .n-data-table-tr:hover .n-data-table-td) {
  @apply bg-green-50/50;
}

/* 骨架屏样式 */
.skeleton-text {
  @apply bg-gray-200 rounded animate-pulse;
}

.skeleton-title {
  @apply h-4 w-16;
}

.skeleton-amount {
  @apply h-8 w-24;
}

.skeleton-subtitle {
  @apply h-3 w-20;
}

.skeleton-icon {
  @apply w-12 h-12 bg-gray-200 rounded-xl animate-pulse;
}

.overview-card-skeleton .overview-card-inner {
  @apply border-gray-200;
}

/* 表格骨架屏样式 */
.table-skeleton-container {
  @apply bg-white rounded-xl border border-gray-200 overflow-hidden;
}

.table-skeleton-header {
  @apply flex bg-gray-50 p-4 border-b border-gray-200;
}

.table-skeleton-header-cell {
  @apply h-4 mx-2 bg-gray-300 rounded animate-pulse;
}

.table-skeleton-body {
  @apply divide-y divide-gray-100;
}

.table-skeleton-row {
  @apply flex p-4;
}

.table-skeleton-cell {
  @apply h-3 mx-2 bg-gray-200 rounded animate-pulse;
}

/* 动画效果 */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.6s ease-out forwards;
}

/* 空状态样式优化 */
.overview-empty-state .empty-card .overview-card-inner {
  @apply border-gray-200 bg-gray-50/30;
}

.empty-table-state {
  @apply transition-all duration-300;
}

.empty-table-state:hover {
  @apply transform scale-[1.02];
}

/* 数据容器动画 */
.overview-data-container {
  @apply opacity-0;
  animation: fade-in 0.8s ease-out 0.2s forwards;
}

/* 视图切换器样式 */
.view-switcher-container {
  @apply flex justify-center mb-6;
}

.view-switcher {
  @apply inline-flex bg-gray-100/80 rounded-xl p-1 backdrop-blur-sm border border-gray-200/60 shadow-sm;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8));
}

.view-switch-button {
  @apply relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 ease-in-out flex items-center justify-center min-w-[120px] border border-transparent;
}

.view-switch-button-active {
  @apply text-white shadow-lg transform scale-[1.02];
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  box-shadow:
    0 4px 15px rgba(99, 102, 241, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.view-switch-button-inactive {
  @apply text-gray-600 hover:text-gray-800 hover:bg-white/60 hover:shadow-sm hover:border-gray-300/50;
}

.view-switch-indicator {
  @apply absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-white rounded-full opacity-80;
}

/* 数据视图容器 */
.data-view-container {
  @apply transition-all duration-500 ease-in-out;
  min-height: 400px;
}

/* 视图切换动画 */
.data-view-container[v-show] {
  animation: slide-in 0.4s ease-out forwards;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 抖音号统计表格样式 */
.douyin-stats-table {
  @apply bg-white rounded-lg overflow-hidden;
}

:deep(.douyin-stats-table .n-data-table-thead) {
  @apply bg-gradient-to-r from-green-50 to-blue-50;
}

:deep(.douyin-stats-table .n-data-table-th) {
  @apply text-gray-700 font-semibold;
}

:deep(.douyin-stats-table .n-data-table-tr:hover) {
  @apply bg-green-50/30;
}

/* 抖音号手风琴样式 */
.douyin-accordion {
  @apply space-y-3;
}

:deep(.douyin-collapse-item .n-collapse-item__header) {
  @apply bg-white border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 transition-all duration-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

:deep(.douyin-collapse-item .n-collapse-item__header--active) {
  @apply border-green-300 bg-green-50/50;
}

:deep(.douyin-collapse-item .n-collapse-item__content) {
  @apply border-0 px-0 py-0;
}

:deep(.douyin-collapse-item .n-collapse-item__content-wrapper) {
  @apply border-0 bg-transparent;
}

:deep(.douyin-detail-table .n-data-table) {
  @apply bg-white rounded-lg overflow-hidden;
}

:deep(.douyin-detail-table .n-data-table-thead) {
  @apply bg-gray-100;
}

:deep(.douyin-detail-table .n-data-table-th) {
  @apply text-gray-700 font-medium text-sm;
}

:deep(.douyin-detail-table .n-data-table-tr:hover) {
  @apply bg-blue-50/30;
}

/* 抖音账号列表样式 */
.douyin-accounts-section {
  .douyin-accounts-list {
    .douyin-account-group {
      @apply bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden;

      .account-header {
        @apply p-6 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-indigo-50/30;
        @apply transition-all duration-200 flex items-center justify-between;
        @apply border-b border-gray-100;

        &.expanded {
          @apply bg-gradient-to-r from-blue-50/50 to-indigo-50/40 border-b-blue-200;
          box-shadow: inset 0 1px 0 rgba(59, 130, 246, 0.1);
        }

        .account-info {
          @apply flex items-center gap-4;

          .account-avatar {
            @apply w-14 h-14 rounded-xl flex items-center justify-center shadow-lg;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 2px solid rgba(255, 255, 255, 0.2);

            .avatar-content {
              @apply text-white font-bold text-lg;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
          }

          .account-details {
            .account-name {
              @apply text-lg font-semibold text-gray-800 mb-1;
            }

            .account-meta {
              @apply text-sm text-gray-500;

              .total-amount {
                @apply font-semibold text-emerald-600;
                font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
              }
            }
          }
        }

        .expand-icon {
          @apply text-gray-400;
        }
      }

      .account-content {
        @apply p-8 bg-gradient-to-br from-gray-50/30 to-white/50;
        transition:
          max-height 0.3s ease-in-out,
          opacity 0.3s ease-in-out;
        overflow: hidden;
        max-height: 2000px;

        &[style*='display: none'] {
          max-height: 0;
          opacity: 0;
          padding-top: 0;
          padding-bottom: 0;
        }

        .drama-group {
          @apply mb-6 last:mb-0;

          .drama-header {
            @apply flex items-center justify-between mb-4 pb-3 border-b border-gray-100 cursor-pointer transition-all duration-300;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(248, 250, 252, 0.9));
            border-radius: 12px;
            padding: 16px 20px;
            margin: 0 0 16px 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(226, 232, 240, 0.6);

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
              border-color: rgba(59, 130, 246, 0.2);
              background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.95),
                rgba(248, 250, 252, 1)
              );
            }

            .drama-info {
              @apply flex items-center gap-4 flex-1;
            }

            .drama-name {
              @apply font-semibold text-base text-gray-900 flex items-center gap-3;
              background: linear-gradient(135deg, #1f2937, #374151);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }

            .drama-stats {
              @apply flex items-center gap-3;

              .drama-count {
                @apply text-xs font-semibold text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-1.5 rounded-full;
                box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.1);
              }

              .drama-total {
                @apply text-xs font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 px-3 py-1.5 rounded-full;
                font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
                box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.1);
              }
            }

            .expand-btn {
              @apply flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border border-slate-200 cursor-pointer transition-all duration-300;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

              &:hover {
                @apply bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 border-blue-200 transform scale-110;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
              }

              &.expanded {
                @apply bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
              }
            }
          }

          .drama-records {
            @apply grid gap-3;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            padding: 16px 24px 24px 24px;
            margin-top: -8px;
            background: linear-gradient(135deg, rgba(248, 250, 252, 0.4), rgba(255, 255, 255, 0.6));
            border-radius: 0 0 16px 16px;
            border: 1px solid rgba(226, 232, 240, 0.3);
            border-top: none;
            transition:
              max-height 0.25s ease-in-out,
              opacity 0.25s ease-in-out;
            overflow: hidden;
            max-height: 800px;

            &[style*='display: none'] {
              max-height: 0;
              opacity: 0;
              padding-top: 0;
              padding-bottom: 0;
              margin-top: 0;
            }

            @media (min-width: 1400px) {
              grid-template-columns: repeat(8, 1fr);
            }

            @media (min-width: 1200px) and (max-width: 1399px) {
              grid-template-columns: repeat(7, 1fr);
            }

            @media (min-width: 1024px) and (max-width: 1199px) {
              grid-template-columns: repeat(6, 1fr);
            }

            @media (min-width: 768px) and (max-width: 1023px) {
              grid-template-columns: repeat(5, 1fr);
            }

            @media (max-width: 767px) {
              grid-template-columns: repeat(4, 1fr);
            }

            .record-tag {
              @apply inline-flex items-center justify-between px-2.5 py-1.5 bg-white border border-gray-200 shadow-sm cursor-pointer;
              @apply transition-all duration-300 transform;
              border-radius: 12px;
              min-height: 36px;
              width: 100%;
              background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.9),
                rgba(248, 250, 252, 0.8)
              );
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

              &:hover {
                transform: translateY(-1px) scale(1.02);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
                border-color: rgba(16, 185, 129, 0.3);
                background: linear-gradient(
                  135deg,
                  rgba(236, 253, 245, 0.8),
                  rgba(209, 250, 229, 0.6)
                );
              }

              .amount {
                @apply font-bold text-emerald-700;
                font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
                font-size: 13px;
                letter-spacing: 0.025em;
                flex-shrink: 0;
                min-width: 0;
              }

              .time {
                @apply text-gray-600 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full;
                font-size: 9px;
                white-space: nowrap;
                transition: all 0.3s ease;
                flex-shrink: 0;
                min-width: 0;
              }

              &:hover .time {
                @apply bg-emerald-100 text-emerald-700;
              }
            }
          }
        }
      }
    }
  }
}

/* 响应式优化 */
@media (max-width: 640px) {
  :deep(.creator-detail-card .n-card-header) {
    @apply px-4 py-3;
  }

  :deep(.creator-detail-card .n-card__content) {
    @apply p-4;
  }

  .overview-card-inner {
    @apply p-3;
  }

  .overview-card-icon {
    @apply w-10 h-10;
  }

  .table-skeleton-header {
    @apply px-2;
  }

  .table-skeleton-row {
    @apply px-2;
  }

  /* 移动端视图切换器优化 */
  .view-switcher-container {
    @apply mb-4;
  }

  .view-switcher {
    @apply w-full max-w-sm;
  }

  .view-switch-button {
    @apply px-4 py-2 text-xs min-w-[120px];
  }

  .data-view-container {
    min-height: 300px;
  }

  /* 移动端抖音账号样式优化 */
  .douyin-accounts-section {
    .douyin-accounts-list {
      .douyin-account-group {
        .account-header {
          @apply p-4;

          .account-info {
            @apply gap-3;

            .account-avatar {
              @apply w-12 h-12;

              .avatar-content {
                @apply text-base;
              }
            }

            .account-details {
              .account-name {
                @apply text-base;
              }

              .account-meta {
                @apply text-xs;
              }
            }
          }
        }

        .account-content {
          @apply p-4;

          .drama-group {
            .drama-records {
              @apply gap-1;
              grid-template-columns: repeat(3, 1fr);

              @media (max-width: 480px) {
                grid-template-columns: repeat(2, 1fr);
              }

              @media (max-width: 360px) {
                grid-template-columns: 1fr;
              }

              .record-tag {
                @apply px-1.5 py-1;
                min-height: 32px;
                width: 100%;

                .amount {
                  font-size: 11px;
                  margin-right: 4px;
                }

                .time {
                  font-size: 8px;
                  @apply px-1 py-0.5;
                  white-space: nowrap;
                }
              }
            }
          }
        }
      }
    }
  }
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
</style>
