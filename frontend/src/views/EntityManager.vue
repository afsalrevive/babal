<template>
  <n-card>
    <template #header>
      <n-h2>Entity Manager</n-h2>
    </template>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane
        v-for="entity in entityTypes"
        :key="entity"
        :name="entity"
        :tab="toSentenceCase(entity)"
      >
        <n-tabs
          v-if="['customer', 'agent', 'partner', 'passenger','travel_location','particular'].includes(activeTab)"
          v-model:value="subTab"
          size="small"
          type="line"
          style="margin-bottom: 12px"
        >
          <n-tab-pane name="active" tab="Active" />
          <n-tab-pane name="inactive" tab="Inactive" />
        </n-tabs>

        <n-space justify="space-between" wrap>
          <n-input
            v-model:value="searchQuery"
            placeholder="Search by name/contact"
            clearable
            style="max-width: 300px;"
          />
          <PermissionWrapper resource="entity" operation="write">
            <n-button type="primary" @click="openAddModal">Add {{ toSentenceCase(activeTab) }}</n-button>
          </PermissionWrapper>
        </n-space>

        <n-data-table
          :columns="columns"
          :data="filteredData"
          :loading="loading"
          striped
          style="margin-top: 16px;"
        />

        <!-- Shared Modal -->
        <n-modal 
          v-model:show="modalVisible" 
          :teleported="false"
          :title="editMode ? `Edit ${toSentenceCase(activeTab)}` : `Add ${toSentenceCase(activeTab)}`" 
          preset="card" 
          class="full-width-modal"
        >
          <n-card class="modal-card">
            <n-space
                align="center"
                justify="space-between"
                style="margin-bottom: 12px"
                v-if="!editMode && ['customer', 'agent', 'partner', 'passenger','travel_location','particular'].includes(activeTab)"
              >
              <div style="display: flex; align-items: center; gap: 8px;">
                <n-switch v-model:value="bulkAddMode" />
                <span>Bulk Add Mode</span>
              </div>
            </n-space>
            <n-form :model="currentForm" :rules="formRules" ref="formRef">
              <div class="responsive-form-grid">
              <n-form-item
                v-for="(defaultVal, key) in defaultFieldsByEntity[activeTab]"
                :key="key"
                :prop="key"
                :label="toSentenceCase(key)"
                :feedback="fieldErrors[key]"
                :validation-status="fieldErrors[key] ? 'error' : undefined"
              >
                <template v-if="typeof defaultVal === 'boolean'">
                  <n-switch v-model:value="currentForm[key]" />
                </template>
                <template v-else-if="typeof defaultVal === 'number'">
                  <n-input-number v-model:value="currentForm[key]" :disabled="shouldDisableFieldInEdit(key)" />
                </template>
                <template v-else-if="key === 'customer_id'">
                  <n-select
                    v-model:value="currentForm[key]"
                    :options="customerOptions"
                    label-field="label"
                    value-field="value"
                    placeholder="Select Customer"
                  />
                </template>
                <template v-else>
                  <n-input v-model:value="currentForm[key]" :disabled="shouldDisableFieldInEdit(key)" />
                </template>
              </n-form-item>
              </div>
            </n-form>
            <template #footer>
              <n-space justify="end">
                <n-button @click="modalVisible = false">Cancel</n-button>
                <template v-if="editMode || !bulkAddMode">
                  <n-button type="primary" @click="editMode ? updateEntity() : addEntity()">
                    {{ editMode ? 'Update' : 'Add' }}
                  </n-button>
                </template>
                <template v-else>
                  <n-button type="primary" @click="handleBulkAdd()">Save and Next</n-button>
                </template>
              </n-space>
            </template>
          </n-card>
        </n-modal>
      </n-tab-pane>
    </n-tabs>
  </n-card>
</template>

