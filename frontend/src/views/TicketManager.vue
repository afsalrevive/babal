<template>
  <n-card>
    <template #header>
      <n-h2>Ticket Manager</n-h2>
    </template>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="active" tab="Active Tickets">
        <n-space justify="space-between" wrap class="table-controls">
          <n-space>
            <n-input
              v-model:value="searchQuery"
              placeholder="Search tickets"
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
          <PermissionWrapper resource="ticket" operation="write">
            <n-button type="primary" @click="openAddModal">Book Ticket</n-button>
          </PermissionWrapper>
        </n-space>

        <n-data-table
          :columns="columnsBooked"
          :data="paginatedActiveTickets"
          :loading="loading"
          :pagination="paginationActive"
          striped
          style="margin-top: 16px;"
        />
      </n-tab-pane>
      <n-tab-pane name="cancelled" tab="Cancelled Tickets">
        <n-space>
          <n-input
            v-model:value="searchQuery"
            placeholder="Search tickets"
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
          :data="paginatedCancelledTickets"
          :loading="loading"
          :pagination="paginationCancelled"
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

          <n-form-item label="Reference No">
            <n-input :value="referenceNumber" disabled />
          </n-form-item>
          
          <n-form-item label="Date" path="date">
            <n-date-picker
              v-model:value="currentTicket.date"
              type="date"
              clearable
              :is-date-disabled="disableFutureDates"
            />
          </n-form-item>
          
          <n-form-item label="Customer" path="customer_id" class="wide-field">
            <n-space vertical>
              <n-select
                v-model:value="currentTicket.customer_id"
                :options="customerOptions"
                label-field="name"
                value-field="id"
                placeholder="Select Customer"
                filterable
                @update:value="updatePassengerOptions"
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
          
          <n-form-item label="Particular" path="particular_id">
            <n-select
              v-model:value="currentTicket.particular_id"
              :options="particularOptions"
              label-field="name"
              value-field="id"
              placeholder="Select Particular"
              filterable
            />
          </n-form-item>
          
          <n-form-item label="Travel Location" path="travel_location_id">
            <n-select
              v-model:value="currentTicket.travel_location_id"
              :options="locationOptions"
              label-field="name"
              value-field="id"
              placeholder="Select Location"
              filterable
            />
          </n-form-item>
          
          <n-form-item label="Agent" path="agent_id">
            <n-space vertical>
              <n-select
                v-model:value="currentTicket.agent_id"
                :options="agentOptions"
                label-field="name"
                value-field="id"
                placeholder="Select Agent"
                filterable
              />
              <n-grid v-if="selectedAgent" :cols="2" x-gap="12">
                <n-gi>
                  <n-text type="info">Wallet: {{ selectedAgent.wallet_balance }}</n-text>
                </n-gi>
                <n-gi>
                  <n-text type="warning">Credit: {{ selectedAgent.credit_used }}/{{ selectedAgent.credit_limit }}</n-text>
                </n-gi>
              </n-grid>
            </n-space>
          </n-form-item>

          <n-form-item label="Agent Paid" v-if="currentTicket.agent_id">
            <n-input-number 
              v-model:value="currentTicket.agent_paid" 
              :min="0" 
              @update:value="updateCustomerCharge"
            />
          </n-form-item>
          
          <n-form-item label="Agent Mode" v-if="currentTicket.agent_id"  class="wide-field">
            <n-select
              v-model:value="currentTicket.agent_payment_mode"
              :options="paymentModeOptions"
              placeholder="Select Payment Mode"
            />
          </n-form-item>

          <n-form-item label="Profit in %">
            <n-input-number 
              v-model:value="profitPercentage" 
              :min="0" 
              :step="1"
              suffix="%"
            />
          </n-form-item>
          
          <n-form-item label="Customer Mode" path="customer_payment_mode" class="wide-field">
            <n-select
              v-model:value="currentTicket.customer_payment_mode"
              :options="paymentModeOptions"
              placeholder="Select Payment Mode"
            />
          </n-form-item>
          <n-form-item label="Customer Charge" path="customer_charge">
            <n-input-number 
              :value="computedCustomerCharge"
              disabled
              :min="0" 
            />
            <template #feedback>
              <n-alert class="wide-field" v-if="profit !== null" title="Profit" type="info">
                {{ profit }}
              </n-alert>
            </template>
          </n-form-item>

          
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
    
    <!-- Edit Cancelled Ticket Modal -->
    <n-modal v-model:show="editCancelledModalVisible" class="transaction-modal">
      <n-card class="modal-card">
        <n-h2 class="modal-title">Edit Cancelled Ticket #{{ currentTicket.ref_no }}</n-h2>
        <n-form class="responsive-form-grid">
          <div class="refund-section">
            <n-h3>Customer Refund</n-h3>
            <n-form-item label="Refund Amount">
              <n-input-number v-model:value="currentTicket.customer_refund_amount" :min="0" />
            </n-form-item>
            
            <n-form-item label="Refund Mode">
              <n-select
                v-model:value="currentTicket.customer_refund_mode"
                :options="paymentModeOptions"
                placeholder="Select Refund Mode"
              />
            </n-form-item>
          </div>
          
          <n-divider v-if="currentTicket.agent_id" />
          
          <div class="recovery-section" v-if="currentTicket.agent_id">
            <n-h3>Agent Recovery</n-h3>
            <n-form-item label="Recovery Amount">
              <n-input-number v-model:value="currentTicket.agent_recovery_amount" :min="0" />
            </n-form-item>
            
            <n-form-item label="Recovery Mode">
              <n-select
                v-model:value="currentTicket.agent_recovery_mode"
                :options="paymentModeOptions"
                placeholder="Select Recovery Mode"
              />
            </n-form-item>
          </div>
          
          <n-space class="action-buttons" justify="end">
            <n-button @click="editCancelledModalVisible = false">Cancel</n-button>
            <n-button type="primary" @click="updateCancelledTicket">Update</n-button>
          </n-space>
        </n-form>
      </n-card>
    </n-modal>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, nextTick, watch } from 'vue'
