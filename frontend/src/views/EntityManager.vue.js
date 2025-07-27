import { ref, watch, onMounted, h } from 'vue';
import api from '@/api';
import { useMessage, NButton, NForm, NFormItem, NInput, NInputNumber, NSpace, NDataTable, NModal, NCard, NTabs, NTabPane, } from 'naive-ui';
import PermissionWrapper from '@/components/PermissionWrapper.vue';
const message = useMessage();
const entityTypes = ['customer', 'passenger', 'agent', 'partner', 'travel_location', 'particular'];
const activeTab = ref('customer');
const subTab = ref('active');
const searchQuery = ref('');
const data = ref([]);
const columns = ref([]);
const loading = ref(false);
const bulkAddMode = ref(false);
const formRef = ref(null);
const fieldErrors = ref({});
const formRules = computed(() => {
    const entity = activeTab.value;
    const rules = {};
    Object.entries(defaultFieldsByEntity[entity]).forEach(([key, defaultValue]) => {
        if (typeof defaultValue === 'boolean')
            return;
        if (editMode.value && shouldDisableFieldInEdit(key))
            return;
        if (key === 'name') { // Keep only essential rule
            rules[key] = [{
                    required: true,
                    message: `${toSentenceCase(key)} is required`,
                    trigger: ['input', 'blur']
                }];
        }
    });
    return rules;
});
const modalVisible = ref(false);
const editMode = ref(false);
const currentForm = ref({});
const customerOptions = ref([]);
const customFieldLabels = {
    customer_id: 'Customer',
    is_active: 'Active', // if needed
    travel_location: 'Travel Location'
};
const defaultFieldsByEntity = {
    customer: { name: '', email: '', contact: '', wallet_balance: 0, credit_limit: 0, credit_used: 0, active: true },
    agent: { name: '', contact: '', wallet_balance: 0, credit_limit: 0, credit_balance: 0, active: true },
    partner: { name: '', contact: '', wallet_balance: 0, active: true, allow_negative_wallet: false },
    passenger: { name: '', contact: '', customer_id: '', passport_number: '', active: true },
    travel_location: { name: '', active: true },
    particular: { name: '', active: true }
};
const openAddModal = () => {
    fieldErrors.value = {};
    currentForm.value = { ...defaultFieldsByEntity[activeTab.value] };
    modalVisible.value = true;
    editMode.value = false;
    bulkAddMode.value = false;
    // Reset validation state
    nextTick(() => {
        formRef.value?.restoreValidation?.();
    });
};
const shouldDisableFieldInEdit = (key) => {
    if (!editMode.value)
        return false;
    const entity = activeTab.value;
    if (entity === 'customer' && ['wallet_balance', 'credit_used'].includes(key))
        return true;
    if (entity === 'agent' && ['wallet_balance', 'credit_balance'].includes(key))
        return true;
    return false;
};
const updateEntityStatus = async (id, status) => {
    try {
        await api.patch(`/api/manage/${activeTab.value}`, { id, active: status });
        message.success(`Status updated`);
        await fetchData();
    }
    catch (e) {
        handleApiError(e);
    }
};
const toSentenceCase = (s) => {
    return customFieldLabels[s] || s.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
};
const filteredData = computed(() => {
    let d = [...data.value];
    if (['customer', 'agent', 'partner', 'passenger', 'travel_location', 'particular'].includes(activeTab.value)) {
        d = d.filter(row => row.active === (subTab.value === 'active'));
    }
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        d = d.filter(row => (row.name?.toLowerCase().includes(q) || row.contact?.toLowerCase?.().includes(q) || row.customer_name?.toLowerCase()?.includes(q)));
    }
    return d;
});
const fetchData = async () => {
    if (activeTab.value === 'passenger') {
        const res = await api.get('/api/manage/customer');
        customerOptions.value = res.data.map((c) => ({
            label: c.name,
            value: c.id
        }));
    }
    loading.value = true;
    try {
        const res = await api.get(`/api/manage/${activeTab.value}`);
        data.value = res.data;
        let keys = Object.keys(defaultFieldsByEntity[activeTab.value]);
        if (activeTab.value === 'passenger') {
            keys = keys.filter(k => k !== 'customer_id'); // hide raw ID column
        }
        const baseColumns = keys.map(key => {
            const column = {
                title: toSentenceCase(key),
                key,
                sortable: false
            };
            // Enable sorting for specific fields
            if (key === 'name') {
                column.sortable = true;
                column.sorter = (a, b) => a.name.localeCompare(b.name);
            }
            else if (['wallet_balance', 'credit_used', 'credit_limit', 'credit_balance'].includes(key)) {
                column.sortable = true;
                column.sorter = (a, b) => (a[key] ?? 0) - (b[key] ?? 0);
            }
            return column;
        });
        // 👇 Inject 'Customer' column at the beginning for passenger tab
        if (activeTab.value === 'passenger') {
            baseColumns.unshift({
                title: 'Customer',
                key: 'customer_name',
                sortable: true,
                sorter: (a, b) => (a.customer_name ?? '').localeCompare(b.customer_name ?? '')
            });
        }
        columns.value = [
            ...baseColumns,
            {
                title: 'Actions',
                key: 'actions',
                render(row) {
                    return h(NSpace, { size: 12 }, {
                        default: () => [
                            h(PermissionWrapper, { resource: activeTab.value, operation: 'write' }, {
                                default: () => h(NButton, {
                                    size: 'small',
                                    onClick: () => {
                                        currentForm.value = { ...defaultFieldsByEntity[activeTab.value], ...row };
                                        editMode.value = true;
                                        modalVisible.value = true;
                                    }
                                }, { default: () => 'Edit' })
                            }),
                            h(PermissionWrapper, { resource: activeTab.value, operation: 'write' }, {
                                default: () => h(NButton, {
                                    size: 'small',
                                    type: 'error',
                                    disabled: Boolean(row.has_passenger || row.has_tickets || row.has_transactions),
                                    onClick: () => {
                                        window.confirm('Are you sure you want to delete this entry?') && deleteEntity(row.id);
                                    }
                                }, { default: () => 'Delete' })
                            }),
                            h(NButton, {
                                size: 'small',
                                type: row.active ? 'warning' : 'success',
                                onClick: () => {
                                    const action = row.active ? 'deactivate' : 'activate';
                                    if (window.confirm(`Are you sure you want to ${action} this?`)) {
                                        updateEntityStatus(row.id, !row.active);
                                    }
                                }
                            }, { default: () => row.active ? 'Deactivate' : 'Activate' })
                        ]
                    });
                }
            }
        ];
    }
    catch (e) {
        message.error(e.response?.data?.error || `Failed to load ${activeTab.value}`);
    }
    finally {
        loading.value = false;
    }
};
const addEntity = async () => {
    try {
        await api.post(`/api/manage/${activeTab.value}`, currentForm.value);
        message.success(`${toSentenceCase(activeTab.value)} added`);
        modalVisible.value = false;
        await fetchData();
    }
    catch (e) {
        if (e?.response?.data?.field_errors) {
            fieldErrors.value = e.response.data.field_errors;
        }
        else {
            handleApiError(e);
        }
    }
};
const updateEntity = async () => {
    try {
        fieldErrors.value = {};
        // Validate before updating
        await api.patch(`/api/manage/${activeTab.value}`, currentForm.value);
        message.success(`${toSentenceCase(activeTab.value)} updated`);
        modalVisible.value = false;
        await fetchData();
    }
    catch (e) {
        if (e?.response?.data?.field_errors) {
            fieldErrors.value = e.response.data.field_errors;
        }
        else {
            handleApiError(e);
        }
    }
};
const handleBulkAdd = async () => {
    try {
        fieldErrors.value = {};
        await api.post(`/api/manage/${activeTab.value}`, currentForm.value);
        message.success(`${toSentenceCase(activeTab.value)} added`);
        await fetchData();
        const preservedCustomerId = currentForm.value.customer_id;
        currentForm.value = { ...defaultFieldsByEntity[activeTab.value] };
        // Retain customer_id for passenger bulk addition
        if (activeTab.value === 'passenger') {
            currentForm.value.customer_id = preservedCustomerId;
        }
        // Reset validation for next entry
        nextTick(() => {
            formRef.value?.restoreValidation();
        });
    }
    catch (e) {
        if (e?.response?.data?.field_errors) {
            fieldErrors.value = e.response.data.field_errors;
        }
        else {
            handleApiError(e);
        }
    }
};
const deleteEntity = async (id) => {
    try {
        await api.delete(`/api/manage/${activeTab.value}?id=${id}`);
        message.success(`${toSentenceCase(activeTab.value)} deleted`);
        await fetchData();
    }
    catch (e) {
        message.error(e.response?.data?.error || `Failed to delete ${activeTab.value}`);
    }
};
const handleApiError = (e) => {
    console.error('API Error:', e);
    fieldErrors.value = {}; // Reset previous errors
    if (e?.response?.data?.field_errors) {
        fieldErrors.value = e.response.data.field_errors;
        return;
    }
    const errorMsg = e?.response?.data?.error ||
        e?.message ||
        'Unexpected error occurred. Please try again.';
    message.error(errorMsg);
};
onMounted(fetchData);
watch(activeTab, fetchData);
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
for (const [entity] of __VLS_getVForSourceType((__VLS_ctx.entityTypes))) {
    const __VLS_13 = {}.NTabPane;
    /** @type {[typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
        key: (entity),
        name: (entity),
        tab: (__VLS_ctx.toSentenceCase(entity)),
    }));
    const __VLS_15 = __VLS_14({
        key: (entity),
        name: (entity),
        tab: (__VLS_ctx.toSentenceCase(entity)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    __VLS_16.slots.default;
    if (['customer', 'agent', 'partner', 'passenger', 'travel_location', 'particular'].includes(__VLS_ctx.activeTab)) {
        const __VLS_17 = {}.NTabs;
        /** @type {[typeof __VLS_components.NTabs, typeof __VLS_components.nTabs, typeof __VLS_components.NTabs, typeof __VLS_components.nTabs, ]} */ ;
        // @ts-ignore
        const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
            value: (__VLS_ctx.subTab),
            size: "small",
            type: "line",
            ...{ style: {} },
        }));
        const __VLS_19 = __VLS_18({
            value: (__VLS_ctx.subTab),
            size: "small",
            type: "line",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_18));
        __VLS_20.slots.default;
        const __VLS_21 = {}.NTabPane;
        /** @type {[typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
            name: "active",
            tab: "Active",
        }));
        const __VLS_23 = __VLS_22({
            name: "active",
            tab: "Active",
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        const __VLS_25 = {}.NTabPane;
        /** @type {[typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
            name: "inactive",
            tab: "Inactive",
        }));
        const __VLS_27 = __VLS_26({
            name: "inactive",
            tab: "Inactive",
        }, ...__VLS_functionalComponentArgsRest(__VLS_26));
        var __VLS_20;
    }
    const __VLS_29 = {}.NSpace;
    /** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
    // @ts-ignore
    const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
        justify: "space-between",
        wrap: true,
    }));
    const __VLS_31 = __VLS_30({
        justify: "space-between",
        wrap: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_30));
    __VLS_32.slots.default;
    const __VLS_33 = {}.NInput;
    /** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
        value: (__VLS_ctx.searchQuery),
        placeholder: "Search by name/contact",
        clearable: true,
        ...{ style: {} },
    }));
    const __VLS_35 = __VLS_34({
        value: (__VLS_ctx.searchQuery),
        placeholder: "Search by name/contact",
        clearable: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
    /** @type {[typeof PermissionWrapper, typeof PermissionWrapper, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(PermissionWrapper, new PermissionWrapper({
        resource: "entity",
        operation: "write",
    }));
    const __VLS_38 = __VLS_37({
        resource: "entity",
        operation: "write",
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    const __VLS_40 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onClick: (__VLS_ctx.openAddModal)
    };
    __VLS_43.slots.default;
    (__VLS_ctx.toSentenceCase(__VLS_ctx.activeTab));
    var __VLS_43;
    var __VLS_39;
    var __VLS_32;
    const __VLS_48 = {}.NDataTable;
    /** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        columns: (__VLS_ctx.columns),
        data: (__VLS_ctx.filteredData),
        loading: (__VLS_ctx.loading),
        striped: true,
        ...{ style: {} },
    }));
    const __VLS_50 = __VLS_49({
        columns: (__VLS_ctx.columns),
        data: (__VLS_ctx.filteredData),
        loading: (__VLS_ctx.loading),
        striped: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    const __VLS_52 = {}.NModal;
    /** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        show: (__VLS_ctx.modalVisible),
        teleported: (false),
        title: (__VLS_ctx.editMode ? `Edit ${__VLS_ctx.toSentenceCase(__VLS_ctx.activeTab)}` : `Add ${__VLS_ctx.toSentenceCase(__VLS_ctx.activeTab)}`),
        preset: "card",
        ...{ class: "full-width-modal" },
    }));
    const __VLS_54 = __VLS_53({
        show: (__VLS_ctx.modalVisible),
        teleported: (false),
        title: (__VLS_ctx.editMode ? `Edit ${__VLS_ctx.toSentenceCase(__VLS_ctx.activeTab)}` : `Add ${__VLS_ctx.toSentenceCase(__VLS_ctx.activeTab)}`),
        preset: "card",
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
    if (!__VLS_ctx.editMode && ['customer', 'agent', 'partner', 'passenger', 'travel_location', 'particular'].includes(__VLS_ctx.activeTab)) {
        const __VLS_60 = {}.NSpace;
        /** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            align: "center",
            justify: "space-between",
            ...{ style: {} },
        }));
        const __VLS_62 = __VLS_61({
            align: "center",
            justify: "space-between",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        __VLS_63.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ style: {} },
        });
        const __VLS_64 = {}.NSwitch;
        /** @type {[typeof __VLS_components.NSwitch, typeof __VLS_components.nSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
            value: (__VLS_ctx.bulkAddMode),
        }));
        const __VLS_66 = __VLS_65({
            value: (__VLS_ctx.bulkAddMode),
        }, ...__VLS_functionalComponentArgsRest(__VLS_65));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        var __VLS_63;
    }
    const __VLS_68 = {}.NForm;
    /** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        model: (__VLS_ctx.currentForm),
        rules: (__VLS_ctx.formRules),
        ref: "formRef",
    }));
    const __VLS_70 = __VLS_69({
        model: (__VLS_ctx.currentForm),
        rules: (__VLS_ctx.formRules),
        ref: "formRef",
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    /** @type {typeof __VLS_ctx.formRef} */ ;
    var __VLS_72 = {};
    __VLS_71.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "responsive-form-grid" },
    });
    for (const [defaultVal, key] of __VLS_getVForSourceType((__VLS_ctx.defaultFieldsByEntity[__VLS_ctx.activeTab]))) {
        const __VLS_74 = {}.NFormItem;
        /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
            key: (key),
            prop: (key),
            label: (__VLS_ctx.toSentenceCase(key)),
            feedback: (__VLS_ctx.fieldErrors[key]),
            validationStatus: (__VLS_ctx.fieldErrors[key] ? 'error' : undefined),
        }));
        const __VLS_76 = __VLS_75({
            key: (key),
            prop: (key),
            label: (__VLS_ctx.toSentenceCase(key)),
            feedback: (__VLS_ctx.fieldErrors[key]),
            validationStatus: (__VLS_ctx.fieldErrors[key] ? 'error' : undefined),
        }, ...__VLS_functionalComponentArgsRest(__VLS_75));
        __VLS_77.slots.default;
        if (typeof defaultVal === 'boolean') {
            const __VLS_78 = {}.NSwitch;
            /** @type {[typeof __VLS_components.NSwitch, typeof __VLS_components.nSwitch, ]} */ ;
            // @ts-ignore
            const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
                value: (__VLS_ctx.currentForm[key]),
            }));
            const __VLS_80 = __VLS_79({
                value: (__VLS_ctx.currentForm[key]),
            }, ...__VLS_functionalComponentArgsRest(__VLS_79));
        }
        else if (typeof defaultVal === 'number') {
            const __VLS_82 = {}.NInputNumber;
            /** @type {[typeof __VLS_components.NInputNumber, typeof __VLS_components.nInputNumber, ]} */ ;
            // @ts-ignore
            const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
                value: (__VLS_ctx.currentForm[key]),
                disabled: (__VLS_ctx.shouldDisableFieldInEdit(key)),
            }));
            const __VLS_84 = __VLS_83({
                value: (__VLS_ctx.currentForm[key]),
                disabled: (__VLS_ctx.shouldDisableFieldInEdit(key)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_83));
        }
        else if (key === 'customer_id') {
            const __VLS_86 = {}.NSelect;
            /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
            // @ts-ignore
            const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({
                value: (__VLS_ctx.currentForm[key]),
                options: (__VLS_ctx.customerOptions),
                labelField: "label",
                valueField: "value",
                placeholder: "Select Customer",
            }));
            const __VLS_88 = __VLS_87({
                value: (__VLS_ctx.currentForm[key]),
                options: (__VLS_ctx.customerOptions),
                labelField: "label",
                valueField: "value",
                placeholder: "Select Customer",
            }, ...__VLS_functionalComponentArgsRest(__VLS_87));
        }
        else {
            const __VLS_90 = {}.NInput;
            /** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
            // @ts-ignore
            const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
                value: (__VLS_ctx.currentForm[key]),
                disabled: (__VLS_ctx.shouldDisableFieldInEdit(key)),
            }));
            const __VLS_92 = __VLS_91({
                value: (__VLS_ctx.currentForm[key]),
                disabled: (__VLS_ctx.shouldDisableFieldInEdit(key)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_91));
        }
        var __VLS_77;
    }
    var __VLS_71;
    {
        const { footer: __VLS_thisSlot } = __VLS_59.slots;
        const __VLS_94 = {}.NSpace;
        /** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
        // @ts-ignore
        const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
            justify: "end",
        }));
        const __VLS_96 = __VLS_95({
            justify: "end",
        }, ...__VLS_functionalComponentArgsRest(__VLS_95));
        __VLS_97.slots.default;
        const __VLS_98 = {}.NButton;
        /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
        // @ts-ignore
        const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
            ...{ 'onClick': {} },
        }));
        const __VLS_100 = __VLS_99({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_99));
        let __VLS_102;
        let __VLS_103;
        let __VLS_104;
        const __VLS_105 = {
            onClick: (...[$event]) => {
                __VLS_ctx.modalVisible = false;
            }
        };
        __VLS_101.slots.default;
        var __VLS_101;
        if (__VLS_ctx.editMode || !__VLS_ctx.bulkAddMode) {
            const __VLS_106 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
                ...{ 'onClick': {} },
                type: "primary",
            }));
            const __VLS_108 = __VLS_107({
                ...{ 'onClick': {} },
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_107));
            let __VLS_110;
            let __VLS_111;
            let __VLS_112;
            const __VLS_113 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editMode || !__VLS_ctx.bulkAddMode))
                        return;
                    __VLS_ctx.editMode ? __VLS_ctx.updateEntity() : __VLS_ctx.addEntity();
                }
            };
            __VLS_109.slots.default;
            (__VLS_ctx.editMode ? 'Update' : 'Add');
            var __VLS_109;
        }
        else {
            const __VLS_114 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
                ...{ 'onClick': {} },
                type: "primary",
            }));
            const __VLS_116 = __VLS_115({
                ...{ 'onClick': {} },
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_115));
            let __VLS_118;
            let __VLS_119;
            let __VLS_120;
            const __VLS_121 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.editMode || !__VLS_ctx.bulkAddMode))
                        return;
                    __VLS_ctx.handleBulkAdd();
                }
            };
            __VLS_117.slots.default;
            var __VLS_117;
        }
        var __VLS_97;
    }
    var __VLS_59;
    var __VLS_55;
    var __VLS_16;
}
var __VLS_12;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['full-width-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['responsive-form-grid']} */ ;
// @ts-ignore
var __VLS_73 = __VLS_72;
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
            PermissionWrapper: PermissionWrapper,
            entityTypes: entityTypes,
            activeTab: activeTab,
            subTab: subTab,
            searchQuery: searchQuery,
            columns: columns,
            loading: loading,
            bulkAddMode: bulkAddMode,
            formRef: formRef,
            fieldErrors: fieldErrors,
            formRules: formRules,
            modalVisible: modalVisible,
            editMode: editMode,
            currentForm: currentForm,
            customerOptions: customerOptions,
            defaultFieldsByEntity: defaultFieldsByEntity,
            openAddModal: openAddModal,
            shouldDisableFieldInEdit: shouldDisableFieldInEdit,
            toSentenceCase: toSentenceCase,
            filteredData: filteredData,
            addEntity: addEntity,
            updateEntity: updateEntity,
            handleBulkAdd: handleBulkAdd,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=EntityManager.vue.js.map