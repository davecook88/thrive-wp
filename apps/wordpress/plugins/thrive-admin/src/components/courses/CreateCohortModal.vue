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

        <!-- Info: Dates are calculated from sessions -->
        <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p class="text-sm text-blue-800">
            <strong>Note:</strong> Cohort start and end dates are automatically calculated from the sessions you assign to this cohort. Assign sessions first, then the dates will be derived from the session schedule.
          </p>
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
