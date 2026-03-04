<template>
  <div class="order-statistics">
    <!-- 卡片容器 -->
    <n-card class="statistics-card" :bordered="false">
      <!-- 卡片头部 -->
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-bold text-gray-900 flex items-center">
                <Icon
                  :icon="getStatisticsTypeIcon(statisticsType)"
                  class="w-6 h-6 mr-2 text-purple-500"
                />
                {{ getStatisticsTypeTitle(statisticsType) }}
              </h2>

              <!-- 统计类型选择器 -->
              <n-select
                v-if="statisticsTypeOptions.length > 1"
                v-model:value="statisticsType"
                :options="statisticsTypeOptions"
                size="small"
                class="w-32"
                @update:value="handleStatisticsTypeChange"
              />

              <!-- 模式选择器 - 仅每日账号的订单统计显示 -->
              <n-select
                v-if="statisticsType === 'orders' && accountStore.isDailyAccount"
                v-model:value="dailyOrderMode"
                :options="dailyOrderModeOptions"
                size="small"
                class="w-28"
                @update:value="handleDailyModeChange"
              />
            </div>
            <p class="text-sm text-gray-500 mt-1">
              {{
                statisticsType === 'orders'
                  ? '用户订单详情与支付状态追踪'
                  : statisticsType === 'douyin'
                    ? '抖音号维度收入排行统计'
                    : '短剧维度收入排行统计'
              }}
            </p>
          </div>

          <!-- 筛选器和工具栏 -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <DateRangePicker
              v-model="dateRange"
              @update:model-value="handleDateChange"
              @update:preset-label="handlePresetLabelChange"
              select-class-name="w-full sm:w-40"
            />

            <n-select
              v-model:value="payStatus"
              placeholder="支付状态"
              @update:value="handleStatusChange"
              class="w-full sm:w-32"
              :options="payStatusOptions"
              :default-value="-1"
              :disabled="isCollaboratorMode || statisticsType !== 'orders'"
            />

            <!-- 短剧排行排序选择器 -->
            <n-select
              v-if="statisticsType === 'drama'"
              v-model:value="dramaSortType"
              placeholder="排序方式"
              @update:value="handleDramaSortChange"
              class="w-full sm:w-36"
              :options="dramaSortOptions"
              :default-value="'amount'"
            />

            <div class="flex items-center gap-2">
              <n-button
                type="primary"
                :loading="orderLoading"
                @click="fetchOrderData"
                class="flex-shrink-0"
              >
                <template #icon>
                  <Icon icon="mdi:magnify" />
                </template>
                查询
              </n-button>

              <n-button
                v-if="statisticsType === 'orders'"
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

      <!-- 达人选择区域 - 卡片形式 -->
      <div v-if="isCollaboratorMode" class="px-6 pb-6 border-b border-gray-100">
        <!-- 加载状态 -->
        <div
          v-if="orderLoading"
          class="flex flex-col items-center justify-center py-12 text-gray-400"
        >
          <n-spin size="large" />
          <p class="mt-4 text-sm">正在加载达人数据...</p>
        </div>

        <!-- 达人卡片列表 -->
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div
            v-for="(collaborator, index) in collaboratorDetailsOptions"
            :key="collaborator.name"
            @click="selectCollaborator(collaborator.name)"
            :class="[
              'relative cursor-pointer rounded-2xl p-4 transition-all duration-300 border',
              'hover:shadow-lg hover:-translate-y-1 transform',
              selectedCollaborator === collaborator.name
                ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300 shadow-md shadow-emerald-200/50'
                : 'bg-white border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/30',
            ]"
          >
            <!-- 排名徽章 -->
            <div class="absolute -top-2 -left-2">
              <div
                :class="[
                  'relative w-7 h-7 rounded-full flex items-center justify-center font-bold shadow-md transition-all duration-300',
                  'ring-2 ring-white',
                  index === 0
                    ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 text-white'
                    : index === 1
                      ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-white'
                      : index === 2
                        ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 text-white'
                        : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700',
                ]"
              >
                <!-- 前三名显示图标 -->
                <Icon v-if="index === 0" icon="mdi:trophy" class="w-4 h-4 drop-shadow-sm" />
                <Icon v-else-if="index === 1" icon="mdi:medal" class="w-4 h-4 drop-shadow-sm" />
                <Icon
                  v-else-if="index === 2"
                  icon="mdi:medal-outline"
                  class="w-4 h-4 drop-shadow-sm"
                />
                <!-- 其他排名显示数字 -->
                <span v-else class="text-xs">{{ index + 1 }}</span>

                <!-- 前三名闪光效果 -->
                <div
                  v-if="index < 3"
                  class="absolute inset-0 rounded-full bg-white opacity-0 animate-ping"
                  style="animation-duration: 2s"
                ></div>
              </div>
            </div>

            <!-- 选中标记 -->
            <div
              v-if="selectedCollaborator === collaborator.name"
              class="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-md"
            >
              <Icon icon="mdi:check" class="w-4 h-4 text-white" />
            </div>

            <!-- 达人名称 -->
            <div
              :class="[
                'text-lg font-bold mb-3 mt-2 truncate',
                selectedCollaborator === collaborator.name ? 'text-emerald-900' : 'text-gray-800',
              ]"
            >
              {{ collaborator.name }}
            </div>

            <!-- 已支付金额 -->
            <div class="flex items-baseline gap-1">
              <span
                :class="[
                  'text-xs font-medium',
                  selectedCollaborator === collaborator.name ? 'text-emerald-600' : 'text-gray-500',
                ]"
              >
                ¥
              </span>
              <span
                :class="[
                  'text-xl font-bold',
                  selectedCollaborator === collaborator.name
                    ? 'text-emerald-700'
                    : 'text-emerald-600',
                ]"
              >
                {{ collaborator.amount }}
              </span>
            </div>

            <!-- 底部装饰条 - 使用内边距避免圆角冲突 -->
            <div
              v-if="selectedCollaborator === collaborator.name"
              class="absolute bottom-2 left-2 right-2 h-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full transition-all duration-300"
            ></div>
          </div>

          <!-- 空状态 -->
          <div
            v-if="!collaboratorDetailsOptions.length"
            class="col-span-full text-center py-8 text-gray-400"
          >
            <Icon icon="mdi:account-off" class="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p class="text-sm">暂无达人数据</p>
          </div>
        </div>
        <!-- 结束：达人卡片列表 -->
      </div>

      <!-- 错误状态 -->
      <n-alert v-if="orderError" type="error" :title="orderError" show-icon class="mb-6" />

      <!-- 数据展示区域 -->
      <div class="data-display-area">
        <!-- 达人总充值金额卡片（已禁用） -->
        <div v-if="false" class="mb-6">
          <n-card :bordered="false" class="bg-gradient-to-br from-cyan-50 to-blue-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center">
                  <Icon v-if="!orderLoading" icon="mdi:cash-multiple" class="w-6 h-6 text-white" />
                  <Icon v-else icon="mdi:loading" class="w-6 h-6 text-white animate-spin" />
                </div>
                <div>
                  <div class="text-sm text-gray-600">
                    {{ rechargeCardTitle }}
                  </div>
                  <div v-if="!orderLoading" class="text-3xl font-bold text-cyan-600 mt-1">
                    ¥{{ totalRechargeAmount.toFixed(2) }}
                  </div>
                  <div v-else class="text-3xl font-bold text-gray-400 mt-1">
                    <Icon icon="mdi:loading" class="inline-block animate-spin" />
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">订单数</div>
                <div v-if="!orderLoading" class="text-xl font-semibold text-gray-700">
                  {{ orderData?.total || 0 }}
                </div>
                <div v-else class="text-xl font-semibold text-gray-400">
                  <Icon icon="mdi:loading" class="inline-block animate-spin" />
                </div>
              </div>
            </div>
          </n-card>
        </div>

        <!-- 订单统计表格 -->
        <div v-if="statisticsType === 'orders'" class="overflow-hidden">
          <n-data-table
            :columns="displayColumns"
            :data="paginatedTableData"
            :loading="orderLoading"
            :bordered="false"
            striped
            class="statistics-table"
            :scroll-x="1200"
          />
        </div>

        <!-- 短剧排行布局 -->
        <div v-else-if="statisticsType === 'drama'" class="drama-ranking-container">
          <div v-if="orderLoading" class="flex justify-center items-center py-12">
            <n-spin size="large" />
          </div>

          <div v-else-if="dramaRankingData.length === 0" class="empty-state">
            <n-empty description="暂无短剧排行数据" />
          </div>

          <div v-else class="drama-ranking-list">
            <template v-for="(drama, index) in dramaRankingData" :key="drama.drama">
              <div
                class="drama-group"
                :class="{
                  expanded: expandedDramaRanking.has(drama.drama),
                  [`rank-theme-${index + 1}`]: true,
                }"
              >
                <!-- 短剧主项目 -->
                <div
                  class="ranking-item clickable"
                  :class="`rank-theme-${index + 1}`"
                  @click="toggleDramaRanking(drama.drama)"
                >
                  <!-- 排名 -->
                  <div class="rank-section">
                    <span class="rank-badge" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
                  </div>

                  <!-- 短剧信息 -->
                  <div class="drama-info">
                    <div class="drama-name">{{ drama.drama }}</div>
                    <div class="drama-stats">
                      <span class="stat-item">
                        <span class="stat-label">充值金额:</span>
                        <span class="stat-value amount">¥{{ drama.totalAmount.toFixed(1) }}</span>
                      </span>
                      <span class="stat-item">
                        <span class="stat-label">支付订单:</span>
                        <span class="stat-value">{{ drama.paidOrderCount }}</span>
                      </span>
                    </div>
                  </div>

                  <!-- 总数据 -->
                  <div class="drama-totals">
                    <div class="total-item">
                      <div class="total-value">¥{{ drama.totalAmount.toFixed(1) }}</div>
                      <div class="total-label">总充值</div>
                    </div>
                  </div>

                  <!-- 展开/收起图标 -->
                  <div class="dramas-toggle">
                    <Icon
                      :icon="
                        expandedDramaRanking.has(drama.drama)
                          ? 'mdi:chevron-up'
                          : 'mdi:chevron-down'
                      "
                    />
                  </div>
                </div>

                <!-- 充值记录展开区域 -->
                <div v-show="expandedDramaRanking.has(drama.drama)" class="dramas-detail">
                  <div class="dramas-list">
                    <div
                      v-for="(recharge, rechargeIndex) in getDramaRecharges(drama.drama)"
                      :key="recharge.device_id + rechargeIndex"
                      class="recharge-item"
                    >
                      <div class="recharge-info">
                        <div class="recharge-user">
                          {{ getRechargeDisplayName(recharge) }}
                        </div>
                        <div class="recharge-time">
                          {{ formatFullDateTime(recharge.order_create_time) }}
                        </div>
                      </div>
                      <div class="recharge-amount">
                        ¥{{ formatCentToYuan(recharge.pay_amount) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 抖音号排行紧凑布局 -->
        <div v-else-if="statisticsType === 'douyin'" class="douyin-ranking-container">
          <div v-if="orderLoading" class="flex justify-center items-center py-12">
            <n-spin size="large" />
          </div>

          <div v-else-if="douyinRankingData.length === 0" class="empty-state">
            <n-empty description="暂无抖音号排行数据" />
          </div>

          <div v-else class="ranking-list">
            <template v-for="(douyinNode, index) in douyinRankingData" :key="douyinNode.key">
              <!-- 抖音号组（包含主项目和展开的剧目） -->
              <div
                class="douyin-group"
                :class="{
                  expanded: expandedDramas.has(douyinNode.key),
                  [`rank-theme-${index + 1}`]: true,
                }"
              >
                <!-- 抖音号主项目 -->
                <div
                  class="ranking-item clickable"
                  :class="`rank-theme-${index + 1}`"
                  @click="toggleDramas(douyinNode.key)"
                >
                  <!-- 排名 -->
                  <div class="rank-section">
                    <span class="rank-badge" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
                  </div>

                  <!-- 抖音号信息 -->
                  <div class="douyin-info">
                    <div class="douyin-name">{{ douyinNode.douyinName }}</div>
                    <div class="douyin-stats">
                      <span class="stat-item">
                        <span class="stat-label">收入:</span>
                        <span class="stat-value amount"
                          >¥{{ douyinNode.totalAmount.toFixed(1) }}</span
                        >
                      </span>
                      <span class="stat-item">
                        <span class="stat-label">支付订单:</span>
                        <span class="stat-value">{{ douyinNode.paidOrderCount }}</span>
                      </span>
                      <span class="stat-item">
                        <span class="stat-label">剧目:</span>
                        <span class="stat-value">{{ douyinNode.dramaCount }}</span>
                      </span>
                    </div>
                  </div>

                  <!-- 剧目详情（可折叠） -->
                  <div class="dramas-toggle">
                    <Icon
                      :icon="
                        expandedDramas.has(douyinNode.key) ? 'mdi:chevron-up' : 'mdi:chevron-down'
                      "
                    />
                  </div>
                </div>

                <!-- 剧目详情展开区域 - 紧跟在对应的抖音号后面 -->
                <div v-show="expandedDramas.has(douyinNode.key)" class="dramas-detail">
                  <div class="dramas-list">
                    <div v-for="dramaNode in douyinNode.children" :key="dramaNode.key">
                      <div class="drama-item clickable" @click="toggleRecharges(dramaNode.key)">
                        <div class="drama-name">
                          {{ dramaNode.drama }}
                        </div>
                        <div class="drama-stats">
                          <span class="drama-amount">¥{{ dramaNode.totalAmount.toFixed(1) }}</span>
                          <span class="drama-orders">{{ dramaNode.paidOrderCount }}单</span>
                        </div>
                        <div class="drama-toggle">
                          <Icon
                            :icon="
                              expandedRecharges.has(dramaNode.key)
                                ? 'mdi:chevron-up'
                                : 'mdi:chevron-down'
                            "
                            class="w-4 h-4 text-gray-400 transition-transform duration-200"
                          />
                        </div>
                      </div>

                      <!-- 充值记录展开区域 -->
                      <div v-show="expandedRecharges.has(dramaNode.key)" class="recharge-records">
                        <div class="recharge-tags">
                          <div
                            v-for="orderNode in dramaNode.children"
                            :key="orderNode.key"
                            class="recharge-tag"
                          >
                            <span class="tag-amount"
                              >¥{{ (orderNode.orderRecord?.payAmount || 0).toFixed(1) }}</span
                            >
                            <span class="tag-time">{{
                              formatFullDateTime(orderNode.orderRecord?.payTime || '')
                            }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 分页器 -->
      <div
        v-if="statisticsType === 'orders'"
        class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mt-4"
      >
        <!-- 总数显示 -->
        <div class="text-sm text-gray-500">共 {{ displayOrderTotal }} 笔订单</div>

        <!-- 分页器 -->
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :page-count="paginationPageCount"
          :show-size-picker="!isMobile"
          :page-sizes="[10, 20, 50, 100]"
          :size="isMobile ? 'small' : 'medium'"
          :show-quick-jumper="false"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
          class="mobile-pagination"
        />
      </div>

      <!-- 短剧排行统计信息 -->
      <div
        v-else-if="statisticsType === 'drama'"
        class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mt-4"
      >
        <!-- 统计信息 -->
        <div class="text-sm text-gray-500">
          共 {{ dramaRankingData.length }} 个短剧， 总收入 ¥{{
            dramaRankingData.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(1)
          }}
        </div>
      </div>

      <!-- 抖音号排行统计信息 -->
      <div
        v-else
        class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mt-4"
      >
        <!-- 统计信息 -->
        <div class="text-sm text-gray-500">
          共 {{ douyinRankingData.length }} 个抖音号， 总收入 ¥{{
            douyinRankingData.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(1)
          }}
        </div>
      </div>
    </n-card>

    <!-- 列管理器 -->
    <ColumnManager
      v-if="statisticsType === 'orders'"
      v-model:show="showColumnManager"
      :columns="orderColumns as any"
      v-model:config="columnConfig"
      @apply="applyColumnConfig"
      @cancel="handleColumnCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, h } from 'vue'
import { Icon } from '@iconify/vue'
import { useMessage, type DataTableColumns, NTag, NTooltip } from 'naive-ui'
import { useCreatorStore } from '@/stores/creator'
import { useDataStore } from '@/stores/data'
import { useSettingsStore } from '@/stores/settings'
import { useAccountStore } from '@/stores/account'
import { getOrders } from '@/api'
import type { OrderItem, OrderParams } from '@/api/types'
import type { ExtendedError } from '@/api/http'
import {
  formatCentToYuan,
  dateToTimestamp,
  normalizeToDayStart,
  normalizeToDayEnd,
} from '@/utils/format'
import { parsePromotionName } from '@/utils/promotion'
import ColumnManager, { type ColumnConfig } from './ColumnManager.vue'

// 优化未支付订单：相同用户ID的未支付订单只保留最后一个
const optimizeUnpaidOrders = (orders: OrderItem[]): OrderItem[] => {
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
import DateRangePicker from './DateRangePicker.vue'
import { useGlobalDateRange } from '@/composables/useGlobalDateRange'

interface ParsedOrderItem extends OrderItem {
  parsedInfo?: {
    account: string
    drama: string
    creatorName: string
    douyinName: string
  } | null
}

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
const payStatus = ref<number>(-1)
const currentPage = ref(1)
const pageSize = ref(10)
const showColumnManager = ref(false)
const columnConfig = ref<ColumnConfig[]>([])
const selectedCollaborator = ref<string | null>(null)
// 默认使用达人模式（仅每日账号会用到此选项）
const dailyOrderMode = ref<'normal' | 'collaborator'>('collaborator')
const lastNormalPayStatus = ref<number | null>(null)

const COLLABORATOR_PAGE_SIZE = 10000

// 统计类型选择
const statisticsType = ref<'orders' | 'douyin' | 'drama'>('orders')

const isCollaboratorMode = computed(
  () =>
    accountStore.isDailyAccount &&
    statisticsType.value === 'orders' &&
    dailyOrderMode.value === 'collaborator'
)

// 短剧排行排序类型
const dramaSortType = ref<'amount' | 'orders' | 'rate'>('amount')

// 剧目详情展开状态
const expandedDramas = ref(new Set<string>())

// 充值记录展开状态
const expandedRecharges = ref(new Set<string>())

// 短剧排行展开状态
const expandedDramaRanking = ref(new Set<string>())

// 响应式检测
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

// 支付状态选项
const payStatusOptions = [
  { label: '全部支付', value: -1 },
  { label: '支付成功', value: 0 },
  { label: '未支付', value: 1 },
]

// 每日订单模式选项
const dailyOrderModeOptions = [
  { label: '普通模式', value: 'normal' },
  { label: '达人模式', value: 'collaborator' },
]

// 统计类型选项
const statisticsTypeOptions = computed(() => {
  if (accountStore.isDailyAccount) {
    return [{ label: '订单统计', value: 'orders' }]
  }
  return [
    { label: '订单统计', value: 'orders' },
    { label: '抖音号排行', value: 'douyin' },
    { label: '短剧排行', value: 'drama' },
  ]
})

const columnConfigStorageKey = computed(() =>
  accountStore.isDailyAccount
    ? 'orderStatistics_columnConfig_daily'
    : 'orderStatistics_columnConfig'
)

// 获取统计类型标题
function getStatisticsTypeTitle(type: string): string {
  switch (type) {
    case 'orders':
      return '订单统计'
    case 'douyin':
      return '抖音号排行'
    case 'drama':
      return '短剧排行'
    default:
      return '订单统计'
  }
}

// 获取统计类型图标
function getStatisticsTypeIcon(type: string): string {
  switch (type) {
    case 'orders':
      return 'mdi:shopping'
    case 'douyin':
      return 'mdi:account-group'
    case 'drama':
      return 'mdi:theater'
    default:
      return 'mdi:shopping'
  }
}

// 短剧排行排序选项
const dramaSortOptions = [
  { label: '按充值金额', value: 'amount' },
  { label: '按充值订单', value: 'orders' },
  { label: '按充值率', value: 'rate' },
]

const DEFAULT_SANROU_CREATOR_ID = '1842865091654731'
const sanrouDistributorId = computed(
  () => settingsStore.settings.sanrouDistributorId || DEFAULT_SANROU_CREATOR_ID
)

// 计算属性
const orderData = computed(() => dataStore.orderData)
const orderLoading = computed(() => dataStore.orderLoading)
const orderError = computed(() => dataStore.orderError)

const tableData = computed(() => {
  if (!orderData.value?.data) return []

  // 解析 promotion_name 并添加解析结果
  return orderData.value.data.map((item: OrderItem) => {
    const parsedInfo = parsePromotionName(item.promotion_name, creatorStore.activeCreatorName)

    return {
      ...item,
      parsedInfo,
    } as ParsedOrderItem
  })
})

function extractPromotionCreator(promotionName?: string) {
  if (!promotionName) return ''
  const index = promotionName.indexOf('-')
  const creatorName = index >= 0 ? promotionName.slice(0, index) : promotionName
  return creatorName.trim()
}

function extractCollaboratorName(promotionName?: string) {
  const creatorName = extractPromotionCreator(promotionName)
  if (!creatorName) return ''
  return creatorName.slice(0, 2)
}

// 达人详细信息（包含名称和金额）
const collaboratorDetailsOptions = computed(() => {
  if (!isCollaboratorMode.value) return []

  // 统计每个达人的已支付金额
  const collaboratorAmounts = new Map<string, number>()

  tableData.value.forEach(item => {
    if (item.pay_status !== 0) return // 只统计已支付订单

    const collaboratorName = extractCollaboratorName(item.promotion_name)
    if (collaboratorName) {
      const currentAmount = collaboratorAmounts.get(collaboratorName) || 0
      collaboratorAmounts.set(collaboratorName, currentAmount + (item.pay_amount || 0))
    }
  })

  // 调试日志：查看所有达人及其金额
  console.log('📊 所有达人统计:', Array.from(collaboratorAmounts.entries()))

  // 按照已支付金额降序排序，返回包含名称和金额的对象
  return Array.from(collaboratorAmounts.entries())
    .sort((a, b) => b[1] - a[1]) // 降序：金额大的在前
    .map(([name, amount]) => ({
      name,
      amount: formatCentToYuan(amount),
      rawAmount: amount,
    }))
})

// 达人名称列表（仅用于向后兼容）
const collaboratorOptions = computed(() => {
  return collaboratorDetailsOptions.value.map(item => item.name)
})

const filteredTableData = computed(() => {
  if (isCollaboratorMode.value) {
    if (!selectedCollaborator.value) return []
    return tableData.value.filter(
      item =>
        item.pay_status === 0 &&
        extractCollaboratorName(item.promotion_name) === selectedCollaborator.value
    )
  }
  return tableData.value
})

const paginatedTableData = computed(() => {
  // 达人过滤或合作者模式：使用前端分页
  if (isCollaboratorMode.value || false) {
    const startIndex = (currentPage.value - 1) * pageSize.value
    return filteredTableData.value.slice(startIndex, startIndex + pageSize.value)
  }
  // 其他情况：直接显示所有数据（后端已分页）
  return filteredTableData.value
})

const paginationTotal = computed(() => {
  // 达人过滤或合作者模式：使用前端数据的总数
  if (isCollaboratorMode.value || false) {
    return filteredTableData.value.length
  }
  // 其他情况：使用后端返回的 total
  return orderData.value?.total || 0
})

const paginationPageCount = computed(() => {
  if (!pageSize.value) return 0
  return Math.ceil(paginationTotal.value / pageSize.value)
})

const displayOrderTotal = computed(() => paginationTotal.value)

// 充值卡片标题（管理员显示达人名，达人视图省略达人名）
const rechargeCardTitle = computed(() => {
  return `${dateRangeTitle.value}总充值`
})

// 快捷日期标签（从 DateRangePicker 组件传递过来）
const presetLabel = ref<string | null>(null)

// 格式化日期为 YYYY-MM-DD
function formatDateToYMD(date: number | Date | string): string {
  const d =
    typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 判断两个日期是否是同一天
function isSameDay(date1: number | Date | string, date2: number | Date | string): boolean {
  const d1 =
    typeof date1 === 'string'
      ? new Date(date1)
      : typeof date1 === 'number'
        ? new Date(date1)
        : date1
  const d2 =
    typeof date2 === 'string'
      ? new Date(date2)
      : typeof date2 === 'number'
        ? new Date(date2)
        : date2
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

// 动态生成日期范围标题
const dateRangeTitle = computed(() => {
  // 优先使用快捷日期标签（如"今日"、"至今"等）
  if (presetLabel.value) {
    return presetLabel.value
  }

  // 自定义日期：显示具体日期范围
  if (!dateRange.value || dateRange.value.length !== 2) {
    return '当前日期范围'
  }

  const [start, end] = dateRange.value
  const startStr = formatDateToYMD(start)
  const endStr = formatDateToYMD(end)

  // 判断是否是同一天
  if (isSameDay(start, end)) {
    return startStr
  }

  // 不同日期
  return `${startStr} 到 ${endStr}`
})

// 处理快捷日期标签变化
function handlePresetLabelChange(label: string | null) {
  presetLabel.value = label
}

// 达人总充值金额（从后端返回的数据中读取）
const totalRechargeAmount = computed(() => {
  // 后端返回的 total_amount 字段（单位：分）
  const totalAmount = orderData.value?.total_amount || 0
  // 转换为元
  return totalAmount / 100
})

function selectCollaborator(collaborator: string) {
  if (selectedCollaborator.value === collaborator) return
  selectedCollaborator.value = collaborator
  currentPage.value = 1
}

// 树形数据结构类型
interface DouyinTreeNode {
  key: string
  type: 'douyin' | 'drama' | 'order'
  douyinName?: string
  drama?: string
  totalAmount: number
  orderCount: number
  paidOrderCount: number
  lastPayTime: string
  dramaCount?: number
  children?: DouyinTreeNode[]
  // 订单记录（仅用于order类型）
  orderRecord?: {
    deviceId: string
    payAmount: number
    payTime: string
    payWay: string
  }
}

// 抖音号排行树形数据
const douyinRankingData = computed(() => {
  if (!orderData.value?.data) return []

  // 按抖音号聚合数据
  const douyinStats = new Map<
    string,
    {
      douyinName: string
      totalAmount: number
      orderCount: number
      paidOrderCount: number
      lastPayTime: string
      dramas: Map<
        string,
        {
          drama: string
          totalAmount: number
          orderCount: number
          paidOrderCount: number
          lastPayTime: string
          orders: Array<{
            deviceId: string
            payAmount: number
            payTime: string
            payWay: string
          }>
        }
      >
    }
  >()

  // 优化未支付订单：相同用户ID的未支付订单只保留最后一个
  const optimizedOrders = optimizeUnpaidOrders(orderData.value.data)

  optimizedOrders.forEach((order: OrderItem) => {
    const parsedInfo = parsePromotionName(order.promotion_name, creatorStore.activeCreatorName)
    if (!parsedInfo?.douyinName) return

    const douyinName = parsedInfo.douyinName
    const drama = parsedInfo.drama

    if (!douyinStats.has(douyinName)) {
      douyinStats.set(douyinName, {
        douyinName,
        totalAmount: 0,
        orderCount: 0,
        paidOrderCount: 0,
        lastPayTime: '',
        dramas: new Map(),
      })
    }

    const stats = douyinStats.get(douyinName)!
    // 只统计去重后的订单（已支付订单 + 每个用户最新的未支付订单）
    stats.orderCount += 1

    // 初始化剧目数据
    if (!stats.dramas.has(drama)) {
      stats.dramas.set(drama, {
        drama,
        totalAmount: 0,
        orderCount: 0,
        paidOrderCount: 0,
        lastPayTime: '',
        orders: [],
      })
    }

    const dramaStats = stats.dramas.get(drama)!
    // 只统计去重后的订单（已支付订单 + 每个用户最新的未支付订单）
    dramaStats.orderCount += 1

    // 只统计已支付的订单
    if (order.pay_status === 0) {
      const amount = Number(formatCentToYuan(order.pay_amount))
      stats.totalAmount += amount
      stats.paidOrderCount += 1
      dramaStats.totalAmount += amount
      dramaStats.paidOrderCount += 1

      // 添加订单记录
      dramaStats.orders.push({
        deviceId: order.device_id,
        payAmount: amount,
        payTime: order.order_paid_time,
        payWay: order.pay_way,
      })

      // 更新最后支付时间（取最新的）
      if (
        order.order_paid_time &&
        (!stats.lastPayTime || order.order_paid_time > stats.lastPayTime)
      ) {
        stats.lastPayTime = order.order_paid_time
      }
      if (
        order.order_paid_time &&
        (!dramaStats.lastPayTime || order.order_paid_time > dramaStats.lastPayTime)
      ) {
        dramaStats.lastPayTime = order.order_paid_time
      }
    }
  })

  // 构建树形结构
  const treeData: DouyinTreeNode[] = []

  Array.from(douyinStats.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .forEach(douyinStats => {
      // 抖音号节点
      const douyinNode: DouyinTreeNode = {
        key: `douyin-${douyinStats.douyinName}`,
        type: 'douyin',
        douyinName: douyinStats.douyinName,
        totalAmount: douyinStats.totalAmount,
        orderCount: douyinStats.orderCount,
        paidOrderCount: douyinStats.paidOrderCount,
        lastPayTime: douyinStats.lastPayTime,
        dramaCount: douyinStats.dramas.size,
        children: [],
      }

      // 按订单数排序剧目（相同则按充值金额排序）
      const sortedDramas = Array.from(douyinStats.dramas.values()).sort((a, b) => {
        if (a.paidOrderCount !== b.paidOrderCount) {
          return b.paidOrderCount - a.paidOrderCount
        }
        return b.totalAmount - a.totalAmount
      })

      sortedDramas.forEach(dramaStats => {
        // 剧目节点
        const dramaNode: DouyinTreeNode = {
          key: `drama-${douyinStats.douyinName}-${dramaStats.drama}`,
          type: 'drama',
          douyinName: douyinStats.douyinName,
          drama: dramaStats.drama,
          totalAmount: dramaStats.totalAmount,
          orderCount: dramaStats.orderCount,
          paidOrderCount: dramaStats.paidOrderCount,
          lastPayTime: dramaStats.lastPayTime,
          children: [],
        }

        // 订单记录节点
        dramaStats.orders
          .sort((a, b) => new Date(b.payTime).getTime() - new Date(a.payTime).getTime())
          .forEach((order, index) => {
            const orderNode: DouyinTreeNode = {
              key: `order-${douyinStats.douyinName}-${dramaStats.drama}-${index}`,
              type: 'order',
              douyinName: douyinStats.douyinName,
              drama: dramaStats.drama,
              totalAmount: order.payAmount,
              orderCount: 1,
              paidOrderCount: 1,
              lastPayTime: order.payTime,
              orderRecord: order,
            }
            dramaNode.children!.push(orderNode)
          })

        douyinNode.children!.push(dramaNode)
      })

      treeData.push(douyinNode)
    })

  return treeData
})

// 短剧排行数据
const dramaRankingData = computed(() => {
  if (!orderData.value?.data) return []

  // 按短剧聚合数据
  const dramaStats = new Map<
    string,
    {
      drama: string
      totalAmount: number
      totalOrders: number
      paidOrderCount: number
      rechargeRate: number
      avgOrderAmount: number
    }
  >()

  // 优化未支付订单：相同用户ID的未支付订单只保留最后一个
  const optimizedOrders = optimizeUnpaidOrders(orderData.value.data)

  optimizedOrders.forEach((order: OrderItem) => {
    // 直接解析 promotion_name，不依赖创作者名称验证
    if (!order.promotion_name) return

    let drama: string
    try {
      const parts = order.promotion_name.split('-')
      if (parts.length < 5) return

      // 检查 parts[4] 是否为推广名称（如"小龙"）
      let dramaIndex = 4
      const promotionNamesToSkip = ['小龙']
      if (promotionNamesToSkip.includes(parts[4])) {
        // 如果是推广名称，则剧名在下一个位置
        dramaIndex = 5
      }

      drama = parts[dramaIndex]
      if (!drama) return
    } catch {
      return
    }

    if (!dramaStats.has(drama)) {
      dramaStats.set(drama, {
        drama,
        totalAmount: 0,
        totalOrders: 0,
        paidOrderCount: 0,
        rechargeRate: 0,
        avgOrderAmount: 0,
      })
    }

    const stats = dramaStats.get(drama)!
    // 只统计去重后的订单（已支付订单 + 每个用户最新的未支付订单）
    stats.totalOrders += 1

    // 只统计已支付的订单
    if (order.pay_status === 0) {
      const amount = Number(formatCentToYuan(order.pay_amount))
      stats.totalAmount += amount
      stats.paidOrderCount += 1
    }
  })

  // 计算充值率和平均订单金额
  Array.from(dramaStats.values()).forEach(stats => {
    stats.rechargeRate =
      stats.totalOrders > 0 ? (stats.paidOrderCount / stats.totalOrders) * 100 : 0
    stats.avgOrderAmount = stats.paidOrderCount > 0 ? stats.totalAmount / stats.paidOrderCount : 0
  })

  // 根据排序类型排序
  const sortedDramas = Array.from(dramaStats.values()).sort((a, b) => {
    switch (dramaSortType.value) {
      case 'amount':
        return b.totalAmount - a.totalAmount
      case 'orders':
        return b.paidOrderCount - a.paidOrderCount
      case 'rate':
        return b.rechargeRate - a.rechargeRate
      default:
        return b.totalAmount - a.totalAmount
    }
  })

  return sortedDramas
})

type OrderColumn = DataTableColumns<ParsedOrderItem>[number]

const orderColumnMap: Record<string, OrderColumn> = {
  order_create_time: {
    title: '创建时间',
    key: 'order_create_time',
    width: 180,
    align: 'center',
    resizable: true,
    render: row => h('span', { class: 'text-sm text-gray-600' }, row.order_create_time || '-'),
  },
  order_paid_time: {
    title: '支付时间',
    key: 'order_paid_time',
    width: 180,
    align: 'center',
    resizable: true,
    render: row => h('span', { class: 'text-sm text-gray-600' }, row.order_paid_time || '-'),
  },
  promotion_name: {
    title: '推广链来源',
    key: 'promotion_name',
    width: 200,
    resizable: true,
    render: row =>
      h(
        NTooltip,
        {
          trigger: 'hover',
          placement: 'top',
        },
        {
          trigger: () =>
            h(
              'div',
              {
                class: 'truncate text-sm text-gray-700 cursor-help',
              },
              row.promotion_name
            ),
          default: () => row.promotion_name,
        }
      ),
  },
  pay_amount: {
    title: '支付金额',
    key: 'pay_amount',
    width: 120,
    align: 'right',
    resizable: true,
    render: row =>
      h(
        'span',
        {
          class: 'font-semibold text-emerald-600',
        },
        `¥${formatCentToYuan(row.pay_amount)}`
      ),
  },
  pay_status: {
    title: '支付状态',
    key: 'pay_status',
    width: 100,
    align: 'center',
    resizable: true,
    render: row =>
      h(
        NTag,
        {
          type: row.pay_status === 0 ? 'success' : 'default',
          size: 'small',
          round: true,
        },
        {
          default: () => (row.pay_status === 0 ? '支付成功' : '未支付'),
        }
      ),
  },
  pay_way: {
    title: '支付方式',
    key: 'pay_way',
    width: 120,
    align: 'center',
    resizable: true,
    render: row => h('span', { class: 'text-sm text-gray-700' }, row.pay_way || '-'),
  },
  device_id: {
    title: '用户ID',
    key: 'device_id',
    width: 150,
    align: 'center',
    resizable: true,
    render: row =>
      h(
        'span',
        { class: 'font-mono text-sm text-gray-700' },
        row.device_id ? row.device_id.slice(-4) : '-'
      ),
  },
  drama: {
    title: '剧名',
    key: 'drama',
    width: 200,
    align: 'center',
    resizable: true,
    render: row => {
      if (row.parsedInfo?.drama) {
        return h('span', { class: 'text-gray-900 font-medium' }, row.parsedInfo!.drama)
      }
      return h('span', { class: 'text-gray-400 text-sm' }, '-')
    },
  },
  douyinName: {
    title: '抖音号',
    key: 'douyinName',
    width: 150,
    align: 'center',
    resizable: true,
    render: row => {
      if (row.parsedInfo?.douyinName) {
        return h('span', { class: 'text-blue-600 font-medium' }, row.parsedInfo!.douyinName)
      }
      return h('span', { class: 'text-gray-400 text-sm' }, '-')
    },
  },
}

const sanrouOrderColumns: DataTableColumns<ParsedOrderItem> = [
  orderColumnMap.order_create_time,
  orderColumnMap.order_paid_time,
  orderColumnMap.device_id,
  orderColumnMap.drama,
  orderColumnMap.douyinName,
  orderColumnMap.pay_amount,
  orderColumnMap.pay_status,
  orderColumnMap.pay_way,
  orderColumnMap.promotion_name,
]

const dailyOrderColumns: DataTableColumns<ParsedOrderItem> = [
  orderColumnMap.order_create_time,
  orderColumnMap.order_paid_time,
  orderColumnMap.promotion_name,
  orderColumnMap.pay_amount,
  orderColumnMap.pay_status,
  orderColumnMap.pay_way,
  orderColumnMap.device_id,
]

const orderColumns = computed(() =>
  accountStore.isDailyAccount ? dailyOrderColumns : sanrouOrderColumns
)

// 抖音号排行表格列配置
const douyinRankingColumns: DataTableColumns<DouyinTreeNode> = [
  {
    title: '排名/类型',
    key: 'rank',
    width: 120,
    align: 'center',
    render: (row, index) => {
      if (row.type === 'douyin') {
        const rank = index + 1
        let rankClass = 'text-gray-600'
        if (rank === 1) rankClass = 'text-yellow-500 font-bold'
        else if (rank === 2) rankClass = 'text-gray-400 font-bold'
        else if (rank === 3) rankClass = 'text-orange-500 font-bold'

        return h('span', { class: `text-lg ${rankClass}` }, `#${rank}`)
      } else if (row.type === 'drama') {
        return h('span', { class: 'text-sm text-purple-600 ml-4' }, '📺')
      } else if (row.type === 'order') {
        return h('span', { class: 'text-sm text-blue-600 ml-8' }, '💰')
      }
      return h('span', { class: 'text-gray-400' }, '-')
    },
  },
  {
    title: '抖音号/剧目/订单',
    key: 'name',
    width: 250,
    align: 'left',
    render: row => {
      if (row.type === 'douyin') {
        return h('span', { class: 'font-medium text-blue-600' }, row.douyinName || '-')
      } else if (row.type === 'drama') {
        return h('span', { class: 'text-sm text-purple-600 ml-4' }, row.drama || '-')
      } else if (row.type === 'order') {
        return h(
          'span',
          { class: 'text-sm text-gray-600 ml-8' },
          `用户: ${row.orderRecord?.deviceId?.slice(-4) || '-'}`
        )
      }
      return h('span', { class: 'text-gray-400' }, '-')
    },
  },
  {
    title: '充值金额',
    key: 'totalAmount',
    width: 120,
    align: 'center',
    render: row => {
      if (row.type === 'order' && row.orderRecord) {
        return h(
          'span',
          { class: 'font-bold text-green-600' },
          `¥${row.orderRecord.payAmount.toFixed(1)}`
        )
      } else {
        return h('span', { class: 'font-bold text-green-600' }, `¥${row.totalAmount.toFixed(1)}`)
      }
    },
  },
  {
    title: '订单数',
    key: 'orderCount',
    width: 100,
    align: 'center',
    render: row => {
      if (row.type === 'order') {
        return h('span', { class: 'text-gray-400' }, '-')
      }
      return h('span', { class: 'text-blue-600 font-medium' }, row.paidOrderCount)
    },
  },
  {
    title: '剧目数',
    key: 'dramaCount',
    width: 100,
    align: 'center',
    render: row => {
      if (row.type === 'douyin') {
        return h('span', { class: 'text-purple-600 font-medium' }, row.dramaCount || 0)
      }
      return h('span', { class: 'text-gray-400' }, '-')
    },
  },
  {
    title: '支付时间',
    key: 'lastPayTime',
    width: 180,
    align: 'center',
    render: row => {
      if (row.type === 'order' && row.orderRecord) {
        return h('span', { class: 'text-sm text-gray-600' }, row.orderRecord.payTime || '-')
      } else {
        return h('span', { class: 'text-sm text-gray-600' }, row.lastPayTime || '-')
      }
    },
  },
  {
    title: '支付方式',
    key: 'payWay',
    width: 120,
    align: 'center',
    render: row => {
      if (row.type === 'order' && row.orderRecord) {
        return h('span', { class: 'text-sm text-gray-600' }, row.orderRecord.payWay || '-')
      }
      return h('span', { class: 'text-gray-400' }, '-')
    },
  },
]

// 显示的列配置（基于用户设置和统计类型）
const displayColumns = computed(() => {
  // 根据统计类型选择不同的列配置
  if (statisticsType.value === 'douyin') {
    return douyinRankingColumns
  }

  // 订单统计模式
  if (columnConfig.value.length === 0) {
    return orderColumns.value
  }

  // 按照columnConfig的顺序重新排列列，并过滤掉不可见的列
  const orderedColumns: DataTableColumns<ParsedOrderItem> = []

  columnConfig.value.forEach(config => {
    if (config.visible) {
      const originalColumn = orderColumns.value.find(col => 'key' in col && col.key === config.key)
      if (originalColumn) {
        orderedColumns.push(originalColumn)
      }
    }
  })

  return orderedColumns
})

// 初始化日期范围 - 现在由全局日期范围管理自动处理

// 获取订单数据
async function fetchOrderData() {
  // 散柔账号需要选择达人，牵龙使用固定配置
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
    dataStore.setOrderLoading(true)
    dataStore.setOrderError('')

    const [startDate, endDate] = dateRange.value

    // 验证日期是否有效
    if (!startDate || !endDate) {
      console.error('订单统计获取失败: 无效的日期范围', { startDate, endDate })
      const errorMsg = '日期范围无效，请重新选择'
      dataStore.setOrderError(errorMsg)
      message.error(errorMsg)
      return
    }

    const startDateObj = normalizeToDayStart(new Date(startDate))
    const endDateObj = normalizeToDayEnd(new Date(endDate))

    const beginTime = dateToTimestamp(startDateObj)
    const endTime_ts = dateToTimestamp(endDateObj)

    const collaboratorMode = isCollaboratorMode.value

    if (collaboratorMode && payStatus.value !== 0) {
      payStatus.value = 0
    }

    // 根据统计类型设置页面大小
    // 达人过滤模式已禁用
    const isDarenFilter = false

    const actualPageSize = collaboratorMode
      ? COLLABORATOR_PAGE_SIZE
      : isDarenFilter
        ? 1000 // 达人过滤：后端每次拉取1000条
        : statisticsType.value === 'douyin' || statisticsType.value === 'drama'
          ? 10000
          : pageSize.value

    const params: OrderParams = {
      begin_time: beginTime,
      end_time: endTime_ts,
      page_index: collaboratorMode || isDarenFilter ? 0 : currentPage.value - 1, // API使用0基索引
      page_size: actualPageSize,
    }

    // 如果选择了支付状态，添加到参数中
    if (collaboratorMode) {
      params.pay_status = 0
    } else if (statisticsType.value === 'douyin' || statisticsType.value === 'drama') {
      // 抖音号排行和短剧排行只查看支付成功的订单
      params.pay_status = 0
    } else if (payStatus.value !== -1) {
      params.pay_status = payStatus.value
    }

    console.log('🔍 查看全部数据，不过滤')

    const data = await getOrders(params)
    // API数据获取成功
    dataStore.setOrderData(data)

    if (collaboratorMode && data.total > actualPageSize) {
      message.warning(`订单数为${data.total}条，只能展示前1w条。`)
    }
  } catch (error: unknown) {
    const errorMsg = (error as Error)?.message || '获取订单统计失败'
    dataStore.setOrderError(errorMsg)
    // 只有在拦截器未处理时才显示错误消息
    if (!(error as ExtendedError)?.handledByInterceptor) {
      message.error(errorMsg)
    }
  } finally {
    dataStore.setOrderLoading(false)
  }
}

// 事件处理
function handleDateChange() {
  currentPage.value = 1
}

function handleStatusChange() {
  if (isCollaboratorMode.value) return
  currentPage.value = 1
  fetchOrderData()
}

function handleDailyModeChange(mode: 'normal' | 'collaborator') {
  currentPage.value = 1
  if (mode === 'collaborator') {
    lastNormalPayStatus.value = payStatus.value
    payStatus.value = 0
    selectedCollaborator.value = null
  } else {
    payStatus.value = lastNormalPayStatus.value ?? -1
    lastNormalPayStatus.value = null
    selectedCollaborator.value = null
  }
  fetchOrderData()
}

// 处理统计类型切换
async function handleStatisticsTypeChange() {
  // 切换统计类型时重新获取数据，fetchOrderData会根据统计类型自动设置正确的页面大小
  currentPage.value = 1
  await fetchOrderData()
}

function handlePageChange() {
  // 达人过滤已禁用
  const isDarenFilter = false
  if (isCollaboratorMode.value || isDarenFilter) return
  fetchOrderData()
}

function handlePageSizeChange() {
  currentPage.value = 1
  // 达人过滤已禁用
  const isDarenFilter = false
  if (isCollaboratorMode.value || isDarenFilter) return
  fetchOrderData()
}

// 处理短剧排行排序变化
function handleDramaSortChange() {
  // 短剧排行排序变化时不需要重新获取数据，只需要重新计算排序
  // 由于使用了computed，排序变化会自动触发重新计算
}

// 格式化完整日期时间
function formatFullDateTime(timeStr: string): string {
  if (!timeStr) return '--'
  const date = new Date(timeStr)
  if (isNaN(date.getTime())) return '--'

  return date
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(/\//g, '-')
}

// 切换剧目详情展开状态
function toggleDramas(douyinKey: string) {
  if (expandedDramas.value.has(douyinKey)) {
    expandedDramas.value.delete(douyinKey)
  } else {
    expandedDramas.value.add(douyinKey)
  }
}

// 切换充值记录展开状态
function toggleRecharges(dramaKey: string) {
  if (expandedRecharges.value.has(dramaKey)) {
    expandedRecharges.value.delete(dramaKey)
  } else {
    expandedRecharges.value.add(dramaKey)
  }
}

// 切换短剧排行展开状态
function toggleDramaRanking(dramaName: string) {
  if (expandedDramaRanking.value.has(dramaName)) {
    expandedDramaRanking.value.delete(dramaName)
  } else {
    expandedDramaRanking.value.add(dramaName)
  }
}

// 获取特定短剧的充值记录
function getDramaRecharges(dramaName: string) {
  if (!orderData.value?.data) return []

  // 优化未支付订单：相同用户ID的未支付订单只保留最后一个
  const optimizedOrders = optimizeUnpaidOrders(orderData.value.data)

  const filteredOrders = optimizedOrders.filter(order => {
    // 直接解析 promotion_name，不依赖创作者名称验证
    if (!order.promotion_name) return false

    try {
      const parts = order.promotion_name.split('-')
      if (parts.length < 5) return false

      // 检查 parts[4] 是否为推广名称（如"小龙"）
      let dramaIndex = 4
      const promotionNamesToSkip = ['小龙']
      if (promotionNamesToSkip.includes(parts[4])) {
        // 如果是推广名称，则剧名在下一个位置
        dramaIndex = 5
      }

      // 剧名
      const drama = parts[dramaIndex]
      return drama === dramaName
    } catch {
      return false
    }
  })

  // 按时间排序：已支付订单按支付时间排序，未支付订单按创建时间排序
  return filteredOrders.sort((a, b) => {
    let timeA: number
    let timeB: number

    if (a.pay_status === 0) {
      // 已支付订单按支付时间排序
      timeA = new Date(a.order_paid_time).getTime()
      timeB = new Date(b.order_paid_time).getTime()
    } else {
      // 未支付订单按创建时间排序
      timeA = new Date(a.order_create_time).getTime()
      timeB = new Date(b.order_create_time).getTime()
    }

    // 降序排序（最新的在前）
    return timeB - timeA
  })
}

// 获取充值记录显示名称：抖音号-账户
function getRechargeDisplayName(recharge: OrderItem): string {
  if (!recharge.promotion_name) {
    return recharge.device_id || '未知用户'
  }

  try {
    const parts = recharge.promotion_name.split('-')
    if (parts.length < 5) {
      return recharge.device_id || '未知用户'
    }

    // 账户：第一个连字符之前
    const account = parts[0]

    // 检查 parts[4] 是否为推广名称（如"小龙"）
    let dramaIndex = 4
    const promotionNamesToSkip = ['小龙']
    if (promotionNamesToSkip.includes(parts[4])) {
      // 如果是推广名称，则剧名在下一个位置
      dramaIndex = 5
    }

    // 抖音号：达人名称后面剩余的所有字符（保留中间的 -）
    const douyinParts = parts.slice(dramaIndex + 2)
    const douyinName = douyinParts.join('-')

    if (douyinName && account) {
      return `${douyinName}-${account}`
    } else if (douyinName) {
      return douyinName
    } else if (account) {
      return account
    } else {
      return recharge.device_id || '未知用户'
    }
  } catch {
    return recharge.device_id || '未知用户'
  }
}

// 应用列配置
function applyColumnConfig(config: ColumnConfig[]) {
  columnConfig.value = [...config]
  // 保存到本地存储
  localStorage.setItem(columnConfigStorageKey.value, JSON.stringify(config))
}

// 处理列配置取消
function handleColumnCancel() {
  // 取消时不需要额外处理，因为ColumnManager会自动还原配置
  // 列配置已取消
}

// 初始化列配置
function initColumnConfig() {
  try {
    const saved = localStorage.getItem(columnConfigStorageKey.value)
    if (saved) {
      const parsedConfig = JSON.parse(saved) as ColumnConfig[]
      const currentKeys = orderColumns.value
        .filter(col => 'key' in col)
        .map(col => (col as { key: string }).key)
      const savedKeys = parsedConfig.map(config => config.key)
      if (
        currentKeys.length === savedKeys.length &&
        currentKeys.every(key => savedKeys.includes(key))
      ) {
        columnConfig.value = parsedConfig
        return
      }
      localStorage.removeItem(columnConfigStorageKey.value)
    }
  } catch (error) {
    console.warn('Failed to load column config:', error)
  }
  columnConfig.value = []
}

watch(
  collaboratorOptions,
  options => {
    if (!isCollaboratorMode.value) return
    if (!options.length) {
      selectedCollaborator.value = null
      return
    }

    // 优先选择"小鱼"，如果不存在则选择第一个
    const xiaohong = options.find(name => name === '小鱼')
    const targetCollaborator = xiaohong || options[0]

    // 如果当前没有选择，或者当前选择不在列表中，或者"小鱼"出现了但未被选中，则重新选择
    if (
      !selectedCollaborator.value ||
      !options.includes(selectedCollaborator.value) ||
      (xiaohong && selectedCollaborator.value !== xiaohong)
    ) {
      console.log('🎯 达人选择逻辑:', {
        options,
        currentSelected: selectedCollaborator.value,
        foundXiaohong: xiaohong,
        willSelect: targetCollaborator,
      })
      selectedCollaborator.value = targetCollaborator
    }
  },
  { immediate: true }
)

watch(
  () => selectedCollaborator.value,
  () => {
    if (isCollaboratorMode.value) {
      currentPage.value = 1
    }
  }
)

watch(
  () => filteredTableData.value.length,
  total => {
    if (!isCollaboratorMode.value) return
    const pageCount = pageSize.value ? Math.ceil(total / pageSize.value) : 0
    if (pageCount > 0 && currentPage.value > pageCount) {
      currentPage.value = 1
    }
  }
)

// 监听活跃达人变化
watch(
  () => creatorStore.activeCreatorId,
  newId => {
    if ((accountStore.isSanrouLikeAccount || accountStore.isQianlongAccount) && newId) {
      currentPage.value = 1
      fetchOrderData()
    }
  }
)

// 监听账号切换
watch(
  () => accountStore.currentAccount,
  () => {
    // 切换到非每日账号时，重置为普通模式
    if (!accountStore.isDailyAccount) {
      if (dailyOrderMode.value === 'collaborator') {
        dailyOrderMode.value = 'normal'
        payStatus.value = lastNormalPayStatus.value ?? -1
        lastNormalPayStatus.value = null
        selectedCollaborator.value = null
      }
    }
    // 切换到每日账号时，确保是订单统计，并设置为达人模式
    if (accountStore.isDailyAccount) {
      if (statisticsType.value !== 'orders') {
        statisticsType.value = 'orders'
      }
      // 设置为达人模式（默认）
      if (dailyOrderMode.value !== 'collaborator') {
        dailyOrderMode.value = 'collaborator'
        payStatus.value = 0 // 达人模式只看已支付
        selectedCollaborator.value = null
      }
    }
    initColumnConfig()
    if (accountStore.isSanrouLikeAccount || accountStore.isQianlongAccount) {
      currentPage.value = 1
      fetchOrderData()
    } else {
      dataStore.clearOrderData()
    }
  }
)

// 监听日期范围变化，确保账号切换后日期初始化也能触发查询
watch(
  () => dateRange.value,
  newRange => {
    if (!newRange) return
    if (accountStore.isSanrouLikeAccount || accountStore.isQianlongAccount) {
      currentPage.value = 1
      fetchOrderData()
    }
  }
)

// 监听统计类型变化，自动设置支付状态
watch(
  () => statisticsType.value,
  newType => {
    if (newType === 'douyin' || newType === 'drama') {
      // 抖音号排行和短剧排行自动锁定为支付成功
      payStatus.value = 0
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
      fetchOrderData()
    }
  }
)

// 监听默认查询天数变化 - 现在由全局日期范围管理自动处理

onMounted(() => {
  pageSize.value = settingsStore.settings.pageSize
  initColumnConfig()
  // 设置默认支付状态：达人模式只看已支付，普通模式看全部
  if (accountStore.isDailyAccount && dailyOrderMode.value === 'collaborator') {
    payStatus.value = 0
  } else {
    payStatus.value = -1
  }

  // 初始化响应式检测
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 只有散柔类账号和牵龙账号才加载订单数据
  if (accountStore.isSanrouLikeAccount || accountStore.isQianlongAccount) {
    // 达人功能已禁用，直接获取数据
    fetchOrderData()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.order-statistics {
  @apply space-y-6;
}

.statistics-card {
  @apply shadow-sm border border-gray-200/60 rounded-2xl overflow-hidden backdrop-blur-sm;
  background: rgba(255, 255, 255, 0.8);
}

:deep(.statistics-card .n-card-header) {
  @apply border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-purple-50/80 px-6 py-4;
}

:deep(.statistics-card .n-card__content) {
  @apply p-6;
}

:deep(.statistics-table .n-data-table-thead) {
  @apply bg-gradient-to-r from-gray-50 to-purple-50;
}

:deep(.statistics-table .n-data-table-th) {
  @apply text-gray-700 font-semibold border-b border-gray-200;
}

:deep(.statistics-table .n-data-table-td) {
  @apply text-gray-900 border-b border-gray-100;
}

:deep(.statistics-table .n-data-table-tr:hover .n-data-table-td) {
  @apply bg-purple-50/50;
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

/* 抖音号排行紧凑布局样式 */
.douyin-ranking-container {
  @apply space-y-4;
}

.ranking-list {
  @apply space-y-4;
}

/* 抖音号组容器 */
.douyin-group {
  @apply relative;
  border-radius: 16px;
  transition: all 0.3s ease;
}

.douyin-group.expanded {
  @apply shadow-lg;
  border: 2px solid rgba(139, 92, 246, 0.2);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.5) 0%, rgba(255, 255, 255, 0.8) 100%);
}

/* 抖音号组主题边框和阴影 */
.rank-theme-1.douyin-group.expanded {
  border-color: rgba(245, 158, 11, 0.3);
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.5) 0%, rgba(254, 243, 199, 0.8) 100%);
  box-shadow: 0 10px 25px rgba(245, 158, 11, 0.15);
}

.rank-theme-2.douyin-group.expanded {
  border-color: rgba(107, 114, 128, 0.3);
  background: linear-gradient(135deg, rgba(249, 250, 251, 0.5) 0%, rgba(243, 244, 246, 0.8) 100%);
  box-shadow: 0 10px 25px rgba(107, 114, 128, 0.15);
}

.rank-theme-3.douyin-group.expanded {
  border-color: rgba(205, 124, 47, 0.3);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.5) 0%, rgba(254, 215, 170, 0.8) 100%);
  box-shadow: 0 10px 25px rgba(205, 124, 47, 0.15);
}

.rank-theme-4.douyin-group.expanded,
.rank-theme-5.douyin-group.expanded,
.rank-theme-6.douyin-group.expanded,
.rank-theme-7.douyin-group.expanded,
.rank-theme-8.douyin-group.expanded,
.rank-theme-9.douyin-group.expanded,
.rank-theme-10.douyin-group.expanded {
  border-color: rgba(139, 92, 246, 0.3);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.5) 0%, rgba(243, 232, 255, 0.8) 100%);
  box-shadow: 0 10px 25px rgba(139, 92, 246, 0.15);
}

.ranking-item {
  @apply flex items-center gap-4 p-5 bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200;
}

.ranking-item.clickable {
  @apply cursor-pointer;
}

.douyin-group.expanded .ranking-item {
  @apply shadow-md;
  border-radius: 16px 16px 0 0;
}

/* 排名徽章样式 */
.rank-section {
  @apply flex-shrink-0;
}

.rank-badge {
  @apply w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm;
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #cd7c2f 0%, #d97706 100%);
}

/* 排名主题样式 - 让每个抖音号的颜色与其排名徽章保持一致 */
.rank-theme-1 .douyin-name {
  @apply text-amber-700;
}

.rank-theme-1 .stat-value.amount {
  @apply text-amber-600;
}

.rank-theme-1.ranking-item {
  border-color: rgba(245, 158, 11, 0.2);
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.8) 0%, rgba(254, 243, 199, 0.6) 100%);
}

