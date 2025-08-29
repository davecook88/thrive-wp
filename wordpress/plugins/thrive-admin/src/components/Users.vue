<template>
  <div class="thrive-admin-users">
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

      <div v-else-if="error" class="text-center py-8">
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <p class="text-red-800">{{ error }}</p>
        </div>
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
import { defineComponent, computed, onMounted, reactive, ref } from 'vue';

type User = {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  createdAt: string;
  admin?: { isActive: boolean } | null;
  teacher?: { isActive: boolean; tier: number } | null;
};

export default defineComponent({
  name: 'Users',
  props: {
    initialPage: { type: Number, default: 1 },
    initialSearch: { type: String, default: '' },
    initialRole: { type: String, default: '' }
  },
  setup(props) {
    const users = ref<User[]>([]);
    const total = ref(0);
    const totalPages = ref(0);
    const currentPage = ref<number>(props.initialPage as number);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const filters = reactive<{ search: string; role: string }>({
      search: (props.initialSearch as string) || '',
      role: (props.initialRole as string) || ''
    });

    const hasFilters = computed(() => !!(filters.search || filters.role));
    const visiblePages = computed(() => {
      const pages: number[] = [];
      const start = Math.max(1, currentPage.value - 2);
      const end = Math.min(totalPages.value, currentPage.value + 2);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    });

    const loadUsers = async () => {
      loading.value = true;
      error.value = null;
      try {
        const params = new URLSearchParams({
          page: String(currentPage.value),
          limit: String(20),
          search: filters.search,
          role: filters.role
        });

        const response = await fetch(window.thriveAdminBridgeAjax?.ajax_url || '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'thrive_admin_get_users',
            nonce: window.thriveAdminBridgeAjax?.nonce || '',
            params: JSON.stringify(Object.fromEntries(params))
          })
        });
        const result = await response.json();
        if (result.success) {
          users.value = (result.data.users || []) as User[];
          total.value = Number(result.data.total || 0);
          totalPages.value = Number(result.data.totalPages || 0);
        } else {
          error.value = result.data?.message || 'Failed to load users';
        }
      } catch (e: any) {
        error.value = 'Connection failed: ' + e.message;
      } finally {
        loading.value = false;
      }
    };

    const handleFilter = () => { currentPage.value = 1; loadUsers(); };
    const clearFilters = () => { filters.search = ''; filters.role = ''; currentPage.value = 1; loadUsers(); };
    const changePage = (page: number) => { if (page >= 1 && page <= totalPages.value) { currentPage.value = page; loadUsers(); } };

    const getUserName = (user: User) => `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No name';
    const getUserRole = (user: User) => user.admin?.isActive ? 'Admin' : (user.teacher?.isActive ? `Teacher (Tier ${user.teacher.tier})` : 'Student');
    const getUserStatus = (user: User) => user.admin?.isActive ? (user.admin.isActive ? 'Active' : 'Inactive') : (user.teacher?.isActive ? (user.teacher.isActive ? 'Active' : 'Inactive') : 'Active');
    const getStatusClass = (status: string) => status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
    const viewUser = (user: User) => alert(`View user details for ${getUserName(user)} (ID: ${user.id})`);

    onMounted(loadUsers);

    return {
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
      getStatusClass,
      formatDate,
      viewUser
    };
  }
});
</script>
