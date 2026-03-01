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
 * 示例: "1842754778072330-CC-超琦 8384-73-昭然赴礼-小何-安贺剧场"
 * 解析为: 账户-固定结构段-剧名-达人名称-抖音号
 *
 * 特殊情况：当包含推广名称（如"小龙"）时：
 * "1842852248764745-CC-欣雅2-4129-小龙-穿越六零开局遭遇临终托孤-小红-茹悟好剧"
 * 解析为: 账户-固定结构段-推广名称-剧名-达人名称-抖音号
 */
export function parsePromotionName(
  promotionName: string,
  expectedCreatorName: string
): PromotionInfo | null {
  if (!promotionName || !expectedCreatorName) {
    return null
  }

  try {
    const parts = promotionName.split('-')

    if (parts.length < 5) {
      return null
    }

    // 账户：第一个连字符之前
    const account = parts[0]

    // 跳过固定结构段 CC-超琦 8384-73 (parts[1], parts[2], parts[3])
    // 检查 parts[4] 是否为需要跳过的推广名称
    let dramaIndex = 4
    if (PROMOTION_NAMES_TO_SKIP.includes(parts[4])) {
      // 如果是推广名称，则剧名在下一个位置
      dramaIndex = 5
    }

    // 剧名
    const drama = parts[dramaIndex]

    // 达人名称：剧名后面第一个字段
    const creatorName = parts[dramaIndex + 1]

    // 验证达人名称是否匹配
    if (creatorName !== expectedCreatorName) {
      // 名称不匹配时静默处理
    }

    // 抖音号：达人名称后面剩余的所有字符（保留中间的 -）
    const douyinParts = parts.slice(dramaIndex + 2)
    const douyinName = douyinParts.join('-')

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