.rank-theme-1.ranking-item:hover {
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 10px 25px rgba(245, 158, 11, 0.15);
}

.rank-theme-1.douyin-group.expanded .ranking-item {
  border-color: rgba(245, 158, 11, 0.3);
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.95) 0%, rgba(254, 243, 199, 0.8) 100%);
}

.rank-theme-2 .douyin-name {
  @apply text-gray-700;
}

.rank-theme-2 .stat-value.amount {
  @apply text-gray-600;
}

.rank-theme-2.ranking-item {
  border-color: rgba(107, 114, 128, 0.2);
  background: linear-gradient(135deg, rgba(249, 250, 251, 0.8) 0%, rgba(243, 244, 246, 0.6) 100%);
}

.rank-theme-2.ranking-item:hover {
  border-color: rgba(107, 114, 128, 0.4);
  box-shadow: 0 10px 25px rgba(107, 114, 128, 0.15);
}

.rank-theme-2.douyin-group.expanded .ranking-item {
  border-color: rgba(107, 114, 128, 0.3);
  background: linear-gradient(135deg, rgba(249, 250, 251, 0.95) 0%, rgba(243, 244, 246, 0.8) 100%);
}

.rank-theme-3 .douyin-name {
  @apply text-orange-700;
}

.rank-theme-3 .stat-value.amount {
  @apply text-orange-600;
}

