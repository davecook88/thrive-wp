<template>
  <div class="wp-admin-card min-">
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

  <div class="overflow-x-auto overflow-y-visible h-full">
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
              <td class=" overflow-visible">
                <div class="flex space-x-2">
                  <button
                    @click="$emit('view-user', user)"
                    class="wp-admin-button-secondary text-xs"
                  >
                    View
                  </button>
                  <UserActions
                    :user="user"
                    @promote-admin="$emit('promote-admin', user)"
                    @demote-admin="$emit('demote-admin', user)"
                    @promote-teacher="$emit('promote-teacher', user)"
                    @demote-teacher="$emit('demote-teacher', user)"
                    @update-teacher-tier="$emit('update-teacher-tier', { user, tier: $event })"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import UserActions from './UserActions.vue';
import type { UserResponse } from '../../lib/types/users';

export default defineComponent({
  name: 'UsersTable',
  components: {
    UserActions
  },
  props: {
    users: {
      type: Array as () => UserResponse[],
      default: () => []
    },
    total: {
      type: Number,
      default: 0
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'view-user',
    'promote-admin',
    'demote-admin',
    'promote-teacher',
    'demote-teacher',
    'update-teacher-tier'
  ],
  setup() {
    const getUserName = (user: UserResponse) => {
      return `${user.firstName} ${user.lastName}`.trim() || "No name";
    };

    const getUserRole = (user: UserResponse) => {
      if (Boolean(user.admin?.isActive)) return "Admin";
      if (user.teacher?.isActive) return `Teacher (Tier ${user.teacher.tier})`;
      return "Student";
    };

    const getUserStatus = (user: UserResponse) => {
      if (user.admin?.isActive)
        return Boolean(user.admin.isActive) ? "Active" : "Inactive";
      if (user.teacher?.isActive)
        return Boolean(user.teacher.isActive) ? "Active" : "Inactive";
      return "Active";
    };

    const getStatusClass = (status: string) => {
      return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString();
    };

    return {
      getUserName,
      getUserRole,
      getUserStatus,
      getStatusClass,
      formatDate
    };
  }
});
</script>
