import { ref, computed, onMounted, h, nextTick, watch } from 'vue';
import { useMessage, NButton, NSpace } from 'naive-ui';
import api from '@/api';
import PermissionWrapper from '@/components/PermissionWrapper.vue';
import { DocumentTextOutline } from '@vicons/ionicons5';
const message = useMessage();
// Data
const activeTab = ref('active');
const searchQuery = ref('');
const tickets = ref([]);
const loading = ref(false);
const modalVisible = ref(false);
const cancelModalVisible = ref(false);
const editCancelledModalVisible = ref(false);
const editMode = ref(false);
const formRef = ref(null);
const passengersLoading = ref(false);
// Date range for filtering
const dateRange = ref(null);
const defaultDateRange = computed(() => {
    const end = Date.now();
    const start = end - 7 * 24 * 60 * 60 * 1000; // 7 days ago
    return [start, end];
});
// Set default date range on mount
onMounted(() => {
    dateRange.value = defaultDateRange.value;
});
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
];
const currentTicket = ref({
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
});
const cancelData = ref({
    customer_refund_amount: 0,
    customer_refund_mode: 'cash',
    agent_recovery_amount: 0,
    agent_recovery_mode: 'cash'
});
// Options
const customerOptions = ref([]);
const passengerOptions = ref([]);
const locationOptions = ref([]);
const agentOptions = ref([]);
const selectedCustomer = computed(() => {
    if (!currentTicket.value.customer_id)
        return null;
    return customerOptions.value.find(c => c.id === currentTicket.value.customer_id);
});
const selectedAgent = computed(() => {
    if (!currentTicket.value.agent_id)
        return null;
    return agentOptions.value.find(a => a.id === currentTicket.value.agent_id);
});
const generatePlaceholder = () => {
    const year = new Date().getFullYear();
    const yearTickets = tickets.value.filter(t => t.ref_no && t.ref_no.startsWith(`${year}/T/`));
    if (yearTickets.length === 0)
        return `${year}/T/00001`;
    const lastNum = yearTickets.reduce((max, ticket) => {
        const parts = ticket.ref_no.split('/');
        if (parts.length < 3)
            return max;
        const numPart = parts[2];
        const num = parseInt(numPart) || 0;
        return Math.max(max, num);
    }, 0);
    return `${year}/T/${(lastNum + 1).toString().padStart(5, '0')}`;
};
// Computed
const profit = computed(() => {
    if (!currentTicket.value.customer_charge)
        return null;
    return currentTicket.value.customer_charge - (currentTicket.value.agent_paid || 0);
});
const referencePlaceholder = ref('');
const referenceNumber = computed(() => {
    if (editMode.value && currentTicket.value.ref_no) {
        return currentTicket.value.ref_no;
    }
    return referencePlaceholder.value || 'Generating...';
});
// Filter tickets by date range and search
const filteredTickets = computed(() => {
    const search = searchQuery.value.toLowerCase();
    return filterTicketsByDate(tickets.value).filter(t => t.status === 'booked' &&
        (t.ref_no?.toLowerCase().includes(search) ||
            t.agent_name && t.agent_name.toLowerCase().includes(search) ||
            t.customer_name?.toLowerCase().includes(search)));
});
const cancelledTickets = computed(() => {
    const search = searchQuery.value.toLowerCase();
    return filterTicketsByDate(tickets.value).filter(t => t.status === 'cancelled' &&
        (t.ref_no?.toLowerCase().includes(search) ||
            t.agent_name && t.agent_name.toLowerCase().includes(search) ||
            t.customer_name?.toLowerCase().includes(search)));
});
const paginationActive = reactive({
    page: 1,
    pageSize: 20,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50, 100],
    onChange: (page) => {
        paginationActive.page = page;
    },
    onUpdatePageSize: (pageSize) => {
        paginationActive.pageSize = pageSize;
        paginationActive.page = 1;
    }
});
const paginationCancelled = reactive({
    page: 1,
    pageSize: 20,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50, 100],
    onChange: (page) => {
        paginationCancelled.page = page;
    },
    onUpdatePageSize: (pageSize) => {
        paginationCancelled.pageSize = pageSize;
        paginationCancelled.page = 1;
    }
});
// Computed properties for paginated data
const paginatedActiveTickets = computed(() => {
    const start = (paginationActive.page - 1) * paginationActive.pageSize;
    const end = start + paginationActive.pageSize;
    paginationActive.itemCount = filteredTickets.value.length;
    return filteredTickets.value.slice(start, end);
});
const paginatedCancelledTickets = computed(() => {
    const start = (paginationCancelled.page - 1) * paginationCancelled.pageSize;
    const end = start + paginationCancelled.pageSize;
    paginationCancelled.itemCount = cancelledTickets.value.length;
    return cancelledTickets.value.slice(start, end);
});
// Filter tickets by date range
const filterTicketsByDate = (ticketsList) => {
    if (!dateRange.value)
        return ticketsList;
    const [startTimestamp, endTimestamp] = dateRange.value;
    const startDate = new Date(startTimestamp);
    const endDate = new Date(endTimestamp);
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
    return ticketsList.filter(ticket => {
        if (!ticket.date)
            return false;
        const ticketDate = new Date(ticket.date);
        return ticketDate >= startDate && ticketDate <= endDate;
    });
};
// Form rules
const formRules = ref({
    customer_id: {
        required: true,
        validator: (rule, value) => {
            return (value !== null && value !== undefined && value !== '');
        },
        message: 'Customer is required',
        trigger: ['change', 'blur']
    },
    travel_location_id: {
        required: true,
        validator: (_rule, value) => !!value,
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
        validator: (_rule, value) => !!value,
        message: 'Date is required',
        trigger: ['change', 'blur']
    }
});
// Disable future dates in date picker
const disableFutureDates = (timestamp) => {
    return timestamp > Date.now();
};
// Methods
const fetchData = async () => {
    loading.value = true;
    try {
        const params = {
            status: 'all',
            start_date: formatDateForAPI(dateRange.value[0]),
            end_date: formatDateForAPI(dateRange.value[1])
        };
        const res = await api.get('/api/tickets', { params });
        tickets.value = res.data;
    }
    catch (e) {
        message.error('Failed to load tickets');
    }
    finally {
        loading.value = false;
    }
};
const formatDateForAPI = (timestamp) => {
    return new Date(timestamp).toISOString().split('T')[0];
};
const allPassengers = ref([]);
const particularOptions = ref([]);
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
        customerOptions.value = customers.data.map((c) => ({ name: c.name, id: c.id, wallet_balance: c.wallet_balance, credit_used: c.credit_used, credit_limit: c.credit_limit }));
        locationOptions.value = locations.data.map((l) => ({ name: l.name, id: l.id }));
        agentOptions.value = agents.data.map((a) => ({ name: a.name, id: a.id, wallet_balance: a.wallet_balance, credit_used: a.credit_limit - a.credit_balance, credit_limit: a.credit_limit }));
        particularOptions.value = particulars.data.map((p) => ({ name: p.name, id: p.id }));
        allPassengers.value = passengers.data.map((p) => ({
            name: p.name,
            id: p.id,
            customer_id: p.customer_id
        }));
    }
    catch (e) {
        console.error('Error loading options:', e);
        message.error('Failed to load options');
    }
    finally {
        loading.value = false;
    }
};
// Update updatePassengerOptions method
const updatePassengerOptions = (customerId) => {
    if (!customerId) {
        passengerOptions.value = [];
        return;
    }
    // Convert customerId to number for comparison
    const idNum = Number(customerId);
    // Filter and map passengers
    passengerOptions.value = allPassengers.value
        .filter((p) => p.customer_id === idNum)
        .map((p) => ({ name: p.name, id: p.id }));
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
    }
    catch (e) {
        handleApiError(e);
    }
};
const updateTicket = async () => {
    try {
        await formRef.value?.validate();
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
        await api.patch('/api/tickets', payload);
        message.success('Ticket updated successfully');
        modalVisible.value = false;
        await fetchData();
    }
    catch (e) {
        handleApiError(e);
    }
};
const editTicket = (ticket) => {
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
        profitPercentage.value = Math.round(((recalculatedCharge / ticket.agent_paid) - 1) * 100);
    }
    else {
        profitPercentage.value = 10;
    }
    editMode.value = true;
    modalVisible.value = true;
    updatePassengerOptions(ticket.customer_id);
};
const deleteTicket = async (ticket) => {
    const action = ticket.status === 'cancelled' ? 'delete_cancelled' : 'delete';
    const messageText = ticket.status === 'cancelled'
        ? 'Deleting a cancelled ticket will reverse all transactions. Are you sure?'
        : 'Are you sure you want to delete this ticket?';
    if (!window.confirm(messageText))
        return;
    try {
        await api.delete(`/api/tickets?id=${ticket.id}&action=${action}`);
        message.success(`Ticket ${action === 'delete_cancelled' ? 'deleted with reversal' : 'deleted'} successfully`);
        await fetchData();
    }
    catch (e) {
        handleApiError(e);
    }
};
const openCancelModal = (ticket) => {
    currentTicket.value = { ...ticket };
    cancelData.value = {
        customer_refund_amount: ticket.customer_charge,
        customer_refund_mode: ticket.customer_payment_mode || 'wallet',
        agent_recovery_amount: ticket.agent_paid,
        agent_recovery_mode: ticket.agent_payment_mode || 'wallet'
    };
    cancelModalVisible.value = true;
};
// Open modal to edit cancelled ticket
const editCancelledTicket = (ticket) => {
    currentTicket.value = {
        ...ticket,
        // Convert date string to timestamp for date picker
        date: ticket.date ? new Date(ticket.date).getTime() : null
    };
    editCancelledModalVisible.value = true;
};
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
    }
    catch (e) {
        handleApiError(e);
    }
};
const confirmCancel = async () => {
    if (!currentTicket.value?.id) {
        message.error('Ticket ID is missing. Cannot proceed with cancellation.');
        console.error('Missing ticket ID in currentTicket:', currentTicket.value);
        return;
    }
    const payload = {
        ticket_id: currentTicket.value.id,
        customer_refund_amount: cancelData.value.customer_refund_amount ?? 0,
        customer_refund_mode: cancelData.value.customer_refund_mode ?? 'cash',
        agent_recovery_amount: cancelData.value.agent_recovery_amount ?? 0,
        agent_recovery_mode: cancelData.value.agent_recovery_mode ?? 'cash'
    };
    console.log('Cancel Payload:', payload);
    try {
        await api.post('/api/tickets', payload, {
            params: { action: 'cancel' }
        });
        message.success('Ticket cancelled successfully');
        cancelModalVisible.value = false;
        await fetchData();
    }
    catch (e) {
        handleApiError(e);
    }
};
const handleApiError = (e) => {
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
        }
        else {
            message.error(errorMsg);
        }
    }
    else if (e.request) {
        console.error('Request:', e.request);
        message.error('No response received from server');
    }
    else {
        message.error('Request setup error: ' + e.message);
    }
};
const baseColumns = [
    { title: 'Ref No', key: 'ref_no', sorter: (a, b) => a.ref_no.localeCompare(b.ref_no) },
    { title: 'Date', key: 'date', render: (row) => row.date ? new Date(row.date).toLocaleDateString() : 'N/A' },
    { title: 'Customer', key: 'customer_name', sorter: (a, b) => a.customer_name.localeCompare(b.customer_name) },
    { title: 'Agent', key: 'agent_name', sorter: (a, b) => a.agent_name.localeCompare(b.agent_name) },
    { title: 'Charge', key: 'customer_charge', sorter: (a, b) => a.customer_charge - b.customer_charge },
    { title: 'Paid to Agent', key: 'agent_paid', sorter: (a, b) => a.agent_paid - b.agent_paid },
    { title: 'Profit', key: 'profit', sorter: (a, b) => a.profit - b.profit },
];
const columnsBooked = ref([
    ...baseColumns,
    {
        title: 'Actions',
        key: 'actions',
        render(row) {
            if (row.status !== 'booked')
                return null;
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
            ]);
        }
    }
]);
const columnsCancelled = ref([
    ...baseColumns,
    { title: 'Paid to Customer', key: 'customer_refund_amount' },
    { title: 'Refund Mode', key: 'customer_refund_mode' },
    { title: 'Recovered from Agent', key: 'agent_recovery_amount' },
    { title: 'Recovery Mode', key: 'agent_recovery_mode' },
    {
        title: 'Actions',
        key: 'actions',
        render(row) {
            if (row.status !== 'cancelled')
                return null;
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
            ]);
        }
    }
]);
const exportExcel = async () => {
    try {
        const params = {
            start_date: formatDateForAPI(dateRange.value[0]),
            end_date: formatDateForAPI(dateRange.value[1]),
            status: activeTab.value === 'active' ? 'booked' : 'cancelled',
            export: 'excel'
        };
        const response = await api.get('/api/tickets', {
            params,
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const statusType = activeTab.value === 'active' ? 'Active' : 'Cancelled';
        link.setAttribute('download', `${statusType}_Tickets_${new Date().toISOString().slice(0, 10)}.xlsx`);
        document.body.appendChild(link);
        link.click();
    }
    catch (e) {
        message.error('Excel export failed: ' + (e.response?.data?.message || e.message));
    }
};
const exportPDF = async () => {
    try {
        const params = {
            start_date: formatDateForAPI(dateRange.value[0]),
            end_date: formatDateForAPI(dateRange.value[1]),
            status: activeTab.value === 'active' ? 'booked' : 'cancelled',
            export: 'pdf'
        };
        const response = await api.get('/api/tickets', {
            params,
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const statusType = activeTab.value === 'active' ? 'Active' : 'Cancelled';
        link.setAttribute('download', `${statusType}_Tickets_${new Date().toISOString().slice(0, 10)}.pdf`);
        document.body.appendChild(link);
        link.click();
    }
    catch (e) {
        message.error('PDF export failed: ' + (e.response?.data?.message || e.message));
    }
};
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
    paginationActive.page = 1;
    paginationCancelled.page = 1;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_3.slots;
    const __VLS_5 = {}.NH2;
    /** @type {[typeof __VLS_components.NH2, typeof __VLS_components.nH2, typeof __VLS_components.NH2, typeof __VLS_components.nH2, ]} */ ;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({}));
    const __VLS_7 = __VLS_6({}, ...__VLS_functionalComponentArgsRest(__VLS_6));
    __VLS_8.slots.default;
    var __VLS_8;
}
const __VLS_9 = {}.NTabs;
/** @type {[typeof __VLS_components.NTabs, typeof __VLS_components.nTabs, typeof __VLS_components.NTabs, typeof __VLS_components.nTabs, ]} */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    value: (__VLS_ctx.activeTab),
    type: "line",
    animated: true,
}));
const __VLS_11 = __VLS_10({
    value: (__VLS_ctx.activeTab),
    type: "line",
    animated: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
__VLS_12.slots.default;
const __VLS_13 = {}.NTabPane;
/** @type {[typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    name: "active",
    tab: "Active Tickets",
}));
const __VLS_15 = __VLS_14({
    name: "active",
    tab: "Active Tickets",
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
__VLS_16.slots.default;
const __VLS_17 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
    justify: "space-between",
    wrap: true,
    ...{ class: "table-controls" },
}));
const __VLS_19 = __VLS_18({
    justify: "space-between",
    wrap: true,
    ...{ class: "table-controls" },
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
__VLS_20.slots.default;
const __VLS_21 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({}));
const __VLS_23 = __VLS_22({}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_24.slots.default;
const __VLS_25 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search tickets",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_27 = __VLS_26({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search tickets",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
const __VLS_29 = {}.NDatePicker;
/** @type {[typeof __VLS_components.NDatePicker, typeof __VLS_components.nDatePicker, ]} */ ;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
    value: (__VLS_ctx.dateRange),
    type: "daterange",
    clearable: true,
    defaultValue: (__VLS_ctx.defaultDateRange),
    ...{ style: {} },
}));
const __VLS_31 = __VLS_30({
    value: (__VLS_ctx.dateRange),
    type: "daterange",
    clearable: true,
    defaultValue: (__VLS_ctx.defaultDateRange),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
const __VLS_33 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
}));
const __VLS_35 = __VLS_34({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
let __VLS_37;
let __VLS_38;
let __VLS_39;
const __VLS_40 = {
    onClick: (__VLS_ctx.exportExcel)
};
__VLS_36.slots.default;
{
    const { icon: __VLS_thisSlot } = __VLS_36.slots;
    const __VLS_41 = {}.NIcon;
    /** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
    // @ts-ignore
    const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({}));
    const __VLS_43 = __VLS_42({}, ...__VLS_functionalComponentArgsRest(__VLS_42));
    __VLS_44.slots.default;
    const __VLS_45 = {}.DocumentTextOutline;
    /** @type {[typeof __VLS_components.DocumentTextOutline, ]} */ ;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({}));
    const __VLS_47 = __VLS_46({}, ...__VLS_functionalComponentArgsRest(__VLS_46));
    var __VLS_44;
}
var __VLS_36;
const __VLS_49 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
}));
const __VLS_51 = __VLS_50({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
let __VLS_53;
let __VLS_54;
let __VLS_55;
const __VLS_56 = {
    onClick: (__VLS_ctx.exportPDF)
};
__VLS_52.slots.default;
{
    const { icon: __VLS_thisSlot } = __VLS_52.slots;
    const __VLS_57 = {}.NIcon;
    /** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
    // @ts-ignore
    const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({}));
    const __VLS_59 = __VLS_58({}, ...__VLS_functionalComponentArgsRest(__VLS_58));
    __VLS_60.slots.default;
    const __VLS_61 = {}.DocumentTextOutline;
    /** @type {[typeof __VLS_components.DocumentTextOutline, ]} */ ;
    // @ts-ignore
    const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({}));
    const __VLS_63 = __VLS_62({}, ...__VLS_functionalComponentArgsRest(__VLS_62));
    var __VLS_60;
}
var __VLS_52;
var __VLS_24;
/** @type {[typeof PermissionWrapper, typeof PermissionWrapper, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(PermissionWrapper, new PermissionWrapper({
    resource: "ticket",
    operation: "write",
}));
const __VLS_66 = __VLS_65({
    resource: "ticket",
    operation: "write",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
const __VLS_68 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_70 = __VLS_69({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
let __VLS_72;
let __VLS_73;
let __VLS_74;
const __VLS_75 = {
    onClick: (__VLS_ctx.openAddModal)
};
__VLS_71.slots.default;
var __VLS_71;
var __VLS_67;
var __VLS_20;
const __VLS_76 = {}.NDataTable;
/** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    columns: (__VLS_ctx.columnsBooked),
    data: (__VLS_ctx.paginatedActiveTickets),
    loading: (__VLS_ctx.loading),
    pagination: (__VLS_ctx.paginationActive),
    striped: true,
    ...{ style: {} },
}));
const __VLS_78 = __VLS_77({
    columns: (__VLS_ctx.columnsBooked),
    data: (__VLS_ctx.paginatedActiveTickets),
    loading: (__VLS_ctx.loading),
    pagination: (__VLS_ctx.paginationActive),
    striped: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
var __VLS_16;
const __VLS_80 = {}.NTabPane;
/** @type {[typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    name: "cancelled",
    tab: "Cancelled Tickets",
}));
const __VLS_82 = __VLS_81({
    name: "cancelled",
    tab: "Cancelled Tickets",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
const __VLS_84 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
const __VLS_88 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search tickets",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_90 = __VLS_89({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search tickets",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
const __VLS_92 = {}.NDatePicker;
/** @type {[typeof __VLS_components.NDatePicker, typeof __VLS_components.nDatePicker, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    value: (__VLS_ctx.dateRange),
    type: "daterange",
    clearable: true,
    defaultValue: (__VLS_ctx.defaultDateRange),
    ...{ style: {} },
}));
const __VLS_94 = __VLS_93({
    value: (__VLS_ctx.dateRange),
    type: "daterange",
    clearable: true,
    defaultValue: (__VLS_ctx.defaultDateRange),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
const __VLS_96 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
}));
const __VLS_98 = __VLS_97({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
let __VLS_100;
let __VLS_101;
let __VLS_102;
const __VLS_103 = {
    onClick: (__VLS_ctx.exportExcel)
};
__VLS_99.slots.default;
{
    const { icon: __VLS_thisSlot } = __VLS_99.slots;
    const __VLS_104 = {}.NIcon;
    /** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({}));
    const __VLS_106 = __VLS_105({}, ...__VLS_functionalComponentArgsRest(__VLS_105));
    __VLS_107.slots.default;
    const __VLS_108 = {}.DocumentTextOutline;
    /** @type {[typeof __VLS_components.DocumentTextOutline, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({}));
    const __VLS_110 = __VLS_109({}, ...__VLS_functionalComponentArgsRest(__VLS_109));
    var __VLS_107;
}
var __VLS_99;
const __VLS_112 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
}));
const __VLS_114 = __VLS_113({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
let __VLS_116;
let __VLS_117;
let __VLS_118;
const __VLS_119 = {
    onClick: (__VLS_ctx.exportPDF)
};
__VLS_115.slots.default;
{
    const { icon: __VLS_thisSlot } = __VLS_115.slots;
    const __VLS_120 = {}.NIcon;
    /** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({}));
    const __VLS_122 = __VLS_121({}, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    const __VLS_124 = {}.DocumentTextOutline;
    /** @type {[typeof __VLS_components.DocumentTextOutline, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({}));
    const __VLS_126 = __VLS_125({}, ...__VLS_functionalComponentArgsRest(__VLS_125));
    var __VLS_123;
}
var __VLS_115;
var __VLS_87;
const __VLS_128 = {}.NDataTable;
/** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    columns: (__VLS_ctx.columnsCancelled),
    data: (__VLS_ctx.paginatedCancelledTickets),
    loading: (__VLS_ctx.loading),
    pagination: (__VLS_ctx.paginationCancelled),
    striped: true,
    ...{ style: {} },
}));
const __VLS_130 = __VLS_129({
    columns: (__VLS_ctx.columnsCancelled),
    data: (__VLS_ctx.paginatedCancelledTickets),
    loading: (__VLS_ctx.loading),
    pagination: (__VLS_ctx.paginationCancelled),
    striped: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
var __VLS_83;
var __VLS_12;
const __VLS_132 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    show: (__VLS_ctx.modalVisible),
    ...{ class: "full-width-modal" },
}));
const __VLS_134 = __VLS_133({
    show: (__VLS_ctx.modalVisible),
    ...{ class: "full-width-modal" },
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
__VLS_135.slots.default;
const __VLS_136 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    ...{ class: "modal-card" },
}));
const __VLS_138 = __VLS_137({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
__VLS_139.slots.default;
const __VLS_140 = {}.NH2;
/** @type {[typeof __VLS_components.NH2, typeof __VLS_components.nH2, typeof __VLS_components.NH2, typeof __VLS_components.nH2, ]} */ ;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    ...{ class: "modal-title" },
}));
const __VLS_142 = __VLS_141({
    ...{ class: "modal-title" },
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
__VLS_143.slots.default;
(__VLS_ctx.editMode ? 'Edit Ticket' : 'Book Ticket');
var __VLS_143;
const __VLS_144 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    ...{ class: "responsive-form-grid" },
    model: (__VLS_ctx.currentTicket),
    rules: (__VLS_ctx.formRules),
    ref: "formRef",
}));
const __VLS_146 = __VLS_145({
    ...{ class: "responsive-form-grid" },
    model: (__VLS_ctx.currentTicket),
    rules: (__VLS_ctx.formRules),
    ref: "formRef",
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_148 = {};
__VLS_147.slots.default;
const __VLS_150 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
    label: "Reference No",
}));
const __VLS_152 = __VLS_151({
    label: "Reference No",
}, ...__VLS_functionalComponentArgsRest(__VLS_151));
__VLS_153.slots.default;
const __VLS_154 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_155 = __VLS_asFunctionalComponent(__VLS_154, new __VLS_154({
    value: (__VLS_ctx.referenceNumber),
    disabled: true,
}));
const __VLS_156 = __VLS_155({
    value: (__VLS_ctx.referenceNumber),
    disabled: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_155));
