<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
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
        <div v-for="teacher in teachers" :key="teacher.id" class="flex items-center justify-between">
          <label class="flex items-center cursor-pointer">
            <input
              type="checkbox"
              :value="teacher.id"
              v-model="form.teacherIds"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span class="ml-2 text-sm text-gray-700">{{ teacher.displayName }}</span>
          </label>
          <label v-if="form.teacherIds.includes(teacher.id)" class="flex items-center text-xs cursor-pointer">
            <input
              type="radio"
              name="primaryTeacher"
              :value="teacher.id"
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
      <div v-for="(session, index) in form.sessions" :key="index" class="border border-gray-200 rounded-lg p-4 space-y-4">
        <div class="flex justify-between items-start">
          <h5 class="text-sm font-medium text-gray-700">Session {{ index + 1 }}</h5>
          <button
            type="button"
            @click="removeSession(index)"
            class="text-red-600 hover:text-red-800"
            :disabled="form.sessions.length === 1"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ClassDateTimePicker
          :model-value="session.startAt"
          :duration="session.duration"
          label="Session Start"
          show-duration
          @update:model-value="(val: string) => session.startAt = val"
          @update:duration="(val: number) => session.duration = val"
        />

        <div v-if="getSessionEndAt(session) !== '—'" class="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p class="text-sm text-blue-900">
            <span class="font-medium">End Time:</span> {{ getSessionEndAt(session) }}
          </p>
        </div>
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

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="sessionTime" class="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
          <select
            id="sessionTime"
            v-model="form.recurring.startTime"
            required
            class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a time...</option>
            <optgroup label="Morning">
              <option v-for="time in morningTimes" :key="`morning-${time}`" :value="time">
                {{ time }}
              </option>
            </optgroup>
            <optgroup label="Afternoon">
              <option v-for="time in afternoonTimes" :key="`afternoon-${time}`" :value="time">
                {{ time }}
              </option>
            </optgroup>
            <optgroup label="Evening">
              <option v-for="time in eveningTimes" :key="`evening-${time}`" :value="time">
                {{ time }}
              </option>
            </optgroup>
          </select>
        </div>

        <div>
          <label for="duration" class="block text-sm font-medium text-gray-700">Duration (minutes) *</label>
          <div class="flex gap-2 mt-1">
            <button
              v-for="duration in [30, 45, 60]"
              :key="duration"
              type="button"
              @click="form.recurring.duration = duration"
              :class="[
                'flex-1 py-2 px-3 rounded-md text-sm font-medium transition',
                form.recurring.duration === duration
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-50',
              ]"
            >
              {{ duration }}m
            </button>
            <input
              v-model.number="form.recurring.duration"
              type="number"
              min="15"
              step="15"
              required
              class="w-20 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Custom"
            />
          </div>
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

    <!-- Actions Slot -->
    <slot name="actions" :is-valid="isFormValid" :is-submitting="submitting">
      <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="submitting || !isFormValid"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <span v-if="submitting" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
          {{ submitting ? 'Saving...' : (mode === 'edit' ? 'Update' : 'Create') }}
        </button>
      </div>
    </slot>
  </form>
</template>

<script lang="ts">
import { LevelDto, PublicTeacherDto } from '@thrive/shared';
import { defineComponent, ref, computed, PropType, watch } from 'vue';
import ClassDateTimePicker from './ClassDateTimePicker.vue';


interface Session {
  startAt: string;
  duration: number;
}

interface GroupClassFormData {
  title: string;
  description: string;
  levelIds: number[];
  capacityMax: number;
  teacherIds: number[];
  primaryTeacherId: number | null;
  scheduleType: 'oneoff' | 'recurring';
  sessions: Session[];
  recurring: {
    daysOfWeek: string[];
    startTime: string;
    duration: number;
    startDate: string;
    endDate: string;
  };
}

