<template>
  <div v-if="totalPages > 1" class="mt-6 flex justify-center">
    <nav class="flex items-center space-x-1">
      <button
        @click="$emit('change-page', currentPage - 1)"
        :disabled="currentPage <= 1"
        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>

      <span
        v-for="page in visiblePages"
        :key="page"
        @click="$emit('change-page', page)"
        :class="page === currentPage ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
        class="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md cursor-pointer"
      >
        {{ page }}
      </span>

      <button
        @click="$emit('change-page', currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </nav>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'UsersPagination',
  props: {
    currentPage: {
      type: Number,
      required: true
    },
    totalPages: {
      type: Number,
      required: true
    }
  },
  emits: ['change-page'],
  setup(props) {
    const visiblePages = computed(() => {
      const pages: number[] = [];
      const start = Math.max(1, props.currentPage - 2);
      const end = Math.min(props.totalPages, props.currentPage + 2);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    });

    return {
      visiblePages
    };
  }
});
</script>
