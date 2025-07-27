const __VLS_props = defineProps({
    form: {
        type: Object,
        required: true
    },
    entityTypeOptions: {
        type: Array,
        required: true
    },
    fromEntityOptions: {
        type: Array,
        required: true
    },
    toEntityOptions: {
        type: Array,
        required: true
    },
    fromEntitiesLoading: {
        type: Boolean,
        required: true
    },
    toEntitiesLoading: {
        type: Boolean,
        required: true
    },
    selectedFromEntity: {
        type: Object,
        default: null
    },
    selectedToEntity: {
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
    }
});
const __VLS_emit = defineEmits(['refund-entity-change']);
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
    label: "From Entity Type",
    prop: "from_entity_type",
}));
const __VLS_2 = __VLS_1({
    label: "From Entity Type",
    prop: "from_entity_type",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.from_entity_type),
    options: (__VLS_ctx.entityTypeOptions),
}));
const __VLS_6 = __VLS_5({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.from_entity_type),
    options: (__VLS_ctx.entityTypeOptions),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    'onUpdate:value': (...[$event]) => {
        __VLS_ctx.$emit('refund-entity-change', $event, 'from');
    }
};
var __VLS_7;
var __VLS_3;
if (__VLS_ctx.form.from_entity_type && __VLS_ctx.form.from_entity_type !== 'others') {
    const __VLS_12 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        label: "From Entity Name",
        prop: "from_entity_id",
    }));
    const __VLS_14 = __VLS_13({
        label: "From Entity Name",
        prop: "from_entity_id",
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
        value: (__VLS_ctx.form.from_entity_id),
        options: (__VLS_ctx.fromEntityOptions),
        loading: (__VLS_ctx.fromEntitiesLoading),
        filterable: true,
        placeholder: "Select entity",
    }));
    const __VLS_22 = __VLS_21({
        value: (__VLS_ctx.form.from_entity_id),
        options: (__VLS_ctx.fromEntityOptions),
        loading: (__VLS_ctx.fromEntitiesLoading),
        filterable: true,
        placeholder: "Select entity",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    if (__VLS_ctx.selectedFromEntity) {
        const __VLS_24 = {}.NGrid;
        /** @type {[typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            cols: (1),
            ...{ style: {} },
        }));
        const __VLS_26 = __VLS_25({
            cols: (1),
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
        (__VLS_ctx.selectedFromEntity.wallet_balance ?? 'N/A');
        var __VLS_35;
        var __VLS_31;
        var __VLS_27;
    }
    var __VLS_19;
    var __VLS_15;
}
const __VLS_36 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: "To Entity Type",
    prop: "to_entity_type",
}));
const __VLS_38 = __VLS_37({
    label: "To Entity Type",
    prop: "to_entity_type",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
const __VLS_40 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.to_entity_type),
    options: (__VLS_ctx.entityTypeOptions),
}));
const __VLS_42 = __VLS_41({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.to_entity_type),
    options: (__VLS_ctx.entityTypeOptions),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
let __VLS_44;
let __VLS_45;
let __VLS_46;
const __VLS_47 = {
    'onUpdate:value': (...[$event]) => {
        __VLS_ctx.$emit('refund-entity-change', $event, 'to');
    }
};
var __VLS_43;
var __VLS_39;
if (__VLS_ctx.form.to_entity_type && __VLS_ctx.form.to_entity_type !== 'others') {
    const __VLS_48 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        label: "To Entity Name",
        prop: "to_entity_id",
    }));
    const __VLS_50 = __VLS_49({
        label: "To Entity Name",
        prop: "to_entity_id",
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    const __VLS_52 = {}.NSpace;
    /** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        vertical: true,
    }));
    const __VLS_54 = __VLS_53({
        vertical: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    const __VLS_56 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        value: (__VLS_ctx.form.to_entity_id),
        options: (__VLS_ctx.toEntityOptions),
        loading: (__VLS_ctx.toEntitiesLoading),
        filterable: true,
        placeholder: "Select entity",
    }));
    const __VLS_58 = __VLS_57({
        value: (__VLS_ctx.form.to_entity_id),
        options: (__VLS_ctx.toEntityOptions),
        loading: (__VLS_ctx.toEntitiesLoading),
        filterable: true,
        placeholder: "Select entity",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    if (__VLS_ctx.selectedToEntity) {
        const __VLS_60 = {}.NGrid;
        /** @type {[typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            cols: (1),
            ...{ style: {} },
        }));
        const __VLS_62 = __VLS_61({
            cols: (1),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        __VLS_63.slots.default;
        const __VLS_64 = {}.NGi;
        /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({}));
        const __VLS_66 = __VLS_65({}, ...__VLS_functionalComponentArgsRest(__VLS_65));
        __VLS_67.slots.default;
        const __VLS_68 = {}.NText;
        /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            type: "info",
        }));
        const __VLS_70 = __VLS_69({
            type: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        __VLS_71.slots.default;
        (__VLS_ctx.selectedToEntity.wallet_balance ?? 'N/A');
        var __VLS_71;
        var __VLS_67;
        var __VLS_63;
    }
    var __VLS_55;
    var __VLS_51;
}
const __VLS_72 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    label: "Particular",
    prop: "particular_id",
}));
const __VLS_74 = __VLS_73({
    label: "Particular",
    prop: "particular_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_75.slots.default;
const __VLS_76 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    value: (__VLS_ctx.form.particular_id),
    options: (__VLS_ctx.particularOptions),
    loading: (__VLS_ctx.particularsLoading),
    filterable: true,
    clearable: true,
}));
const __VLS_78 = __VLS_77({
    value: (__VLS_ctx.form.particular_id),
    options: (__VLS_ctx.particularOptions),
    loading: (__VLS_ctx.particularsLoading),
    filterable: true,
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
var __VLS_75;
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
        entityTypeOptions: {
            type: Array,
            required: true
        },
        fromEntityOptions: {
            type: Array,
            required: true
        },
        toEntityOptions: {
            type: Array,
            required: true
        },
        fromEntitiesLoading: {
            type: Boolean,
            required: true
        },
        toEntitiesLoading: {
            type: Boolean,
            required: true
        },
        selectedFromEntity: {
            type: Object,
            default: null
        },
        selectedToEntity: {
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
        entityTypeOptions: {
            type: Array,
            required: true
        },
        fromEntityOptions: {
            type: Array,
            required: true
        },
        toEntityOptions: {
            type: Array,
            required: true
        },
        fromEntitiesLoading: {
            type: Boolean,
            required: true
        },
        toEntitiesLoading: {
            type: Boolean,
            required: true
        },
        selectedFromEntity: {
            type: Object,
            default: null
        },
        selectedToEntity: {
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
        }
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=WalletTransferFormSection.vue.js.map