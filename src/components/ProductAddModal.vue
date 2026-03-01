<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    title="待新增商品列表"
    :style="{ width: isMobile ? '90%' : '600px' }"
    :segmented="{ content: true, footer: 'soft' }"
    :close-on-esc="false"
    :mask-closable="false"
    @update:show="handleUpdateShow"
  >
    <div class="product-add-modal">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <n-spin size="medium" />
        <p class="loading-text">正在查询所有待搭建剧集的商品状态...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="internalDramaList.length === 0" class="empty-container">
        <Icon icon="mdi:check-circle" class="empty-icon" />
        <p class="empty-text">所有剧集都已新增商品</p>
      </div>

      <!-- 剧集列表 -->
      <div v-else class="drama-list-container">
        <p class="list-header">以下剧集未在商品库中找到，需要新增商品：</p>
        <n-list bordered>
          <n-list-item v-for="(drama, index) in internalDramaList" :key="index">
            <div class="drama-item">
              <div class="drama-left">
                <Icon icon="mdi:movie-open" class="drama-icon" />
                <span class="drama-name">{{ drama.name }}</span>
              </div>
              <div class="drama-right">
                <div v-if="drama.status === 'pending'" class="status-pending">
                  <span>待新增</span>
                </div>
                <div v-else-if="drama.status === 'processing'" class="status-processing">
                  <n-spin size="small" />
                  <span>处理中</span>
                </div>
                <div v-else-if="drama.status === 'success'" class="status-success">
                  <Icon icon="mdi:check-circle" class="status-icon" />
                  <span>成功</span>
                </div>
                <div v-else-if="drama.status === 'failed'" class="status-failed">
                  <Icon icon="mdi:alert-circle" class="status-icon" />
                  <span>失败</span>
                  <n-tooltip v-if="drama.error" trigger="hover">
                    <template #trigger>
                      <Icon icon="mdi:information" class="error-info-icon" />
                    </template>
                    {{ drama.error }}
                  </n-tooltip>
                </div>
              </div>
            </div>
          </n-list-item>
        </n-list>
        <p class="list-footer">
          <span v-if="isAdding"> 正在处理 {{ processingCount }}/{{ pendingCount }} </span>
          <span v-else> 共 {{ totalCount }} 部剧集，{{ pendingCount }} 部待新增 </span>
        </p>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <n-button @click="handleClose" :disabled="isAdding">取消</n-button>
        <n-button
          type="primary"
          :disabled="internalDramaList.length === 0 || isAdding"
          :loading="isAdding"
          @click="handleAdd"
        >
          {{ isAdding ? `正在处理 ${processingCount}/${pendingCount}` : '立即新增' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NList, NListItem, NButton, NSpin, NTooltip, useMessage } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useApiConfigStore } from '@/stores/apiConfig'
import {
  searchSplayAlbums,
  getSplayMiniProgramUrl,
  createSplayProduct,
  findMatchingAlbum,
} from '@/api/splay'
import type { SplayCreateProductParams } from '@/api/types'
import type { ProductSelectionResult } from '@/constants/productCategories'
import { getProductLibraryConfigBySubject } from '@/config/productLibrary'

export type DramaStatus = 'pending' | 'processing' | 'success' | 'failed'

// 外部传入的剧集信息（不包含状态）
export interface DramaInputItem {
  name: string
  subject?: string // 主体（如 "超琦"、"欣雅"）
}

// 内部使用的剧集信息（包含状态）
export interface DramaItem extends DramaInputItem {
  status: DramaStatus
  error?: string
}

interface Props {
  show: boolean
  dramaList: DramaInputItem[]
  loading?: boolean
}

interface Emits {
  (e: 'update:show', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  dramaList: () => [],
  loading: false,
})

const emit = defineEmits<Emits>()

const message = useMessage()
const apiConfigStore = useApiConfigStore()

// 内部状态管理
const internalDramaList = ref<DramaItem[]>([])
const isAdding = ref(false)
const processingCount = ref(0)
const shouldCancel = ref(false)

// 常量
const SPLAY_AD_CARRIER = '字节小程序'
const PRODUCT_CREATE_INITIAL_DELAY = 1000
const PRODUCT_CREATE_MAX_DELAY = 8000

