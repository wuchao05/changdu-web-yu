import type { OrderItem, CreatorDailyData, QianlongAggregateData } from '@/api/types'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// 配置dayjs插件
dayjs.extend(utc)
dayjs.extend(timezone)

export interface PromotionInfo {
  account: string
  drama: string
  creatorName: string
  douyinName: string
}

// 需要跳过的推广名称列表
const PROMOTION_NAMES_TO_SKIP = ['小龙']

/**
 * 解析 promotion_name 字段
 * 格式: <账户>-<账户名称>-<剧名>-<达人名称>-<抖音号>
 * 示例: "1841578686216587-CC-欣雅2-764-神级鉴宝王-远橙-云剧场-MY6"
 *
 * 解析规则：
 * 1. 第一个连字符前是账户ID (1841578686216587)
 * 2. 账户名称是固定格式，通常以数字结尾 (CC-欣雅2-764)
 * 3. 账户名称后是：剧名-达人名称-抖音号
 *
 * 特殊情况：当包含推广名称（如"小龙"）时：
 * "1842852248764745-CC-欣雅2-4129-小龙-穿越六零开局遭遇临终托孤-小红-茹悟好剧"
 * 解析为: 账户-账户名称-推广名称-剧名-达人名称-抖音号
 */
export function parsePromotionName(
  promotionName: string,
  expectedCreatorName?: string
): PromotionInfo | null {
  if (!promotionName) {
    return null
  }

  try {
    const parts = promotionName.split('-')

    if (parts.length < 6) {
      return null
    }

    // 第一部分是账户ID
    const account = parts[0]

    // 找到账户名称的结束位置
    // 账户名称通常是 CC-欣雅X-数字 这样的格式
    // 从第二部分开始查找，找到纯数字的部分，这通常是账户名称的最后一部分
    let accountNameEndIndex = 1

    for (let i = 2; i < parts.length; i++) {
      if (/^\d+$/.test(parts[i])) {
        accountNameEndIndex = i
        break
      }
    }

    // 账户名称结束后，接下来的部分分别是：[推广名称(可选)]-剧名-达人名称-抖音号(可能包含连字符)
    let dramaIndex = accountNameEndIndex + 1

    // 检查是否存在需要跳过的推广名称
    if (dramaIndex < parts.length && PROMOTION_NAMES_TO_SKIP.includes(parts[dramaIndex])) {
      // 如果是推广名称，则剧名在下一个位置
      dramaIndex = dramaIndex + 1
    }

    const creatorIndex = dramaIndex + 1

    if (creatorIndex >= parts.length) {
      return null
    }

    const drama = parts[dramaIndex] || ''
    const creatorName = parts[creatorIndex] || ''
    // 抖音号可能包含连字符，所以取剩余的所有部分
    const douyinParts = parts.slice(creatorIndex + 1)
    const douyinName = douyinParts.join('-')

    // 验证达人名称是否匹配（如果提供了期望的达人名称）
    if (expectedCreatorName && creatorName !== expectedCreatorName) {
      // 名称不匹配时静默处理
    }

    return {
      account,
      drama,
      creatorName,
      douyinName,
    }
  } catch {
    return null
  }
}

/**
 * 格式化日期为 YYYY-MM-DD（北京时间）
 */
export function formatDate(dateInput: number | string): string {
  let date: dayjs.Dayjs

  if (typeof dateInput === 'string') {
    // 处理 "2025-09-15 11:36:01" 格式的字符串
    date = dayjs.tz(dateInput, 'Asia/Shanghai')
  } else {
    // 处理秒级时间戳
    date = dayjs.tz(dateInput * 1000, 'Asia/Shanghai')
  }

  return date.format('YYYY-MM-DD')
}

/**
 * 将金额从分转换为元，保留1位小数
 */
export function formatAmount(amountInCents: number): number {
  return Math.round((amountInCents / 100) * 10) / 10
}

