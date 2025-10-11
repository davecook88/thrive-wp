<template>
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-medium text-gray-900">Sessions: {{ groupClass.title }}</h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ groupClass.levels.map(level => level.code).join(', ') }} • Max {{ groupClass.capacityMax }} students
          </p>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-500">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Actions Bar -->
      <div class="border-b border-gray-200 px-6 py-3 bg-gray-50 flex justify-between items-center">
        <div class="flex gap-2">
          <button
            v-if="groupClass.rrule"
            @click="regenerateSessions"
            :disabled="regenerating"
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ regenerating ? 'Regenerating...' : 'Regenerate Sessions' }}
          </button>
          <button
            @click="loadSessions"
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <span class="text-sm text-gray-600">
          {{ sessions.length }} session{{ sessions.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex-1 flex items-center justify-center py-12">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Loading sessions...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex-1 px-6 py-4">
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <p class="text-red-800">{{ error }}</p>
          <button @click="loadSessions" class="mt-2 text-sm text-red-600 hover:text-red-800 underline">
            Try again
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="sessions.length === 0" class="flex-1 flex items-center justify-center py-12">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="mt-4 text-gray-500">No sessions found</p>
          <button
            v-if="groupClass.rrule"
            @click="regenerateSessions"
            class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Generate Sessions from Schedule
          </button>
        </div>
      </div>

      <!-- Sessions Table -->
      <div v-else class="flex-1 overflow-y-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enrollment
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Waitlist
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
            <tr v-for="session in sessions" :key="session.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">
                  {{ formatDate(session.startAt) }}
                </div>
                <div class="text-sm text-gray-500">
                  {{ formatTime(session.startAt) }} - {{ formatTime(session.endAt) }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">
                  {{ session.enrolledCount }} / {{ groupClass.capacityMax }}
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    class="h-2 rounded-full"
                    :class="session.enrolledCount >= groupClass.capacityMax ? 'bg-red-600' : 'bg-blue-600'"
                    :style="{ width: `${(session.enrolledCount / groupClass.capacityMax) * 100}%` }"
                  ></div>
                </div>
              </td>
              <td class="px-6 py-4">
                <button
                  v-if="session.waitlistCount > 0"
                  @click="viewWaitlist(session)"
                  class="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {{ session.waitlistCount }} waiting
                </button>
                <span v-else class="text-sm text-gray-400">-</span>
              </td>
              <td class="px-6 py-4">
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  session.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' :
                  session.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                  session.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                ]">
                  {{ session.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right text-sm font-medium">
                <button
                  v-if="session.status === 'SCHEDULED'"
                  @click="cancelSession(session)"
                  class="text-red-600 hover:text-red-900"
                >
                  Cancel
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <button
          @click="$emit('close')"
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Waitlist Modal -->
    <div v-if="showWaitlistModal && selectedSession" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[60]">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h4 class="text-lg font-medium text-gray-900">
            Waitlist for {{ formatDate(selectedSession.startAt) }}
          </h4>
          <button @click="showWaitlistModal = false" class="text-gray-400 hover:text-gray-500">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="px-6 py-4">
          <div v-if="loadingWaitlist" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
          <div v-else-if="waitlistEntries.length === 0" class="text-center py-8 text-gray-500">
            No students on waitlist
          </div>
          <table v-else class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notified</th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="entry in waitlistEntries" :key="entry.id">
                <td class="px-4 py-3 text-sm text-gray-900">{{ entry.position }}</td>
                <td class="px-4 py-3 text-sm text-gray-900">{{ entry.student.name }}</td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ formatDateTime(entry.createdAt) }}</td>
                <td class="px-4 py-3 text-sm">
                  <span v-if="entry.notifiedAt" class="text-green-600">
                    {{ formatDateTime(entry.notifiedAt) }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="px-4 py-3 text-right text-sm">
                  <button
                    v-if="!entry.notifiedAt"
                    @click="notifyWaitlist(entry)"
                    class="text-blue-600 hover:text-blue-800 mr-2"
                  >
                    Notify
                  </button>
                  <button
                    @click="promoteWaitlist(entry)"
                    class="text-green-600 hover:text-green-800"
                  >
                    Promote
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, PropType } from 'vue';
import { GroupClass } from './GroupClasses.vue';


interface Session {
  id: number;
  startAt: string;
  endAt: string;
  status: string;
  enrolledCount: number;
  waitlistCount: number;
}

interface WaitlistEntry {
  id: number;
  position: number;
  student: { name: string };
  createdAt: string;
  notifiedAt: string | null;
}

export default defineComponent({
  name: 'GroupClassSessionsModal',
  props: {
    groupClass: {
      type: Object as PropType<GroupClass>,
      required: true,
    },
  },
  emits: ['close'],
  setup(props) {
    const sessions = ref<Session[]>([]);
    const loading = ref(false);
    const regenerating = ref(false);
    const error = ref<string | null>(null);

    const showWaitlistModal = ref(false);
    const selectedSession = ref<Session | null>(null);
    const waitlistEntries = ref<WaitlistEntry[]>([]);
    const loadingWaitlist = ref(false);

    const loadSessions = async () => {
      loading.value = true;
      error.value = null;

      try {
        const response = await fetch(`/api/group-classes/${props.groupClass.id}`, {
          credentials: 'same-origin',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        sessions.value = data.sessions || [];
      } catch (err: any) {
        error.value = err.message || 'Failed to load sessions';
      } finally {
        loading.value = false;
      }
    };

    const regenerateSessions = async () => {
      if (!confirm('This will generate new sessions based on the schedule. Continue?')) {
        return;
      }

      regenerating.value = true;
      error.value = null;

      try {
        const response = await fetch(`/api/group-classes/${props.groupClass.id}/generate-sessions`, {
          method: 'POST',
          credentials: 'same-origin',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        await loadSessions();
      } catch (err: any) {
        error.value = err.message || 'Failed to regenerate sessions';
      } finally {
        regenerating.value = false;
      }
    };

    const cancelSession = async (session: Session) => {
      if (!confirm(`Cancel session on ${formatDate(session.startAt)}?`)) {
        return;
      }

      try {
        const response = await fetch(`/api/sessions/${session.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ status: 'CANCELLED' }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        await loadSessions();
      } catch (err: any) {
        error.value = err.message || 'Failed to cancel session';
      }
    };

    const viewWaitlist = async (session: Session) => {
      selectedSession.value = session;
      showWaitlistModal.value = true;
      loadingWaitlist.value = true;

      try {
        const response = await fetch(`/api/waitlists/session/${session.id}`, {
          credentials: 'same-origin',
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        waitlistEntries.value = await response.json();
      } catch (err) {
        console.error('Failed to load waitlist:', err);
        waitlistEntries.value = [];
      } finally {
        loadingWaitlist.value = false;
      }
    };

    const notifyWaitlist = async (entry: WaitlistEntry) => {
      try {
        const response = await fetch(`/api/waitlists/${entry.id}/notify`, {
          method: 'POST',
          credentials: 'same-origin',
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        if (selectedSession.value) {
          await viewWaitlist(selectedSession.value);
        }
      } catch (err: any) {
        alert('Failed to notify student: ' + err.message);
      }
    };

    const promoteWaitlist = async (entry: WaitlistEntry) => {
      if (!confirm(`Promote ${entry.student.name} to confirmed booking?`)) {
        return;
      }

      try {
        const response = await fetch(`/api/waitlists/${entry.id}/promote`, {
          method: 'POST',
          credentials: 'same-origin',
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        if (selectedSession.value) {
          await viewWaitlist(selectedSession.value);
        }
        await loadSessions();
      } catch (err: any) {
        alert('Failed to promote student: ' + err.message);
      }
    };

    const formatDate = (dateStr: string): string => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const formatTime = (dateStr: string): string => {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatDateTime = (dateStr: string): string => {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    onMounted(loadSessions);

    return {
      sessions,
      loading,
      regenerating,
      error,
      showWaitlistModal,
      selectedSession,
      waitlistEntries,
      loadingWaitlist,
      loadSessions,
      regenerateSessions,
      cancelSession,
      viewWaitlist,
      notifyWaitlist,
      promoteWaitlist,
      formatDate,
      formatTime,
      formatDateTime,
    };
  },
});
</script>
