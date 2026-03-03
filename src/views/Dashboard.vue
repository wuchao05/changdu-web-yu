<template>
  <div class="min-h-full bg-gradient-to-br from-slate-50 to-blue-50">
    <header class="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600"
            >
              <Icon icon="mdi:chart-line" class="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 class="text-lg sm:text-xl font-bold text-gray-900">每日业务模板</h1>
              <p class="text-xs text-gray-500 hidden sm:block">单主体通用版本</p>
            </div>
          </div>

          <div class="flex items-center gap-2 sm:gap-3">
            <n-button
              type="warning"
              :size="isMobile ? 'small' : 'medium'"
              @click="showBuildModal = true"
            >
              <template #icon>
                <Icon icon="mdi:hammer-wrench" :class="isMobile ? 'w-3 h-3' : 'w-4 h-4'" />
              </template>
              <span class="hidden sm:inline">提交搭建</span>
            </n-button>

            <n-button
              type="primary"
              :size="isMobile ? 'small' : 'medium'"
              @click="showSyncAccountModal = true"
            >
              <template #icon>
                <Icon icon="mdi:sync" :class="isMobile ? 'w-3 h-3' : 'w-4 h-4'" />
              </template>
              <span class="hidden sm:inline">同步账户</span>
            </n-button>

            <n-button
              text
              @click="router.push('/new-drama-preview')"
              class="!text-gray-600 hover:!text-orange-600"
            >
              <template #icon>
                <Icon icon="mdi:fire" :class="isMobile ? 'w-4 h-4' : 'w-5 h-5'" />
              </template>
              <span class="hidden sm:inline ml-1">爆剧爆剪</span>
            </n-button>

            <n-button
              text
              @click="router.push('/settings')"
              class="!text-gray-600 hover:!text-gray-900"
            >
              <template #icon>
                <Icon icon="mdi:cog" :class="isMobile ? 'w-4 h-4' : 'w-5 h-5'" />
              </template>
            </n-button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
      <OverviewCards />
      <OrderStatistics />
      <DataReport />
    </main>

    <DailyAutoBuildModal :show="showBuildModal" @update:show="showBuildModal = $event" />
    <SyncAccountModal v-model:visible="showSyncAccountModal" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { NButton } from 'naive-ui'
import { useAccountStore } from '@/stores/account'
import OverviewCards from '@/components/OverviewCards.vue'
import OrderStatistics from '@/components/OrderStatistics.vue'
import DataReport from '@/components/DataReport.vue'
import DailyAutoBuildModal from '@/components/DailyAutoBuildModal.vue'
import SyncAccountModal from '@/components/SyncAccountModal.vue'

defineOptions({
  name: 'TemplateDashboardPage',
})

const router = useRouter()
const accountStore = useAccountStore()

const showBuildModal = ref(false)
const showSyncAccountModal = ref(false)
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

onMounted(async () => {
  // 模板统一使用每日账号
  if (accountStore.currentAccount !== 'daily') {
    await accountStore.switchAccount('daily')
  }

  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>
