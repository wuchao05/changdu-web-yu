import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { getDefaultDateRange } from '@/utils/format'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 全局日期范围管理（仅每日账号）
 */
export function useGlobalDateRange() {
  const settingsStore = useSettingsStore()

  const dailyDateRange = ref<[string, string] | null>(null)

  const dailyDefaultRange = computed(() => {
    const [start, end] = getDefaultDateRange(settingsStore.settings.defaultDateRange)
    return [
      dayjs(start).tz('Asia/Shanghai').format('YYYY-MM-DD'),
      dayjs(end).tz('Asia/Shanghai').format('YYYY-MM-DD'),
    ] as [string, string]
  })

  watch(
    () => settingsStore.settings.defaultDateRange,
    newRange => {
      if (newRange === 'today') {
        const today = dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')
        dailyDateRange.value = [today, today]
      } else {
        dailyDateRange.value = dailyDefaultRange.value
      }
    },
    { immediate: true }
  )

  function setDailyDateRange(range: [string, string] | null) {
    dailyDateRange.value = range
  }

  function resetToDefault() {
    if (settingsStore.settings.defaultDateRange === 'today') {
      const today = dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')
      dailyDateRange.value = [today, today]
    } else {
      dailyDateRange.value = dailyDefaultRange.value
    }
  }

  return {
    dailyDateRange: computed(() => dailyDateRange.value),
    dailyDefaultRange,
    setDailyDateRange,
    resetToDefault,
  }
}