/**
 * 将金额从分转换为元并格式化为货币字符串
 */
export function formatAmountDisplay(amountInCents: number): string {
  const amount = formatAmount(amountInCents)

  // 对于大于1000的金额，添加千位分隔符
  if (amount >= 1000) {
    return `¥${amount.toLocaleString('zh-CN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}`
  }

  return `¥${amount.toFixed(1)}`
}

/**
 * 聚合订单数据，按达人和日期分组
 */
export function aggregateOrdersByCreator(orders: OrderItem[]): QianlongAggregateData {
  const creatorStats = new Map<string, Map<string, { amount: number; count: number }>>()
  const creatorNames = new Set<string>()
  let totalAmount = 0

  // 记录日期范围
  let minDate = ''
  let maxDate = ''

  // 遍历所有订单
  orders.forEach(order => {
    // 只处理支付成功的订单
    if (order.pay_status !== 0) return

    const parsedInfo = parsePromotionName(order.promotion_name)
    if (!parsedInfo?.creatorName) return

    const creatorName = parsedInfo.creatorName

    const date = formatDate(order.order_create_time)
    const amount = formatAmount(order.pay_amount)

    // 更新日期范围
    if (!minDate || date < minDate) minDate = date
    if (!maxDate || date > maxDate) maxDate = date

    creatorNames.add(creatorName)
    totalAmount += amount

    // 初始化数据结构
    if (!creatorStats.has(creatorName)) {
      creatorStats.set(creatorName, new Map())
    }

    const dateMap = creatorStats.get(creatorName)!
    if (!dateMap.has(date)) {
      dateMap.set(date, { amount: 0, count: 0 })
    }

    // 累加数据
    const dayData = dateMap.get(date)!
    dayData.amount += amount
    dayData.count += 1
  })

  // 转换为最终格式
  const result: CreatorDailyData[] = []

  creatorStats.forEach((dateMap, creatorName) => {
    dateMap.forEach((data, date) => {
      result.push({
        creatorName,
        date,
        totalAmount: data.amount,
        orderCount: data.count,
      })
    })
  })

  // 按日期和达人名称排序
  result.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return a.creatorName.localeCompare(b.creatorName)
  })

  return {
    creatorStats: result,
    summary: {
      totalCreators: creatorNames.size,
      totalAmount: Math.round(totalAmount * 10) / 10, // 保留1位小数
      dateRange: {
        start: minDate,
        end: maxDate,
      },
    },
  }
}

/**
 * 按达人分组统计数据
 */
export function groupByCreator(data: CreatorDailyData[]): Map<string, CreatorDailyData[]> {
  const grouped = new Map<string, CreatorDailyData[]>()

  data.forEach(item => {
    if (!grouped.has(item.creatorName)) {
      grouped.set(item.creatorName, [])
    }
    grouped.get(item.creatorName)!.push(item)
  })

  return grouped
}

/**
 * 计算达人总收入排行
 */
export function getCreatorRanking(data: CreatorDailyData[]): Array<{
  creatorName: string
  totalAmount: number
  totalOrders: number
  avgDailyAmount: number
  activeDays: number
}> {
  const grouped = groupByCreator(data)
  const ranking: Array<{
    creatorName: string
    totalAmount: number
    totalOrders: number
    avgDailyAmount: number
    activeDays: number
  }> = []

  grouped.forEach((items, creatorName) => {
    const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0)
    const totalOrders = items.reduce((sum, item) => sum + item.orderCount, 0)
    const activeDays = items.length
    const avgDailyAmount = activeDays > 0 ? totalAmount / activeDays : 0

    ranking.push({
      creatorName,
      totalAmount: Math.round(totalAmount * 10) / 10,
      totalOrders,
      avgDailyAmount: Math.round(avgDailyAmount * 10) / 10,
      activeDays,
    })
  })

  // 按总收入降序排列
  ranking.sort((a, b) => b.totalAmount - a.totalAmount)

  return ranking
}
