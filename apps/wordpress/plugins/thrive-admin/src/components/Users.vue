<template>
  <div class="thrive-admin-users">
    <Banner v-if="showAdminBanner" message="You are not a Thrive admin" type="error" />

    <div v-else-if="error" class="text-center py-8">
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800">{{ error }}</p>
      </div>
    </div>

    <template v-else>
      <!-- Search and Filter Form -->
      <UsersFilters
        :filters="filters"
        :loading="loading"
        :has-filters="hasFilters"
        @filter="handleFilter"
        @clear-filters="clearFilters"
      />

      <!-- Users Table -->
      <UsersTable
        :users="users"
        :total="total"
        :loading="loading"
        @view-user="viewUser"
        @promote-admin="handlePromoteAdmin"
        @demote-admin="handleDemoteAdmin"
        @promote-teacher="handlePromoteTeacher"
        @update-teacher-tier="handleUpdateTeacherTier"
      />

      <!-- Pagination -->
      <UsersPagination
        :current-page="currentPage"
        :total-pages="totalPages"
        @change-page="changePage"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { useUsers } from '../lib';
import Banner from './Banner.vue';
import { UsersFilters, UsersTable, UsersPagination } from './UsersPage';
import type { UserResponse } from '../lib/types/users';

export default defineComponent({
  name: 'Users',
  components: {
    Banner,
    UsersFilters,
    UsersTable,
    UsersPagination
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
      loadUsers,
      handleFilter,
      clearFilters,
      changePage,
      refresh,
      promoteToAdmin,
      demoteFromAdmin,
      promoteToTeacher,
      updateTeacherTier,
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

    const viewUser = (user: UserResponse) => {
      alert(`View user details for ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    };

    const handlePromoteAdmin = async (user: UserResponse) => {
      try {
        await promoteToAdmin(user.id);
        // Success message could be added here
      } catch (err) {
        console.error('Failed to promote user to admin:', err);
        // Error handling could be added here
      }
    };

    const handleDemoteAdmin = async (user: UserResponse) => {
      try {
        await demoteFromAdmin(user.id);
        // Success message could be added here
      } catch (err) {
        console.error('Failed to demote user from admin:', err);
        // Error handling could be added here
      }
    };

    const handlePromoteTeacher = async (user: UserResponse, tier: number) => {
      try {
        await promoteToTeacher(user.id, tier);
        // Success message could be added here
      } catch (err) {
        console.error('Failed to promote user to teacher:', err);
        // Error handling could be added here
      }
    };

    const handleUpdateTeacherTier = async (user: UserResponse, tier: number) => {
      try {
        await updateTeacherTier(user.id, tier);
        // Success message could be added here
      } catch (err) {
        console.error('Failed to update teacher tier:', err);
        // Error handling could be added here
      }
    };

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
      loadUsers: enhancedLoadUsers,
      handleFilter,
      clearFilters,
      changePage,
      viewUser,
      handlePromoteAdmin,
      handleDemoteAdmin,
      handlePromoteTeacher,
      handleUpdateTeacherTier,
    };
  }
});
</script>
