<template>
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[70] p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h3 class="text-lg font-medium text-gray-900">
          Edit Session
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-500">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="px-6 py-4 space-y-6">
        <!-- Date & Time -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="startAt" class="block text-sm font-medium text-gray-700">Start Date/Time *</label>
            <input
              id="startAt"
              v-model="form.startAt"
              type="datetime-local"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label for="endAt" class="block text-sm font-medium text-gray-700">End Date/Time *</label>
            <input
              id="endAt"
              v-model="form.endAt"
              type="datetime-local"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Teacher Selection -->
        <div v-if="availableTeachers && availableTeachers.length > 0">
          <label for="teacher" class="block text-sm font-medium text-gray-700">Teacher</label>
          <select
            id="teacher"
            v-model.number="form.teacherId"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option
              v-for="teacher in availableTeachers"
              :key="teacher.id"
              :value="teacher.id"
            >
              {{ teacher.displayName }}
            </option>
          </select>
        </div>

        <!-- Capacity -->
        <div>
          <label for="capacityMax" class="block text-sm font-medium text-gray-700">Max Capacity</label>
          <input
            id="capacityMax"
            v-model.number="form.capacityMax"
            type="number"
            min="1"
            max="50"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <p class="mt-1 text-xs text-gray-500">
            Current enrollment: {{ session.enrolledCount || 0 }}
          </p>
        </div>

        <!-- Description/Notes -->
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            id="description"
            v-model="form.description"
            rows="3"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional notes about this session"
          ></textarea>
        </div>

        <!-- Meeting URL -->
        <div>
          <label for="meetingUrl" class="block text-sm font-medium text-gray-700">Meeting URL</label>
          <input
            id="meetingUrl"
            v-model="form.meetingUrl"
            type="url"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://..."
          />
        </div>

        <!-- Status -->
        <div>
          <label for="status" class="block text-sm font-medium text-gray-700">Status</label>
          <select
            id="status"
            v-model="form.status"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="SCHEDULED">Scheduled</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
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
            {{ saving ? 'Saving...' : 'Update Session' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { PublicTeacherDto, SessionDto, UpdateSessionRequest } from '@thrive/shared';
import { thriveClient } from '@wp-shared/thrive';
import { defineComponent, ref, computed, PropType, onMounted } from 'vue';

export default defineComponent({
  name: 'SessionEditorModal',
  props: {
    session: {
      type: Object as PropType<SessionDto>,
      required: true,
    },
    availableTeachers: {
      type: Array as PropType<PublicTeacherDto[]>,
      default: () => [],
    },
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const saving = ref(false);
    const error = ref<string | null>(null);

    const form = ref({
      startAt: '',
      endAt: '',
      teacherId: props.session.teacherId || null,
      capacityMax: props.session.capacityMax || 6,
      description: props.session.description || '',
      meetingUrl: props.session.meetingUrl || '',
      status: props.session.status || 'SCHEDULED',
    });

    // Initialize form with session data
    onMounted(() => {
      const startDate = typeof props.session.startAt === 'string'
        ? new Date(props.session.startAt)
        : props.session.startAt;
      const endDate = typeof props.session.endAt === 'string'
        ? new Date(props.session.endAt)
        : props.session.endAt;

      form.value.startAt = formatDateTimeLocal(startDate);
      form.value.endAt = formatDateTimeLocal(endDate);
    });

    const formatDateTimeLocal = (date: Date): string => {
      // Format date to datetime-local input format (YYYY-MM-DDTHH:mm)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const isFormValid = computed(() => {
      if (!form.value.startAt || !form.value.endAt) {
        return false;
      }
      const start = new Date(form.value.startAt);
      const end = new Date(form.value.endAt);
      return end > start;
    });

    const handleSubmit = async () => {
      error.value = null;
      saving.value = true;

      try {
        const payload: UpdateSessionRequest = {
          startAt: new Date(form.value.startAt).toISOString(),
          endAt: new Date(form.value.endAt).toISOString(),
          status: form.value.status as 'SCHEDULED' | 'CANCELLED' | 'COMPLETED',
        };

        if (form.value.teacherId) {
          payload.teacherId = form.value.teacherId;
        }

        if (form.value.capacityMax) {
          payload.capacityMax = form.value.capacityMax;
        }

        if (form.value.description) {
          payload.description = form.value.description;
        }

        if (form.value.meetingUrl) {
          payload.meetingUrl = form.value.meetingUrl;
        }

        const result = await thriveClient.updateSession(props.session.id, payload);

        if (!result) {
          throw new Error('Failed to update session');
        }

        emit('save', result);
        emit('close');
      } catch (err: any) {
        error.value = err.message || 'Failed to update session';
      } finally {
        saving.value = false;
      }
    };

    return {
      form,
      saving,
      error,
      isFormValid,
      handleSubmit,
    };
  },
});
</script>
