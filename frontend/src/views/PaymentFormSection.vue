<template>
    <n-form-item label="Entity Type" prop="entity_type">
      <n-select 
        v-model:value="form.entity_type" 
        :options="entityTypeOptions" 
        @update:value="$emit('entity-type-change', $event)"
      />
    </n-form-item>

    <n-form-item label="Entity Name" prop="entity_id">
      <n-space vertical>
        <n-select
          v-model:value="form.entity_id"
          :options="entityOptions"
          :loading="entitiesLoading"
          filterable
          :disabled="!form.entity_type || form.entity_type === 'others'"
          placeholder="Select entity"
        />
        <n-grid v-if="selectedEntity" :cols="2" x-gap="12" style="margin-top: 8px;">
          <n-gi>
            <n-text type="info">Wallet: ₹{{ selectedEntity.wallet_balance ?? 'N/A' }}</n-text>
          </n-gi>
          <n-gi>
            <n-text type="warning">
              <template v-if="form.entity_type === 'agent'">
                Credit Balance: ₹{{ selectedEntity.credit_balance ?? 'N/A' }}/₹{{ selectedEntity.credit_limit ?? 'N/A' }}
              </template>
              <template v-else>
                Credit Used: ₹{{ selectedEntity.credit_used ?? 'N/A' }}/₹{{ selectedEntity.credit_limit ?? 'N/A' }}
              </template>
            </n-text>
          </n-gi>
        </n-grid>
      </n-space>
    </n-form-item>

    <n-form-item label="Payment Type" prop="pay_type">
      <n-select 
        v-model:value="form.pay_type" 
        :options="payTypeOptions" 
        clearable
        @update:value="$emit('payment-type-change', $event)"
      />
    </n-form-item>

    <template v-if="showWalletToggle">
      <n-form-item :show-label="false">
        <n-checkbox 
          :checked="toggleValue" 
          @update:checked="$emit('toggle-value-change', $event)"
          :disabled="walletToggleDisabled"
        >
          {{ toggleLabel }}
        </n-checkbox>
      </n-form-item>
    </template>

    <n-form-item label="Mode of Payment" prop="mode">
      <n-select
        v-model:value="form.mode"
        :options="nonRefundModeOptions"
        @update:value="$emit('fetch-company-balance', $event)"
      />
    </n-form-item>

    <n-form-item label="Particular" prop="particular_id">
      <n-select 
        v-model:value="form.particular_id" 
        :options="particularOptions" 
        :loading="particularsLoading" 
        filterable 
        clearable 
      />
    </n-form-item>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

defineProps({
  form: {
    type: Object as PropType<any>,
    required: true
  },
  transactionType: {
    type: String as PropType<string>,
    required: true
  },
  entityTypeOptions: {
    type: Array as PropType<any[]>,
    required: true
  },
  entityOptions: {
    type: Array as PropType<any[]>,
    required: true
  },
  entitiesLoading: {
    type: Boolean,
    required: true
  },
  selectedEntity: {
    type: Object as PropType<any>,
    default: null
  },
  particularOptions: {
    type: Array as PropType<any[]>,
    required: true
  },
  particularsLoading: {
    type: Boolean,
    required: true
  },
  payTypeOptions: {
    type: Array as PropType<any[]>,
    required: true
  },
  nonRefundModeOptions: {
    type: Array as PropType<any[]>,
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
})

defineEmits(['entity-type-change', 'payment-type-change', 'fetch-company-balance','toggle-value-change'])
</script>

<style scoped lang="scss">
@use '@/styles/theme' as *;
</style>