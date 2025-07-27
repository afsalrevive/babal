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

    <n-space class="table-controls" justify="space-between">
      <n-space>
        <n-input class="search-filter" v-model:value="searchQuery" placeholder="Search" clearable />
        <n-date-picker
          class="date-filter"
          v-model:value="dateRange"
          type="daterange"
          clearable
          :default-value="defaultDateRange"
          style="max-width: 300px;"
        />
        <n-space class="export-buttons">
          <n-button @click="exportTransactions('excel')" type="primary" secondary :loading="exporting">
            <template #icon>
              <n-icon><DocumentTextOutline /></n-icon>
            </template>
            Excel
          </n-button>
          <n-button @click="exportTransactions('pdf')" type="primary" secondary :loading="exporting">
            <template #icon>
              <n-icon><DocumentTextOutline /></n-icon>
            </template>
            PDF
          </n-button>
        </n-space>
      </n-space>
      <n-button type="primary" @click="openAddModal">Add {{ toSentenceCase(transactionType) }}</n-button>
    </n-space>

    <n-data-table 
      :columns="columns" 
      :data="paginatedTransactions" 
      :loading="loading" 
      striped 
      :pagination="pagination"
    />

    <n-modal
      v-model:show="modalVisible"
      :title="modalTitle"
      class="transaction-modal"
      preset="card"
      style="max-width: 90vw;"
    >
      <n-card class="modal-card">
        <n-form ref="formRef" :model="form" :rules="formRules">
          <div class="responsive-form-grid">
            <!-- Reference Number -->
            <n-form-item label="Reference No">
              <n-input v-model:value="form.ref_no" disabled />
            </n-form-item>

            <!-- Date -->
            <n-form-item label="Date" prop="transaction_date">
              <n-date-picker v-model:value="form.transaction_date" type="datetime" clearable />
            </n-form-item>

            <!-- Dynamic form sections -->
            <div v-if="transactionType === 'payment' || transactionType === 'receipt'" class="form-section">
              <PaymentFormSection 
                :form="form"
                :transaction-type="transactionType"
                :entity-type-options="entityTypeOptions"
                :entity-options="entityOptions"
                :entities-loading="entitiesLoading"
                :selected-entity="selectedEntity"
                :particular-options="particularOptions"
                :particulars-loading="particularsLoading"
                :pay-type-options="payTypeOptions"
                :non-refund-mode-options="nonRefundModeOptions"
                :show-wallet-toggle="showWalletToggle"
                :wallet-toggle-disabled="walletToggleDisabled"
                :toggle-value="toggleValue"
                :toggle-label="toggleLabel"
                @entity-type-change="handleEntityTypeChange"
                @payment-type-change="handlePaymentTypeChange"
                @fetch-company-balance="fetchCompanyBalance"
                @toggle-value-change="handleToggleValueChange"
              />
            </div>

            <div v-else-if="transactionType === 'refund'" class="form-section">
              <RefundFormSection 
                :form="form"
                :entity-type-options="entityTypeOptions"
                :refund-direction-options="refundDirectionOptions"
                :company-mode-options="companyModeOptions"
                :from-entity-options="fromEntityOptions"
                :to-entity-options="toEntityOptions"
                :from-entities-loading="fromEntitiesLoading"
                :to-entities-loading="toEntitiesLoading"
                :selected-from-entity="selectedFromEntity"
                :selected-to-entity="selectedToEntity"
                :particular-options="particularOptions"
                :particulars-loading="particularsLoading"
                :company-refund-from-mode-options="companyRefundFromModeOptions"
                :mode-balance="modeBalance"
                :entity-options-ready="entityOptionsReady"
                @refund-entity-change="handleRefundEntityChange"
              />
            </div>

            <div v-else-if="transactionType === 'wallet_transfer'" class="form-section">
              <WalletTransferFormSection 
                :form="form"
                :entity-type-options="entityTypeOptions"
                :from-entity-options="fromEntityOptions"
                :to-entity-options="toEntityOptions"
                :from-entities-loading="fromEntitiesLoading"
                :to-entities-loading="toEntitiesLoading"
                :selected-from-entity="selectedFromEntity"
                :selected-to-entity="selectedToEntity"
                :particular-options="particularOptions"
                :particulars-loading="particularsLoading"
                @refund-entity-change="handleRefundEntityChange"
              />
            </div>
            
            <!-- Common fields -->
            <n-form-item label="Amount" prop="amount">
              <n-input-number 
                v-model:value="form.amount" 
                :min="0" 
                :step="0.01" 
                clearable 
                style="width: 100%"
              />
            </n-form-item>

            <n-form-item label="Description" prop="description">
              <n-input v-model:value="form.description" type="textarea" />
            </n-form-item>
          </div>
        </n-form>

        <template #footer>
          <div v-if="form.mode && modeBalance !== null && transactionType !== 'wallet_transfer'">
            <n-h5>Company Account</n-h5>
            <p>Mode: {{ form.mode }} — Balance: ₹{{ modeBalance.toFixed(2) }}</p>
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
import { ref, reactive, computed, onMounted, nextTick, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import {
  useMessage, NButton, NSpace, NForm, NFormItem, NInput, NInputNumber, NDataTable, NModal,
  NCard, NTabs, NTabPane, NIcon, NDatePicker, NH2, NH3, NH5
} from 'naive-ui'
import { DocumentTextOutline } from '@vicons/ionicons5'
import type { FormRules } from 'naive-ui'

// Import form sections
import PaymentFormSection from './PaymentFormSection.vue'
import RefundFormSection from './RefundFormSection.vue'
import WalletTransferFormSection from './WalletTransferFormSection.vue'

// ---- ROUTING AND STATE ----
const router = useRouter()
const route = useRoute()
const message = useMessage()
const tabs = ['payment', 'receipt', 'refund', 'wallet_transfer']
const transactionType = ref<'payment' | 'receipt' | 'refund' | 'wallet_transfer'>('payment')
const searchQuery = ref('')
const transactions = ref<any[]>([])
const loading = ref(false)
const exporting = ref(false)
const formRef = ref<any>(null)
const modalVisible = ref(false)
const defaultFields = ref<any>({})
const editingId = ref<number | null>(null)
const fieldErrors = ref<any>({})
const modeBalance = ref<number | null>(null)
const dateRange = ref<[number, number] | null>(null)
const entitiesLoading = ref(false)
const fromEntitiesLoading = ref(false)
const toEntitiesLoading = ref(false)
const particularsLoading = ref(false)
const entityOptions = ref<any[]>([])
const fromEntityOptions = ref<any[]>([])
const toEntityOptions = ref<any[]>([])
const particulars = ref<any[]>([])
const nextRefNo = ref('')
const entityOptionsReady = ref(false)
const refNoLoading = ref(false)

// Pagination
const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    pagination.page = page
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
  }
})

