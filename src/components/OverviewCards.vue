<template>
  <div class="overview-cards">
    <!-- 标题区域 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-900">数据概览</h2>
        <p class="text-sm text-gray-500 mt-1">实时数据，一目了然</p>
      </div>
      <!-- 更新时间 -->
      <div v-if="adaptedOverviewData" class="text-right">
        <p class="text-xs text-gray-400">更新时间</p>
        <p class="text-sm text-gray-600 font-medium">{{ adaptedOverviewData.update_ts }}</p>
      </div>
    </div>

    <!-- 错误状态 -->
    <n-alert v-if="overviewError" type="error" :title="overviewError" show-icon class="mb-6" />

    <!-- 数据展示 -->
    <div
      v-if="adaptedOverviewData || overviewLoading"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
    >
      <!-- 今日充值 -->
      <div class="overview-card group hover:scale-[1.02] transition-all duration-300">
        <div
          class="overview-card-inner bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200"
        >
          <!-- 数据展示 -->
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-2">
                <div class="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <p class="text-sm font-medium text-emerald-700">今日充值</p>
                <!-- 手动刷新按钮 -->
                <button
                  @click="handleManualRefresh"
                  :disabled="refreshButtonLoading"
                  class="flex items-center justify-center w-6 h-6 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group/refresh hover:scale-110"
                  title="手动刷新"
                >
                  <Icon
                    icon="mdi:refresh"
                    class="w-5 h-5 text-emerald-600 transition-transform duration-300"
                    :class="{
                      'animate-spin': refreshButtonLoading,
                      'group-hover/refresh:rotate-180': !refreshButtonLoading,
                    }"
                  />
                </button>
              </div>
              <p class="text-2xl lg:text-3xl font-bold text-emerald-600">
                <template v-if="overviewLoading && !adaptedOverviewData && !refreshButtonLoading">
                  <div class="flex items-center space-x-1">
                    <div class="loading-dots">
                      <div class="dot bg-emerald-400"></div>
                      <div class="dot bg-emerald-500"></div>
                      <div class="dot bg-emerald-600"></div>
                    </div>
                    <span class="text-lg lg:text-xl text-emerald-500 font-medium">加载中</span>
                  </div>
                </template>
                <template v-else>
                  ¥{{ formatCentToYuan(adaptedOverviewData?.today_data || 0) }}
                </template>
              </p>
              <div class="flex items-center space-x-2 mt-1">
                <p class="text-xs text-emerald-500">实时更新</p>
                <div
                  v-if="
                    adaptedOverviewData?.today_data_diff !== undefined &&
                    adaptedOverviewData.today_data_diff !== 0
                  "
                  class="flex items-center space-x-1 text-xs"
                  :class="
                    adaptedOverviewData.today_data_diff > 0 ? 'text-red-500' : 'text-green-500'
                  "
                >
                  <Icon
                    :icon="
                      adaptedOverviewData.today_data_diff > 0
                        ? 'mdi:trending-up'
                        : 'mdi:trending-down'
                    "
                    class="w-3 h-3"
                  />
                  <span
                    >{{ adaptedOverviewData.today_data_diff > 0 ? '+' : ''
                    }}{{ formatCentToYuan(adaptedOverviewData.today_data_diff) }}</span
                  >
                </div>
              </div>
            </div>
            <div class="overview-card-icon bg-emerald-500">
              <Icon icon="mdi:cash-multiple" class="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- 今日新用户 -->
      <div class="overview-card group hover:scale-[1.02] transition-all duration-300">
        <div
          class="overview-card-inner bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200"
        >
          <!-- 数据展示 -->
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-2">
                <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
                <p class="text-sm font-medium text-orange-700">今日新用户</p>
              </div>
              <p class="text-2xl lg:text-3xl font-bold text-orange-600">
                <template v-if="overviewLoading && !adaptedOverviewData && !refreshButtonLoading">
                  <div class="flex items-center space-x-1">
                    <div class="loading-dots">
                      <div class="dot bg-orange-400"></div>
                      <div class="dot bg-orange-500"></div>
                      <div class="dot bg-orange-600"></div>
                    </div>
                    <span class="text-lg lg:text-xl text-orange-500 font-medium">加载中</span>
                  </div>
                </template>
                <template v-else>
                  {{ adaptedOverviewData?.user_num || 0 }}
                </template>
              </p>
              <div class="flex items-center space-x-2 mt-1">
                <p class="text-xs text-orange-500">实时更新</p>
                <div
                  v-if="
                    adaptedOverviewData?.user_num_diff !== undefined &&
                    adaptedOverviewData.user_num_diff !== 0
                  "
                  class="flex items-center space-x-1 text-xs"
                  :class="adaptedOverviewData.user_num_diff > 0 ? 'text-red-500' : 'text-green-500'"
                >
                  <Icon
                    :icon="
                      adaptedOverviewData.user_num_diff > 0
                        ? 'mdi:trending-up'
                        : 'mdi:trending-down'
                    "
                    class="w-3 h-3"
                  />
                  <span
                    >{{ adaptedOverviewData.user_num_diff > 0 ? '+' : ''
                    }}{{ adaptedOverviewData.user_num_diff }}</span
                  >
                </div>
              </div>
            </div>
            <div class="overview-card-icon bg-orange-500">
              <Icon icon="mdi:account-plus" class="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- 本月充值 -->
      <div class="overview-card group hover:scale-[1.02] transition-all duration-300">
        <div
          class="overview-card-inner bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200"
        >
          <!-- 数据展示 -->
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-2">
                <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                <p class="text-sm font-medium text-blue-700">本月充值</p>
              </div>
              <p class="text-2xl lg:text-3xl font-bold text-blue-600">
                <template v-if="overviewLoading && !adaptedOverviewData && !refreshButtonLoading">
                  <div class="flex items-center space-x-1">
                    <div class="loading-dots">
                      <div class="dot bg-blue-400"></div>
                      <div class="dot bg-blue-500"></div>
                      <div class="dot bg-blue-600"></div>
                    </div>
                    <span class="text-lg lg:text-xl text-blue-500 font-medium">加载中</span>
                  </div>
                </template>
                <template v-else>
                  ¥{{ formatCentToYuan(adaptedOverviewData?.month_data || 0) }}
                </template>
              </p>
              <p class="text-xs text-blue-500 mt-1">月度统计</p>
            </div>
            <div class="overview-card-icon bg-blue-500">
              <Icon icon="mdi:calendar-month" class="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- 累计充值 -->
      <div class="overview-card group hover:scale-[1.02] transition-all duration-300">
        <div
          class="overview-card-inner bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200"
        >
          <!-- 数据展示 -->
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-2">
                <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
                <p class="text-sm font-medium text-purple-700">累计充值</p>
              </div>
              <p class="text-2xl lg:text-3xl font-bold text-purple-600">
                <template v-if="overviewLoading && !adaptedOverviewData && !refreshButtonLoading">
                  <div class="flex items-center space-x-1">
                    <div class="loading-dots">
                      <div class="dot bg-purple-400"></div>
                      <div class="dot bg-purple-500"></div>
                      <div class="dot bg-purple-600"></div>
                    </div>
                    <span class="text-lg lg:text-xl text-purple-500 font-medium">加载中</span>
                  </div>
                </template>
                <template v-else>
                  ¥{{ formatCentToYuan(adaptedOverviewData?.all_data || 0) }}
                </template>
              </p>
              <p class="text-xs text-purple-500 mt-1">总计收入</p>
            </div>
            <div class="overview-card-icon bg-purple-500">
              <Icon icon="mdi:trending-up" class="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 无数据状态 -->
    <div v-else class="flex flex-col items-center justify-center py-16">
      <Icon icon="mdi:chart-line-variant" class="w-16 h-16 text-gray-300 mb-4" />
      <p class="text-gray-500 text-lg font-medium">暂无数据</p>
      <p class="text-gray-400 text-sm mt-1">请检查网络连接或稍后重试</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useMessage } from 'naive-ui'
