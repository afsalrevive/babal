<template>
    <n-form-item label="From Entity Type" prop="from_entity_type">
      <n-select 
        v-model:value="form.from_entity_type" 
        :options="entityTypeOptions" 
        @update:value="$emit('refund-entity-change', $event, 'from')"
      />
    </n-form-item>

    <n-form-item 
      v-if="form.from_entity_type && form.from_entity_type !== 'others'"
      label="From Entity Name"
      prop="from_entity_id"
    >
      <n-space vertical>
        <n-select
          v-model:value="form.from_entity_id"
          :options="fromEntityOptions"
          :loading="fromEntitiesLoading"
          filterable
          placeholder="Select entity"
        />
        <n-grid v-if="selectedFromEntity" :cols="1" style="margin-top: 8px;">
          <n-gi>
            <n-text type="info">Balance: ₹{{ selectedFromEntity.wallet_balance ?? 'N/A' }}</n-text>
          </n-gi>
        </n-grid>
      </n-space>
    </n-form-item>

    <n-form-item label="To Entity Type" prop="to_entity_type">
      <n-select 
        v-model:value="form.to_entity_type" 
        :options="entityTypeOptions" 
        @update:value="$emit('refund-entity-change', $event, 'to')"
      />
    </n-form-item>

    <n-form-item 
      v-if="form.to_entity_type && form.to_entity_type !== 'others'"
      label="To Entity Name"
      prop="to_entity_id"
    >
      <n-space vertical>
        <n-select
          v-model:value="form.to_entity_id"
          :options="toEntityOptions"
          :loading="toEntitiesLoading"
          filterable
          placeholder="Select entity"
        />
        <n-grid v-if="selectedToEntity" :cols="1" style="margin-top: 8px;">
          <n-gi>
            <n-text type="info">Balance: ₹{{ selectedToEntity.wallet_balance ?? 'N/A' }}</n-text>
          </n-gi>
        </n-grid>
      </n-space>
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
  entityTypeOptions: {
    type: Array as PropType<any[]>,
    required: true
  },
  fromEntityOptions: {
    type: Array as PropType<any[]>,
    required: true
  },
  toEntityOptions: {
    type: Array as PropType<any[]>,
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
    type: Object as PropType<any>,
    default: null
  },
  selectedToEntity: {
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
  }
})

defineEmits(['refund-entity-change'])
</script>

<style scoped lang="scss">
@use '@/styles/theme' as *;
</style>