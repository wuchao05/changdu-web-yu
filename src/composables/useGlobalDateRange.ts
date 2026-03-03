import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useAccountStore } from '@/stores/account'
import { getDefaultDateRange, getQianlongDateRangeByMode } from '@/utils/format'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// 配置 dayjs 插件
dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 全局日期范围管理
 * 当设置中的默认日期范围改变时，自动更新所有组件的日期范围
 */
export function useGlobalDateRange() {
  const settingsStore = useSettingsStore()
  const accountStore = useAccountStore()

  // 散柔账号的全局日期范围
  const sanrouDateRange = ref<[string, string] | null>(null)

  // 牵龙账号的全局日期范围
  const qianlongDateRange = ref<[number, number] | null>(null)

  // 计算散柔账号的默认日期范围
  const sanrouDefaultRange = computed(() => {
    const [start, end] = getDefaultDateRange(settingsStore.settings.defaultDateRange)
    return [
      dayjs(start).tz('Asia/Shanghai').format('YYYY-MM-DD'),
      dayjs(end).tz('Asia/Shanghai').format('YYYY-MM-DD'),
    ] as [string, string]
  })

  // 计算牵龙账号的默认日期范围
  const qianlongDefaultRange = computed(() => {
    const [start, end] = getQianlongDateRangeByMode(settingsStore.settings.qianlongDateRangeMode)
    return [start.getTime(), end.getTime()] as [number, number]
  })

  // 监听设置变化，自动更新全局日期范围
  watch(
    () => settingsStore.settings.defaultDateRange,
    newRange => {
      if (accountStore.isSanrouLikeAccount) {
        // 如果设置的是"今日"，强制所有散柔组件使用今日
        if (newRange === 'today') {
          const today = dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')
          sanrouDateRange.value = [today, today]
        } else {
          sanrouDateRange.value = sanrouDefaultRange.value
        }
      }
    },
    { immediate: true }
  )

  watch(
    () => settingsStore.settings.qianlongDateRangeMode,
    newMode => {
      if (accountStore.isQianlongAccount) {
        // 如果设置的是"今日"，强制所有牵龙组件使用今日
        if (newMode === 'today') {
          const today = dayjs().tz('Asia/Shanghai')
          const startTime = today.startOf('day').valueOf()
          const endTime = today.endOf('day').valueOf()
          qianlongDateRange.value = [startTime, endTime]
        } else {
          qianlongDateRange.value = qianlongDefaultRange.value
        }
      }
    },
    { immediate: true }
  )

  // 监听账号类型变化
  watch(
    () => accountStore.currentAccount,
    newType => {
      if (newType === 'daily') {
        // 切换到每日账号时，使用散柔的默认日期范围
        if (settingsStore.settings.defaultDateRange === 'today') {
          const today = dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')
          sanrouDateRange.value = [today, today]
        } else {
          sanrouDateRange.value = sanrouDefaultRange.value
        }
      } else if (newType === 'qianlong') {
        // 切换到牵龙账号时，使用牵龙的默认日期范围
        if (settingsStore.settings.qianlongDateRangeMode === 'today') {
          const today = dayjs().tz('Asia/Shanghai')
          const startTime = today.startOf('day').valueOf()
          const endTime = today.endOf('day').valueOf()
          qianlongDateRange.value = [startTime, endTime]
        } else {
          qianlongDateRange.value = qianlongDefaultRange.value
        }
      }
    },
    { immediate: true }
  )

  // 手动设置散柔日期范围
  function setSanrouDateRange(range: [string, string] | null) {
    sanrouDateRange.value = range
  }

  // 手动设置牵龙日期范围
  function setQianlongDateRange(range: [number, number] | null) {
    qianlongDateRange.value = range
  }

  // 重置为默认日期范围
  function resetToDefault() {
    if (accountStore.isSanrouLikeAccount) {
      if (settingsStore.settings.defaultDateRange === 'today') {
        const today = dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')
        sanrouDateRange.value = [today, today]
      } else {
        sanrouDateRange.value = sanrouDefaultRange.value
      }
    } else if (accountStore.isQianlongAccount) {
      if (settingsStore.settings.qianlongDateRangeMode === 'today') {
        const today = dayjs().tz('Asia/Shanghai')
        const startTime = today.startOf('day').valueOf()
        const endTime = today.endOf('day').valueOf()
        qianlongDateRange.value = [startTime, endTime]
      } else {
        qianlongDateRange.value = qianlongDefaultRange.value
      }
    }
  }

  return {
    // 响应式日期范围
    sanrouDateRange: computed(() => sanrouDateRange.value),
    qianlongDateRange: computed(() => qianlongDateRange.value),

    // 默认日期范围
    sanrouDefaultRange,
    qianlongDefaultRange,

    // 操作方法
    setSanrouDateRange,
    setQianlongDateRange,
    resetToDefault,
  }
}