// ---- CONSTANTS ----
const defaultDateRange = computed(() => {
  const end = Date.now()
  const start = end - 7 * 24 * 60 * 60 * 1000
  return [start, end] as [number, number]
})
const entityTypeOptions = [
  { label: 'Customer', value: 'customer' }, { label: 'Agent', value: 'agent' },
  { label: 'Partner', value: 'partner' }, { label: 'Others', value: 'others' }
]
const refundDirectionOptions = [
  { label: 'Company → Entity', value: 'outgoing' }, { label: 'Entity → Company', value: 'incoming' }
]
const companyModeOptions = [
  { label: 'Cash', value: 'cash' }, { label: 'Online', value: 'online' }
]
const nonRefundModeOptions = companyModeOptions

const onTabChange = async (type: string) => {
  if (tabs.includes(type)) {
    transactionType.value = type as any
    router.push({ name: 'TransactionPage', query: { type } })
    await fetchSchema()
    await fetchTransactions()
  }
}

// ---- FORM MODEL & UTILITIES ----
const defaultFormState = () => ({
  ref_no: '', transaction_date: Date.now(), amount: null,
  entity_type: null, entity_id: null, pay_type: null, mode: null,
  description: '', particular_id: null,
  refund_direction: null, to_entity_type: null, to_entity_id: null,
  from_entity_type: null, from_entity_id: null,
  mode_for_from: null, mode_for_to: null,
  deduct_from_account: false, credit_to_account: false
})
const form = reactive(defaultFormState())
const resetForm = () => Object.assign(form, defaultFormState())