.rank-theme-3.ranking-item {
  border-color: rgba(205, 124, 47, 0.2);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.8) 0%, rgba(254, 215, 170, 0.6) 100%);
}

.rank-theme-3.ranking-item:hover {
  border-color: rgba(205, 124, 47, 0.4);
  box-shadow: 0 10px 25px rgba(205, 124, 47, 0.15);
}

.rank-theme-3.douyin-group.expanded .ranking-item {
  border-color: rgba(205, 124, 47, 0.3);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.95) 0%, rgba(254, 215, 170, 0.8) 100%);
}

/* 第4名及以后的默认紫色主题 */
.rank-theme-4 .douyin-name,
.rank-theme-5 .douyin-name,
.rank-theme-6 .douyin-name,
.rank-theme-7 .douyin-name,
.rank-theme-8 .douyin-name,
.rank-theme-9 .douyin-name,
.rank-theme-10 .douyin-name {
  @apply text-purple-700;
}

.rank-theme-4 .stat-value.amount,
.rank-theme-5 .stat-value.amount,
.rank-theme-6 .stat-value.amount,
.rank-theme-7 .stat-value.amount,
.rank-theme-8 .stat-value.amount,
.rank-theme-9 .stat-value.amount,
.rank-theme-10 .stat-value.amount {
  @apply text-purple-600;
}

