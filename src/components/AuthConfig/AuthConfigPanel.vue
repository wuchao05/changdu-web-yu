<template>
  <div class="auth-config-panel">
    <n-spin :show="loading">
      <n-scrollbar style="max-height: calc(100vh - 120px)">
        <div class="config-content space-y-2">
          <n-card title="🔐 基础认证" class="config-section" :bordered="false">
            <div class="space-y-4">
              <div class="config-item">
                <label class="config-label">常读 Cookie</label>
                <n-input
                  v-model:value="localConfig.changduCookie"
                  type="textarea"
                  :rows="3"
                  placeholder="changduCookie"
                  class="font-mono text-sm"
                />
              </div>
              <div class="config-item">
                <label class="config-label">巨量 Cookie</label>
                <n-input
                  v-model:value="localConfig.juliangCookie"
                  type="textarea"
                  :rows="3"
                  placeholder="juliangCookie"
                  class="font-mono text-sm"
                />
              </div>
            </div>
          </n-card>

          <n-card title="🧾 请求头与搭建配置" class="config-section" :bordered="false">
            <div class="space-y-4">
              <div class="config-item">
                <label class="config-label">appid</label>
                <n-input v-model:value="localConfig.headers.appid" placeholder="headers.appid" />
              </div>
              <div class="config-item">
                <label class="config-label">apptype</label>
                <n-input
                  v-model:value="localConfig.headers.apptype"
                  placeholder="headers.apptype"
                />
              </div>
              <div class="config-item">
                <label class="config-label">distributorId</label>
                <n-input
                  v-model:value="localConfig.headers.distributorId"
                  placeholder="headers.distributorId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">adUserId</label>
                <n-input
                  v-model:value="localConfig.headers.adUserId"
                  placeholder="headers.adUserId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">rootAdUserId</label>
                <n-input
                  v-model:value="localConfig.headers.rootAdUserId"
                  placeholder="headers.rootAdUserId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">secretKey</label>
                <n-input
                  v-model:value="localConfig.buildConfig.secretKey"
                  placeholder="buildConfig.secretKey"
                />
              </div>
              <div class="config-item">
                <label class="config-label">productId</label>
                <n-input
                  v-model:value="localConfig.buildConfig.productId"
                  placeholder="buildConfig.productId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">productPlatformId</label>
                <n-input
                  v-model:value="localConfig.buildConfig.productPlatformId"
                  placeholder="buildConfig.productPlatformId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">landingUrl</label>
                <n-input
                  v-model:value="localConfig.buildConfig.landingUrl"
                  placeholder="buildConfig.landingUrl"
                />
              </div>
              <div class="config-item">
                <label class="config-label">microAppName</label>
                <n-input
                  v-model:value="localConfig.buildConfig.microAppName"
                  placeholder="buildConfig.microAppName"
                />
              </div>
              <div class="config-item">
                <label class="config-label">microAppId</label>
                <n-input
                  v-model:value="localConfig.buildConfig.microAppId"
                  placeholder="buildConfig.microAppId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">ccId</label>
                <n-input
                  v-model:value="localConfig.buildConfig.ccId"
                  placeholder="buildConfig.ccId"
                />
              </div>
              <div class="config-item">
                <label class="config-label">rechargeTemplateId</label>
                <n-input
                  v-model:value="localConfig.buildConfig.rechargeTemplateId"
                  placeholder="buildConfig.rechargeTemplateId"
                />
              </div>
            </div>
          </n-card>

          <n-card title="🗂 飞书配置" class="config-section" :bordered="false">
            <div class="space-y-4">
              <div class="config-item">
                <label class="config-label">app_token</label>
                <n-input
                  v-model:value="localConfig.feishu.app_token"
                  placeholder="feishu.app_token"
                  class="font-mono text-sm"
                />
              </div>
              <div class="config-item">
                <label class="config-label">table_ids.drama_list</label>
                <n-input
                  v-model:value="localConfig.feishu.table_ids.drama_list"
                  placeholder="feishu.table_ids.drama_list"
                />
              </div>
              <div class="config-item">
                <label class="config-label">table_ids.drama_status</label>
                <n-input
                  v-model:value="localConfig.feishu.table_ids.drama_status"
                  placeholder="feishu.table_ids.drama_status"
                />
              </div>
              <div class="config-item">
                <label class="config-label">table_ids.account</label>
                <n-input
                  v-model:value="localConfig.feishu.table_ids.account"
                  placeholder="feishu.table_ids.account"
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