import { useMessage, NButton, NSpace } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import api from '@/api'
import PermissionWrapper from '@/components/PermissionWrapper.vue'
import { DocumentTextOutline } from '@vicons/ionicons5'

const message = useMessage()

// Data
const activeTab = ref('active')
const searchQuery = ref('')
const tickets = ref<any[]>([])
const loading = ref(false)
const modalVisible = ref(false)
const cancelModalVisible = ref(false)
const editCancelledModalVisible = ref(false)
const editMode = ref(false)
const formRef = ref<any>(null)
const passengersLoading = ref(false)

// Date range for filtering
const dateRange = ref<[number, number] | null>(null)
const defaultDateRange = computed(() => {
  const end = Date.now()
  const start = end - 7 * 24 * 60 * 60 * 1000 // 7 days ago
  return [start, end] as [number, number]
})

// Set default date range on mount
onMounted(() => {
  dateRange.value = defaultDateRange.value
})

const useProfitPercentage = ref(false);
const profitPercentage = ref(10);

// Computed customer charge
const computedCustomerCharge = computed(() => {
  if (currentTicket.value.agent_paid) {
    const base = currentTicket.value.agent_paid;
    const withProfit = base * (1 + profitPercentage.value / 100);
    return Math.round(withProfit / 5) * 5; // Round to nearest 5
  }
  return currentTicket.value.customer_charge;
});

// Update logic
const updateCustomerCharge = () => {
  if (useProfitPercentage.value && currentTicket.value.agent_paid) {
    currentTicket.value.customer_charge = computedCustomerCharge.value;
  }
};

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
  particular_id: null,
  ref_no: '',
  customer_charge: 0,
  agent_paid: 0,
  customer_payment_mode: 'cash',
  agent_payment_mode: 'cash',
  date: Date.now() // Default to current date
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

const selectedCustomer = computed(() => {
  if (!currentTicket.value.customer_id) return null
  return customerOptions.value.find(
    c => c.id === currentTicket.value.customer_id
  )
})

const selectedAgent = computed(() => {
  if (!currentTicket.value.agent_id) return null
  return agentOptions.value.find(
    a => a.id === currentTicket.value.agent_id
  )
})

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

// Filter tickets by date range and search
const filteredTickets = computed(() => {
  const search = searchQuery.value.toLowerCase()
  return filterTicketsByDate(tickets.value).filter(t => 
    t.status === 'booked' && 
    (t.ref_no?.toLowerCase().includes(search) ||
    t.agent_name && t.agent_name.toLowerCase().includes(search) || 
    t.customer_name?.toLowerCase().includes(search))
  )
})