.rank-theme-4.ranking-item,
.rank-theme-5.ranking-item,
.rank-theme-6.ranking-item,
.rank-theme-7.ranking-item,
.rank-theme-8.ranking-item,
.rank-theme-9.ranking-item,
.rank-theme-10.ranking-item {
  border-color: rgba(139, 92, 246, 0.2);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(243, 232, 255, 0.6) 100%);
}

.rank-theme-4.ranking-item:hover,
.rank-theme-5.ranking-item:hover,
.rank-theme-6.ranking-item:hover,
.rank-theme-7.ranking-item:hover,
.rank-theme-8.ranking-item:hover,
.rank-theme-9.ranking-item:hover,
.rank-theme-10.ranking-item:hover {
  border-color: rgba(139, 92, 246, 0.4);
  box-shadow: 0 10px 25px rgba(139, 92, 246, 0.15);
}

.rank-theme-4.douyin-group.expanded .ranking-item,
.rank-theme-5.douyin-group.expanded .ranking-item,
.rank-theme-6.douyin-group.expanded .ranking-item,
.rank-theme-7.douyin-group.expanded .ranking-item,
.rank-theme-8.douyin-group.expanded .ranking-item,
.rank-theme-9.douyin-group.expanded .ranking-item,
.rank-theme-10.douyin-group.expanded .ranking-item {
  border-color: rgba(139, 92, 246, 0.3);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(243, 232, 255, 0.8) 100%);
}

