<template>
  <div class="settings-page min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center space-x-4">
        <n-button text @click="$router.back()" class="!text-gray-500 hover:!text-gray-700">
          <template #icon>
            <Icon icon="mdi:arrow-left" />
          </template>
          返回
        </n-button>
        <h1 class="text-xl font-semibold text-gray-900">达人账号设置</h1>
      </div>
    </header>

    <main class="px-6 py-8">
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- 达人配置 -->
        <n-card class="shadow-sm border border-gray-200">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <Icon icon="mdi:account-music" class="w-5 h-5 text-cyan-600" />
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">达人配置</h3>
                  <p class="text-sm text-gray-500">管理所有达人及其关联的抖音号</p>
                </div>
              </div>
              <n-button type="primary" @click="addDaren">
                <template #icon>
                  <Icon icon="mdi:plus" class="w-4 h-4" />
                </template>
                添加达人
              </n-button>
            </div>
          </template>

          <div v-if="darenList.length === 0" class="text-center py-12">
            <Icon icon="mdi:account-off" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p class="text-gray-500 mb-4">暂无达人配置</p>
            <n-button type="primary" @click="showAddDarenModal = true">
              <template #icon>
                <Icon icon="mdi:plus" class="w-4 h-4" />
              </template>
              添加第一个达人
            </n-button>
          </div>

          <div v-else class="space-y-4">
            <!-- 为每个达人创建一个配置区域 -->
            <div
              v-for="daren in darenList"
              :key="daren.id"
              class="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-cyan-300 transition-colors"
            >
              <div class="space-y-3">
                <!-- 达人信息头部 -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <Icon icon="mdi:account-circle" class="w-6 h-6 text-cyan-500" />
                    <div>
                      <h4 class="text-base font-semibold text-gray-900">{{ daren.label }}</h4>
                      <p class="text-xs text-gray-500">用户ID: {{ daren.id }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <n-button text type="primary" size="small" @click="editDaren(daren)">
                      <template #icon>
                        <Icon icon="mdi:pencil" class="w-4 h-4" />
                      </template>
                      编辑
                    </n-button>
                    <n-button text type="error" size="small" @click="confirmDeleteDaren(daren)">
                      <template #icon>
                        <Icon icon="mdi:delete" class="w-4 h-4" />
                      </template>
                      删除
                    </n-button>
                  </div>
                </div>

                <!-- 抖音号列表 -->
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700">关联的抖音号</label>
                  <n-dynamic-tags
                    :value="daren.douyinAccounts || []"
                    @update:value="(value: string[]) => updateDouyinAccounts(daren.id, value)"
                  />
                  <p class="text-xs text-gray-500">
                    添加或删除抖音号后将自动保存 · 共
                    {{ daren.douyinAccounts?.length || 0 }} 个抖音号
                  </p>
                </div>

                <!-- 功能开关列表 -->
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700">功能权限</label>
                  <div class="flex flex-wrap gap-3">
                    <div class="flex items-center space-x-2">
                      <Icon
                        :icon="
                          daren.enableDramaClipEntry
                            ? 'mdi:check-circle'
                            : 'mdi:close-circle-outline'
                        "
                        :class="[
                          'w-4 h-4',
                          daren.enableDramaClipEntry ? 'text-green-500' : 'text-gray-400',
                        ]"
                      />
                      <span class="text-sm text-gray-700">爆剧爆剪入口</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <Icon
                        :icon="
                          daren.enableMaterialPreview
                            ? 'mdi:check-circle'
                            : 'mdi:close-circle-outline'
                        "
                        :class="[
                          'w-4 h-4',
                          daren.enableMaterialPreview ? 'text-green-500' : 'text-gray-400',
                        ]"
                      />
                      <span class="text-sm text-gray-700">素材预览</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </n-card>

        <!-- 添加/编辑达人弹窗 -->
        <n-modal
          v-model:show="showAddDarenModal"
          preset="dialog"
          :title="editingDaren ? '编辑达人' : '添加达人'"
          positive-text="确定"
          negative-text="取消"
          style="width: 700px"
          @positive-click="handleSaveDaren"
          @update:show="show => !show && resetForm()"
        >
          <n-tabs type="line" animated class="py-4">
            <n-tab-pane name="basic" tab="基础信息">
              <div class="space-y-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700">达人名称</label>
                  <n-input
                    v-model:value="darenForm.label"
                    placeholder="请输入达人名称，如：小熊"
                    :maxlength="20"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700">简称</label>
                  <n-input
                    v-model:value="darenForm.shortName"
                    placeholder="请输入简称，如：xx（用于搭建等场景）"
                    :maxlength="10"
                  />
                  <p class="text-xs text-gray-500">简称用于搭建文件夹命名等场景</p>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700">用户ID</label>
                  <n-input
                    v-model:value="darenForm.id"
                    placeholder="请输入用户ID"
                    :maxlength="50"
                  />
                  <p class="text-xs text-gray-500">
                    用于识别达人的唯一ID，修改后需确保访问链接中的 userid 参数一致
                  </p>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700">抖音号</label>
                  <n-dynamic-tags v-model:value="darenForm.douyinAccounts" />
                  <p class="text-xs text-gray-500">可以稍后在列表中添加和管理抖音号</p>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700">飞书剧集状态表ID（可选）</label>
                  <n-input
                    v-model:value="darenForm.feishuDramaStatusTableId"
                    placeholder="请输入飞书剧集状态表格ID"
                    :maxlength="50"
                  />
                  <p class="text-xs text-gray-500">
                    用于新增商品时查询剧集状态，留空则使用默认表格
                  </p>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700">飞书剧集清单表ID（可选）</label>
                  <n-input
                    v-model:value="darenForm.feishuDramaListTableId"
                    placeholder="请输入飞书剧集清单表格ID"
                    :maxlength="50"
                  />
                  <p class="text-xs text-gray-500">用于查询剧集清单数据，留空则使用默认表格</p>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700">飞书账户表ID（可选）</label>
                  <n-input
                    v-model:value="darenForm.feishuAccountTableId"
                    placeholder="请输入飞书账户表格ID"
                    :maxlength="50"
                  />
                  <p class="text-xs text-gray-500">用于查询账户数据，留空则使用默认表格</p>
                </div>
                <div class="space-y-3">
                  <div class="flex items-center gap-3">
                    <label class="text-sm font-medium text-gray-700">爆剧爆剪入口</label>
                    <n-switch v-model:value="darenForm.enableDramaClipEntry" />
                  </div>
                  <p class="text-xs text-gray-500">启用后，该达人可以访问爆剧爆剪页面</p>
                </div>

                <!-- 素材预览配置 -->
                <div class="space-y-3">
                  <div class="flex items-center gap-3">
                    <label class="text-sm font-medium text-gray-700">素材预览</label>
                    <n-switch v-model:value="darenForm.enableMaterialPreview" />
                  </div>
                  <p class="text-xs text-gray-500">
                    启用后，系统将定时查询飞书剧集状态表并生成素材预览
                  </p>
                </div>

                <!-- 素材预览配置项（仅在开关开启时显示） -->
                <div
                  v-if="darenForm.enableMaterialPreview"
                  class="space-y-4 pl-4 border-l-2 border-cyan-200"
                >
                  <!-- 抖音号列表（只读） -->
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-gray-700">抖音号列表</label>
                    <n-space v-if="darenForm.douyinAccounts && darenForm.douyinAccounts.length > 0">
                      <n-tag
                        v-for="(account, index) in darenForm.douyinAccounts"
                        :key="index"
                        type="info"
                        size="small"
                      >
                        {{ account }}
                      </n-tag>
                    </n-space>
                    <n-empty v-else description="尚未配置抖音号" size="small" class="py-2" />
                    <p class="text-xs text-gray-500">
                      抖音号来自上方"抖音号"配置，如需修改请在基础信息中添加
                    </p>
                  </div>

                  <!-- 轮询间隔时间 -->
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-gray-700">轮询间隔时间（分钟）</label>
                    <n-input-number
                      v-model:value="darenForm.previewIntervalMinutes"
                      :min="20"
                      :max="60"
                      :step="5"
                      placeholder="20-60分钟"
                      class="w-full"
                    />
                    <p class="text-xs text-gray-500">最低 20 分钟，最高 60 分钟</p>
                  </div>

                  <!-- 时间窗口起始 -->
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-gray-700">时间窗口起始（分钟）</label>
                    <n-input-number
                      v-model:value="darenForm.previewBuildTimeWindowStart"
                      :min="1"
                      :step="5"
                      placeholder="默认 90 分钟"
                      class="w-full"
                    />
                    <p class="text-xs text-gray-500">
                      搭建时间窗口的起始时间（相对于当前时间的分钟数）
                    </p>
                  </div>

                  <!-- 时间窗口结束 -->
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-gray-700">时间窗口结束（分钟）</label>
                    <n-input-number
                      v-model:value="darenForm.previewBuildTimeWindowEnd"
                      :min="1"
                      :step="5"
                      placeholder="默认 20 分钟"
                      class="w-full"
                    />
                    <p class="text-xs text-gray-500">
                      搭建时间窗口的结束时间（相对于当前时间的分钟数）
                    </p>
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <n-tab-pane name="material" tab="抖音号素材配置">
              <div class="space-y-4">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <p class="text-sm text-gray-700 font-medium">配置抖音号与素材序号的映射关系</p>
                    <p class="text-xs text-gray-500 mt-1">
                      用于爆剧爆剪提交待下载/待剪辑时自动写入飞书
                    </p>
                  </div>
                  <n-button type="primary" size="small" @click="handleAddMaterialMatch">
                    <template #icon>
                      <Icon icon="mdi:plus" />
                    </template>
                    添加规则
                  </n-button>
                </div>

                <!-- 搜索框 -->
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

                <!-- 匹配规则列表 -->
                <div
                  v-if="filteredMaterialMatches.length > 0"
                  class="space-y-2 max-h-96 overflow-y-auto"
                >
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
              </div>
            </n-tab-pane>
          </n-tabs>
        </n-modal>

        <!-- 添加/编辑素材匹配弹窗 -->
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
                placeholder="例如：小红看剧"
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

        <!-- 数据管理 -->
        <n-card class="shadow-sm border border-gray-200">
          <template #header>
            <div class="flex items-center space-x-3">
              <Icon icon="mdi:database" class="w-5 h-5 text-gray-600" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900">数据管理</h3>
                <p class="text-sm text-gray-500">本地数据清理与重置</p>
              </div>
            </div>
          </template>
          <div class="space-y-4">
            <div
              class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div class="flex items-start space-x-3">
                <Icon icon="mdi:refresh" class="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 class="text-base font-medium text-gray-900">刷新达人配置</h4>
                  <p class="text-sm text-gray-600">
                    从服务器重新加载最新的达人配置（忽略本地缓存）
                  </p>
                </div>
              </div>
              <n-button type="info" size="medium" @click="refreshDarenConfig" class="px-4 py-2">
                <template #icon>
                  <Icon icon="mdi:refresh" class="w-4 h-4" />
                </template>
                刷新配置
              </n-button>
            </div>

            <div
              class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div class="flex items-start space-x-3">
                <Icon icon="mdi:delete-sweep" class="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 class="text-base font-medium text-gray-900">清除缓存数据</h4>
                  <p class="text-sm text-gray-600">清除本地缓存的达人配置（下次访问时重新加载）</p>
                </div>
              </div>
              <n-button type="warning" size="medium" @click="clearCache" class="px-4 py-2">
                <template #icon>
                  <Icon icon="mdi:delete-sweep" class="w-4 h-4" />
                </template>
                清除缓存
              </n-button>
            </div>

            <div
              class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div class="flex items-start space-x-3">
                <Icon icon="mdi:restore" class="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 class="text-base font-medium text-gray-900">重置所有达人配置</h4>
                  <p class="text-sm text-gray-600">清除所有达人的本地选择状态和缓存</p>
                </div>
              </div>
              <n-button type="error" size="medium" @click="resetAllSettings" class="px-4 py-2">
                <template #icon>
                  <Icon icon="mdi:restore" class="w-4 h-4" />
                </template>
                重置配置
              </n-button>
            </div>
          </div>
        </n-card>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import {
  useMessage,
  useDialog,
  NButton,
  NCard,
  NDynamicTags,
  NModal,
  NInput,
  NInputNumber,
  NTabs,
  NTabPane,
  NSwitch,
  NPopconfirm,
  NEmpty,
  NSpace,
  NTag,
} from 'naive-ui'
import { useDataStore } from '@/stores/data'
import { useDarenStore, type DarenInfo } from '@/stores/daren'
import type { DouyinMaterialMatch } from '@/api/daren'
import { startPreview, stopPreview, getPreviewStatus } from '@/api/previewManager'

