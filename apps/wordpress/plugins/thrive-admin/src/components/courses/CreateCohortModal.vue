<template>
  <div
    v-if="course"
    class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[60]"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ (cohort && 'id' in cohort) ? 'Edit Cohort' : 'Create New Cohort' }}
        </h3>
      </div>

      <form @submit.prevent="handleSubmit" class="px-6 py-4 space-y-4">
        <!-- Cohort Name -->
        <div>
          <label for="cohortName" class="block text-sm font-medium text-gray-700">
            Cohort Name *
          </label>
          <input
            id="cohortName"
            v-model="form.name"
            type="text"
            required
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., Fall 2025 Cohort, Spring 2026 Cohort"
          />
        </div>

        <!-- Description -->
        <div>
          <label for="cohortDescription" class="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="cohortDescription"
            v-model="form.description"
            rows="3"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Optional description for students"
          ></textarea>
        </div>

        <!-- Date Range -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="startDate" class="block text-sm font-medium text-gray-700">
              Start Date *
            </label>
            <input
              id="startDate"
              v-model="form.startDate"
              type="date"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">First session date</p>
          </div>
          <div>
            <label for="endDate" class="block text-sm font-medium text-gray-700">
              End Date *
            </label>
            <input
              id="endDate"
              v-model="form.endDate"
              type="date"
              required
              :min="form.startDate"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">Last session date</p>
          </div>
        </div>

        <!-- Timezone -->
        <div>
          <label for="timezone" class="block text-sm font-medium text-gray-700">
            Timezone
          </label>
          <select
            id="timezone"
            v-model="form.timezone"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="America/New_York">America/New York (EST/EDT)</option>
            <option value="America/Chicago">America/Chicago (CST/CDT)</option>
            <option value="America/Denver">America/Denver (MST/MDT)</option>
            <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            <option value="Australia/Sydney">Australia/Sydney (AEDT/AEST)</option>
          </select>
        </div>

        <!-- Maximum Enrollment -->
        <div>
          <label for="maxEnrollment" class="block text-sm font-medium text-gray-700">
            Maximum Enrollment *
          </label>
          <input
            id="maxEnrollment"
            v-model.number="form.maxEnrollment"
            type="number"
            min="1"
            required
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., 30"
          />
          <p class="mt-1 text-xs text-gray-500">Maximum number of students allowed in this cohort</p>
        </div>

        <!-- Enrollment Deadline -->
        <div>
          <label for="enrollmentDeadline" class="block text-sm font-medium text-gray-700">
            Enrollment Deadline
          </label>
          <input
            id="enrollmentDeadline"
            v-model="form.enrollmentDeadline"
            type="datetime-local"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p class="mt-1 text-xs text-gray-500">Last datetime students can enroll (defaults to start date)</p>
        </div>

        <!-- Is Active -->
        <div class="flex items-center">
          <input
            id="isActive"
            v-model="form.isActive"
            type="checkbox"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="isActive" class="ml-2 block text-sm text-gray-900">
            Cohort is active and available for enrollment
          </label>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : (cohort ? 'Update Cohort' : 'Create Cohort') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch, computed, type PropType } from 'vue';
import { thriveClient } from '@wp-shared/thrive';
import type { CourseProgramDetailDto, CourseCohortListItemDto } from '@thrive/shared';

interface CohortForm {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  timezone: string;
  maxEnrollment: number;
  enrollmentDeadline: string;
  isActive: boolean;
}

export default defineComponent({
  name: 'CreateCohortModal',
  props: {
    course: {
      type: Object as PropType<CourseProgramDetailDto | null>,
      default: null
    },
    cohort: {
      type: Object as PropType<CourseCohortListItemDto | null>,
      default: null
    }
  },
  emits: ['close', 'cohort-saved'],
  setup(props, { emit }) {
    const saving = ref(false);
    const error = ref<string | null>(null);

    const form: CohortForm = reactive({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      timezone: 'America/New_York',
      maxEnrollment: 30,
      enrollmentDeadline: '',
      isActive: true
    });

    const resetForm = () => {
      form.name = '';
      form.description = '';
      form.startDate = '';
      form.endDate = '';
      form.timezone = props.course?.timezone || 'America/New_York';
      form.maxEnrollment = 30;
      form.enrollmentDeadline = '';
      form.isActive = true;
    };

    const populateForm = (cohort: CourseCohortListItemDto) => {
      form.name = cohort.name;
      form.description = cohort.description || '';
      form.startDate = cohort.startDate;
      form.endDate = cohort.endDate;
      form.timezone = cohort.timezone;
      form.maxEnrollment = cohort.maxEnrollment;
      form.enrollmentDeadline = cohort.enrollmentDeadline
        ? new Date(cohort.enrollmentDeadline).toISOString().slice(0, 16)
        : '';
      form.isActive = cohort.isActive;
    };

    const handleSubmit = async () => {
      if (!props.course) return;

      saving.value = true;
      error.value = null;

      try {
        const payload = {
          name: form.name,
          description: form.description || null,
          startDate: form.startDate,
          endDate: form.endDate,
          timezone: form.timezone,
          maxEnrollment: form.maxEnrollment,
          enrollmentDeadline: form.enrollmentDeadline
            ? new Date(form.enrollmentDeadline).toISOString()
            : null,
          isActive: form.isActive
        };

        if (props.cohort && 'id' in props.cohort) {
          await thriveClient.updateCourseCohort(props.cohort.id, payload);
        } else {
          await thriveClient.createCourseCohort(props.course.id, payload);
        }

        emit('cohort-saved');
        emit('close');
        resetForm();
      } catch (err: any) {
        error.value = err.message || 'Failed to save cohort';
      } finally {
        saving.value = false;
      }
    };

    watch(() => props.cohort, (newCohort) => {
      if (newCohort && 'id' in newCohort) {
        populateForm(newCohort);
      } else {
        resetForm();
      }
    }, { immediate: true });

    watch(() => props.course, (newCourse) => {
      if (newCourse && !props.cohort) {
        form.timezone = newCourse.timezone;
      }
    }, { immediate: true });

    return {
      form,
      saving,
      error,
      handleSubmit
    };
  }
});
</script>
