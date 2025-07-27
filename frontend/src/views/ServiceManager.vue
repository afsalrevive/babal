<template>
  <n-card>
    <template #header>
      <n-h2>Service Manager</n-h2>
    </template>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="active" tab="Active Services">
        <n-space justify="space-between" wrap class="table-controls">
          <n-space>
            <n-input
              v-model:value="searchQuery"
              placeholder="Search services"
              clearable
              style="max-width: 300px;"
            />
            <n-date-picker
              v-model:value="dateRange"
              type="daterange"
              clearable
              :default-value="defaultDateRange"
              style="max-width: 300px;"
            />
            <n-button @click="exportExcel" type="primary" secondary>
              <template #icon>
                <n-icon><DocumentTextOutline /></n-icon>
              </template>
              Excel
            </n-button>
            <n-button @click="exportPDF" type="primary" secondary>
              <template #icon>
                <n-icon><DocumentTextOutline /></n-icon>
              </template>
              PDF
            </n-button>
          </n-space>
          <PermissionWrapper resource="service" operation="write">
            <n-button type="primary" @click="openAddModal">Book Service</n-button>
          </PermissionWrapper>
        </n-space>

        <n-data-table
          :columns="columnsActive"
          :data="paginatedActiveServices"
          :loading="loading"
          :pagination="paginationActive"
          striped
          style="margin-top: 16px;"
        />
      </n-tab-pane>
      <n-tab-pane name="cancelled" tab="Cancelled Services">
        <n-space>
          <n-input
            v-model:value="searchQuery"
            placeholder="Search services"
            clearable
            style="max-width: 300px;"
          />
          <n-date-picker
            v-model:value="dateRange"
            type="daterange"
            clearable
            :default-value="defaultDateRange"
            style="max-width: 300px;"
          />
          <n-button @click="exportExcel" type="primary" secondary>
            <template #icon>
              <n-icon><DocumentTextOutline /></n-icon>
            </template>
            Excel
          </n-button>
          <n-button @click="exportPDF" type="primary" secondary>
            <template #icon>
              <n-icon><DocumentTextOutline /></n-icon>
            </template>
            PDF
          </n-button>
        </n-space>
        <n-data-table
          :columns="columnsCancelled"
          :data="paginatedCancelledServices"
          :loading="loading"
          :pagination="paginationCancelled"
          striped
          style="margin-top: 16px;"
        />
      </n-tab-pane>
    </n-tabs>

    <!-- Book/Edit Service Modal -->
    <n-modal v-model:show="modalVisible" class="full-width-modal">
      <n-card class="modal-card">
        <n-h2 class="modal-title">{{ editMode ? 'Edit Service' : 'Book Service' }}</n-h2>
        <n-form :model="currentService" :rules="formRules" ref="formRef">
          <n-form-item label="Reference No">
            <n-input :value="referenceNumber" disabled />
          </n-form-item>
          
          <n-form-item label="Date" path="date">
            <n-date-picker
              v-model:value="currentService.date"
              type="date"
              clearable
              :is-date-disabled="disableFutureDates"
            />
          </n-form-item>
          
          <n-form-item label="Customer" path="customer_id" class="wide-field">
            <n-space vertical>
              <n-select
                v-model:value="currentService.customer_id"
                :options="customerOptions"
                label-field="name"
                value-field="id"
                placeholder="Select Customer"
                filterable
              />
              <n-grid v-if="selectedCustomer" :cols="2" x-gap="12">
                <n-gi>
                  <n-text type="info">Wallet: {{ selectedCustomer.wallet_balance }}</n-text>
                </n-gi>
                <n-gi>
                  <n-text type="warning">Credit: {{ selectedCustomer.credit_used }}/{{ selectedCustomer.credit_limit }}</n-text>
                </n-gi>
              </n-grid>
            </n-space>
          </n-form-item>
          
          <n-form-item label="Particular" path="particular_id">
            <n-select
              v-model:value="currentService.particular_id"
              :options="particularOptions"
              label-field="name"
              value-field="id"
              placeholder="Select Particular"
              filterable
            />
          </n-form-item>
          
          <n-form-item label="Customer Charge" path="customer_charge">
            <n-input-number 
              v-model:value="currentService.customer_charge" 
              :min="0" 
            />
          </n-form-item>
          
          <n-form-item label="Payment Mode" path="customer_payment_mode">
            <n-select
              v-model:value="currentService.customer_payment_mode"
              :options="paymentModeOptions"
              placeholder="Select Payment Mode"
            />
          </n-form-item>
          
          <n-space class="action-buttons" justify="end">
            <n-button @click="modalVisible = false">Cancel</n-button>
            <n-button type="primary" @click="editMode ? updateService() : bookService()">
              {{ editMode ? 'Update' : 'Book' }} Service
            </n-button>
          </n-space>
        </n-form>
      </n-card>
    </n-modal>

    <!-- Cancel Service Modal -->
    <n-modal v-model:show="cancelModalVisible" class="transaction-modal">
      <n-card class="modal-card">
        <n-h2 class="modal-title">Cancel Service #{{ currentService.ref_no }}</n-h2>
        <n-form class="responsive-form-grid">
          <div class="refund-section">
            <n-h3>Customer Refund</n-h3>
            <n-form-item label="Refund Amount">
              <n-input-number v-model:value="cancelData.customer_refund_amount" :min="0" />
            </n-form-item>
            
            <n-form-item label="Refund Mode">
              <n-select
                v-model:value="cancelData.customer_refund_mode"
                :options="paymentModeOptions"
                placeholder="Select Refund Mode"
              />
            </n-form-item>
          </div>
          
          <n-space class="action-buttons" justify="end">
            <n-button @click="cancelModalVisible = false">Cancel</n-button>
            <n-button type="error" @click="confirmCancel">Confirm Cancellation</n-button>
          </n-space>
        </n-form>
      </n-card>
    </n-modal>
    
    <!-- Edit Cancelled Service Modal -->
    <n-modal v-model:show="editCancelledModalVisible" class="transaction-modal">
      <n-card class="modal-card">
        <n-h2 class="modal-title">Edit Cancelled Service #{{ currentService.ref_no }}</n-h2>
        <n-form class="responsive-form-grid">
          <div class="refund-section">
            <n-h3>Customer Refund</n-h3>
            <n-form-item label="Refund Amount">
              <n-input-number v-model:value="currentService.customer_refund_amount" :min="0" />
            </n-form-item>
            
            <n-form-item label="Refund Mode">
              <n-select
                v-model:value="currentService.customer_refund_mode"
                :options="paymentModeOptions"
                placeholder="Select Refund Mode"
              />
            </n-form-item>
          </div>
          
          <n-space class="action-buttons" justify="end">
            <n-button @click="editCancelledModalVisible = false">Cancel</n-button>
            <n-button type="primary" @click="updateCancelledService">Update</n-button>
          </n-space>
        </n-form>
      </n-card>
    </n-modal>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, watch} from 'vue'