function toSentenceCase(str: string) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
function padNum(n: number, wid: number = 5) { return String(n).padStart(wid, '0') }
function generatePlaceholder() {
  const year = new Date().getFullYear()
  const prefix = { payment: 'P', receipt: 'R', refund: 'E', wallet_transfer: 'W' }[transactionType.value]
  const matches = transactions.value.filter((t: any) => t.ref_no?.startsWith(`${year}/${prefix}/`))
  const lastNum = matches.reduce((max: number, t: any) => Math.max(max, parseInt((t.ref_no || '').split('/')[2] || '0')), 0)
  return `${year}/${prefix}/${padNum(lastNum + 1)}`
}
function assignRefNo(incoming?: string | null) {
  const fallback = generatePlaceholder()
  form.ref_no = incoming || fallback
  nextRefNo.value = form.ref_no
}

// ---- COMPUTED PROPERTIES ----
const selectedEntity = computed(() => entityOptions.value.find((e: any) => e.value === form.entity_id))
const selectedFromEntity = computed(() => fromEntityOptions.value.find((e: any) => e.value === form.from_entity_id))
const selectedToEntity = computed(() => toEntityOptions.value.find((e: any) => e.value === form.to_entity_id))

const modalTitle = computed(() => `${editingId.value ? 'Edit' : 'Add'} ${toSentenceCase(transactionType.value)}`)
const particularOptions = computed(() => particulars.value.map((p: any) => ({ label: p.name, value: p.id })))

const filteredTransactions = computed(() => {
  if (!searchQuery.value) return transactions.value
  const q = searchQuery.value.toLowerCase()
  return transactions.value.filter((t: any) => 
    ['ref_no', 'entity_name', 'particular_name'].some(field => 
      String(t[field]).toLowerCase().includes(q)
    )
  )
})

const paginatedTransactions = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredTransactions.value.slice(start, end)
})

const companyRefundFromModeOptions = computed(() => {
  const base = [...companyModeOptions]
  if (['customer', 'partner'].includes(form.to_entity_type as string)) {
    base.push({ label: 'Service Availed', value: 'service_availed' })
  }
  return base
})

const payTypeOptions = computed(() => {
  let types: string[] = []
  const entityType = form.entity_type || 'customer'
  if (transactionType.value === 'payment') {
    if (['customer', 'partner'].includes(entityType as string)) types = ['cash_withdrawal', 'other_expense']
    else if (entityType === 'agent') types = ['cash_deposit', 'other_expense']
    else if (entityType === 'others') types = ['other_expense']
  } else if (transactionType.value === 'receipt') {
    if (['customer', 'partner'].includes(entityType as string)) types = ['cash_deposit', 'other_receipt']
    else types = ['other_receipt']
  } else if (transactionType.value === 'refund') types = ['refund']
  return types.map(val => ({ label: toSentenceCase(val), value: val }))
})

const showWalletToggle = computed(() => {
  if (transactionType.value === 'payment')
    return form.pay_type === 'other_expense' && form.entity_type !== 'others'
  if (transactionType.value === 'receipt')
    return form.pay_type === 'other_receipt' && form.entity_type !== 'others'
  return false
})

const walletToggleDisabled = computed(() => (
  transactionType.value === 'payment' && form.entity_type === 'agent' && form.pay_type === 'cash_deposit'
))

const toggleValue = computed(() => {
  return transactionType.value === 'payment' ? form.deduct_from_account : form.credit_to_account
})

const toggleLabel = computed(() => {
  if (transactionType.value === 'payment')
    return form.entity_type === 'agent' ? 'Credit to wallet/credit?' : 'Deduct from wallet/credit?'
  return form.entity_type === 'agent' ? 'Deduct from wallet/credit?' : 'Credit to wallet/credit?'
})

