<template>
  <div class="border border-gray-200 rounded-lg p-4">
    <div class="flex items-start justify-between mb-3">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
            {{ step.stepOrder }}
          </span>
          <h4 class="text-sm font-medium text-gray-900">
            {{ step.label }}: {{ step.title }}
          </h4>
          <span
            v-if="!step.isRequired"
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
          >
            Optional
          </span>
        </div>
        <p v-if="step.description" class="text-xs text-gray-500 mt-1 ml-8">
          {{ step.description }}
        </p>
      </div>
    </div>

    <!-- Currently Assigned Session -->
    <div v-if="assignedSession" class="ml-8 mb-3 bg-green-50 border border-green-200 rounded-md p-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-green-900">
            Currently Assigned: {{ assignedSession.groupClassName }}
          </p>
          <p class="text-xs text-green-700 mt-1">
            {{ formatSessionTime(assignedSession) }}
          </p>
        </div>
        <button
          @click="$emit('remove-session', step.id)"
          class="text-red-600 hover:text-red-800 text-xs font-medium"
        >
          Remove
        </button>
      </div>
    </div>

    <!-- Available Options -->
    <div class="ml-8 space-y-2">
      <label class="block text-xs font-medium text-gray-700 mb-2">
        {{ assignedSession ? 'Change to:' : 'Select Session:' }}
      </label>
      <div v-if="step.options.length === 0" class="text-sm text-gray-500 italic">
        No group class options available for this step. Add options in "Manage Steps" first.
      </div>
      <div v-else class="space-y-2">
        <AssignSessionsSessionOption
          v-for="option in step.options"
          :key="option.id"
          :option="option"
          :disabled="assigning"
          @select="handleOptionSelect"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { CourseProgramDetailDto, CourseCohortDetailDto } from '@thrive/shared';
import AssignSessionsSessionOption from './AssignSessionsSessionOption.vue';

export default defineComponent({
  name: 'AssignSessionsStepCard',
  components: {
    AssignSessionsSessionOption
  },
  props: {
    step: {
      type: Object as PropType<CourseProgramDetailDto['steps'][number]>,
      required: true
    },
    assignedSession: {
      type: Object as PropType<CourseCohortDetailDto['sessions'][number] | null>,
      default: null
    },
    assigning: {
      type: Boolean,
      default: false
    }
  },
  emits: ['assign-session', 'remove-session'],
  methods: {
    handleOptionSelect(optionId: number) {
      this.$emit('assign-session', this.step.id, optionId);
    },
    formatSessionTime(session: CourseCohortDetailDto['sessions'][number]) {
      if (!session.sessionDateTime) {
        return 'Schedule not configured';
      }

      const sessionDate = new Date(session.sessionDateTime);
      const dateString = sessionDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const timeString = sessionDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      return `${dateString} at ${timeString}`;
    }
  }
});
</script>