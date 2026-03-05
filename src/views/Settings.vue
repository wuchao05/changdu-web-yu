<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between max-w-4xl mx-auto">
        <div class="flex items-center space-x-3">
          <n-button text @click="router.back()" class="!text-gray-500 hover:!text-gray-700">
            <template #icon>
              <Icon icon="mdi:arrow-left" />
            </template>
            返回
          </n-button>
          <h1 class="text-xl font-semibold text-gray-900">设置</h1>
        </div>
      </div>
    </header>

    <main class="px-6 py-8">
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- Cookie 配置 -->
        <n-card class="shadow-sm border border-gray-200" :bordered="false">
          <template #header>
            <div class="flex items-center space-x-3">
              <Icon icon="mdi:cookie" class="w-5 h-5 text-gray-600" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900">接口 Cookie</h3>
                <p class="text-sm text-gray-500">配置常读与巨量平台的 Cookie</p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">{{
                CONFIG_LABELS.changduCookie
              }}</label>
              <n-input
                v-model:value="form.changduCookie"
                type="textarea"
                :rows="4"
                :placeholder="CONFIG_PLACEHOLDERS.changduCookie"
                class="font-mono text-sm"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">{{
                CONFIG_LABELS.juliangCookie
              }}</label>
              <n-input
                v-model:value="form.juliangCookie"
                type="textarea"
                :rows="4"
                :placeholder="CONFIG_PLACEHOLDERS.juliangCookie"
                class="font-mono text-sm"
              />
            </div>
          </div>
        </n-card>

        <!-- 常读请求头配置 -->
        <n-card class="shadow-sm border border-gray-200" :bordered="false">
          <template #header>
            <div class="flex items-center space-x-3">
              <Icon icon="mdi:format-list-bulleted-square" class="w-5 h-5 text-gray-600" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900">常读请求头配置</h3>
                <p class="text-sm text-gray-500">配置 Appid、Apptype、DistributorId 等请求头</p>
              </div>
            </div>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">{{
                CONFIG_LABELS.headers.appid
              }}</label>
              <n-input
                v-model:value="form.headers.appid"
                :placeholder="CONFIG_PLACEHOLDERS.headers.appid"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">{{
                CONFIG_LABELS.headers.apptype
              }}</label>
              <n-input
                v-model:value="form.headers.apptype"
                :placeholder="CONFIG_PLACEHOLDERS.headers.apptype"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                {{ CONFIG_LABELS.headers.distributorId }}
              </label>
              <n-input
                v-model:value="form.headers.distributorId"
                :placeholder="CONFIG_PLACEHOLDERS.headers.distributorId"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">{{
                CONFIG_LABELS.headers.adUserId
              }}</label>
              <n-input
                v-model:value="form.headers.adUserId"
                :placeholder="CONFIG_PLACEHOLDERS.headers.adUserId"
              />
            </div>
            <div class="space-y-2 md:col-span-2">
              <label class="text-sm font-medium text-gray-700">
                {{ CONFIG_LABELS.headers.rootAdUserId }}
              </label>
              <n-input
                v-model:value="form.headers.rootAdUserId"
                :placeholder="CONFIG_PLACEHOLDERS.headers.rootAdUserId"
              />
            </div>
          </div>
        </n-card>

        <!-- 搭建参数配置 -->
        <n-card class="shadow-sm border border-gray-200" :bordered="false">
          <template #header>
            <div class="flex items-center space-x-3">
              <Icon icon="mdi:cog" class="w-5 h-5 text-gray-600" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900">搭建参数配置</h3>
                <p class="text-sm text-gray-500">
                  配置商品信息、落地页、小程序和推广链接所需的关键参数
                </p>
              </div>
            </div>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                {{ CONFIG_LABELS.buildConfig.secretKey }}
              </label>
              <n-input
                v-model:value="form.buildConfig.secretKey"
                :placeholder="CONFIG_PLACEHOLDERS.buildConfig.secretKey"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">{{
                CONFIG_LABELS.buildConfig.source
              }}</label>
              <n-input
                v-model:value="form.buildConfig.source"
                :placeholder="CONFIG_PLACEHOLDERS.buildConfig.source"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">{{
                CONFIG_LABELS.buildConfig.bid
              }}</label>
              <n-input
                v-model:value="form.buildConfig.bid"
                :placeholder="CONFIG_PLACEHOLDERS.buildConfig.bid"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">{{
                CONFIG_LABELS.buildConfig.productId
              }}</label>
              <n-input
                v-model:value="form.buildConfig.productId"
                :placeholder="CONFIG_PLACEHOLDERS.buildConfig.productId"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                {{ CONFIG_LABELS.buildConfig.productPlatformId }}
              </label>
              <n-input
                v-model:value="form.buildConfig.productPlatformId"
                :placeholder="CONFIG_PLACEHOLDERS.buildConfig.productPlatformId"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                {{ CONFIG_LABELS.buildConfig.landingUrl }}
              </label>
              <n-input
                v-model:value="form.buildConfig.landingUrl"
                :placeholder="CONFIG_PLACEHOLDERS.buildConfig.landingUrl"
                class="font-mono text-sm"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                {{ CONFIG_LABELS.buildConfig.microAppName }}
              </label>
              <n-input
                v-model:value="form.buildConfig.microAppName"
                :placeholder="CONFIG_PLACEHOLDERS.buildConfig.microAppName"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                {{ CONFIG_LABELS.buildConfig.microAppId }}
              </label>
              <n-input
                v-model:value="form.buildConfig.microAppId"
                :placeholder="CONFIG_PLACEHOLDERS.buildConfig.microAppId"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">{{
                CONFIG_LABELS.buildConfig.ccId
              }}</label>
              <n-input
                v-model:value="form.buildConfig.ccId"
                :placeholder="CONFIG_PLACEHOLDERS.buildConfig.ccId"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                {{ CONFIG_LABELS.buildConfig.rechargeTemplateId }}
              </label>
              <n-input
                v-model:value="form.buildConfig.rechargeTemplateId"
                :placeholder="CONFIG_PLACEHOLDERS.buildConfig.rechargeTemplateId"
              />
            </div>
          </div>
        </n-card>

        <!-- 抖音号匹配素材 -->
        <n-card class="shadow-sm border border-gray-200" :bordered="false">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <Icon icon="mdi:link-variant" class="w-5 h-5 text-gray-600" />
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">抖音号匹配素材</h3>
                  <p class="text-sm text-gray-500">配置抖音号与素材序号的映射关系</p>
                </div>
              </div>
              <n-button type="primary" size="small" @click="handleAddMaterialMatch">
                <template #icon>
                  <Icon icon="mdi:plus" />
                </template>
                添加规则
              </n-button>
            </div>
          </template>

          <div class="mb-4">
            <n-input
              v-model:value="materialSearchKeyword"
              placeholder="搜索抖音号..."
              clearable
              class="max-w-md"
            >
              <template #prefix>
                <Icon icon="mdi:magnify" />
              </template>
            </n-input>
          </div>

          <div v-if="filteredMaterialMatches.length > 0" class="space-y-2">
            <div
              v-for="match in filteredMaterialMatches"
              :key="match.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div class="flex items-center space-x-4">
                <div class="flex items-center space-x-2">
                  <Icon icon="mdi:account" class="w-4 h-4 text-gray-500" />
                  <span class="font-medium text-gray-900">{{ match.douyinAccount }}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <Icon icon="mdi:identifier" class="w-4 h-4 text-gray-500" />
                  <span class="text-gray-600 text-sm">{{ match.douyinAccountId }}</span>
                </div>
                <Icon icon="mdi:arrow-right" class="w-4 h-4 text-gray-400" />
                <div class="flex items-center space-x-2">
                  <Icon icon="mdi:video" class="w-4 h-4 text-gray-500" />
                  <span class="text-gray-700 font-mono">{{ match.materialRange }}</span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <n-button size="small" @click="handleEditMaterialMatch(match)">编辑</n-button>
                <n-popconfirm @positive-click="handleDeleteMaterialMatch(match.id)">
                  <template #trigger>
                    <n-button size="small" type="error">删除</n-button>
                  </template>
                  确定删除这条匹配规则吗？
                </n-popconfirm>
              </div>
            </div>
          </div>
          <n-empty v-else description="暂无匹配规则，点击上方按钮添加" class="py-8" />
        </n-card>

        <!-- 飞书表格配置 -->
        <n-card class="shadow-sm border border-gray-200" :bordered="false">
          <template #header>
            <div class="flex items-center space-x-3">
              <Icon icon="mdi:table" class="w-5 h-5 text-gray-600" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900">飞书表格配置</h3>
                <p class="text-sm text-gray-500">配置飞书多维表格的 App Token 和 Table ID</p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">{{
                CONFIG_LABELS.feishu.appToken
              }}</label>
              <n-input
                v-model:value="form.feishu.app_token"
                :placeholder="CONFIG_PLACEHOLDERS.feishu.appToken"
                class="font-mono text-sm"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                {{ CONFIG_LABELS.feishu.dramaListTableId }}
              </label>
              <n-input
                v-model:value="form.feishu.table_ids.drama_list"
                :placeholder="CONFIG_PLACEHOLDERS.feishu.dramaListTableId"
                class="font-mono text-sm"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                {{ CONFIG_LABELS.feishu.dramaStatusTableId }}
              </label>
              <n-input
                v-model:value="form.feishu.table_ids.drama_status"
                :placeholder="CONFIG_PLACEHOLDERS.feishu.dramaStatusTableId"
                class="font-mono text-sm"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                {{ CONFIG_LABELS.feishu.accountTableId }}
              </label>
              <n-input
                v-model:value="form.feishu.table_ids.account"
                :placeholder="CONFIG_PLACEHOLDERS.feishu.accountTableId"
                class="font-mono text-sm"
              />
            </div>
          </div>
        </n-card>

        <!-- 保存按钮 -->
        <div class="flex justify-end gap-2">
          <n-button @click="loadConfig" :disabled="saving">重置</n-button>
          <n-button type="primary" :loading="saving" @click="saveConfig">保存所有配置</n-button>
        </div>
      </div>
    </main>

    <n-modal
      v-model:show="showMaterialMatchModal"
      preset="card"
      :title="editingMaterialMatchId ? '编辑匹配规则' : '添加匹配规则'"
      style="width: 500px"
    >
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700">抖音号</label>
          <n-input
            v-model:value="materialMatchForm.douyinAccount"
            placeholder="例如：小鱼看剧"
            clearable
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700">抖音号ID</label>
          <n-input
            v-model:value="materialMatchForm.douyinAccountId"
            placeholder="例如：123456789"
            clearable
          />
          <p class="text-xs text-gray-500">请输入抖音号的数字ID</p>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700">素材序号</label>
          <n-input
            v-model:value="materialMatchForm.materialRange"
            placeholder="例如：01 或 01-04"
            clearable
          />
          <p class="text-xs text-gray-500">支持 "01" 单个序号 或 "01-04" 连续范围格式</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="handleCancelMaterialMatch">取消</n-button>
          <n-button type="primary" @click="handleSaveMaterialMatch">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useMessage } from 'naive-ui'