// ---- FORM RULES ----
const formRules = computed<FormRules>(() => {
  const rules: any = {
    transaction_date: [{ required: true, message: 'Date is required' }],
    amount: [{
      required: true,
      validator: (rule: any, value: any) => {
        if (value === null || value === undefined || value === '') return new Error('Amount is required')
        if (isNaN(Number(value))) return new Error('Amount must be a number')
        if (Number(value) <= 0) return new Error('Amount must be > 0')
        return true
      }, trigger: ['input', 'blur', 'change']
    }]
  }
  
  if (transactionType.value === 'refund') {
    rules.refund_direction = [{ required: true, message: 'Refund direction required' }]
    if (form.refund_direction === 'incoming') {
      rules.from_entity_type = [{ required: true, message: 'From Entity Type required' }]
      if (form.from_entity_type !== 'others') {
        rules.from_entity_id = [{ required: true, message: 'From Entity required' }]
        rules.mode_for_from = [{ required: true, message: 'From Mode required' }]
      }
      if (form.from_entity_type === 'others' || form.mode_for_from === 'cash')
        rules.mode_for_to = [{ required: true, message: 'To Mode required' }]
    } else {
      rules.to_entity_type = [{ required: true, message: 'To Entity Type required' }]
      rules.mode_for_from = [{ required: true, message: 'From Mode required' }]
      if (form.to_entity_type !== 'others')
        rules.to_entity_id = [{ required: true, message: 'To Entity required' }]
    }
  } else if (transactionType.value === 'wallet_transfer') {
    rules.from_entity_type = [{ required: true, message: 'From Entity Type required' }]
    rules.to_entity_type = [{ required: true, message: 'To Entity Type required' }]
    if (form.from_entity_type !== 'others')
      rules.from_entity_id = [{ required: true, message: 'From Entity required' }]
    if (form.to_entity_type !== 'others')
      rules.to_entity_id = [{ required: true, message: 'To Entity required' }]
  } else {
    rules.entity_type = [{ required: true, message: 'Entity type required' }]
    rules.pay_type = [{ required: true, message: 'Payment type required' }]
    rules.mode = [{ required: true, message: 'Mode required' }]
    if (form.entity_type !== 'others')
      rules.entity_id = [{
        validator: (rule: any, value: any) => !value ? new Error('Entity required') : true,
        trigger: ['blur', 'change']
      }]
  }
  return rules
})

// ---- API CALL HELPERS ----
const fetchCompanyBalance = async (mode: string) => {
  try {
    const { data } = await api.get(`/api/company_balance/${mode}`)
    modeBalance.value = data.balance
  } catch { modeBalance.value = null }
}

