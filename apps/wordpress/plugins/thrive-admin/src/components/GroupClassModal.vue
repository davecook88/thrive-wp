<template>
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
        <h3 class="text-lg font-medium text-gray-900">
          {{ isEdit ? 'Edit Group Class' : 'Create Group Class' }}
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-500">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="px-6 py-4 space-y-6">
        <!-- Basic Information -->
        <div>
          <h4 class="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="title" class="block text-sm font-medium text-gray-700">Title *</label>
              <input
                id="title"
                v-model="form.title"
                type="text"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Spanish Conversation B1"
              />
            </div>

            <div>
              <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                v-model="form.description"
                rows="3"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the class"
              ></textarea>
            </div>

            <div>
              <label for="capacity" class="block text-sm font-medium text-gray-700">Max Capacity *</label>
              <input
                id="capacity"
                v-model.number="form.capacityMax"
                type="number"
                min="2"
                max="50"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- Levels -->
        <div>
          <h4 class="text-md font-medium text-gray-900 mb-3">Levels * <span class="text-sm text-gray-500 font-normal">(Select one or more)</span></h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <label v-for="level in levels" :key="level.id" class="flex items-center cursor-pointer p-2 border rounded hover:bg-gray-50" :class="form.levelIds.includes(level.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-300'">
              <input
                type="checkbox"
                :value="level.id"
                v-model="form.levelIds"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span class="ml-2 text-sm text-gray-700">
                <span class="font-medium">{{ level.code }}</span> - {{ level.name }}
              </span>
            </label>
          </div>
          <p v-if="form.levelIds.length === 0" class="mt-1 text-sm text-red-600">
            Please select at least one level
          </p>
        </div>

        <!-- Teachers -->
        <div>
          <h4 class="text-md font-medium text-gray-900 mb-3">Teachers *</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
            <div v-for="teacher in teachers" :key="teacher.teacherId" class="flex items-center justify-between">
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  :value="teacher.teacherId"
                  v-model="form.teacherIds"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span class="ml-2 text-sm text-gray-700">{{ teacher.name }}</span>
              </label>
              <label v-if="form.teacherIds.includes(teacher.teacherId)" class="flex items-center text-xs cursor-pointer">
                <input
                  type="radio"
                  name="primaryTeacher"
                  :value="teacher.teacherId"
                  v-model.number="form.primaryTeacherId"
                  class="h-3 w-3 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-1 text-gray-500">Primary</span>
              </label>
            </div>
          </div>
          <p v-if="form.teacherIds.length === 0" class="mt-1 text-sm text-red-600">
            Please select at least one teacher
          </p>
        </div>

        <!-- Schedule Type -->
        <div>
          <h4 class="text-md font-medium text-gray-900 mb-3">Schedule Type *</h4>
          <div class="flex gap-4">
            <label class="flex items-center cursor-pointer">
              <input
                type="radio"
                v-model="form.scheduleType"
                value="oneoff"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-700">One-off Sessions</span>
            </label>
            <label class="flex items-center cursor-pointer">
              <input
                type="radio"
                v-model="form.scheduleType"
                value="recurring"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span class="ml-2 text-gray-700">Recurring</span>
            </label>
          </div>
        </div>

        <!-- One-off Sessions -->
        <div v-if="form.scheduleType === 'oneoff'" class="space-y-3">
          <div class="flex justify-between items-center">
            <h4 class="text-md font-medium text-gray-900">Sessions</h4>
            <button
              type="button"
              @click="addSession"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add Session
            </button>
          </div>
          <div v-for="(session, index) in form.sessions" :key="index" class="flex gap-2 items-start">
            <div class="flex-1 grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-gray-600">Start Date/Time</label>
                <input
                  v-model="session.startAt"
                  type="datetime-local"
                  required
                  class="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-600">End Date/Time</label>
                <input
                  v-model="session.endAt"
                  type="datetime-local"
                  required
                  class="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              type="button"
              @click="removeSession(index)"
              class="mt-6 text-red-600 hover:text-red-800"
              :disabled="form.sessions.length === 1"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Recurring Schedule -->
        <div v-if="form.scheduleType === 'recurring'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Days of Week *</label>
            <div class="flex flex-wrap gap-2">
              <label v-for="day in daysOfWeek" :key="day.value" class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  :value="day.value"
                  v-model="form.recurring.daysOfWeek"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span class="ml-1 text-sm text-gray-700">{{ day.label }}</span>
              </label>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="sessionTime" class="block text-sm font-medium text-gray-700">Start Time *</label>
              <input
                id="sessionTime"
                v-model="form.recurring.startTime"
                type="time"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label for="duration" class="block text-sm font-medium text-gray-700">Duration (minutes) *</label>
              <input
                id="duration"
                v-model.number="form.recurring.duration"
                type="number"
                min="15"
                step="15"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="startDate" class="block text-sm font-medium text-gray-700">Start Date *</label>
              <input
                id="startDate"
                v-model="form.recurring.startDate"
                type="date"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label for="endDate" class="block text-sm font-medium text-gray-700">End Date *</label>
              <input
                id="endDate"
                v-model="form.recurring.endDate"
                type="date"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="saving || !isFormValid"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <span v-if="saving" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            {{ saving ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType, watch } from 'vue';
import { GroupClass } from './GroupClasses.vue';
import type { Level, Teacher } from '../lib/types/calendar';

interface Session {
  startAt: string;
  endAt: string;
}

export default defineComponent({
  name: 'GroupClassModal',
  props: {
    groupClass: {
      type: Object as PropType<GroupClass | null>,
      default: null,
    },
    levels: {
      type: Array as PropType<Level[]>,
      required: true,
    },
    teachers: {
      type: Array as PropType<Teacher[]>,
      required: true,
    },
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    console.log('GroupClassModal props:', JSON.stringify(props));
    const isEdit = computed(() => props.groupClass !== null);
    const saving = ref(false);
    const error = ref<string | null>(null);

    const daysOfWeek = [
      { value: 'MO', label: 'Mon' },
      { value: 'TU', label: 'Tue' },
      { value: 'WE', label: 'Wed' },
      { value: 'TH', label: 'Thu' },
      { value: 'FR', label: 'Fri' },
      { value: 'SA', label: 'Sat' },
      { value: 'SU', label: 'Sun' },
    ];

    const form = ref({
      title: '',
      description: '',
      levelIds: [] as number[],
      capacityMax: 6,
      teacherIds: [] as number[],
      primaryTeacherId: null as number | null,
      scheduleType: 'recurring' as 'oneoff' | 'recurring',
      sessions: [{ startAt: '', endAt: '' }] as Session[],
      recurring: {
        daysOfWeek: [] as string[],
        startTime: '14:00',
        duration: 60,
        startDate: '',
        endDate: '',
      },
    });

    // Initialize form if editing
    if (props.groupClass) {
      form.value.title = props.groupClass.title;
      form.value.description = props.groupClass.description || '';
      // TODO: Load levelIds from groupClassLevels when editing
      form.value.levelIds = props.groupClass.levels.map(l => l.id);
      form.value.capacityMax = props.groupClass.capacityMax;
      form.value.teacherIds = props.groupClass.teachers.map(t => t.teacherId);
      form.value.primaryTeacherId = props.groupClass.teachers.find(t => t.isPrimary)?.teacherId || null;
      form.value.scheduleType = props.groupClass.rrule ? 'recurring' : 'oneoff';
    }

    // Auto-set first selected teacher as primary
    watch(() => form.value.teacherIds, (newIds) => {
      if (newIds.length > 0 && !newIds.includes(form.value.primaryTeacherId as number)) {
        form.value.primaryTeacherId = newIds[0];
      } else if (newIds.length === 0) {
        form.value.primaryTeacherId = null;
      }
    });

    const isFormValid = computed(() => {
      if (!form.value.title || form.value.levelIds.length === 0 || form.value.teacherIds.length === 0) {
        return false;
      }

      if (form.value.scheduleType === 'recurring') {
        return form.value.recurring.daysOfWeek.length > 0 &&
               form.value.recurring.startTime &&
               form.value.recurring.startDate &&
               form.value.recurring.endDate;
      } else {
        return form.value.sessions.length > 0 &&
               form.value.sessions.every(s => s.startAt && s.endAt);
      }
    });

    const addSession = () => {
      form.value.sessions.push({ startAt: '', endAt: '' });
    };

    const removeSession = (index: number) => {
      if (form.value.sessions.length > 1) {
        form.value.sessions.splice(index, 1);
      }
    };

    const buildRRule = (): string => {
      const { daysOfWeek, endDate } = form.value.recurring;
      const endDateObj = new Date(endDate);
      const untilStr = endDateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      return `FREQ=WEEKLY;BYDAY=${daysOfWeek.join(',')};UNTIL=${untilStr}`;
    };

    const handleSubmit = async () => {
      error.value = null;
      saving.value = true;

      try {
        const payload: any = {
          title: form.value.title,
          description: form.value.description || null,
          levelIds: form.value.levelIds,
          capacityMax: form.value.capacityMax,
          teacherIds: form.value.teacherIds,
          primaryTeacherId: form.value.primaryTeacherId,
        };

        if (form.value.scheduleType === 'recurring') {
          payload.rrule = buildRRule();
          payload.startDate = form.value.recurring.startDate;
          payload.endDate = form.value.recurring.endDate;
          payload.sessionStartTime = form.value.recurring.startTime;
          payload.sessionDuration = form.value.recurring.duration;
        } else {
          payload.sessions = form.value.sessions;
        }

        const url = isEdit.value
          ? `/api/group-classes/${props.groupClass!.id}`
          : '/api/group-classes';
        const method = isEdit.value ? 'PATCH' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        emit('save', result);
        emit('close');
      } catch (err: any) {
        error.value = err.message || 'Failed to save group class';
      } finally {
        saving.value = false;
      }
    };

    return {
      isEdit,
      form,
      saving,
      error,
      daysOfWeek,
      isFormValid,
      addSession,
      removeSession,
      handleSubmit,
    };
  },
});
</script>