defineOptions({
  name: 'DarenSettingsPage',
})

const message = useMessage()
const dialog = useDialog()
const dataStore = useDataStore()
const darenStore = useDarenStore()

// 达人列表（从 store 中获取）
const darenList = computed(() => darenStore.darenList)

// 添加/编辑达人弹窗
const showAddDarenModal = ref(false)
const editingDaren = ref<DarenInfo | null>(null)
const darenForm = ref<DarenInfo>({
  id: '',
  label: '',
  shortName: '',
  douyinAccounts: [],
  feishuDramaStatusTableId: '',
  feishuDramaListTableId: '',
  feishuAccountTableId: '',
  enableDramaClipEntry: false,
  douyinMaterialMatches: [],
  enableMaterialPreview: false,
  previewIntervalMinutes: 20,
  previewBuildTimeWindowStart: 90,
  previewBuildTimeWindowEnd: 20,
})

// 抖音号素材配置相关
const materialSearchKeyword = ref('')
const showMaterialMatchModal = ref(false)
const editingMaterialMatchId = ref<string | null>(null)
const materialMatchForm = ref({
  douyinAccount: '',
  douyinAccountId: '',
  materialRange: '',
})

// 过滤后的素材匹配
const filteredMaterialMatches = computed(() => {
  const matches = darenForm.value.douyinMaterialMatches || []
  if (!materialSearchKeyword.value) {
    return matches
  }
  return matches.filter(m =>
    m.douyinAccount.toLowerCase().includes(materialSearchKeyword.value.toLowerCase())
  )
})

