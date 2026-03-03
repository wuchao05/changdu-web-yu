import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useDramaSubjectStore = defineStore('dramaSubject', () => {
  const currentSubject = ref('默认')

  // 兼容性属性
  const subjectFieldValue = computed(() => currentSubject.value)
  const isDailySubject = computed(() => true)
  const subjectOptions: { label: string; value: string }[] = []

  function setSubject(subject: string) {
    currentSubject.value = subject
  }

  return {
    currentSubject,
    subjectFieldValue,
    isDailySubject,
    subjectOptions,
    setSubject,
  }
})
