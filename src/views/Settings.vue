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
              <label class="text-sm font-medium text-gray-700">常读 Cookie</label>
              <n-input
                v-model:value="form.changduCookie"
                type="textarea"
                :rows="4"
                placeholder="请输入常读平台 Cookie"
                class="font-mono text-sm"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">巨量 Cookie</label>
              <n-input
                v-model:value="form.juliangCookie"
                type="textarea"
                :rows="4"
                placeholder="请输入巨量平台 Cookie"
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
              <label class="text-sm font-medium text-gray-700">Appid</label>
              <n-input v-model:value="form.headers.appid" placeholder="请输入 Appid" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">Apptype</label>
              <n-input v-model:value="form.headers.apptype" placeholder="请输入 Apptype" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">DistributorId</label>
              <n-input
                v-model:value="form.headers.distributorId"
                placeholder="请输入 DistributorId"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">AdUserId</label>
              <n-input v-model:value="form.headers.adUserId" placeholder="请输入 AdUserId" />
            </div>
            <div class="space-y-2 md:col-span-2">
              <label class="text-sm font-medium text-gray-700">RootAdUserId</label>
              <n-input
                v-model:value="form.headers.rootAdUserId"
                placeholder="请输入 RootAdUserId"
              />
            </div>
          </div>
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
              <label class="text-sm font-medium text-gray-700">App Token</label>
              <n-input
                v-model:value="form.feishu.app_token"
                placeholder="请输入飞书多维表格 App Token"
                class="font-mono text-sm"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">剧集清单表 ID</label>
              <n-input
                v-model:value="form.feishu.table_ids.drama_list"
                placeholder="请输入剧集清单表 Table ID"
                class="font-mono text-sm"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">剧集状态表 ID</label>
              <n-input
                v-model:value="form.feishu.table_ids.drama_status"
                placeholder="请输入剧集状态表 Table ID"
                class="font-mono text-sm"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">账户表 ID</label>
              <n-input
                v-model:value="form.feishu.table_ids.account"
                placeholder="请输入账户表 Table ID"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useMessage } from 'naive-ui'
import { configApi, type AppConfig } from '@/api/config'

const router = useRouter()
const message = useMessage()

const saving = ref(false)
const form = reactive<AppConfig>({
  changduCookie: '',
  juliangCookie: '',
  headers: {
    appid: '40011566',
    apptype: '7',
    distributorId: '1844565955364887',
    adUserId: '1291245239407612',
    rootAdUserId: '600762415841560',
  },
  feishu: {
    app_token: '',
    table_ids: {
      drama_list: '',
      drama_status: '',
      account: '',
    },
  },
})

async function loadConfig() {
  try {
    const result = await configApi.getConfig()
    if (result.code === 0 && result.data) {
      form.changduCookie = result.data.changduCookie || ''
      form.juliangCookie = result.data.juliangCookie || ''
      form.headers.appid = result.data.headers?.appid || '40011566'
      form.headers.apptype = result.data.headers?.apptype || '7'
      form.headers.distributorId = result.data.headers?.distributorId || '1844565955364887'
      form.headers.adUserId = result.data.headers?.adUserId || '1291245239407612'
      form.headers.rootAdUserId = result.data.headers?.rootAdUserId || '600762415841560'
      form.feishu.app_token = result.data.feishu?.app_token || ''
      form.feishu.table_ids.drama_list = result.data.feishu?.table_ids?.drama_list || ''
      form.feishu.table_ids.drama_status = result.data.feishu?.table_ids?.drama_status || ''
      form.feishu.table_ids.account = result.data.feishu?.table_ids?.account || ''
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

onMounted(() => {
  loadConfig()
})
</script>
