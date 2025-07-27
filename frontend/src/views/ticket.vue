<template>
  <n-card>
    <template #header>
      <n-h2>Ticket Manager</n-h2>
    </template>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="active" tab="Active Tickets">
        <n-space justify="space-between" wrap class="table-controls">
          <n-input
            v-model:value="searchQuery"
            placeholder="Search "
            clearable
            style="max-width: 300px;"
          />
          <PermissionWrapper resource="ticket" operation="write">
            <n-button type="primary" @click="openAddModal">Book Ticket</n-button>
          </PermissionWrapper>
        </n-space>

        <n-data-table
          :columns="columnsBooked"
          :data="filteredTickets"
          :loading="loading"
          striped
          style="margin-top: 16px;"
        />
      </n-tab-pane>
      <n-tab-pane name="cancelled" tab="Cancelled Tickets">
        <n-input
          v-model:value="searchQuery"
          placeholder="Search "
          clearable
          style="max-width: 300px;"
        />
        <n-data-table
          :columns="columnsCancelled"
          :data="cancelledTickets"
          :loading="loading"
          striped
          style="margin-top: 16px;"
        />
      </n-tab-pane>
    </n-tabs>

    <!-- Book/Edit Ticket Modal -->
    <n-modal v-model:show="modalVisible" class="full-width-modal">
      <n-card class="modal-card">
        <n-h2 class="modal-title">{{ editMode ? 'Edit Ticket' : 'Book Ticket' }}</n-h2>
        <n-form class="responsive-form-grid" :model="currentTicket" :rules="formRules" ref="formRef">
          <n-form-item label="Customer" path="customer_id" class="wide-field">
            <n-select
              v-model:value="currentTicket.customer_id"
              :options="customerOptions"
              label-field="name"
              value-field="id"
              placeholder="Select Customer"
              @update:value="updatePassengerOptions"
            />
          </n-form-item>
          
          <n-form-item label="Passenger" path="passenger_id">
            <n-select
              v-model:value="currentTicket.passenger_id"
              :options="passengerOptions"
              label-field="name"
              value-field="id"
              placeholder="Select Passenger"
              :loading="passengersLoading"
              filterable
            />
          </n-form-item>
          <!-- Add this to your form -->
          <n-form-item label="Particular" path="particular_id">
            <n-select
              v-model:value="currentTicket.particular_id"
              :options="particularOptions"
              label-field="name"
              value-field="id"
              placeholder="Select Particular"
            />
          </n-form-item>
          <n-form-item label="Travel Location" path="travel_location_id">
            <n-select
              v-model:value="currentTicket.travel_location_id"
              :options="locationOptions"
              label-field="name"
              value-field="id"
              placeholder="Select Location"
            />
          </n-form-item>
          
          <n-form-item label="Agent" path="agent_id">
            <n-select
              v-model:value="currentTicket.agent_id"
              :options="agentOptions"
              label-field="name"
              value-field="id"
              placeholder="Select Agent"
            />
          </n-form-item>
          
          <n-form-item label="Reference No">
            <n-input :value="referenceNumber" disabled />
          </n-form-item>
          
          <n-form-item label="Customer Charge" path="customer_charge">
            <n-input-number v-model:value="currentTicket.customer_charge" :min="0" />
          </n-form-item>
          
          <n-form-item label="Customer Payment" path="customer_payment_mode" class="wide-field">
            <n-select
              v-model:value="currentTicket.customer_payment_mode"
              :options="paymentModeOptions"
              placeholder="Select Payment Mode"
            />
          </n-form-item>
          
          <n-form-item label="Agent Paid" v-if="currentTicket.agent_id">
            <n-input-number v-model:value="currentTicket.agent_paid" :min="0" />
          </n-form-item>
          
          <n-form-item label="Agent Payment" v-if="currentTicket.agent_id && currentTicket.agent_paid > 0" class="wide-field">
            <n-select
              v-model:value="currentTicket.agent_payment_mode"
              :options="paymentModeOptions"
              placeholder="Select Payment Mode"
            />
          </n-form-item>
          
          <n-alert class="wide-field" v-if="profit !== null" title="Profit" type="info">
            {{ profit }}
          </n-alert>
          
          <n-space class="action-buttons" justify="end">
            <n-button @click="modalVisible = false">Cancel</n-button>
            <n-button type="primary" @click="editMode ? updateTicket() : bookTicket()">
              {{ editMode ? 'Update' : 'Book' }} Ticket
            </n-button>
          </n-space>
        </n-form>
      </n-card>
    </n-modal>

    <!-- Cancel Ticket Modal -->
    <n-modal v-model:show="cancelModalVisible" class="transaction-modal">
      <n-card class="modal-card">
        <n-h2 class="modal-title">Cancel Ticket #{{ currentTicket.ref_no }}</n-h2>
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
          
          <n-divider v-if="currentTicket.agent_id" />
          
          <div class="recovery-section" v-if="currentTicket.agent_id">
            <n-h3>Agent Recovery</n-h3>
            <n-form-item label="Recovery Amount">
              <n-input-number v-model:value="cancelData.agent_recovery_amount" :min="0" />
            </n-form-item>
            
            <n-form-item label="Recovery Mode">
              <n-select
                v-model:value="cancelData.agent_recovery_mode"
                :options="paymentModeOptions"
                placeholder="Select Recovery Mode"
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
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, nextTick } from 'vue'
import { useMessage, NButton, NSpace } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import api from '@/api'
import PermissionWrapper from '@/components/PermissionWrapper.vue'