/* 抖音号信息 */
.douyin-info {
  @apply flex-1 min-w-0;
}

.douyin-name {
  @apply text-lg font-semibold mb-2 truncate;
}

.douyin-stats {
  @apply flex gap-6 text-sm;
}

.stat-item {
  @apply flex items-center gap-1;
}

.stat-label {
  @apply text-gray-500;
}

.stat-value {
  @apply font-medium text-gray-900;
}

.stat-value.amount {
  @apply font-bold;
}

/* 剧目详情切换按钮 */
.dramas-toggle {
  @apply flex-shrink-0 w-10 h-10 flex items-center justify-center text-gray-400 cursor-pointer transition-all duration-200 rounded-lg;
}

.rank-theme-1 .dramas-toggle:hover {
  @apply text-amber-600 bg-amber-50;
}

.rank-theme-2 .dramas-toggle:hover {
  @apply text-gray-600 bg-gray-50;
}

.rank-theme-3 .dramas-toggle:hover {
  @apply text-orange-600 bg-orange-50;
}

.rank-theme-4 .dramas-toggle:hover,
.rank-theme-5 .dramas-toggle:hover,
.rank-theme-6 .dramas-toggle:hover,
.rank-theme-7 .dramas-toggle:hover,
.rank-theme-8 .dramas-toggle:hover,
.rank-theme-9 .dramas-toggle:hover,
.rank-theme-10 .dramas-toggle:hover {
  @apply text-purple-600 bg-purple-50;
}

