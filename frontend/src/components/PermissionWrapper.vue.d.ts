import type { PropType } from 'vue';
declare var __VLS_1: {}, __VLS_3: {};
type __VLS_Slots = {} & {
    default?: (props: typeof __VLS_1) => any;
} & {
    fallback?: (props: typeof __VLS_3) => any;
};
declare const __VLS_component: import("vue").DefineComponent<globalThis.ExtractPropTypes<{
    resource: {
        type: StringConstructor;
        required: true;
    };
    operation: {
        type: PropType<"read" | "write">;
        validator: (v: string) => boolean;
        required: true;
    };
    showFallback: {
        type: BooleanConstructor;
        default: boolean;
    };
    fallbackText: {
        type: StringConstructor;
        default: string;
    };
    inheritFromParent: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<globalThis.ExtractPropTypes<{
    resource: {
        type: StringConstructor;
        required: true;
    };
    operation: {
        type: PropType<"read" | "write">;
        validator: (v: string) => boolean;
        required: true;
    };
    showFallback: {
        type: BooleanConstructor;
        default: boolean;
    };
    fallbackText: {
        type: StringConstructor;
        default: string;
    };
    inheritFromParent: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{}>, {
    showFallback: boolean;
    fallbackText: string;
    inheritFromParent: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
declare const _default: __VLS_WithSlots<typeof __VLS_component, __VLS_Slots>;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
