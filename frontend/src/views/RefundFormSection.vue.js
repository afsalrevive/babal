const props = defineProps({
    form: {
        type: Object,
        required: true
    },
    entityTypeOptions: {
        type: Array,
        required: true
    },
    refundDirectionOptions: {
        type: Array,
        required: true
    },
    companyModeOptions: {
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
    },
    companyRefundFromModeOptions: {
        type: Array,
        required: true
    },
    modeBalance: {
        type: Number,
        default: null
    },
    entityOptionsReady: {
        type: Boolean,
        required: true
    }
});
const getEntityToCompanyFromModeOptions = (entityType) => {
    if (!entityType)
        return [];
    if (['customer', 'partner', 'agent'].includes(entityType)) {
        return [{ label: 'Cash', value: 'cash' }, { label: 'Wallet', value: 'wallet' }];
    }
    return [{ label: 'Cash', value: 'cash' }, { label: 'Online', value: 'online' }];
};
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
    label: "Refund Direction",
    prop: "refund_direction",
}));
const __VLS_2 = __VLS_1({
    label: "Refund Direction",
    prop: "refund_direction",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    value: (__VLS_ctx.form.refund_direction),
    options: (__VLS_ctx.refundDirectionOptions),
}));
const __VLS_6 = __VLS_5({
    value: (__VLS_ctx.form.refund_direction),
    options: (__VLS_ctx.refundDirectionOptions),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
var __VLS_3;
if (__VLS_ctx.form.refund_direction === 'outgoing') {
    const __VLS_8 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        label: "To Entity Type",
        prop: "to_entity_type",
    }));
    const __VLS_10 = __VLS_9({
        label: "To Entity Type",
        prop: "to_entity_type",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    const __VLS_12 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ 'onUpdate:value': {} },
        value: (__VLS_ctx.form.to_entity_type),
        options: (__VLS_ctx.entityTypeOptions),
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onUpdate:value': {} },
        value: (__VLS_ctx.form.to_entity_type),
        options: (__VLS_ctx.entityTypeOptions),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_16;
    let __VLS_17;
    let __VLS_18;
    const __VLS_19 = {
        'onUpdate:value': (...[$event]) => {
            if (!(__VLS_ctx.form.refund_direction === 'outgoing'))
                return;
            __VLS_ctx.$emit('refund-entity-change', $event, 'to');
        }
    };
    var __VLS_15;
    var __VLS_11;
    if (__VLS_ctx.form.to_entity_type && __VLS_ctx.form.to_entity_type !== 'others') {
        const __VLS_20 = {}.NFormItem;
        /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            label: "To Entity Name",
            prop: "to_entity_id",
        }));
        const __VLS_22 = __VLS_21({
            label: "To Entity Name",
            prop: "to_entity_id",
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_23.slots.default;
        const __VLS_24 = {}.NSpace;
        /** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            vertical: true,
        }));
        const __VLS_26 = __VLS_25({
            vertical: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_27.slots.default;
        const __VLS_28 = {}.NSelect;
        /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            value: (__VLS_ctx.form.to_entity_id),
            options: (__VLS_ctx.toEntityOptions),
            loading: (__VLS_ctx.toEntitiesLoading),
            filterable: true,
            placeholder: "Select entity",
        }));
        const __VLS_30 = __VLS_29({
            value: (__VLS_ctx.form.to_entity_id),
            options: (__VLS_ctx.toEntityOptions),
            loading: (__VLS_ctx.toEntitiesLoading),
            filterable: true,
            placeholder: "Select entity",
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        if (__VLS_ctx.selectedToEntity) {
            const __VLS_32 = {}.NGrid;
            /** @type {[typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, ]} */ ;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                cols: (2),
                xGap: "12",
                ...{ style: {} },
            }));
            const __VLS_34 = __VLS_33({
                cols: (2),
                xGap: "12",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_33));
            __VLS_35.slots.default;
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
                type: "info",
            }));
            const __VLS_42 = __VLS_41({
                type: "info",
            }, ...__VLS_functionalComponentArgsRest(__VLS_41));
            __VLS_43.slots.default;
            (__VLS_ctx.selectedToEntity.wallet_balance ?? 'N/A');
            var __VLS_43;
            var __VLS_39;
            const __VLS_44 = {}.NGi;
            /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
            const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
            __VLS_47.slots.default;
            const __VLS_48 = {}.NText;
            /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
            // @ts-ignore
            const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                type: "warning",
            }));
            const __VLS_50 = __VLS_49({
                type: "warning",
            }, ...__VLS_functionalComponentArgsRest(__VLS_49));
            __VLS_51.slots.default;
            if (__VLS_ctx.form.to_entity_type === 'agent') {
                (__VLS_ctx.selectedToEntity.credit_balance ?? 'N/A');
                (__VLS_ctx.selectedToEntity.credit_limit ?? 'N/A');
            }
            else {
                (__VLS_ctx.selectedToEntity.credit_used ?? 'N/A');
                (__VLS_ctx.selectedToEntity.credit_limit ?? 'N/A');
            }
            var __VLS_51;
            var __VLS_47;
            var __VLS_35;
        }
        var __VLS_27;
        var __VLS_23;
    }
    const __VLS_52 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        label: "From Mode (Company)",
        prop: "mode_for_from",
    }));
    const __VLS_54 = __VLS_53({
        label: "From Mode (Company)",
        prop: "mode_for_from",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    const __VLS_56 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        value: (__VLS_ctx.form.mode_for_from),
        options: (__VLS_ctx.companyRefundFromModeOptions),
        placeholder: "Company pays via",
    }));
    const __VLS_58 = __VLS_57({
        value: (__VLS_ctx.form.mode_for_from),
        options: (__VLS_ctx.companyRefundFromModeOptions),
        placeholder: "Company pays via",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    var __VLS_55;
    if (__VLS_ctx.form.mode_for_from && __VLS_ctx.modeBalance !== null) {
        const __VLS_60 = {}.NFormItem;
        /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            label: "Company Account",
        }));
        const __VLS_62 = __VLS_61({
            label: "Company Account",
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        __VLS_63.slots.default;
        const __VLS_64 = {}.NP;
        /** @type {[typeof __VLS_components.NP, typeof __VLS_components.nP, typeof __VLS_components.NP, typeof __VLS_components.nP, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({}));
        const __VLS_66 = __VLS_65({}, ...__VLS_functionalComponentArgsRest(__VLS_65));
        __VLS_67.slots.default;
        (__VLS_ctx.form.mode_for_from);
        (__VLS_ctx.modeBalance.toFixed(2));
        var __VLS_67;
        var __VLS_63;
    }
    if (__VLS_ctx.form.to_entity_type) {
        if (['customer', 'partner'].includes(__VLS_ctx.form.to_entity_type)) {
            if (['cash', 'online'].includes(__VLS_ctx.form.mode_for_from)) {
                const __VLS_68 = {}.NFormItem;
                /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
                    label: "Deduct from Entity Account?",
                }));
                const __VLS_70 = __VLS_69({
                    label: "Deduct from Entity Account?",
                }, ...__VLS_functionalComponentArgsRest(__VLS_69));
                __VLS_71.slots.default;
                const __VLS_72 = {}.NSwitch;
                /** @type {[typeof __VLS_components.NSwitch, typeof __VLS_components.nSwitch, ]} */ ;
                // @ts-ignore
                const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
                    value: (__VLS_ctx.form.deduct_from_account),
                }));
                const __VLS_74 = __VLS_73({
                    value: (__VLS_ctx.form.deduct_from_account),
                }, ...__VLS_functionalComponentArgsRest(__VLS_73));
                var __VLS_71;
            }
            if (__VLS_ctx.form.mode_for_from === 'service_availed') {
                const __VLS_76 = {}.NFormItem;
                /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
                    label: "Credit to Entity Account?",
                }));
                const __VLS_78 = __VLS_77({
                    label: "Credit to Entity Account?",
                }, ...__VLS_functionalComponentArgsRest(__VLS_77));
                __VLS_79.slots.default;
                const __VLS_80 = {}.NSwitch;
                /** @type {[typeof __VLS_components.NSwitch, typeof __VLS_components.nSwitch, ]} */ ;
                // @ts-ignore
                const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
                    value: (__VLS_ctx.form.credit_to_account),
                }));
                const __VLS_82 = __VLS_81({
                    value: (__VLS_ctx.form.credit_to_account),
                }, ...__VLS_functionalComponentArgsRest(__VLS_81));
                var __VLS_79;
            }
        }
        if (__VLS_ctx.form.to_entity_type === 'agent') {
            const __VLS_84 = {}.NFormItem;
            /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
                label: "Credit Agent Account?",
            }));
            const __VLS_86 = __VLS_85({
                label: "Credit Agent Account?",
            }, ...__VLS_functionalComponentArgsRest(__VLS_85));
            __VLS_87.slots.default;
            const __VLS_88 = {}.NSwitch;
            /** @type {[typeof __VLS_components.NSwitch, typeof __VLS_components.nSwitch, ]} */ ;
            // @ts-ignore
            const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
                value: (__VLS_ctx.form.credit_to_account),
            }));
            const __VLS_90 = __VLS_89({
                value: (__VLS_ctx.form.credit_to_account),
            }, ...__VLS_functionalComponentArgsRest(__VLS_89));
            var __VLS_87;
        }
        if (__VLS_ctx.form.to_entity_type === 'others') {
            const __VLS_92 = {}.NFormItem;
            /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
                label: "Note",
            }));
            const __VLS_94 = __VLS_93({
                label: "Note",
            }, ...__VLS_functionalComponentArgsRest(__VLS_93));
            __VLS_95.slots.default;
            const __VLS_96 = {}.NAlert;
            /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, ]} */ ;
            // @ts-ignore
            const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
                type: "info",
                showIcon: (false),
            }));
            const __VLS_98 = __VLS_97({
                type: "info",
                showIcon: (false),
            }, ...__VLS_functionalComponentArgsRest(__VLS_97));
            __VLS_99.slots.default;
            var __VLS_99;
            var __VLS_95;
        }
    }
}
else {
    const __VLS_100 = {}.NFormItem;
    /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        label: "From Entity Type",
        prop: "from_entity_type",
    }));
    const __VLS_102 = __VLS_101({
        label: "From Entity Type",
        prop: "from_entity_type",
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    __VLS_103.slots.default;
    const __VLS_104 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        ...{ 'onUpdate:value': {} },
        value: (__VLS_ctx.form.from_entity_type),
        options: (__VLS_ctx.entityTypeOptions),
    }));
    const __VLS_106 = __VLS_105({
        ...{ 'onUpdate:value': {} },
        value: (__VLS_ctx.form.from_entity_type),
        options: (__VLS_ctx.entityTypeOptions),
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    let __VLS_108;
    let __VLS_109;
    let __VLS_110;
    const __VLS_111 = {
        'onUpdate:value': (...[$event]) => {
            if (!!(__VLS_ctx.form.refund_direction === 'outgoing'))
                return;
            __VLS_ctx.$emit('refund-entity-change', $event, 'from');
        }
    };
    var __VLS_107;
    var __VLS_103;
    if (__VLS_ctx.form.from_entity_type && __VLS_ctx.form.from_entity_type !== 'others') {
        const __VLS_112 = {}.NFormItem;
        /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
            label: "From Entity Name",
            prop: "from_entity_id",
        }));
        const __VLS_114 = __VLS_113({
            label: "From Entity Name",
            prop: "from_entity_id",
        }, ...__VLS_functionalComponentArgsRest(__VLS_113));
        __VLS_115.slots.default;
        const __VLS_116 = {}.NSpace;
        /** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
            vertical: true,
        }));
        const __VLS_118 = __VLS_117({
            vertical: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
        __VLS_119.slots.default;
        const __VLS_120 = {}.NSelect;
        /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
        // @ts-ignore
        const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
            value: (__VLS_ctx.form.from_entity_id),
            options: (__VLS_ctx.fromEntityOptions),
            loading: (__VLS_ctx.fromEntitiesLoading),
            filterable: true,
            placeholder: "Select entity",
        }));
        const __VLS_122 = __VLS_121({
            value: (__VLS_ctx.form.from_entity_id),
            options: (__VLS_ctx.fromEntityOptions),
            loading: (__VLS_ctx.fromEntitiesLoading),
            filterable: true,
            placeholder: "Select entity",
        }, ...__VLS_functionalComponentArgsRest(__VLS_121));
        if (__VLS_ctx.selectedFromEntity) {
            const __VLS_124 = {}.NGrid;
            /** @type {[typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, ]} */ ;
            // @ts-ignore
            const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
                cols: (2),
                xGap: "12",
                ...{ style: {} },
            }));
            const __VLS_126 = __VLS_125({
                cols: (2),
                xGap: "12",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_125));
            __VLS_127.slots.default;
            const __VLS_128 = {}.NGi;
            /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
            // @ts-ignore
            const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({}));
            const __VLS_130 = __VLS_129({}, ...__VLS_functionalComponentArgsRest(__VLS_129));
            __VLS_131.slots.default;
            const __VLS_132 = {}.NText;
            /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
            // @ts-ignore
            const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
                type: "info",
            }));
            const __VLS_134 = __VLS_133({
                type: "info",
            }, ...__VLS_functionalComponentArgsRest(__VLS_133));
            __VLS_135.slots.default;
            (__VLS_ctx.selectedFromEntity.wallet_balance ?? 'N/A');
            var __VLS_135;
            var __VLS_131;
            const __VLS_136 = {}.NGi;
            /** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
            // @ts-ignore
            const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({}));
            const __VLS_138 = __VLS_137({}, ...__VLS_functionalComponentArgsRest(__VLS_137));
            __VLS_139.slots.default;
            const __VLS_140 = {}.NText;
            /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
            // @ts-ignore
            const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
                type: "warning",
            }));
            const __VLS_142 = __VLS_141({
                type: "warning",
            }, ...__VLS_functionalComponentArgsRest(__VLS_141));
            __VLS_143.slots.default;
            if (__VLS_ctx.form.from_entity_type === 'agent') {
                (__VLS_ctx.selectedFromEntity.credit_balance ?? 'N/A');
            }
            else {
                (__VLS_ctx.selectedFromEntity.credit_used ?? 'N/A');
                (__VLS_ctx.selectedFromEntity.credit_limit ?? 'N/A');
            }
            var __VLS_143;
            var __VLS_139;
            var __VLS_127;
        }
        var __VLS_119;
        var __VLS_115;
    }
    if (__VLS_ctx.form.from_entity_type && __VLS_ctx.form.from_entity_type !== 'others') {
        const __VLS_144 = {}.NFormItem;
        /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
            label: "From Mode (Entity)",
            prop: "mode_for_from",
        }));
        const __VLS_146 = __VLS_145({
            label: "From Mode (Entity)",
            prop: "mode_for_from",
        }, ...__VLS_functionalComponentArgsRest(__VLS_145));
        __VLS_147.slots.default;
        const __VLS_148 = {}.NSelect;
        /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
            value: (__VLS_ctx.form.mode_for_from),
            key: (`mode-select-${__VLS_ctx.form.from_entity_type}-${__VLS_ctx.entityOptionsReady}`),
            options: (__VLS_ctx.getEntityToCompanyFromModeOptions(__VLS_ctx.form.from_entity_type)),
            loading: (!__VLS_ctx.entityOptionsReady),
            placeholder: "Entity pays via",
        }));
        const __VLS_150 = __VLS_149({
            value: (__VLS_ctx.form.mode_for_from),
            key: (`mode-select-${__VLS_ctx.form.from_entity_type}-${__VLS_ctx.entityOptionsReady}`),
            options: (__VLS_ctx.getEntityToCompanyFromModeOptions(__VLS_ctx.form.from_entity_type)),
            loading: (!__VLS_ctx.entityOptionsReady),
            placeholder: "Entity pays via",
        }, ...__VLS_functionalComponentArgsRest(__VLS_149));
        var __VLS_147;
    }
    if (__VLS_ctx.form.from_entity_type === 'others' || __VLS_ctx.form.mode_for_from === 'cash') {
        const __VLS_152 = {}.NFormItem;
        /** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
            label: "To Mode (Company)",
            prop: "mode_for_to",
        }));
        const __VLS_154 = __VLS_153({
            label: "To Mode (Company)",
            prop: "mode_for_to",
        }, ...__VLS_functionalComponentArgsRest(__VLS_153));
        __VLS_155.slots.default;
        const __VLS_156 = {}.NSelect;
        /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
        // @ts-ignore
        const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
            value: (__VLS_ctx.form.mode_for_to),
            options: (__VLS_ctx.companyModeOptions),
            placeholder: "Company receives via",
        }));
        const __VLS_158 = __VLS_157({
            value: (__VLS_ctx.form.mode_for_to),
            options: (__VLS_ctx.companyModeOptions),
            placeholder: "Company receives via",
        }, ...__VLS_functionalComponentArgsRest(__VLS_157));
        var __VLS_155;
    }
}
const __VLS_160 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    label: "Particular",
    prop: "particular_id",
}));
const __VLS_162 = __VLS_161({
    label: "Particular",
    prop: "particular_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
__VLS_163.slots.default;
const __VLS_164 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    value: (__VLS_ctx.form.particular_id),
    options: (__VLS_ctx.particularOptions),
    loading: (__VLS_ctx.particularsLoading),
    filterable: true,
    clearable: true,
}));
const __VLS_166 = __VLS_165({
    value: (__VLS_ctx.form.particular_id),
    options: (__VLS_ctx.particularOptions),
    loading: (__VLS_ctx.particularsLoading),
    filterable: true,
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
var __VLS_163;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            getEntityToCompanyFromModeOptions: getEntityToCompanyFromModeOptions,
        };
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
        refundDirectionOptions: {
            type: Array,
            required: true
        },
        companyModeOptions: {
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
        },
        companyRefundFromModeOptions: {
            type: Array,
            required: true
        },
        modeBalance: {
            type: Number,
            default: null
        },
        entityOptionsReady: {
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
        refundDirectionOptions: {
            type: Array,
            required: true
        },
        companyModeOptions: {
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
        },
        companyRefundFromModeOptions: {
            type: Array,
            required: true
        },
        modeBalance: {
            type: Number,
            default: null
        },
        entityOptionsReady: {
            type: Boolean,
            required: true
        }
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=RefundFormSection.vue.js.map