import { configApi, type AppConfig, type DouyinMaterialMatch } from '@/api/config'
import { CONFIG_LABELS, CONFIG_PLACEHOLDERS } from '@/constants/configLabels'

const router = useRouter()
const message = useMessage()

const saving = ref(false)
const materialSearchKeyword = ref('')
const showMaterialMatchModal = ref(false)
const editingMaterialMatchId = ref<string | null>(null)
const materialMatchForm = ref({
  douyinAccount: '',
  douyinAccountId: '',
  materialRange: '',
})
const form = reactive<AppConfig>({
  changduCookie: '',
  juliangCookie: '',
  headers: {
    appid: '',
    apptype: '',
    distributorId: '',
    adUserId: '',
    rootAdUserId: '',
  },
  buildConfig: {
    secretKey: '',
    source: '',
    bid: '2',
    productId: '',
    productPlatformId: '',
    landingUrl: '',
    microAppName: '',
    microAppId: '',
    ccId: '',
    rechargeTemplateId: '',
  },
  feishu: {
    app_token: '',
    table_ids: {
      drama_list: '',
      drama_status: '',
      account: '',
    },
  },
  douyinMaterialMatches: [],
})

const filteredMaterialMatches = computed(() => {
  if (!materialSearchKeyword.value) {
    return form.douyinMaterialMatches
  }
  const keyword = materialSearchKeyword.value.toLowerCase()
  return form.douyinMaterialMatches.filter(match =>
    match.douyinAccount.toLowerCase().includes(keyword)
  )
})

