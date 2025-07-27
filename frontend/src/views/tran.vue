<template>
  <n-card>
    <template #header>
      <n-h2>Transaction Manager</n-h2>
    </template>

    <n-tabs
      v-model:value="transactionType"
      type="line"
      animated
      @update:value="onTabChange"
      style="margin-bottom: 16px;"
    >
      <n-tab-pane v-for="tab in tabs" :key="tab" :name="tab" :tab="toSentenceCase(tab)" />
    </n-tabs>

    <n-space justify="space-between" wrap style="margin-bottom: 12px;">
      <n-input v-model:value="searchQuery" placeholder="Search" clearable style="max-width: 300px;" />
      <n-button type="primary" @click="openAddModal">Add {{ toSentenceCase(transactionType) }}</n-button>
    </n-space>

    <n-data-table :columns="columns" :data="filteredTransactions" :loading="loading" striped />

    <n-modal
      v-model:show="modalVisible"
      :teleported="false"
      :title="modalTitle"
      class="transaction-modal"
      style="max-width: 90vw;"
    >
      <n-card class="modal-card">
        <n-h3 style="margin-bottom: 12px;">{{ modalTitle }}</n-h3>
        <n-form ref="formRef" :model="form" :rules="formRules">
          <div class="responsive-form-grid">
            <!-- Reference Number -->
            <n-form-item label="Reference Number">
              <n-input :value="nextRefNo" placeholder="Auto-generated" disabled />
            </n-form-item>

            <!-- Date -->
            <n-form-item label="Date" prop="transaction_date">
              <n-date-picker v-model:value="form.transaction_date" type="datetime" clearable />
            </n-form-item>

            <!-- Non-refund transaction fields -->
            <template v-if="transactionType !== 'refund'">
              <n-form-item label="Entity Type" prop="entity_type">
                <n-select 
                  v-model:value="form.entity_type" 
                  :options="entityTypeOptions" 
                  @update:value="handleEntityTypeChange"
                />
              </n-form-item>

              <n-form-item label="Entity Name" prop="entity_id">
                <n-select
                  v-model:value="form.entity_id"
                  :options="entityOptions"
                  :loading="entitiesLoading"
                  filterable
                  :disabled="!form.entity_type || form.entity_type === 'others'"
                  placeholder="Select entity"
                />
              </n-form-item>
            </template>

            <!-- Refund transaction fields -->
            <template v-else>
              <n-form-item label="Refund Direction" prop="refund_direction">
                <n-select
                  v-model:value="form.refund_direction"
                  :options="refundDirectionOptions"
                />
              </n-form-item>

              <!-- Company to Entity -->
              <template v-if="form.refund_direction === 'outgoing'">
                <n-form-item label="To Entity Type" prop="to_entity_type">
                  <n-select 
                    v-model:value="form.to_entity_type" 
                    :options="entityTypeOptions" 
                    @update:value="val => handleRefundEntityChange(val, 'to')"
                  />
                </n-form-item>

                <n-form-item 
                  v-if="form.to_entity_type && form.to_entity_type !== 'others'"
                  label="To Entity Name"
                  prop="to_entity_id"
                >
                  <n-select
                    v-model:value="form.to_entity_id"
                    :options="entityOptions"
                    :loading="entitiesLoading"
                    filterable
                    placeholder="Select entity"
                  />
                </n-form-item>

                <n-form-item label="From Mode (Company)" prop="mode_for_from">
                  <n-select
                    v-model:value="form.mode_for_from"
                    :options="companyRefundFromModeOptions"
                    placeholder="Company pays via"
                  />
                </n-form-item>

                <template v-if="form.mode_for_from && modeBalance !== null">
                  <n-form-item label="Company Account">
                    <n-p>Mode: {{ form.mode_for_from }} — Balance: ₹{{ modeBalance.toFixed(2) }}</n-p>
                  </n-form-item>
                </template>

                <!-- Toggles for refund outgoing -->
                <template v-if="form.to_entity_type">
                  <!-- Customer/Partner -->
                  <template v-if="['customer', 'partner'].includes(form.to_entity_type)">
                    <n-form-item
                      v-if="['cash', 'online'].includes(form.mode_for_from)"
                      label="Deduct from Entity Account?"
                    >
                      <n-switch v-model:value="form.deduct_from_account" />
                    </n-form-item>

                    <n-form-item
                      v-if="form.mode_for_from === 'service_availed'"
                      label="Credit to Entity Account?"
                    >
                      <n-switch v-model:value="form.credit_to_account" />
                    </n-form-item>
                  </template>

                  <!-- Agent -->
                  <n-form-item
                    v-if="form.to_entity_type === 'agent'"
                    label="Credit Agent Account?"
                  >
                    <n-switch v-model:value="form.credit_to_account" />
                  </n-form-item>

                  <!-- Others -->
                  <n-form-item v-if="form.to_entity_type === 'others'" label="Note">
                    <n-alert type="info" :show-icon="false">
                      Amount will be deducted directly from the selected company account.
                    </n-alert>
                  </n-form-item>
                </template>
              </template>

              <!-- Entity to Company -->
              <template v-else>
                <n-form-item label="From Entity Type" prop="from_entity_type">
                  <n-select 
                    v-model:value="form.from_entity_type" 
                    :options="entityTypeOptions" 
                    @update:value="val => handleRefundEntityChange(val, 'from')"
                  />
                </n-form-item>

                <n-form-item 
                  v-if="form.from_entity_type && form.from_entity_type !== 'others'"
                  label="From Entity Name"
                  prop="from_entity_id"
                >
                  <n-select
                    v-model:value="form.from_entity_id"
                    :options="entityOptions"
                    :loading="entitiesLoading"
                    filterable
                    placeholder="Select entity"
                  />
                </n-form-item>

                <n-form-item
                  v-if="form.from_entity_type && form.from_entity_type !== 'others'"
                  label="From Mode (Entity)"
                  prop="mode_for_from"
                >
                  <n-select
                    v-model:value="form.mode_for_from"
                    :options="getEntityToCompanyFromModeOptions(form.from_entity_type)"
                    placeholder="Entity pays via"
                  />
                </n-form-item>

                <n-form-item
                  v-if="form.from_entity_type === 'others' || form.mode_for_from === 'cash'"
                  label="To Mode (Company)"
                  prop="mode_for_to"
                >
                  <n-select
                    v-model:value="form.mode_for_to"
                    :options="companyModeOptions"
                    placeholder="Company receives via"
                  />
                </n-form-item>
              </template>
            </template>

            <!-- Common fields -->
            <n-form-item label="Particular" prop="particular_id">
              <n-select 
                v-model:value="form.particular_id" 
                :options="particularOptions" 
                :loading="particularsLoading" 
                filterable 
                clearable 
              />
            </n-form-item>

            <n-form-item v-if="transactionType !== 'refund'" label="Payment Type" prop="pay_type">
              <n-select v-model:value="form.pay_type" :options="payTypeOptions" clearable />
            </n-form-item>

            <!-- Wallet/Credit toggles -->
            <template v-if="showWalletToggle">
              <n-form-item :show-label="false">
                <n-checkbox v-model:checked="toggleValue">
                  {{ toggleLabel }}
                </n-checkbox>
              </n-form-item>
            </template>

            <n-form-item v-if="transactionType !== 'refund'" label="Mode of Payment" prop="mode">
              <n-select
                v-model:value="form.mode"
                :options="nonRefundModeOptions"
                @update:value="fetchCompanyBalance"
              />
            </n-form-item>

            <n-form-item label="Amount" prop="amount">
              <n-input-number 
                v-model:value="form.amount" 
                :min="0" 
                :step="0.01" 
                clearable 
              />
            </n-form-item>

            <n-form-item label="Description" prop="description">
              <n-input v-model:value="form.description" type="textarea" />
            </n-form-item>
          </div>
        </n-form>

        <template #footer>
          <div v-if="form.mode && modeBalance !== null">
            <n-h5>Company Account</n-h5>
            <p>Mode: {{ form.mode }} — Balance: ₹{{ modeBalance.toFixed(2) }}</p>
          </div>
          <div v-if="selectedEntity">
            <n-h5>Entity Info</n-h5>
            <p>
              Wallet: ₹{{ selectedEntity.wallet_balance ?? 'N/A' }}<br />
              Credit Limit: ₹{{ selectedEntity.credit_limit ?? 'N/A' }}<br />
              Credit Used: ₹{{ selectedEntity.credit_used ?? 'N/A' }}<br />
            </p>
          </div>
          <n-space justify="end">
            <n-button @click="closeModal">Cancel</n-button>
            <n-button type="primary" @click="validateAndSubmit">Submit</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>
  </n-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import { 
  useMessage, NButton, NForm, NFormItem, NInput, NInputNumber, NSpace, 
  NDataTable, NModal, NCard, NTabs, NTabPane, NH2, NH3, NH5, NP, NAlert 
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'

const router = useRouter()
const route = useRoute()
const message = useMessage()

// Constants and Refs
const tabs = ['payment', 'receipt', 'refund']
const transactionType = ref<'payment' | 'receipt' | 'refund'>('payment')
const searchQuery = ref('')
const transactions = ref([])
const loading = ref(false)
const formRef = ref<FormInst | null>(null)
const modalVisible = ref(false)
const defaultFields = ref<Record<string, any>>({})
const form = reactive<Record<string, any>>({})
const fieldErrors = ref<Record<string, string>>({})
const entityOptions = ref<any[]>([])
const entitiesLoading = ref(false)
const particulars = ref<any[]>([])
const particularsLoading = ref(false)
const nextRefNo = ref('')
const editingId = ref<number | null>(null)
const modeBalance = ref<number | null>(null)

// Entity Type Options
const entityTypeOptions = [
  { label: 'Customer', value: 'customer' },
  { label: 'Agent', value: 'agent' },
  { label: 'Partner', value: 'partner' },
  { label: 'Others', value: 'others' }
]

// Refund Direction Options
const refundDirectionOptions = [
  { label: 'Company → Entity', value: 'outgoing' },
  { label: 'Entity → Company', value: 'incoming' }
]

// Computed Properties
const selectedEntity = computed(() => 
  entityOptions.value.find(e => e.value === form.entity_id)
)

const modalTitle = computed(() => {
  const mode = editingId.value ? 'Edit' : 'Add'
  return `${mode} ${toSentenceCase(transactionType.value)}`
})

const nonRefundModeOptions = computed(() => [
  { label: 'Cash', value: 'cash' },
  { label: 'Online', value: 'online' }
])

const companyModeOptions = [
  { label: 'Cash', value: 'cash' },
  { label: 'Online', value: 'online' }
]

const companyRefundFromModeOptions = computed(() => {
  const base = [
    { label: 'Cash', value: 'cash' },
    { label: 'Online', value: 'online' }
  ]
  
  if (['customer', 'partner'].includes(form.to_entity_type)) {
    base.push({ label: 'Service Availed', value: 'service_availed' })
  }
  
  return base
})

const payTypeOptions = computed(() => {
  let types: string[] = []
  
  if (transactionType.value === 'payment') {
    if (['customer', 'partner'].includes(form.entity_type)) {
      types = ['cash_withdrawal', 'other_expense']
    } else if (form.entity_type === 'agent') {
      types = ['cash_deposit', 'other_expense']
    } else if (form.entity_type === 'others') {
      types = ['other_expense']
    }
  } 
  else if (transactionType.value === 'receipt') {
    if (['customer', 'partner'].includes(form.entity_type)) {
      types = ['cash_deposit', 'other_receipt']
    } else {
      types = ['other_receipt']
    }
  }
  else if (transactionType.value === 'refund') {
    types = ['refund']
  }

  return types.map(val => ({
    label: toSentenceCase(val),
    value: val
  }))
})

const particularOptions = computed(() => 
  particulars.value.map(p => ({ label: p.name, value: p.id }))
)

const showWalletToggle = computed(() => {
  if (transactionType.value === 'payment') {
    return form.pay_type === 'other_expense' && form.entity_type !== 'others'
  }
  if (transactionType.value === 'receipt') {
    return form.pay_type === 'other_receipt' && form.entity_type !== 'others'
  }
  return false
})

const toggleValue = computed({
  get() {
    if (transactionType.value === 'payment') {
      return form.deduct_from_account
    }
    return form.credit_to_account
  },
  set(value) {
    if (transactionType.value === 'payment') {
      form.deduct_from_account = value
    } else {
      form.credit_to_account = value
    }
  }
})

const toggleLabel = computed(() => {
  if (transactionType.value === 'payment') {
    return form.entity_type === 'agent' 
      ? 'Credit to wallet/credit?' 
      : 'Deduct from wallet/credit?'
  }
  return form.entity_type === 'agent' 
    ? 'Deduct from wallet/credit?' 
    : 'Credit to wallet/credit?'
})

const filteredTransactions = computed(() => {
  if (!searchQuery.value) return transactions.value
  const q = searchQuery.value.toLowerCase()
  return transactions.value.filter((t: any) =>
    Object.values(t).some((v: any) => String(v).toLowerCase().includes(q))
  )
})

// Methods
const toSentenceCase = (str: string) =>
  str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

const onTabChange = async (type: string) => {
  if (['payment', 'receipt', 'refund'].includes(type)) {
    transactionType.value = type as any
    router.push({ name: 'TransactionPage', query: { type } })
    await fetchSchema()
    await fetchTransactions()
  }
}

const fetchCompanyBalance = async (mode: string) => {
  try {
    const res = await api.get(`/api/company_balance/${mode}`)
    modeBalance.value = res.data.balance
  } catch {
    modeBalance.value = null
  }
}

const handleEntityTypeChange = (value: string) => {
  form.entity_type = value
  form.entity_id = null
  form.pay_type = null
  form.mode = null
  if (value !== 'others') {
    loadEntities(value)
  } else {
    entityOptions.value = []
  }
}

const handleRefundEntityChange = (value: string, direction: 'to' | 'from') => {
  const fieldPrefix = direction === 'to' ? 'to_' : 'from_'
  form[`${fieldPrefix}entity_type`] = value
  form[`${fieldPrefix}entity_id`] = null
  form.credit_to_account = false
  form.deduct_from_account = false
  if (value !== 'others') {
    loadEntities(value)
  } else {
    entityOptions.value = []
  }
}

const getEntityToCompanyFromModeOptions = (entityType: string) => {
  if (['customer', 'partner', 'agent'].includes(entityType)) {
    return [
      { label: 'Cash', value: 'cash' },
      { label: 'Wallet', value: 'wallet' }
    ]
  }
  return [
    { label: 'Cash', value: 'cash' },
    { label: 'Online', value: 'online' }
  ]
}

const openAddModal = (row: any = null) => {
  fieldErrors.value = {}
  editingId.value = row?.id || null
  nextRefNo.value = row?.ref_no || ''

  // Reset form
  Object.keys(form).forEach(key => delete form[key])
  
  if (row) {
    // Populate from row data
    Object.entries(row).forEach(([key, val]) => {
      form[key] = key.includes('date') && typeof val === 'string'
        ? new Date(val).getTime()
        : val
    })
    
    if (!form.transaction_date || isNaN(form.transaction_date)) {
      form.transaction_date = Date.now()
    }
  } else {
    // Populate default fields
    Object.entries(defaultFields.value).forEach(([key, val]) => {
      const value = typeof val === 'object' && val !== null && 'value' in val ? val.value : val
      form[key] = key.includes('date') && typeof value === 'string'
        ? new Date(value).getTime()
        : value
    })
    
    form.transaction_date = Date.now()
    if (transactionType.value === 'refund') form.pay_type = null
  }
  
  modalVisible.value = true
  loadEntities(form.entity_type || 'customer')
  loadParticulars()
  nextTick(() => formRef.value?.restoreValidation?.())
}

const closeModal = () => {
  modalVisible.value = false
  editingId.value = null
}

const fetchSchema = async () => {
  try {
    const res = await api.get(`/api/transactions/${transactionType.value}?mode=form`)
    const fields = res.data.default_fields || {}
    const parsedFields: Record<string, any> = {}

    Object.entries(fields).forEach(([key, field]) => {
      const value = (field as any)?.value ?? field
      parsedFields[key] = key.includes('date') && typeof value === 'string'
        ? new Date(value).getTime()
        : value
    })

    if (transactionType.value === 'refund') parsedFields.pay_type = null
    defaultFields.value = parsedFields
    nextRefNo.value = res.data.ref_no || ''
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Failed to load form schema')
    defaultFields.value = {}
    nextRefNo.value = ''
  }
}

const fetchTransactions = async () => {
  loading.value = true
  try {
    const res = await api.get(`/api/transactions/${transactionType.value}`)
    transactions.value = res.data.transactions || []
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Failed to fetch transactions')
    transactions.value = []
  } finally {
    loading.value = false
  }
}

const loadEntities = async (type: string) => {
  if (!type || type === 'others') {
    entityOptions.value = []
    return
  }

  entitiesLoading.value = true
  try {
    const res = await api.get(`/api/manage/${type}`)
    entityOptions.value = res.data.map(e => ({ label: e.name, value: e.id, ...e }))
  } catch {
    message.error('Failed to load entities')
    entityOptions.value = []
  } finally {
    entitiesLoading.value = false
  }
}

const loadParticulars = async () => {
  particularsLoading.value = true
  try {
    const res = await api.get('/api/manage/particular')
    particulars.value = res.data || []
  } catch {
    message.error('Failed to load particulars')
  } finally {
    particularsLoading.value = false
  }
}

const validateAndSubmit = async () => {
  try {
    // Validate form first
    await formRef.value?.validate()
    
    // Check for negative company balance
    if (modeBalance.value !== null && form.amount) {
      let newBalance = modeBalance.value
      
      if (transactionType.value === 'payment') {
        newBalance -= form.amount
      } else if (transactionType.value === 'receipt') {
        newBalance += form.amount
      } else if (transactionType.value === 'refund') {
        if (form.refund_direction === 'outgoing') {
          newBalance -= form.amount
        } else if (form.refund_direction === 'incoming') {
          newBalance += form.amount
        }
      }
      
      if (newBalance < 0) {
        if (!confirm(`This transaction will make company account negative (₹${newBalance.toFixed(2)}). Proceed anyway?`)) {
          return
        }
      }
    }
    
    // If validation passed and user confirmed negative balance, submit
    await submitTransaction()
  } catch (errors) {
    // Validation errors will be shown automatically
    console.log('Form validation failed', errors)
  }
}

const submitTransaction = async () => {
  try {
    fieldErrors.value = {}

    // Prepare payload
    const payload: Record<string, any> = {
      ...form,
      transaction_type: transactionType.value,
      pay_type: transactionType.value === 'refund' ? 'refund' : form.pay_type,
      credit_to_account: form.credit_to_account,
      deduct_from_account: form.deduct_from_account
    }

    // Handle refund-specific fields
    if (transactionType.value === 'refund') {
      payload.entity_type = form.refund_direction === 'incoming'
        ? form.from_entity_type
        : form.to_entity_type

      payload.entity_id = form.refund_direction === 'incoming'
        ? form.from_entity_id
        : form.to_entity_id

      payload.mode = form.refund_direction === 'incoming'
        ? form.mode_for_from
        : form.mode_for_to
    }

    // Submit to API
    if (editingId.value) {
      await api.put(`/api/transactions/${editingId.value}`, payload)
      message.success('Transaction updated')
    } else {
      await api.post(`/api/transactions/${transactionType.value}`, payload)
      message.success('Transaction added')
    }

    closeModal()
    await fetchTransactions()
  } catch (e: any) {
    if (e?.response?.data?.field_errors) {
      fieldErrors.value = e.response.data.field_errors
    } else {
      message.error(e?.response?.data?.error || 'Failed to submit transaction')
    }
  }
}

const columns = computed(() => {
  const baseColumns = [
    { title: 'Ref No', key: 'ref_no' },
    { title: 'Date', key: 'date', render: row => new Date(row.date).toLocaleString() },
    { title: 'Entity Type', key: 'entity_type' },
    { title: 'Entity Name', key: 'entity_name' },
    { title: 'Particular', key: 'particular_name' },
    { title: 'Payment Type', key: 'pay_type' },
    { title: 'Mode', key: 'mode' },
    { title: 'Amount', key: 'amount' },
    { title: 'Description', key: 'description' }
  ]

  const refundExtra = [
    { title: 'Refund to Customer', key: 'refund_to_customer_amount' },
    { title: 'Deduct from Agent', key: 'deduct_from_agent_amount' },
    { title: 'Customer Mode', key: 'mode_for_customer' },
    { title: 'Agent Mode', key: 'mode_for_agent' }
  ]

  const actions = {
    title: 'Actions',
    key: 'actions',
    render: (row: any) =>
      h(NSpace, { size: 8 }, () => [
        h(NButton, {
          size: 'small',
          type: 'primary',
          onClick: () => openAddModal(row)
        }, { default: () => 'Edit' }),

        h(NButton, {
          size: 'small',
          type: 'error',
          onClick: () => handleDelete(row.id)
        }, { default: () => 'Delete' })
      ])
  }

  if (transactionType.value === 'refund') {
    return [...baseColumns, ...refundExtra, actions]
  } else {
    return [...baseColumns, actions]
  }
})

const handleDelete = async (id: number) => {
  if (!confirm('Are you sure you want to delete this transaction?')) return

  try {
    await api.delete(`/api/transactions/${id}`)
    message.success('Transaction deleted')
    await fetchTransactions()
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Failed to delete transaction')
  }
}

// Form validation rules
const formRules = computed<FormRules>(() => {
  const rules: FormRules = {
    transaction_date: [{ required: true, message: 'Date is required' }],
    amount: [{ 
      required: true, 
      validator: (rule, value) => {
        if (value === null || value === undefined || value === '') {
          return new Error('Amount is required')
        }
        if (Number(value) <= 0) {
          return new Error('Amount must be greater than 0')
        }
        return true
      },
      trigger: ['blur', 'input']
    }],
  };

  // Entity type rules
  if (transactionType.value === 'refund') {
    rules.refund_direction = [{ required: true, message: 'Refund direction is required' }];
    
    if (form.refund_direction === 'incoming') {
      rules.from_entity_type = [{ required: true, message: 'From Entity Type is required' }];
      
      if (form.from_entity_type !== 'others') {
        rules.from_entity_id = [{ required: true, message: 'From Entity is required' }];
        rules.mode_for_from = [{ required: true, message: 'From Mode is required' }];
      }
      
      if (form.from_entity_type === 'others' || form.mode_for_from === 'cash') {
        rules.mode_for_to = [{ required: true, message: 'To Mode is required' }];
      }
    } else {
      rules.to_entity_type = [{ required: true, message: 'To Entity Type is required' }];
      rules.mode_for_from = [{ required: true, message: 'From Mode is required' }];
      
      if (form.to_entity_type !== 'others') {
        rules.to_entity_id = [{ required: true, message: 'To Entity is required' }];
      }
    }
  } else {
    // Payment/Receipt rules
    rules.entity_type = [{ required: true, message: 'Entity type is required' }];
    rules.pay_type = [{ required: true, message: 'Payment type is required' }];
    rules.mode = [{ required: true, message: 'Mode is required' }];
    
    if (form.entity_type !== 'others') {
      rules.entity_id = [{
        validator: (rule, value) => {
          if (!value) return new Error('Entity is required');
          return true;
        },
        trigger: ['blur', 'change']
      }];
    }
  }

  return rules;
});

// Watchers
watch(
  () => route.query.type,
  async (type) => {
    if (['payment', 'receipt', 'refund'].includes(type as string)) {
      transactionType.value = type as any
      await fetchSchema()
      await fetchTransactions()
    }
  },
  { immediate: true }
)

watch(() => form.entity_type, (newType) => {
  form.pay_type = null
  form.mode = null
  modeBalance.value = null
})

// Lifecycle
onMounted(async () => {
  const typeParam = route.query.type as string
  transactionType.value = ['payment', 'receipt', 'refund'].includes(typeParam) 
    ? typeParam as any 
    : 'payment'

  await fetchSchema()
  await fetchTransactions()
  await loadParticulars()

  if (form.entity_type && form.entity_type !== 'others') {
    await loadEntities(form.entity_type)
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/theme' as *;
</style>