const loadEntities = async (type: string, context: 'default' | 'from' | 'to' = 'default') => {
  if (!type || type === 'others') { 
    if (context === 'default') entityOptions.value = []
    else if (context === 'from') fromEntityOptions.value = []
    else if (context === 'to') toEntityOptions.value = []
    return 
  }
  
  // Set loading state
  const loaders = {
    default: { loading: entitiesLoading, options: entityOptions },
    from: { loading: fromEntitiesLoading, options: fromEntityOptions },
    to: { loading: toEntitiesLoading, options: toEntityOptions }
  }
  
  const loader = loaders[context]
  loader.loading.value = true

  try {
    const res = await api.get(`/api/manage/${type}`)
    const options = res.data.map((e: any) => ({
      label: e.name, 
      value: e.id, 
      wallet_balance: e.wallet_balance,
      credit_limit: e.credit_limit, 
      credit_used: e.credit_used, 
      credit_balance: e.credit_balance
    }))
    
    loader.options.value = options
  } catch { 
    message.error('Failed to load entities') 
  } finally { 
    loader.loading.value = false
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

const fetchSchema = async () => {
  refNoLoading.value = true
  try {
    const { data } = await api.get(`/api/transactions/${transactionType.value}?mode=form`)
    const parsed: any = {}
    Object.entries(data.default_fields || {}).forEach(([k, v]) => {
      parsed[k] = (typeof v === 'object' && v && 'value' in v) ? v.value : v
      if (k.includes('date') && typeof parsed[k] === 'string') parsed[k] = +new Date(parsed[k])
    })
    defaultFields.value = parsed
    assignRefNo(data.ref_no)
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Failed to load form schema')
    defaultFields.value = {}
    assignRefNo(null)
  } finally { 
    refNoLoading.value = false 
  }
}

const fetchTransactions = async () => {
  loading.value = true
  try {
    const params: any = { transaction_type: transactionType.value }
    if (dateRange.value) {
      const [start, end] = dateRange.value
      params.start_date = new Date(start).toISOString().split('T')[0]
      params.end_date = new Date(end).toISOString().split('T')[0]
    }
    const res = await api.get(`/api/transactions/${transactionType.value}`, { params })
    transactions.value = res.data.transactions || []
    pagination.itemCount = transactions.value.length
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Failed to fetch transactions')
    transactions.value = []
  } finally { 
    loading.value = false 
  }
}

// ---- FORM HANDLERS ----
const handleEntityTypeChange = async (value: string) => {
  form.entity_type = value
  form.entity_id = null
  form.pay_type = null
  form.mode = null
  if (value !== 'others') await loadEntities(value, 'default')
  else entityOptions.value = []
}

const handleRefundEntityChange = async (value: string, dir: 'from' | 'to') => {
  const prefix = dir === 'to' ? 'to_' : 'from_'
  form[`${prefix}entity_type`] = value
  form[`${prefix}entity_id`] = null
  form.credit_to_account = false
  form.deduct_from_account = false
  form.mode_for_from = null
  form.mode_for_to = null
  if (value !== 'others') await loadEntities(value, dir)
  else if (dir === 'from') fromEntityOptions.value = []
  else if (dir === 'to') toEntityOptions.value = []
}

const handlePaymentTypeChange = (value: string) => {
  if (value === 'cash_withdrawal' && form.entity_type === 'agent') {
    message.warning('Cash withdrawal not available for agents')
    form.pay_type = null
  }
}

const handleToggleValueChange = (value: boolean) => {
  if (transactionType.value === 'payment') {
    form.deduct_from_account = value
  } else {
    form.credit_to_account = value
  }
}

// ---- MODAL & SUBMIT ----
const openAddModal = async (row: any = null) => {
  resetForm()
  editingId.value = row?.id || null
  fieldErrors.value = {}
  
  if (row) {
    Object.assign(form, row, row.extra_data || {})
    if (row.timestamp) form.transaction_date = row.timestamp
    else if (row.date) form.transaction_date = +new Date(row.date)
    assignRefNo(row.ref_no)
    
    if (transactionType.value === 'refund') {
      await loadParticulars()
      const entType = form.refund_direction === 'incoming' ? form.from_entity_type : form.to_entity_type
      if (entType && entType !== 'others') {
        if (form.refund_direction === 'incoming') await loadEntities(entType, 'from')
        else await loadEntities(entType, 'to')
      }
      entityOptionsReady.value = true
    }
  } else {
    Object.entries(defaultFields.value).forEach(([k, v]) => {
      form[k] = (typeof v === 'object' && v && 'value' in v) ? v.value : v
    })
    assignRefNo(null)
    try {
      const res = await api.get(`/api/transactions/${transactionType.value}?mode=form`)
      assignRefNo(res.data.ref_no)
    } catch {}
  }
  
  await loadParticulars()
  
  if (transactionType.value === 'wallet_transfer') {
    if (form.from_entity_type && form.from_entity_type !== 'others') 
      await loadEntities(form.from_entity_type, 'from')
    if (form.to_entity_type && form.to_entity_type !== 'others') 
      await loadEntities(form.to_entity_type, 'to')
  } else if (form.entity_type && form.entity_type !== 'others') {
    await loadEntities(form.entity_type, 'default')
  }
  
  entityOptionsReady.value = true
  modalVisible.value = true
}

const closeModal = () => { 
  modalVisible.value = false
  editingId.value = null 
}

const getRefundEntityDetails = () => {
  const incoming = form.refund_direction === 'incoming'
  const entType = incoming ? form.from_entity_type : form.to_entity_type
  const entId = entType === 'others' ? null : (incoming ? form.from_entity_id : form.to_entity_id)
  return { entity_type: entType, entity_id: entId }
}

const validateAndSubmit = async () => {
  try {
    await formRef.value?.validate()
    if (form.amount == null || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      message.error('Amount must be a positive number')
      return
    }
    
    // Company balance check
    let newBalance = modeBalance.value
    if (newBalance !== null && form.amount) {
      let delta = 0
      if (transactionType.value === 'payment') delta = -form.amount
      if (transactionType.value === 'receipt') delta = +form.amount
      if (transactionType.value === 'refund' && form.refund_direction === 'outgoing') delta = -form.amount
      if (transactionType.value === 'refund' && form.refund_direction === 'incoming') delta = +form.amount
      newBalance += delta
      
      if (newBalance < 0 && !confirm(`This transaction will make company account negative (₹${newBalance.toFixed(2)}). Proceed anyway?`)) {
        return
      }
    }
    
    await submitTransaction()
  } catch (errors) {
    console.log('Form validation failed', errors)
  }
}

const submitTransaction = async () => {
  try {
    fieldErrors.value = {}
    await formRef.value?.validate()
    
    if (form.amount == null || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      message.error('Amount must be a positive number')
      return
    }
    
    const payload: any = {
      ...form,
      transaction_type: transactionType.value,
      pay_type: transactionType.value === 'refund' ? 'refund' : form.pay_type,
      credit_to_account: !!form.credit_to_account,
      deduct_from_account: !!form.deduct_from_account
    }
    
    // Refund specific
    if (transactionType.value === 'refund') {
      Object.assign(payload, getRefundEntityDetails())
      payload.mode = form.refund_direction === 'incoming' ? form.mode_for_from : form.mode_for_to
    }
    
    if (editingId.value) {
      await api.put(`/api/transactions/${editingId.value}`, payload)
      message.success('Transaction updated')
    } else {
      await api.post(`/api/transactions/${transactionType.value}`, payload)
      message.success('Transaction added')
    }
    
    modalVisible.value = false
    editingId.value = null
    await fetchTransactions()
  } catch (e: any) {
    if (e?.response?.data?.field_errors) {
      fieldErrors.value = e.response.data.field_errors
    } else {
      message.error(e?.response?.data?.error || 'Failed to submit transaction')
    }
  }
}

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

// Unified export function
const exportTransactions = async (format: 'excel' | 'pdf') => {
  exporting.value = true
  try {
    const params: any = { export: format }
    
    if (dateRange.value) {
      const [start, end] = dateRange.value
      params.start_date = new Date(start).toISOString().split('T')[0]
      params.end_date = new Date(end).toISOString().split('T')[0]
    }
    
    const response = await api.get(`/api/transactions/${transactionType.value}`, { 
      params, 
      responseType: 'blob' 
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url

    const extension = format === 'excel' ? 'xlsx' : 'pdf'
    link.setAttribute('download', `${transactionType.value}_transactions_${new Date().toISOString().slice(0,10)}.${extension}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (e: any) {
    // Improved error handling
    let errorMsg = e?.response?.data?.error || e.message
    if (e.response?.data instanceof Blob) {
      const text = await e.response.data.text()
      try {
        const json = JSON.parse(text)
        errorMsg = json.error || text
      } catch {
        errorMsg = text
      }
    }
    message.error(`${format.toUpperCase()} export failed: ${errorMsg}`)
  } finally {
    exporting.value = false
  }
}

// ---- DATA-TABLE ----
const columns = computed(() => {
  const baseColumns = [
    { title: 'Ref No', key: 'ref_no' },
    { title: 'Date', key: 'date', render: (row: any) => new Date(row.date).toLocaleDateString() },
  ]
  
  // Add refund direction for refunds after date
  if (transactionType.value === 'refund') {
    baseColumns.push({
      title: 'Direction',
      key: 'refund_direction',
      render: (row: any) => row.refund_direction ? toSentenceCase(row.refund_direction) : ''
    })
  }
  
  // Add wallet transfer specific columns
  if (transactionType.value === 'wallet_transfer') {
    baseColumns.push(
      { 
        title: 'Transfer Direction', 
        key: 'transfer_direction',
        render: (row: any) => {
          const fromType = row.from_entity_type || row.extra_data?.from_entity_type || ''
          const toType = row.to_entity_type || row.extra_data?.to_entity_type || ''
          return `${toSentenceCase(fromType)} → ${toSentenceCase(toType)}`
        }
      },
      { 
        title: 'From Entity', 
        key: 'from_entity_name',
        render: (row: any) => row.from_entity_name || row.extra_data?.from_entity_name || '-' 
      },
      { 
        title: 'To Entity', 
        key: 'to_entity_name',
        render: (row: any) => row.to_entity_name || row.extra_data?.to_entity_name || '-' 
      }
    )
  }
 else {
    // For non-wallet transfers
    baseColumns.push(
      { title: 'Entity Type', key: 'entity_type', render: (row: any) => toSentenceCase(row.entity_type || '') },
      { title: 'Entity Name', key: 'entity_name' }
    )
  }

  // Common columns
  baseColumns.push(
    { title: 'Particular', key: 'particular_name' }
  )
  
  // Add payment type and mode only for non-wallet transfers
  if (transactionType.value !== 'wallet_transfer') {
    baseColumns.push(
      {
        title: 'Payment Type',
        key: 'pay_type',
        render: (row: any) => row.pay_type ? toSentenceCase(row.pay_type) : ''
      },
      { title: 'Mode', key: 'mode', render: (row: any) => toSentenceCase(row.mode || '') }
    )
  }
  
  // Amount and description always shown
  baseColumns.push(
    { title: 'Amount', key: 'amount' },
    { title: 'Description', key: 'description' }
  )

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
  
  return [...baseColumns, actions]
})

// ---- WATCHERS ----
watch(() => route.query.type, async (type) => {
  if (typeof type === 'string' && tabs.includes(type)) {
    transactionType.value = type as any
    await fetchSchema()
    await fetchTransactions()
  }
}, { immediate: true })

watch(() => form.refund_direction, (newDir) => {
  if (transactionType.value === 'refund') {
    form.mode_for_from = null
    form.mode_for_to = null
    form.credit_to_account = false
    form.deduct_from_account = false
    if (newDir === 'incoming' && form.from_entity_type) loadEntities(form.from_entity_type, 'from')
    else if (newDir === 'outgoing' && form.to_entity_type) loadEntities(form.to_entity_type, 'to')
  }
})

watch(() => [form.from_entity_type, form.to_entity_type], () => {
  if (transactionType.value === 'refund') {
    nextTick(() => { 
      if (form.refund_direction === 'incoming' && form.mode_for_from) 
        form.mode_for_from = form.mode_for_from 
    })
  }
})

watch(dateRange, fetchTransactions)

// ---- LIFECYCLE ----
onMounted(async () => {
  dateRange.value = defaultDateRange.value
  const typeParam = route.query.type as string
  transactionType.value = tabs.includes(typeParam) ? typeParam as any : 'payment'
  await fetchSchema()
  await fetchTransactions()
  await loadParticulars()
  if (form.entity_type && form.entity_type !== 'others') {
    await loadEntities(form.entity_type, 'default')
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/theme' as *;

/* Add responsive grid styling */
.responsive-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  align-items: start;
  
  .full-width {
    grid-column: 1 / -1;
  }
}

/* Add styling for form sections */
.form-section {
  display: contents; /* Makes children part of the grid */
}

/* Style form items */
.n-form-item {
  margin-bottom: 0;
}

/* Add spacing for tables and controls */
.table-controls {
  margin-bottom: 20px;
}

/* Style export buttons */
.export-buttons {
  margin-left: 12px;
  
  .n-button {
    margin-right: 8px;
  }
}

/* Add styling for date picker and search */
.search-filter, .date-filter {
  max-width: 200px;
}

/* Modal card styling */
.modal-card {
  padding: 20px;
  
  .n-h3 {
    margin-top: 0;
  }
}
</style>