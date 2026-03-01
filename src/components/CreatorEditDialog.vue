<template>
  <n-modal
    v-model:show="dialogVisible"
    :mask-closable="false"
    preset="dialog"
    :title="isEdit ? '编辑达人' : '添加达人'"
    class="!w-[500px]"
    @after-leave="handleAfterLeave"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      :label-width="100"
    >
      <n-form-item label="达人名称" path="name">
        <n-input
          v-model:value="formData.name"
          placeholder="请输入达人名称"
          :maxlength="20"
          show-count
        />
      </n-form-item>

      <n-form-item label="达人ID" path="distributorId">
        <n-input
          v-model:value="formData.distributorId"
          placeholder="请输入达人的Distributor ID"
          :maxlength="30"
          show-count
        />
        <template #feedback>
          <div class="text-xs text-gray-500">
            达人的唯一标识符，用于API请求中的Distributorid参数
          </div>
        </template>
      </n-form-item>
    </n-form>

    <template #action>
      <div class="flex justify-end space-x-2">
        <n-button @click="handleClose">取消</n-button>
        <n-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '保存' : '添加' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import type { Creator } from '@/config/creators'

interface Props {
  modelValue: boolean
  creator?: Creator | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', creator: Creator): void
}

const props = withDefaults(defineProps<Props>(), {
  creator: null,
})

const emit = defineEmits<Emits>()

const message = useMessage()
const dialogVisible = ref(false)
const formRef = ref<FormInst>()
const submitting = ref(false)

const formData = reactive({
  name: '',
  distributorId: '',
})

const isEdit = ref(false)

// 表单验证规则
const rules: FormRules = {
  name: [
    { required: true, message: '请输入达人名称', trigger: ['blur', 'input'] },
    { min: 1, max: 20, message: '达人名称长度为1-20个字符', trigger: ['blur', 'input'] },
  ],
  distributorId: [
    { required: true, message: '请输入达人ID', trigger: ['blur', 'input'] },
    {
      pattern: /^\d+$/,
      message: '达人ID只能包含数字',
      trigger: ['blur', 'input'],
    },
    { min: 10, max: 30, message: '达人ID长度为10-30位数字', trigger: ['blur', 'input'] },
  ],
}

// 监听props变化
watch(
  () => props.modelValue,
  newVal => {
    dialogVisible.value = newVal
    if (newVal) {
      initForm()
    }
  },
  { immediate: true }
)

watch(
  () => dialogVisible.value,
  newVal => {
    emit('update:modelValue', newVal)
  }
)

// 初始化表单
function initForm() {
  isEdit.value = !!props.creator

  if (props.creator) {
    // 编辑模式，填充现有数据
    formData.name = props.creator.name
    formData.distributorId = props.creator.distributorId
  } else {
    // 添加模式，清空表单
    formData.name = ''
    formData.distributorId = ''
  }

  // 重置表单验证状态
  nextTick(() => {
    formRef.value?.restoreValidation()
  })
}

// 提交表单
async function handleSubmit() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    submitting.value = true

    const creatorData: Creator = {
      name: formData.name.trim(),
      distributorId: formData.distributorId.trim(),
    }

    emit('submit', creatorData)
    dialogVisible.value = false
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}

// 关闭对话框
function handleClose() {
  if (submitting.value) {
    message.warning('正在提交中，请稍候...')
    return
  }

  dialogVisible.value = false
}

// 对话框关闭后的回调
function handleAfterLeave() {
  // 重置表单数据
  formData.name = ''
  formData.distributorId = ''

  // 重置提交状态
  submitting.value = false

  // 清除表单验证状态
  nextTick(() => {
    formRef.value?.restoreValidation()
  })
}

// 暴露给父组件的方法
defineExpose({
  close: () => {
    dialogVisible.value = false
  },
})
</script>

<style scoped>
/* 样式已通过 Tailwind CSS 类实现 */
</style>
