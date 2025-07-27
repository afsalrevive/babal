import type { PropType } from 'vue';
declare const _default: import("vue").DefineComponent<globalThis.ExtractPropTypes<{
    form: {
        type: PropType<any>;
        required: true;
    };
    transactionType: {
        type: PropType<string>;
        required: true;
    };
    entityTypeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    entityOptions: {
        type: PropType<any[]>;
        required: true;
    };
    entitiesLoading: {
        type: BooleanConstructor;
        required: true;
    };
    selectedEntity: {
        type: PropType<any>;
        default: any;
    };
    particularOptions: {
        type: PropType<any[]>;
        required: true;
    };
    particularsLoading: {
        type: BooleanConstructor;
        required: true;
    };
    payTypeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    nonRefundModeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    showWalletToggle: {
        type: BooleanConstructor;
        required: true;
    };
    walletToggleDisabled: {
        type: BooleanConstructor;
        required: true;
    };
    toggleValue: {
        type: BooleanConstructor;
        required: true;
    };
    toggleLabel: {
        type: StringConstructor;
        required: true;
    };
}>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "entity-type-change": (...args: any[]) => void;
    "payment-type-change": (...args: any[]) => void;
    "fetch-company-balance": (...args: any[]) => void;
    "toggle-value-change": (...args: any[]) => void;
}, string, import("vue").PublicProps, Readonly<globalThis.ExtractPropTypes<{
    form: {
        type: PropType<any>;
        required: true;
    };
    transactionType: {
        type: PropType<string>;
        required: true;
    };
    entityTypeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    entityOptions: {
        type: PropType<any[]>;
        required: true;
    };
    entitiesLoading: {
        type: BooleanConstructor;
        required: true;
    };
    selectedEntity: {
        type: PropType<any>;
        default: any;
    };
    particularOptions: {
        type: PropType<any[]>;
        required: true;
    };
    particularsLoading: {
        type: BooleanConstructor;
        required: true;
    };
    payTypeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    nonRefundModeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    showWalletToggle: {
        type: BooleanConstructor;
        required: true;
    };
    walletToggleDisabled: {
        type: BooleanConstructor;
        required: true;
    };
    toggleValue: {
        type: BooleanConstructor;
        required: true;
    };
    toggleLabel: {
        type: StringConstructor;
        required: true;
    };
}>> & Readonly<{
    "onEntity-type-change"?: (...args: any[]) => any;
    "onPayment-type-change"?: (...args: any[]) => any;
    "onFetch-company-balance"?: (...args: any[]) => any;
    "onToggle-value-change"?: (...args: any[]) => any;
}>, {
    selectedEntity: any;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
