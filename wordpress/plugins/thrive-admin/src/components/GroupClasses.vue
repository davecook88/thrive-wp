<template>
  <div class="thrive-admin-group-classes">
    <div class="mb-6 flex justify-between items-start">
      <div>
        <h2 class="text-2xl font-semibold text-gray-900 mb-2">Group Classes</h2>
        <p class="text-gray-600">Manage scheduled group classes with multiple students</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Group Class
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white shadow rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label for="levelFilter" class="block text-sm font-medium text-gray-700 mb-1">Level</label>
          <select
            id="levelFilter"
            v-model="filters.levelId"
            @change="loadGroupClasses"
            class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Levels</option>
            <option v-for="level in levels" :key="level.id" :value="level.id">
              {{ level.code }} - {{ level.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="teacherFilter" class="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
          <select
            id="teacherFilter"
            v-model="filters.teacherId"
            @change="loadGroupClasses"
            class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Teachers</option>
            <option v-for="teacher in teachers" :key="teacher.teacherId" :value="teacher.teacherId">
              {{ teacher.name }}
            </option>
          </select>
        </div>

        <div class="flex items-end">
          <label class="flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="filters.activeOnly"
              @change="loadGroupClasses"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span class="ml-2 text-sm font-medium text-gray-700">Active only</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Loading group classes...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">{{ error }}</p>
      <button @click="loadGroupClasses" class="mt-2 text-sm text-red-600 hover:text-red-800 underline">
        Try again
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="groupClasses.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <p class="mt-4 text-gray-500">No group classes found</p>
      <button
        @click="showCreateModal = true"
        class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        Create Your First Group Class
      </button>
    </div>

    <!-- Group Classes Table -->
    <div v-else class="bg-white shadow overflow-hidden sm:rounded-lg">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title & Level
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Teachers
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Capacity
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Schedule
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sessions
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="gc in groupClasses" :key="gc.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="text-sm font-medium text-gray-900">{{ gc.title }}</div>
              <div class="text-sm text-gray-500">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  {{ gc.levels.map(level => level.code).join(', ') }}
                </span>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-900">
                <div v-for="t in gc.teachers" :key="t.teacherId" class="flex items-center gap-1">
                  <span>{{ t.name }}</span>
                  <span v-if="t.isPrimary" class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Primary
                  </span>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
              {{ gc.capacityMax }} students
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {{ formatSchedule(gc) }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
              {{ gc.upcomingSessionsCount || 0 }} upcoming
            </td>
            <td class="px-6 py-4">
              <span :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                gc.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              ]">
                {{ gc.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right text-sm font-medium">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="viewSessions(gc)"
                  class="text-blue-600 hover:text-blue-900"
                  title="View Sessions"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  @click="editGroupClass(gc)"
                  class="text-indigo-600 hover:text-indigo-900"
                  title="Edit"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="toggleActive(gc)"
                  :class="[
                    'hover:opacity-70',
                    gc.isActive ? 'text-red-600' : 'text-green-600'
                  ]"
                  :title="gc.isActive ? 'Deactivate' : 'Activate'"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="gc.isActive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Modal -->
    <GroupClassModal
      v-if="showCreateModal || showEditModal"
      :groupClass="selectedGroupClass"
      
      :levels="levels"
      :teachers="teachers"
      @close="closeModal"
      @save="handleSave"
    />

    <!-- Sessions Modal -->
    <GroupClassSessionsModal
      v-if="showSessionsModal && selectedGroupClass"
      :groupClass="selectedGroupClass"
      @close="showSessionsModal = false"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import GroupClassModal from './GroupClassModal.vue';
import GroupClassSessionsModal from './GroupClassSessionsModal.vue';
import { thriveClient } from '../lib';
import type { Teacher, Level, TeacherLocation } from '../lib/types/calendar';

interface GroupClassTeacher {
  teacherId: number;
  name: string;
  isPrimary: boolean;
  userId: number;
}

export interface GroupClass {
  id: number;
  title: string;
  description: string | null;
  levels: Level[];
  capacityMax: number;
  rrule: string | null;
  startDate: string | null;
  endDate: string | null;
  teachers: GroupClassTeacher[];
  upcomingSessionsCount: number;
  isActive: boolean;
}

export default defineComponent({
  name: 'GroupClasses',
  components: {
    GroupClassModal,
    GroupClassSessionsModal,
  },
  setup() {
    const groupClasses = ref<GroupClass[]>([]);
    const levels = ref<Level[]>([]);
    const teachers = ref<Teacher[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const showCreateModal = ref(false);
    const showEditModal = ref(false);
    const showSessionsModal = ref(false);
    const selectedGroupClass = ref<GroupClass | null>(null);

    const filters = ref({
      levelId: '',
      teacherId: '',
      activeOnly: true,
    });

    const loadLevels = async () => {
      try {
        const data = await thriveClient.fetchLevels();
        levels.value = data;
      } catch (err: any) {
        console.error('Failed to load levels:', err);
      }
    };

    const loadTeachers = async () => {
      try {
        const data = await thriveClient.fetchTeachers();
        teachers.value = data;
      } catch (err: any) {
        console.error('Failed to load teachers:', err);
      }
    };

    const loadGroupClasses = async () => {
      loading.value = true;
      error.value = null;

      try {
        const params = new URLSearchParams();
        if (filters.value.levelId) params.append('levelId', filters.value.levelId);
        if (filters.value.teacherId) params.append('teacherId', filters.value.teacherId);
        if (filters.value.activeOnly) params.append('isActive', 'true');

        const response = await fetch(`/api/group-classes?${params}`, {
          credentials: 'same-origin',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        groupClasses.value = data.groupClasses || data;
      } catch (err: any) {
        error.value = err.message || 'Failed to load group classes';
      } finally {
        loading.value = false;
      }
    };

    const formatSchedule = (gc: GroupClass): string => {
      if (gc.rrule) {
        return 'Recurring';
      } else if (gc.startDate) {
        return `One-off (${new Date(gc.startDate).toLocaleDateString()})`;
      }
      return 'No schedule';
    };

    const editGroupClass = (gc: GroupClass) => {
      selectedGroupClass.value = gc;
      showEditModal.value = true;
    };

    const viewSessions = (gc: GroupClass) => {
      selectedGroupClass.value = gc;
      showSessionsModal.value = true;
    };

    const toggleActive = async (gc: GroupClass) => {
      const action = gc.isActive ? 'deactivate' : 'activate';
      if (!confirm(`Are you sure you want to ${action} "${gc.title}"?`)) {
        return;
      }

      try {
        const response = await fetch(`/api/group-classes/${gc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ isActive: !gc.isActive }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        await loadGroupClasses();
      } catch (err: any) {
        error.value = err.message || `Failed to ${action} group class`;
      }
    };

    const closeModal = () => {
      showCreateModal.value = false;
      showEditModal.value = false;
      selectedGroupClass.value = null;
    };

    const handleSave = async () => {
      await loadGroupClasses();
      closeModal();
    };

    onMounted(async () => {
      await Promise.all([loadLevels(), loadTeachers()]);
      await loadGroupClasses();
    });

    return {
      groupClasses,
      levels,
      teachers,
      loading,
      error,
      filters,
      showCreateModal,
      showEditModal,
      showSessionsModal,
      selectedGroupClass,
      loadGroupClasses,
      formatSchedule,
      editGroupClass,
      viewSessions,
      toggleActive,
      closeModal,
      handleSave,
    };
  },
});
</script>