/* 剧目详情展开区域 */
.dramas-detail {
  @apply relative;
  animation: slideDown 0.3s ease-out;
  border-radius: 0 0 16px 16px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.3) 0%, rgba(255, 255, 255, 0.6) 100%);
  border-top: 1px solid rgba(139, 92, 246, 0.1);
  margin-top: -1px;
}

.dramas-detail::before {
  content: '';
  @apply absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-200 via-purple-300 to-transparent;
}

/* 剧目详情主题颜色 */
.rank-theme-1 .dramas-detail {
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.3) 0%, rgba(254, 243, 199, 0.6) 100%);
  border-top-color: rgba(245, 158, 11, 0.1);
}

.rank-theme-1 .dramas-detail::before {
  @apply bg-gradient-to-b from-amber-200 via-amber-300 to-transparent;
}

.rank-theme-2 .dramas-detail {
  background: linear-gradient(135deg, rgba(249, 250, 251, 0.3) 0%, rgba(243, 244, 246, 0.6) 100%);
  border-top-color: rgba(107, 114, 128, 0.1);
}

.rank-theme-2 .dramas-detail::before {
  @apply bg-gradient-to-b from-gray-200 via-gray-300 to-transparent;
}

.rank-theme-3 .dramas-detail {
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.3) 0%, rgba(254, 215, 170, 0.6) 100%);
  border-top-color: rgba(205, 124, 47, 0.1);
}

