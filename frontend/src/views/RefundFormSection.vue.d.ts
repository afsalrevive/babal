import type { PropType } from 'vue';
declare const _default: import("vue").DefineComponent<globalThis.ExtractPropTypes<{
    form: {
        type: PropType<any>;
        required: true;
    };
    entityTypeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    refundDirectionOptions: {
        type: PropType<any[]>;
        required: true;
    };
    companyModeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    fromEntityOptions: {
        type: PropType<any[]>;
        required: true;
    };
    toEntityOptions: {
        type: PropType<any[]>;
        required: true;
    };
    fromEntitiesLoading: {
        type: BooleanConstructor;
        required: true;
    };
    toEntitiesLoading: {
        type: BooleanConstructor;
        required: true;
    };
    selectedFromEntity: {
        type: PropType<any>;
        default: any;
    };
    selectedToEntity: {
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
    companyRefundFromModeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    modeBalance: {
        type: NumberConstructor;
        default: any;
    };
    entityOptionsReady: {
        type: BooleanConstructor;
        required: true;
    };
}>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "refund-entity-change": (...args: any[]) => void;
}, string, import("vue").PublicProps, Readonly<globalThis.ExtractPropTypes<{
    form: {
        type: PropType<any>;
        required: true;
    };
    entityTypeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    refundDirectionOptions: {
        type: PropType<any[]>;
        required: true;
    };
    companyModeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    fromEntityOptions: {
        type: PropType<any[]>;
        required: true;
    };
    toEntityOptions: {
        type: PropType<any[]>;
        required: true;
    };
    fromEntitiesLoading: {
        type: BooleanConstructor;
        required: true;
    };
    toEntitiesLoading: {
        type: BooleanConstructor;
        required: true;
    };
    selectedFromEntity: {
        type: PropType<any>;
        default: any;
    };
    selectedToEntity: {
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
    companyRefundFromModeOptions: {
        type: PropType<any[]>;
        required: true;
    };
    modeBalance: {
        type: NumberConstructor;
        default: any;
    };
    entityOptionsReady: {
        type: BooleanConstructor;
        required: true;
    };
}>> & Readonly<{
    "onRefund-entity-change"?: (...args: any[]) => any;
}>, {
    selectedFromEntity: any;
    selectedToEntity: any;
    modeBalance: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