import { useMessage, NButton, NSpace } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import api from '@/api'
import PermissionWrapper from '@/components/PermissionWrapper.vue'
import { DocumentTextOutline } from '@vicons/ionicons5'

const message = useMessage()

// Data
const activeTab = ref('active')
const searchQuery = ref('')
const services = ref<any[]>([])
const loading = ref(false)
const modalVisible = ref(false)
const cancelModalVisible = ref(false)
const editCancelledModalVisible = ref(false)
const editMode = ref(false)
const formRef = ref<any>(null)

// Date range
const dateRange = ref<[number, number] | null>(null)
const defaultDateRange = computed(() => {
  const end = Date.now()
  const start = end - 7 * 24 * 60 * 60 * 1000
  return [start, end] as [number, number]
})

onMounted(() => {
  dateRange.value = defaultDateRange.value
})

// Payment mode options
const paymentModeOptions = [
  { label: 'Cash', value: 'cash' },
  { label: 'Online', value: 'online' },
  { label: 'Wallet', value: 'wallet' },
]

const currentService = ref<any>({
  customer_id: null,
  particular_id: null,
  ref_no: '',
  customer_charge: 0,
  customer_payment_mode: 'cash',
  date: Date.now()
})

const cancelData = ref({
  customer_refund_amount: 0,
  customer_refund_mode: 'cash'
})

// Options
const customerOptions = ref<any[]>([])
const particularOptions = ref<any[]>([])

const selectedCustomer = computed(() => {
  if (!currentService.value.customer_id) return null
  return customerOptions.value.find(
    c => c.id === currentService.value.customer_id
  )
})

