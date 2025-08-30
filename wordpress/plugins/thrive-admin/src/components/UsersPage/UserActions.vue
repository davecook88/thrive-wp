<template>
  <div class="flex space-x-1">
    <!-- Admin Actions -->
    <div v-if="!isAdmin(user)" class="relative">
      <button
        @click="showAdminMenu = !showAdminMenu"
        class="wp-admin-button-secondary text-xs px-2 py-1"
        :disabled="actionLoading"
      >
        Make Admin
      </button>
      <div
        v-if="showAdminMenu"
        class="absolute right-0 mt-1 w-32 bg-white border border-gray-300 rounded-md shadow-lg z-10"
      >
        <button
          @click="handlePromoteAdmin"
          class="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100"
          :disabled="actionLoading"
        >
          {{ actionLoading ? 'Promoting...' : 'Promote to Admin' }}
        </button>
      </div>
    </div>

    <div v-else class="relative">
      <button
        @click="showAdminMenu = !showAdminMenu"
        class="wp-admin-button-warning text-xs px-2 py-1"
        :disabled="actionLoading"
      >
        Admin ▼
      </button>
      <div
        v-if="showAdminMenu"
        class="absolute right-0 mt-1 w-32 bg-white border border-gray-300 rounded-md shadow-lg z-10"
      >
        <button
          @click="handleDemoteAdmin"
          class="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-red-600"
          :disabled="actionLoading"
        >
          {{ actionLoading ? 'Demoting...' : 'Demote from Admin' }}
        </button>
      </div>
    </div>

    <!-- Teacher Actions -->
    <div v-if="!isTeacher(user)" class="relative">
      <button
        @click="showTeacherMenu = !showTeacherMenu"
        class="wp-admin-button-secondary text-xs px-2 py-1"
        :disabled="actionLoading"
      >
        Make Teacher
      </button>
      <div
        v-if="showTeacherMenu"
        class="absolute right-0 mt-1 w-40 bg-white border border-gray-300 rounded-md shadow-lg z-10"
      >
        <div class="px-3 py-2 border-b border-gray-200">
          <label class="block text-xs font-medium text-gray-700 mb-1">Tier</label>
          <select
            v-model="teacherTier"
            class="w-full text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option :value="10">Tier 10</option>
            <option :value="20">Tier 20</option>
            <option :value="30">Tier 30</option>
          </select>
        </div>
        <button
          @click="handlePromoteTeacher"
          class="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100"
          :disabled="actionLoading"
        >
          {{ actionLoading ? 'Promoting...' : 'Promote to Teacher' }}
        </button>
      </div>
    </div>

    <div v-else class="relative">
      <button
        @click="showTeacherMenu = !showTeacherMenu"
        class="wp-admin-button-info text-xs px-2 py-1"
        :disabled="actionLoading"
      >
        Teacher ▼
      </button>
      <div
        v-if="showTeacherMenu"
        class="absolute right-0 mt-1 w-40 bg-white border border-gray-300 rounded-md shadow-lg z-10"
      >
        <div class="px-3 py-2 border-b border-gray-200">
          <label class="block text-xs font-medium text-gray-700 mb-1">Update Tier</label>
          <select
            v-model="teacherTier"
            class="w-full text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option :value="10">Tier 10</option>
            <option :value="20">Tier 20</option>
            <option :value="30">Tier 30</option>
          </select>
        </div>
        <button
          @click="handleUpdateTeacherTier"
          class="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100"
          :disabled="actionLoading"
        >
          {{ actionLoading ? 'Updating...' : 'Update Tier' }}
        </button>
        <button
          @click="handleDemoteTeacher"
          class="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-red-600"
          :disabled="actionLoading"
        >
          {{ actionLoading ? 'Demoting...' : 'Demote from Teacher' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue';
import type { UserResponse } from '../../lib/types/users';

export default defineComponent({
  name: 'UserActions',
  props: {
    user: {
      type: Object as () => UserResponse,
      required: true
    }
  },
  emits: [
    'promote-admin',
    'demote-admin',
    'promote-teacher',
    'update-teacher-tier'
  ],
  setup(props, { emit }) {
    const showAdminMenu = ref(false);
    const showTeacherMenu = ref(false);
    const actionLoading = ref(false);
    const teacherTier = ref(10);

    // Close menus when clicking outside
    const closeMenus = () => {
      showAdminMenu.value = false;
      showTeacherMenu.value = false;
    };

    // Watch for menu state changes to close other menus
    watch(showAdminMenu, (newVal) => {
      if (newVal) showTeacherMenu.value = false;
    });

    watch(showTeacherMenu, (newVal) => {
      if (newVal) showAdminMenu.value = false;
    });

    const isAdmin = (user: UserResponse) => Boolean(user.admin?.isActive);
    const isTeacher = (user: UserResponse) => Boolean(user.teacher?.isActive);

    const handlePromoteAdmin = async () => {
      actionLoading.value = true;
      try {
        emit('promote-admin', props.user);
        closeMenus();
      } finally {
        actionLoading.value = false;
      }
    };

    const handleDemoteAdmin = async () => {
      actionLoading.value = true;
      try {
        emit('demote-admin', props.user);
        closeMenus();
      } finally {
        actionLoading.value = false;
      }
    };

    const handlePromoteTeacher = async () => {
      actionLoading.value = true;
      try {
        emit('promote-teacher', props.user, teacherTier.value);
        closeMenus();
      } finally {
        actionLoading.value = false;
      }
    };

    const handleUpdateTeacherTier = async () => {
      actionLoading.value = true;
      try {
        emit('update-teacher-tier', props.user, teacherTier.value);
        closeMenus();
      } finally {
        actionLoading.value = false;
      }
    };

    const handleDemoteTeacher = async () => {
      // For demotion, we could implement a separate endpoint or use update with tier 0
      // For now, we'll emit a custom event
      emit('demote-teacher', props.user);
      closeMenus();
    };

    return {
      showAdminMenu,
      showTeacherMenu,
      actionLoading,
      teacherTier,
      isAdmin,
      isTeacher,
      handlePromoteAdmin,
      handleDemoteAdmin,
      handlePromoteTeacher,
      handleUpdateTeacherTier,
      handleDemoteTeacher
    };
  }
});
</script>
