<template>
  <n-drawer v-model:show="visible" :width="480" placement="right">
    <n-drawer-content>
      <template #header>
        <div
          style="display: flex; align-items: center; justify-content: space-between; width: 100%"
        >
          <span>ADX 榜单</span>
          <n-button v-if="!unauthorized" size="small" @click="showCookieModal = true"
            >配置 Cookie</n-button
          >
        </div>
      </template>

      <!-- 401 未授权：全屏提示 -->
      <div v-if="unauthorized" class="unauthorized-tip">
        <div class="unauthorized-icon">
          <svg
            viewBox="0 0 24 24"
            width="48"
            height="48"
            fill="none"
            stroke="#f59e0b"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <p class="unauthorized-title">ADX 账号已下线</p>
        <p class="unauthorized-desc">请联系管理员更新 Cookie</p>
        <n-button type="warning" style="margin-top: 20px" @click="showCookieModal = true">
          去配置 Cookie
        </n-button>
      </div>

      <!-- 正常内容 -->
      <template v-else>
        <n-tabs v-model:value="activeTab" type="line" @update:value="handleTabChange">
          <n-tab-pane name="day" tab="ADX 日榜">
            <div class="mb-3">
              <n-date-picker
                v-model:value="dayTimestamp"
                type="date"
                size="small"
                class="w-full"
                :is-date-disabled="disableFutureDate"
                @update:value="fetchRanking"
              />
            </div>
          </n-tab-pane>
          <n-tab-pane name="week" tab="ADX 周榜">
            <div class="mb-3">
              <n-date-picker
                v-model:value="weekTimestamp"
                type="week"
                size="small"
                class="w-full"
                :is-date-disabled="disableCurrentAndFutureWeek"
                @update:value="fetchRanking"
              />
            </div>
          </n-tab-pane>
        </n-tabs>

        <n-spin :show="loading">
          <div v-if="rankingList.length" class="ranking-list">
            <div v-for="item in rankingList" :key="item.ranking" class="ranking-item">
              <span class="ranking-num" :class="getRankClass(item.ranking)">
                {{ item.ranking }}
              </span>
              <div class="ranking-info">
                <span class="ranking-name">{{ item.playletName }}</span>
                <div class="ranking-meta">
                  <span class="meta-tag">素材 {{ item.materialCount ?? '-' }}</span>
                  <span class="meta-tag">计划 {{ item.creativeCount ?? '-' }}</span>
                  <span class="meta-tag">投放 {{ item.releaseDay ?? '-' }}天</span>
                </div>
              </div>
            </div>
          </div>
          <n-empty v-else-if="!loading" description="暂无数据" />
        </n-spin>
      </template>
    </n-drawer-content>
  </n-drawer>

  <n-modal v-model:show="showCookieModal" preset="dialog" title="配置 ADX Cookie">
    <n-input
      v-model:value="cookieInput"
      type="textarea"
      :rows="4"
      placeholder="请输入 ADX Cookie"
    />
    <template #action>
      <n-button type="primary" :loading="savingCookie" @click="saveCookie">保存</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import {
  NDrawer,
  NDrawerContent,
  NTabs,
  NTabPane,
  NDatePicker,
  NButton,
  NSpin,
  NEmpty,
  NModal,
  NInput,
  useMessage,
} from 'naive-ui'
import dayjs from 'dayjs'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ (e: 'update:show', val: boolean): void }>()

const message = useMessage()

const visible = ref(false)
watch(
  () => props.show,
  v => {
    visible.value = v
  }
)
watch(visible, v => {
  emit('update:show', v)
})

const activeTab = ref<'day' | 'week'>('day')
const dayTimestamp = ref<number>(Date.now())
// 周榜默认上周
const weekTimestamp = ref<number>(dayjs().subtract(1, 'week').valueOf())
const loading = ref(false)
const rankingList = ref<any[]>([])
const unauthorized = ref(false)

