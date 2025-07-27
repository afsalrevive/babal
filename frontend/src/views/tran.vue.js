import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/api';
import { useMessage, NButton, NForm, NFormItem, NInput, NInputNumber, NSpace, NDataTable, NModal, NCard, NTabs, NTabPane, NH2, NH3, NH5, NP, NAlert } from 'naive-ui';
const router = useRouter();
const route = useRoute();
const message = useMessage();
// Constants and Refs
const tabs = ['payment', 'receipt', 'refund'];
const transactionType = ref('payment');
const searchQuery = ref('');
const transactions = ref([]);
const loading = ref(false);
const formRef = ref(null);
const modalVisible = ref(false);
const defaultFields = ref({});
const form = reactive({});
const fieldErrors = ref({});
const entityOptions = ref([]);
const entitiesLoading = ref(false);
const particulars = ref([]);
const particularsLoading = ref(false);
const nextRefNo = ref('');
const editingId = ref(null);
const modeBalance = ref(null);
// Entity Type Options
const entityTypeOptions = [
    { label: 'Customer', value: 'customer' },
    { label: 'Agent', value: 'agent' },
    { label: 'Partner', value: 'partner' },
    { label: 'Others', value: 'others' }
];
// Refund Direction Options
const refundDirectionOptions = [
    { label: 'Company → Entity', value: 'outgoing' },
    { label: 'Entity → Company', value: 'incoming' }
];
// Computed Properties
const selectedEntity = computed(() => entityOptions.value.find(e => e.value === form.entity_id));
const modalTitle = computed(() => {
    const mode = editingId.value ? 'Edit' : 'Add';
    return `${mode} ${toSentenceCase(transactionType.value)}`;
});
const nonRefundModeOptions = computed(() => [
    { label: 'Cash', value: 'cash' },
    { label: 'Online', value: 'online' }
]);
const companyModeOptions = [
    { label: 'Cash', value: 'cash' },
    { label: 'Online', value: 'online' }
];
const companyRefundFromModeOptions = computed(() => {
    const base = [
        { label: 'Cash', value: 'cash' },
        { label: 'Online', value: 'online' }
    ];
    if (['customer', 'partner'].includes(form.to_entity_type)) {
        base.push({ label: 'Service Availed', value: 'service_availed' });
    }
    return base;
});
const payTypeOptions = computed(() => {
    let types = [];
    if (transactionType.value === 'payment') {
        if (['customer', 'partner'].includes(form.entity_type)) {
            types = ['cash_withdrawal', 'other_expense'];
        }
        else if (form.entity_type === 'agent') {
            types = ['cash_deposit', 'other_expense'];
        }
        else if (form.entity_type === 'others') {
            types = ['other_expense'];
        }
    }
    else if (transactionType.value === 'receipt') {
        if (['customer', 'partner'].includes(form.entity_type)) {
            types = ['cash_deposit', 'other_receipt'];
        }
        else {
            types = ['other_receipt'];
        }
    }
    else if (transactionType.value === 'refund') {
        types = ['refund'];
    }
    return types.map(val => ({
        label: toSentenceCase(val),
        value: val
    }));
});
const particularOptions = computed(() => particulars.value.map(p => ({ label: p.name, value: p.id })));
const showWalletToggle = computed(() => {
    if (transactionType.value === 'payment') {
        return form.pay_type === 'other_expense' && form.entity_type !== 'others';
    }
    if (transactionType.value === 'receipt') {
        return form.pay_type === 'other_receipt' && form.entity_type !== 'others';
    }
    return false;
});
const toggleValue = computed({
    get() {
        if (transactionType.value === 'payment') {
            return form.deduct_from_account;
        }
        return form.credit_to_account;
    },
    set(value) {
        if (transactionType.value === 'payment') {
            form.deduct_from_account = value;
        }
        else {
            form.credit_to_account = value;
        }
    }
});
const toggleLabel = computed(() => {
    if (transactionType.value === 'payment') {
        return form.entity_type === 'agent'
            ? 'Credit to wallet/credit?'
            : 'Deduct from wallet/credit?';
    }
    return form.entity_type === 'agent'
        ? 'Deduct from wallet/credit?'
        : 'Credit to wallet/credit?';
});
const filteredTransactions = computed(() => {
    if (!searchQuery.value)
        return transactions.value;
    const q = searchQuery.value.toLowerCase();
    return transactions.value.filter((t) => Object.values(t).some((v) => String(v).toLowerCase().includes(q)));
});
// Methods
const toSentenceCase = (str) => str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
const onTabChange = async (type) => {
    if (['payment', 'receipt', 'refund'].includes(type)) {
        transactionType.value = type;
        router.push({ name: 'TransactionPage', query: { type } });
        await fetchSchema();
        await fetchTransactions();
    }
};
const fetchCompanyBalance = async (mode) => {
    try {
        const res = await api.get(`/api/company_balance/${mode}`);
        modeBalance.value = res.data.balance;
    }
    catch {
        modeBalance.value = null;
    }
};
const handleEntityTypeChange = (value) => {
    form.entity_type = value;
    form.entity_id = null;
    form.pay_type = null;
    form.mode = null;
    if (value !== 'others') {
        loadEntities(value);
    }
    else {
        entityOptions.value = [];
    }
};
const handleRefundEntityChange = (value, direction) => {
    const fieldPrefix = direction === 'to' ? 'to_' : 'from_';
    form[`${fieldPrefix}entity_type`] = value;
    form[`${fieldPrefix}entity_id`] = null;
    form.credit_to_account = false;
    form.deduct_from_account = false;
    if (value !== 'others') {
        loadEntities(value);
    }
    else {
        entityOptions.value = [];
    }
};
const getEntityToCompanyFromModeOptions = (entityType) => {
    if (['customer', 'partner', 'agent'].includes(entityType)) {
        return [
            { label: 'Cash', value: 'cash' },
            { label: 'Wallet', value: 'wallet' }
        ];
    }
    return [
        { label: 'Cash', value: 'cash' },
        { label: 'Online', value: 'online' }
    ];
};
const openAddModal = (row = null) => {
    fieldErrors.value = {};
    editingId.value = row?.id || null;
    nextRefNo.value = row?.ref_no || '';
    // Reset form
    Object.keys(form).forEach(key => delete form[key]);
    if (row) {
        // Populate from row data
        Object.entries(row).forEach(([key, val]) => {
            form[key] = key.includes('date') && typeof val === 'string'
                ? new Date(val).getTime()
                : val;
        });
        if (!form.transaction_date || isNaN(form.transaction_date)) {
            form.transaction_date = Date.now();
        }
    }
    else {
        // Populate default fields
        Object.entries(defaultFields.value).forEach(([key, val]) => {
            const value = typeof val === 'object' && val !== null && 'value' in val ? val.value : val;
            form[key] = key.includes('date') && typeof value === 'string'
                ? new Date(value).getTime()
                : value;
        });
        form.transaction_date = Date.now();
        if (transactionType.value === 'refund')
            form.pay_type = null;
    }
    modalVisible.value = true;
    loadEntities(form.entity_type || 'customer');
    loadParticulars();
    nextTick(() => formRef.value?.restoreValidation?.());
};
const closeModal = () => {
    modalVisible.value = false;
    editingId.value = null;
};
const fetchSchema = async () => {
    try {
        const res = await api.get(`/api/transactions/${transactionType.value}?mode=form`);
        const fields = res.data.default_fields || {};
        const parsedFields = {};
        Object.entries(fields).forEach(([key, field]) => {
            const value = field?.value ?? field;
            parsedFields[key] = key.includes('date') && typeof value === 'string'
                ? new Date(value).getTime()
                : value;
        });
        if (transactionType.value === 'refund')
            parsedFields.pay_type = null;
        defaultFields.value = parsedFields;
        nextRefNo.value = res.data.ref_no || '';
    }
    catch (e) {
        message.error(e?.response?.data?.error || 'Failed to load form schema');
        defaultFields.value = {};
        nextRefNo.value = '';
    }
};
const fetchTransactions = async () => {
    loading.value = true;
    try {
        const res = await api.get(`/api/transactions/${transactionType.value}`);
        transactions.value = res.data.transactions || [];
    }
    catch (e) {
        message.error(e?.response?.data?.error || 'Failed to fetch transactions');
        transactions.value = [];
    }
    finally {
        loading.value = false;
    }
};
const loadEntities = async (type) => {
    if (!type || type === 'others') {
        entityOptions.value = [];
        return;
    }
    entitiesLoading.value = true;
    try {
        const res = await api.get(`/api/manage/${type}`);
        entityOptions.value = res.data.map(e => ({ label: e.name, value: e.id, ...e }));
    }
    catch {
        message.error('Failed to load entities');
        entityOptions.value = [];
    }
    finally {
        entitiesLoading.value = false;
    }
};
const loadParticulars = async () => {
    particularsLoading.value = true;
    try {
        const res = await api.get('/api/manage/particular');
        particulars.value = res.data || [];
    }
    catch {
        message.error('Failed to load particulars');
    }
    finally {
        particularsLoading.value = false;
    }
};
const validateAndSubmit = async () => {
    try {
        // Validate form first
        await formRef.value?.validate();
        // Check for negative company balance
        if (modeBalance.value !== null && form.amount) {
            let newBalance = modeBalance.value;
            if (transactionType.value === 'payment') {
                newBalance -= form.amount;
            }
            else if (transactionType.value === 'receipt') {
                newBalance += form.amount;
            }
            else if (transactionType.value === 'refund') {
                if (form.refund_direction === 'outgoing') {
                    newBalance -= form.amount;
                }
                else if (form.refund_direction === 'incoming') {
                    newBalance += form.amount;
                }
            }
            if (newBalance < 0) {
                if (!confirm(`This transaction will make company account negative (₹${newBalance.toFixed(2)}). Proceed anyway?`)) {
                    return;
                }
            }
        }
        // If validation passed and user confirmed negative balance, submit
        await submitTransaction();
    }
    catch (errors) {
        // Validation errors will be shown automatically
        console.log('Form validation failed', errors);
    }
};
const submitTransaction = async () => {
    try {
        fieldErrors.value = {};
        // Prepare payload
        const payload = {
            ...form,
            transaction_type: transactionType.value,
            pay_type: transactionType.value === 'refund' ? 'refund' : form.pay_type,
            credit_to_account: form.credit_to_account,
            deduct_from_account: form.deduct_from_account
        };
        // Handle refund-specific fields
        if (transactionType.value === 'refund') {
            payload.entity_type = form.refund_direction === 'incoming'
                ? form.from_entity_type
                : form.to_entity_type;
            payload.entity_id = form.refund_direction === 'incoming'
                ? form.from_entity_id
                : form.to_entity_id;
            payload.mode = form.refund_direction === 'incoming'
                ? form.mode_for_from
                : form.mode_for_to;
        }
        // Submit to API
        if (editingId.value) {
            await api.put(`/api/transactions/${editingId.value}`, payload);
            message.success('Transaction updated');
        }
        else {
            await api.post(`/api/transactions/${transactionType.value}`, payload);
            message.success('Transaction added');
        }
        closeModal();
        await fetchTransactions();
    }
    catch (e) {
        if (e?.response?.data?.field_errors) {
            fieldErrors.value = e.response.data.field_errors;
        }
        else {
            message.error(e?.response?.data?.error || 'Failed to submit transaction');
        }
    }
};
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
    ];
    const refundExtra = [
        { title: 'Refund to Customer', key: 'refund_to_customer_amount' },
        { title: 'Deduct from Agent', key: 'deduct_from_agent_amount' },
        { title: 'Customer Mode', key: 'mode_for_customer' },
        { title: 'Agent Mode', key: 'mode_for_agent' }
    ];
    const actions = {
        title: 'Actions',
        key: 'actions',
        render: (row) => h(NSpace, { size: 8 }, () => [
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
    };
    if (transactionType.value === 'refund') {
        return [...baseColumns, ...refundExtra, actions];
    }
    else {
        return [...baseColumns, actions];
    }
});
const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?'))
        return;
    try {
        await api.delete(`/api/transactions/${id}`);
        message.success('Transaction deleted');
        await fetchTransactions();
    }
    catch (e) {
        message.error(e?.response?.data?.error || 'Failed to delete transaction');
    }
};
// Form validation rules
const formRules = computed(() => {
    const rules = {
        transaction_date: [{ required: true, message: 'Date is required' }],
        amount: [{
                required: true,
                validator: (rule, value) => {
                    if (value === null || value === undefined || value === '') {
                        return new Error('Amount is required');
                    }
                    if (Number(value) <= 0) {
                        return new Error('Amount must be greater than 0');
                    }
                    return true;
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
        }
        else {
            rules.to_entity_type = [{ required: true, message: 'To Entity Type is required' }];
            rules.mode_for_from = [{ required: true, message: 'From Mode is required' }];
            if (form.to_entity_type !== 'others') {
                rules.to_entity_id = [{ required: true, message: 'To Entity is required' }];
            }
        }
    }
    else {
        // Payment/Receipt rules
        rules.entity_type = [{ required: true, message: 'Entity type is required' }];
        rules.pay_type = [{ required: true, message: 'Payment type is required' }];
        rules.mode = [{ required: true, message: 'Mode is required' }];
        if (form.entity_type !== 'others') {
            rules.entity_id = [{
                    validator: (rule, value) => {
                        if (!value)
                            return new Error('Entity is required');
                        return true;
                    },
                    trigger: ['blur', 'change']
                }];
        }
    }
    return rules;
});
// Watchers
watch(() => route.query.type, async (type) => {
    if (['payment', 'receipt', 'refund'].includes(type)) {
        transactionType.value = type;
        await fetchSchema();
        await fetchTransactions();
    }
}, { immediate: true });
watch(() => form.entity_type, (newType) => {
    form.pay_type = null;
    form.mode = null;
    modeBalance.value = null;
});
// Lifecycle
onMounted(async () => {
    const typeParam = route.query.type;
    transactionType.value = ['payment', 'receipt', 'refund'].includes(typeParam)
        ? typeParam
        : 'payment';
    await fetchSchema();
    await fetchTransactions();
    await loadParticulars();
    if (form.entity_type && form.entity_type !== 'others') {
        await loadEntities(form.entity_type);
    }
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
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.transactionType),
    type: "line",
    animated: true,
    ...{ style: {} },
}));
const __VLS_11 = __VLS_10({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.transactionType),
    type: "line",
    animated: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
let __VLS_13;
let __VLS_14;
let __VLS_15;
const __VLS_16 = {
    'onUpdate:value': (__VLS_ctx.onTabChange)
};
__VLS_12.slots.default;
for (const [tab] of __VLS_getVForSourceType((__VLS_ctx.tabs))) {
    const __VLS_17 = {}.NTabPane;
    /** @type {[typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
        key: (tab),
        name: (tab),
        tab: (__VLS_ctx.toSentenceCase(tab)),
    }));
    const __VLS_19 = __VLS_18({
        key: (tab),
        name: (tab),
        tab: (__VLS_ctx.toSentenceCase(tab)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_18));
}
var __VLS_12;
const __VLS_21 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    justify: "space-between",
    wrap: true,
    ...{ style: {} },
}));
const __VLS_23 = __VLS_22({
    justify: "space-between",
    wrap: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_24.slots.default;
const __VLS_25 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_27 = __VLS_26({
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
const __VLS_29 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_31 = __VLS_30({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
let __VLS_33;
let __VLS_34;
let __VLS_35;
const __VLS_36 = {
    onClick: (__VLS_ctx.openAddModal)
};
__VLS_32.slots.default;
(__VLS_ctx.toSentenceCase(__VLS_ctx.transactionType));
var __VLS_32;
var __VLS_24;
const __VLS_37 = {}.NDataTable;
/** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
    columns: (__VLS_ctx.columns),
    data: (__VLS_ctx.filteredTransactions),
    loading: (__VLS_ctx.loading),
    striped: true,
}));
const __VLS_39 = __VLS_38({
    columns: (__VLS_ctx.columns),
    data: (__VLS_ctx.filteredTransactions),
    loading: (__VLS_ctx.loading),
    striped: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
const __VLS_41 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
    show: (__VLS_ctx.modalVisible),
    teleported: (false),
    title: (__VLS_ctx.modalTitle),
    ...{ class: "transaction-modal" },
    ...{ style: {} },
}));
const __VLS_43 = __VLS_42({
    show: (__VLS_ctx.modalVisible),
    teleported: (false),
    title: (__VLS_ctx.modalTitle),
    ...{ class: "transaction-modal" },
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
__VLS_44.slots.default;
const __VLS_45 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
    ...{ class: "modal-card" },
}));
const __VLS_47 = __VLS_46({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_46));
__VLS_48.slots.default;
const __VLS_49 = {}.NH3;
/** @type {[typeof __VLS_components.NH3, typeof __VLS_components.nH3, typeof __VLS_components.NH3, typeof __VLS_components.nH3, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
    ...{ style: {} },
}));
const __VLS_51 = __VLS_50({
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
__VLS_52.slots.default;
(__VLS_ctx.modalTitle);
var __VLS_52;
const __VLS_53 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.formRules),
}));
const __VLS_55 = __VLS_54({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.formRules),
}, ...__VLS_functionalComponentArgsRest(__VLS_54));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_57 = {};
__VLS_56.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "responsive-form-grid" },
});
const __VLS_59 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
    label: "Reference Number",
}));
const __VLS_61 = __VLS_60({
    label: "Reference Number",
}, ...__VLS_functionalComponentArgsRest(__VLS_60));
__VLS_62.slots.default;
const __VLS_63 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
    value: (__VLS_ctx.nextRefNo),
    placeholder: "Auto-generated",
    disabled: true,
}));
const __VLS_65 = __VLS_64({
    value: (__VLS_ctx.nextRefNo),
    placeholder: "Auto-generated",
    disabled: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_64));
var __VLS_62;
const __VLS_67 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
    label: "Date",
    prop: "transaction_date",
}));
const __VLS_69 = __VLS_68({
    label: "Date",
    prop: "transaction_date",
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
__VLS_70.slots.default;
const __VLS_71 = {}.NDatePicker;
/** @type {[typeof __VLS_components.NDatePicker, typeof __VLS_components.nDatePicker, ]} */ ;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
    value: (__VLS_ctx.form.transaction_date),
    type: "datetime",
    clearable: true,
}));
const __VLS_73 = __VLS_72({
    value: (__VLS_ctx.form.transaction_date),
    type: "datetime",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
var __VLS_70;
if (__VLS_ctx.transactionType !== 'refund') {
    const __VLS_75 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
        label: "Entity Type",
        prop: "entity_type",
    }));
    const __VLS_77 = __VLS_76({
        label: "Entity Type",
        prop: "entity_type",
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    __VLS_78.slots.default;
    const __VLS_79 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
        ...{ 'onUpdate:value': {} },
        value: (__VLS_ctx.form.entity_type),
        options: (__VLS_ctx.entityTypeOptions),
    }));
    const __VLS_81 = __VLS_80({
        ...{ 'onUpdate:value': {} },
        value: (__VLS_ctx.form.entity_type),
        options: (__VLS_ctx.entityTypeOptions),
    }, ...__VLS_functionalComponentArgsRest(__VLS_80));
    let __VLS_83;
    let __VLS_84;
    let __VLS_85;
    const __VLS_86 = {
        'onUpdate:value': (__VLS_ctx.handleEntityTypeChange)
    };
    var __VLS_82;
    var __VLS_78;
    const __VLS_87 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
        label: "Entity Name",
        prop: "entity_id",
    }));
    const __VLS_89 = __VLS_88({
        label: "Entity Name",
        prop: "entity_id",
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    __VLS_90.slots.default;
    const __VLS_91 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
        value: (__VLS_ctx.form.entity_id),
        options: (__VLS_ctx.entityOptions),
        loading: (__VLS_ctx.entitiesLoading),
        filterable: true,
        disabled: (!__VLS_ctx.form.entity_type || __VLS_ctx.form.entity_type === 'others'),
        placeholder: "Select entity",
    }));
    const __VLS_93 = __VLS_92({
        value: (__VLS_ctx.form.entity_id),
        options: (__VLS_ctx.entityOptions),
        loading: (__VLS_ctx.entitiesLoading),
        filterable: true,
        disabled: (!__VLS_ctx.form.entity_type || __VLS_ctx.form.entity_type === 'others'),
        placeholder: "Select entity",
    }, ...__VLS_functionalComponentArgsRest(__VLS_92));
    var __VLS_90;
}
else {
    const __VLS_95 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
        label: "Refund Direction",
        prop: "refund_direction",
    }));
    const __VLS_97 = __VLS_96({
        label: "Refund Direction",
        prop: "refund_direction",
    }, ...__VLS_functionalComponentArgsRest(__VLS_96));
    __VLS_98.slots.default;
    const __VLS_99 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
        value: (__VLS_ctx.form.refund_direction),
        options: (__VLS_ctx.refundDirectionOptions),
    }));
    const __VLS_101 = __VLS_100({
        value: (__VLS_ctx.form.refund_direction),
        options: (__VLS_ctx.refundDirectionOptions),
    }, ...__VLS_functionalComponentArgsRest(__VLS_100));
    var __VLS_98;
    if (__VLS_ctx.form.refund_direction === 'outgoing') {
        const __VLS_103 = {}.NFormItem;
        /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
            label: "To Entity Type",
            prop: "to_entity_type",
        }));
        const __VLS_105 = __VLS_104({
            label: "To Entity Type",
            prop: "to_entity_type",
        }, ...__VLS_functionalComponentArgsRest(__VLS_104));
        __VLS_106.slots.default;
        const __VLS_107 = {}.NSelect;
        /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
        // @ts-ignore
        const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
            ...{ 'onUpdate:value': {} },
            value: (__VLS_ctx.form.to_entity_type),
            options: (__VLS_ctx.entityTypeOptions),
        }));
        const __VLS_109 = __VLS_108({
            ...{ 'onUpdate:value': {} },
            value: (__VLS_ctx.form.to_entity_type),
            options: (__VLS_ctx.entityTypeOptions),
        }, ...__VLS_functionalComponentArgsRest(__VLS_108));
        let __VLS_111;
        let __VLS_112;
        let __VLS_113;
        const __VLS_114 = {
            'onUpdate:value': (val => __VLS_ctx.handleRefundEntityChange(val, 'to'))
        };
        var __VLS_110;
        var __VLS_106;
        if (__VLS_ctx.form.to_entity_type && __VLS_ctx.form.to_entity_type !== 'others') {
            const __VLS_115 = {}.NFormItem;
            /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
                label: "To Entity Name",
                prop: "to_entity_id",
            }));
            const __VLS_117 = __VLS_116({
                label: "To Entity Name",
                prop: "to_entity_id",
            }, ...__VLS_functionalComponentArgsRest(__VLS_116));
            __VLS_118.slots.default;
            const __VLS_119 = {}.NSelect;
            /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
            // @ts-ignore
            const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
                value: (__VLS_ctx.form.to_entity_id),
                options: (__VLS_ctx.entityOptions),
                loading: (__VLS_ctx.entitiesLoading),
                filterable: true,
                placeholder: "Select entity",
            }));
            const __VLS_121 = __VLS_120({
                value: (__VLS_ctx.form.to_entity_id),
                options: (__VLS_ctx.entityOptions),
                loading: (__VLS_ctx.entitiesLoading),
                filterable: true,
                placeholder: "Select entity",
            }, ...__VLS_functionalComponentArgsRest(__VLS_120));
            var __VLS_118;
        }
        const __VLS_123 = {}.NFormItem;
        /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
            label: "From Mode (Company)",
            prop: "mode_for_from",
        }));
        const __VLS_125 = __VLS_124({
            label: "From Mode (Company)",
            prop: "mode_for_from",
        }, ...__VLS_functionalComponentArgsRest(__VLS_124));
        __VLS_126.slots.default;
        const __VLS_127 = {}.NSelect;
        /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
        // @ts-ignore
        const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
            value: (__VLS_ctx.form.mode_for_from),
            options: (__VLS_ctx.companyRefundFromModeOptions),
            placeholder: "Company pays via",
        }));
        const __VLS_129 = __VLS_128({
            value: (__VLS_ctx.form.mode_for_from),
            options: (__VLS_ctx.companyRefundFromModeOptions),
            placeholder: "Company pays via",
        }, ...__VLS_functionalComponentArgsRest(__VLS_128));
        var __VLS_126;
        if (__VLS_ctx.form.mode_for_from && __VLS_ctx.modeBalance !== null) {
            const __VLS_131 = {}.NFormItem;
            /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
                label: "Company Account",
            }));
            const __VLS_133 = __VLS_132({
                label: "Company Account",
            }, ...__VLS_functionalComponentArgsRest(__VLS_132));
            __VLS_134.slots.default;
            const __VLS_135 = {}.NP;
            /** @type {[typeof __VLS_components.NP, typeof __VLS_components.nP, typeof __VLS_components.NP, typeof __VLS_components.nP, ]} */ ;
            // @ts-ignore
            const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({}));
            const __VLS_137 = __VLS_136({}, ...__VLS_functionalComponentArgsRest(__VLS_136));
            __VLS_138.slots.default;
            (__VLS_ctx.form.mode_for_from);
            (__VLS_ctx.modeBalance.toFixed(2));
            var __VLS_138;
            var __VLS_134;
        }
        if (__VLS_ctx.form.to_entity_type) {
            if (['customer', 'partner'].includes(__VLS_ctx.form.to_entity_type)) {
                if (['cash', 'online'].includes(__VLS_ctx.form.mode_for_from)) {
                    const __VLS_139 = {}.NFormItem;
                    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
                    // @ts-ignore
                    const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
                        label: "Deduct from Entity Account?",
                    }));
                    const __VLS_141 = __VLS_140({
                        label: "Deduct from Entity Account?",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_140));
                    __VLS_142.slots.default;
                    const __VLS_143 = {}.NSwitch;
                    /** @type {[typeof __VLS_components.NSwitch, typeof __VLS_components.nSwitch, ]} */ ;
                    // @ts-ignore
                    const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
                        value: (__VLS_ctx.form.deduct_from_account),
                    }));
                    const __VLS_145 = __VLS_144({
                        value: (__VLS_ctx.form.deduct_from_account),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_144));
                    var __VLS_142;
                }
                if (__VLS_ctx.form.mode_for_from === 'service_availed') {
                    const __VLS_147 = {}.NFormItem;
                    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
                    // @ts-ignore
                    const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
                        label: "Credit to Entity Account?",
                    }));
                    const __VLS_149 = __VLS_148({
                        label: "Credit to Entity Account?",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_148));
                    __VLS_150.slots.default;
                    const __VLS_151 = {}.NSwitch;
                    /** @type {[typeof __VLS_components.NSwitch, typeof __VLS_components.nSwitch, ]} */ ;
                    // @ts-ignore
                    const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
                        value: (__VLS_ctx.form.credit_to_account),
                    }));
                    const __VLS_153 = __VLS_152({
                        value: (__VLS_ctx.form.credit_to_account),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_152));
                    var __VLS_150;
                }
            }
            if (__VLS_ctx.form.to_entity_type === 'agent') {
                const __VLS_155 = {}.NFormItem;
                /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
                    label: "Credit Agent Account?",
                }));
                const __VLS_157 = __VLS_156({
                    label: "Credit Agent Account?",
                }, ...__VLS_functionalComponentArgsRest(__VLS_156));
                __VLS_158.slots.default;
                const __VLS_159 = {}.NSwitch;
                /** @type {[typeof __VLS_components.NSwitch, typeof __VLS_components.nSwitch, ]} */ ;
                // @ts-ignore
                const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
                    value: (__VLS_ctx.form.credit_to_account),
                }));
                const __VLS_161 = __VLS_160({
                    value: (__VLS_ctx.form.credit_to_account),
                }, ...__VLS_functionalComponentArgsRest(__VLS_160));
                var __VLS_158;
            }
            if (__VLS_ctx.form.to_entity_type === 'others') {
                const __VLS_163 = {}.NFormItem;
                /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
                    label: "Note",
                }));
                const __VLS_165 = __VLS_164({
                    label: "Note",
                }, ...__VLS_functionalComponentArgsRest(__VLS_164));
                __VLS_166.slots.default;
                const __VLS_167 = {}.NAlert;
                /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, ]} */ ;
                // @ts-ignore
                const __VLS_168 = __VLS_asFunctionalComponent(__VLS_167, new __VLS_167({
                    type: "info",
                    showIcon: (false),
                }));
                const __VLS_169 = __VLS_168({
                    type: "info",
                    showIcon: (false),
                }, ...__VLS_functionalComponentArgsRest(__VLS_168));
                __VLS_170.slots.default;
                var __VLS_170;
                var __VLS_166;
            }
        }
    }
    else {
        const __VLS_171 = {}.NFormItem;
        /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({
            label: "From Entity Type",
            prop: "from_entity_type",
        }));
        const __VLS_173 = __VLS_172({
            label: "From Entity Type",
            prop: "from_entity_type",
        }, ...__VLS_functionalComponentArgsRest(__VLS_172));
        __VLS_174.slots.default;
        const __VLS_175 = {}.NSelect;
        /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
        // @ts-ignore
        const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({
            ...{ 'onUpdate:value': {} },
            value: (__VLS_ctx.form.from_entity_type),
            options: (__VLS_ctx.entityTypeOptions),
        }));
        const __VLS_177 = __VLS_176({
            ...{ 'onUpdate:value': {} },
            value: (__VLS_ctx.form.from_entity_type),
            options: (__VLS_ctx.entityTypeOptions),
        }, ...__VLS_functionalComponentArgsRest(__VLS_176));
        let __VLS_179;
        let __VLS_180;
        let __VLS_181;
        const __VLS_182 = {
            'onUpdate:value': (val => __VLS_ctx.handleRefundEntityChange(val, 'from'))
        };
        var __VLS_178;
        var __VLS_174;
        if (__VLS_ctx.form.from_entity_type && __VLS_ctx.form.from_entity_type !== 'others') {
            const __VLS_183 = {}.NFormItem;
            /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_184 = __VLS_asFunctionalComponent(__VLS_183, new __VLS_183({
                label: "From Entity Name",
                prop: "from_entity_id",
            }));
            const __VLS_185 = __VLS_184({
                label: "From Entity Name",
                prop: "from_entity_id",
            }, ...__VLS_functionalComponentArgsRest(__VLS_184));
            __VLS_186.slots.default;
            const __VLS_187 = {}.NSelect;
            /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
            // @ts-ignore
            const __VLS_188 = __VLS_asFunctionalComponent(__VLS_187, new __VLS_187({
                value: (__VLS_ctx.form.from_entity_id),
                options: (__VLS_ctx.entityOptions),
                loading: (__VLS_ctx.entitiesLoading),
                filterable: true,
                placeholder: "Select entity",
            }));
            const __VLS_189 = __VLS_188({
                value: (__VLS_ctx.form.from_entity_id),
                options: (__VLS_ctx.entityOptions),
                loading: (__VLS_ctx.entitiesLoading),
                filterable: true,
                placeholder: "Select entity",
            }, ...__VLS_functionalComponentArgsRest(__VLS_188));
            var __VLS_186;
        }
        if (__VLS_ctx.form.from_entity_type && __VLS_ctx.form.from_entity_type !== 'others') {
            const __VLS_191 = {}.NFormItem;
            /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
                label: "From Mode (Entity)",
                prop: "mode_for_from",
            }));
            const __VLS_193 = __VLS_192({
                label: "From Mode (Entity)",
                prop: "mode_for_from",
            }, ...__VLS_functionalComponentArgsRest(__VLS_192));
            __VLS_194.slots.default;
            const __VLS_195 = {}.NSelect;
            /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
            // @ts-ignore
            const __VLS_196 = __VLS_asFunctionalComponent(__VLS_195, new __VLS_195({
                value: (__VLS_ctx.form.mode_for_from),
                options: (__VLS_ctx.getEntityToCompanyFromModeOptions(__VLS_ctx.form.from_entity_type)),
                placeholder: "Entity pays via",
            }));
            const __VLS_197 = __VLS_196({
                value: (__VLS_ctx.form.mode_for_from),
                options: (__VLS_ctx.getEntityToCompanyFromModeOptions(__VLS_ctx.form.from_entity_type)),
                placeholder: "Entity pays via",
            }, ...__VLS_functionalComponentArgsRest(__VLS_196));
            var __VLS_194;
        }
        if (__VLS_ctx.form.from_entity_type === 'others' || __VLS_ctx.form.mode_for_from === 'cash') {
            const __VLS_199 = {}.NFormItem;
            /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_200 = __VLS_asFunctionalComponent(__VLS_199, new __VLS_199({
                label: "To Mode (Company)",
                prop: "mode_for_to",
            }));
            const __VLS_201 = __VLS_200({
                label: "To Mode (Company)",
                prop: "mode_for_to",
            }, ...__VLS_functionalComponentArgsRest(__VLS_200));
            __VLS_202.slots.default;
            const __VLS_203 = {}.NSelect;
            /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
            // @ts-ignore
            const __VLS_204 = __VLS_asFunctionalComponent(__VLS_203, new __VLS_203({
                value: (__VLS_ctx.form.mode_for_to),
                options: (__VLS_ctx.companyModeOptions),
                placeholder: "Company receives via",
            }));
            const __VLS_205 = __VLS_204({
                value: (__VLS_ctx.form.mode_for_to),
                options: (__VLS_ctx.companyModeOptions),
                placeholder: "Company receives via",
            }, ...__VLS_functionalComponentArgsRest(__VLS_204));
            var __VLS_202;
        }
    }
}
const __VLS_207 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_208 = __VLS_asFunctionalComponent(__VLS_207, new __VLS_207({
    label: "Particular",
    prop: "particular_id",
}));
const __VLS_209 = __VLS_208({
    label: "Particular",
    prop: "particular_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_208));
__VLS_210.slots.default;
const __VLS_211 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
    value: (__VLS_ctx.form.particular_id),
    options: (__VLS_ctx.particularOptions),
    loading: (__VLS_ctx.particularsLoading),
    filterable: true,
    clearable: true,
}));
const __VLS_213 = __VLS_212({
    value: (__VLS_ctx.form.particular_id),
    options: (__VLS_ctx.particularOptions),
    loading: (__VLS_ctx.particularsLoading),
    filterable: true,
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_212));
var __VLS_210;
if (__VLS_ctx.transactionType !== 'refund') {
    const __VLS_215 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_216 = __VLS_asFunctionalComponent(__VLS_215, new __VLS_215({
        label: "Payment Type",
        prop: "pay_type",
    }));
    const __VLS_217 = __VLS_216({
        label: "Payment Type",
        prop: "pay_type",
    }, ...__VLS_functionalComponentArgsRest(__VLS_216));
    __VLS_218.slots.default;
    const __VLS_219 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
        value: (__VLS_ctx.form.pay_type),
        options: (__VLS_ctx.payTypeOptions),
        clearable: true,
    }));
    const __VLS_221 = __VLS_220({
        value: (__VLS_ctx.form.pay_type),
        options: (__VLS_ctx.payTypeOptions),
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_220));
    var __VLS_218;
}
if (__VLS_ctx.showWalletToggle) {
    const __VLS_223 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({
        showLabel: (false),
    }));
    const __VLS_225 = __VLS_224({
        showLabel: (false),
    }, ...__VLS_functionalComponentArgsRest(__VLS_224));
    __VLS_226.slots.default;
    const __VLS_227 = {}.NCheckbox;
    /** @type {[typeof __VLS_components.NCheckbox, typeof __VLS_components.nCheckbox, typeof __VLS_components.NCheckbox, typeof __VLS_components.nCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
        checked: (__VLS_ctx.toggleValue),
    }));
    const __VLS_229 = __VLS_228({
        checked: (__VLS_ctx.toggleValue),
    }, ...__VLS_functionalComponentArgsRest(__VLS_228));
    __VLS_230.slots.default;
    (__VLS_ctx.toggleLabel);
    var __VLS_230;
    var __VLS_226;
}
if (__VLS_ctx.transactionType !== 'refund') {
    const __VLS_231 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_232 = __VLS_asFunctionalComponent(__VLS_231, new __VLS_231({
        label: "Mode of Payment",
        prop: "mode",
    }));
    const __VLS_233 = __VLS_232({
        label: "Mode of Payment",
        prop: "mode",
    }, ...__VLS_functionalComponentArgsRest(__VLS_232));
    __VLS_234.slots.default;
    const __VLS_235 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
        ...{ 'onUpdate:value': {} },
        value: (__VLS_ctx.form.mode),
        options: (__VLS_ctx.nonRefundModeOptions),
    }));
    const __VLS_237 = __VLS_236({
        ...{ 'onUpdate:value': {} },
        value: (__VLS_ctx.form.mode),
        options: (__VLS_ctx.nonRefundModeOptions),
    }, ...__VLS_functionalComponentArgsRest(__VLS_236));
    let __VLS_239;
    let __VLS_240;
    let __VLS_241;
    const __VLS_242 = {
        'onUpdate:value': (__VLS_ctx.fetchCompanyBalance)
    };
    var __VLS_238;
    var __VLS_234;
}
const __VLS_243 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
    label: "Amount",
    prop: "amount",
}));
const __VLS_245 = __VLS_244({
    label: "Amount",
    prop: "amount",
}, ...__VLS_functionalComponentArgsRest(__VLS_244));
__VLS_246.slots.default;
const __VLS_247 = {}.NInputNumber;
/** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
// @ts-ignore
const __VLS_248 = __VLS_asFunctionalComponent(__VLS_247, new __VLS_247({
    value: (__VLS_ctx.form.amount),
    min: (0),
    step: (0.01),
    clearable: true,
}));
const __VLS_249 = __VLS_248({
    value: (__VLS_ctx.form.amount),
    min: (0),
    step: (0.01),
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_248));
var __VLS_246;
const __VLS_251 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
    label: "Description",
    prop: "description",
}));
const __VLS_253 = __VLS_252({
    label: "Description",
    prop: "description",
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
__VLS_254.slots.default;
const __VLS_255 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
    value: (__VLS_ctx.form.description),
    type: "textarea",
}));
const __VLS_257 = __VLS_256({
    value: (__VLS_ctx.form.description),
    type: "textarea",
}, ...__VLS_functionalComponentArgsRest(__VLS_256));
var __VLS_254;
var __VLS_56;
{
    const { footer: __VLS_thisSlot } = __VLS_48.slots;
    if (__VLS_ctx.form.mode && __VLS_ctx.modeBalance !== null) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_259 = {}.NH5;
        /** @type {[typeof __VLS_components.NH5, typeof __VLS_components.nH5, typeof __VLS_components.NH5, typeof __VLS_components.nH5, ]} */ ;
        // @ts-ignore
        const __VLS_260 = __VLS_asFunctionalComponent(__VLS_259, new __VLS_259({}));
        const __VLS_261 = __VLS_260({}, ...__VLS_functionalComponentArgsRest(__VLS_260));
        __VLS_262.slots.default;
        var __VLS_262;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.form.mode);
        (__VLS_ctx.modeBalance.toFixed(2));
    }
    if (__VLS_ctx.selectedEntity) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_263 = {}.NH5;
        /** @type {[typeof __VLS_components.NH5, typeof __VLS_components.nH5, typeof __VLS_components.NH5, typeof __VLS_components.nH5, ]} */ ;
        // @ts-ignore
        const __VLS_264 = __VLS_asFunctionalComponent(__VLS_263, new __VLS_263({}));
        const __VLS_265 = __VLS_264({}, ...__VLS_functionalComponentArgsRest(__VLS_264));
        __VLS_266.slots.default;
        var __VLS_266;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.selectedEntity.wallet_balance ?? 'N/A');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        (__VLS_ctx.selectedEntity.credit_limit ?? 'N/A');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        (__VLS_ctx.selectedEntity.credit_used ?? 'N/A');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
    }
    const __VLS_267 = {}.NSpace;
    /** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
    // @ts-ignore
    const __VLS_268 = __VLS_asFunctionalComponent(__VLS_267, new __VLS_267({
        justify: "end",
    }));
    const __VLS_269 = __VLS_268({
        justify: "end",
    }, ...__VLS_functionalComponentArgsRest(__VLS_268));
    __VLS_270.slots.default;
    const __VLS_271 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({
        ...{ 'onClick': {} },
    }));
    const __VLS_273 = __VLS_272({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_272));
    let __VLS_275;
    let __VLS_276;
    let __VLS_277;
    const __VLS_278 = {
        onClick: (__VLS_ctx.closeModal)
    };
    __VLS_274.slots.default;
    var __VLS_274;
    const __VLS_279 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_280 = __VLS_asFunctionalComponent(__VLS_279, new __VLS_279({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_281 = __VLS_280({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_280));
    let __VLS_283;
    let __VLS_284;
    let __VLS_285;
    const __VLS_286 = {
        onClick: (__VLS_ctx.validateAndSubmit)
    };
    __VLS_282.slots.default;
    var __VLS_282;
    var __VLS_270;
}
var __VLS_48;
var __VLS_44;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['transaction-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['responsive-form-grid']} */ ;
// @ts-ignore
var __VLS_58 = __VLS_57;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NForm: NForm,
            NFormItem: NFormItem,
            NInput: NInput,
            NInputNumber: NInputNumber,
            NSpace: NSpace,
            NDataTable: NDataTable,
            NModal: NModal,
            NCard: NCard,
            NTabs: NTabs,
            NTabPane: NTabPane,
            NH2: NH2,
            NH3: NH3,
            NH5: NH5,
            NP: NP,
            NAlert: NAlert,
            tabs: tabs,
            transactionType: transactionType,
            searchQuery: searchQuery,
            loading: loading,
            formRef: formRef,
            modalVisible: modalVisible,
            form: form,
            entityOptions: entityOptions,
            entitiesLoading: entitiesLoading,
            particularsLoading: particularsLoading,
            nextRefNo: nextRefNo,
            modeBalance: modeBalance,
            entityTypeOptions: entityTypeOptions,
            refundDirectionOptions: refundDirectionOptions,
            selectedEntity: selectedEntity,
            modalTitle: modalTitle,
            nonRefundModeOptions: nonRefundModeOptions,
            companyModeOptions: companyModeOptions,
            companyRefundFromModeOptions: companyRefundFromModeOptions,
            payTypeOptions: payTypeOptions,
            particularOptions: particularOptions,
            showWalletToggle: showWalletToggle,
            toggleValue: toggleValue,
            toggleLabel: toggleLabel,
            filteredTransactions: filteredTransactions,
            toSentenceCase: toSentenceCase,
            onTabChange: onTabChange,
            fetchCompanyBalance: fetchCompanyBalance,
            handleEntityTypeChange: handleEntityTypeChange,
            handleRefundEntityChange: handleRefundEntityChange,
            getEntityToCompanyFromModeOptions: getEntityToCompanyFromModeOptions,
            openAddModal: openAddModal,
            closeModal: closeModal,
            validateAndSubmit: validateAndSubmit,
            columns: columns,
            formRules: formRules,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=tran.vue.js.map