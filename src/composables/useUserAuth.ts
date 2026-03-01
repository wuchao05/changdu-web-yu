import { computed, ref } from 'vue'
import { useApiConfigStore } from '@/stores/apiConfig'
import { useDarenStore } from '@/stores/daren'

/**
 * 用户身份管理 Composable
 * 负责管理用户身份相关的状态和逻辑
 */
export function useUserAuth() {
  const apiConfigStore = useApiConfigStore()
  const darenStore = useDarenStore()

  const currentUserId = computed(() => apiConfigStore.effectiveUserId)

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

  // 计算属性：是否为达人用户（在达人列表中）
  const isDarenUser = computed(() => {
    return darenStore.findDarenByUserId(currentUserId.value) !== undefined
  })

  // 计算属性：当前达人信息
  const currentDaren = computed(() => {
    return darenStore.findDarenByUserId(currentUserId.value)
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
    if (currentDaren.value) return currentDaren.value.label
    return null
  })

  // 计算属性：用户身份颜色主题
  const userRoleTheme = computed(() => {
    if (isAdmin.value) return 'blue'
    if (isDarenUser.value) return 'cyan'
    return null
  })

  // 计算属性：用户身份图标
  const userRoleIcon = computed(() => {
    if (isAdmin.value) return 'mdi:shield-crown'
    if (isDarenUser.value) return 'mdi:account-star'
    return null
  })

  // 计算属性：用户身份标签列表（可展示多个标签）
  const userLabels = computed(() => {
    const labels: string[] = []
    if (isAdmin.value) {
      labels.push('管理员')
    }
    if (currentDaren.value) {
      labels.push(currentDaren.value.label)
    }
    return labels
  })

  // 计算属性：是否为有效用户（管理员或已配置的达人）
  const isValidUser = computed(() => {
    // 没有用户ID，或者用户ID既不是管理员也不是达人
    if (!currentUserId.value) {
      return false
    }
    return isAdmin.value || isDarenUser.value
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
