<template>
  <div class="wp-admin-card mb-6">
    <form @submit.prevent="handleFilter" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search by name or email..."
            class="wp-admin-input w-full"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select v-model="filters.role" class="wp-admin-input w-full">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            type="submit"
            :disabled="loading"
            class="wp-admin-button-primary mr-2"
          >
            {{ loading ? 'Filtering...' : 'Filter' }}
          </button>
          <button
            v-if="hasFilters"
            @click="clearFilters"
            type="button"
            class="wp-admin-button-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { UsersQueryParams } from '../../lib/types/users';

export default defineComponent({
  name: 'UsersFilters',
  props: {
    filters: {
      type: Object as () => UsersQueryParams,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    hasFilters: {
      type: Boolean,
      default: false
    }
  },
  emits: ['filter', 'clear-filters'],
  setup(props, { emit }) {
    const handleFilter = () => {
      emit('filter');
    };

    const clearFilters = () => {
      emit('clear-filters');
    };

    return {
      handleFilter,
      clearFilters
    };
  }
});
</script>