const message = useMessage()

// Data
const activeTab = ref('active')
const searchQuery = ref('')
const tickets = ref<any[]>([])
const loading = ref(false)
const modalVisible = ref(false)
const cancelModalVisible = ref(false)
const editMode = ref(false)
const formRef = ref<any>(null)
const passengersLoading = ref(false)

// Payment mode options
const paymentModeOptions = [
  { label: 'Cash', value: 'cash' },
  { label: 'Online', value: 'online' },
  { label: 'Wallet', value: 'wallet' },
]

const currentTicket = ref<any>({
  customer_id: null,
  agent_id: null,
  travel_location_id: null,
  passenger_id: null,
  ref_no: '',
  customer_charge: 0,
  agent_paid: 0,
  customer_payment_mode: 'cash',
  agent_payment_mode: 'cash'
})

const cancelData = ref({
  customer_refund_amount: 0,
  customer_refund_mode: 'cash',
  agent_recovery_amount: 0,
  agent_recovery_mode: 'cash'
})

// Options
const customerOptions = ref<any[]>([])
const passengerOptions = ref<any[]>([])
const locationOptions = ref<any[]>([])
const agentOptions = ref<any[]>([])

const generatePlaceholder = () => {
  const year = new Date().getFullYear();
  const yearTickets = tickets.value.filter(t => 
    t.ref_no && t.ref_no.startsWith(`${year}/T/`)
  );
  
  if (yearTickets.length === 0) return `${year}/T/00001`;
  
  const lastNum = yearTickets.reduce((max, ticket) => {
    const parts = ticket.ref_no.split('/');
    if (parts.length < 3) return max;
    
    const numPart = parts[2];
    const num = parseInt(numPart) || 0;
    return Math.max(max, num);
  }, 0);
  
  return `${year}/T/${(lastNum + 1).toString().padStart(5, '0')}`;
};

// Computed
const profit = computed(() => {
  if (!currentTicket.value.customer_charge) return null
  return currentTicket.value.customer_charge - (currentTicket.value.agent_paid || 0)
})

const referencePlaceholder = ref('')

const referenceNumber = computed(() => {
  if (editMode.value && currentTicket.value.ref_no) {
    return currentTicket.value.ref_no
  }
  return referencePlaceholder.value || 'Generating...'
})

const filteredTickets = computed(() => {
  const search = searchQuery.value.toLowerCase()
  return tickets.value.filter(t => 
    t.status === 'booked' && 
    (t.ref_no.toLowerCase().includes(search) ||
    t.agent_name && t.agent_name.toLowerCase().includes(search) || 
     t.customer_name.toLowerCase().includes(search))
  )
})

const cancelledTickets = computed(() => {
  const search = searchQuery.value.toLowerCase()
  return tickets.value.filter(t => 
    t.status === 'cancelled' && 
    (t.ref_no.toLowerCase().includes(search) ||
    t.agent_name && t.agent_name.toLowerCase().includes(search) || 
     t.customer_name.toLowerCase().includes(search))
  )
})

const formRules = ref({
  customer_id: {
    required: true,
    validator: (rule: any, value: any) => {
      return (value !== null && value !== undefined && value !== '');
    },
    message: 'Customer is required',
    trigger: ['change', 'blur']
  },
  travel_location_id: {
    required: true,
    validator: (_rule: any, value: any) => !!value,
    message: 'Travel location is required',
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
  }
})

// Methods
const fetchData = async () => {
  loading.value = true
  try {
    const res = await api.get('/api/tickets', { params: { status: 'all' } })
    tickets.value = res.data
  } catch (e) {
    message.error('Failed to load tickets')
  } finally {
    loading.value = false
  }
}

const allPassengers = ref<any[]>([])

const particularOptions = ref<any[]>([])

