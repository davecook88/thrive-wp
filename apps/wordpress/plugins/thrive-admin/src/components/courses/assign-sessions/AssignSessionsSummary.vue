<template>
  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-900">
          Assignment Progress
        </p>
        <p class="text-xs text-gray-600 mt-1">
          {{ assignedCount }} of {{ totalSteps }} steps have sessions assigned
        </p>
      </div>
      <div
        :class="[
          'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
          isComplete
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        ]"
      >
        {{ isComplete ? 'Complete' : 'Incomplete' }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AssignSessionsSummary',
  props: {
    assignedCount: {
      type: Number,
      required: true
    },
    totalSteps: {
      type: Number,
      required: true
    }
  },
  computed: {
    isComplete() {
      return this.assignedCount === this.totalSteps;
    }
  }
});
</script>