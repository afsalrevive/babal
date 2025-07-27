import { ref, computed, onMounted, h, watch } from 'vue';
import { useMessage, NButton, NSpace } from 'naive-ui';
import api from '@/api';
import PermissionWrapper from '@/components/PermissionWrapper.vue';
import { DocumentTextOutline } from '@vicons/ionicons5';
const message = useMessage();
// Data
const activeTab = ref('active');
const searchQuery = ref('');
const services = ref([]);
const loading = ref(false);
const modalVisible = ref(false);
const cancelModalVisible = ref(false);
const editCancelledModalVisible = ref(false);
const editMode = ref(false);
const formRef = ref(null);
// Date range
const dateRange = ref(null);
const defaultDateRange = computed(() => {
    const end = Date.now();
    const start = end - 7 * 24 * 60 * 60 * 1000;
    return [start, end];
});
onMounted(() => {
    dateRange.value = defaultDateRange.value;
});
// Payment mode options
const paymentModeOptions = [
    { label: 'Cash', value: 'cash' },
    { label: 'Online', value: 'online' },
    { label: 'Wallet', value: 'wallet' },
];
const currentService = ref({
    customer_id: null,
    particular_id: null,
    ref_no: '',
    customer_charge: 0,
    customer_payment_mode: 'cash',
    date: Date.now()
});
const cancelData = ref({
    customer_refund_amount: 0,
    customer_refund_mode: 'cash'
});
// Options
const customerOptions = ref([]);
const particularOptions = ref([]);
const selectedCustomer = computed(() => {
    if (!currentService.value.customer_id)
        return null;
    return customerOptions.value.find(c => c.id === currentService.value.customer_id);
});
const generatePlaceholder = () => {
    const year = new Date().getFullYear();
    const yearServices = services.value.filter(s => s.ref_no && s.ref_no.startsWith(`${year}/S/`));
    if (yearServices.length === 0)
        return `${year}/S/00001`;
    const lastNum = yearServices.reduce((max, service) => {
        const parts = service.ref_no.split('/');
        if (parts.length < 3)
            return max;
        const numPart = parts[2];
        const num = parseInt(numPart) || 0;
        return Math.max(max, num);
    }, 0);
    return `${year}/S/${(lastNum + 1).toString().padStart(5, '0')}`;
};
const referencePlaceholder = ref('');
const referenceNumber = computed(() => {
    if (editMode.value && currentService.value.ref_no) {
        return currentService.value.ref_no;
    }
    return referencePlaceholder.value || 'Generating...';
});
// Filter services
const filteredServices = computed(() => {
    const search = searchQuery.value.toLowerCase();
    return filterServicesByDate(services.value).filter(s => s.status === 'booked' &&
        (s.ref_no?.toLowerCase().includes(search) ||
            s.customer_name?.toLowerCase().includes(search)));
});
const cancelledServices = computed(() => {
    const search = searchQuery.value.toLowerCase();
    return filterServicesByDate(services.value).filter(s => s.status === 'cancelled' &&
        (s.ref_no?.toLowerCase().includes(search) ||
            s.customer_name?.toLowerCase().includes(search)));
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
const paginatedActiveServices = computed(() => {
    const start = (paginationActive.page - 1) * paginationActive.pageSize;
    const end = start + paginationActive.pageSize;
    paginationActive.itemCount = filteredServices.value.length;
    return filteredServices.value.slice(start, end);
});
const paginatedCancelledServices = computed(() => {
    const start = (paginationCancelled.page - 1) * paginationCancelled.pageSize;
    const end = start + paginationCancelled.pageSize;
    paginationCancelled.itemCount = cancelledServices.value.length;
    return cancelledServices.value.slice(start, end);
});
const filterServicesByDate = (servicesList) => {
    if (!dateRange.value)
        return servicesList;
    const [startTimestamp, endTimestamp] = dateRange.value;
    const startDate = new Date(startTimestamp);
    const endDate = new Date(endTimestamp);
    endDate.setHours(23, 59, 59, 999);
    return servicesList.filter(service => {
        if (!service.date)
            return false;
        const serviceDate = new Date(service.date);
        return serviceDate >= startDate && serviceDate <= endDate;
    });
};
// Form rules
const formRules = ref({
    customer_id: {
        required: true,
        validator: (rule, value) => (value !== null && value !== undefined),
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
        validator: (_rule, value) => !!value,
        message: 'Date is required',
        trigger: ['change', 'blur']
    }
});
// Disable future dates
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
        const res = await api.get('/api/services', { params });
        services.value = res.data;
    }
    catch (e) {
        message.error('Failed to load services');
    }
    finally {
        loading.value = false;
    }
};
const formatDateForAPI = (timestamp) => {
    return new Date(timestamp).toISOString().split('T')[0];
};
const toSentenceCase = (str) => {
    if (!str)
        return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};
