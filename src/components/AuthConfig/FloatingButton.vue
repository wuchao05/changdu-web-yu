<template>
  <Teleport to="body">
    <!-- 悬浮球 -->
    <div
      v-if="isAdmin"
      ref="floatingBall"
      class="floating-ball"
      :style="ballStyle"
      @mousedown="startDrag"
      @touchstart="startDrag"
      @click="handleClick"
    >
      <Icon icon="mdi:cog" class="w-6 h-6 text-white" />
      <div class="floating-ball-tooltip">全局配置</div>
    </div>

    <!-- 配置抽屉 -->
    <n-drawer
      v-model:show="showDrawer"
      :width="600"
      placement="right"
      :trap-focus="false"
      :block-scroll="false"
    >
      <n-drawer-content title="全局鉴权配置" closable>
        <AuthConfigPanel @close="showDrawer = false" />
      </n-drawer-content>
    </n-drawer>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { NDrawer, NDrawerContent } from 'naive-ui'
import { useUserAuth } from '@/composables/useUserAuth'
import AuthConfigPanel from './AuthConfigPanel.vue'

const { isAdmin } = useUserAuth()

const showDrawer = ref(false)
const floatingBall = ref<HTMLElement | null>(null)

// 悬浮球位置
const ballPosition = ref({
  x: window.innerWidth - 80, // 默认右下角
  y: window.innerHeight - 80,
})

// 拖动状态
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const isClick = ref(true) // 区分点击和拖动

const ballStyle = computed(() => ({
  left: `${ballPosition.value.x}px`,
  top: `${ballPosition.value.y}px`,
}))

function startDrag(e: MouseEvent | TouchEvent) {
  isDragging.value = true
  isClick.value = true

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

  dragStart.value = {
    x: clientX - ballPosition.value.x,
    y: clientY - ballPosition.value.y,
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)

  e.preventDefault()
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return

  isClick.value = false // 移动了就不是点击

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

  let newX = clientX - dragStart.value.x
  let newY = clientY - dragStart.value.y

  // 限制在窗口范围内
  const ballSize = 56
  newX = Math.max(0, Math.min(newX, window.innerWidth - ballSize))
  newY = Math.max(0, Math.min(newY, window.innerHeight - ballSize))

  ballPosition.value = { x: newX, y: newY }
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

function handleClick() {
  // 只有在没有拖动的情况下才打开抽屉
  if (isClick.value) {
    showDrawer.value = true
  }
}

// 窗口大小改变时调整位置
function handleResize() {
  const ballSize = 56
  ballPosition.value.x = Math.min(ballPosition.value.x, window.innerWidth - ballSize)
  ballPosition.value.y = Math.min(ballPosition.value.y, window.innerHeight - ballSize)
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  stopDrag()
})
</script>

<style scoped>
.floating-ball {
  position: fixed;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  z-index: 9999;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  user-select: none;
}

.floating-ball:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
}

.floating-ball:hover .floating-ball-tooltip {
  opacity: 1;
  visibility: visible;
}

.floating-ball:active {
  transform: scale(0.95);
}

.floating-ball-tooltip {
  position: absolute;
  right: 100%;
  margin-right: 12px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.2s,
    visibility 0.2s;
  pointer-events: none;
}

.floating-ball-tooltip::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  border: 6px solid transparent;
  border-left-color: rgba(0, 0, 0, 0.8);
}
</style>
