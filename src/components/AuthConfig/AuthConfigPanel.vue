<template>
  <div class="auth-config-panel">
    <n-spin :show="loading">
      <n-scrollbar style="max-height: calc(100vh - 120px)">
        <div class="config-content">
          <!-- Tokens 配置 -->
          <n-card title="🔑 Token 配置" class="config-section" :bordered="false">
            <div class="space-y-4">
              <div class="config-item">
                <label class="config-label">
                  <span>散柔/牵龙 XT Token</span>
                  <n-tag size="small" type="info">xh</n-tag>
                </label>
                <n-input
                  v-model:value="localConfig.tokens.xh"
                  type="textarea"
                  :rows="2"
                  placeholder="用于散柔和牵龙的形天系统 token"
                  class="font-mono text-sm"
                />
              </div>

              <div class="config-item">
                <label class="config-label">
                  <span>达人 XT Token</span>
                  <n-tag size="small" type="success">daren</n-tag>
                </label>
                <n-input
                  v-model:value="localConfig.tokens.daren"
                  type="textarea"
                  :rows="2"
                  placeholder="用于达人的形天系统 token"
                  class="font-mono text-sm"
                />
              </div>
            </div>
          </n-card>

          <!-- Users 配置 -->
          <n-card title="👤 用户配置" class="config-section" :bordered="false">
            <div class="config-item">
              <label class="config-label">
                <span>管理员用户 ID</span>
                <n-tag size="small" type="warning">admin</n-tag>
              </label>
              <n-input
                v-model:value="localConfig.users.admin"
                placeholder="管理员用户 ID"
                class="font-mono text-sm"
              />
              <p class="config-hint">用于身份识别和权限控制</p>
            </div>
          </n-card>

          <!-- 常读平台配置 -->
          <n-card title="📱 常读平台配置" class="config-section" :bordered="false">
            <n-tabs type="line" animated>
              <!-- 散柔 -->
              <n-tab-pane name="sr" tab="散柔">
                <div class="space-y-4">
                  <div class="config-item">
                    <label class="config-label">Cookie</label>
                    <n-input
                      v-model:value="localConfig.platforms.changdu.sr.cookie"
                      type="textarea"
                      :rows="3"
                      placeholder="散柔账号的 Cookie"
                      class="font-mono text-sm"
                    />
                  </div>
                  <div class="config-item">
                    <label class="config-label">Distributor ID</label>
                    <n-input
                      v-model:value="localConfig.platforms.changdu.sr.distributorId"
                      placeholder="1842865091654731"
                      class="font-mono text-sm"
                    />
                  </div>
                </div>
              </n-tab-pane>

              <!-- 牵龙 -->
              <n-tab-pane name="ql" tab="牵龙">
                <div class="space-y-4">
                  <div class="config-item">
                    <label class="config-label">Cookie</label>
                    <n-input
                      v-model:value="localConfig.platforms.changdu.ql.cookie"
                      type="textarea"
                      :rows="3"
                      placeholder="牵龙账号的 Cookie"
                      class="font-mono text-sm"
                    />
                  </div>
                  <div class="config-item">
                    <label class="config-label">Distributor ID</label>
                    <n-input
                      v-model:value="localConfig.platforms.changdu.ql.distributorId"
                      placeholder="1841142223098969"
                      class="font-mono text-sm"
                    />
                  </div>
                </div>
              </n-tab-pane>

              <!-- 每日 -->
              <n-tab-pane name="mr" tab="每日">
                <div class="space-y-4">
                  <div class="config-item">
                    <label class="config-label">Cookie</label>
                    <n-input
                      v-model:value="localConfig.platforms.changdu.mr.cookie"
                      type="textarea"
                      :rows="3"
                      placeholder="每日账号的 Cookie"
                      class="font-mono text-sm"
                    />
                  </div>
                  <div class="config-item">
                    <label class="config-label">Distributor ID</label>
                    <n-input
                      v-model:value="localConfig.headers.distributorId"
                      placeholder="1844565955364887"
                      class="font-mono text-sm"
                    />
                  </div>
                </div>
              </n-tab-pane>

              <!-- 达人 -->
              <n-tab-pane name="dr" tab="达人">
                <div class="space-y-4">
                  <div class="config-item">
                    <label class="config-label">Cookie</label>
                    <n-input
                      v-model:value="localConfig.platforms.changdu.dr.cookie"
                      type="textarea"
                      :rows="3"
                      placeholder="达人账号的 Cookie"
                      class="font-mono text-sm"
                    />
                  </div>
                  <div class="config-item">
                    <label class="config-label">Distributor ID</label>
                    <n-input
                      v-model:value="localConfig.platforms.changdu.dr.distributorId"
                      placeholder="1841149910426777"
                      class="font-mono text-sm"
                    />
                  </div>
                </div>
              </n-tab-pane>
            </n-tabs>
          </n-card>

          <!-- 巨量配置 -->
          <n-card title="📊 巨量配置" class="config-section" :bordered="false">
            <div class="space-y-4">
              <div class="config-item">
                <label class="config-label">散柔巨量 Cookie（超琦）</label>
                <n-input
                  v-model:value="localConfig.platforms.ocean.sr"
                  type="textarea"
                  :rows="2"
                  placeholder="散柔（超琦）的巨量 Cookie"
                  class="font-mono text-sm"
                />
              </div>
              <div class="config-item">
                <label class="config-label">牵龙巨量 Cookie（欣雅）</label>
                <n-input
                  v-model:value="localConfig.platforms.ocean.ql"
                  type="textarea"
                  :rows="2"
                  placeholder="牵龙（欣雅）的巨量 Cookie"
                  class="font-mono text-sm"
                />
              </div>
              <div class="config-item">
                <label class="config-label">每日巨量 Cookie</label>
                <n-input
                  v-model:value="localConfig.platforms.ocean.mr"
                  type="textarea"
                  :rows="2"
                  placeholder="每日的巨量 Cookie"
                  class="font-mono text-sm"
                />
              </div>
            </div>
          </n-card>

          <!-- ADX 配置 -->
          <n-card title="🎯 ADX 配置" class="config-section" :bordered="false">
            <div class="config-item">
              <label class="config-label">ADX Cookie</label>
              <n-input
                v-model:value="localConfig.platforms.adx.cookie"
                type="textarea"
                :rows="2"
                placeholder="ADX 平台的 Cookie"
                class="font-mono text-sm"
              />
            </div>
          </n-card>
        </div>
      </n-scrollbar>

      <!-- 底部操作栏 -->
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
import {
  NCard,
  NInput,
  NButton,
  NSpace,
  NTag,
  NTabs,
  NTabPane,
  NSpin,
  NScrollbar,
  useMessage,
} from 'naive-ui'

