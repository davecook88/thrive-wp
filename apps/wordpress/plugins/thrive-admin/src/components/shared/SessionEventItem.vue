<template>
  <!-- List Display Mode (default for tables) -->
  <tr v-if="displayMode === 'list'" class="hover:bg-gray-50">
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
        {{ session.enrolledCount || 0 }} / {{ capacityMax }}
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
        <div
          class="h-2 rounded-full"
          :class="(session.enrolledCount || 0) >= capacityMax ? 'bg-red-600' : 'bg-blue-600'"
          :style="{ width: `${((session.enrolledCount || 0) / capacityMax) * 100}%` }"
        ></div>
      </div>
    </td>
    <td class="px-6 py-4">
      <button
        v-if="session.waitlistCount && session.waitlistCount > 0"
        @click="$emit('view-waitlist', session)"
        class="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        {{ session.waitlistCount }} waiting
      </button>
      <span v-else class="text-sm text-gray-400">-</span>
    </td>
    <td class="px-6 py-4">
      <span :class="getStatusClasses(session.status)">
        {{ session.status }}
      </span>
    </td>
    <td v-if="showActions" class="px-6 py-4 text-right text-sm font-medium">
      <div class="flex items-center justify-end gap-2">
        <button
          v-if="editable && session.status === 'SCHEDULED'"
          @click="$emit('edit', session)"
          class="text-blue-600 hover:text-blue-900"
          title="Edit Session"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          v-if="editable && session.status === 'SCHEDULED'"
          @click="$emit('swap-teacher', session)"
          class="text-indigo-600 hover:text-indigo-900"
          title="Swap Teacher"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
        <button
          v-if="session.status === 'SCHEDULED'"
          @click="$emit('cancel', session)"
          class="text-red-600 hover:text-red-900"
          title="Cancel Session"
        >
          Cancel
        </button>
      </div>
    </td>
  </tr>

  <!-- Compact Display Mode (for course step options, inline lists) -->
  <div
    v-else-if="displayMode === 'compact'"
    class="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2"
  >
    <div class="flex-1">
      <div class="text-sm font-medium text-gray-900">
        {{ formatDate(session.startAt) }} {{ formatTime(session.startAt) }}
      </div>
      <div class="text-xs text-gray-500 mt-0.5">
        {{ session.enrolledCount || 0 }}/{{ capacityMax }} enrolled
        <span v-if="session.waitlistCount && session.waitlistCount > 0" class="ml-2 text-yellow-600">
          ({{ session.waitlistCount }} waiting)
        </span>
      </div>
    </div>
    <span :class="getStatusClasses(session.status)" class="text-xs">
      {{ session.status }}
    </span>
  </div>

  <!-- Calendar Display Mode (for calendar grid cells) -->
  <div
    v-else-if="displayMode === 'calendar'"
    class="p-2 bg-white border border-gray-200 rounded hover:shadow-md cursor-pointer transition-shadow"
    @click="$emit('view-details', session)"
  >
    <div class="text-xs font-medium text-gray-900 mb-1">
      {{ formatTime(session.startAt) }} - {{ formatTime(session.endAt) }}
    </div>
    <div v-if="groupClass" class="text-xs text-gray-600 mb-1">
      {{ groupClass.title }}
    </div>
    <div class="flex items-center justify-between">
      <div class="text-xs text-gray-500">
        {{ session.enrolledCount || 0 }}/{{ capacityMax }}
      </div>
      <span :class="getStatusClasses(session.status)" class="text-xs px-1 py-0.5">
        {{ getStatusIcon(session.status) }}
      </span>
    </div>
    <div v-if="session.waitlistCount && session.waitlistCount > 0" class="mt-1">
      <div class="text-xs text-yellow-600 font-medium">
        {{ session.waitlistCount }} on waitlist
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { SessionDto } from '@thrive/shared';

interface Session extends SessionDto {
  enrolledCount?: number;
  waitlistCount?: number;
  startAt: string | Date;
  endAt: string | Date;
}

interface GroupClass {
  id: number;
  title: string;
  capacityMax: number;
}

export default defineComponent({
  name: 'SessionEventItem',
  props: {
    session: {
      type: Object as PropType<Session>,
      required: true,
    },
    groupClass: {
      type: Object as PropType<GroupClass | null>,
      default: null,
    },
    displayMode: {
      type: String as PropType<'list' | 'calendar' | 'compact'>,
      default: 'list',
    },
    showActions: {
      type: Boolean,
      default: true,
    },
    editable: {
      type: Boolean,
      default: true,
    },
    capacityMax: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  emits: ['edit', 'cancel', 'view-students', 'swap-teacher', 'view-waitlist', 'view-details'],
  setup(props) {
    const formatDate = (dateStr: string | Date): string => {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const formatTime = (dateStr: string | Date): string => {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const getStatusClasses = (status: string): string => {
      const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
      const statusClasses: Record<string, string> = {
        SCHEDULED: 'bg-green-100 text-green-800',
        COMPLETED: 'bg-gray-100 text-gray-800',
        CANCELLED: 'bg-red-100 text-red-800',
      };
      return `${baseClasses} ${statusClasses[status] || 'bg-yellow-100 text-yellow-800'}`;
    };

    const getStatusIcon = (status: string): string => {
      const icons: Record<string, string> = {
        SCHEDULED: '✓',
        COMPLETED: '✓',
        CANCELLED: '✗',
      };
      return icons[status] || '?';
    };

    // Determine capacity from props or groupClass
    const getCapacityMax = (): number => {
      if (props.capacityMax) {
        return props.capacityMax;
      }
      return props.groupClass?.capacityMax || 0;
    };

    return {
      formatDate,
      formatTime,
      getStatusClasses,
      getStatusIcon,
      capacityMax: getCapacityMax(),
    };
  },
});
</script>
