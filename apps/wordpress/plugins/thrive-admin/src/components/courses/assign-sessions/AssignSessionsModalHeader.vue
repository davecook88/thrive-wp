<template>
  <div class="px-6 py-4 border-b border-gray-200">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">
          Assign Sessions: {{ cohort.name }}
        </h3>
        <p class="text-sm text-gray-600 mt-1">
          Course: {{ course.title }}
        </p>
      </div>
      <button
        @click="$emit('close')"
        class="text-gray-400 hover:text-gray-500"
      >
        <span class="sr-only">Close</span>
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Tab Toggle -->
    <div class="flex gap-2">
      <button
        @click="$emit('tab-change', 'select')"
        :class="[
          'px-4 py-2 rounded-md text-sm font-medium transition-colors',
          activeTab === 'select'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
      >
        Select Existing
      </button>
      <button
        @click="$emit('tab-change', 'create')"
        :class="[
          'px-4 py-2 rounded-md text-sm font-medium transition-colors',
          activeTab === 'create'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
      >
        Create New Session
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { CourseProgramDetailDto, CourseCohortListItemDto } from '@thrive/shared';

export default defineComponent({
  name: 'AssignSessionsModalHeader',
  props: {
    course: {
      type: Object as PropType<CourseProgramDetailDto>,
      required: true
    },
    cohort: {
      type: Object as PropType<CourseCohortListItemDto>,
      required: true
    },
    activeTab: {
      type: String as PropType<'select' | 'create'>,
      required: true
    }
  },
  emits: ['close', 'tab-change']
});
</script>