const cancelledTickets = computed(() => {
  const search = searchQuery.value.toLowerCase()
  return filterTicketsByDate(tickets.value).filter(t => 
    t.status === 'cancelled' && 
    (t.ref_no?.toLowerCase().includes(search) ||
    t.agent_name && t.agent_name.toLowerCase().includes(search) || 
    t.customer_name?.toLowerCase().includes(search))
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
const paginatedActiveTickets = computed(() => {
  const start = (paginationActive.page - 1) * paginationActive.pageSize
  const end = start + paginationActive.pageSize
  paginationActive.itemCount = filteredTickets.value.length
  return filteredTickets.value.slice(start, end)
})

const paginatedCancelledTickets = computed(() => {
  const start = (paginationCancelled.page - 1) * paginationCancelled.pageSize
  const end = start + paginationCancelled.pageSize
  paginationCancelled.itemCount = cancelledTickets.value.length
  return cancelledTickets.value.slice(start, end)
})

// Filter tickets by date range
const filterTicketsByDate = (ticketsList: any[]) => {
  if (!dateRange.value) return ticketsList;
  
  const [startTimestamp, endTimestamp] = dateRange.value;
  const startDate = new Date(startTimestamp);
  const endDate = new Date(endTimestamp);
  
  // Set end date to end of day
  endDate.setHours(23, 59, 59, 999);
  
  return ticketsList.filter(ticket => {
    if (!ticket.date) return false;
    const ticketDate = new Date(ticket.date);
    return ticketDate >= startDate && ticketDate <= endDate;
  });
};

// Form rules
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
  },
  date: {
    required: true,
    validator: (_rule: any, value: any) => !!value,
    message: 'Date is required',
    trigger: ['change', 'blur']
  }
})

// Disable future dates in date picker
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
    
    const res = await api.get('/api/tickets', { params })
    tickets.value = res.data
  } catch (e) {
    message.error('Failed to load tickets')
  } finally {
    loading.value = false
  }
}

const formatDateForAPI = (timestamp: number) => {
  return new Date(timestamp).toISOString().split('T')[0]
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
    customerOptions.value = customers.data.map((c: any) => ({ name: c.name, id: c.id, wallet_balance: c.wallet_balance,credit_used: c.credit_used,credit_limit: c.credit_limit }));
    locationOptions.value = locations.data.map((l: any) => ({ name: l.name, id: l.id }));
    agentOptions.value = agents.data.map((a: any) => ({ name: a.name, id: a.id, wallet_balance: a.wallet_balance,credit_used: a.credit_limit - a.credit_balance,credit_limit: a.credit_limit }));
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
    agent_payment_mode: 'wallet',
    date: Date.now() // Default to current date
  };
  
  // Reset profit percentage to default
  profitPercentage.value = 10;
  
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
    
    // Format date as YYYY-MM-DD
    const formattedDate = new Date(currentTicket.value.date).toISOString().split('T')[0];
    
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
      ref_no: editMode.value ? currentTicket.value.ref_no : '', // Clear for backend generation
      date: formattedDate
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
    
    // Format date as YYYY-MM-DD
    const formattedDate = new Date(currentTicket.value.date).toISOString().split('T')[0];
    
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
      agent_payment_mode: currentTicket.value.agent_payment_mode || 'cash',
      date: formattedDate
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
  // Recalculate customer_charge using the same logic as computedCustomerCharge
  let recalculatedCharge = ticket.customer_charge;
  
  if (ticket.agent_paid) {
    const base = ticket.agent_paid;
    const withProfit = base * (1 + profitPercentage.value / 100);
    recalculatedCharge = Math.round(withProfit / 5) * 5;
  }

  currentTicket.value = { 
    ...ticket,
    customer_charge: recalculatedCharge, // Use recalculated value
    customer_payment_mode: ticket.customer_payment_mode || 'wallet',
    agent_payment_mode: ticket.agent_payment_mode || 'wallet',
    // Convert date string to timestamp for date picker
    date: ticket.date ? new Date(ticket.date).getTime() : Date.now()
  };
  
  // Calculate profit percentage from existing values
  if (ticket.agent_paid && ticket.customer_charge) {
    profitPercentage.value = Math.round(
      ((recalculatedCharge / ticket.agent_paid) - 1) * 100
    );
  } else {
    profitPercentage.value = 10;
  }
  
  editMode.value = true;
  modalVisible.value = true;
  updatePassengerOptions(ticket.customer_id);
}