/**
 * 重置表单
 */
function resetForm() {
  darenForm.value = {
    id: '',
    label: '',
    shortName: '',
    douyinAccounts: [],
    feishuDramaStatusTableId: '',
    feishuDramaListTableId: '',
    feishuAccountTableId: '',
    enableDramaClipEntry: false,
    douyinMaterialMatches: [],
    enableMaterialPreview: false,
    previewIntervalMinutes: 20,
    previewBuildTimeWindowStart: 90,
    previewBuildTimeWindowEnd: 20,
  }
  editingDaren.value = null
  materialSearchKeyword.value = ''
}

/**
 * 添加达人
 */
function addDaren() {
  resetForm()
  showAddDarenModal.value = true
}

/**
 * 编辑达人
 */
async function editDaren(daren: DarenInfo) {
  editingDaren.value = daren
  darenForm.value = {
    ...daren,
    douyinAccounts: [...(daren.douyinAccounts || [])],
    douyinMaterialMatches: [...(daren.douyinMaterialMatches || [])],
    enableMaterialPreview: daren.enableMaterialPreview ?? false,
    previewIntervalMinutes: daren.previewIntervalMinutes ?? 20,
    previewBuildTimeWindowStart: daren.previewBuildTimeWindowStart ?? 90,
    previewBuildTimeWindowEnd: daren.previewBuildTimeWindowEnd ?? 20,
  }
  showAddDarenModal.value = true

  // 从远程查询预览状态，同步开关和配置
  if (daren.shortName) {
    try {
      const statusRes = await getPreviewStatus(daren.shortName)
      const program = statusRes.programs?.[0]
      if (program) {
        isAutoResetting = true
        darenForm.value.enableMaterialPreview = program.enabled
        if (program.intervalMinutes)
          darenForm.value.previewIntervalMinutes = program.intervalMinutes
        if (program.buildTimeWindowStart)
          darenForm.value.previewBuildTimeWindowStart = program.buildTimeWindowStart
        if (program.buildTimeWindowEnd)
          darenForm.value.previewBuildTimeWindowEnd = program.buildTimeWindowEnd
        setTimeout(() => {
          isAutoResetting = false
        }, 100)
      }
    } catch (error) {
      console.error('查询预览状态失败:', error)
    }
  }
}

