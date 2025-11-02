<template>
  <div class="thrive-admin-group-classes">
    <div class="mb-6 flex justify-between items-start">
      <div>
        <h2 class="text-2xl font-semibold text-gray-900 mb-2">Group Classes</h2>
        <p class="text-gray-600">View and manage group class sessions</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- View Toggle -->
        <div class="inline-flex rounded-md shadow-sm" role="group">
          <button
            @click="viewMode = 'calendar'"
            :class="[
              'px-4 py-2 text-sm font-medium border',
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            ]"
            class="rounded-l-md"
          >
            <svg class="h-4 w-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Calendar
          </button>
          <button
            @click="viewMode = 'table'"
            :class="[
              'px-4 py-2 text-sm font-medium border-t border-b border-r',
              viewMode === 'table'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            ]"
            class="rounded-r-md"
          >
            <svg class="h-4 w-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Table
          </button>
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
    </div>

    <!-- Filters -->
    <div class="bg-white shadow rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label for="levelFilter" class="block text-sm font-medium text-gray-700 mb-1">Level</label>
          <select
            id="levelFilter"
            v-model="filters.levelId"
            @change="loadCalendarSessions"
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
            @change="loadCalendarSessions"
            class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Teachers</option>
            <option v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">
              {{ teacher.displayName }}
            </option>
          </select>
        </div>

        <div class="flex items-end">
          <label class="flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="filters.activeOnly"
              @change="loadCalendarSessions"
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
      <p class="mt-2 text-gray-600">Loading group class sessions...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">{{ error }}</p>
      <button @click="loadCalendarSessions" class="mt-2 text-sm text-red-600 hover:text-red-800 underline">
        Try again
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="calendarEvents.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <p class="mt-4 text-gray-500">No group class sessions found</p>
      <button
        @click="showCreateModal = true"
        class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        Create Your First Group Class
      </button>
    </div>

    <!-- Calendar View -->
    <div v-else-if="viewMode === 'calendar'" class="bg-white shadow rounded-lg overflow-hidden">
      <thrive-calendar
        ref="calendarRef"
        view="week"
        :teacher-id="filters.teacherId || undefined"
        :events="calendarEvents"
        show-classes="true"
        show-bookings="false"
        :view-height="700"
        @event:click="handleEventClick"
        @navigate="handleCalendarNavigate"
        @today="handleCalendarNavigate"
      ></thrive-calendar>
    </div>

    <!-- Table View -->
    <div v-else class="bg-white shadow overflow-hidden sm:rounded-lg">
      <!-- Bulk Actions Bar -->
      <div v-if="selectedSessions.length > 0" class="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-sm font-medium text-blue-900">
            {{ selectedSessions.length }} session{{ selectedSessions.length !== 1 ? 's' : '' }} selected
          </span>
          <button
            @click="clearSelection"
            class="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear selection
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="bulkCancelSessions"
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
          >
            <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Cancel Selected
          </button>
          <button
            @click="bulkDeleteSessions"
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Selected
          </button>
        </div>
      </div>

      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 w-12">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Class Title & Level
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date & Time
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Teacher
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Enrollment
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
          <tr v-for="event in sortedCalendarEvents" :key="event.id" :class="[
            'hover:bg-gray-50',
            isSessionSelected(event.id) ? 'bg-blue-50' : ''
          ]">
            <td class="px-6 py-4">
              <input
                type="checkbox"
                :checked="isSessionSelected(event.id)"
                @change="toggleSessionSelection(event.id)"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
            </td>
            <td class="px-6 py-4">
              <div class="text-sm font-medium text-gray-900">{{ event.title }}</div>
              <div class="text-sm text-gray-500">
                <span 
                  v-for="level in event.levels" 
                  :key="level.id"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mr-1"
                >
                  {{ level.code }}
                </span>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-900">{{ formatDate(event.startUtc) }}</div>
              <div class="text-sm text-gray-500">{{ formatTime(event.startUtc) }} - {{ formatTime(event.endUtc) }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
              {{ getTeacherName(event.teacherId) }}
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-900">
                {{ event.enrolledCount }} / {{ event.capacityMax }}
              </div>
              <div class="text-xs text-gray-500">
                {{ event.capacityMax - event.enrolledCount }} spots left
              </div>
            </td>
            <td class="px-6 py-4">
              <span :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                event.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' :
                event.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              ]">
                {{ event.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-right text-sm font-medium">
              <button
                @click="viewSessionDetails(event)"
                class="text-blue-600 hover:text-blue-900"
                title="View Details"
              >
                View
              </button>
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
      :levels="levels"
      :teachers="teachers"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import GroupClassModal from './GroupClassModal.vue';
import GroupClassSessionsModal from './GroupClassSessionsModal.vue';
import { type LevelDto, type PublicTeacherDto } from '@thrive/shared';
import { thriveClient } from '@wp-shared/thrive';

// Declare the web component type for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'thrive-calendar': any;
    }
  }
}

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
  levels: LevelDto[];
  capacityMax: number;
  teachers: GroupClassTeacher[];
  upcomingSessionsCount: number;
  isActive: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  startUtc: string;
  endUtc: string;
  type: 'class';
  classType: 'GROUP';
  teacherId: string;
  capacityMax: number;
  enrolledCount: number;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  groupClassId: number;
  groupClassTitle: string;
  levels: Array<{ id: number; code: string; name: string }>;
  meetingUrl?: string;
  description?: string;
}

