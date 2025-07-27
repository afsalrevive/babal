const __VLS_props = defineProps({
    form: {
        type: Object,
        required: true
    },
    transactionType: {
        type: String,
        required: true
    },
    entityTypeOptions: {
        type: Array,
        required: true
    },
    entityOptions: {
        type: Array,
        required: true
    },
    entitiesLoading: {
        type: Boolean,
        required: true
    },
    selectedEntity: {
        type: Object,
        default: null
    },
    particularOptions: {
        type: Array,
        required: true
    },
    particularsLoading: {
        type: Boolean,
        required: true
    },
    payTypeOptions: {
        type: Array,
        required: true
    },
    nonRefundModeOptions: {
        type: Array,
        required: true
    },
    showWalletToggle: {
        type: Boolean,
        required: true
    },
    walletToggleDisabled: {
        type: Boolean,
        required: true
    },
    toggleValue: {
        type: Boolean,
        required: true
    },
    toggleLabel: {
        type: String,
        required: true
    }
});
const __VLS_emit = defineEmits(['entity-type-change', 'payment-type-change', 'fetch-company-balance', 'toggle-value-change']);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    label: "Entity Type",
    prop: "entity_type",
}));
const __VLS_2 = __VLS_1({
    label: "Entity Type",
    prop: "entity_type",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.entity_type),
    options: (__VLS_ctx.entityTypeOptions),
}));
const __VLS_6 = __VLS_5({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.entity_type),
    options: (__VLS_ctx.entityTypeOptions),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    'onUpdate:value': (...[$event]) => {
        __VLS_ctx.$emit('entity-type-change', $event);
    }
};
var __VLS_7;
var __VLS_3;
const __VLS_12 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    label: "Entity Name",
    prop: "entity_id",
}));
const __VLS_14 = __VLS_13({
    label: "Entity Name",
    prop: "entity_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
const __VLS_16 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    vertical: true,
}));
const __VLS_18 = __VLS_17({
    vertical: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    value: (__VLS_ctx.form.entity_id),
    options: (__VLS_ctx.entityOptions),
    loading: (__VLS_ctx.entitiesLoading),
    filterable: true,
    disabled: (!__VLS_ctx.form.entity_type || __VLS_ctx.form.entity_type === 'others'),
    placeholder: "Select entity",
}));
const __VLS_22 = __VLS_21({
    value: (__VLS_ctx.form.entity_id),
    options: (__VLS_ctx.entityOptions),
    loading: (__VLS_ctx.entitiesLoading),
    filterable: true,
    disabled: (!__VLS_ctx.form.entity_type || __VLS_ctx.form.entity_type === 'others'),
    placeholder: "Select entity",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
if (__VLS_ctx.selectedEntity) {
    const __VLS_24 = {}.NGrid;
    /** @type {[typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        cols: (2),
        xGap: "12",
        ...{ style: {} },
    }));
    const __VLS_26 = __VLS_25({
        cols: (2),
        xGap: "12",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    const __VLS_28 = {}.NGi;
    /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
    const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
    __VLS_31.slots.default;
    const __VLS_32 = {}.NText;
    /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        type: "info",
    }));
    const __VLS_34 = __VLS_33({
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    (__VLS_ctx.selectedEntity.wallet_balance ?? 'N/A');
    var __VLS_35;
    var __VLS_31;
    const __VLS_36 = {}.NGi;
    /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
    const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    const __VLS_40 = {}.NText;
    /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        type: "warning",
    }));
    const __VLS_42 = __VLS_41({
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    if (__VLS_ctx.form.entity_type === 'agent') {
        (__VLS_ctx.selectedEntity.credit_balance ?? 'N/A');
        (__VLS_ctx.selectedEntity.credit_limit ?? 'N/A');
    }
    else {
        (__VLS_ctx.selectedEntity.credit_used ?? 'N/A');
        (__VLS_ctx.selectedEntity.credit_limit ?? 'N/A');
    }
    var __VLS_43;
    var __VLS_39;
    var __VLS_27;
}
var __VLS_19;
var __VLS_15;
const __VLS_44 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "Payment Type",
    prop: "pay_type",
}));
const __VLS_46 = __VLS_45({
    label: "Payment Type",
    prop: "pay_type",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.pay_type),
    options: (__VLS_ctx.payTypeOptions),
    clearable: true,
}));
const __VLS_50 = __VLS_49({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.pay_type),
    options: (__VLS_ctx.payTypeOptions),
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
let __VLS_52;
let __VLS_53;
let __VLS_54;
const __VLS_55 = {
    'onUpdate:value': (...[$event]) => {
        __VLS_ctx.$emit('payment-type-change', $event);
    }
};
var __VLS_51;
var __VLS_47;
if (__VLS_ctx.showWalletToggle) {
    const __VLS_56 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        showLabel: (false),
    }));
    const __VLS_58 = __VLS_57({
        showLabel: (false),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_59.slots.default;
    const __VLS_60 = {}.NCheckbox;
    /** @type {[typeof __VLS_components.NCheckbox, typeof __VLS_components.nCheckbox, typeof __VLS_components.NCheckbox, typeof __VLS_components.nCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        ...{ 'onUpdate:checked': {} },
        checked: (__VLS_ctx.toggleValue),
        disabled: (__VLS_ctx.walletToggleDisabled),
    }));
    const __VLS_62 = __VLS_61({
        ...{ 'onUpdate:checked': {} },
        checked: (__VLS_ctx.toggleValue),
        disabled: (__VLS_ctx.walletToggleDisabled),
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    let __VLS_64;
    let __VLS_65;
    let __VLS_66;
    const __VLS_67 = {
        'onUpdate:checked': (...[$event]) => {
            if (!(__VLS_ctx.showWalletToggle))
                return;
            __VLS_ctx.$emit('toggle-value-change', $event);
        }
    };
    __VLS_63.slots.default;
    (__VLS_ctx.toggleLabel);
    var __VLS_63;
    var __VLS_59;
}
const __VLS_68 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "Mode of Payment",
    prop: "mode",
}));
const __VLS_70 = __VLS_69({
    label: "Mode of Payment",
    prop: "mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
const __VLS_72 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.mode),
    options: (__VLS_ctx.nonRefundModeOptions),
}));
const __VLS_74 = __VLS_73({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.mode),
    options: (__VLS_ctx.nonRefundModeOptions),
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
let __VLS_76;
let __VLS_77;
let __VLS_78;
const __VLS_79 = {
    'onUpdate:value': (...[$event]) => {
        __VLS_ctx.$emit('fetch-company-balance', $event);
    }
};
var __VLS_75;
var __VLS_71;
const __VLS_80 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    label: "Particular",
    prop: "particular_id",
}));
const __VLS_82 = __VLS_81({
    label: "Particular",
    prop: "particular_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
const __VLS_84 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    value: (__VLS_ctx.form.particular_id),
    options: (__VLS_ctx.particularOptions),
    loading: (__VLS_ctx.particularsLoading),
    filterable: true,
    clearable: true,
}));
const __VLS_86 = __VLS_85({
    value: (__VLS_ctx.form.particular_id),
    options: (__VLS_ctx.particularOptions),
    loading: (__VLS_ctx.particularsLoading),
    filterable: true,
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
var __VLS_83;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    emits: {},
    props: {
        form: {
            type: Object,
            required: true
        },
        transactionType: {
            type: String,
            required: true
        },
        entityTypeOptions: {
            type: Array,
            required: true
        },
        entityOptions: {
            type: Array,
            required: true
        },
        entitiesLoading: {
            type: Boolean,
            required: true
        },
        selectedEntity: {
            type: Object,
            default: null
        },
        particularOptions: {
            type: Array,
            required: true
        },
        particularsLoading: {
            type: Boolean,
            required: true
        },
        payTypeOptions: {
            type: Array,
            required: true
        },
        nonRefundModeOptions: {
            type: Array,
            required: true
        },
        showWalletToggle: {
            type: Boolean,
            required: true
        },
        walletToggleDisabled: {
            type: Boolean,
            required: true
        },
        toggleValue: {
            type: Boolean,
            required: true
        },
        toggleLabel: {
            type: String,
            required: true
        }
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    emits: {},
    props: {
        form: {
            type: Object,
            required: true
        },
        transactionType: {
            type: String,
            required: true
        },
        entityTypeOptions: {
            type: Array,
            required: true
        },
        entityOptions: {
            type: Array,
            required: true
        },
        entitiesLoading: {
            type: Boolean,
            required: true
        },
        selectedEntity: {
            type: Object,
            default: null
        },
        particularOptions: {
            type: Array,
            required: true
        },
        particularsLoading: {
            type: Boolean,
            required: true
        },
        payTypeOptions: {
            type: Array,
            required: true
        },
        nonRefundModeOptions: {
            type: Array,
            required: true
        },
        showWalletToggle: {
            type: Boolean,
            required: true
        },
        walletToggleDisabled: {
            type: Boolean,
            required: true
        },
        toggleValue: {
            type: Boolean,
            required: true
        },
        toggleLabel: {
            type: String,
            required: true
        }
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=PaymentFormSection.vue.js.map