import { ref, computed, onMounted, h, nextTick } from 'vue';
import { useMessage, NButton, NSpace } from 'naive-ui';
import api from '@/api';
import PermissionWrapper from '@/components/PermissionWrapper.vue';
const message = useMessage();
// Data
const activeTab = ref('active');
const searchQuery = ref('');
const tickets = ref([]);
const loading = ref(false);
const modalVisible = ref(false);
const cancelModalVisible = ref(false);
const editMode = ref(false);
const formRef = ref(null);
const passengersLoading = ref(false);
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
    ref_no: '',
    customer_charge: 0,
    agent_paid: 0,
    customer_payment_mode: 'cash',
    agent_payment_mode: 'cash'
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
const filteredTickets = computed(() => {
    const search = searchQuery.value.toLowerCase();
    return tickets.value.filter(t => t.status === 'booked' &&
        (t.ref_no.toLowerCase().includes(search) ||
            t.agent_name && t.agent_name.toLowerCase().includes(search) ||
            t.customer_name.toLowerCase().includes(search)));
});
const cancelledTickets = computed(() => {
    const search = searchQuery.value.toLowerCase();
    return tickets.value.filter(t => t.status === 'cancelled' &&
        (t.ref_no.toLowerCase().includes(search) ||
            t.agent_name && t.agent_name.toLowerCase().includes(search) ||
            t.customer_name.toLowerCase().includes(search)));
});
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
    }
});
// Methods
const fetchData = async () => {
    loading.value = true;
    try {
        const res = await api.get('/api/tickets', { params: { status: 'all' } });
        tickets.value = res.data;
    }
    catch (e) {
        message.error('Failed to load tickets');
    }
    finally {
        loading.value = false;
    }
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
        customerOptions.value = customers.data.map((c) => ({ name: c.name, id: c.id }));
        locationOptions.value = locations.data.map((l) => ({ name: l.name, id: l.id }));
        agentOptions.value = agents.data.map((a) => ({ name: a.name, id: a.id }));
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
    }
    catch (e) {
        handleApiError(e);
    }
};
const updateTicket = async () => {
    try {
        await formRef.value?.validate();
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
    currentTicket.value = {
        ...ticket,
        // Ensure we have all required fields
        customer_payment_mode: ticket.customer_payment_mode || 'cash',
        agent_payment_mode: ticket.agent_payment_mode || 'cash'
    };
    editMode.value = true;
    modalVisible.value = true;
    updatePassengerOptions(ticket.customer_id);
};
const deleteTicket = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ticket?'))
        return;
    try {
        await api.delete(`/api/tickets?id=${id}`);
        message.success('Ticket deleted successfully');
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
                    default: () => h(NButton, { size: 'small', type: 'error', onClick: () => deleteTicket(row.id) }, { default: () => 'Delete' })
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
    { title: 'Recovery Mode', key: 'agent_recovery_mode' }
]);
// Lifecycle
onMounted(async () => {
    await fetchData();
    await fetchOptions();
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
const __VLS_21 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search ",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_23 = __VLS_22({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search ",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
/** @type {[typeof PermissionWrapper, typeof PermissionWrapper, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(PermissionWrapper, new PermissionWrapper({
    resource: "ticket",
    operation: "write",
}));
const __VLS_26 = __VLS_25({
    resource: "ticket",
    operation: "write",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
const __VLS_28 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_30 = __VLS_29({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
let __VLS_32;
let __VLS_33;
let __VLS_34;
const __VLS_35 = {
    onClick: (__VLS_ctx.openAddModal)
};
__VLS_31.slots.default;
var __VLS_31;
var __VLS_27;
var __VLS_20;
const __VLS_36 = {}.NDataTable;
/** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    columns: (__VLS_ctx.columnsBooked),
    data: (__VLS_ctx.filteredTickets),
    loading: (__VLS_ctx.loading),
    striped: true,
    ...{ style: {} },
}));
const __VLS_38 = __VLS_37({
    columns: (__VLS_ctx.columnsBooked),
    data: (__VLS_ctx.filteredTickets),
    loading: (__VLS_ctx.loading),
    striped: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
var __VLS_16;
const __VLS_40 = {}.NTabPane;
/** @type {[typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    name: "cancelled",
    tab: "Cancelled Tickets",
}));
const __VLS_42 = __VLS_41({
    name: "cancelled",
    tab: "Cancelled Tickets",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
const __VLS_44 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search ",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_46 = __VLS_45({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search ",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
const __VLS_48 = {}.NDataTable;
/** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    columns: (__VLS_ctx.columnsCancelled),
    data: (__VLS_ctx.cancelledTickets),
    loading: (__VLS_ctx.loading),
    striped: true,
    ...{ style: {} },
}));
const __VLS_50 = __VLS_49({
    columns: (__VLS_ctx.columnsCancelled),
    data: (__VLS_ctx.cancelledTickets),
    loading: (__VLS_ctx.loading),
    striped: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
var __VLS_43;
var __VLS_12;
const __VLS_52 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    show: (__VLS_ctx.modalVisible),
    ...{ class: "full-width-modal" },
}));
const __VLS_54 = __VLS_53({
    show: (__VLS_ctx.modalVisible),
    ...{ class: "full-width-modal" },
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    ...{ class: "modal-card" },
}));
const __VLS_58 = __VLS_57({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_59.slots.default;
const __VLS_60 = {}.NH2;
/** @type {[typeof __VLS_components.NH2, typeof __VLS_components.nH2, typeof __VLS_components.NH2, typeof __VLS_components.nH2, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    ...{ class: "modal-title" },
}));
const __VLS_62 = __VLS_61({
    ...{ class: "modal-title" },
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
(__VLS_ctx.editMode ? 'Edit Ticket' : 'Book Ticket');
var __VLS_63;
const __VLS_64 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    ...{ class: "responsive-form-grid" },
    model: (__VLS_ctx.currentTicket),
    rules: (__VLS_ctx.formRules),
    ref: "formRef",
}));
const __VLS_66 = __VLS_65({
    ...{ class: "responsive-form-grid" },
    model: (__VLS_ctx.currentTicket),
    rules: (__VLS_ctx.formRules),
    ref: "formRef",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_68 = {};
__VLS_67.slots.default;
const __VLS_70 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
    label: "Customer",
    path: "customer_id",
    ...{ class: "wide-field" },
}));
const __VLS_72 = __VLS_71({
    label: "Customer",
    path: "customer_id",
    ...{ class: "wide-field" },
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
__VLS_73.slots.default;
const __VLS_74 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.currentTicket.customer_id),
    options: (__VLS_ctx.customerOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Customer",
}));
const __VLS_76 = __VLS_75({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.currentTicket.customer_id),
    options: (__VLS_ctx.customerOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Customer",
}, ...__VLS_functionalComponentArgsRest(__VLS_75));
let __VLS_78;
let __VLS_79;
let __VLS_80;
const __VLS_81 = {
    'onUpdate:value': (__VLS_ctx.updatePassengerOptions)
};
var __VLS_77;
var __VLS_73;
const __VLS_82 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
    label: "Passenger",
    path: "passenger_id",
}));
const __VLS_84 = __VLS_83({
    label: "Passenger",
    path: "passenger_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_83));
__VLS_85.slots.default;
const __VLS_86 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({
    value: (__VLS_ctx.currentTicket.passenger_id),
    options: (__VLS_ctx.passengerOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Passenger",
    loading: (__VLS_ctx.passengersLoading),
    filterable: true,
}));
const __VLS_88 = __VLS_87({
    value: (__VLS_ctx.currentTicket.passenger_id),
    options: (__VLS_ctx.passengerOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Passenger",
    loading: (__VLS_ctx.passengersLoading),
    filterable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_87));
var __VLS_85;
const __VLS_90 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
    label: "Particular",
    path: "particular_id",
}));
const __VLS_92 = __VLS_91({
    label: "Particular",
    path: "particular_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_91));
__VLS_93.slots.default;
const __VLS_94 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
    value: (__VLS_ctx.currentTicket.particular_id),
    options: (__VLS_ctx.particularOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Particular",
}));
const __VLS_96 = __VLS_95({
    value: (__VLS_ctx.currentTicket.particular_id),
    options: (__VLS_ctx.particularOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Particular",
}, ...__VLS_functionalComponentArgsRest(__VLS_95));
var __VLS_93;
const __VLS_98 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
    label: "Travel Location",
    path: "travel_location_id",
}));
const __VLS_100 = __VLS_99({
    label: "Travel Location",
    path: "travel_location_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_99));
__VLS_101.slots.default;
const __VLS_102 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
    value: (__VLS_ctx.currentTicket.travel_location_id),
    options: (__VLS_ctx.locationOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Location",
}));
const __VLS_104 = __VLS_103({
    value: (__VLS_ctx.currentTicket.travel_location_id),
    options: (__VLS_ctx.locationOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Location",
}, ...__VLS_functionalComponentArgsRest(__VLS_103));
var __VLS_101;
const __VLS_106 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
    label: "Agent",
    path: "agent_id",
}));
const __VLS_108 = __VLS_107({
    label: "Agent",
    path: "agent_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
__VLS_109.slots.default;
const __VLS_110 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
    value: (__VLS_ctx.currentTicket.agent_id),
    options: (__VLS_ctx.agentOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Agent",
}));
const __VLS_112 = __VLS_111({
    value: (__VLS_ctx.currentTicket.agent_id),
    options: (__VLS_ctx.agentOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Agent",
}, ...__VLS_functionalComponentArgsRest(__VLS_111));
var __VLS_109;
const __VLS_114 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
    label: "Reference No",
}));
const __VLS_116 = __VLS_115({
    label: "Reference No",
}, ...__VLS_functionalComponentArgsRest(__VLS_115));
__VLS_117.slots.default;
const __VLS_118 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
    value: (__VLS_ctx.referenceNumber),
    disabled: true,
}));
const __VLS_120 = __VLS_119({
    value: (__VLS_ctx.referenceNumber),
    disabled: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_119));
var __VLS_117;
const __VLS_122 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
    label: "Customer Charge",
    path: "customer_charge",
}));
const __VLS_124 = __VLS_123({
    label: "Customer Charge",
    path: "customer_charge",
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
__VLS_125.slots.default;
const __VLS_126 = {}.NInputNumber;
/** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
    value: (__VLS_ctx.currentTicket.customer_charge),
    min: (0),
}));
const __VLS_128 = __VLS_127({
    value: (__VLS_ctx.currentTicket.customer_charge),
    min: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_127));
var __VLS_125;
const __VLS_130 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
    label: "Customer Payment",
    path: "customer_payment_mode",
    ...{ class: "wide-field" },
}));
const __VLS_132 = __VLS_131({
    label: "Customer Payment",
    path: "customer_payment_mode",
    ...{ class: "wide-field" },
}, ...__VLS_functionalComponentArgsRest(__VLS_131));
__VLS_133.slots.default;
const __VLS_134 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
    value: (__VLS_ctx.currentTicket.customer_payment_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Payment Mode",
}));
const __VLS_136 = __VLS_135({
    value: (__VLS_ctx.currentTicket.customer_payment_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Payment Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_135));
var __VLS_133;
if (__VLS_ctx.currentTicket.agent_id) {
    const __VLS_138 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({
        label: "Agent Paid",
    }));
    const __VLS_140 = __VLS_139({
        label: "Agent Paid",
    }, ...__VLS_functionalComponentArgsRest(__VLS_139));
    __VLS_141.slots.default;
    const __VLS_142 = {}.NInputNumber;
    /** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({
        value: (__VLS_ctx.currentTicket.agent_paid),
        min: (0),
    }));
    const __VLS_144 = __VLS_143({
        value: (__VLS_ctx.currentTicket.agent_paid),
        min: (0),
    }, ...__VLS_functionalComponentArgsRest(__VLS_143));
    var __VLS_141;
}
if (__VLS_ctx.currentTicket.agent_id && __VLS_ctx.currentTicket.agent_paid > 0) {
    const __VLS_146 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
        label: "Agent Payment",
        ...{ class: "wide-field" },
    }));
    const __VLS_148 = __VLS_147({
        label: "Agent Payment",
        ...{ class: "wide-field" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_147));
    __VLS_149.slots.default;
    const __VLS_150 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
        value: (__VLS_ctx.currentTicket.agent_payment_mode),
        options: (__VLS_ctx.paymentModeOptions),
        placeholder: "Select Payment Mode",
    }));
    const __VLS_152 = __VLS_151({
        value: (__VLS_ctx.currentTicket.agent_payment_mode),
        options: (__VLS_ctx.paymentModeOptions),
        placeholder: "Select Payment Mode",
    }, ...__VLS_functionalComponentArgsRest(__VLS_151));
    var __VLS_149;
}
if (__VLS_ctx.profit !== null) {
    const __VLS_154 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, ]} */ ;
    // @ts-ignore
    const __VLS_155 = __VLS_asFunctionalComponent(__VLS_154, new __VLS_154({
        ...{ class: "wide-field" },
        title: "Profit",
        type: "info",
    }));
    const __VLS_156 = __VLS_155({
        ...{ class: "wide-field" },
        title: "Profit",
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_155));
    __VLS_157.slots.default;
    (__VLS_ctx.profit);
    var __VLS_157;
}
const __VLS_158 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
    ...{ class: "action-buttons" },
    justify: "end",
}));
const __VLS_160 = __VLS_159({
    ...{ class: "action-buttons" },
    justify: "end",
}, ...__VLS_functionalComponentArgsRest(__VLS_159));
__VLS_161.slots.default;
const __VLS_162 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({
    ...{ 'onClick': {} },
}));
const __VLS_164 = __VLS_163({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
let __VLS_166;
let __VLS_167;
let __VLS_168;
const __VLS_169 = {
    onClick: (...[$event]) => {
        __VLS_ctx.modalVisible = false;
    }
};
__VLS_165.slots.default;
var __VLS_165;
const __VLS_170 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_172 = __VLS_171({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
let __VLS_174;
let __VLS_175;
let __VLS_176;
const __VLS_177 = {
    onClick: (...[$event]) => {
        __VLS_ctx.editMode ? __VLS_ctx.updateTicket() : __VLS_ctx.bookTicket();
    }
};
__VLS_173.slots.default;
(__VLS_ctx.editMode ? 'Update' : 'Book');
var __VLS_173;
var __VLS_161;
var __VLS_67;
var __VLS_59;
var __VLS_55;
const __VLS_178 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_179 = __VLS_asFunctionalComponent(__VLS_178, new __VLS_178({
    show: (__VLS_ctx.cancelModalVisible),
    ...{ class: "transaction-modal" },
}));
const __VLS_180 = __VLS_179({
    show: (__VLS_ctx.cancelModalVisible),
    ...{ class: "transaction-modal" },
}, ...__VLS_functionalComponentArgsRest(__VLS_179));
__VLS_181.slots.default;
const __VLS_182 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
    ...{ class: "modal-card" },
}));
const __VLS_184 = __VLS_183({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_183));
__VLS_185.slots.default;
const __VLS_186 = {}.NH2;
/** @type {[typeof __VLS_components.NH2, typeof __VLS_components.nH2, typeof __VLS_components.NH2, typeof __VLS_components.nH2, ]} */ ;
// @ts-ignore
const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
    ...{ class: "modal-title" },
}));
const __VLS_188 = __VLS_187({
    ...{ class: "modal-title" },
}, ...__VLS_functionalComponentArgsRest(__VLS_187));
__VLS_189.slots.default;
(__VLS_ctx.currentTicket.ref_no);
var __VLS_189;
const __VLS_190 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_191 = __VLS_asFunctionalComponent(__VLS_190, new __VLS_190({
    ...{ class: "responsive-form-grid" },
}));
const __VLS_192 = __VLS_191({
    ...{ class: "responsive-form-grid" },
}, ...__VLS_functionalComponentArgsRest(__VLS_191));
__VLS_193.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "refund-section" },
});
const __VLS_194 = {}.NH3;
/** @type {[typeof __VLS_components.NH3, typeof __VLS_components.nH3, typeof __VLS_components.NH3, typeof __VLS_components.nH3, ]} */ ;
// @ts-ignore
const __VLS_195 = __VLS_asFunctionalComponent(__VLS_194, new __VLS_194({}));
const __VLS_196 = __VLS_195({}, ...__VLS_functionalComponentArgsRest(__VLS_195));
__VLS_197.slots.default;
var __VLS_197;
const __VLS_198 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
    label: "Refund Amount",
}));
const __VLS_200 = __VLS_199({
    label: "Refund Amount",
}, ...__VLS_functionalComponentArgsRest(__VLS_199));
__VLS_201.slots.default;
const __VLS_202 = {}.NInputNumber;
/** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
// @ts-ignore
const __VLS_203 = __VLS_asFunctionalComponent(__VLS_202, new __VLS_202({
    value: (__VLS_ctx.cancelData.customer_refund_amount),
    min: (0),
}));
const __VLS_204 = __VLS_203({
    value: (__VLS_ctx.cancelData.customer_refund_amount),
    min: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_203));
var __VLS_201;
const __VLS_206 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_207 = __VLS_asFunctionalComponent(__VLS_206, new __VLS_206({
    label: "Refund Mode",
}));
const __VLS_208 = __VLS_207({
    label: "Refund Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_207));
__VLS_209.slots.default;
const __VLS_210 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({
    value: (__VLS_ctx.cancelData.customer_refund_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Refund Mode",
}));
const __VLS_212 = __VLS_211({
    value: (__VLS_ctx.cancelData.customer_refund_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Refund Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_211));
var __VLS_209;
if (__VLS_ctx.currentTicket.agent_id) {
    const __VLS_214 = {}.NDivider;
    /** @type {[typeof __VLS_components.NDivider, typeof __VLS_components.nDivider, ]} */ ;
    // @ts-ignore
    const __VLS_215 = __VLS_asFunctionalComponent(__VLS_214, new __VLS_214({}));
    const __VLS_216 = __VLS_215({}, ...__VLS_functionalComponentArgsRest(__VLS_215));
}
if (__VLS_ctx.currentTicket.agent_id) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "recovery-section" },
    });
    const __VLS_218 = {}.NH3;
    /** @type {[typeof __VLS_components.NH3, typeof __VLS_components.nH3, typeof __VLS_components.NH3, typeof __VLS_components.nH3, ]} */ ;
    // @ts-ignore
    const __VLS_219 = __VLS_asFunctionalComponent(__VLS_218, new __VLS_218({}));
    const __VLS_220 = __VLS_219({}, ...__VLS_functionalComponentArgsRest(__VLS_219));
    __VLS_221.slots.default;
    var __VLS_221;
    const __VLS_222 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_223 = __VLS_asFunctionalComponent(__VLS_222, new __VLS_222({
        label: "Recovery Amount",
    }));
    const __VLS_224 = __VLS_223({
        label: "Recovery Amount",
    }, ...__VLS_functionalComponentArgsRest(__VLS_223));
    __VLS_225.slots.default;
    const __VLS_226 = {}.NInputNumber;
    /** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_227 = __VLS_asFunctionalComponent(__VLS_226, new __VLS_226({
        value: (__VLS_ctx.cancelData.agent_recovery_amount),
        min: (0),
    }));
    const __VLS_228 = __VLS_227({
        value: (__VLS_ctx.cancelData.agent_recovery_amount),
        min: (0),
    }, ...__VLS_functionalComponentArgsRest(__VLS_227));
    var __VLS_225;
    const __VLS_230 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_231 = __VLS_asFunctionalComponent(__VLS_230, new __VLS_230({
        label: "Recovery Mode",
    }));
    const __VLS_232 = __VLS_231({
        label: "Recovery Mode",
    }, ...__VLS_functionalComponentArgsRest(__VLS_231));
    __VLS_233.slots.default;
    const __VLS_234 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_235 = __VLS_asFunctionalComponent(__VLS_234, new __VLS_234({
        value: (__VLS_ctx.cancelData.agent_recovery_mode),
        options: (__VLS_ctx.paymentModeOptions),
        placeholder: "Select Recovery Mode",
    }));
    const __VLS_236 = __VLS_235({
        value: (__VLS_ctx.cancelData.agent_recovery_mode),
        options: (__VLS_ctx.paymentModeOptions),
        placeholder: "Select Recovery Mode",
    }, ...__VLS_functionalComponentArgsRest(__VLS_235));
    var __VLS_233;
}
const __VLS_238 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_239 = __VLS_asFunctionalComponent(__VLS_238, new __VLS_238({
    ...{ class: "action-buttons" },
    justify: "end",
}));
const __VLS_240 = __VLS_239({
    ...{ class: "action-buttons" },
    justify: "end",
}, ...__VLS_functionalComponentArgsRest(__VLS_239));
__VLS_241.slots.default;
const __VLS_242 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_243 = __VLS_asFunctionalComponent(__VLS_242, new __VLS_242({
    ...{ 'onClick': {} },
}));
const __VLS_244 = __VLS_243({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_243));
let __VLS_246;
let __VLS_247;
let __VLS_248;
const __VLS_249 = {
    onClick: (...[$event]) => {
        __VLS_ctx.cancelModalVisible = false;
    }
};
__VLS_245.slots.default;
var __VLS_245;
const __VLS_250 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_251 = __VLS_asFunctionalComponent(__VLS_250, new __VLS_250({
    ...{ 'onClick': {} },
    type: "error",
}));
const __VLS_252 = __VLS_251({
    ...{ 'onClick': {} },
    type: "error",
}, ...__VLS_functionalComponentArgsRest(__VLS_251));
let __VLS_254;
let __VLS_255;
let __VLS_256;
const __VLS_257 = {
    onClick: (__VLS_ctx.confirmCancel)
};
__VLS_253.slots.default;
var __VLS_253;
var __VLS_241;
var __VLS_193;
var __VLS_185;
var __VLS_181;
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
// @ts-ignore
var __VLS_69 = __VLS_68;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NSpace: NSpace,
            PermissionWrapper: PermissionWrapper,
            activeTab: activeTab,
            searchQuery: searchQuery,
            loading: loading,
            modalVisible: modalVisible,
            cancelModalVisible: cancelModalVisible,
            editMode: editMode,
            formRef: formRef,
            passengersLoading: passengersLoading,
            paymentModeOptions: paymentModeOptions,
            currentTicket: currentTicket,
            cancelData: cancelData,
            customerOptions: customerOptions,
            passengerOptions: passengerOptions,
            locationOptions: locationOptions,
            agentOptions: agentOptions,
            profit: profit,
            referenceNumber: referenceNumber,
            filteredTickets: filteredTickets,
            cancelledTickets: cancelledTickets,
            formRules: formRules,
            particularOptions: particularOptions,
            updatePassengerOptions: updatePassengerOptions,
            openAddModal: openAddModal,
            bookTicket: bookTicket,
            updateTicket: updateTicket,
            confirmCancel: confirmCancel,
            columnsBooked: columnsBooked,
            columnsCancelled: columnsCancelled,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=ticket.vue.js.map