function normalizeMaterialMatches(matches: unknown): DouyinMaterialMatch[] {
  if (!Array.isArray(matches)) {
    return []
  }

  return matches
    .filter(match => match && typeof match === 'object')
    .map((match, index) => {
      const item = match as Partial<DouyinMaterialMatch>
      const now = new Date().toISOString()

      return {
        id: typeof item.id === 'string' && item.id ? item.id : `${Date.now()}_${index}`,
        douyinAccount: typeof item.douyinAccount === 'string' ? item.douyinAccount : '',
        douyinAccountId: typeof item.douyinAccountId === 'string' ? item.douyinAccountId : '',
        materialRange: typeof item.materialRange === 'string' ? item.materialRange : '',
        createdAt: typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === 'string' && item.updatedAt ? item.updatedAt : now,
      }
    })
    .filter(match => match.douyinAccount && match.douyinAccountId && match.materialRange)
}

async function loadConfig() {
  try {
    const result = await configApi.getConfig()
    if (result.code === 0 && result.data) {
      form.changduCookie = result.data.changduCookie || ''
      form.juliangCookie = result.data.juliangCookie || ''
      form.headers.appid = result.data.headers?.appid || ''
      form.headers.apptype = result.data.headers?.apptype || ''
      form.headers.distributorId = result.data.headers?.distributorId || ''
      form.headers.adUserId = result.data.headers?.adUserId || ''
      form.headers.rootAdUserId = result.data.headers?.rootAdUserId || ''
      form.buildConfig.secretKey = result.data.buildConfig?.secretKey || ''
      form.buildConfig.source = result.data.buildConfig?.source || ''
      form.buildConfig.bid = result.data.buildConfig?.bid || '2'
      form.buildConfig.productId = result.data.buildConfig?.productId || ''
      form.buildConfig.productPlatformId = result.data.buildConfig?.productPlatformId || ''
      form.buildConfig.landingUrl = result.data.buildConfig?.landingUrl || ''
      form.buildConfig.microAppName = result.data.buildConfig?.microAppName || ''
      form.buildConfig.microAppId = result.data.buildConfig?.microAppId || ''
      form.buildConfig.ccId = result.data.buildConfig?.ccId || ''
      form.buildConfig.rechargeTemplateId = result.data.buildConfig?.rechargeTemplateId || ''
      form.feishu.app_token = result.data.feishu?.app_token || ''
      form.feishu.table_ids.drama_list = result.data.feishu?.table_ids?.drama_list || ''
      form.feishu.table_ids.drama_status = result.data.feishu?.table_ids?.drama_status || ''
      form.feishu.table_ids.account = result.data.feishu?.table_ids?.account || ''
      form.douyinMaterialMatches = normalizeMaterialMatches(result.data.douyinMaterialMatches)
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    message.error('加载配置失败')
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const result = await configApi.updateConfig(form)
    if (result.code !== 0) {
      throw new Error(result.message || '保存失败')
    }

    message.success('配置保存成功')
  } catch (error) {
    console.error('保存配置失败:', error)
    message.error(error instanceof Error ? error.message : '保存配置失败')
  } finally {
    saving.value = false
  }
}

function handleAddMaterialMatch() {
  editingMaterialMatchId.value = null
  materialMatchForm.value = {
    douyinAccount: '',
    douyinAccountId: '',
    materialRange: '',
  }
  showMaterialMatchModal.value = true
}

function handleEditMaterialMatch(match: DouyinMaterialMatch) {
  editingMaterialMatchId.value = match.id
  materialMatchForm.value = {
    douyinAccount: match.douyinAccount,
    douyinAccountId: match.douyinAccountId,
    materialRange: match.materialRange,
  }
  showMaterialMatchModal.value = true
}

function handleCancelMaterialMatch() {
  showMaterialMatchModal.value = false
}

function handleSaveMaterialMatch() {
  if (!materialMatchForm.value.douyinAccount.trim()) {
    message.error('请输入抖音号')
    return
  }
  if (!materialMatchForm.value.douyinAccountId.trim()) {
    message.error('请输入抖音号ID')
    return
  }
  if (!materialMatchForm.value.materialRange.trim()) {
    message.error('请输入素材序号')
    return
  }

  const materialPattern = /^\d+(-\d+)?$/
  if (!materialPattern.test(materialMatchForm.value.materialRange.trim())) {
    message.error('素材序号格式不正确，应为"01"或"01-04"格式')
    return
  }

  const now = new Date().toISOString()
  const douyinAccount = materialMatchForm.value.douyinAccount.trim()
  const douyinAccountId = materialMatchForm.value.douyinAccountId.trim()
  const materialRange = materialMatchForm.value.materialRange.trim()

  const duplicated = form.douyinMaterialMatches.find(
    match => match.douyinAccount === douyinAccount && match.id !== editingMaterialMatchId.value
  )
  if (duplicated) {
    message.error('该抖音号已存在')
    return
  }

  if (editingMaterialMatchId.value) {
    const index = form.douyinMaterialMatches.findIndex(
      match => match.id === editingMaterialMatchId.value
    )
    if (index !== -1) {
      form.douyinMaterialMatches[index] = {
        ...form.douyinMaterialMatches[index],
        douyinAccount,
        douyinAccountId,
        materialRange,
        updatedAt: now,
      }
      message.success('更新成功')
    }
  } else {
    form.douyinMaterialMatches.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      douyinAccount,
      douyinAccountId,
      materialRange,
      createdAt: now,
      updatedAt: now,
    })
    message.success('添加成功')
  }

  showMaterialMatchModal.value = false
}

function handleDeleteMaterialMatch(id: string) {
  const index = form.douyinMaterialMatches.findIndex(match => match.id === id)
  if (index !== -1) {
    form.douyinMaterialMatches.splice(index, 1)
    message.success('删除成功')
  }
}

onMounted(() => {
  loadConfig()
})
</script>
