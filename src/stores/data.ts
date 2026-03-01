import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  OverviewData,
  ReportData,
  OrderData,
  NewUserData,
  DataOverviewV1Data,
} from '@/api/types'

export const useDataStore = defineStore('data', () => {
  // 概览数据
  const overviewData = ref<OverviewData | DataOverviewV1Data | null>(null)
  const overviewLoading = ref(false)
  const overviewError = ref<string>('')

  // 报表数据
  const reportData = ref<ReportData | null>(null)
  const reportLoading = ref(false)
  const reportError = ref<string>('')

  // 订单数据
  const orderData = ref<OrderData | null>(null)
  const orderLoading = ref(false)
  const orderError = ref<string>('')

  // 新用户数据
  const newUserData = ref<NewUserData | null>(null)
  const newUserLoading = ref(false)
  const newUserError = ref<string>('')

  // 操作 - 概览数据
  function setOverviewData(data: OverviewData | DataOverviewV1Data | null) {
    overviewData.value = data
  }

  function setOverviewLoading(loading: boolean) {
    overviewLoading.value = loading
  }

  function setOverviewError(error: string) {
    overviewError.value = error
  }

  function clearOverviewData() {
    overviewData.value = null
    overviewError.value = ''
  }

  // 操作 - 报表数据
  function setReportData(data: ReportData | null) {
    reportData.value = data
  }

  function setReportLoading(loading: boolean) {
    reportLoading.value = loading
  }

  function setReportError(error: string) {
    reportError.value = error
  }

  function clearReportData() {
    reportData.value = null
    reportError.value = ''
  }

  // 操作 - 订单数据
  function setOrderData(data: OrderData | null) {
    orderData.value = data
  }

  function setOrderLoading(loading: boolean) {
    orderLoading.value = loading
  }

  function setOrderError(error: string) {
    orderError.value = error
  }

  function clearOrderData() {
    orderData.value = null
    orderError.value = ''
  }

  // 操作 - 新用户数据
  function setNewUserData(data: NewUserData | null) {
    newUserData.value = data
  }

  function setNewUserLoading(loading: boolean) {
    newUserLoading.value = loading
  }

  function setNewUserError(error: string) {
    newUserError.value = error
  }

  function clearNewUserData() {
    newUserData.value = null
    newUserError.value = ''
  }

  // 清空所有数据
  function clearAllData() {
    clearOverviewData()
    clearReportData()
    clearOrderData()
    clearNewUserData()
  }

  return {
    // 概览数据
    overviewData,
    overviewLoading,
    overviewError,

    // 报表数据
    reportData,
    reportLoading,
    reportError,

    // 订单数据
    orderData,
    orderLoading,
    orderError,

    // 新用户数据
    newUserData,
    newUserLoading,
    newUserError,

    // 操作
    setOverviewData,
    setOverviewLoading,
    setOverviewError,
    clearOverviewData,

    setReportData,
    setReportLoading,
    setReportError,
    clearReportData,

    setOrderData,
    setOrderLoading,
    setOrderError,
    clearOrderData,

    setNewUserData,
    setNewUserLoading,
    setNewUserError,
    clearNewUserData,

    clearAllData,
  }
})
