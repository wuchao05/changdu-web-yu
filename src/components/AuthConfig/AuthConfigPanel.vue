<template>
  <div class="auth-config-panel">
    <n-spin :show="loading">
      <n-scrollbar style="max-height: calc(100vh - 120px)">
        <div class="config-content space-y-2">
          <n-card title="🔐 基础认证" class="config-section" :bordered="false">
            <div class="space-y-4">
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.changduCookie }}</label>
                <n-input
                  v-model:value="localConfig.changduCookie"
                  type="textarea"
                  :rows="3"
                  :placeholder="CONFIG_PLACEHOLDERS.changduCookie"
                  class="font-mono text-sm"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.juliangCookie }}</label>
                <n-input
                  v-model:value="localConfig.juliangCookie"
                  type="textarea"
                  :rows="3"
                  :placeholder="CONFIG_PLACEHOLDERS.juliangCookie"
                  class="font-mono text-sm"
                />
              </div>
            </div>
          </n-card>

          <n-card title="🧾 请求头与搭建配置" class="config-section" :bordered="false">
            <div class="space-y-4">
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.headers.appid }}</label>
                <n-input
                  v-model:value="localConfig.headers.appid"
                  :placeholder="CONFIG_PLACEHOLDERS.headers.appid"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.headers.apptype }}</label>
                <n-input
                  v-model:value="localConfig.headers.apptype"
                  :placeholder="CONFIG_PLACEHOLDERS.headers.apptype"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.headers.distributorId }}</label>
                <n-input
                  v-model:value="localConfig.headers.distributorId"
                  :placeholder="CONFIG_PLACEHOLDERS.headers.distributorId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.headers.adUserId }}</label>
                <n-input
                  v-model:value="localConfig.headers.adUserId"
                  :placeholder="CONFIG_PLACEHOLDERS.headers.adUserId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.headers.rootAdUserId }}</label>
                <n-input
                  v-model:value="localConfig.headers.rootAdUserId"
                  :placeholder="CONFIG_PLACEHOLDERS.headers.rootAdUserId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.buildConfig.secretKey }}</label>
                <n-input
                  v-model:value="localConfig.buildConfig.secretKey"
                  :placeholder="CONFIG_PLACEHOLDERS.buildConfig.secretKey"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.buildConfig.source }}</label>
                <n-input
                  v-model:value="localConfig.buildConfig.source"
                  :placeholder="CONFIG_PLACEHOLDERS.buildConfig.source"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.buildConfig.bid }}</label>
                <n-input
                  v-model:value="localConfig.buildConfig.bid"
                  :placeholder="CONFIG_PLACEHOLDERS.buildConfig.bid"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.buildConfig.productId }}</label>
                <n-input
                  v-model:value="localConfig.buildConfig.productId"
                  :placeholder="CONFIG_PLACEHOLDERS.buildConfig.productId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{
                  CONFIG_LABELS.buildConfig.productPlatformId
                }}</label>
                <n-input
                  v-model:value="localConfig.buildConfig.productPlatformId"
                  :placeholder="CONFIG_PLACEHOLDERS.buildConfig.productPlatformId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.buildConfig.landingUrl }}</label>
                <n-input
                  v-model:value="localConfig.buildConfig.landingUrl"
                  :placeholder="CONFIG_PLACEHOLDERS.buildConfig.landingUrl"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.buildConfig.microAppName }}</label>
                <n-input
                  v-model:value="localConfig.buildConfig.microAppName"
                  :placeholder="CONFIG_PLACEHOLDERS.buildConfig.microAppName"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.buildConfig.microAppId }}</label>
                <n-input
                  v-model:value="localConfig.buildConfig.microAppId"
                  :placeholder="CONFIG_PLACEHOLDERS.buildConfig.microAppId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.buildConfig.ccId }}</label>
                <n-input
                  v-model:value="localConfig.buildConfig.ccId"
                  :placeholder="CONFIG_PLACEHOLDERS.buildConfig.ccId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{
                  CONFIG_LABELS.buildConfig.rechargeTemplateId
                }}</label>
                <n-input
                  v-model:value="localConfig.buildConfig.rechargeTemplateId"
                  :placeholder="CONFIG_PLACEHOLDERS.buildConfig.rechargeTemplateId"
                />
              </div>
            </div>
          </n-card>

          <n-card title="🗂 飞书配置" class="config-section" :bordered="false">
            <div class="space-y-4">
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.feishu.appToken }}</label>
                <n-input
                  v-model:value="localConfig.feishu.app_token"
                  :placeholder="CONFIG_PLACEHOLDERS.feishu.appToken"
                  class="font-mono text-sm"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.feishu.dramaListTableId }}</label>
                <n-input
                  v-model:value="localConfig.feishu.table_ids.drama_list"
                  :placeholder="CONFIG_PLACEHOLDERS.feishu.dramaListTableId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.feishu.dramaStatusTableId }}</label>
                <n-input
                  v-model:value="localConfig.feishu.table_ids.drama_status"
                  :placeholder="CONFIG_PLACEHOLDERS.feishu.dramaStatusTableId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">{{ CONFIG_LABELS.feishu.accountTableId }}</label>
                <n-input
                  v-model:value="localConfig.feishu.table_ids.account"
                  :placeholder="CONFIG_PLACEHOLDERS.feishu.accountTableId"
                />
              </div>
            </div>
          </n-card>
        </div>
      </n-scrollbar>

      <div class="action-bar">
        <n-space justify="space-between">
          <n-button @click="handleReset" :disabled="saving">
            <template #icon>
              <Icon icon="mdi:refresh" />
            </template>
            重置
          </n-button>
          <n-space>
            <n-button @click="$emit('close')">取消</n-button>
            <n-button type="primary" :loading="saving" @click="handleSave">
              <template #icon>
                <Icon icon="mdi:content-save" />
              </template>
              保存配置
            </n-button>
          </n-space>
        </n-space>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { NCard, NInput, NButton, NSpace, NSpin, NScrollbar, useMessage } from 'naive-ui'
