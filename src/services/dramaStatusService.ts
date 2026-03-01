/**
 * 剧集状态看板数据服务
 */
import { feishuApi } from '@/api/feishu'
import { getNext7Days, timestampToDateString, getDateRangeDisplay } from '@/utils/dateUtils'
import type { FeishuRecord } from '@/api/types/feishu'

// 字段映射配置
export const FIELDS = {
  list: { title: '剧名' },
  status: { title: '剧名', date: '日期', state: '当前状态' },
} as const

// 剧集状态记录类型
export interface DramaStatusRecord {
  dramaName: string
  date: string // YYYY-MM-DD 格式
  status: string
  recordId: string
}

// 剧集清单记录类型
export interface DramaListRecord {
  dramaName: string
  recordId: string
}

// 剧集状态看板数据行类型
export interface DramaStatusRow {
  dramaName: string
  statusByDate: Record<string, string> // 日期 -> 状态
  recordIdByDate: Record<string, string> // 日期 -> recordId
}

// 剧集状态看板数据类型
export interface DramaStatusBoard {
  dateRange: string // 日期范围显示文本
  dates: string[] // 7个日期数组
  rows: DramaStatusRow[] // 剧集状态行数据
}

class DramaStatusService {
  private timezone: string = 'Asia/Shanghai'

  /**
   * 设置时区
   */
  setTimezone(timezone: string) {
    this.timezone = timezone
  }

  /**
   * 规范化剧名
   * @param dramaName 原始剧名
   * @returns 规范化后的剧名
   */
  private normalizeDramaName(dramaName: string): string {
    return dramaName.trim().replace(/\s+/g, ' ')
  }

  /**
   * 从剧集清单记录中提取剧名
   * @param record 飞书记录
   * @returns 剧名
   */
  private extractDramaNameFromList(record: FeishuRecord): string {
    const titleField = record.fields[FIELDS.list.title]
    if (Array.isArray(titleField) && titleField.length > 0) {
      return this.normalizeDramaName(titleField[0].text || '')
    }
    return ''
  }

  /**
   * 从剧集状态记录中提取剧名
   * @param record 飞书记录
   * @returns 剧名
   */
  private extractDramaNameFromStatus(record: FeishuRecord): string {
    const titleField = record.fields[FIELDS.status.title]
    if (Array.isArray(titleField) && titleField.length > 0) {
      return this.normalizeDramaName(titleField[0].text || '')
    }
    return ''
  }

  /**
   * 从剧集状态记录中提取日期
   * @param record 飞书记录
   * @returns 日期字符串 (YYYY-MM-DD)
   */
  private extractDateFromStatus(record: FeishuRecord): string {
    const timestamp = record.fields[FIELDS.status.date]
    if (typeof timestamp === 'number') {
      return timestampToDateString(timestamp, this.timezone)
    }
    return ''
  }

  /**
   * 从剧集状态记录中提取状态
   * @param record 飞书记录
   * @returns 状态字符串
   */
  private extractStatusFromStatus(record: FeishuRecord): string {
    const status = record.fields[FIELDS.status.state] || ''
    // 调试：打印状态值
    if (status && (status.includes('上传') || status.includes('待上传'))) {
      console.log('Debug - Found upload status:', status, 'in record:', record)
    }
    return status
  }

  /**
   * 获取剧集清单数据
   * @returns 剧集清单记录数组
   */
  async getDramaList(): Promise<DramaListRecord[]> {
    try {
      const response = await feishuApi.getAllDramaList()

      const dramaList: DramaListRecord[] = []
      const seenNames = new Set<string>()

      for (const record of response.data.items) {
        const dramaName = this.extractDramaNameFromList(record)

        if (dramaName && !seenNames.has(dramaName)) {
          seenNames.add(dramaName)
          dramaList.push({
            dramaName,
            recordId: record.record_id,
          })
        }
      }

      return dramaList
    } catch (error) {
      console.error('获取剧集清单失败:', error)
      throw new Error('获取剧集清单失败')
    }
  }

  /**
   * 获取剧集状态数据（未来7天）
   * @returns 剧集状态记录数组
   */
  async getDramaStatus(): Promise<DramaStatusRecord[]> {
    try {
      const response = await feishuApi.getAllDramaStatus()

      const statusRecords: DramaStatusRecord[] = []
      const processedRecords = new Set<string>() // 用于去重同剧名同日期的记录

      for (const record of response.data.items) {
        const dramaName = this.extractDramaNameFromStatus(record)
        const date = this.extractDateFromStatus(record)
        const status = this.extractStatusFromStatus(record)

        if (dramaName && date) {
          const recordKey = `${dramaName}-${date}`

          // 避免重复记录（保留第一条）
          if (!processedRecords.has(recordKey)) {
            processedRecords.add(recordKey)
            statusRecords.push({
              dramaName,
              date,
              status: status || '', // 如果没有状态，保持为空
              recordId: record.record_id,
            })
          }
        }
      }

      return statusRecords
    } catch (error) {
      console.error('获取剧集状态失败:', error)
      throw new Error('获取剧集状态失败')
    }
  }

  /**
   * 获取剧集状态看板数据
   * @returns 剧集状态看板数据
   */
  async getDramaStatusBoard(): Promise<DramaStatusBoard> {
    try {
      // 并行获取剧集清单和状态数据
      const [dramaList, statusRecords] = await Promise.all([
        this.getDramaList(),
        this.getDramaStatus(),
      ])

      // 获取上传日期范围（昨天、今天、未来3天）
      const dates = getNext7Days(this.timezone)
      const dateRange = getDateRangeDisplay(dates[0], dates[dates.length - 1])

      // 构建状态映射：剧名 -> 日期 -> 状态
      const statusMap = new Map<string, Map<string, string>>()
      // 构建记录ID映射：剧名 -> 日期 -> recordId
      const recordIdMap = new Map<string, Map<string, string>>()

      for (const statusRecord of statusRecords) {
        if (!statusMap.has(statusRecord.dramaName)) {
          statusMap.set(statusRecord.dramaName, new Map())
          recordIdMap.set(statusRecord.dramaName, new Map())
        }
        statusMap.get(statusRecord.dramaName)!.set(statusRecord.date, statusRecord.status)
        recordIdMap.get(statusRecord.dramaName)!.set(statusRecord.date, statusRecord.recordId)
      }

      // 构建看板行数据
      const rows: DramaStatusRow[] = []

      for (const drama of dramaList) {
        const statusByDate: Record<string, string> = {}
        const recordIdByDate: Record<string, string> = {}
        const dramaStatusMap = statusMap.get(drama.dramaName)
        const dramaRecordIdMap = recordIdMap.get(drama.dramaName)

        // 为每个日期填充状态和记录ID
        for (const date of dates) {
          const status = dramaStatusMap?.get(date)
          const recordId = dramaRecordIdMap?.get(date)
          statusByDate[date] = status || '—'
          recordIdByDate[date] = recordId || ''
        }

        rows.push({
          dramaName: drama.dramaName,
          statusByDate,
          recordIdByDate,
        })
      }

      return {
        dateRange,
        dates,
        rows,
      }
    } catch (error) {
      console.error('获取剧集状态看板失败:', error)
      throw new Error('获取剧集状态看板失败')
    }
  }

  /**
   * 刷新剧集状态看板数据
   * @returns 刷新后的剧集状态看板数据
   */
  async refreshDramaStatusBoard(): Promise<DramaStatusBoard> {
    // 清除可能的缓存（如果有的话）
    return this.getDramaStatusBoard()
  }
}

// 导出单例实例
export const dramaStatusService = new DramaStatusService()
export default dramaStatusService