var __VLS_153;
const __VLS_158 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
    label: "Date",
    path: "date",
}));
const __VLS_160 = __VLS_159({
    label: "Date",
    path: "date",
}, ...__VLS_functionalComponentArgsRest(__VLS_159));
__VLS_161.slots.default;
const __VLS_162 = {}.NDatePicker;
/** @type {[typeof __VLS_components.NDatePicker, typeof __VLS_components.nDatePicker, ]} */ ;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({
    value: (__VLS_ctx.currentTicket.date),
    type: "date",
    clearable: true,
    isDateDisabled: (__VLS_ctx.disableFutureDates),
}));
const __VLS_164 = __VLS_163({
    value: (__VLS_ctx.currentTicket.date),
    type: "date",
    clearable: true,
    isDateDisabled: (__VLS_ctx.disableFutureDates),
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
var __VLS_161;
const __VLS_166 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_167 = __VLS_asFunctionalComponent(__VLS_166, new __VLS_166({
    label: "Customer",
    path: "customer_id",
    ...{ class: "wide-field" },
}));
const __VLS_168 = __VLS_167({
    label: "Customer",
    path: "customer_id",
    ...{ class: "wide-field" },
}, ...__VLS_functionalComponentArgsRest(__VLS_167));
__VLS_169.slots.default;
const __VLS_170 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
    vertical: true,
}));
const __VLS_172 = __VLS_171({
    vertical: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
__VLS_173.slots.default;
const __VLS_174 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.currentTicket.customer_id),
    options: (__VLS_ctx.customerOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Customer",
    filterable: true,
}));
const __VLS_176 = __VLS_175({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.currentTicket.customer_id),
    options: (__VLS_ctx.customerOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Customer",
    filterable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
let __VLS_178;
let __VLS_179;
let __VLS_180;
const __VLS_181 = {
    'onUpdate:value': (__VLS_ctx.updatePassengerOptions)
};
var __VLS_177;
if (__VLS_ctx.selectedCustomer) {
    const __VLS_182 = {}.NGrid;
    /** @type {[typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, ]} */ ;
    // @ts-ignore
    const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
        cols: (2),
        xGap: "12",
    }));
    const __VLS_184 = __VLS_183({
        cols: (2),
        xGap: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_183));
    __VLS_185.slots.default;
    const __VLS_186 = {}.NGi;
    /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
    // @ts-ignore
    const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({}));
    const __VLS_188 = __VLS_187({}, ...__VLS_functionalComponentArgsRest(__VLS_187));
    __VLS_189.slots.default;
    const __VLS_190 = {}.NText;
    /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
    // @ts-ignore
    const __VLS_191 = __VLS_asFunctionalComponent(__VLS_190, new __VLS_190({
        type: "info",
    }));
    const __VLS_192 = __VLS_191({
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_191));
    __VLS_193.slots.default;
    (__VLS_ctx.selectedCustomer.wallet_balance);
    var __VLS_193;
    var __VLS_189;
    const __VLS_194 = {}.NGi;
    /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
    // @ts-ignore
    const __VLS_195 = __VLS_asFunctionalComponent(__VLS_194, new __VLS_194({}));
    const __VLS_196 = __VLS_195({}, ...__VLS_functionalComponentArgsRest(__VLS_195));
    __VLS_197.slots.default;
    const __VLS_198 = {}.NText;
    /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
    // @ts-ignore
    const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
        type: "warning",
    }));
    const __VLS_200 = __VLS_199({
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_199));
    __VLS_201.slots.default;
    (__VLS_ctx.selectedCustomer.credit_used);
    (__VLS_ctx.selectedCustomer.credit_limit);
    var __VLS_201;
    var __VLS_197;
    var __VLS_185;
}
var __VLS_173;
var __VLS_169;
const __VLS_202 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_203 = __VLS_asFunctionalComponent(__VLS_202, new __VLS_202({
    label: "Passenger",
    path: "passenger_id",
}));
const __VLS_204 = __VLS_203({
    label: "Passenger",
    path: "passenger_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_203));
__VLS_205.slots.default;
const __VLS_206 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_207 = __VLS_asFunctionalComponent(__VLS_206, new __VLS_206({
    value: (__VLS_ctx.currentTicket.passenger_id),
    options: (__VLS_ctx.passengerOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Passenger",
    loading: (__VLS_ctx.passengersLoading),
    filterable: true,
}));
const __VLS_208 = __VLS_207({
    value: (__VLS_ctx.currentTicket.passenger_id),
    options: (__VLS_ctx.passengerOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Passenger",
    loading: (__VLS_ctx.passengersLoading),
    filterable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_207));
var __VLS_205;
const __VLS_210 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({
    label: "Particular",
    path: "particular_id",
}));
const __VLS_212 = __VLS_211({
    label: "Particular",
    path: "particular_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_211));
__VLS_213.slots.default;
const __VLS_214 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_215 = __VLS_asFunctionalComponent(__VLS_214, new __VLS_214({
    value: (__VLS_ctx.currentTicket.particular_id),
    options: (__VLS_ctx.particularOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Particular",
    filterable: true,
}));
const __VLS_216 = __VLS_215({
    value: (__VLS_ctx.currentTicket.particular_id),
    options: (__VLS_ctx.particularOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Particular",
    filterable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_215));
var __VLS_213;
const __VLS_218 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_219 = __VLS_asFunctionalComponent(__VLS_218, new __VLS_218({
    label: "Travel Location",
    path: "travel_location_id",
}));
const __VLS_220 = __VLS_219({
    label: "Travel Location",
    path: "travel_location_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_219));
__VLS_221.slots.default;
const __VLS_222 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_223 = __VLS_asFunctionalComponent(__VLS_222, new __VLS_222({
    value: (__VLS_ctx.currentTicket.travel_location_id),
    options: (__VLS_ctx.locationOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Location",
    filterable: true,
}));
const __VLS_224 = __VLS_223({
    value: (__VLS_ctx.currentTicket.travel_location_id),
    options: (__VLS_ctx.locationOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Location",
    filterable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_223));
var __VLS_221;
const __VLS_226 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_227 = __VLS_asFunctionalComponent(__VLS_226, new __VLS_226({
    label: "Agent",
    path: "agent_id",
}));
const __VLS_228 = __VLS_227({
    label: "Agent",
    path: "agent_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_227));
__VLS_229.slots.default;
const __VLS_230 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_231 = __VLS_asFunctionalComponent(__VLS_230, new __VLS_230({
    vertical: true,
}));
const __VLS_232 = __VLS_231({
    vertical: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_231));
__VLS_233.slots.default;
const __VLS_234 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_235 = __VLS_asFunctionalComponent(__VLS_234, new __VLS_234({
    value: (__VLS_ctx.currentTicket.agent_id),
    options: (__VLS_ctx.agentOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Agent",
    filterable: true,
}));
const __VLS_236 = __VLS_235({
    value: (__VLS_ctx.currentTicket.agent_id),
    options: (__VLS_ctx.agentOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Agent",
    filterable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_235));
if (__VLS_ctx.selectedAgent) {
    const __VLS_238 = {}.NGrid;
    /** @type {[typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, ]} */ ;
    // @ts-ignore
    const __VLS_239 = __VLS_asFunctionalComponent(__VLS_238, new __VLS_238({
        cols: (2),
        xGap: "12",
    }));
    const __VLS_240 = __VLS_239({
        cols: (2),
        xGap: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_239));
    __VLS_241.slots.default;
    const __VLS_242 = {}.NGi;
    /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
    // @ts-ignore
    const __VLS_243 = __VLS_asFunctionalComponent(__VLS_242, new __VLS_242({}));
    const __VLS_244 = __VLS_243({}, ...__VLS_functionalComponentArgsRest(__VLS_243));
    __VLS_245.slots.default;
    const __VLS_246 = {}.NText;
    /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
    // @ts-ignore
    const __VLS_247 = __VLS_asFunctionalComponent(__VLS_246, new __VLS_246({
        type: "info",
    }));
    const __VLS_248 = __VLS_247({
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_247));
    __VLS_249.slots.default;
    (__VLS_ctx.selectedAgent.wallet_balance);
    var __VLS_249;
    var __VLS_245;
    const __VLS_250 = {}.NGi;
    /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
    // @ts-ignore
    const __VLS_251 = __VLS_asFunctionalComponent(__VLS_250, new __VLS_250({}));
    const __VLS_252 = __VLS_251({}, ...__VLS_functionalComponentArgsRest(__VLS_251));
    __VLS_253.slots.default;
    const __VLS_254 = {}.NText;
    /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
    // @ts-ignore
    const __VLS_255 = __VLS_asFunctionalComponent(__VLS_254, new __VLS_254({
        type: "warning",
    }));
    const __VLS_256 = __VLS_255({
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_255));
    __VLS_257.slots.default;
    (__VLS_ctx.selectedAgent.credit_used);
    (__VLS_ctx.selectedAgent.credit_limit);
    var __VLS_257;
    var __VLS_253;
    var __VLS_241;
}
var __VLS_233;
var __VLS_229;
if (__VLS_ctx.currentTicket.agent_id) {
    const __VLS_258 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_259 = __VLS_asFunctionalComponent(__VLS_258, new __VLS_258({
        label: "Agent Paid",
    }));
    const __VLS_260 = __VLS_259({
        label: "Agent Paid",
    }, ...__VLS_functionalComponentArgsRest(__VLS_259));
    __VLS_261.slots.default;
    const __VLS_262 = {}.NInputNumber;
    /** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_263 = __VLS_asFunctionalComponent(__VLS_262, new __VLS_262({
        ...{ 'onUpdate:value': {} },
        value: (__VLS_ctx.currentTicket.agent_paid),
        min: (0),
    }));
    const __VLS_264 = __VLS_263({
        ...{ 'onUpdate:value': {} },
        value: (__VLS_ctx.currentTicket.agent_paid),
        min: (0),
    }, ...__VLS_functionalComponentArgsRest(__VLS_263));
    let __VLS_266;
    let __VLS_267;
    let __VLS_268;
    const __VLS_269 = {
        'onUpdate:value': (__VLS_ctx.updateCustomerCharge)
    };
    var __VLS_265;
    var __VLS_261;
}
if (__VLS_ctx.currentTicket.agent_id) {
    const __VLS_270 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_271 = __VLS_asFunctionalComponent(__VLS_270, new __VLS_270({
        label: "Agent Mode",
        ...{ class: "wide-field" },
    }));
    const __VLS_272 = __VLS_271({
        label: "Agent Mode",
        ...{ class: "wide-field" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_271));
    __VLS_273.slots.default;
    const __VLS_274 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_275 = __VLS_asFunctionalComponent(__VLS_274, new __VLS_274({
        value: (__VLS_ctx.currentTicket.agent_payment_mode),
        options: (__VLS_ctx.paymentModeOptions),
        placeholder: "Select Payment Mode",
    }));
    const __VLS_276 = __VLS_275({
        value: (__VLS_ctx.currentTicket.agent_payment_mode),
        options: (__VLS_ctx.paymentModeOptions),
        placeholder: "Select Payment Mode",
    }, ...__VLS_functionalComponentArgsRest(__VLS_275));
    var __VLS_273;
}
const __VLS_278 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_279 = __VLS_asFunctionalComponent(__VLS_278, new __VLS_278({
    label: "Profit in %",
}));
const __VLS_280 = __VLS_279({
    label: "Profit in %",
}, ...__VLS_functionalComponentArgsRest(__VLS_279));
__VLS_281.slots.default;
const __VLS_282 = {}.NInputNumber;
/** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
// @ts-ignore
const __VLS_283 = __VLS_asFunctionalComponent(__VLS_282, new __VLS_282({
    value: (__VLS_ctx.profitPercentage),
    min: (0),
    step: (1),
    suffix: "%",
}));
const __VLS_284 = __VLS_283({
    value: (__VLS_ctx.profitPercentage),
    min: (0),
    step: (1),
    suffix: "%",
}, ...__VLS_functionalComponentArgsRest(__VLS_283));
var __VLS_281;
const __VLS_286 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_287 = __VLS_asFunctionalComponent(__VLS_286, new __VLS_286({
    label: "Customer Mode",
    path: "customer_payment_mode",
    ...{ class: "wide-field" },
}));
const __VLS_288 = __VLS_287({
    label: "Customer Mode",
    path: "customer_payment_mode",
    ...{ class: "wide-field" },
}, ...__VLS_functionalComponentArgsRest(__VLS_287));
__VLS_289.slots.default;
const __VLS_290 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_291 = __VLS_asFunctionalComponent(__VLS_290, new __VLS_290({
    value: (__VLS_ctx.currentTicket.customer_payment_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Payment Mode",
}));
const __VLS_292 = __VLS_291({
    value: (__VLS_ctx.currentTicket.customer_payment_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Payment Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_291));
var __VLS_289;
const __VLS_294 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_295 = __VLS_asFunctionalComponent(__VLS_294, new __VLS_294({
    label: "Customer Charge",
    path: "customer_charge",
}));
const __VLS_296 = __VLS_295({
    label: "Customer Charge",
    path: "customer_charge",
}, ...__VLS_functionalComponentArgsRest(__VLS_295));
__VLS_297.slots.default;
const __VLS_298 = {}.NInputNumber;
/** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
// @ts-ignore
const __VLS_299 = __VLS_asFunctionalComponent(__VLS_298, new __VLS_298({
    value: (__VLS_ctx.computedCustomerCharge),
    disabled: true,
    min: (0),
}));
const __VLS_300 = __VLS_299({
    value: (__VLS_ctx.computedCustomerCharge),
    disabled: true,
    min: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_299));
{
    const { feedback: __VLS_thisSlot } = __VLS_297.slots;
    if (__VLS_ctx.profit !== null) {
        const __VLS_302 = {}.NAlert;
        /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, ]} */ ;
        // @ts-ignore
        const __VLS_303 = __VLS_asFunctionalComponent(__VLS_302, new __VLS_302({
            ...{ class: "wide-field" },
            title: "Profit",
            type: "info",
        }));
        const __VLS_304 = __VLS_303({
            ...{ class: "wide-field" },
            title: "Profit",
            type: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_303));
        __VLS_305.slots.default;
        (__VLS_ctx.profit);
        var __VLS_305;
    }
}
var __VLS_297;
const __VLS_306 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_307 = __VLS_asFunctionalComponent(__VLS_306, new __VLS_306({
    ...{ class: "action-buttons" },
    justify: "end",
}));
const __VLS_308 = __VLS_307({
    ...{ class: "action-buttons" },
    justify: "end",
}, ...__VLS_functionalComponentArgsRest(__VLS_307));
__VLS_309.slots.default;
const __VLS_310 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_311 = __VLS_asFunctionalComponent(__VLS_310, new __VLS_310({
    ...{ 'onClick': {} },
}));
const __VLS_312 = __VLS_311({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_311));
let __VLS_314;
let __VLS_315;
let __VLS_316;
const __VLS_317 = {
    onClick: (...[$event]) => {
        __VLS_ctx.modalVisible = false;
    }
};
__VLS_313.slots.default;
var __VLS_313;
const __VLS_318 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_319 = __VLS_asFunctionalComponent(__VLS_318, new __VLS_318({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_320 = __VLS_319({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_319));
let __VLS_322;
let __VLS_323;
let __VLS_324;
const __VLS_325 = {
    onClick: (...[$event]) => {
        __VLS_ctx.editMode ? __VLS_ctx.updateTicket() : __VLS_ctx.bookTicket();
    }
};
__VLS_321.slots.default;
(__VLS_ctx.editMode ? 'Update' : 'Book');
var __VLS_321;
var __VLS_309;
var __VLS_147;
var __VLS_139;
var __VLS_135;
const __VLS_326 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_327 = __VLS_asFunctionalComponent(__VLS_326, new __VLS_326({
    show: (__VLS_ctx.cancelModalVisible),
    ...{ class: "transaction-modal" },
}));
const __VLS_328 = __VLS_327({
    show: (__VLS_ctx.cancelModalVisible),
    ...{ class: "transaction-modal" },
}, ...__VLS_functionalComponentArgsRest(__VLS_327));
__VLS_329.slots.default;
const __VLS_330 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_331 = __VLS_asFunctionalComponent(__VLS_330, new __VLS_330({
    ...{ class: "modal-card" },
}));
const __VLS_332 = __VLS_331({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_331));
__VLS_333.slots.default;
const __VLS_334 = {}.NH2;
/** @type {[typeof __VLS_components.NH2, typeof __VLS_components.nH2, typeof __VLS_components.NH2, typeof __VLS_components.nH2, ]} */ ;
// @ts-ignore
const __VLS_335 = __VLS_asFunctionalComponent(__VLS_334, new __VLS_334({
    ...{ class: "modal-title" },
}));
const __VLS_336 = __VLS_335({
    ...{ class: "modal-title" },
}, ...__VLS_functionalComponentArgsRest(__VLS_335));
__VLS_337.slots.default;
(__VLS_ctx.currentTicket.ref_no);
var __VLS_337;
const __VLS_338 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_339 = __VLS_asFunctionalComponent(__VLS_338, new __VLS_338({
    ...{ class: "responsive-form-grid" },
}));
const __VLS_340 = __VLS_339({
    ...{ class: "responsive-form-grid" },
}, ...__VLS_functionalComponentArgsRest(__VLS_339));
__VLS_341.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "refund-section" },
});
const __VLS_342 = {}.NH3;
/** @type {[typeof __VLS_components.NH3, typeof __VLS_components.nH3, typeof __VLS_components.NH3, typeof __VLS_components.nH3, ]} */ ;
// @ts-ignore
const __VLS_343 = __VLS_asFunctionalComponent(__VLS_342, new __VLS_342({}));
const __VLS_344 = __VLS_343({}, ...__VLS_functionalComponentArgsRest(__VLS_343));
__VLS_345.slots.default;
var __VLS_345;
const __VLS_346 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_347 = __VLS_asFunctionalComponent(__VLS_346, new __VLS_346({
    label: "Refund Amount",
}));
const __VLS_348 = __VLS_347({
    label: "Refund Amount",
}, ...__VLS_functionalComponentArgsRest(__VLS_347));
__VLS_349.slots.default;
const __VLS_350 = {}.NInputNumber;
/** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
// @ts-ignore
const __VLS_351 = __VLS_asFunctionalComponent(__VLS_350, new __VLS_350({
    value: (__VLS_ctx.cancelData.customer_refund_amount),
    min: (0),
}));
const __VLS_352 = __VLS_351({
    value: (__VLS_ctx.cancelData.customer_refund_amount),
    min: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_351));
var __VLS_349;
const __VLS_354 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_355 = __VLS_asFunctionalComponent(__VLS_354, new __VLS_354({
    label: "Refund Mode",
}));
const __VLS_356 = __VLS_355({
    label: "Refund Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_355));
__VLS_357.slots.default;
const __VLS_358 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_359 = __VLS_asFunctionalComponent(__VLS_358, new __VLS_358({
    value: (__VLS_ctx.cancelData.customer_refund_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Refund Mode",
}));
const __VLS_360 = __VLS_359({
    value: (__VLS_ctx.cancelData.customer_refund_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Refund Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_359));
var __VLS_357;
if (__VLS_ctx.currentTicket.agent_id) {
    const __VLS_362 = {}.NDivider;
    /** @type {[typeof __VLS_components.NDivider, typeof __VLS_components.nDivider, ]} */ ;
    // @ts-ignore
    const __VLS_363 = __VLS_asFunctionalComponent(__VLS_362, new __VLS_362({}));
    const __VLS_364 = __VLS_363({}, ...__VLS_functionalComponentArgsRest(__VLS_363));
}
if (__VLS_ctx.currentTicket.agent_id) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "recovery-section" },
    });
    const __VLS_366 = {}.NH3;
    /** @type {[typeof __VLS_components.NH3, typeof __VLS_components.nH3, typeof __VLS_components.NH3, typeof __VLS_components.nH3, ]} */ ;
    // @ts-ignore
    const __VLS_367 = __VLS_asFunctionalComponent(__VLS_366, new __VLS_366({}));
    const __VLS_368 = __VLS_367({}, ...__VLS_functionalComponentArgsRest(__VLS_367));
    __VLS_369.slots.default;
    var __VLS_369;
    const __VLS_370 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_371 = __VLS_asFunctionalComponent(__VLS_370, new __VLS_370({
        label: "Recovery Amount",
    }));
    const __VLS_372 = __VLS_371({
        label: "Recovery Amount",
    }, ...__VLS_functionalComponentArgsRest(__VLS_371));
    __VLS_373.slots.default;
    const __VLS_374 = {}.NInputNumber;
    /** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_375 = __VLS_asFunctionalComponent(__VLS_374, new __VLS_374({
        value: (__VLS_ctx.cancelData.agent_recovery_amount),
        min: (0),
    }));
    const __VLS_376 = __VLS_375({
        value: (__VLS_ctx.cancelData.agent_recovery_amount),
        min: (0),
    }, ...__VLS_functionalComponentArgsRest(__VLS_375));
    var __VLS_373;
    const __VLS_378 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_379 = __VLS_asFunctionalComponent(__VLS_378, new __VLS_378({
        label: "Recovery Mode",
    }));
    const __VLS_380 = __VLS_379({
        label: "Recovery Mode",
    }, ...__VLS_functionalComponentArgsRest(__VLS_379));
    __VLS_381.slots.default;
    const __VLS_382 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_383 = __VLS_asFunctionalComponent(__VLS_382, new __VLS_382({
        value: (__VLS_ctx.cancelData.agent_recovery_mode),
        options: (__VLS_ctx.paymentModeOptions),
        placeholder: "Select Recovery Mode",
    }));
    const __VLS_384 = __VLS_383({
        value: (__VLS_ctx.cancelData.agent_recovery_mode),
        options: (__VLS_ctx.paymentModeOptions),
        placeholder: "Select Recovery Mode",
    }, ...__VLS_functionalComponentArgsRest(__VLS_383));
    var __VLS_381;
}
const __VLS_386 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_387 = __VLS_asFunctionalComponent(__VLS_386, new __VLS_386({
    ...{ class: "action-buttons" },
    justify: "end",
}));
const __VLS_388 = __VLS_387({
    ...{ class: "action-buttons" },
    justify: "end",
}, ...__VLS_functionalComponentArgsRest(__VLS_387));
__VLS_389.slots.default;
const __VLS_390 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_391 = __VLS_asFunctionalComponent(__VLS_390, new __VLS_390({
    ...{ 'onClick': {} },
}));
const __VLS_392 = __VLS_391({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_391));
let __VLS_394;
let __VLS_395;
let __VLS_396;
const __VLS_397 = {
    onClick: (...[$event]) => {
        __VLS_ctx.cancelModalVisible = false;
    }
};
__VLS_393.slots.default;
var __VLS_393;
const __VLS_398 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_399 = __VLS_asFunctionalComponent(__VLS_398, new __VLS_398({
    ...{ 'onClick': {} },
    type: "error",
}));
const __VLS_400 = __VLS_399({
    ...{ 'onClick': {} },
    type: "error",
}, ...__VLS_functionalComponentArgsRest(__VLS_399));
let __VLS_402;
let __VLS_403;
let __VLS_404;
const __VLS_405 = {
    onClick: (__VLS_ctx.confirmCancel)
};
__VLS_401.slots.default;
var __VLS_401;
var __VLS_389;
var __VLS_341;
var __VLS_333;
var __VLS_329;
const __VLS_406 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_407 = __VLS_asFunctionalComponent(__VLS_406, new __VLS_406({
    show: (__VLS_ctx.editCancelledModalVisible),
    ...{ class: "transaction-modal" },
}));
const __VLS_408 = __VLS_407({
    show: (__VLS_ctx.editCancelledModalVisible),
    ...{ class: "transaction-modal" },
}, ...__VLS_functionalComponentArgsRest(__VLS_407));
__VLS_409.slots.default;
const __VLS_410 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_411 = __VLS_asFunctionalComponent(__VLS_410, new __VLS_410({
    ...{ class: "modal-card" },
}));
const __VLS_412 = __VLS_411({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_411));
__VLS_413.slots.default;
const __VLS_414 = {}.NH2;
/** @type {[typeof __VLS_components.NH2, typeof __VLS_components.nH2, typeof __VLS_components.NH2, typeof __VLS_components.nH2, ]} */ ;
// @ts-ignore
const __VLS_415 = __VLS_asFunctionalComponent(__VLS_414, new __VLS_414({
    ...{ class: "modal-title" },
}));
const __VLS_416 = __VLS_415({
    ...{ class: "modal-title" },
}, ...__VLS_functionalComponentArgsRest(__VLS_415));
__VLS_417.slots.default;
(__VLS_ctx.currentTicket.ref_no);
var __VLS_417;
const __VLS_418 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_419 = __VLS_asFunctionalComponent(__VLS_418, new __VLS_418({
    ...{ class: "responsive-form-grid" },
}));
const __VLS_420 = __VLS_419({
    ...{ class: "responsive-form-grid" },
}, ...__VLS_functionalComponentArgsRest(__VLS_419));
__VLS_421.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "refund-section" },
});
const __VLS_422 = {}.NH3;
/** @type {[typeof __VLS_components.NH3, typeof __VLS_components.nH3, typeof __VLS_components.NH3, typeof __VLS_components.nH3, ]} */ ;
// @ts-ignore
const __VLS_423 = __VLS_asFunctionalComponent(__VLS_422, new __VLS_422({}));
const __VLS_424 = __VLS_423({}, ...__VLS_functionalComponentArgsRest(__VLS_423));
__VLS_425.slots.default;
var __VLS_425;
const __VLS_426 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_427 = __VLS_asFunctionalComponent(__VLS_426, new __VLS_426({
    label: "Refund Amount",
}));
const __VLS_428 = __VLS_427({
    label: "Refund Amount",
}, ...__VLS_functionalComponentArgsRest(__VLS_427));
__VLS_429.slots.default;
const __VLS_430 = {}.NInputNumber;
/** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
// @ts-ignore
const __VLS_431 = __VLS_asFunctionalComponent(__VLS_430, new __VLS_430({
    value: (__VLS_ctx.currentTicket.customer_refund_amount),
    min: (0),
}));
const __VLS_432 = __VLS_431({
    value: (__VLS_ctx.currentTicket.customer_refund_amount),
    min: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_431));
var __VLS_429;
const __VLS_434 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_435 = __VLS_asFunctionalComponent(__VLS_434, new __VLS_434({
    label: "Refund Mode",
}));
const __VLS_436 = __VLS_435({
    label: "Refund Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_435));
__VLS_437.slots.default;
const __VLS_438 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_439 = __VLS_asFunctionalComponent(__VLS_438, new __VLS_438({
    value: (__VLS_ctx.currentTicket.customer_refund_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Refund Mode",
}));
const __VLS_440 = __VLS_439({
    value: (__VLS_ctx.currentTicket.customer_refund_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Refund Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_439));
var __VLS_437;
if (__VLS_ctx.currentTicket.agent_id) {
    const __VLS_442 = {}.NDivider;
    /** @type {[typeof __VLS_components.NDivider, typeof __VLS_components.nDivider, ]} */ ;
    // @ts-ignore
    const __VLS_443 = __VLS_asFunctionalComponent(__VLS_442, new __VLS_442({}));
    const __VLS_444 = __VLS_443({}, ...__VLS_functionalComponentArgsRest(__VLS_443));
}
if (__VLS_ctx.currentTicket.agent_id) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "recovery-section" },
    });
    const __VLS_446 = {}.NH3;
    /** @type {[typeof __VLS_components.NH3, typeof __VLS_components.nH3, typeof __VLS_components.NH3, typeof __VLS_components.nH3, ]} */ ;
    // @ts-ignore
    const __VLS_447 = __VLS_asFunctionalComponent(__VLS_446, new __VLS_446({}));
    const __VLS_448 = __VLS_447({}, ...__VLS_functionalComponentArgsRest(__VLS_447));
    __VLS_449.slots.default;
    var __VLS_449;
    const __VLS_450 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_451 = __VLS_asFunctionalComponent(__VLS_450, new __VLS_450({
        label: "Recovery Amount",
    }));
    const __VLS_452 = __VLS_451({
        label: "Recovery Amount",
    }, ...__VLS_functionalComponentArgsRest(__VLS_451));
    __VLS_453.slots.default;
    const __VLS_454 = {}.NInputNumber;
    /** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_455 = __VLS_asFunctionalComponent(__VLS_454, new __VLS_454({
        value: (__VLS_ctx.currentTicket.agent_recovery_amount),
        min: (0),
    }));
    const __VLS_456 = __VLS_455({
        value: (__VLS_ctx.currentTicket.agent_recovery_amount),
        min: (0),
    }, ...__VLS_functionalComponentArgsRest(__VLS_455));
    var __VLS_453;
    const __VLS_458 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_459 = __VLS_asFunctionalComponent(__VLS_458, new __VLS_458({
        label: "Recovery Mode",
    }));
    const __VLS_460 = __VLS_459({
        label: "Recovery Mode",
    }, ...__VLS_functionalComponentArgsRest(__VLS_459));
    __VLS_461.slots.default;
    const __VLS_462 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_463 = __VLS_asFunctionalComponent(__VLS_462, new __VLS_462({
        value: (__VLS_ctx.currentTicket.agent_recovery_mode),
        options: (__VLS_ctx.paymentModeOptions),
        placeholder: "Select Recovery Mode",
    }));
    const __VLS_464 = __VLS_463({
        value: (__VLS_ctx.currentTicket.agent_recovery_mode),
        options: (__VLS_ctx.paymentModeOptions),
        placeholder: "Select Recovery Mode",
    }, ...__VLS_functionalComponentArgsRest(__VLS_463));
    var __VLS_461;
}
const __VLS_466 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_467 = __VLS_asFunctionalComponent(__VLS_466, new __VLS_466({
    ...{ class: "action-buttons" },
    justify: "end",
}));
const __VLS_468 = __VLS_467({
    ...{ class: "action-buttons" },
    justify: "end",
}, ...__VLS_functionalComponentArgsRest(__VLS_467));
__VLS_469.slots.default;
const __VLS_470 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_471 = __VLS_asFunctionalComponent(__VLS_470, new __VLS_470({
    ...{ 'onClick': {} },
}));
const __VLS_472 = __VLS_471({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_471));
let __VLS_474;
let __VLS_475;
let __VLS_476;
const __VLS_477 = {
    onClick: (...[$event]) => {
        __VLS_ctx.editCancelledModalVisible = false;
    }
};
__VLS_473.slots.default;
var __VLS_473;
const __VLS_478 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_479 = __VLS_asFunctionalComponent(__VLS_478, new __VLS_478({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_480 = __VLS_479({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_479));
let __VLS_482;
let __VLS_483;
let __VLS_484;
const __VLS_485 = {
    onClick: (__VLS_ctx.updateCancelledTicket)
};
__VLS_481.slots.default;
var __VLS_481;
var __VLS_469;
var __VLS_421;
var __VLS_413;
var __VLS_409;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['table-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['full-width-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['responsive-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['wide-field']} */ ;
/** @type {__VLS_StyleScopedClasses['wide-field']} */ ;
/** @type {__VLS_StyleScopedClasses['wide-field']} */ ;
/** @type {__VLS_StyleScopedClasses['wide-field']} */ ;
/** @type {__VLS_StyleScopedClasses['action-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['transaction-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['responsive-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['refund-section']} */ ;
/** @type {__VLS_StyleScopedClasses['recovery-section']} */ ;
/** @type {__VLS_StyleScopedClasses['action-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['transaction-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['responsive-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['refund-section']} */ ;
/** @type {__VLS_StyleScopedClasses['recovery-section']} */ ;
/** @type {__VLS_StyleScopedClasses['action-buttons']} */ ;
// @ts-ignore
var __VLS_149 = __VLS_148;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NSpace: NSpace,
            PermissionWrapper: PermissionWrapper,
            DocumentTextOutline: DocumentTextOutline,
            activeTab: activeTab,
            searchQuery: searchQuery,
            loading: loading,
            modalVisible: modalVisible,
            cancelModalVisible: cancelModalVisible,
            editCancelledModalVisible: editCancelledModalVisible,
            editMode: editMode,
            formRef: formRef,
            passengersLoading: passengersLoading,
            dateRange: dateRange,
            defaultDateRange: defaultDateRange,
            profitPercentage: profitPercentage,
            computedCustomerCharge: computedCustomerCharge,
            updateCustomerCharge: updateCustomerCharge,
            paymentModeOptions: paymentModeOptions,
            currentTicket: currentTicket,
            cancelData: cancelData,
            customerOptions: customerOptions,
            passengerOptions: passengerOptions,
            locationOptions: locationOptions,
            agentOptions: agentOptions,
            selectedCustomer: selectedCustomer,
            selectedAgent: selectedAgent,
            profit: profit,
            referenceNumber: referenceNumber,
            paginationActive: paginationActive,
            paginationCancelled: paginationCancelled,
            paginatedActiveTickets: paginatedActiveTickets,
            paginatedCancelledTickets: paginatedCancelledTickets,
            formRules: formRules,
            disableFutureDates: disableFutureDates,
            particularOptions: particularOptions,
            updatePassengerOptions: updatePassengerOptions,
            openAddModal: openAddModal,
            bookTicket: bookTicket,
            updateTicket: updateTicket,
            updateCancelledTicket: updateCancelledTicket,
            confirmCancel: confirmCancel,
            columnsBooked: columnsBooked,
            columnsCancelled: columnsCancelled,
            exportExcel: exportExcel,
            exportPDF: exportPDF,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=TicketManager.vue.js.map