const deleteTicket = async (ticket: any) => {
  const action = ticket.status === 'cancelled' ? 'delete_cancelled' : 'delete'
  
  const messageText = ticket.status === 'cancelled' 
    ? 'Deleting a cancelled ticket will reverse all transactions. Are you sure?' 
    : 'Are you sure you want to delete this ticket?'
  
  if (!window.confirm(messageText)) return
  
  try {
    await api.delete(`/api/tickets?id=${ticket.id}&action=${action}`)
    message.success(`Ticket ${action === 'delete_cancelled' ? 'deleted with reversal' : 'deleted'} successfully`)
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

// Open modal to edit cancelled ticket
const editCancelledTicket = (ticket: any) => {
  currentTicket.value = { 
    ...ticket,
    // Convert date string to timestamp for date picker
    date: ticket.date ? new Date(ticket.date).getTime() : null
  };
  editCancelledModalVisible.value = true;
}

// Update cancelled ticket
const updateCancelledTicket = async () => {
  try {
    const payload = {
      id: currentTicket.value.id,
      customer_refund_amount: currentTicket.value.customer_refund_amount,
      customer_refund_mode: currentTicket.value.customer_refund_mode,
      agent_recovery_amount: currentTicket.value.agent_recovery_amount,
      agent_recovery_mode: currentTicket.value.agent_recovery_mode
    };
    
    await api.patch('/api/tickets', payload);
    message.success('Cancelled ticket updated successfully');
    editCancelledModalVisible.value = false;
    await fetchData();
  } catch (e) {
    handleApiError(e);
  }
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
  { title: 'Date', key: 'date', render: (row) => row.date ? new Date(row.date).toLocaleDateString() : 'N/A' },
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
          default: () => h(NButton, { size: 'small', type: 'error', onClick: () => deleteTicket(row) }, { default: () => 'Delete' })
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
  { title: 'Recovery Mode', key: 'agent_recovery_mode' },
  {
    title: 'Actions',
    key: 'actions',
    render(row) {
      if (row.status !== 'cancelled') return null;
      return h(NSpace, { size: 'small' }, () => [
        h(PermissionWrapper, { resource: 'ticket', operation: 'write' }, {
          default: () => h(NButton, { 
            size: 'small', 
            onClick: () => editCancelledTicket(row) 
          }, { default: () => 'Edit Refund' })
        }),
        h(PermissionWrapper, { resource: 'ticket', operation: 'write' }, {
          default: () => h(NButton, { 
            size: 'small', 
            type: 'error', 
            onClick: () => deleteTicket(row) 
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
    
    const response = await api.get('/api/tickets', { 
      params,
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    const statusType = activeTab.value === 'active' ? 'Active' : 'Cancelled'
    link.setAttribute('download', `${statusType}_Tickets_${new Date().toISOString().slice(0,10)}.xlsx`)
    document.body.appendChild(link)
    link.click()
  } catch (e) {
    message.error('Excel export failed: ' + (e.response?.data?.message || e.message))
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
    
    const response = await api.get('/api/tickets', { 
      params,
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    const statusType = activeTab.value === 'active' ? 'Active' : 'Cancelled'
    link.setAttribute('download', `${statusType}_Tickets_${new Date().toISOString().slice(0,10)}.pdf`)
    document.body.appendChild(link)
    link.click()
  } catch (e) {
    message.error('PDF export failed: ' + (e.response?.data?.message || e.message))
  }
}


// Lifecycle
onMounted(async () => {
  await fetchData();
  await fetchOptions();
});

watch([() => currentTicket.value.agent_paid, profitPercentage], () => {
  if (currentTicket.value.agent_paid) {
    // Update the actual value that will be sent to backend
    currentTicket.value.customer_charge = computedCustomerCharge.value;
  }
});
watch([searchQuery, dateRange], () => {
  paginationActive.page = 1
  paginationCancelled.page = 1
})
</script>

<style scoped lang="scss">
@use '@/styles/theme' as *;

.responsive-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}


</style>