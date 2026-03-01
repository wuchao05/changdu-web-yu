import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// 配置dayjs插件
dayjs.extend(utc)
dayjs.extend(timezone)

// 设置默认时区为北京时间
dayjs.tz.setDefault('Asia/Shanghai')

/**
 * 将分转换为元，保留1位小数
 */
export function formatCentToYuan(cents: number): string {
  return (cents / 100).toFixed(1)
}

/**
 * 格式化百分比，保留1位小数
 * 后端返回的是已经乘以100的值，所以需要除以100还原
 */
export function formatPercentage(value: number): string {
  return `${(value / 100).toFixed(2)}%`
}

/**
 * 格式化时间戳为 YYYY-MM-DD（北京时间）
 */
export function formatTimestamp(timestamp: number): string {
  return dayjs.tz(timestamp * 1000, 'Asia/Shanghai').format('YYYY-MM-DD')
}

/**
 * 格式化时间戳为 YYYY-MM-DD HH:mm:ss（北京时间）
 */
export function formatDateTime(timestamp: number): string {
  return dayjs.tz(timestamp * 1000, 'Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 将日期转换为 YYYYMMDD 格式（北京时间）
 */
export function formatDateToString(date: Date): string {
  return dayjs.tz(date, 'Asia/Shanghai').format('YYYYMMDD')
}

/**
 * 将日期转换为秒级时间戳
 */
export function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

/**
 * 将 YYYY-MM-DD 格式的字符串转换为秒级时间戳（北京时间）
 */
export function dateStringToTimestamp(dateString: string): number {
  return Math.floor(dayjs.tz(dateString, 'Asia/Shanghai').valueOf() / 1000)
}

/**
 * 规范化日期到当天开始 00:00:00.000
 */
export function normalizeToDayStart(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

/**
 * 规范化日期到当天结束 23:59:59.999
 */
export function normalizeToDayEnd(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(23, 59, 59, 999)
  return normalized
}

/**
 * 将毫秒时间戳范围规范化到 [00:00:00, 23:59:59.999]
 */
export function normalizeDateRangeMs(range: [number, number]): [number, number] {
  const start = normalizeToDayStart(new Date(range[0])).getTime()
  const end = normalizeToDayEnd(new Date(range[1])).getTime()
  return [start, end]
}

/**
 * 获取默认查询时间范围
 * @param range 查询范围，支持 'today' | '3days' | '7days' | '30days' | 'all'
 */
export function getDefaultDateRange(
  range: 'today' | '3days' | '7days' | '30days' | 'all' = '7days'
): [Date, Date] {
  const end = normalizeToDayEnd(new Date())
  const start = normalizeToDayStart(new Date())

  switch (range) {
    case 'today':
      // 今日
      return [start, end]
    case '3days':
      // 近3日
      start.setDate(start.getDate() - 2)
      return [start, end]
    case '7days':
      // 近7日
      start.setDate(start.getDate() - 6)
      return [start, end]
    case '30days':
      // 近30日
      start.setDate(start.getDate() - 29)
      return [start, end]
    case 'all':
      // 至今（9月1日至今）
      return getQianlongDefaultDateRange()
    default:
      // 默认近7日
      start.setDate(start.getDate() - 6)
      return [start, end]
  }
}

/**
 * 获取牵龙数据的默认日期范围（9月1日到当前日期）
 */
export function getQianlongDefaultDateRange(): [Date, Date] {
  const end = new Date()
  const currentYear = end.getFullYear()

  // 9月1日
  const start = new Date(currentYear, 8, 1) // 月份从0开始，所以8表示9月

  // 如果当前日期在9月1日之前，则使用去年的9月1日
  if (end < start) {
    start.setFullYear(currentYear - 1)
  }

  // 规范化到整天边界
  const normalizedStart = normalizeToDayStart(start)
  const normalizedEnd = normalizeToDayEnd(end)

  return [normalizedStart, normalizedEnd]
}

/**
 * 根据设置获取牵龙日期范围
 * @param mode 日期范围模式
 */
export function getQianlongDateRangeByMode(mode: 'today' | 'september_1st'): [Date, Date] {
  if (mode === 'today') {
    // 当日数据：今天 00:00:00 到 23:59:59
    const today = new Date()
    const start = normalizeToDayStart(today)
    const end = normalizeToDayEnd(today)
    return [start, end]
  } else {
    // 9月1日至今
    return getQianlongDefaultDateRange()
  }
}