.rank-theme-3 .dramas-detail::before {
  @apply bg-gradient-to-b from-orange-200 via-orange-300 to-transparent;
}

.rank-theme-4 .dramas-detail,
.rank-theme-5 .dramas-detail,
.rank-theme-6 .dramas-detail,
.rank-theme-7 .dramas-detail,
.rank-theme-8 .dramas-detail,
.rank-theme-9 .dramas-detail,
.rank-theme-10 .dramas-detail {
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.3) 0%, rgba(243, 232, 255, 0.6) 100%);
  border-top-color: rgba(139, 92, 246, 0.1);
}

.rank-theme-4 .dramas-detail::before,
.rank-theme-5 .dramas-detail::before,
.rank-theme-6 .dramas-detail::before,
.rank-theme-7 .dramas-detail::before,
.rank-theme-8 .dramas-detail::before,
.rank-theme-9 .dramas-detail::before,
.rank-theme-10 .dramas-detail::before {
  @apply bg-gradient-to-b from-purple-200 via-purple-300 to-transparent;
}

.dramas-list {
  @apply space-y-3 p-4;
}

.drama-item {
  @apply flex items-center p-4 bg-white/80 rounded-lg border border-gray-200/40 shadow-sm hover:shadow-md transition-all duration-200 hover:border-purple-200/60 hover:bg-white/95;
  position: relative;
  backdrop-filter: blur(4px);
}

.drama-item::before {
  content: '';
  @apply absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-purple-300 rounded-l-xl;
}

.drama-item:hover {
  @apply transform scale-[1.02] bg-gradient-to-r from-purple-50/60 to-blue-50/40;
}

/* 剧目项主题颜色 */
.rank-theme-1 .drama-item {
  border-color: rgba(245, 158, 11, 0.2);
  background: rgba(255, 251, 235, 0.8);
}

.rank-theme-1 .drama-item::before {
  @apply bg-gradient-to-b from-amber-400 to-amber-300;
}

.rank-theme-1 .drama-item:hover {
  border-color: rgba(245, 158, 11, 0.4);
  background: linear-gradient(to-r, rgba(255, 251, 235, 0.9), rgba(254, 243, 199, 0.6));
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
}

.rank-theme-2 .drama-item {
  border-color: rgba(107, 114, 128, 0.2);
  background: rgba(249, 250, 251, 0.8);
}

.rank-theme-2 .drama-item::before {
  @apply bg-gradient-to-b from-gray-400 to-gray-300;
}

.rank-theme-2 .drama-item:hover {
  border-color: rgba(107, 114, 128, 0.4);
  background: linear-gradient(to-r, rgba(249, 250, 251, 0.9), rgba(243, 244, 246, 0.6));
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.15);
}

.rank-theme-3 .drama-item {
  border-color: rgba(205, 124, 47, 0.2);
  background: rgba(255, 247, 237, 0.8);
}

.rank-theme-3 .drama-item::before {
  @apply bg-gradient-to-b from-orange-400 to-orange-300;
}

.rank-theme-3 .drama-item:hover {
  border-color: rgba(205, 124, 47, 0.4);
  background: linear-gradient(to-r, rgba(255, 247, 237, 0.9), rgba(254, 215, 170, 0.6));
  box-shadow: 0 4px 12px rgba(205, 124, 47, 0.15);
}

.rank-theme-4 .drama-item,
.rank-theme-5 .drama-item,
.rank-theme-6 .drama-item,
.rank-theme-7 .drama-item,
.rank-theme-8 .drama-item,
.rank-theme-9 .drama-item,
.rank-theme-10 .drama-item {
  border-color: rgba(139, 92, 246, 0.2);
  background: rgba(248, 250, 252, 0.8);
}

.rank-theme-4 .drama-item::before,
.rank-theme-5 .drama-item::before,
.rank-theme-6 .drama-item::before,
.rank-theme-7 .drama-item::before,
.rank-theme-8 .drama-item::before,
.rank-theme-9 .drama-item::before,
.rank-theme-10 .drama-item::before {
  @apply bg-gradient-to-b from-purple-400 to-purple-300;
}

.rank-theme-4 .drama-item:hover,
.rank-theme-5 .drama-item:hover,
.rank-theme-6 .drama-item:hover,
.rank-theme-7 .drama-item:hover,
.rank-theme-8 .drama-item:hover,
.rank-theme-9 .drama-item:hover,
.rank-theme-10 .drama-item:hover {
  border-color: rgba(139, 92, 246, 0.4);
  background: linear-gradient(to-r, rgba(248, 250, 252, 0.9), rgba(243, 232, 255, 0.6));
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
}

/* 充值记录样式 */
.recharge-records {
  @apply mt-2 ml-4;
}

.recharge-tags {
  @apply flex flex-wrap gap-2;
}

.recharge-tag {
  @apply inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50/80 rounded-full border border-gray-100/60 text-xs;
  backdrop-filter: blur(2px);
  transition: all 0.2s ease;
}

.recharge-tag:hover {
  @apply bg-gray-100/90 border-gray-200/80;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 充值记录标签主题颜色 */
.rank-theme-1 .recharge-tag {
  @apply bg-amber-50/80 border-amber-100/60;
}

.rank-theme-1 .recharge-tag:hover {
  @apply bg-amber-100/90 border-amber-200/80;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
}

.rank-theme-2 .recharge-tag {
  @apply bg-gray-50/80 border-gray-100/60;
}

.rank-theme-2 .recharge-tag:hover {
  @apply bg-gray-100/90 border-gray-200/80;
  box-shadow: 0 2px 4px rgba(107, 114, 128, 0.2);
}

.rank-theme-3 .recharge-tag {
  @apply bg-orange-50/80 border-orange-100/60;
}

.rank-theme-3 .recharge-tag:hover {
  @apply bg-orange-100/90 border-orange-200/80;
  box-shadow: 0 2px 4px rgba(205, 124, 47, 0.2);
}

.rank-theme-4 .recharge-tag,
.rank-theme-5 .recharge-tag,
.rank-theme-6 .recharge-tag,
.rank-theme-7 .recharge-tag,
.rank-theme-8 .recharge-tag,
.rank-theme-9 .recharge-tag,
.rank-theme-10 .recharge-tag {
  @apply bg-purple-50/80 border-purple-100/60;
}

.rank-theme-4 .recharge-tag:hover,
.rank-theme-5 .recharge-tag:hover,
.rank-theme-6 .recharge-tag:hover,
.rank-theme-7 .recharge-tag:hover,
.rank-theme-8 .recharge-tag:hover,
.rank-theme-9 .recharge-tag:hover,
.rank-theme-10 .recharge-tag:hover {
  @apply bg-purple-100/90 border-purple-200/80;
  box-shadow: 0 2px 4px rgba(139, 92, 246, 0.2);
}

.tag-amount {
  @apply font-medium text-green-600;
}

/* 充值金额主题颜色 */
.rank-theme-1 .tag-amount {
  @apply text-amber-600;
}

.rank-theme-2 .tag-amount {
  @apply text-gray-600;
}

.rank-theme-3 .tag-amount {
  @apply text-orange-600;
}

.rank-theme-4 .tag-amount,
.rank-theme-5 .tag-amount,
.rank-theme-6 .tag-amount,
.rank-theme-7 .tag-amount,
.rank-theme-8 .tag-amount,
.rank-theme-9 .tag-amount,
.rank-theme-10 .tag-amount {
  @apply text-purple-600;
}

.tag-time {
  @apply text-gray-500 text-xs;
}

.recharge-time {
  @apply text-gray-500;
}

.drama-name {
  @apply text-sm font-semibold text-gray-900 truncate flex-1 pl-2;
}

.drama-stats {
  @apply flex items-center gap-3 text-xs flex-shrink-0;
}

.drama-toggle {
  @apply flex-shrink-0 ml-4;
}

.drama-amount {
  @apply font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg;
}

/* 剧名金额主题颜色 */
.rank-theme-1 .drama-amount {
  @apply text-amber-600 bg-amber-50;
}

.rank-theme-2 .drama-amount {
  @apply text-gray-600 bg-gray-50;
}

.rank-theme-3 .drama-amount {
  @apply text-orange-600 bg-orange-50;
}

.rank-theme-4 .drama-amount,
.rank-theme-5 .drama-amount,
.rank-theme-6 .drama-amount,
.rank-theme-7 .drama-amount,
.rank-theme-8 .drama-amount,
.rank-theme-9 .drama-amount,
.rank-theme-10 .drama-amount {
  @apply text-purple-600 bg-purple-50;
}

.drama-orders {
  @apply font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg;
}

/* 剧名订单数主题颜色 */
.rank-theme-1 .drama-orders {
  @apply text-amber-600 bg-amber-50;
}

.rank-theme-2 .drama-orders {
  @apply text-gray-600 bg-gray-50;
}

.rank-theme-3 .drama-orders {
  @apply text-orange-600 bg-orange-50;
}

.rank-theme-4 .drama-orders,
.rank-theme-5 .drama-orders,
.rank-theme-6 .drama-orders,
.rank-theme-7 .drama-orders,
.rank-theme-8 .drama-orders,
.rank-theme-9 .drama-orders,
.rank-theme-10 .drama-orders {
  @apply text-purple-600 bg-purple-50;
}

.drama-time {
  @apply text-gray-500 bg-gray-100 px-2 py-1 rounded-lg;
}

/* 展开动画 */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 空状态 */
.empty-state {
  @apply flex justify-center items-center py-16;
}

/* 响应式优化 */
@media (max-width: 640px) {
  .douyin-group {
    @apply mx-2;
  }

  .ranking-item {
    @apply p-4 gap-3;
  }

  .douyin-stats {
    @apply flex-col gap-2;
  }

  .dramas-detail {
    @apply mx-0;
  }

  .dramas-list {
    @apply p-3;
  }

  .drama-item {
    @apply p-3 flex-col items-start gap-2;
  }

  .drama-name {
    @apply w-full pl-0;
  }

  .drama-stats {
    @apply flex-col gap-2 items-start w-full;
  }

  .drama-toggle {
    @apply self-end mt-2;
  }

  .recharge-records {
    @apply ml-2;
  }

  .recharge-tag {
    @apply px-2 py-1 text-xs;
  }

  .drama-amount,
  .drama-orders,
  .drama-time {
    @apply text-xs px-2 py-1;
  }
}

/* 响应式优化 */
@media (max-width: 640px) {
  :deep(.statistics-card .n-card-header) {
    @apply px-4 py-3;
  }

  :deep(.statistics-card .n-card__content) {
    @apply p-4;
  }
}

/* 短剧排行样式 - 复用抖音号排行的样式系统 */
.drama-ranking-container {
  @apply space-y-4;
}

.drama-ranking-list {
  @apply space-y-3;
}

/* 短剧组样式 - 复用抖音号组样式 */
.drama-group {
  @apply relative;
  border-radius: 16px;
  transition: all 0.3s ease;
}

.drama-group.expanded {
  @apply mb-4 shadow-lg;
  border: 2px solid rgba(139, 92, 246, 0.2);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.5) 0%, rgba(255, 255, 255, 0.8) 100%);
}

