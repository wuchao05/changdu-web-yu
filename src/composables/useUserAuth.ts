import { computed, ref } from 'vue'

interface DarenUserInfo {
  label: string
}

/**
 * 用户身份管理 Composable
 * 负责管理用户身份相关的状态和逻辑
 */
export function useUserAuth() {
  const currentUserId = computed(() => undefined as string | undefined)

  // 管理员用户 ID（从服务器配置读取，有默认值）
  const adminUserId = ref('2peWAuMpDOqXGj8')

  // 尝试从服务器同步管理员 ID
  fetch('/api/auth/config')
    .then(res => res.json())
    .then(({ data }) => {
      if (data?.users?.admin) {
        adminUserId.value = data.users.admin
      }
    })
    .catch(() => {
      // 忽略错误，使用默认值
    })

  // 计算属性：是否为管理员
  const isAdmin = computed(() => {
    return currentUserId.value === adminUserId.value
  })

  // 历史兼容字段，当前固定为 false
  const isDarenUser = computed(() => {
    return false
  })

  // 历史兼容字段，当前固定为空
  const currentDaren = computed<DarenUserInfo | undefined>(() => {
    return undefined
  })

  // 保留旧的兼容性 API（已弃用）
  const isXiaolai = computed(() => {
    return currentDaren.value?.label === '小来'
  })

  const isXiaoxiong = computed(() => {
    return currentDaren.value?.label === '小熊'
  })

  // 计算属性：用户身份描述（普通用户不显示身份）
  const userRole = computed(() => {
    if (isAdmin.value) return '管理员'
    return null
  })

  // 计算属性：用户身份颜色主题
  const userRoleTheme = computed(() => {
    if (isAdmin.value) return 'blue'
    return null
  })

  // 计算属性：用户身份图标
  const userRoleIcon = computed(() => {
    if (isAdmin.value) return 'mdi:shield-crown'
    return null
  })

  // 计算属性：用户身份标签列表（可展示多个标签）
  const userLabels = computed(() => {
    const labels: string[] = []
    if (isAdmin.value) {
      labels.push('管理员')
    }
    return labels
  })

  // 计算属性：是否为有效用户（仅管理员）
  const isValidUser = computed(() => {
    // 没有用户ID，或者用户ID不是管理员
    if (!currentUserId.value) {
      return false
    }
    return isAdmin.value
  })

  return {
    isAdmin,
    isDarenUser,
    currentDaren,
    // 保留旧的 API 以兼容现有代码
    isXiaolai,
    isXiaoxiong,
    currentUserId,
    userRole,
    userRoleTheme,
    userRoleIcon,
    userLabels,
    isValidUser,
  }
}
