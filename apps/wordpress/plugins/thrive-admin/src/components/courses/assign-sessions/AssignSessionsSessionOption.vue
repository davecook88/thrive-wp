<template>
  <button
    @click="$emit('select', option.id)"
    :disabled="disabled"
    class="w-full text-left px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-900">
          {{ option.groupClassName }}
        </p>
        <p class="text-xs text-gray-600 mt-0.5">
          {{ formatSessionTime(option) }}
        </p>
      </div>
      <div class="text-xs text-gray-500">
        {{ option.availableSeats }} seats available
      </div>
    </div>
  </button>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { StepOptionDetailDto } from '@thrive/shared';

export default defineComponent({
  name: 'AssignSessionsSessionOption',
  props: {
    option: {
      type: Object as PropType<StepOptionDetailDto>,
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['select'],
  methods: {
    formatSessionTime(option: StepOptionDetailDto) {
      if (option.session) {
        const startAt = new Date(option.session.startAt);
        const dateString = startAt.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const timeString = startAt.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        return `${dateString} at ${timeString}`;
      }
      return 'Schedule not configured';
    }
  }
});
</script>