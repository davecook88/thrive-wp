<template>
  <div class="thrive-admin-users">
    <Banner v-if="showAdminBanner" message="You are not a Thrive admin" type="error" />
    <div v-else-if="error" class="text-center py-8">
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800">{{ error }}</p>
      </div>
    </div>

    <!-- Search and Filter Form -->
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

    <!-- Users Table -->
    <div class="wp-admin-card">
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading users...</p>
      </div>


      <div v-else-if="users.length === 0" class="text-center py-8">
        <p class="text-gray-600">No users found.</p>
      </div>

      <div v-else>
        <div class="mb-4 flex justify-between items-center">
          <p class="text-sm text-gray-600">
            Showing {{ users.length }} of {{ total }} users
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="wp-admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td>{{ getUserName(user) }}</td>
                <td>
                  <a :href="'mailto:' + user.email" class="text-blue-600 hover:text-blue-800">
                    {{ user.email }}
                  </a>
                </td>
                <td>{{ getUserRole(user) }}</td>
                <td>
                  <span
                    :class="getStatusClass(getUserStatus(user))"
                    class="px-2 py-1 rounded-full text-xs font-medium"
                  >
                    {{ getUserStatus(user) }}
                  </span>
                </td>
                <td>{{ formatDate(user.createdAt) }}</td>
                <td>
                  <button
                    @click="viewUser(user)"
                    class="wp-admin-button-secondary text-xs"
                  >
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="mt-6 flex justify-center">
          <nav class="flex items-center space-x-1">
            <button
              @click="changePage(currentPage - 1)"
              :disabled="currentPage <= 1"
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <span
              v-for="page in visiblePages"
              :key="page"
              @click="changePage(page)"
              :class="page === currentPage ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
              class="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md cursor-pointer"
            >
              {{ page }}
            </span>

            <button
              @click="changePage(currentPage + 1)"
              :disabled="currentPage >= totalPages"
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { useUsers } from '../lib';
import Banner from './Banner.vue';

export default defineComponent({
  name: 'Users',
  components: {
    Banner
  },
  props: {
    initialPage: { type: [Number, String], default: 1 },
    initialSearch: { type: String, default: '' },
    initialRole: { type: String, default: '' },
  },
  setup(props) {
    const {
      users,
      total,
      totalPages,
      currentPage,
      loading,
      error,
      filters,
      hasFilters,
      visiblePages,
      loadUsers,
      handleFilter,
      clearFilters,
      changePage,
      getUserName,
      getUserRole,
      getUserStatus,
      formatDate,
    } = useUsers({
      initialPage: Number(props.initialPage),
      initialSearch: props.initialSearch,
      initialRole: props.initialRole,
    });

    const showAdminBanner = ref(false);

    // Handle authentication errors
    const handleApiError = (err: any) => {
      if (err.message?.includes('401') || err.message?.includes('403')) {
        showAdminBanner.value = true;
      }
    };

    // Override loadUsers to handle auth errors
    const originalLoadUsers = loadUsers;
    const enhancedLoadUsers = async () => {
      try {
        await originalLoadUsers();
      } catch (err) {
        handleApiError(err);
      }
    };

    const viewUser = (user: any) => alert(`View user details for ${getUserName(user)} (ID: ${user.id})`);

    onMounted(enhancedLoadUsers);

    return {
      users,
      total,
      totalPages,
      currentPage,
      loading,
      error,
      showAdminBanner,
      filters,
      hasFilters,
      visiblePages,
      loadUsers: enhancedLoadUsers,
      handleFilter,
      clearFilters,
      changePage,
      getUserName,
      getUserRole,
      getUserStatus,
      getStatusClass: (status: string) => status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
      formatDate,
      viewUser
    };
  }
});
</script>
