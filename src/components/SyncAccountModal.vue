<template>
  <NModal
    v-model:show="visible"
    preset="card"
    title="同步账户"
    style="width: 900px"
    :mask-closable="false"
    :close-on-esc="false"
  >
    <!-- 步骤1：输入数量 -->
    <div v-if="step === 1" class="space-y-4">
      <div class="flex items-center gap-2">
        <span>需要拉取</span>
        <NInputNumber v-model:value="accountCount" :min="1" :max="1000" style="width: 120px" />
        <span>个账户</span>
      </div>
      <NButton type="primary" :loading="loading" @click="fetchAccounts">开始拉取</NButton>
      <div v-if="progressText" class="text-sm text-gray-500">{{ progressText }}</div>
    </div>

    <!-- 步骤2：显示账户列表 -->
    <div v-if="step === 2" class="space-y-4">
      <div class="text-sm text-gray-600">已找到 {{ matchedAccounts.length }} 个符合条件的账户</div>

      <NDataTable :columns="columns" :data="matchedAccounts" :max-height="400" size="small" />

      <div class="flex gap-2">
        <NButton
          type="primary"
          :loading="remarkLoading"
          :disabled="matchedAccounts.length === 0"
          @click="addRemarks"
        >
          添加备注
        </NButton>
        <NButton
          type="success"
          :loading="syncLoading"
          :disabled="!allAccountsHaveRemark"
          @click="syncToFeishu"
        >
          同步到飞书
        </NButton>
        <NButton @click="resetModal">重新开始</NButton>
      </div>

      <div v-if="remarkProgress" class="text-sm text-gray-500">{{ remarkProgress }}</div>
    </div>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal,
  NButton,
  NInputNumber,
  NDataTable,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import {
  getJiliangAccountList,
  editJiliangAccountRemark,
  type JiliangAccountItem,
} from '@/api/jiliang'
import { feishuApi } from '@/api/feishu'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const message = useMessage()

// 响应式数据
const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const step = ref(1)
const accountCount = ref(10)
const loading = ref(false)
const remarkLoading = ref(false)
const syncLoading = ref(false)
const progressText = ref('')
const remarkProgress = ref('')
const matchedAccounts = ref<JiliangAccountItem[]>([])
const abortController = ref<AbortController | null>(null)

// 表格列定义
const columns: DataTableColumns<JiliangAccountItem> = [
  {
    title: '序号',
    key: 'index',
    width: 60,
    render: (_, index) => index + 1,
  },
  {
    title: '账户 ID',
    key: 'advertiser_id',
    width: 200, // 增加列宽
  },
  {
    title: '账户名称',
    key: 'advertiser_name',
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '备注',
    key: 'advertiser_remark',
    width: 120,
    render: row => row.advertiser_remark || '-',
  },
]

// 计算属性：检查是否所有账户都有备注
const allAccountsHaveRemark = computed(() => {
  if (matchedAccounts.value.length === 0) return false
  return matchedAccounts.value.every(account => account.advertiser_remark === '小鱼')
})

// 拉取账户的核心函数
async function fetchAccounts() {
  loading.value = true
  matchedAccounts.value = []
  let offset = 1
  const targetCount = accountCount.value

  // 创建新的 AbortController
  abortController.value = new AbortController()

  try {
    while (matchedAccounts.value.length < targetCount) {
      progressText.value = `正在拉取第 ${offset} 页，已找到 ${matchedAccounts.value.length} 个符合条件的账户...`

      const response = await getJiliangAccountList(
        { offset, limit: 100 },
        abortController.value.signal
      )

      if (response.code !== 0) {
        throw new Error(response.msg || '获取账户列表失败')
      }

      // 过滤符合条件的账户
      const filtered = response.data.data_list.filter(item => {
        return (
          item.advertiser_name?.includes('泰州晴天') &&
          item.advertiser_status_name === '审核通过' &&
          !item.advertiser_remark // 备注字段不存在或为空
        )
      })

      matchedAccounts.value.push(...filtered)

      // 检查是否还有更多数据
      if (!response.data.pagination.hasMore) {
        break // 没有更多数据了
      }

      offset++
    }

    // 截取到目标数量
    if (matchedAccounts.value.length > targetCount) {
      matchedAccounts.value = matchedAccounts.value.slice(0, targetCount)
    }

    if (matchedAccounts.value.length > 0) {
      message.success(`成功找到 ${matchedAccounts.value.length} 个符合条件的账户`)
      step.value = 2
    } else {
      message.warning('未找到符合条件的账户')
    }
  } catch (err) {
    const error = err as Error
    // 如果是用户主动取消，不显示错误提示
    if (error.name === 'AbortError') {
      message.info('已取消拉取账户')
    } else {
      message.error(error.message || '拉取账户失败')
    }
  } finally {
    loading.value = false
    progressText.value = ''
    abortController.value = null
  }
}

// 批量添加备注
async function addRemarks() {
  remarkLoading.value = true
  let successCount = 0
  const failedAccounts: number[] = []

  for (let i = 0; i < matchedAccounts.value.length; i++) {
    const account = matchedAccounts.value[i]
    remarkProgress.value = `正在添加备注 ${i + 1}/${matchedAccounts.value.length}...`

    let retryCount = 0
    let success = false

    while (retryCount < 3 && !success) {
      try {
        const result = await editJiliangAccountRemark({
          account_id: account.advertiser_id.toString(),
          remark: '小鱼',
        })

        if (result.code === 0) {
          success = true
          successCount++
          account.advertiser_remark = '小鱼' // 更新本地显示
        } else {
          retryCount++
        }
      } catch {
        retryCount++
      }

      // 添加短暂延迟避免请求过快
      if (retryCount < 3 && !success) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    if (!success) {
      failedAccounts.push(account.advertiser_id)
    }
  }

  remarkLoading.value = false
  remarkProgress.value = ''

  if (failedAccounts.length > 0) {
    message.warning(`成功 ${successCount} 个，失败 ${failedAccounts.length} 个`)
  } else {
    message.success(`全部 ${successCount} 个账户备注添加成功`)
  }
}

// 同步到飞书
async function syncToFeishu() {
  syncLoading.value = true

  try {
    const accounts = matchedAccounts.value.map(acc => ({
      account: acc.advertiser_id.toString(),
      isUsed: '否',
    }))

    const result = await feishuApi.batchCreateDailyAccounts(accounts)

    if (result.code === 0) {
      message.success(`成功添加 ${accounts.length} 个账户到飞书`)
      visible.value = false
      resetModal()
    } else {
      throw new Error(result.msg || '同步失败')
    }
  } catch (err) {
    const error = err as Error
    message.error(error.message || '同步到飞书失败')
  } finally {
    syncLoading.value = false
  }
}

// 重置弹窗
function resetModal() {
  step.value = 1
  accountCount.value = 10
  matchedAccounts.value = []
  progressText.value = ''
  remarkProgress.value = ''
}

// 取消正在进行的请求
function cancelRequests() {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
}

// 监听弹窗关闭，取消请求并重置状态
watch(visible, newVal => {
  if (!newVal) {
    // 取消正在进行的请求
    cancelRequests()
    // 重置状态
    resetModal()
  }
})
</script>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