const generatePlaceholder = () => {
  const year = new Date().getFullYear();
  const yearServices = services.value.filter(s => 
    s.ref_no && s.ref_no.startsWith(`${year}/S/`)
  );
  
  if (yearServices.length === 0) return `${year}/S/00001`;
  
  const lastNum = yearServices.reduce((max, service) => {
    const parts = service.ref_no.split('/');
    if (parts.length < 3) return max;
    
    const numPart = parts[2];
    const num = parseInt(numPart) || 0;
    return Math.max(max, num);
  }, 0);
  
  return `${year}/S/${(lastNum + 1).toString().padStart(5, '0')}`;
};

const referencePlaceholder = ref('')
const referenceNumber = computed(() => {
  if (editMode.value && currentService.value.ref_no) {
    return currentService.value.ref_no
  }
  return referencePlaceholder.value || 'Generating...'
})

// Filter services
const filteredServices = computed(() => {
  const search = searchQuery.value.toLowerCase()
  return filterServicesByDate(services.value).filter(s => 
    s.status === 'booked' && 
    (s.ref_no?.toLowerCase().includes(search) ||
    s.customer_name?.toLowerCase().includes(search))
  )
})

const cancelledServices = computed(() => {
  const search = searchQuery.value.toLowerCase()
  return filterServicesByDate(services.value).filter(s => 
    s.status === 'cancelled' && 
    (s.ref_no?.toLowerCase().includes(search) ||
    s.customer_name?.toLowerCase().includes(search))
  )
})

const paginationActive = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    paginationActive.page = page
  },
  onUpdatePageSize: (pageSize: number) => {
    paginationActive.pageSize = pageSize
    paginationActive.page = 1
  }
})

const paginationCancelled = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    paginationCancelled.page = page
  },
  onUpdatePageSize: (pageSize: number) => {
    paginationCancelled.pageSize = pageSize
    paginationCancelled.page = 1
  }
})

// Computed properties for paginated data
const paginatedActiveServices = computed(() => {
  const start = (paginationActive.page - 1) * paginationActive.pageSize
  const end = start + paginationActive.pageSize
  paginationActive.itemCount = filteredServices.value.length
  return filteredServices.value.slice(start, end)
})

const paginatedCancelledServices = computed(() => {
  const start = (paginationCancelled.page - 1) * paginationCancelled.pageSize
  const end = start + paginationCancelled.pageSize
  paginationCancelled.itemCount = cancelledServices.value.length
  return cancelledServices.value.slice(start, end)
})

const filterServicesByDate = (servicesList: any[]) => {
  if (!dateRange.value) return servicesList;
  
  const [startTimestamp, endTimestamp] = dateRange.value;
  const startDate = new Date(startTimestamp);
  const endDate = new Date(endTimestamp);
  
  endDate.setHours(23, 59, 59, 999);
  
  return servicesList.filter(service => {
    if (!service.date) return false;
    const serviceDate = new Date(service.date);
    return serviceDate >= startDate && serviceDate <= endDate;
  });
};

// Form rules
const formRules = ref({
  customer_id: {
    required: true,
    validator: (rule: any, value: any) => (value !== null && value !== undefined),
    message: 'Customer is required',
    trigger: ['change', 'blur']
  },
  customer_charge: {
    required: true,
    type: 'number',
    min: 0,
    message: 'Customer charge must be positive',
    trigger: ['blur']
  },
  customer_payment_mode: {
    required: true,
    message: 'Payment mode is required',
    trigger: ['change']
  },
  date: {
    required: true,
    validator: (_rule: any, value: any) => !!value,
    message: 'Date is required',
    trigger: ['change', 'blur']
  }
})

// Disable future dates
const disableFutureDates = (timestamp: number) => {
  return timestamp > Date.now();
};

// Methods
const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      status: 'all',
      start_date: formatDateForAPI(dateRange.value[0]),
      end_date: formatDateForAPI(dateRange.value[1])
    }
    
    const res = await api.get('/api/services', { params })
    services.value = res.data
  } catch (e) {
    message.error('Failed to load services')
  } finally {
    loading.value = false
  }
}

const formatDateForAPI = (timestamp: number) => {
  return new Date(timestamp).toISOString().split('T')[0]
}