// Update fetchOptions method
const fetchOptions = async () => {
  try {
    loading.value = true;
    
    const [customers, locations, agents, particulars, passengers] = await Promise.all([
      api.get('/api/manage/customer'),
      api.get('/api/manage/travel_location'),
      api.get('/api/manage/agent'),
      api.get('/api/manage/particular'),
      api.get('/api/manage/passenger')
    ]);
    
    // Transform all responses to { name, id } format
    customerOptions.value = customers.data.map((c: any) => ({ name: c.name, id: c.id }));
    locationOptions.value = locations.data.map((l: any) => ({ name: l.name, id: l.id }));
    agentOptions.value = agents.data.map((a: any) => ({ name: a.name, id: a.id }));
    particularOptions.value = particulars.data.map((p: any) => ({ name: p.name, id: p.id }));
    allPassengers.value = passengers.data.map((p: any) => ({ 
      name: p.name, 
      id: p.id, 
      customer_id: p.customer_id 
    }));
    
  } catch (e) {
    console.error('Error loading options:', e);
    message.error('Failed to load options');
  } finally {
    loading.value = false;
  }
};

// Update updatePassengerOptions method
const updatePassengerOptions = (customerId: number) => {
  if (!customerId) {
    passengerOptions.value = [];
    return;
  }
  
  // Convert customerId to number for comparison
  const idNum = Number(customerId);
  
  // Filter and map passengers
  passengerOptions.value = allPassengers.value
    .filter((p: any) => p.customer_id === idNum)
    .map((p: any) => ({ name: p.name, id: p.id }));
};

const openAddModal = () => {
  referencePlaceholder.value = generatePlaceholder();
  
  currentTicket.value = {
    customer_id: null,
    agent_id: null,
    travel_location_id: null,
    passenger_id: null,
    particular_id: null,
    ref_no: '',
    customer_charge: 0,
    agent_paid: 0,
    customer_payment_mode: 'wallet',
    agent_payment_mode: 'wallet'
  };
  
  // Reset form validation
  nextTick(() => {
    if (formRef.value) {
      formRef.value.restoreValidation();
    }
  });
  
  modalVisible.value = true;
  editMode.value = false;
  passengerOptions.value = [];
};

const bookTicket = async () => {
  try {
    await formRef.value?.validate();
    
    // Create properly formatted payload
    const payload = { 
      customer_id: Number(currentTicket.value.customer_id),
      agent_id: currentTicket.value.agent_id ? Number(currentTicket.value.agent_id) : null,
      travel_location_id: Number(currentTicket.value.travel_location_id),
      passenger_id: currentTicket.value.passenger_id ? Number(currentTicket.value.passenger_id) : null,
      particular_id: currentTicket.value.particular_id ? Number(currentTicket.value.particular_id) : null,
      customer_charge: Number(currentTicket.value.customer_charge),
      agent_paid: Number(currentTicket.value.agent_paid || 0),
      customer_payment_mode: currentTicket.value.customer_payment_mode,
      agent_payment_mode: currentTicket.value.agent_payment_mode || 'cash',
      ref_no: editMode.value ? currentTicket.value.ref_no : '' // Clear for backend generation
    };
    
    console.log('Sending payload:', payload);
    
    const response = await api.post('/api/tickets', payload);
    message.success(`Ticket booked! Reference: ${response.data.ref_no}`);
    modalVisible.value = false;
    await fetchData();
    
  } catch (e) {
    handleApiError(e);
  }
};

const updateTicket = async () => {
  try {
    await formRef.value?.validate()
    
    const payload = {
      id: currentTicket.value.id,
      travel_location_id: Number(currentTicket.value.travel_location_id),
      passenger_id: currentTicket.value.passenger_id ? 
                   Number(currentTicket.value.passenger_id) : null,
      particular_id: currentTicket.value.particular_id ? 
                   Number(currentTicket.value.particular_id) : null,
      ref_no: currentTicket.value.ref_no,
      customer_charge: Number(currentTicket.value.customer_charge),
      agent_paid: Number(currentTicket.value.agent_paid || 0),
      customer_payment_mode: currentTicket.value.customer_payment_mode,
      agent_payment_mode: currentTicket.value.agent_payment_mode || 'cash'
    };
    
    await api.patch('/api/tickets', payload)
    message.success('Ticket updated successfully')
    modalVisible.value = false
    await fetchData()
  } catch (e) {
    handleApiError(e)
  }
}

const editTicket = (ticket: any) => {
  currentTicket.value = { 
    ...ticket,
    // Ensure we have all required fields
    customer_payment_mode: ticket.customer_payment_mode || 'cash',
    agent_payment_mode: ticket.agent_payment_mode || 'cash'
  }
  editMode.value = true
  modalVisible.value = true
  updatePassengerOptions(ticket.customer_id)
}