// 默认分类配置
const defaultProductConfig: ProductSelectionResult = {
  firstCategoryId: '2019',
  firstCategoryName: '短剧',
  subCategoryId: '201901',
  subCategoryName: '都市',
  thirdCategoryId: '20190133',
  thirdCategoryName: '其他',
  playletGender: '3',
}

// 计算属性
const totalCount = computed(() => internalDramaList.value.length)
const pendingCount = computed(
  () => internalDramaList.value.filter(d => d.status !== 'success').length
)

// 监听外部 dramaList 变化，初始化内部状态
watch(
  () => props.dramaList,
  newList => {
    internalDramaList.value = newList.map(item => ({
      name: item.name,
      subject: item.subject,
      status: 'pending' as DramaStatus,
    }))
  },
  { immediate: true }
)

// 响应式移动端检测
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

// 初始化检测
checkMobile()
window.addEventListener('resize', checkMobile)

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
})

function handleUpdateShow(value: boolean) {
  if (!value && isAdding.value) {
    // 弹窗关闭时，如果正在批量新增，则取消操作
    shouldCancel.value = true
    isAdding.value = false
  }
  emit('update:show', value)
}

function handleClose() {
  if (isAdding.value) {
    shouldCancel.value = true
    isAdding.value = false
  }
  emit('update:show', false)
}

// 等待函数
function wait(duration: number) {
  return new Promise(resolve => {
    setTimeout(resolve, duration)
  })
}

// 重试创建商品
async function createProductWithRetry(
  payload: SplayCreateProductParams,
  token: string,
  dramaName: string
) {
  let delay = PRODUCT_CREATE_INITIAL_DELAY

  while (true) {
    const response = await createSplayProduct(payload, token)
    const result = response.data?.[0]

    if (result && !result.result && result.product_id) {
      return result
    }

    if (result?.result?.includes('系统请求频率超限')) {
      await wait(delay)
      delay = Math.min(delay * 2, PRODUCT_CREATE_MAX_DELAY)
      continue
    }

    throw new Error(result?.result || `新增商品失败：${dramaName}`)
  }
}

// 为单个剧集新增商品
async function addProductForDrama(
  dramaName: string,
  token: string,
  productConfig: ProductSelectionResult,
  subject?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 根据用户 ID 和主体获取对应的商品库配置
    const productLibConfig = getProductLibraryConfigBySubject(
      apiConfigStore.effectiveUserId,
      subject
    )

    // 1. 查询番茄后台剧集
    const albumResponse = await searchSplayAlbums(dramaName, token)
    if (albumResponse.code !== 0 || !albumResponse.data) {
      throw new Error(albumResponse.message || '番茄后台查询剧集失败')
    }

    // 2. 查找匹配的专辑
    const album = await findMatchingAlbum(albumResponse.data.list || [], dramaName, token)
    if (!album) {
      throw new Error(`番茄后台未找到符合条件的剧：${dramaName}`)
    }

    // 3. 获取小程序链接
    const miniProgramResponse = await getSplayMiniProgramUrl(album.id, token)
    if (miniProgramResponse.code !== 0 || !miniProgramResponse.data) {
      throw new Error(miniProgramResponse.message || '获取小程序链接失败')
    }

    // 4. 构建商品数据
    const productPayload: SplayCreateProductParams = {
      product_list: [
        {
          mini_program_info: miniProgramResponse.data,
          playlet_gender: productConfig.playletGender,
          name: dramaName,
          ad_carrier: SPLAY_AD_CARRIER,
          album_id: album.id,
          image_url: album.cover || '',
          first_category: productConfig.firstCategoryName,
          sub_category: productConfig.subCategoryName,
          third_category: productConfig.thirdCategoryName,
          first_category_id: productConfig.firstCategoryId,
          sub_category_id: productConfig.subCategoryId,
          third_category_id: productConfig.thirdCategoryId,
        },
      ],
      ad_account_id: productLibConfig.adAccountId,
      is_free: 0,
      product_platform_id: productLibConfig.productPlatformId,
    }

    // 5. 创建商品（带重试）
    await createProductWithRetry(productPayload, token, dramaName)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '新增商品失败，请稍后重试'
    return { success: false, error: errorMessage }
  }
}