<script setup lang="ts">
import {
  ref,
  watch,
  onMounted,
  h
} from 'vue'
import api from '@/api'
import {
  useMessage,
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSpace,
  NDataTable,
  NModal,
  NCard,
  NTabs,
  NTabPane,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import PermissionWrapper from '@/components/PermissionWrapper.vue'

const message = useMessage()

const entityTypes = ['customer','passenger', 'agent', 'partner', 'travel_location', 'particular']
const activeTab = ref<'customer' | 'passenger' | 'agent' | 'partner' | 'travel_location' | 'particular'>('customer')
const subTab = ref<'active' | 'inactive'>('active')
const searchQuery = ref('')
const data = ref<any[]>([])
const columns = ref<any[]>([])
const loading = ref(false)
const bulkAddMode = ref(false)
const formRef = ref<FormInst|null>(null)
const fieldErrors = ref<Record<string, string>>({})

const formRules = computed<FormRules>(() => {
  const entity = activeTab.value
  const rules: FormRules = {}

  Object.entries(defaultFieldsByEntity[entity]).forEach(([key, defaultValue]) => {
    if (typeof defaultValue === 'boolean') return
    if (editMode.value && shouldDisableFieldInEdit(key)) return

    if (key === 'name') { // Keep only essential rule
      rules[key] = [{
        required: true,
        message: `${toSentenceCase(key)} is required`,
        trigger: ['input', 'blur']
      }]
    }
  })

  return rules
})


const modalVisible = ref(false)
const editMode = ref(false)
const currentForm = ref<Record<string, any>>({})
const customerOptions = ref<{ label: string; value: number }[]>([])
const customFieldLabels: Record<string, string> = {
  customer_id: 'Customer',
  is_active: 'Active', // if needed
  travel_location: 'Travel Location'
}


const defaultFieldsByEntity: Record<string, Record<string, any>> = {
  customer: { name: '', email: '', contact: '', wallet_balance: 0, credit_limit: 0, credit_used: 0, active: true },
  agent: { name: '', contact: '', wallet_balance: 0, credit_limit: 0, credit_balance: 0, active: true },
  partner: { name: '', contact: '', wallet_balance: 0,active: true, allow_negative_wallet: false },
  passenger: { name: '', contact: '',customer_id:'', passport_number: '',active: true},
  travel_location: { name: '', active: true },
  particular: { name: '', active: true }
}

const openAddModal = () => {
  fieldErrors.value = {}
  currentForm.value = { ...defaultFieldsByEntity[activeTab.value] }
  modalVisible.value = true
  editMode.value = false
  bulkAddMode.value = false
  
  // Reset validation state
  nextTick(() => {
    formRef.value?.restoreValidation?.()
  })
}


const shouldDisableFieldInEdit = (key: string) => {
  if (!editMode.value) return false
  const entity = activeTab.value
  if (entity === 'customer' && ['wallet_balance', 'credit_used'].includes(key)) return true
  if (entity === 'agent' && ['wallet_balance', 'credit_balance'].includes(key)) return true
  return false
}

const updateEntityStatus = async (id, status) => {
  try {
    await api.patch(`/api/manage/${activeTab.value}`, { id, active: status })
    message.success(`Status updated`)
    await fetchData()
  } catch (e: any) {
    handleApiError(e)
  }
}

const toSentenceCase = (s: string) => {
  return customFieldLabels[s] || s.replace(/_/g, ' ').replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  )
}

const filteredData = computed(() => {
  let d = [...data.value]
  if (['customer', 'agent', 'partner', 'passenger','travel_location', 'particular'].includes(activeTab.value)) {
    d = d.filter(row => row.active === (subTab.value === 'active'))
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    d = d.filter(row =>
      (row.name?.toLowerCase().includes(q) || row.contact?.toLowerCase?.().includes(q) || row.customer_name?.toLowerCase()?.includes(q))
    )
  }
  return d
})