const deleteTicket = async (id: number) => {
  if (!window.confirm('Are you sure you want to delete this ticket?')) return
  
  try {
    await api.delete(`/api/tickets?id=${id}`)
    message.success('Ticket deleted successfully')
    await fetchData()
  } catch (e) {
    handleApiError(e)
  }
}

const openCancelModal = (ticket: any) => {
  currentTicket.value = { ...ticket }
  cancelData.value = {
    customer_refund_amount: ticket.customer_charge,
    customer_refund_mode: ticket.customer_payment_mode || 'wallet',
    agent_recovery_amount: ticket.agent_paid,
    agent_recovery_mode: ticket.agent_payment_mode || 'wallet'
  }
  cancelModalVisible.value = true
}

const confirmCancel = async () => {
  if (!currentTicket.value?.id) {
    message.error('Ticket ID is missing. Cannot proceed with cancellation.')
    console.error('Missing ticket ID in currentTicket:', currentTicket.value)
    return
  }

  const payload = {
    ticket_id: currentTicket.value.id,
    customer_refund_amount: cancelData.value.customer_refund_amount ?? 0,
    customer_refund_mode: cancelData.value.customer_refund_mode ?? 'cash',
    agent_recovery_amount: cancelData.value.agent_recovery_amount ?? 0,
    agent_recovery_mode: cancelData.value.agent_recovery_mode ?? 'cash'
  }

  console.log('Cancel Payload:', payload)

  try {
    await api.post('/api/tickets', payload, {
      params: { action: 'cancel' }
    });
    message.success('Ticket cancelled successfully')
    cancelModalVisible.value = false
    await fetchData()
  } catch (e) {
    handleApiError(e)
  }
}


const handleApiError = (e: any) => {
  console.error('Full API Error:', e);
  console.error('Request Config:', e.config);
  
  if (e.response) {
    console.error('Response Data:', e.response.data);
    console.error('Response Status:', e.response.status);
    console.error('Response Headers:', e.response.headers);
    
    const errorMsg = e.response.data?.error || 
                    e.response.data?.message || 
                    'Operation failed';
    
    if (e.response.data?.field_errors) {
      console.error('Field Errors:', e.response.data.field_errors);
      message.error('Please fix the form errors');
    } else {
      message.error(errorMsg);
    }
  } else if (e.request) {
    console.error('Request:', e.request);
    message.error('No response received from server');
  } else {
    message.error('Request setup error: ' + e.message);
  }
};

const baseColumns: DataTableColumns<any> = [
  { title: 'Ref No', key: 'ref_no', sorter: (a, b) => a.ref_no.localeCompare(b.ref_no) },
  { title: 'Customer', key: 'customer_name', sorter: (a, b) => a.customer_name.localeCompare(b.customer_name) },
  { title: 'Agent', key: 'agent_name', sorter: (a, b) => a.agent_name.localeCompare(b.agent_name) },
  { title: 'Charge', key: 'customer_charge', sorter: (a, b) => a.customer_charge - b.customer_charge },
  { title: 'Paid to Agent', key: 'agent_paid', sorter: (a, b) => a.agent_paid - b.agent_paid },
  { title: 'Profit', key: 'profit', sorter: (a, b) => a.profit - b.profit },
]
const columnsBooked = ref<DataTableColumns<any>>([
  ...baseColumns,
  {
    title: 'Actions',
    key: 'actions',
    render(row) {
      if (row.status !== 'booked') return null;
      return h(NSpace, { size: 'small' }, () => [
        h(PermissionWrapper, { resource: 'ticket', operation: 'write' }, {
          default: () => h(NButton, { size: 'small', onClick: () => editTicket(row) }, { default: () => 'Edit' })
        }),
        h(PermissionWrapper, { resource: 'ticket', operation: 'write' }, {
          default: () => h(NButton, { size: 'small', type: 'error', onClick: () => deleteTicket(row.id) }, { default: () => 'Delete' })
        }),
        h(PermissionWrapper, { resource: 'ticket', operation: 'write' }, {
          default: () => h(NButton, { size: 'small', type: 'warning', onClick: () => openCancelModal(row) }, { default: () => 'Cancel' })
        }),
      ])
    }
  }
])

const columnsCancelled = ref<DataTableColumns<any>>([
  ...baseColumns,
  { title: 'Paid to Customer', key: 'customer_refund_amount' },
  { title: 'Refund Mode', key: 'customer_refund_mode' },
  { title: 'Recovered from Agent', key: 'agent_recovery_amount' },
  { title: 'Recovery Mode', key: 'agent_recovery_mode' }
])



// Lifecycle
onMounted(async () => {
  await fetchData();
  await fetchOptions();
});
</script>

<style scoped lang="scss">
@use '@/styles/theme' as *;
</style>