import { useCreatorStore } from '@/stores/creator'
import { useDataStore } from '@/stores/data'
import { useAccountStore } from '@/stores/account'
import { getDataOverviewV1, getMonthlyRechargeAnalyze } from '@/api'
import type { ExtendedError } from '@/api/http'
import { formatCentToYuan } from '@/utils/format'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// 配置 dayjs 插件
dayjs.extend(utc)
dayjs.extend(timezone)

const message = useMessage()
const creatorStore = useCreatorStore()
const dataStore = useDataStore()
const accountStore = useAccountStore()

// 自动刷新功能
const autoRefresh = useAutoRefresh(fetchOverviewData)

// 计算属性
const overviewData = computed(() => dataStore.overviewData)
const overviewLoading = computed(() => dataStore.overviewLoading)
const overviewError = computed(() => dataStore.overviewError)

// 新用户数据现在也来自概览API，不再需要单独的newUserData

// 适配不同API的数据结构
const adaptedOverviewData = computed(() => {
  if (!overviewData.value) return null

  // 新API数据结构
  const data = overviewData.value as {
    income_amount?: number
    income_amount_diff?: number
    user_num?: number
    user_num_diff?: number
    all_income_amount?: number
    month_income_amount?: number
    update_ts?: number
  }

  return {
    today_data: data?.income_amount || 0, // 今日充值
    today_data_diff: data?.income_amount_diff || 0, // 今日充值较昨日增减
    month_data: data?.month_income_amount || 0, // 本月充值（来自新接口）
    all_data: data?.all_income_amount || 0, // 累计充值
    all_data_diff: 0, // 累计充值没有diff字段
    user_num: data?.user_num || 0, // 今日新用户
    user_num_diff: data?.user_num_diff || 0, // 今日新用户较昨日增减
    update_ts: data?.update_ts
      ? dayjs.unix(data.update_ts).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
      : dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
  }
})