// 批量新增商品
async function handleAdd() {
  const token = apiConfigStore.config.xtToken

  if (!token) {
    message.error('请先在设置中配置 XT Token')
    return
  }

  if (internalDramaList.value.length === 0) {
    message.warning('没有可新增的剧集')
    return
  }

  // 检查是否所有剧集都已经是成功状态
  const allSuccess = internalDramaList.value.every(d => d.status === 'success')
  if (allSuccess) {
    message.success(`所有剧集已新增商品成功（共 ${internalDramaList.value.length} 部）`)
    return
  }

  // 过滤出需要处理的剧集（排除已成功的）
  const pendingDramas = internalDramaList.value.filter(d => d.status !== 'success')

  if (pendingDramas.length === 0) {
    message.success(`所有剧集已新增商品成功（共 ${internalDramaList.value.length} 部）`)
    return
  }

  isAdding.value = true
  processingCount.value = 0
  shouldCancel.value = false

  let processedCount = 0

  // 依次处理每个需要处理的剧集
  for (let i = 0; i < internalDramaList.value.length; i++) {
    const drama = internalDramaList.value[i]

    // 如果已经是成功状态，跳过
    if (drama.status === 'success') {
      continue
    }

    // 检查是否已取消
    if (shouldCancel.value) {
      // 将未处理的剧集状态重置为待新增
      for (let j = i; j < internalDramaList.value.length; j++) {
        if (internalDramaList.value[j].status === 'processing') {
          internalDramaList.value[j].status = 'pending'
        }
      }
      break
    }

    // 更新状态为处理中
    drama.status = 'processing'
    processedCount++
    processingCount.value = processedCount

    // 执行新增操作（传入主体信息以选择对应的商品库配置）
    const result = await addProductForDrama(drama.name, token, defaultProductConfig, drama.subject)

    // 检查是否已取消
    if (shouldCancel.value) {
      // 将未处理的剧集状态重置为待新增
      for (let j = i + 1; j < internalDramaList.value.length; j++) {
        if (internalDramaList.value[j].status === 'processing') {
          internalDramaList.value[j].status = 'pending'
        }
      }
      break
    }

    // 更新状态
    if (result.success) {
      drama.status = 'success'
    } else {
      drama.status = 'failed'
      drama.error = result.error
    }

    // 添加短暂延迟，避免请求过快
    if (i < internalDramaList.value.length - 1) {
      await wait(200)
    }
  }

  isAdding.value = false
  shouldCancel.value = false

  // 统计结果
  const successCount = internalDramaList.value.filter(d => d.status === 'success').length
  const failedCount = internalDramaList.value.filter(d => d.status === 'failed').length
  const pendingCount = internalDramaList.value.filter(d => d.status === 'pending').length

  if (failedCount === 0 && pendingCount === 0) {
    message.success(`所有剧集新增商品成功（共 ${successCount} 部）`)
  } else if (failedCount > 0) {
    message.warning(`新增完成：成功 ${successCount} 部，失败 ${failedCount} 部`)
  }
}
</script>

<style scoped>
.product-add-modal {
  min-height: 200px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-text {
  margin-top: 16px;
  color: #666;
  font-size: 14px;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  color: #52c41a;
  margin-bottom: 16px;
}

.empty-text {
  color: #666;
  font-size: 14px;
}

.drama-list-container {
  padding: 8px 0;
}

.list-header {
  margin-bottom: 16px;
  color: #333;
  font-size: 14px;
  line-height: 1.5;
}

.drama-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.drama-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.drama-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.drama-icon {
  font-size: 20px;
  color: #1890ff;
  flex-shrink: 0;
}

.drama-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pending {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #999;
  font-size: 13px;
}

.status-processing {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #1890ff;
  font-size: 13px;
}

.status-success {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #52c41a;
  font-size: 13px;
}

.status-failed {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #ff4d4f;
  font-size: 13px;
}

.status-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.error-info-icon {
  font-size: 14px;
  color: #ff4d4f;
  cursor: help;
  flex-shrink: 0;
}

.list-footer {
  margin-top: 16px;
  text-align: right;
  color: #999;
  font-size: 13px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