import { CONFIG_LABELS, CONFIG_PLACEHOLDERS } from '@/constants/configLabels'

interface AuthConfig {
  changduCookie: string
  juliangCookie: string
  headers: {
    appid: string
    apptype: string
    distributorId: string
    adUserId: string
    rootAdUserId: string
  }
  buildConfig: {
    secretKey: string
    source: string
    bid: string
    productId: string
    productPlatformId: string
    landingUrl: string
    microAppName: string
    microAppId: string
    ccId: string
    rechargeTemplateId: string
  }
  feishu: {
    app_token: string
    table_ids: {
      drama_list: string
      drama_status: string
      account: string
    }
  }
  douyinMaterialMatches: unknown[]
}

defineEmits<{ close: [] }>()

const message = useMessage()
const loading = ref(false)
const saving = ref(false)

const createEmptyConfig = (): AuthConfig => ({
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

const localConfig = ref<AuthConfig>(createEmptyConfig())
const originalConfig = ref<AuthConfig | null>(null)

const normalizeConfig = (config: any): AuthConfig => ({
  changduCookie: typeof config?.changduCookie === 'string' ? config.changduCookie : '',
  juliangCookie: typeof config?.juliangCookie === 'string' ? config.juliangCookie : '',
  headers: {
    appid: typeof config?.headers?.appid === 'string' ? config.headers.appid : '',
    apptype: typeof config?.headers?.apptype === 'string' ? config.headers.apptype : '',
    distributorId:
      typeof config?.headers?.distributorId === 'string' ? config.headers.distributorId : '',
    adUserId: typeof config?.headers?.adUserId === 'string' ? config.headers.adUserId : '',
    rootAdUserId:
      typeof config?.headers?.rootAdUserId === 'string' ? config.headers.rootAdUserId : '',
  },
  buildConfig: {
    secretKey:
      typeof config?.buildConfig?.secretKey === 'string' ? config.buildConfig.secretKey : '',
    source: typeof config?.buildConfig?.source === 'string' ? config.buildConfig.source : '',
    bid: typeof config?.buildConfig?.bid === 'string' ? config.buildConfig.bid : '2',
    productId:
      typeof config?.buildConfig?.productId === 'string' ? config.buildConfig.productId : '',
    productPlatformId:
      typeof config?.buildConfig?.productPlatformId === 'string'
        ? config.buildConfig.productPlatformId
        : '',
    landingUrl:
      typeof config?.buildConfig?.landingUrl === 'string' ? config.buildConfig.landingUrl : '',
    microAppName:
      typeof config?.buildConfig?.microAppName === 'string' ? config.buildConfig.microAppName : '',
    microAppId:
      typeof config?.buildConfig?.microAppId === 'string' ? config.buildConfig.microAppId : '',
    ccId: typeof config?.buildConfig?.ccId === 'string' ? config.buildConfig.ccId : '',
    rechargeTemplateId:
      typeof config?.buildConfig?.rechargeTemplateId === 'string'
        ? config.buildConfig.rechargeTemplateId
        : '',
  },
  feishu: {
    app_token: typeof config?.feishu?.app_token === 'string' ? config.feishu.app_token : '',
    table_ids: {
      drama_list:
        typeof config?.feishu?.table_ids?.drama_list === 'string'
          ? config.feishu.table_ids.drama_list
          : '',
      drama_status:
        typeof config?.feishu?.table_ids?.drama_status === 'string'
          ? config.feishu.table_ids.drama_status
          : '',
      account:
        typeof config?.feishu?.table_ids?.account === 'string'
          ? config.feishu.table_ids.account
          : '',
    },
  },
  douyinMaterialMatches: Array.isArray(config?.douyinMaterialMatches)
    ? config.douyinMaterialMatches
    : [],
})

async function loadConfig() {
  loading.value = true
  try {
    const response = await fetch('/api/auth/config')
    const { data } = await response.json()
    const normalized = normalizeConfig(data)
    localConfig.value = normalized
    originalConfig.value = JSON.parse(JSON.stringify(normalized))
  } catch (error) {
    message.error('加载配置失败')
    console.error('加载配置失败:', error)
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    const payload = {
      changduCookie: localConfig.value.changduCookie,
      juliangCookie: localConfig.value.juliangCookie,
      headers: localConfig.value.headers,
      buildConfig: localConfig.value.buildConfig,
      feishu: localConfig.value.feishu,
      douyinMaterialMatches: localConfig.value.douyinMaterialMatches,
    }

    const response = await fetch('/api/auth/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    if (result.code === 0) {
      message.success('配置保存成功')
      originalConfig.value = JSON.parse(JSON.stringify(localConfig.value))
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } else {
      message.error(`保存失败: ${result.message}`)
    }
  } catch (error) {
    message.error('保存配置失败')
    console.error('保存配置失败:', error)
  } finally {
    saving.value = false
  }
}

function handleReset() {
  if (!originalConfig.value) return
  localConfig.value = JSON.parse(JSON.stringify(originalConfig.value))
  message.info('已重置为原始配置')
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.auth-config-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.config-section {
  margin-bottom: 8px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-item {
  margin-bottom: 12px;
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.action-bar {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

.space-y-4 > * + * {
  margin-top: 12px;
}
</style>