const fetchData = async () => {
  if (activeTab.value === 'passenger') {
    const res = await api.get('/api/manage/customer')
    customerOptions.value = res.data.map((c: any) => ({
      label: c.name,
      value: c.id
    }))
  }
  loading.value = true
  try {
    const res = await api.get(`/api/manage/${activeTab.value}`)
    data.value = res.data

    let keys = Object.keys(defaultFieldsByEntity[activeTab.value])
    if (activeTab.value === 'passenger') {
      keys = keys.filter(k => k !== 'customer_id')  // hide raw ID column
    }

    const baseColumns = keys.map(key => {
      const column: any = {
        title: toSentenceCase(key),
        key,
        sortable: false
      }

      // Enable sorting for specific fields
      if (key === 'name') {
        column.sortable = true
        column.sorter = (a: any, b: any) => a.name.localeCompare(b.name)
      } else if (['wallet_balance','credit_used', 'credit_limit', 'credit_balance'].includes(key)) {
        column.sortable = true
        column.sorter = (a: any, b: any) => (a[key] ?? 0) - (b[key] ?? 0)
      }

      return column
    })

    // 👇 Inject 'Customer' column at the beginning for passenger tab
    if (activeTab.value === 'passenger') {
      baseColumns.unshift({
        title: 'Customer',
        key: 'customer_name',
        sortable: true,
        sorter: (a: any, b: any) => (a.customer_name ?? '').localeCompare(b.customer_name ?? '')
      })
    }
    columns.value = [
      ...baseColumns,
      {
        title: 'Actions',
        key: 'actions',
        render(row: any) {
          return h(NSpace, { size: 12 }, {
            default: () => [
              h(PermissionWrapper, { resource: activeTab.value, operation: 'write' }, {
                default: () =>
                  h(NButton, {
                    size: 'small',
                    onClick: () => {
                      currentForm.value = { ...defaultFieldsByEntity[activeTab.value], ...row }
                      editMode.value = true
                      modalVisible.value = true
                    }
                  }, { default: () => 'Edit' })
              }),
              h(PermissionWrapper, { resource: activeTab.value, operation: 'write' }, {
                default: () =>
                  h(NButton, {
                    size: 'small',
                    type: 'error',
                    disabled: Boolean(row.has_passenger || row.has_tickets || row.has_transactions),
                    onClick: () => {
                      window.confirm('Are you sure you want to delete this entry?') && deleteEntity(row.id)
                    }
                  }, { default: () => 'Delete' })
              }),
              h(NButton, {
                size: 'small',
                type: row.active ? 'warning' : 'success',
                onClick: () => {
                  const action = row.active ? 'deactivate' : 'activate'
                  if (window.confirm(`Are you sure you want to ${action} this?`)) {
                    updateEntityStatus(row.id, !row.active)
                  }
                }
              }, { default: () => row.active ? 'Deactivate' : 'Activate' })
            ]
          })
        }
      }
    ]

  } catch (e: any) {
    message.error(e.response?.data?.error || `Failed to load ${activeTab.value}`)
  } finally {
    loading.value = false
  }
}

const addEntity = async () => {
  try {
    await api.post(`/api/manage/${activeTab.value}`, currentForm.value)
    message.success(`${toSentenceCase(activeTab.value)} added`)
    modalVisible.value = false
    await fetchData()
  } catch (e: any) {
    if (e?.response?.data?.field_errors) {
      fieldErrors.value = e.response.data.field_errors
    } else {
      handleApiError(e)
    }
  }
}

const updateEntity = async () => {
  try {
    fieldErrors.value = {}
    // Validate before updating
    await api.patch(`/api/manage/${activeTab.value}`, currentForm.value)
    message.success(`${toSentenceCase(activeTab.value)} updated`)
    modalVisible.value = false
    await fetchData()
  } catch (e: any) {
    if (e?.response?.data?.field_errors) {
      fieldErrors.value = e.response.data.field_errors
    } else {
      handleApiError(e)
    }
  }
}

const handleBulkAdd = async () => {
  try {
    fieldErrors.value = {}
    await api.post(`/api/manage/${activeTab.value}`, currentForm.value)
    message.success(`${toSentenceCase(activeTab.value)} added`)

    await fetchData()

    const preservedCustomerId = currentForm.value.customer_id
    currentForm.value = { ...defaultFieldsByEntity[activeTab.value] }

    // Retain customer_id for passenger bulk addition
    if (activeTab.value === 'passenger') {
      currentForm.value.customer_id = preservedCustomerId
    }

    // Reset validation for next entry
    nextTick(() => {
      formRef.value?.restoreValidation()
    })
  } catch (e: any) {
    if (e?.response?.data?.field_errors) {
      fieldErrors.value = e.response.data.field_errors
    } else {
      handleApiError(e)
    }
  }
}
const deleteEntity = async (id: number) => {
  try {
    await api.delete(`/api/manage/${activeTab.value}?id=${id}`)
    message.success(`${toSentenceCase(activeTab.value)} deleted`)
    await fetchData()
  } catch (e: any) {
    message.error(e.response?.data?.error || `Failed to delete ${activeTab.value}`)
  }
}

const handleApiError = (e: any) => {
  console.error('API Error:', e)

  fieldErrors.value = {}  // Reset previous errors

  if (e?.response?.data?.field_errors) {
    fieldErrors.value = e.response.data.field_errors
    return
  }

  const errorMsg =
    e?.response?.data?.error ||
    e?.message ||
    'Unexpected error occurred. Please try again.'
  
  message.error(errorMsg)
}


onMounted(fetchData)
watch(activeTab, fetchData)
</script>

<style scoped lang="scss">
@use '@/styles/theme' as *;

</style>