// 获取当月1号到当日的日期范围（使用北京时区）
function getCurrentMonthDateRange() {
  // 获取北京时区的当前时间
  const now = dayjs().tz('Asia/Shanghai')

  // 当月1号
  const firstDay = now.startOf('month')
  const firstDayStr = firstDay.format('YYYY-MM-DD')

  // 当日
  const todayStr = now.format('YYYY-MM-DD')

  return {
    begin: firstDayStr,
    end: todayStr,
  }
}

// 获取概览数据
async function fetchOverviewData(showLoading = true) {
  // 散柔账号需要activeCreatorId
  if (accountStore.isSanrouAccount && !creatorStore.activeCreatorId) return
  // 乾隆账号需要distributorId
  if (accountStore.isQianlongAccount && !accountStore.getCurrentApiConfig().distributorId) return

  try {
    if (showLoading) {
      dataStore.setOverviewLoading(true)
    }
    dataStore.setOverviewError('')

    // 获取当月日期范围
    const { begin, end } = getCurrentMonthDateRange()

    // 先请求今日数据
    const todayResponse = await getDataOverviewV1({
      is_today: true,
      app_type: 7,
    })

    // 等待 500ms 避免访问速度过快
    await new Promise(resolve => setTimeout(resolve, 500))

    // 再请求累计数据和本月充值数据
    const [allResponse, monthlyResponse] = await Promise.all([
      getDataOverviewV1({
        is_today: false,
        app_type: 7,
      }),
      getMonthlyRechargeAnalyze({
        begin,
        end,
        analyze_type: 1,
        app_type: 7,
      }),
    ])

    // 合并今日数据、累计数据和本月充值数据
    const todayData = todayResponse.data
    const allData = allResponse.data
    const monthlyData = monthlyResponse

    const combinedData = {
      ...todayData,
      all_income_amount: allData?.income_amount || 0, // 累计充值
      month_income_amount: monthlyData?.total || 0, // 本月充值
    }

    dataStore.setOverviewData(combinedData)
  } catch (error: unknown) {
    const errorMsg = (error as Error)?.message || '获取数据概览失败'
    dataStore.setOverviewError(errorMsg)
    // 只有在拦截器未处理时才显示错误消息
    if (!(error as ExtendedError)?.handledByInterceptor) {
      message.error(errorMsg)
    }
  } finally {
    if (showLoading) {
      dataStore.setOverviewLoading(false)
    }
  }
}