/* 短剧组主题边框和阴影 - 与抖音号组保持一致 */
.rank-theme-1.drama-group.expanded {
  border-color: rgba(245, 158, 11, 0.3);
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.5) 0%, rgba(254, 243, 199, 0.8) 100%);
  box-shadow: 0 10px 25px rgba(245, 158, 11, 0.15);
}

.rank-theme-2.drama-group.expanded {
  border-color: rgba(107, 114, 128, 0.3);
  background: linear-gradient(135deg, rgba(249, 250, 251, 0.5) 0%, rgba(243, 244, 246, 0.8) 100%);
  box-shadow: 0 10px 25px rgba(107, 114, 128, 0.15);
}

.rank-theme-3.drama-group.expanded {
  border-color: rgba(205, 124, 47, 0.3);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.5) 0%, rgba(254, 215, 170, 0.8) 100%);
  box-shadow: 0 10px 25px rgba(205, 124, 47, 0.15);
}

.rank-theme-4.drama-group.expanded,
.rank-theme-5.drama-group.expanded,
.rank-theme-6.drama-group.expanded,
.rank-theme-7.drama-group.expanded,
.rank-theme-8.drama-group.expanded,
.rank-theme-9.drama-group.expanded,
.rank-theme-10.drama-group.expanded {
  border-color: rgba(139, 92, 246, 0.3);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.5) 0%, rgba(243, 232, 255, 0.8) 100%);
  box-shadow: 0 10px 25px rgba(139, 92, 246, 0.15);
}

/* 短剧排行项目主题样式 - 与抖音号排行保持一致 */
.rank-theme-1 .drama-name {
  @apply text-amber-700;
}

.rank-theme-1 .stat-value.amount {
  @apply text-amber-600;
}

.rank-theme-1.ranking-item {
  border-color: rgba(245, 158, 11, 0.2);
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.8) 0%, rgba(254, 243, 199, 0.6) 100%);
}

.rank-theme-1.ranking-item:hover {
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 10px 25px rgba(245, 158, 11, 0.15);
}

.rank-theme-1.drama-group.expanded .ranking-item {
  border-color: rgba(245, 158, 11, 0.3);
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.95) 0%, rgba(254, 243, 199, 0.8) 100%);
}

.rank-theme-2 .drama-name {
  @apply text-gray-700;
}

.rank-theme-2 .stat-value.amount {
  @apply text-gray-600;
}

.rank-theme-2.ranking-item {
  border-color: rgba(107, 114, 128, 0.2);
  background: linear-gradient(135deg, rgba(249, 250, 251, 0.8) 0%, rgba(243, 244, 246, 0.6) 100%);
}

.rank-theme-2.ranking-item:hover {
  border-color: rgba(107, 114, 128, 0.4);
  box-shadow: 0 10px 25px rgba(107, 114, 128, 0.15);
}

.rank-theme-2.drama-group.expanded .ranking-item {
  border-color: rgba(107, 114, 128, 0.3);
  background: linear-gradient(135deg, rgba(249, 250, 251, 0.95) 0%, rgba(243, 244, 246, 0.8) 100%);
}

.rank-theme-3 .drama-name {
  @apply text-orange-700;
}

.rank-theme-3 .stat-value.amount {
  @apply text-orange-600;
}

.rank-theme-3.ranking-item {
  border-color: rgba(205, 124, 47, 0.2);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.8) 0%, rgba(254, 215, 170, 0.6) 100%);
}

.rank-theme-3.ranking-item:hover {
  border-color: rgba(205, 124, 47, 0.4);
  box-shadow: 0 10px 25px rgba(205, 124, 47, 0.15);
}

.rank-theme-3.drama-group.expanded .ranking-item {
  border-color: rgba(205, 124, 47, 0.3);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.95) 0%, rgba(254, 215, 170, 0.8) 100%);
}

/* 第4名及以后的默认紫色主题 */
.rank-theme-4 .drama-name,
.rank-theme-5 .drama-name,
.rank-theme-6 .drama-name,
.rank-theme-7 .drama-name,
.rank-theme-8 .drama-name,
.rank-theme-9 .drama-name,
.rank-theme-10 .drama-name {
  @apply text-purple-700;
}

.rank-theme-4 .stat-value.amount,
.rank-theme-5 .stat-value.amount,
.rank-theme-6 .stat-value.amount,
.rank-theme-7 .stat-value.amount,
.rank-theme-8 .stat-value.amount,
.rank-theme-9 .stat-value.amount,
.rank-theme-10 .stat-value.amount {
  @apply text-purple-600;
}

.rank-theme-4.ranking-item,
.rank-theme-5.ranking-item,
.rank-theme-6.ranking-item,
.rank-theme-7.ranking-item,
.rank-theme-8.ranking-item,
.rank-theme-9.ranking-item,
.rank-theme-10.ranking-item {
  border-color: rgba(139, 92, 246, 0.2);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(243, 232, 255, 0.6) 100%);
}

.rank-theme-4.ranking-item:hover,
.rank-theme-5.ranking-item:hover,
.rank-theme-6.ranking-item:hover,
.rank-theme-7.ranking-item:hover,
.rank-theme-8.ranking-item:hover,
.rank-theme-9.ranking-item:hover,
.rank-theme-10.ranking-item:hover {
  border-color: rgba(139, 92, 246, 0.4);
  box-shadow: 0 10px 25px rgba(139, 92, 246, 0.15);
}

.rank-theme-4.drama-group.expanded .ranking-item,
.rank-theme-5.drama-group.expanded .ranking-item,
.rank-theme-6.drama-group.expanded .ranking-item,
.rank-theme-7.drama-group.expanded .ranking-item,
.rank-theme-8.drama-group.expanded .ranking-item,
.rank-theme-9.drama-group.expanded .ranking-item,
.rank-theme-10.drama-group.expanded .ranking-item {
  border-color: rgba(139, 92, 246, 0.3);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(243, 232, 255, 0.8) 100%);
}

/* 短剧信息样式 - 复用抖音号信息样式 */
.drama-info {
  @apply flex-1 min-w-0;
}

.drama-name {
  @apply text-lg font-semibold mb-2 truncate;
}

.drama-stats {
  @apply flex flex-wrap gap-4 text-sm;
}

/* 短剧总数据样式 */
.drama-totals {
  @apply flex-shrink-0 flex gap-6;
}

.total-item {
  @apply text-center;
}

.total-value {
  @apply text-lg font-semibold;
}

.total-label {
  @apply text-xs text-gray-500 mt-1;
}

/* 短剧总充值金额主题颜色 */
.rank-theme-1 .total-value {
  @apply text-amber-600;
}

.rank-theme-2 .total-value {
  @apply text-gray-600;
}

.rank-theme-3 .total-value {
  @apply text-orange-600;
}

.rank-theme-4 .total-value,
.rank-theme-5 .total-value,
.rank-theme-6 .total-value,
.rank-theme-7 .total-value,
.rank-theme-8 .total-value,
.rank-theme-9 .total-value,
.rank-theme-10 .total-value {
  @apply text-purple-600;
}

/* 充值记录样式 - 与抖音号排行的充值记录保持一致 */
.recharge-item {
  @apply flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors;
}

/* 充值记录主题样式 - 与抖音号排行保持一致 */
.rank-theme-1 .recharge-item {
  border-color: rgba(245, 158, 11, 0.1);
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.3) 0%, rgba(254, 243, 199, 0.1) 100%);
}

.rank-theme-1 .recharge-item:hover {
  border-color: rgba(245, 158, 11, 0.2);
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.5) 0%, rgba(254, 243, 199, 0.2) 100%);
}

.rank-theme-2 .recharge-item {
  border-color: rgba(107, 114, 128, 0.1);
  background: linear-gradient(135deg, rgba(249, 250, 251, 0.3) 0%, rgba(243, 244, 246, 0.1) 100%);
}

.rank-theme-2 .recharge-item:hover {
  border-color: rgba(107, 114, 128, 0.2);
  background: linear-gradient(135deg, rgba(249, 250, 251, 0.5) 0%, rgba(243, 244, 246, 0.2) 100%);
}

.rank-theme-3 .recharge-item {
  border-color: rgba(205, 124, 47, 0.1);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.3) 0%, rgba(254, 215, 170, 0.1) 100%);
}

.rank-theme-3 .recharge-item:hover {
  border-color: rgba(205, 124, 47, 0.2);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.5) 0%, rgba(254, 215, 170, 0.2) 100%);
}

.rank-theme-4 .recharge-item,
.rank-theme-5 .recharge-item,
.rank-theme-6 .recharge-item,
.rank-theme-7 .recharge-item,
.rank-theme-8 .recharge-item,
.rank-theme-9 .recharge-item,
.rank-theme-10 .recharge-item {
  border-color: rgba(139, 92, 246, 0.1);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.3) 0%, rgba(243, 232, 255, 0.1) 100%);
}

.rank-theme-4 .recharge-item:hover,
.rank-theme-5 .recharge-item:hover,
.rank-theme-6 .recharge-item:hover,
.rank-theme-7 .recharge-item:hover,
.rank-theme-8 .recharge-item:hover,
.rank-theme-9 .recharge-item:hover,
.rank-theme-10 .recharge-item:hover {
  border-color: rgba(139, 92, 246, 0.2);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.5) 0%, rgba(243, 232, 255, 0.2) 100%);
}

.recharge-info {
  @apply flex-1 min-w-0;
}

.recharge-user {
  @apply font-medium text-gray-900 truncate;
}

.recharge-time {
  @apply text-sm text-gray-500 mt-1;
}

.recharge-amount {
  @apply font-semibold text-green-600 mx-4;
}

/* 充值金额主题色 - 与排名主题保持一致 */
.rank-theme-1 .recharge-amount {
  @apply text-amber-600;
}

.rank-theme-2 .recharge-amount {
  @apply text-gray-600;
}

.rank-theme-3 .recharge-amount {
  @apply text-orange-600;
}

.rank-theme-4 .recharge-amount,
.rank-theme-5 .recharge-amount,
.rank-theme-6 .recharge-amount,
.rank-theme-7 .recharge-amount,
.rank-theme-8 .recharge-amount,
.rank-theme-9 .recharge-amount,
.rank-theme-10 .recharge-amount {
  @apply text-purple-600;
}

.recharge-status {
  @apply flex-shrink-0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .drama-totals {
    @apply gap-4 w-full justify-center;
  }

  .recharge-item {
    @apply flex-col items-start gap-2;
  }

  .recharge-amount {
    @apply mx-0 self-end;
  }
}
</style>