/**
 * 添加抖音号素材匹配规则
 */
function handleAddMaterialMatch() {
  editingMaterialMatchId.value = null
  materialMatchForm.value = {
    douyinAccount: '',
    douyinAccountId: '',
    materialRange: '',
  }
  showMaterialMatchModal.value = true
}

/**
 * 编辑抖音号素材匹配规则
 */
function handleEditMaterialMatch(match: DouyinMaterialMatch) {
  editingMaterialMatchId.value = match.id
  materialMatchForm.value = {
    douyinAccount: match.douyinAccount,
    douyinAccountId: match.douyinAccountId,
    materialRange: match.materialRange,
  }
  showMaterialMatchModal.value = true
}

/**
 * 保存抖音号素材匹配规则
 */
async function handleSaveMaterialMatch() {
  // 验证
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

  // 验证素材序号格式
  const materialPattern = /^\d+(-\d+)?$/
  if (!materialPattern.test(materialMatchForm.value.materialRange.trim())) {
    message.error('素材序号格式不正确，应为"01"或"01-04"格式')
    return
  }

  if (!darenForm.value.douyinMaterialMatches) {
    darenForm.value.douyinMaterialMatches = []
  }

  if (editingMaterialMatchId.value) {
    // 更新
    const index = darenForm.value.douyinMaterialMatches.findIndex(
      m => m.id === editingMaterialMatchId.value
    )
    if (index !== -1) {
      darenForm.value.douyinMaterialMatches[index] = {
        ...darenForm.value.douyinMaterialMatches[index],
        douyinAccount: materialMatchForm.value.douyinAccount.trim(),
        douyinAccountId: materialMatchForm.value.douyinAccountId.trim(),
        materialRange: materialMatchForm.value.materialRange.trim(),
        updatedAt: new Date().toISOString(),
      }
      message.success('更新成功')
    }
  } else {
    // 添加
    const newMatch: DouyinMaterialMatch = {
      id: Date.now().toString(),
      douyinAccount: materialMatchForm.value.douyinAccount.trim(),
      douyinAccountId: materialMatchForm.value.douyinAccountId.trim(),
      materialRange: materialMatchForm.value.materialRange.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    darenForm.value.douyinMaterialMatches.push(newMatch)
    message.success('添加成功')
  }

  showMaterialMatchModal.value = false
}

/**
 * 取消编辑抖音号素材匹配规则
 */
function handleCancelMaterialMatch() {
  showMaterialMatchModal.value = false
}

/**
 * 删除抖音号素材匹配规则
 */
async function handleDeleteMaterialMatch(id: string) {
  if (!darenForm.value.douyinMaterialMatches) {
    return
  }
  const index = darenForm.value.douyinMaterialMatches.findIndex(m => m.id === id)
  if (index !== -1) {
    darenForm.value.douyinMaterialMatches.splice(index, 1)
    message.success('删除成功')
  }
}

/**
 * 保存达人（添加或编辑）
 */
async function handleSaveDaren() {
  // 验证
  if (!darenForm.value.label.trim()) {
    message.error('请输入达人名称')
    return false
  }
  if (!darenForm.value.shortName.trim()) {
    message.error('请输入简称')
    return false
  }
  if (!darenForm.value.id.trim()) {
    message.error('请输入用户ID')
    return false
  }

  try {
    // 如果启用了素材预览，调用启动接口
    if (darenForm.value.enableMaterialPreview) {
      const awemeList = darenForm.value.douyinAccounts || []
      if (awemeList.length === 0) {
        message.error('启用素材预览需要先配置抖音号')
        return false
      }
      try {
        const result = await startPreview({
          user: darenForm.value.shortName,
          intervalMinutes: darenForm.value.previewIntervalMinutes || 20,
          buildTimeWindowStart: darenForm.value.previewBuildTimeWindowStart || 90,
          buildTimeWindowEnd: darenForm.value.previewBuildTimeWindowEnd || 20,
          subject: '欣雅',
          aweme_white_list: awemeList,
        })
        message.success(result.message || '预览程序已启用')
      } catch (error: any) {
        const errMsg = error?.response?.data?.error || error?.response?.data?.message || ''
        if (errMsg.includes('已在运行中')) {
          message.info(errMsg)
        } else {
          console.error('启动预览程序失败:', error)
          message.error('启动预览程序失败，但配置将继续保存')
        }
        // 继续保存配置，不中断流程
      }
    }

    if (editingDaren.value) {
      // 编辑模式
      await darenStore.updateDaren(editingDaren.value.id, darenForm.value)
      message.success(`${darenForm.value.label} 的信息已更新`)
    } else {
      // 添加模式
      await darenStore.addDaren(darenForm.value)
      message.success(`已添加达人：${darenForm.value.label}`)
    }
    resetForm()
    showAddDarenModal.value = false
    return true
  } catch (error) {
    message.error(error instanceof Error ? error.message : '操作失败')
    return false
  }
}

/**
 * 确认删除达人
 */
async function confirmDeleteDaren(daren: DarenInfo) {
  try {
    await new Promise<void>((resolve, reject) => {
      dialog.error({
        title: '确认删除',
        content: `确定要删除达人"${daren.label}"吗？此操作不可撤销。`,
        positiveText: '确定删除',
        negativeText: '取消',
        onPositiveClick: () => resolve(),
        onNegativeClick: () => reject(),
      })
    })

    await darenStore.deleteDaren(daren.id)
    message.success(`已删除达人：${daren.label}`)
  } catch (error) {
    // 用户取消或删除失败
    if (error && error instanceof Error) {
      message.error(error.message)
    }
  }
}

/**
 * 更新达人的抖音号
 */
async function updateDouyinAccounts(userId: string, accounts: string[]) {
  try {
    await darenStore.updateDaren(userId, { douyinAccounts: accounts })
    const daren = darenStore.findDarenByUserId(userId)
    if (daren) {
      message.success(`${daren.label}的抖音号已更新`)
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '更新失败')
  }
}

/**
 * 刷新达人配置（强制从服务器加载）
 */
async function refreshDarenConfig() {
  try {
    await darenStore.refreshDarenList()
    message.success('达人配置已刷新')
  } catch {
    message.error('刷新配置失败')
  }
}

/**
 * 清除缓存数据
 */
function clearCache() {
  darenStore.clearCache()
  dataStore.clearAllData()
  message.success('缓存数据已清除')
}

/**
 * 重置所有达人配置
 */
async function resetAllSettings() {
  try {
    await new Promise<void>((resolve, reject) => {
      dialog.error({
        title: '确认重置',
        content: '确定要删除所有达人配置吗？此操作不可撤销，将清空所有达人信息。',
        positiveText: '确定重置',
        negativeText: '取消',
        onPositiveClick: () => resolve(),
        onNegativeClick: () => reject(),
      })
    })

    darenStore.reset()
    message.success('所有达人配置已清空')
  } catch {
    // 用户取消
  }
}

/**
 * 停用素材预览程序
 */
async function handleStopPreview() {
  if (!darenForm.value.shortName) {
    return
  }
  try {
    const result = await stopPreview({ user: darenForm.value.shortName })
    message.success(result.message || '预览程序已停用')
  } catch (error) {
    console.error('停用预览程序失败:', error)
    message.error('停用预览程序失败')
  }
}

// 标志：是否正在自动重置开关（避免验证失败时触发停用接口）
let isAutoResetting = false

// 监听素材预览开关变化
watch(
  () => darenForm.value.enableMaterialPreview,
  async (newVal, oldVal) => {
    if (newVal && !oldVal) {
      // 开启前验证
      const awemeList = darenForm.value.douyinAccounts || []
      if (awemeList.length === 0) {
        message.warning('请先在基础信息中完善抖音号配置')
        // 标记为自动重置，延迟重置开关
        isAutoResetting = true
        setTimeout(() => {
          darenForm.value.enableMaterialPreview = false
          // 重置完成后清除标志
          setTimeout(() => {
            isAutoResetting = false
          }, 100)
        }, 0)
        return
      }
    } else if (!newVal && oldVal) {
      // 如果是自动重置，不调用停用接口
      if (isAutoResetting) {
        return
      }
      // 用户手动关闭开关时，立即调用停用接口
      await handleStopPreview()
    }
  }
)

onMounted(async () => {
  await darenStore.loadFromServer()
})
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
}

:deep(.n-card .n-card-header) {
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.n-card .n-card__content) {
  padding: 16px 20px;
}

/* 自定义配置的达人区域添加高亮边框 */
:deep(.custom-config) {
  border-color: #06b6d4 !important;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .settings-page {
    padding: 0 16px;
  }
}
</style>
