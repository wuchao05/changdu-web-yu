import './styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'

import App from './App.vue'
import router from './router'
import { useCreatorStore } from './stores/creator'
import { useSettingsStore } from './stores/settings'
import { useApiConfigStore } from './stores/apiConfig'
import { useAccountStore } from './stores/account'

const pinia = createPinia()

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(naive)

// 初始化所有stores
const creatorStore = useCreatorStore()
const settingsStore = useSettingsStore()
const apiConfigStore = useApiConfigStore()
const accountStore = useAccountStore()

// 加载持久化数据（不使用顶层 await，改用 Promise.then）
creatorStore.loadCreatorsFromStorage()
creatorStore.initActiveCreator()
settingsStore.loadFromStorage()

// 等待 API 配置加载完成后，再加载其他配置并挂载应用
apiConfigStore
  .loadFromStorage()
  .then(() => {
    accountStore.initAccount()
    app.mount('#app')
  })
  .catch(err => {
    console.error('初始化失败:', err)
    // 即使配置加载失败，也挂载应用
    accountStore.initAccount()
    app.mount('#app')
  })