export default defineComponent({
  name: 'GroupClasses',
  components: {
    GroupClassModal,
    GroupClassSessionsModal,
  },
  setup() {
    const groupClasses = ref<GroupClass[]>([]);
    const calendarEvents = ref<CalendarEvent[]>([]);
    const levels = ref<LevelDto[]>([]);
    const teachers = ref<PublicTeacherDto[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const calendarRef = ref<any>(null);
    const viewMode = ref<'calendar' | 'table'>('calendar');
    const selectedSessions = ref<string[]>([]);

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
        console.log('Fetched levels:', data);
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

    const loadCalendarSessions = async () => {
      loading.value = true;
      error.value = null;

      try {
        const params = new URLSearchParams();
        if (filters.value.levelId) params.append('levelIds', filters.value.levelId);
        if (filters.value.teacherId) params.append('teacherId', filters.value.teacherId);
        if (filters.value.activeOnly) params.append('isActive', 'true');

        // Get the date range from the calendar if available
        if (calendarRef.value && calendarRef.value.fromDate && calendarRef.value.untilDate) {
          params.append('startDate', calendarRef.value.fromDate);
          params.append('endDate', calendarRef.value.untilDate);
        }

        const response = await fetch(`/api/group-classes/sessions?${params}`, {
          credentials: 'same-origin',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        calendarEvents.value = data;
      } catch (err: any) {
        error.value = err.message || 'Failed to load group class sessions';
      } finally {
        loading.value = false;
      }
    };

    const handleCalendarNavigate = () => {
      // Wait a tick for the calendar to update its date range
      setTimeout(() => {
        loadCalendarSessions();
      }, 50);
    };

    const sortedCalendarEvents = computed(() => {
      return [...calendarEvents.value].sort((a, b) => {
        return new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime();
      });
    });

    const formatDate = (isoString: string): string => {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const formatTime = (isoString: string): string => {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const getTeacherName = (teacherId: string): string => {
      const teacher = teachers.value.find(t => t.id === parseInt(teacherId));
      return teacher ? teacher.displayName : 'Unknown';
    };

    const handleEventClick = (event: CustomEvent) => {
      const calendarEvent = event.detail.event as CalendarEvent;
      viewSessionDetails(calendarEvent);
    };

    const viewSessionDetails = (calendarEvent: CalendarEvent) => {
      // Find the group class from the event
      const groupClass: GroupClass = {
        id: calendarEvent.groupClassId,
        title: calendarEvent.groupClassTitle,
        description: calendarEvent.description || null,
        levels: calendarEvent.levels.map(l => ({
          ...l,
          description: null,
          sortOrder: 0,
          isActive: true
        })),
        capacityMax: calendarEvent.capacityMax,
        teachers: [], // We don't have full teacher data in the event
        upcomingSessionsCount: 1,
        isActive: true
      };

      selectedGroupClass.value = groupClass;
      showSessionsModal.value = true;
    };

    // Selection helpers
    const isSessionSelected = (sessionId: string): boolean => {
      return selectedSessions.value.includes(sessionId);
    };

    const toggleSessionSelection = (sessionId: string) => {
      const index = selectedSessions.value.indexOf(sessionId);
      if (index > -1) {
        selectedSessions.value.splice(index, 1);
      } else {
        selectedSessions.value.push(sessionId);
      }
    };

    const isAllSelected = computed(() => {
      return sortedCalendarEvents.value.length > 0 && 
             selectedSessions.value.length === sortedCalendarEvents.value.length;
    });

    const toggleSelectAll = () => {
      if (isAllSelected.value) {
        selectedSessions.value = [];
      } else {
        selectedSessions.value = sortedCalendarEvents.value.map(e => e.id);
      }
    };

    const clearSelection = () => {
      selectedSessions.value = [];
    };

    // Bulk actions
    const bulkCancelSessions = async () => {
      if (!confirm(`Are you sure you want to cancel ${selectedSessions.value.length} session(s)? Students will be notified.`)) {
        return;
      }

      loading.value = true;
      error.value = null;

      try {
        const promises = selectedSessions.value.map(sessionId =>
          fetch(`/api/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ status: 'CANCELLED' }),
          })
        );

        const results = await Promise.allSettled(promises);
        const failed = results.filter(r => r.status === 'rejected').length;

        if (failed > 0) {
          error.value = `Failed to cancel ${failed} session(s)`;
        }

        selectedSessions.value = [];
        await loadCalendarSessions();
      } catch (err: any) {
        error.value = err.message || 'Failed to cancel sessions';
      } finally {
        loading.value = false;
      }
    };

    const bulkDeleteSessions = async () => {
      if (!confirm(`Are you sure you want to DELETE ${selectedSessions.value.length} session(s)? This action cannot be undone and will affect enrolled students.`)) {
        return;
      }

      loading.value = true;
      error.value = null;

      try {
        const promises = selectedSessions.value.map(sessionId =>
          fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
          })
        );

        const results = await Promise.allSettled(promises);
        const failed = results.filter(r => r.status === 'rejected').length;

        if (failed > 0) {
          error.value = `Failed to delete ${failed} session(s)`;
        }

        selectedSessions.value = [];
        await loadCalendarSessions();
      } catch (err: any) {
        error.value = err.message || 'Failed to delete sessions';
      } finally {
        loading.value = false;
      }
    };

    const closeModal = () => {
      showCreateModal.value = false;
      showEditModal.value = false;
      selectedGroupClass.value = null;
    };

    const handleSave = async () => {
      await loadCalendarSessions();
      closeModal();
    };

    onMounted(async () => {
      await Promise.all([loadLevels(), loadTeachers()]);
      // Wait for the calendar to be rendered and get initial data
      setTimeout(() => {
        loadCalendarSessions();
      }, 100);
    });

    return {
      groupClasses,
      calendarEvents,
      calendarRef,
      levels,
      teachers,
      loading,
      error,
      filters,
      viewMode,
      sortedCalendarEvents,
      showCreateModal,
      showEditModal,
      showSessionsModal,
      selectedGroupClass,
      selectedSessions,
      loadCalendarSessions,
      handleEventClick,
      handleCalendarNavigate,
      formatDate,
      formatTime,
      getTeacherName,
      viewSessionDetails,
      isSessionSelected,
      toggleSessionSelection,
      isAllSelected,
      toggleSelectAll,
      clearSelection,
      bulkCancelSessions,
      bulkDeleteSessions,
      closeModal,
      handleSave,
    };
  },
});
</script>