// 新用户数据现在也来自概览API，不再需要单独的fetchNewUserData函数

// 手动刷新按钮loading状态
const refreshButtonLoading = ref(false)

// 手动刷新
async function handleManualRefresh() {
  if (refreshButtonLoading.value) return

  refreshButtonLoading.value = true
  try {
    // 刷新概览数据（包含新用户数据）
    await fetchOverviewData(false) // 不显示全局loading
    message.success('数据已刷新')
  } finally {
    refreshButtonLoading.value = false
  }
}

// 监听活跃达人变化，重新获取数据
watch(
  () => creatorStore.activeCreatorId,
  newId => {
    if (accountStore.isSanrouAccount && newId) {
      fetchOverviewData() // 概览数据包含新用户数据
    }
  },
  { immediate: true }
)

// 监听乾隆账号的distributorId变化
watch(
  () => accountStore.getCurrentApiConfig().distributorId,
  newDistributorId => {
    if (accountStore.isQianlongAccount && newDistributorId) {
      fetchOverviewData()
    }
  },
  { immediate: true }
)

// 监听账号切换
watch(
  () => accountStore.currentAccount,
  () => {
    if (accountStore.isSanrouLikeAccount) {
      fetchOverviewData() // 概览数据包含新用户数据
      autoRefresh.startAutoRefresh()
    } else if (!accountStore.isSanrouLikeAccount) {
      autoRefresh.stopAutoRefresh()
    }
  }
)

onMounted(() => {
  // 只有散柔账号才启动数据加载和自动刷新
  if (accountStore.isSanrouLikeAccount) {
    fetchOverviewData() // 概览数据包含新用户数据
    autoRefresh.startAutoRefresh()
  }
})

onUnmounted(() => {
  autoRefresh.stopAutoRefresh()
})
</script>

<style scoped>
.overview-cards {
  @apply space-y-6;
}

.overview-card {
  @apply cursor-pointer;
}

.overview-card-inner {
  @apply relative p-6 rounded-2xl border shadow-sm backdrop-blur-sm transition-all duration-300;
}

.overview-card:hover .overview-card-inner {
  @apply shadow-lg border-opacity-60;
}

.overview-card-icon {
  @apply w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300;
}

.overview-card:hover .overview-card-icon {
  @apply scale-110;
}

.overview-card-skeleton {
  @apply rounded-2xl overflow-hidden;
}

/* Loading dots 动画样式 */
.loading-dots {
  @apply flex items-center space-x-1;
}

.loading-dots .dot {
  @apply w-1 h-1 rounded-full;
  animation: loading-bounce 1.2s ease-in-out infinite both;
}

.loading-dots .dot:nth-child(1) {
  animation-delay: -0.24s;
}

.loading-dots .dot:nth-child(2) {
  animation-delay: -0.12s;
}

.loading-dots .dot:nth-child(3) {
  animation-delay: 0s;
}

@keyframes loading-bounce {
  0%,
  60%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  30% {
    transform: scale(1);
    opacity: 0.8;
  }
}

/* 响应式优化 */
@media (max-width: 640px) {
  .overview-card-inner {
    @apply p-4;
  }

  .overview-card-icon {
    @apply w-10 h-10;
  }
}
</style>