interface AuthConfig {
  tokens: {
    xh: string
    daren: string
  }
  users: {
    admin: string
  }
  headers: {
    distributorId: string
    adUserId: string
    rootAdUserId: string
  }
  platforms: {
    changdu: {
      sr: { cookie: string; distributorId: string }
      ql: { cookie: string; distributorId: string }
      mr: { cookie: string; distributorId: string }
      dr: { cookie: string; distributorId: string }
    }
    ocean: {
      sr: string
      ql: string
      mr: string
    }
    adx: {
      cookie: string
    }
  }
}

defineEmits<{
  close: []
}>()

const message = useMessage()
const loading = ref(false)
const saving = ref(false)

const localConfig = ref<AuthConfig>({
  tokens: { xh: '', daren: '' },
  users: { admin: '' },
  headers: {
    distributorId: '',
    adUserId: '',
    rootAdUserId: '',
  },
  platforms: {
    changdu: {
      sr: { cookie: '', distributorId: '' },
      ql: { cookie: '', distributorId: '' },
      mr: { cookie: '', distributorId: '' },
      dr: { cookie: '', distributorId: '' },
    },
    ocean: { sr: '', ql: '', mr: '' },
    adx: { cookie: '' },
  },
})

const originalConfig = ref<AuthConfig | null>(null)

async function loadConfig() {
  loading.value = true
  try {
    const response = await fetch('/api/auth/config')
    const { data } = await response.json()
    if (data) {
      // 深拷贝并确保所有字段都是字符串
      const normalizeConfig = (config: any): AuthConfig => {
        return {
          tokens: {
            xh: config.tokens?.xh || '',
            daren: config.tokens?.daren || '',
          },
          users: {
            admin: config.users?.admin || '',
          },
          headers: {
            distributorId:
              config.headers?.distributorId || config.platforms?.changdu?.mr?.distributorId || '',
            adUserId: config.headers?.adUserId || config.platforms?.changdu?.mr?.adUserId || '',
            rootAdUserId:
              config.headers?.rootAdUserId || config.platforms?.changdu?.mr?.rootAdUserId || '',
          },
          platforms: {
            changdu: {
              sr: {
                cookie: config.platforms?.changdu?.sr?.cookie || '',
                distributorId: config.platforms?.changdu?.sr?.distributorId || '',
              },
              ql: {
                cookie: config.platforms?.changdu?.ql?.cookie || '',
                distributorId: config.platforms?.changdu?.ql?.distributorId || '',
              },
              mr: {
                cookie: config.platforms?.changdu?.mr?.cookie || '',
                distributorId: config.headers?.distributorId || '',
              },
              dr: {
                cookie: config.platforms?.changdu?.dr?.cookie || '',
                distributorId: config.platforms?.changdu?.dr?.distributorId || '',
              },
            },
            ocean: {
              sr:
                typeof config.platforms?.ocean?.sr === 'string'
                  ? config.platforms.ocean.sr
                  : config.platforms?.ocean?.sr?.cookie || '',
              ql:
                typeof config.platforms?.ocean?.ql === 'string'
                  ? config.platforms.ocean.ql
                  : config.platforms?.ocean?.ql?.cookie || '',
              mr:
                typeof config.platforms?.ocean?.mr === 'string'
                  ? config.platforms.ocean.mr
                  : config.platforms?.ocean?.mr?.cookie || '',
            },
            adx: {
              cookie: config.platforms?.adx?.cookie || '',
            },
          },
        }
      }

      localConfig.value = normalizeConfig(data)
      originalConfig.value = normalizeConfig(data)
    }
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
    const response = await fetch('/api/auth/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localConfig.value),
    })

    const result = await response.json()
    if (result.code === 0) {
      message.success('配置保存成功')
      originalConfig.value = JSON.parse(JSON.stringify(localConfig.value))
      // 刷新页面以应用新配置
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
  if (originalConfig.value) {
    localConfig.value = JSON.parse(JSON.stringify(originalConfig.value))
    message.info('已重置为原始配置')
  }
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

/* .config-section :deep(.n-card__content) { */
/*   padding: 12px; */
/* } */

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

.config-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
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
