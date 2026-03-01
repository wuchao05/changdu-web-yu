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
        <n-card class="shadow-sm border border-gray-200" :bordered="false">
          <template #header>
            <div class="flex items-center space-x-3">
              <Icon icon="mdi:cookie" class="w-5 h-5 text-gray-600" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900">接口 Cookie</h3>
                <p class="text-sm text-gray-500">模板仅保留常读与巨量两项配置</p>
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
                v-model:value="form.jiliangCookie"
                type="textarea"
                :rows="4"
                placeholder="请输入巨量平台 Cookie"
                class="font-mono text-sm"
              />
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <n-button @click="loadConfig" :disabled="saving">重置</n-button>
              <n-button type="primary" :loading="saving" @click="saveConfig">保存</n-button>
            </div>
          </div>
        </n-card>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useMessage } from 'naive-ui'
import { useApiConfigStore } from '@/stores/apiConfig'

interface AuthConfigResponse {
  tokens?: Record<string, string>
  platforms?: {
    changdu?: {
      cookie?: string
      sr?: { cookie?: string }
      ql?: { cookie?: string }
      mr?: { cookie?: string }
      dr?: { cookie?: string }
    }
    jiliang?: {
      cookie?: string
    }
    ocean?: {
      sr?: string
      ql?: string
      mr?: string
    }
  }
}

const router = useRouter()
const message = useMessage()
const apiConfigStore = useApiConfigStore()

const saving = ref(false)
const form = reactive({
  changduCookie: '',
  jiliangCookie: '',
})

function pickChangduCookie(config: AuthConfigResponse): string {
  return (
    config.platforms?.changdu?.cookie ||
    config.platforms?.changdu?.mr?.cookie ||
    config.platforms?.changdu?.sr?.cookie ||
    ''
  )
}

function pickJiliangCookie(config: AuthConfigResponse): string {
  return config.platforms?.jiliang?.cookie || config.platforms?.ocean?.mr || ''
}

async function loadConfig() {
  try {
    const response = await fetch('/api/auth/config')
    const result = await response.json()
    const data: AuthConfigResponse = result.data || {}

    form.changduCookie = pickChangduCookie(data)
    form.jiliangCookie = pickJiliangCookie(data)
  } catch (error) {
    console.error('加载配置失败:', error)
    message.error('加载配置失败')
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const payload = {
      platforms: {
        changdu: {
          cookie: form.changduCookie,
          sr: { cookie: form.changduCookie },
          ql: { cookie: form.changduCookie },
          mr: { cookie: form.changduCookie },
          dr: { cookie: form.changduCookie },
        },
        jiliang: {
          cookie: form.jiliangCookie,
        },
        ocean: {
          sr: form.jiliangCookie,
          ql: form.jiliangCookie,
          mr: form.jiliangCookie,
        },
      },
    }

    const response = await fetch('/api/auth/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(result.message || '保存失败')
    }

    // 同步到前端 API store，避免必须刷新页面
    apiConfigStore.updateFromAuthConfig({
      tokens: result.data?.tokens,
      platforms: result.data?.platforms,
    })

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