const fetchOptions = async () => {
    try {
        loading.value = true;
        const [customers, particulars] = await Promise.all([
            api.get('/api/manage/customer'),
            api.get('/api/manage/particular')
        ]);
        customerOptions.value = customers.data.map((c) => ({
            name: c.name,
            id: c.id,
            wallet_balance: c.wallet_balance,
            credit_used: c.credit_used,
            credit_limit: c.credit_limit
        }));
        particularOptions.value = particulars.data.map((p) => ({
            name: p.name,
            id: p.id
        }));
    }
    catch (e) {
        message.error('Failed to load options');
    }
    finally {
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
    }
    catch (e) {
        handleApiError(e);
    }
};
const updateService = async () => {
    try {
        await formRef.value?.validate();
        const formattedDate = new Date(currentService.value.date).toISOString().split('T')[0];
        const payload = {
            id: currentService.value.id,
            particular_id: currentService.value.particular_id,
            ref_no: currentService.value.ref_no,
            customer_charge: Number(currentService.value.customer_charge),
            customer_payment_mode: currentService.value.customer_payment_mode,
            date: formattedDate
        };
        await api.patch('/api/services', payload);
        message.success('Service updated successfully');
        modalVisible.value = false;
        await fetchData();
    }
    catch (e) {
        handleApiError(e);
    }
};
const editService = (service) => {
    currentService.value = {
        ...service,
        date: service.date ? new Date(service.date).getTime() : Date.now()
    };
    editMode.value = true;
    modalVisible.value = true;
};
const deleteService = async (service) => {
    const action = service.status === 'cancelled' ? 'delete_cancelled' : 'delete';
    const messageText = service.status === 'cancelled'
        ? 'Deleting a cancelled service will reverse all transactions. Are you sure?'
        : 'Are you sure you want to delete this service?';
    if (!window.confirm(messageText))
        return;
    try {
        await api.delete(`/api/services?id=${service.id}&action=${action}`);
        message.success(`Service ${action === 'delete_cancelled' ? 'deleted with reversal' : 'deleted'} successfully`);
        await fetchData();
    }
    catch (e) {
        handleApiError(e);
    }
};
const openCancelModal = (service) => {
    currentService.value = { ...service };
    cancelData.value = {
        customer_refund_amount: service.customer_charge,
        customer_refund_mode: service.customer_payment_mode || 'cash'
    };
    cancelModalVisible.value = true;
};
const editCancelledService = (service) => {
    currentService.value = {
        ...service,
        date: service.date ? new Date(service.date).getTime() : null
    };
    editCancelledModalVisible.value = true;
};
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
    }
    catch (e) {
        handleApiError(e);
    }
};
const confirmCancel = async () => {
    if (!currentService.value?.id) {
        message.error('Service ID is missing');
        return;
    }
    const payload = {
        service_id: currentService.value.id,
        customer_refund_amount: cancelData.value.customer_refund_amount,
        customer_refund_mode: cancelData.value.customer_refund_mode
    };
    try {
        await api.post('/api/services', payload, {
            params: { action: 'cancel' }
        });
        message.success('Service cancelled successfully');
        cancelModalVisible.value = false;
        await fetchData();
    }
    catch (e) {
        handleApiError(e);
    }
};
const handleApiError = (e) => {
    if (e.response) {
        const errorMsg = e.response.data?.error || 'Operation failed';
        message.error(errorMsg);
    }
    else {
        message.error('Request error: ' + e.message);
    }
};
// Table columns
const baseColumns = [
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
];
const columnsActive = ref([
    ...baseColumns,
    {
        title: 'Actions',
        key: 'actions',
        render(row) {
            if (row.status !== 'booked')
                return null;
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
            ]);
        }
    }
]);
const columnsCancelled = ref([
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
            if (row.status !== 'cancelled')
                return null;
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
        const response = await api.get('/api/services', {
            params,
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const statusType = activeTab.value === 'active' ? 'Active' : 'Cancelled';
        link.setAttribute('download', `${statusType}_Services_${new Date().toISOString().slice(0, 10)}.xlsx`);
        document.body.appendChild(link);
        link.click();
    }
    catch (e) {
        message.error('Excel export failed');
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
        const response = await api.get('/api/services', {
            params,
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const statusType = activeTab.value === 'active' ? 'Active' : 'Cancelled';
        link.setAttribute('download', `${statusType}_Services_${new Date().toISOString().slice(0, 10)}.pdf`);
        document.body.appendChild(link);
        link.click();
    }
    catch (e) {
        message.error('PDF export failed');
    }
};
watch([searchQuery, dateRange], () => {
    paginationActive.page = 1;
    paginationCancelled.page = 1;
});
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
    tab: "Active Services",
}));
const __VLS_15 = __VLS_14({
    name: "active",
    tab: "Active Services",
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
    placeholder: "Search services",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_27 = __VLS_26({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search services",
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
    resource: "service",
    operation: "write",
}));
const __VLS_66 = __VLS_65({
    resource: "service",
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
    columns: (__VLS_ctx.columnsActive),
    data: (__VLS_ctx.paginatedActiveServices),
    loading: (__VLS_ctx.loading),
    pagination: (__VLS_ctx.paginationActive),
    striped: true,
    ...{ style: {} },
}));
const __VLS_78 = __VLS_77({
    columns: (__VLS_ctx.columnsActive),
    data: (__VLS_ctx.paginatedActiveServices),
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
    tab: "Cancelled Services",
}));
const __VLS_82 = __VLS_81({
    name: "cancelled",
    tab: "Cancelled Services",
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
    placeholder: "Search services",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_90 = __VLS_89({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search services",
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
    data: (__VLS_ctx.paginatedCancelledServices),
    loading: (__VLS_ctx.loading),
    pagination: (__VLS_ctx.paginationCancelled),
    striped: true,
    ...{ style: {} },
}));
const __VLS_130 = __VLS_129({
    columns: (__VLS_ctx.columnsCancelled),
    data: (__VLS_ctx.paginatedCancelledServices),
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
(__VLS_ctx.editMode ? 'Edit Service' : 'Book Service');
var __VLS_143;
const __VLS_144 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    model: (__VLS_ctx.currentService),
    rules: (__VLS_ctx.formRules),
    ref: "formRef",
}));
const __VLS_146 = __VLS_145({
    model: (__VLS_ctx.currentService),
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
    value: (__VLS_ctx.currentService.date),
    type: "date",
    clearable: true,
    isDateDisabled: (__VLS_ctx.disableFutureDates),
}));
const __VLS_164 = __VLS_163({
    value: (__VLS_ctx.currentService.date),
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
    value: (__VLS_ctx.currentService.customer_id),
    options: (__VLS_ctx.customerOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Customer",
    filterable: true,
}));
const __VLS_176 = __VLS_175({
    value: (__VLS_ctx.currentService.customer_id),
    options: (__VLS_ctx.customerOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Customer",
    filterable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
if (__VLS_ctx.selectedCustomer) {
    const __VLS_178 = {}.NGrid;
    /** @type {[typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, ]} */ ;
    // @ts-ignore
    const __VLS_179 = __VLS_asFunctionalComponent(__VLS_178, new __VLS_178({
        cols: (2),
        xGap: "12",
    }));
    const __VLS_180 = __VLS_179({
        cols: (2),
        xGap: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_179));
    __VLS_181.slots.default;
    const __VLS_182 = {}.NGi;
    /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
    // @ts-ignore
    const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({}));
    const __VLS_184 = __VLS_183({}, ...__VLS_functionalComponentArgsRest(__VLS_183));
    __VLS_185.slots.default;
    const __VLS_186 = {}.NText;
    /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
    // @ts-ignore
    const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
        type: "info",
    }));
    const __VLS_188 = __VLS_187({
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_187));
    __VLS_189.slots.default;
    (__VLS_ctx.selectedCustomer.wallet_balance);
    var __VLS_189;
    var __VLS_185;
    const __VLS_190 = {}.NGi;
    /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
    // @ts-ignore
    const __VLS_191 = __VLS_asFunctionalComponent(__VLS_190, new __VLS_190({}));
    const __VLS_192 = __VLS_191({}, ...__VLS_functionalComponentArgsRest(__VLS_191));
    __VLS_193.slots.default;
    const __VLS_194 = {}.NText;
    /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
    // @ts-ignore
    const __VLS_195 = __VLS_asFunctionalComponent(__VLS_194, new __VLS_194({
        type: "warning",
    }));
    const __VLS_196 = __VLS_195({
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_195));
    __VLS_197.slots.default;
    (__VLS_ctx.selectedCustomer.credit_used);
    (__VLS_ctx.selectedCustomer.credit_limit);
    var __VLS_197;
    var __VLS_193;
    var __VLS_181;
}
var __VLS_173;
var __VLS_169;
const __VLS_198 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
    label: "Particular",
    path: "particular_id",
}));
const __VLS_200 = __VLS_199({
    label: "Particular",
    path: "particular_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_199));
__VLS_201.slots.default;
const __VLS_202 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_203 = __VLS_asFunctionalComponent(__VLS_202, new __VLS_202({
    value: (__VLS_ctx.currentService.particular_id),
    options: (__VLS_ctx.particularOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Particular",
    filterable: true,
}));
const __VLS_204 = __VLS_203({
    value: (__VLS_ctx.currentService.particular_id),
    options: (__VLS_ctx.particularOptions),
    labelField: "name",
    valueField: "id",
    placeholder: "Select Particular",
    filterable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_203));
var __VLS_201;
const __VLS_206 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_207 = __VLS_asFunctionalComponent(__VLS_206, new __VLS_206({
    label: "Customer Charge",
    path: "customer_charge",
}));
const __VLS_208 = __VLS_207({
    label: "Customer Charge",
    path: "customer_charge",
}, ...__VLS_functionalComponentArgsRest(__VLS_207));
__VLS_209.slots.default;
const __VLS_210 = {}.NInputNumber;
/** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
// @ts-ignore
const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({
    value: (__VLS_ctx.currentService.customer_charge),
    min: (0),
}));
const __VLS_212 = __VLS_211({
    value: (__VLS_ctx.currentService.customer_charge),
    min: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_211));
var __VLS_209;
const __VLS_214 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_215 = __VLS_asFunctionalComponent(__VLS_214, new __VLS_214({
    label: "Payment Mode",
    path: "customer_payment_mode",
}));
const __VLS_216 = __VLS_215({
    label: "Payment Mode",
    path: "customer_payment_mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_215));
__VLS_217.slots.default;
const __VLS_218 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_219 = __VLS_asFunctionalComponent(__VLS_218, new __VLS_218({
    value: (__VLS_ctx.currentService.customer_payment_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Payment Mode",
}));
const __VLS_220 = __VLS_219({
    value: (__VLS_ctx.currentService.customer_payment_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Payment Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_219));
var __VLS_217;
const __VLS_222 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_223 = __VLS_asFunctionalComponent(__VLS_222, new __VLS_222({
    ...{ class: "action-buttons" },
    justify: "end",
}));
const __VLS_224 = __VLS_223({
    ...{ class: "action-buttons" },
    justify: "end",
}, ...__VLS_functionalComponentArgsRest(__VLS_223));
__VLS_225.slots.default;
const __VLS_226 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_227 = __VLS_asFunctionalComponent(__VLS_226, new __VLS_226({
    ...{ 'onClick': {} },
}));
const __VLS_228 = __VLS_227({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_227));
let __VLS_230;
let __VLS_231;
let __VLS_232;
const __VLS_233 = {
    onClick: (...[$event]) => {
        __VLS_ctx.modalVisible = false;
    }
};
__VLS_229.slots.default;
var __VLS_229;
const __VLS_234 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_235 = __VLS_asFunctionalComponent(__VLS_234, new __VLS_234({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_236 = __VLS_235({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_235));
let __VLS_238;
let __VLS_239;
let __VLS_240;
const __VLS_241 = {
    onClick: (...[$event]) => {
        __VLS_ctx.editMode ? __VLS_ctx.updateService() : __VLS_ctx.bookService();
    }
};
__VLS_237.slots.default;
(__VLS_ctx.editMode ? 'Update' : 'Book');
var __VLS_237;
var __VLS_225;
var __VLS_147;
var __VLS_139;
var __VLS_135;
const __VLS_242 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_243 = __VLS_asFunctionalComponent(__VLS_242, new __VLS_242({
    show: (__VLS_ctx.cancelModalVisible),
    ...{ class: "transaction-modal" },
}));
const __VLS_244 = __VLS_243({
    show: (__VLS_ctx.cancelModalVisible),
    ...{ class: "transaction-modal" },
}, ...__VLS_functionalComponentArgsRest(__VLS_243));
__VLS_245.slots.default;
const __VLS_246 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_247 = __VLS_asFunctionalComponent(__VLS_246, new __VLS_246({
    ...{ class: "modal-card" },
}));
const __VLS_248 = __VLS_247({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_247));
__VLS_249.slots.default;
const __VLS_250 = {}.NH2;
/** @type {[typeof __VLS_components.NH2, typeof __VLS_components.nH2, typeof __VLS_components.NH2, typeof __VLS_components.nH2, ]} */ ;
// @ts-ignore
const __VLS_251 = __VLS_asFunctionalComponent(__VLS_250, new __VLS_250({
    ...{ class: "modal-title" },
}));
const __VLS_252 = __VLS_251({
    ...{ class: "modal-title" },
}, ...__VLS_functionalComponentArgsRest(__VLS_251));
__VLS_253.slots.default;
(__VLS_ctx.currentService.ref_no);
var __VLS_253;
const __VLS_254 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_255 = __VLS_asFunctionalComponent(__VLS_254, new __VLS_254({
    ...{ class: "responsive-form-grid" },
}));
const __VLS_256 = __VLS_255({
    ...{ class: "responsive-form-grid" },
}, ...__VLS_functionalComponentArgsRest(__VLS_255));
__VLS_257.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "refund-section" },
});
const __VLS_258 = {}.NH3;
/** @type {[typeof __VLS_components.NH3, typeof __VLS_components.nH3, typeof __VLS_components.NH3, typeof __VLS_components.nH3, ]} */ ;
// @ts-ignore
const __VLS_259 = __VLS_asFunctionalComponent(__VLS_258, new __VLS_258({}));
const __VLS_260 = __VLS_259({}, ...__VLS_functionalComponentArgsRest(__VLS_259));
__VLS_261.slots.default;
var __VLS_261;
const __VLS_262 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_263 = __VLS_asFunctionalComponent(__VLS_262, new __VLS_262({
    label: "Refund Amount",
}));
const __VLS_264 = __VLS_263({
    label: "Refund Amount",
}, ...__VLS_functionalComponentArgsRest(__VLS_263));
__VLS_265.slots.default;
const __VLS_266 = {}.NInputNumber;
/** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
// @ts-ignore
const __VLS_267 = __VLS_asFunctionalComponent(__VLS_266, new __VLS_266({
    value: (__VLS_ctx.cancelData.customer_refund_amount),
    min: (0),
}));
const __VLS_268 = __VLS_267({
    value: (__VLS_ctx.cancelData.customer_refund_amount),
    min: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_267));
var __VLS_265;
const __VLS_270 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_271 = __VLS_asFunctionalComponent(__VLS_270, new __VLS_270({
    label: "Refund Mode",
}));
const __VLS_272 = __VLS_271({
    label: "Refund Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_271));
__VLS_273.slots.default;
const __VLS_274 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_275 = __VLS_asFunctionalComponent(__VLS_274, new __VLS_274({
    value: (__VLS_ctx.cancelData.customer_refund_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Refund Mode",
}));
const __VLS_276 = __VLS_275({
    value: (__VLS_ctx.cancelData.customer_refund_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Refund Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_275));
var __VLS_273;
const __VLS_278 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_279 = __VLS_asFunctionalComponent(__VLS_278, new __VLS_278({
    ...{ class: "action-buttons" },
    justify: "end",
}));
const __VLS_280 = __VLS_279({
    ...{ class: "action-buttons" },
    justify: "end",
}, ...__VLS_functionalComponentArgsRest(__VLS_279));
__VLS_281.slots.default;
const __VLS_282 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_283 = __VLS_asFunctionalComponent(__VLS_282, new __VLS_282({
    ...{ 'onClick': {} },
}));
const __VLS_284 = __VLS_283({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_283));
let __VLS_286;
let __VLS_287;
let __VLS_288;
const __VLS_289 = {
    onClick: (...[$event]) => {
        __VLS_ctx.cancelModalVisible = false;
    }
};
__VLS_285.slots.default;
var __VLS_285;
const __VLS_290 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_291 = __VLS_asFunctionalComponent(__VLS_290, new __VLS_290({
    ...{ 'onClick': {} },
    type: "error",
}));
const __VLS_292 = __VLS_291({
    ...{ 'onClick': {} },
    type: "error",
}, ...__VLS_functionalComponentArgsRest(__VLS_291));
let __VLS_294;
let __VLS_295;
let __VLS_296;
const __VLS_297 = {
    onClick: (__VLS_ctx.confirmCancel)
};
__VLS_293.slots.default;
var __VLS_293;
var __VLS_281;
var __VLS_257;
var __VLS_249;
var __VLS_245;
const __VLS_298 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_299 = __VLS_asFunctionalComponent(__VLS_298, new __VLS_298({
    show: (__VLS_ctx.editCancelledModalVisible),
    ...{ class: "transaction-modal" },
}));
const __VLS_300 = __VLS_299({
    show: (__VLS_ctx.editCancelledModalVisible),
    ...{ class: "transaction-modal" },
}, ...__VLS_functionalComponentArgsRest(__VLS_299));
__VLS_301.slots.default;
const __VLS_302 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_303 = __VLS_asFunctionalComponent(__VLS_302, new __VLS_302({
    ...{ class: "modal-card" },
}));
const __VLS_304 = __VLS_303({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_303));
__VLS_305.slots.default;
const __VLS_306 = {}.NH2;
/** @type {[typeof __VLS_components.NH2, typeof __VLS_components.nH2, typeof __VLS_components.NH2, typeof __VLS_components.nH2, ]} */ ;
// @ts-ignore
const __VLS_307 = __VLS_asFunctionalComponent(__VLS_306, new __VLS_306({
    ...{ class: "modal-title" },
}));
const __VLS_308 = __VLS_307({
    ...{ class: "modal-title" },
}, ...__VLS_functionalComponentArgsRest(__VLS_307));
__VLS_309.slots.default;
(__VLS_ctx.currentService.ref_no);
var __VLS_309;
const __VLS_310 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_311 = __VLS_asFunctionalComponent(__VLS_310, new __VLS_310({
    ...{ class: "responsive-form-grid" },
}));
const __VLS_312 = __VLS_311({
    ...{ class: "responsive-form-grid" },
}, ...__VLS_functionalComponentArgsRest(__VLS_311));
__VLS_313.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "refund-section" },
});
const __VLS_314 = {}.NH3;
/** @type {[typeof __VLS_components.NH3, typeof __VLS_components.nH3, typeof __VLS_components.NH3, typeof __VLS_components.nH3, ]} */ ;
// @ts-ignore
const __VLS_315 = __VLS_asFunctionalComponent(__VLS_314, new __VLS_314({}));
const __VLS_316 = __VLS_315({}, ...__VLS_functionalComponentArgsRest(__VLS_315));
__VLS_317.slots.default;
var __VLS_317;
const __VLS_318 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_319 = __VLS_asFunctionalComponent(__VLS_318, new __VLS_318({
    label: "Refund Amount",
}));
const __VLS_320 = __VLS_319({
    label: "Refund Amount",
}, ...__VLS_functionalComponentArgsRest(__VLS_319));
__VLS_321.slots.default;
const __VLS_322 = {}.NInputNumber;
/** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
// @ts-ignore
const __VLS_323 = __VLS_asFunctionalComponent(__VLS_322, new __VLS_322({
    value: (__VLS_ctx.currentService.customer_refund_amount),
    min: (0),
}));
const __VLS_324 = __VLS_323({
    value: (__VLS_ctx.currentService.customer_refund_amount),
    min: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_323));
var __VLS_321;
const __VLS_326 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_327 = __VLS_asFunctionalComponent(__VLS_326, new __VLS_326({
    label: "Refund Mode",
}));
const __VLS_328 = __VLS_327({
    label: "Refund Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_327));
__VLS_329.slots.default;
const __VLS_330 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_331 = __VLS_asFunctionalComponent(__VLS_330, new __VLS_330({
    value: (__VLS_ctx.currentService.customer_refund_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Refund Mode",
}));
const __VLS_332 = __VLS_331({
    value: (__VLS_ctx.currentService.customer_refund_mode),
    options: (__VLS_ctx.paymentModeOptions),
    placeholder: "Select Refund Mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_331));
var __VLS_329;
const __VLS_334 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_335 = __VLS_asFunctionalComponent(__VLS_334, new __VLS_334({
    ...{ class: "action-buttons" },
    justify: "end",
}));
const __VLS_336 = __VLS_335({
    ...{ class: "action-buttons" },
    justify: "end",
}, ...__VLS_functionalComponentArgsRest(__VLS_335));
__VLS_337.slots.default;
const __VLS_338 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_339 = __VLS_asFunctionalComponent(__VLS_338, new __VLS_338({
    ...{ 'onClick': {} },
}));
const __VLS_340 = __VLS_339({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_339));
let __VLS_342;
let __VLS_343;
let __VLS_344;
const __VLS_345 = {
    onClick: (...[$event]) => {
        __VLS_ctx.editCancelledModalVisible = false;
    }
};
__VLS_341.slots.default;
var __VLS_341;
const __VLS_346 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_347 = __VLS_asFunctionalComponent(__VLS_346, new __VLS_346({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_348 = __VLS_347({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_347));
let __VLS_350;
let __VLS_351;
let __VLS_352;
const __VLS_353 = {
    onClick: (__VLS_ctx.updateCancelledService)
};
__VLS_349.slots.default;
var __VLS_349;
var __VLS_337;
var __VLS_313;
var __VLS_305;
var __VLS_301;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['table-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['full-width-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['wide-field']} */ ;
/** @type {__VLS_StyleScopedClasses['action-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['transaction-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['responsive-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['refund-section']} */ ;
/** @type {__VLS_StyleScopedClasses['action-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['transaction-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['responsive-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['refund-section']} */ ;
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
            dateRange: dateRange,
            defaultDateRange: defaultDateRange,
            paymentModeOptions: paymentModeOptions,
            currentService: currentService,
            cancelData: cancelData,
            customerOptions: customerOptions,
            particularOptions: particularOptions,
            selectedCustomer: selectedCustomer,
            referenceNumber: referenceNumber,
            paginationActive: paginationActive,
            paginationCancelled: paginationCancelled,
            paginatedActiveServices: paginatedActiveServices,
            paginatedCancelledServices: paginatedCancelledServices,
            formRules: formRules,
            disableFutureDates: disableFutureDates,
            openAddModal: openAddModal,
            bookService: bookService,
            updateService: updateService,
            updateCancelledService: updateCancelledService,
            confirmCancel: confirmCancel,
            columnsActive: columnsActive,
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
//# sourceMappingURL=ServiceManager.vue.js.map