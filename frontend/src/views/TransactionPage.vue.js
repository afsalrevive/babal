import { ref, reactive, computed, onMounted, nextTick, watch, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/api';
import { useMessage, NButton, NSpace, NForm, NFormItem, NInput, NInputNumber, NDataTable, NModal, NCard, NTabs, NTabPane, NIcon, NDatePicker, NH2, NH5 } from 'naive-ui';
import { DocumentTextOutline } from '@vicons/ionicons5';
// Import form sections
import PaymentFormSection from './PaymentFormSection.vue';
import RefundFormSection from './RefundFormSection.vue';
import WalletTransferFormSection from './WalletTransferFormSection.vue';
// ---- ROUTING AND STATE ----
const router = useRouter();
const route = useRoute();
const message = useMessage();
const tabs = ['payment', 'receipt', 'refund', 'wallet_transfer'];
const transactionType = ref('payment');
const searchQuery = ref('');
const transactions = ref([]);
const loading = ref(false);
const exporting = ref(false);
const formRef = ref(null);
const modalVisible = ref(false);
const defaultFields = ref({});
const editingId = ref(null);
const fieldErrors = ref({});
const modeBalance = ref(null);
const dateRange = ref(null);
const entitiesLoading = ref(false);
const fromEntitiesLoading = ref(false);
const toEntitiesLoading = ref(false);
const particularsLoading = ref(false);
const entityOptions = ref([]);
const fromEntityOptions = ref([]);
const toEntityOptions = ref([]);
const particulars = ref([]);
const nextRefNo = ref('');
const entityOptionsReady = ref(false);
const refNoLoading = ref(false);
// Pagination
const pagination = reactive({
    page: 1,
    pageSize: 20,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50, 100],
    onChange: (page) => {
        pagination.page = page;
    },
    onUpdatePageSize: (pageSize) => {
        pagination.pageSize = pageSize;
        pagination.page = 1;
    }
});
// ---- CONSTANTS ----
const defaultDateRange = computed(() => {
    const end = Date.now();
    const start = end - 7 * 24 * 60 * 60 * 1000;
    return [start, end];
});
const entityTypeOptions = [
    { label: 'Customer', value: 'customer' }, { label: 'Agent', value: 'agent' },
    { label: 'Partner', value: 'partner' }, { label: 'Others', value: 'others' }
];
const refundDirectionOptions = [
    { label: 'Company → Entity', value: 'outgoing' }, { label: 'Entity → Company', value: 'incoming' }
];
const companyModeOptions = [
    { label: 'Cash', value: 'cash' }, { label: 'Online', value: 'online' }
];
const nonRefundModeOptions = companyModeOptions;
const onTabChange = async (type) => {
    if (tabs.includes(type)) {
        transactionType.value = type;
        router.push({ name: 'TransactionPage', query: { type } });
        await fetchSchema();
        await fetchTransactions();
    }
};
// ---- FORM MODEL & UTILITIES ----
const defaultFormState = () => ({
    ref_no: '', transaction_date: Date.now(), amount: null,
    entity_type: null, entity_id: null, pay_type: null, mode: null,
    description: '', particular_id: null,
    refund_direction: null, to_entity_type: null, to_entity_id: null,
    from_entity_type: null, from_entity_id: null,
    mode_for_from: null, mode_for_to: null,
    deduct_from_account: false, credit_to_account: false
});
const form = reactive(defaultFormState());
const resetForm = () => Object.assign(form, defaultFormState());
function toSentenceCase(str) {
    return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
function padNum(n, wid = 5) { return String(n).padStart(wid, '0'); }
function generatePlaceholder() {
    const year = new Date().getFullYear();
    const prefix = { payment: 'P', receipt: 'R', refund: 'E', wallet_transfer: 'W' }[transactionType.value];
    const matches = transactions.value.filter((t) => t.ref_no?.startsWith(`${year}/${prefix}/`));
    const lastNum = matches.reduce((max, t) => Math.max(max, parseInt((t.ref_no || '').split('/')[2] || '0')), 0);
    return `${year}/${prefix}/${padNum(lastNum + 1)}`;
}
function assignRefNo(incoming) {
    const fallback = generatePlaceholder();
    form.ref_no = incoming || fallback;
    nextRefNo.value = form.ref_no;
}
// ---- COMPUTED PROPERTIES ----
const selectedEntity = computed(() => entityOptions.value.find((e) => e.value === form.entity_id));
const selectedFromEntity = computed(() => fromEntityOptions.value.find((e) => e.value === form.from_entity_id));
const selectedToEntity = computed(() => toEntityOptions.value.find((e) => e.value === form.to_entity_id));
const modalTitle = computed(() => `${editingId.value ? 'Edit' : 'Add'} ${toSentenceCase(transactionType.value)}`);
const particularOptions = computed(() => particulars.value.map((p) => ({ label: p.name, value: p.id })));
const filteredTransactions = computed(() => {
    if (!searchQuery.value)
        return transactions.value;
    const q = searchQuery.value.toLowerCase();
    return transactions.value.filter((t) => ['ref_no', 'entity_name', 'particular_name'].some(field => String(t[field]).toLowerCase().includes(q)));
});
const paginatedTransactions = computed(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredTransactions.value.slice(start, end);
});
const companyRefundFromModeOptions = computed(() => {
    const base = [...companyModeOptions];
    if (['customer', 'partner'].includes(form.to_entity_type)) {
        base.push({ label: 'Service Availed', value: 'service_availed' });
    }
    return base;
});
const payTypeOptions = computed(() => {
    let types = [];
    const entityType = form.entity_type || 'customer';
    if (transactionType.value === 'payment') {
        if (['customer', 'partner'].includes(entityType))
            types = ['cash_withdrawal', 'other_expense'];
        else if (entityType === 'agent')
            types = ['cash_deposit', 'other_expense'];
        else if (entityType === 'others')
            types = ['other_expense'];
    }
    else if (transactionType.value === 'receipt') {
        if (['customer', 'partner'].includes(entityType))
            types = ['cash_deposit', 'other_receipt'];
        else
            types = ['other_receipt'];
    }
    else if (transactionType.value === 'refund')
        types = ['refund'];
    return types.map(val => ({ label: toSentenceCase(val), value: val }));
});
const showWalletToggle = computed(() => {
    if (transactionType.value === 'payment')
        return form.pay_type === 'other_expense' && form.entity_type !== 'others';
    if (transactionType.value === 'receipt')
        return form.pay_type === 'other_receipt' && form.entity_type !== 'others';
    return false;
});
const walletToggleDisabled = computed(() => (transactionType.value === 'payment' && form.entity_type === 'agent' && form.pay_type === 'cash_deposit'));
const toggleValue = computed(() => {
    return transactionType.value === 'payment' ? form.deduct_from_account : form.credit_to_account;
});
const toggleLabel = computed(() => {
    if (transactionType.value === 'payment')
        return form.entity_type === 'agent' ? 'Credit to wallet/credit?' : 'Deduct from wallet/credit?';
    return form.entity_type === 'agent' ? 'Deduct from wallet/credit?' : 'Credit to wallet/credit?';
});
// ---- FORM RULES ----
const formRules = computed(() => {
    const rules = {
        transaction_date: [{ required: true, message: 'Date is required' }],
        amount: [{
                required: true,
                validator: (rule, value) => {
                    if (value === null || value === undefined || value === '')
                        return new Error('Amount is required');
                    if (isNaN(Number(value)))
                        return new Error('Amount must be a number');
                    if (Number(value) <= 0)
                        return new Error('Amount must be > 0');
                    return true;
                }, trigger: ['input', 'blur', 'change']
            }]
    };
    if (transactionType.value === 'refund') {
        rules.refund_direction = [{ required: true, message: 'Refund direction required' }];
        if (form.refund_direction === 'incoming') {
            rules.from_entity_type = [{ required: true, message: 'From Entity Type required' }];
            if (form.from_entity_type !== 'others') {
                rules.from_entity_id = [{ required: true, message: 'From Entity required' }];
                rules.mode_for_from = [{ required: true, message: 'From Mode required' }];
            }
            if (form.from_entity_type === 'others' || form.mode_for_from === 'cash')
                rules.mode_for_to = [{ required: true, message: 'To Mode required' }];
        }
        else {
            rules.to_entity_type = [{ required: true, message: 'To Entity Type required' }];
            rules.mode_for_from = [{ required: true, message: 'From Mode required' }];
            if (form.to_entity_type !== 'others')
                rules.to_entity_id = [{ required: true, message: 'To Entity required' }];
        }
    }
    else if (transactionType.value === 'wallet_transfer') {
        rules.from_entity_type = [{ required: true, message: 'From Entity Type required' }];
        rules.to_entity_type = [{ required: true, message: 'To Entity Type required' }];
        if (form.from_entity_type !== 'others')
            rules.from_entity_id = [{ required: true, message: 'From Entity required' }];
        if (form.to_entity_type !== 'others')
            rules.to_entity_id = [{ required: true, message: 'To Entity required' }];
    }
    else {
        rules.entity_type = [{ required: true, message: 'Entity type required' }];
        rules.pay_type = [{ required: true, message: 'Payment type required' }];
        rules.mode = [{ required: true, message: 'Mode required' }];
        if (form.entity_type !== 'others')
            rules.entity_id = [{
                    validator: (rule, value) => !value ? new Error('Entity required') : true,
                    trigger: ['blur', 'change']
                }];
    }
    return rules;
});
// ---- API CALL HELPERS ----
const fetchCompanyBalance = async (mode) => {
    try {
        const { data } = await api.get(`/api/company_balance/${mode}`);
        modeBalance.value = data.balance;
    }
    catch {
        modeBalance.value = null;
    }
};
const loadEntities = async (type, context = 'default') => {
    if (!type || type === 'others') {
        if (context === 'default')
            entityOptions.value = [];
        else if (context === 'from')
            fromEntityOptions.value = [];
        else if (context === 'to')
            toEntityOptions.value = [];
        return;
    }
    // Set loading state
    const loaders = {
        default: { loading: entitiesLoading, options: entityOptions },
        from: { loading: fromEntitiesLoading, options: fromEntityOptions },
        to: { loading: toEntitiesLoading, options: toEntityOptions }
    };
    const loader = loaders[context];
    loader.loading.value = true;
    try {
        const res = await api.get(`/api/manage/${type}`);
        const options = res.data.map((e) => ({
            label: e.name,
            value: e.id,
            wallet_balance: e.wallet_balance,
            credit_limit: e.credit_limit,
            credit_used: e.credit_used,
            credit_balance: e.credit_balance
        }));
        loader.options.value = options;
    }
    catch {
        message.error('Failed to load entities');
    }
    finally {
        loader.loading.value = false;
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
const fetchSchema = async () => {
    refNoLoading.value = true;
    try {
        const { data } = await api.get(`/api/transactions/${transactionType.value}?mode=form`);
        const parsed = {};
        Object.entries(data.default_fields || {}).forEach(([k, v]) => {
            parsed[k] = (typeof v === 'object' && v && 'value' in v) ? v.value : v;
            if (k.includes('date') && typeof parsed[k] === 'string')
                parsed[k] = +new Date(parsed[k]);
        });
        defaultFields.value = parsed;
        assignRefNo(data.ref_no);
    }
    catch (e) {
        message.error(e?.response?.data?.error || 'Failed to load form schema');
        defaultFields.value = {};
        assignRefNo(null);
    }
    finally {
        refNoLoading.value = false;
    }
};
const fetchTransactions = async () => {
    loading.value = true;
    try {
        const params = { transaction_type: transactionType.value };
        if (dateRange.value) {
            const [start, end] = dateRange.value;
            params.start_date = new Date(start).toISOString().split('T')[0];
            params.end_date = new Date(end).toISOString().split('T')[0];
        }
        const res = await api.get(`/api/transactions/${transactionType.value}`, { params });
        transactions.value = res.data.transactions || [];
        pagination.itemCount = transactions.value.length;
    }
    catch (e) {
        message.error(e?.response?.data?.error || 'Failed to fetch transactions');
        transactions.value = [];
    }
    finally {
        loading.value = false;
    }
};
// ---- FORM HANDLERS ----
const handleEntityTypeChange = async (value) => {
    form.entity_type = value;
    form.entity_id = null;
    form.pay_type = null;
    form.mode = null;
    if (value !== 'others')
        await loadEntities(value, 'default');
    else
        entityOptions.value = [];
};
const handleRefundEntityChange = async (value, dir) => {
    const prefix = dir === 'to' ? 'to_' : 'from_';
    form[`${prefix}entity_type`] = value;
    form[`${prefix}entity_id`] = null;
    form.credit_to_account = false;
    form.deduct_from_account = false;
    form.mode_for_from = null;
    form.mode_for_to = null;
    if (value !== 'others')
        await loadEntities(value, dir);
    else if (dir === 'from')
        fromEntityOptions.value = [];
    else if (dir === 'to')
        toEntityOptions.value = [];
};
const handlePaymentTypeChange = (value) => {
    if (value === 'cash_withdrawal' && form.entity_type === 'agent') {
        message.warning('Cash withdrawal not available for agents');
        form.pay_type = null;
    }
};
const handleToggleValueChange = (value) => {
    if (transactionType.value === 'payment') {
        form.deduct_from_account = value;
    }
    else {
        form.credit_to_account = value;
    }
};
// ---- MODAL & SUBMIT ----
const openAddModal = async (row = null) => {
    resetForm();
    editingId.value = row?.id || null;
    fieldErrors.value = {};
    if (row) {
        Object.assign(form, row, row.extra_data || {});
        if (row.timestamp)
            form.transaction_date = row.timestamp;
        else if (row.date)
            form.transaction_date = +new Date(row.date);
        assignRefNo(row.ref_no);
        if (transactionType.value === 'refund') {
            await loadParticulars();
            const entType = form.refund_direction === 'incoming' ? form.from_entity_type : form.to_entity_type;
            if (entType && entType !== 'others') {
                if (form.refund_direction === 'incoming')
                    await loadEntities(entType, 'from');
                else
                    await loadEntities(entType, 'to');
            }
            entityOptionsReady.value = true;
        }
    }
    else {
        Object.entries(defaultFields.value).forEach(([k, v]) => {
            form[k] = (typeof v === 'object' && v && 'value' in v) ? v.value : v;
        });
        assignRefNo(null);
        try {
            const res = await api.get(`/api/transactions/${transactionType.value}?mode=form`);
            assignRefNo(res.data.ref_no);
        }
        catch { }
    }
    await loadParticulars();
    if (transactionType.value === 'wallet_transfer') {
        if (form.from_entity_type && form.from_entity_type !== 'others')
            await loadEntities(form.from_entity_type, 'from');
        if (form.to_entity_type && form.to_entity_type !== 'others')
            await loadEntities(form.to_entity_type, 'to');
    }
    else if (form.entity_type && form.entity_type !== 'others') {
        await loadEntities(form.entity_type, 'default');
    }
    entityOptionsReady.value = true;
    modalVisible.value = true;
};
const closeModal = () => {
    modalVisible.value = false;
    editingId.value = null;
};
const getRefundEntityDetails = () => {
    const incoming = form.refund_direction === 'incoming';
    const entType = incoming ? form.from_entity_type : form.to_entity_type;
    const entId = entType === 'others' ? null : (incoming ? form.from_entity_id : form.to_entity_id);
    return { entity_type: entType, entity_id: entId };
};
const validateAndSubmit = async () => {
    try {
        await formRef.value?.validate();
        if (form.amount == null || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
            message.error('Amount must be a positive number');
            return;
        }
        // Company balance check
        let newBalance = modeBalance.value;
        if (newBalance !== null && form.amount) {
            let delta = 0;
            if (transactionType.value === 'payment')
                delta = -form.amount;
            if (transactionType.value === 'receipt')
                delta = +form.amount;
            if (transactionType.value === 'refund' && form.refund_direction === 'outgoing')
                delta = -form.amount;
            if (transactionType.value === 'refund' && form.refund_direction === 'incoming')
                delta = +form.amount;
            newBalance += delta;
            if (newBalance < 0 && !confirm(`This transaction will make company account negative (₹${newBalance.toFixed(2)}). Proceed anyway?`)) {
                return;
            }
        }
        await submitTransaction();
    }
    catch (errors) {
        console.log('Form validation failed', errors);
    }
};
const submitTransaction = async () => {
    try {
        fieldErrors.value = {};
        await formRef.value?.validate();
        if (form.amount == null || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
            message.error('Amount must be a positive number');
            return;
        }
        const payload = {
            ...form,
            transaction_type: transactionType.value,
            pay_type: transactionType.value === 'refund' ? 'refund' : form.pay_type,
            credit_to_account: !!form.credit_to_account,
            deduct_from_account: !!form.deduct_from_account
        };
        // Refund specific
        if (transactionType.value === 'refund') {
            Object.assign(payload, getRefundEntityDetails());
            payload.mode = form.refund_direction === 'incoming' ? form.mode_for_from : form.mode_for_to;
        }
        if (editingId.value) {
            await api.put(`/api/transactions/${editingId.value}`, payload);
            message.success('Transaction updated');
        }
        else {
            await api.post(`/api/transactions/${transactionType.value}`, payload);
            message.success('Transaction added');
        }
        modalVisible.value = false;
        editingId.value = null;
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
// Unified export function
const exportTransactions = async (format) => {
    exporting.value = true;
    try {
        const params = { export: format };
        if (dateRange.value) {
            const [start, end] = dateRange.value;
            params.start_date = new Date(start).toISOString().split('T')[0];
            params.end_date = new Date(end).toISOString().split('T')[0];
        }
        const response = await api.get(`/api/transactions/${transactionType.value}`, {
            params,
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const extension = format === 'excel' ? 'xlsx' : 'pdf';
        link.setAttribute('download', `${transactionType.value}_transactions_${new Date().toISOString().slice(0, 10)}.${extension}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    catch (e) {
        // Improved error handling
        let errorMsg = e?.response?.data?.error || e.message;
        if (e.response?.data instanceof Blob) {
            const text = await e.response.data.text();
            try {
                const json = JSON.parse(text);
                errorMsg = json.error || text;
            }
            catch {
                errorMsg = text;
            }
        }
        message.error(`${format.toUpperCase()} export failed: ${errorMsg}`);
    }
    finally {
        exporting.value = false;
    }
};
// ---- DATA-TABLE ----
const columns = computed(() => {
    const baseColumns = [
        { title: 'Ref No', key: 'ref_no' },
        { title: 'Date', key: 'date', render: (row) => new Date(row.date).toLocaleDateString() },
    ];
    // Add refund direction for refunds after date
    if (transactionType.value === 'refund') {
        baseColumns.push({
            title: 'Direction',
            key: 'refund_direction',
            render: (row) => row.refund_direction ? toSentenceCase(row.refund_direction) : ''
        });
    }
    // Add wallet transfer specific columns
    if (transactionType.value === 'wallet_transfer') {
        baseColumns.push({
            title: 'Transfer Direction',
            key: 'transfer_direction',
            render: (row) => {
                const fromType = row.from_entity_type || row.extra_data?.from_entity_type || '';
                const toType = row.to_entity_type || row.extra_data?.to_entity_type || '';
                return `${toSentenceCase(fromType)} → ${toSentenceCase(toType)}`;
            }
        }, {
            title: 'From Entity',
            key: 'from_entity_name',
            render: (row) => row.from_entity_name || row.extra_data?.from_entity_name || '-'
        }, {
            title: 'To Entity',
            key: 'to_entity_name',
            render: (row) => row.to_entity_name || row.extra_data?.to_entity_name || '-'
        });
    }
    else {
        // For non-wallet transfers
        baseColumns.push({ title: 'Entity Type', key: 'entity_type', render: (row) => toSentenceCase(row.entity_type || '') }, { title: 'Entity Name', key: 'entity_name' });
    }
    // Common columns
    baseColumns.push({ title: 'Particular', key: 'particular_name' });
    // Add payment type and mode only for non-wallet transfers
    if (transactionType.value !== 'wallet_transfer') {
        baseColumns.push({
            title: 'Payment Type',
            key: 'pay_type',
            render: (row) => row.pay_type ? toSentenceCase(row.pay_type) : ''
        }, { title: 'Mode', key: 'mode', render: (row) => toSentenceCase(row.mode || '') });
    }
    // Amount and description always shown
    baseColumns.push({ title: 'Amount', key: 'amount' }, { title: 'Description', key: 'description' });
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
    return [...baseColumns, actions];
});
// ---- WATCHERS ----
watch(() => route.query.type, async (type) => {
    if (typeof type === 'string' && tabs.includes(type)) {
        transactionType.value = type;
        await fetchSchema();
        await fetchTransactions();
    }
}, { immediate: true });
watch(() => form.refund_direction, (newDir) => {
    if (transactionType.value === 'refund') {
        form.mode_for_from = null;
        form.mode_for_to = null;
        form.credit_to_account = false;
        form.deduct_from_account = false;
        if (newDir === 'incoming' && form.from_entity_type)
            loadEntities(form.from_entity_type, 'from');
        else if (newDir === 'outgoing' && form.to_entity_type)
            loadEntities(form.to_entity_type, 'to');
    }
});
watch(() => [form.from_entity_type, form.to_entity_type], () => {
    if (transactionType.value === 'refund') {
        nextTick(() => {
            if (form.refund_direction === 'incoming' && form.mode_for_from)
                form.mode_for_from = form.mode_for_from;
        });
    }
});
watch(dateRange, fetchTransactions);
// ---- LIFECYCLE ----
onMounted(async () => {
    dateRange.value = defaultDateRange.value;
    const typeParam = route.query.type;
    transactionType.value = tabs.includes(typeParam) ? typeParam : 'payment';
    await fetchSchema();
    await fetchTransactions();
    await loadParticulars();
    if (form.entity_type && form.entity_type !== 'others') {
        await loadEntities(form.entity_type, 'default');
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
    ...{ class: "table-controls" },
    justify: "space-between",
}));
const __VLS_23 = __VLS_22({
    ...{ class: "table-controls" },
    justify: "space-between",
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_24.slots.default;
const __VLS_25 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({}));
const __VLS_27 = __VLS_26({}, ...__VLS_functionalComponentArgsRest(__VLS_26));
__VLS_28.slots.default;
const __VLS_29 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
    ...{ class: "search-filter" },
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search",
    clearable: true,
}));
const __VLS_31 = __VLS_30({
    ...{ class: "search-filter" },
    value: (__VLS_ctx.searchQuery),
    placeholder: "Search",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
const __VLS_33 = {}.NDatePicker;
/** @type {[typeof __VLS_components.NDatePicker, typeof __VLS_components.nDatePicker, ]} */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    ...{ class: "date-filter" },
    value: (__VLS_ctx.dateRange),
    type: "daterange",
    clearable: true,
    defaultValue: (__VLS_ctx.defaultDateRange),
    ...{ style: {} },
}));
const __VLS_35 = __VLS_34({
    ...{ class: "date-filter" },
    value: (__VLS_ctx.dateRange),
    type: "daterange",
    clearable: true,
    defaultValue: (__VLS_ctx.defaultDateRange),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
const __VLS_37 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
    ...{ class: "export-buttons" },
}));
const __VLS_39 = __VLS_38({
    ...{ class: "export-buttons" },
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
__VLS_40.slots.default;
const __VLS_41 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
    loading: (__VLS_ctx.exporting),
}));
const __VLS_43 = __VLS_42({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
    loading: (__VLS_ctx.exporting),
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
let __VLS_45;
let __VLS_46;
let __VLS_47;
const __VLS_48 = {
    onClick: (...[$event]) => {
        __VLS_ctx.exportTransactions('excel');
    }
};
__VLS_44.slots.default;
{
    const { icon: __VLS_thisSlot } = __VLS_44.slots;
    const __VLS_49 = {}.NIcon;
    /** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
    // @ts-ignore
    const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({}));
    const __VLS_51 = __VLS_50({}, ...__VLS_functionalComponentArgsRest(__VLS_50));
    __VLS_52.slots.default;
    const __VLS_53 = {}.DocumentTextOutline;
    /** @type {[typeof __VLS_components.DocumentTextOutline, ]} */ ;
    // @ts-ignore
    const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({}));
    const __VLS_55 = __VLS_54({}, ...__VLS_functionalComponentArgsRest(__VLS_54));
    var __VLS_52;
}
var __VLS_44;
const __VLS_57 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
    loading: (__VLS_ctx.exporting),
}));
const __VLS_59 = __VLS_58({
    ...{ 'onClick': {} },
    type: "primary",
    secondary: true,
    loading: (__VLS_ctx.exporting),
}, ...__VLS_functionalComponentArgsRest(__VLS_58));
let __VLS_61;
let __VLS_62;
let __VLS_63;
const __VLS_64 = {
    onClick: (...[$event]) => {
        __VLS_ctx.exportTransactions('pdf');
    }
};
__VLS_60.slots.default;
{
    const { icon: __VLS_thisSlot } = __VLS_60.slots;
    const __VLS_65 = {}.NIcon;
    /** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
    // @ts-ignore
    const __VLS_66 = __VLS_asFunctionalComponent(__VLS_65, new __VLS_65({}));
    const __VLS_67 = __VLS_66({}, ...__VLS_functionalComponentArgsRest(__VLS_66));
    __VLS_68.slots.default;
    const __VLS_69 = {}.DocumentTextOutline;
    /** @type {[typeof __VLS_components.DocumentTextOutline, ]} */ ;
    // @ts-ignore
    const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({}));
    const __VLS_71 = __VLS_70({}, ...__VLS_functionalComponentArgsRest(__VLS_70));
    var __VLS_68;
}
var __VLS_60;
var __VLS_40;
var __VLS_28;
const __VLS_73 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_75 = __VLS_74({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
let __VLS_77;
let __VLS_78;
let __VLS_79;
const __VLS_80 = {
    onClick: (__VLS_ctx.openAddModal)
};
__VLS_76.slots.default;
(__VLS_ctx.toSentenceCase(__VLS_ctx.transactionType));
var __VLS_76;
var __VLS_24;
const __VLS_81 = {}.NDataTable;
/** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
// @ts-ignore
const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
    columns: (__VLS_ctx.columns),
    data: (__VLS_ctx.paginatedTransactions),
    loading: (__VLS_ctx.loading),
    striped: true,
    pagination: (__VLS_ctx.pagination),
}));
const __VLS_83 = __VLS_82({
    columns: (__VLS_ctx.columns),
    data: (__VLS_ctx.paginatedTransactions),
    loading: (__VLS_ctx.loading),
    striped: true,
    pagination: (__VLS_ctx.pagination),
}, ...__VLS_functionalComponentArgsRest(__VLS_82));
const __VLS_85 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
    show: (__VLS_ctx.modalVisible),
    title: (__VLS_ctx.modalTitle),
    ...{ class: "transaction-modal" },
    preset: "card",
    ...{ style: {} },
}));
const __VLS_87 = __VLS_86({
    show: (__VLS_ctx.modalVisible),
    title: (__VLS_ctx.modalTitle),
    ...{ class: "transaction-modal" },
    preset: "card",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_86));
__VLS_88.slots.default;
const __VLS_89 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
    ...{ class: "modal-card" },
}));
const __VLS_91 = __VLS_90({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_90));
__VLS_92.slots.default;
const __VLS_93 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.formRules),
}));
const __VLS_95 = __VLS_94({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.formRules),
}, ...__VLS_functionalComponentArgsRest(__VLS_94));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_97 = {};
__VLS_96.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "responsive-form-grid" },
});
const __VLS_99 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
    label: "Reference No",
}));
const __VLS_101 = __VLS_100({
    label: "Reference No",
}, ...__VLS_functionalComponentArgsRest(__VLS_100));
__VLS_102.slots.default;
const __VLS_103 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
    value: (__VLS_ctx.form.ref_no),
    disabled: true,
}));
const __VLS_105 = __VLS_104({
    value: (__VLS_ctx.form.ref_no),
    disabled: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_104));
var __VLS_102;
const __VLS_107 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
    label: "Date",
    prop: "transaction_date",
}));
const __VLS_109 = __VLS_108({
    label: "Date",
    prop: "transaction_date",
}, ...__VLS_functionalComponentArgsRest(__VLS_108));
__VLS_110.slots.default;
const __VLS_111 = {}.NDatePicker;
/** @type {[typeof __VLS_components.NDatePicker, typeof __VLS_components.nDatePicker, ]} */ ;
// @ts-ignore
const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
    value: (__VLS_ctx.form.transaction_date),
    type: "datetime",
    clearable: true,
}));
const __VLS_113 = __VLS_112({
    value: (__VLS_ctx.form.transaction_date),
    type: "datetime",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_112));
var __VLS_110;
if (__VLS_ctx.transactionType === 'payment' || __VLS_ctx.transactionType === 'receipt') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-section" },
    });
    /** @type {[typeof PaymentFormSection, ]} */ ;
    // @ts-ignore
    const __VLS_115 = __VLS_asFunctionalComponent(PaymentFormSection, new PaymentFormSection({
        ...{ 'onEntityTypeChange': {} },
        ...{ 'onPaymentTypeChange': {} },
        ...{ 'onFetchCompanyBalance': {} },
        ...{ 'onToggleValueChange': {} },
        form: (__VLS_ctx.form),
        transactionType: (__VLS_ctx.transactionType),
        entityTypeOptions: (__VLS_ctx.entityTypeOptions),
        entityOptions: (__VLS_ctx.entityOptions),
        entitiesLoading: (__VLS_ctx.entitiesLoading),
        selectedEntity: (__VLS_ctx.selectedEntity),
        particularOptions: (__VLS_ctx.particularOptions),
        particularsLoading: (__VLS_ctx.particularsLoading),
        payTypeOptions: (__VLS_ctx.payTypeOptions),
        nonRefundModeOptions: (__VLS_ctx.nonRefundModeOptions),
        showWalletToggle: (__VLS_ctx.showWalletToggle),
        walletToggleDisabled: (__VLS_ctx.walletToggleDisabled),
        toggleValue: (__VLS_ctx.toggleValue),
        toggleLabel: (__VLS_ctx.toggleLabel),
    }));
    const __VLS_116 = __VLS_115({
        ...{ 'onEntityTypeChange': {} },
        ...{ 'onPaymentTypeChange': {} },
        ...{ 'onFetchCompanyBalance': {} },
        ...{ 'onToggleValueChange': {} },
        form: (__VLS_ctx.form),
        transactionType: (__VLS_ctx.transactionType),
        entityTypeOptions: (__VLS_ctx.entityTypeOptions),
        entityOptions: (__VLS_ctx.entityOptions),
        entitiesLoading: (__VLS_ctx.entitiesLoading),
        selectedEntity: (__VLS_ctx.selectedEntity),
        particularOptions: (__VLS_ctx.particularOptions),
        particularsLoading: (__VLS_ctx.particularsLoading),
        payTypeOptions: (__VLS_ctx.payTypeOptions),
        nonRefundModeOptions: (__VLS_ctx.nonRefundModeOptions),
        showWalletToggle: (__VLS_ctx.showWalletToggle),
        walletToggleDisabled: (__VLS_ctx.walletToggleDisabled),
        toggleValue: (__VLS_ctx.toggleValue),
        toggleLabel: (__VLS_ctx.toggleLabel),
    }, ...__VLS_functionalComponentArgsRest(__VLS_115));
    let __VLS_118;
    let __VLS_119;
    let __VLS_120;
    const __VLS_121 = {
        onEntityTypeChange: (__VLS_ctx.handleEntityTypeChange)
    };
    const __VLS_122 = {
        onPaymentTypeChange: (__VLS_ctx.handlePaymentTypeChange)
    };
    const __VLS_123 = {
        onFetchCompanyBalance: (__VLS_ctx.fetchCompanyBalance)
    };
    const __VLS_124 = {
        onToggleValueChange: (__VLS_ctx.handleToggleValueChange)
    };
    var __VLS_117;
}
else if (__VLS_ctx.transactionType === 'refund') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-section" },
    });
    /** @type {[typeof RefundFormSection, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(RefundFormSection, new RefundFormSection({
        ...{ 'onRefundEntityChange': {} },
        form: (__VLS_ctx.form),
        entityTypeOptions: (__VLS_ctx.entityTypeOptions),
        refundDirectionOptions: (__VLS_ctx.refundDirectionOptions),
        companyModeOptions: (__VLS_ctx.companyModeOptions),
        fromEntityOptions: (__VLS_ctx.fromEntityOptions),
        toEntityOptions: (__VLS_ctx.toEntityOptions),
        fromEntitiesLoading: (__VLS_ctx.fromEntitiesLoading),
        toEntitiesLoading: (__VLS_ctx.toEntitiesLoading),
        selectedFromEntity: (__VLS_ctx.selectedFromEntity),
        selectedToEntity: (__VLS_ctx.selectedToEntity),
        particularOptions: (__VLS_ctx.particularOptions),
        particularsLoading: (__VLS_ctx.particularsLoading),
        companyRefundFromModeOptions: (__VLS_ctx.companyRefundFromModeOptions),
        modeBalance: (__VLS_ctx.modeBalance),
        entityOptionsReady: (__VLS_ctx.entityOptionsReady),
    }));
    const __VLS_126 = __VLS_125({
        ...{ 'onRefundEntityChange': {} },
        form: (__VLS_ctx.form),
        entityTypeOptions: (__VLS_ctx.entityTypeOptions),
        refundDirectionOptions: (__VLS_ctx.refundDirectionOptions),
        companyModeOptions: (__VLS_ctx.companyModeOptions),
        fromEntityOptions: (__VLS_ctx.fromEntityOptions),
        toEntityOptions: (__VLS_ctx.toEntityOptions),
        fromEntitiesLoading: (__VLS_ctx.fromEntitiesLoading),
        toEntitiesLoading: (__VLS_ctx.toEntitiesLoading),
        selectedFromEntity: (__VLS_ctx.selectedFromEntity),
        selectedToEntity: (__VLS_ctx.selectedToEntity),
        particularOptions: (__VLS_ctx.particularOptions),
        particularsLoading: (__VLS_ctx.particularsLoading),
        companyRefundFromModeOptions: (__VLS_ctx.companyRefundFromModeOptions),
        modeBalance: (__VLS_ctx.modeBalance),
        entityOptionsReady: (__VLS_ctx.entityOptionsReady),
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    let __VLS_128;
    let __VLS_129;
    let __VLS_130;
    const __VLS_131 = {
        onRefundEntityChange: (__VLS_ctx.handleRefundEntityChange)
    };
    var __VLS_127;
}
else if (__VLS_ctx.transactionType === 'wallet_transfer') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-section" },
    });
    /** @type {[typeof WalletTransferFormSection, ]} */ ;
    // @ts-ignore
    const __VLS_132 = __VLS_asFunctionalComponent(WalletTransferFormSection, new WalletTransferFormSection({
        ...{ 'onRefundEntityChange': {} },
        form: (__VLS_ctx.form),
        entityTypeOptions: (__VLS_ctx.entityTypeOptions),
        fromEntityOptions: (__VLS_ctx.fromEntityOptions),
        toEntityOptions: (__VLS_ctx.toEntityOptions),
        fromEntitiesLoading: (__VLS_ctx.fromEntitiesLoading),
        toEntitiesLoading: (__VLS_ctx.toEntitiesLoading),
        selectedFromEntity: (__VLS_ctx.selectedFromEntity),
        selectedToEntity: (__VLS_ctx.selectedToEntity),
        particularOptions: (__VLS_ctx.particularOptions),
        particularsLoading: (__VLS_ctx.particularsLoading),
    }));
    const __VLS_133 = __VLS_132({
        ...{ 'onRefundEntityChange': {} },
        form: (__VLS_ctx.form),
        entityTypeOptions: (__VLS_ctx.entityTypeOptions),
        fromEntityOptions: (__VLS_ctx.fromEntityOptions),
        toEntityOptions: (__VLS_ctx.toEntityOptions),
        fromEntitiesLoading: (__VLS_ctx.fromEntitiesLoading),
        toEntitiesLoading: (__VLS_ctx.toEntitiesLoading),
        selectedFromEntity: (__VLS_ctx.selectedFromEntity),
        selectedToEntity: (__VLS_ctx.selectedToEntity),
        particularOptions: (__VLS_ctx.particularOptions),
        particularsLoading: (__VLS_ctx.particularsLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_132));
    let __VLS_135;
    let __VLS_136;
    let __VLS_137;
    const __VLS_138 = {
        onRefundEntityChange: (__VLS_ctx.handleRefundEntityChange)
    };
    var __VLS_134;
}
const __VLS_139 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
    label: "Amount",
    prop: "amount",
}));
const __VLS_141 = __VLS_140({
    label: "Amount",
    prop: "amount",
}, ...__VLS_functionalComponentArgsRest(__VLS_140));
__VLS_142.slots.default;
const __VLS_143 = {}.NInputNumber;
/** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
// @ts-ignore
const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
    value: (__VLS_ctx.form.amount),
    min: (0),
    step: (0.01),
    clearable: true,
    ...{ style: {} },
}));
const __VLS_145 = __VLS_144({
    value: (__VLS_ctx.form.amount),
    min: (0),
    step: (0.01),
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_144));
var __VLS_142;
const __VLS_147 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
    label: "Description",
    prop: "description",
}));
const __VLS_149 = __VLS_148({
    label: "Description",
    prop: "description",
}, ...__VLS_functionalComponentArgsRest(__VLS_148));
__VLS_150.slots.default;
const __VLS_151 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
    value: (__VLS_ctx.form.description),
    type: "textarea",
}));
const __VLS_153 = __VLS_152({
    value: (__VLS_ctx.form.description),
    type: "textarea",
}, ...__VLS_functionalComponentArgsRest(__VLS_152));
var __VLS_150;
var __VLS_96;
{
    const { footer: __VLS_thisSlot } = __VLS_92.slots;
    if (__VLS_ctx.form.mode && __VLS_ctx.modeBalance !== null && __VLS_ctx.transactionType !== 'wallet_transfer') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_155 = {}.NH5;
        /** @type {[typeof __VLS_components.NH5, typeof __VLS_components.nH5, typeof __VLS_components.NH5, typeof __VLS_components.nH5, ]} */ ;
        // @ts-ignore
        const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({}));
        const __VLS_157 = __VLS_156({}, ...__VLS_functionalComponentArgsRest(__VLS_156));
        __VLS_158.slots.default;
        var __VLS_158;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.form.mode);
        (__VLS_ctx.modeBalance.toFixed(2));
    }
    const __VLS_159 = {}.NSpace;
    /** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
    // @ts-ignore
    const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
        justify: "end",
    }));
    const __VLS_161 = __VLS_160({
        justify: "end",
    }, ...__VLS_functionalComponentArgsRest(__VLS_160));
    __VLS_162.slots.default;
    const __VLS_163 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
        ...{ 'onClick': {} },
    }));
    const __VLS_165 = __VLS_164({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_164));
    let __VLS_167;
    let __VLS_168;
    let __VLS_169;
    const __VLS_170 = {
        onClick: (__VLS_ctx.closeModal)
    };
    __VLS_166.slots.default;
    var __VLS_166;
    const __VLS_171 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_173 = __VLS_172({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_172));
    let __VLS_175;
    let __VLS_176;
    let __VLS_177;
    const __VLS_178 = {
        onClick: (__VLS_ctx.validateAndSubmit)
    };
    __VLS_174.slots.default;
    var __VLS_174;
    var __VLS_162;
}
var __VLS_92;
var __VLS_88;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['table-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['search-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['date-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['export-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['transaction-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['responsive-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section']} */ ;
// @ts-ignore
var __VLS_98 = __VLS_97;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NSpace: NSpace,
            NForm: NForm,
            NFormItem: NFormItem,
            NInput: NInput,
            NInputNumber: NInputNumber,
            NDataTable: NDataTable,
            NModal: NModal,
            NCard: NCard,
            NTabs: NTabs,
            NTabPane: NTabPane,
            NIcon: NIcon,
            NDatePicker: NDatePicker,
            NH2: NH2,
            NH5: NH5,
            DocumentTextOutline: DocumentTextOutline,
            PaymentFormSection: PaymentFormSection,
            RefundFormSection: RefundFormSection,
            WalletTransferFormSection: WalletTransferFormSection,
            tabs: tabs,
            transactionType: transactionType,
            searchQuery: searchQuery,
            loading: loading,
            exporting: exporting,
            formRef: formRef,
            modalVisible: modalVisible,
            modeBalance: modeBalance,
            dateRange: dateRange,
            entitiesLoading: entitiesLoading,
            fromEntitiesLoading: fromEntitiesLoading,
            toEntitiesLoading: toEntitiesLoading,
            particularsLoading: particularsLoading,
            entityOptions: entityOptions,
            fromEntityOptions: fromEntityOptions,
            toEntityOptions: toEntityOptions,
            entityOptionsReady: entityOptionsReady,
            pagination: pagination,
            defaultDateRange: defaultDateRange,
            entityTypeOptions: entityTypeOptions,
            refundDirectionOptions: refundDirectionOptions,
            companyModeOptions: companyModeOptions,
            nonRefundModeOptions: nonRefundModeOptions,
            onTabChange: onTabChange,
            form: form,
            toSentenceCase: toSentenceCase,
            selectedEntity: selectedEntity,
            selectedFromEntity: selectedFromEntity,
            selectedToEntity: selectedToEntity,
            modalTitle: modalTitle,
            particularOptions: particularOptions,
            paginatedTransactions: paginatedTransactions,
            companyRefundFromModeOptions: companyRefundFromModeOptions,
            payTypeOptions: payTypeOptions,
            showWalletToggle: showWalletToggle,
            walletToggleDisabled: walletToggleDisabled,
            toggleValue: toggleValue,
            toggleLabel: toggleLabel,
            formRules: formRules,
            fetchCompanyBalance: fetchCompanyBalance,
            handleEntityTypeChange: handleEntityTypeChange,
            handleRefundEntityChange: handleRefundEntityChange,
            handlePaymentTypeChange: handlePaymentTypeChange,
            handleToggleValueChange: handleToggleValueChange,
            openAddModal: openAddModal,
            closeModal: closeModal,
            validateAndSubmit: validateAndSubmit,
            exportTransactions: exportTransactions,
            columns: columns,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=TransactionPage.vue.js.map