const toSentenceCase = (str: string | null | undefined) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const fetchOptions = async () => {
  try {
    loading.value = true;
    
    const [customers, particulars] = await Promise.all([
      api.get('/api/manage/customer'),
      api.get('/api/manage/particular')
    ]);
    
    customerOptions.value = customers.data.map((c: any) => ({ 
      name: c.name, 
      id: c.id, 
      wallet_balance: c.wallet_balance,
      credit_used: c.credit_used,
      credit_limit: c.credit_limit 
    }));
    
    particularOptions.value = particulars.data.map((p: any) => ({ 
      name: p.name, 
      id: p.id 
    }));
    
  } catch (e) {
    message.error('Failed to load options');
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  referencePlaceholder.value = generatePlaceholder();
  
  currentService.value = {
    customer_id: null,
    particular_id: null,
    ref_no: '',
    customer_charge: 0,
    customer_payment_mode: 'cash',
    date: Date.now()
  };
  
  modalVisible.value = true;
  editMode.value = false;
};

const bookService = async () => {
  try {
    await formRef.value?.validate();
    
    const formattedDate = new Date(currentService.value.date).toISOString().split('T')[0];
    
    const payload = { 
      ...currentService.value,
      date: formattedDate
    };
    
    const response = await api.post('/api/services', payload);
    message.success(`Service booked! Reference: ${response.data.ref_no}`);
    modalVisible.value = false;
    await fetchData();
    
  } catch (e) {
    handleApiError(e);
  }
};

const updateService = async () => {
  try {
    await formRef.value?.validate()
    
    const formattedDate = new Date(currentService.value.date).toISOString().split('T')[0];
    
    const payload = {
      id: currentService.value.id,
      particular_id: currentService.value.particular_id,
      ref_no: currentService.value.ref_no,
      customer_charge: Number(currentService.value.customer_charge),
      customer_payment_mode: currentService.value.customer_payment_mode,
      date: formattedDate
    };
    
    await api.patch('/api/services', payload)
    message.success('Service updated successfully')
    modalVisible.value = false
    await fetchData()
  } catch (e) {
    handleApiError(e)
  }
}

const editService = (service: any) => {
  currentService.value = { 
    ...service,
    date: service.date ? new Date(service.date).getTime() : Date.now()
  };
  
  editMode.value = true;
  modalVisible.value = true;
}

const deleteService = async (service: any) => {
  const action = service.status === 'cancelled' ? 'delete_cancelled' : 'delete'
  
  const messageText = service.status === 'cancelled' 
    ? 'Deleting a cancelled service will reverse all transactions. Are you sure?' 
    : 'Are you sure you want to delete this service?'
  
  if (!window.confirm(messageText)) return
  
  try {
    await api.delete(`/api/services?id=${service.id}&action=${action}`)
    message.success(`Service ${action === 'delete_cancelled' ? 'deleted with reversal' : 'deleted'} successfully`)
    await fetchData()
  } catch (e) {
    handleApiError(e)
  }
}

const openCancelModal = (service: any) => {
  currentService.value = { ...service }
  cancelData.value = {
    customer_refund_amount: service.customer_charge,
    customer_refund_mode: service.customer_payment_mode || 'cash'
  }
  cancelModalVisible.value = true
}

const editCancelledService = (service: any) => {
  currentService.value = { 
    ...service,
    date: service.date ? new Date(service.date).getTime() : null
  };
  editCancelledModalVisible.value = true;
}

const updateCancelledService = async () => {
  try {
    const payload = {
      id: currentService.value.id,
      customer_refund_amount: currentService.value.customer_refund_amount,
      customer_refund_mode: currentService.value.customer_refund_mode
    };
    
    await api.patch('/api/services', payload);
    message.success('Cancelled service updated successfully');
    editCancelledModalVisible.value = false;
    await fetchData();
  } catch (e) {
    handleApiError(e);
  }
}

const confirmCancel = async () => {
  if (!currentService.value?.id) {
    message.error('Service ID is missing')
    return
  }

  const payload = {
    service_id: currentService.value.id,
    customer_refund_amount: cancelData.value.customer_refund_amount,
    customer_refund_mode: cancelData.value.customer_refund_mode
  }

  try {
    await api.post('/api/services', payload, {
      params: { action: 'cancel' }
    });
    message.success('Service cancelled successfully')
    cancelModalVisible.value = false
    await fetchData()
  } catch (e) {
    handleApiError(e)
  }
}

const handleApiError = (e: any) => {
  if (e.response) {
    const errorMsg = e.response.data?.error || 'Operation failed';
    message.error(errorMsg);
  } else {
    message.error('Request error: ' + e.message);
  }
};

// Table columns
const baseColumns: DataTableColumns<any> = [
  { title: 'Ref No', key: 'ref_no', sorter: (a, b) => a.ref_no.localeCompare(b.ref_no) },
  { title: 'Date', key: 'date', render: (row) => row.date ? new Date(row.date).toLocaleDateString() : 'N/A' },
  { title: 'Customer', key: 'customer_name', sorter: (a, b) => a.customer_name.localeCompare(b.customer_name) },
  { title: 'Particular', key: 'particular_name', sorter: (a, b) => a.particular_name.localeCompare(b.particular_name) },
  { title: 'Charge', key: 'customer_charge', sorter: (a, b) => a.customer_charge - b.customer_charge },
  { 
    title: 'Payment Mode', 
    key: 'customer_payment_mode', 
    render: (row) => toSentenceCase(row.customer_payment_mode)
  }
]

const columnsActive = ref<DataTableColumns<any>>([
  ...baseColumns,
  {
    title: 'Actions',
    key: 'actions',
    render(row) {
      if (row.status !== 'booked') return null;
      return h(NSpace, { size: 'small' }, () => [
        h(PermissionWrapper, { resource: 'service', operation: 'write' }, {
          default: () => h(NButton, { size: 'small', onClick: () => editService(row) }, { default: () => 'Edit' })
        }),
        h(PermissionWrapper, { resource: 'service', operation: 'write' }, {
          default: () => h(NButton, { size: 'small', type: 'error', onClick: () => deleteService(row) }, { default: () => 'Delete' })
        }),
        h(PermissionWrapper, { resource: 'service', operation: 'write' }, {
          default: () => h(NButton, { size: 'small', type: 'warning', onClick: () => openCancelModal(row) }, { default: () => 'Cancel' })
        }),
      ])
    }
  }
])

const columnsCancelled = ref<DataTableColumns<any>>([
  ...baseColumns,
  { title: 'Refund Amount', key: 'customer_refund_amount' },
  { 
    title: 'Refund Mode', 
    key: 'customer_refund_mode',
    render: (row) => toSentenceCase(row.customer_refund_mode)
  },
  {
    title: 'Actions',
    key: 'actions',
    render(row) {
      if (row.status !== 'cancelled') return null;
      return h(NSpace, { size: 'small' }, () => [
        h(PermissionWrapper, { resource: 'service', operation: 'write' }, {
          default: () => h(NButton, { 
            size: 'small', 
            onClick: () => editCancelledService(row) 
          }, { default: () => 'Edit Refund' })
        }),
        h(PermissionWrapper, { resource: 'service', operation: 'write' }, {
          default: () => h(NButton, { 
            size: 'small', 
            type: 'error', 
            onClick: () => deleteService(row) 
          }, { default: () => 'Delete' })
        })
      ])
    }
  }
])

const exportExcel = async () => {
  try {
    const params = {
      start_date: formatDateForAPI(dateRange.value[0]),
      end_date: formatDateForAPI(dateRange.value[1]),
      status: activeTab.value === 'active' ? 'booked' : 'cancelled',
      export: 'excel'
    }
    
    const response = await api.get('/api/services', { 
      params,
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    const statusType = activeTab.value === 'active' ? 'Active' : 'Cancelled'
    link.setAttribute('download', `${statusType}_Services_${new Date().toISOString().slice(0,10)}.xlsx`)
    document.body.appendChild(link)
    link.click()
  } catch (e) {
    message.error('Excel export failed')
  }
}

const exportPDF = async () => {
  try {
    const params = {
      start_date: formatDateForAPI(dateRange.value[0]),
      end_date: formatDateForAPI(dateRange.value[1]),
      status: activeTab.value === 'active' ? 'booked' : 'cancelled',
      export: 'pdf'
    }
    
    const response = await api.get('/api/services', { 
      params,
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    const statusType = activeTab.value === 'active' ? 'Active' : 'Cancelled'
    link.setAttribute('download', `${statusType}_Services_${new Date().toISOString().slice(0,10)}.pdf`)
    document.body.appendChild(link)
    link.click()
  } catch (e) {
    message.error('PDF export failed')
  }
}

watch([searchQuery, dateRange], () => {
  paginationActive.page = 1
  paginationCancelled.page = 1
})

// Lifecycle
onMounted(async () => {
  await fetchData();
  await fetchOptions();
});
</script>

<style scoped lang="scss">
@use '@/styles/theme' as *;
.responsive-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.modal-card {
  max-width: 800px;
  width: 100%;
}

.wide-field {
  grid-column: span 2;
}

.action-buttons {
  margin-top: 24px;
}
</style>