// Cookie 配置
const showCookieModal = ref(false)
const cookieInput = ref('')
const savingCookie = ref(false)
// 加载已有 cookie
async function loadCookie() {
  try {
    const res = await fetch('/api/auth/config')
    const data = await res.json()
    if (data?.code === 0) {
      cookieInput.value = data.data?.platforms?.adx?.cookie || ''
    }
  } catch {}
}

// 保存 cookie
async function saveCookie() {
  savingCookie.value = true
  try {
    await fetch('/api/auth/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms: { adx: { cookie: cookieInput.value } } }),
    })
    message.success('ADX Cookie 保存成功')
    showCookieModal.value = false
    fetchRanking()
  } catch {
    message.error('保存失败')
  } finally {
    savingCookie.value = false
  }
}

// 日榜：禁用未来日期
function disableFutureDate(ts: number) {
  return ts > dayjs().endOf('day').valueOf()
}

// 周榜：禁用本周及以后的日期
function disableCurrentAndFutureWeek(ts: number) {
  const thisMonday = dayjs().startOf('week').add(1, 'day')
  return ts >= thisMonday.valueOf()
}

function getDateValue(): string {
  if (activeTab.value === 'day') {
    return dayjs(dayTimestamp.value).format('YYYY-MM-DD')
  }
  // 周榜：取所选周的周一 ~ 周日
  const d = dayjs(weekTimestamp.value)
  const monday = d.startOf('week').add(1, 'day') // dayjs 默认周日为起始
  const sunday = monday.add(6, 'day')
  return `${monday.format('YYYY-MM-DD')} ~ ${sunday.format('YYYY-MM-DD')}`
}

async function fetchRanking() {
  loading.value = true
  rankingList.value = []
  unauthorized.value = false
  try {
    const res = await fetch('/api/adx/ranking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: activeTab.value,
        dateValue: getDateValue(),
        pageId: 1,
        pageSize: 50,
        sortBy: 'CREATIVE_COUNT',
        searchKey: '番茄',
        isNewPlaylet: true,
      }),
    })
    const data = await res.json()
    if (data?.statusCode === 401 || data?.msg === 'Unauthorized' || data?.code === -1) {
      unauthorized.value = true
    } else if (data?.statusCode === 200 || data?.code === 0) {
      rankingList.value = data.content || data.data?.list || data.data || []
    } else {
      message.warning(data?.msg || data?.message || '获取榜单失败')
    }
  } catch {
    message.error('请求 ADX 榜单失败')
  } finally {
    loading.value = false
  }
}

function handleTabChange() {
  fetchRanking()
}

function getRankClass(rank: number) {
  if (rank === 1) return 'rank-1'
  if (rank === 2) return 'rank-2'
  if (rank === 3) return 'rank-3'
  return ''
}

// 抽屉打开时加载数据
watch(visible, v => {
  if (v) {
    loadCookie()
    fetchRanking()
  }
})

onMounted(() => {
  if (props.show) {
    loadCookie()
    fetchRanking()
  }
})
</script>

<style scoped>
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f9fafb;
}
.ranking-item:hover {
  background: #f0f5ff;
}
.ranking-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ranking-num {
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
  color: #6b7280;
  background: #e5e7eb;
}
.rank-1 {
  background: #fbbf24;
  color: #fff;
}
.rank-2 {
  background: #9ca3af;
  color: #fff;
}
.rank-3 {
  background: #cd7f32;
  color: #fff;
}
.ranking-name {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}
.ranking-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.meta-tag {
  font-size: 12px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 1px 6px;
  border-radius: 4px;
}
.unauthorized-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}
.unauthorized-icon {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 50%;
  background: #fffbeb;
}
.unauthorized-title {
  font-size: 16px;
  font-weight: 600;
  color: #b45309;
  margin: 0 0 8px;
}
.unauthorized-desc {
  font-size: 14px;
  color: #92400e;
  margin: 0;
}
</style>
