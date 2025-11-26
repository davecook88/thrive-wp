<template>
  <div
    v-if="course"
    class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[60] p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 class="text-2xl font-bold text-gray-900">
          {{ (cohort && 'id' in cohort) ? 'Edit Cohort' : 'Create New Cohort' }}
        </h3>
        <p class="mt-1 text-sm text-gray-600">{{ course.title }}</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <!-- Cohort Name -->
        <div>
          <label for="cohortName" class="block text-sm font-semibold text-gray-900 mb-2">
            Cohort Name *
          </label>
          <input
            id="cohortName"
            v-model="form.name"
            type="text"
            required
            class="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="e.g., Fall 2025 Cohort, Spring 2026 Cohort"
          />
        </div>

        <!-- Description -->
        <div>
          <label for="cohortDescription" class="block text-sm font-semibold text-gray-900 mb-2">
            Description
          </label>
          <textarea
            id="cohortDescription"
            v-model="form.description"
            rows="3"
            class="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="Optional description for students"
          ></textarea>
        </div>

        <!-- Info: Dates are calculated from sessions -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex gap-3">
            <svg class="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-sm font-semibold text-blue-900">Automatic Date Calculation</p>
              <p class="text-sm text-blue-700 mt-1">
                Cohort start and end dates are automatically calculated from the sessions you assign. Assign sessions first, then the dates will be derived from the session schedule.
              </p>
            </div>
          </div>
        </div>

        <!-- Maximum Enrollment -->
        <div>
          <label for="maxEnrollment" class="block text-sm font-semibold text-gray-900 mb-2">
            Maximum Enrollment *
          </label>
          <input
            id="maxEnrollment"
            v-model.number="form.maxEnrollment"
            type="number"
            min="1"
            required
            class="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="e.g., 30"
          />
          <p class="mt-2 text-xs text-gray-500">Maximum number of students allowed in this cohort</p>
        </div>

        <!-- Enrollment Deadline -->
        <div>
          <label for="enrollmentDeadline" class="block text-sm font-semibold text-gray-900 mb-2">
            Enrollment Deadline
          </label>
          <input
            id="enrollmentDeadline"
            v-model="form.enrollmentDeadline"
            type="datetime-local"
            class="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
          />
          <p class="mt-2 text-xs text-gray-500">Last datetime students can enroll (defaults to start date)</p>
        </div>

        <!-- Is Active -->
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <input
              id="isActive"
              v-model="form.isActive"
              type="checkbox"
              class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <div class="flex-1">
              <label for="isActive" class="block text-sm font-semibold text-gray-900">
                Cohort is active and available for enrollment
              </label>
              <p class="mt-1 text-xs text-gray-500">Students can only enroll in active cohorts</p>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{{ error }}</p>
            </div>
          </div>
        </div>
      </form>

      <!-- Footer Actions -->
      <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
        <button
          type="button"
          @click="$emit('close')"
          class="px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          @click="handleSubmit"
          :disabled="saving"
          class="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg v-if="saving" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ saving ? 'Saving...' : (cohort && 'id' in cohort ? 'Update Cohort' : 'Create Cohort') }}
        </button>
      </div>
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
      maxEnrollment: 30,
      enrollmentDeadline: '',
      isActive: true
    });

    const resetForm = () => {
      form.name = '';
      form.description = '';
      form.maxEnrollment = 30;
      form.enrollmentDeadline = '';
      form.isActive = true;
    };

    const populateForm = (cohort: CourseCohortListItemDto) => {
      form.name = cohort.name;
      form.description = cohort.description || '';
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

    return {
      form,
      saving,
      error,
      handleSubmit
    };
  }
});
</script>