export default defineComponent({
  name: 'GroupClassFormComponent',
  components: {
    ClassDateTimePicker,
  },
  props: {
    groupClass: {
      type: Object as PropType<any | null>,
      default: null,
    },
    levels: {
      type: Array as PropType<LevelDto[]>,
      required: true,
    },
    teachers: {
      type: Array as PropType<PublicTeacherDto[]>,
      required: true,
    },
    defaultValues: {
      type: Object as PropType<Partial<GroupClassFormData>>,
      default: () => ({}),
    },
    mode: {
      type: String as PropType<'create' | 'edit'>,
      default: 'create',
    },
    courseContext: {
      type: Object as PropType<{ courseProgramId: number; stepId: number } | null>,
      default: null,
    },
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {

    console.log("GroupClassFormComponent props teachers:", props.teachers);

    watch(() => props.teachers, (teachers) => {
      console.log('Teacher IDs changed:', teachers);
    });


    const submitting = ref(false);
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

    const morningTimes = [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'
    ];

    const afternoonTimes = [
      '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];

    const eveningTimes = [
      '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
    ];

    const form = ref<GroupClassFormData>({
      title: '',
      description: '',
      levelIds: [],
      capacityMax: 6,
      teacherIds: [],
      primaryTeacherId: null,
      scheduleType: 'recurring',
      sessions: [{ startAt: '', duration: 60 }],
      recurring: {
        daysOfWeek: [],
        startTime: '14:00',
        duration: 60,
        startDate: '',
        endDate: '',
      },
    });

    // Compute endAt based on startAt and duration
    const getSessionEndAt = (session: Session): string => {
      if (!session.startAt || !session.duration) {
        return '—';
      }
      const startDate = new Date(session.startAt);
      const endDate = new Date(startDate.getTime() + (session.duration * 60000));
      return endDate.toLocaleString("en-UK", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    // Initialize form from groupClass or defaultValues
    const initializeForm = () => {
      if (props.groupClass) {
        form.value.title = props.groupClass.title;
        form.value.description = props.groupClass.description || '';
        form.value.levelIds = props.groupClass.levels.map((l: any) => l.id);
        form.value.capacityMax = props.groupClass.capacityMax;
        form.value.teacherIds = props.groupClass.teachers.map((t: any) => t.teacherId);
        form.value.primaryTeacherId = props.groupClass.teachers.find((t: any) => t.isPrimary)?.teacherId || null;
        form.value.scheduleType = props.groupClass.rrule ? 'recurring' : 'oneoff';
      }

      // Apply default values (these override groupClass if both exist)
      if (props.defaultValues) {
        Object.assign(form.value, props.defaultValues);
      }
    };

    initializeForm();

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
        console.log("Form invalid: missing title, levels, or teachers");
        return false;
      }

      if (form.value.scheduleType === 'recurring') {
        console.log("Form validity (recurring):", form.value.recurring);
        return form.value.recurring.daysOfWeek.length > 0 &&
               form.value.recurring.startTime &&
               form.value.recurring.startDate &&
               form.value.recurring.endDate;
      } else {
        console.log("Form validity (oneoff):", form.value.sessions);
        return form.value.sessions.length > 0 &&
               form.value.sessions.every(s => s.startAt && s.duration);
      }
    });

    const addSession = () => {
      form.value.sessions.push({ startAt: '', duration: 60 });
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
      submitting.value = true;

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
          // Compute endAt for each session before sending
          payload.sessions = form.value.sessions.map(session => {
            const startDate = new Date(session.startAt);
            const endDate = new Date(startDate.getTime() + (session.duration * 60000));
            return {
              startAt: session.startAt,
              endAt: endDate.toISOString().slice(0, 16),
            };
          });
        }

        // Add course context if provided
        if (props.courseContext) {
          payload.courseContext = props.courseContext;
        }

        emit('submit', payload);
      } catch (err: any) {
        error.value = err.message || 'Failed to submit form';
      } finally {
        submitting.value = false;
      }
    };

    return {
      form,
      submitting,
      error,
      daysOfWeek,
      morningTimes,
      afternoonTimes,
      eveningTimes,
      isFormValid,
      addSession,
      removeSession,
      handleSubmit,
      getSessionEndAt,
    };
  },
});
</script>
