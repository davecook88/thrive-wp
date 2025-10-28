<template>
  <div
    v-if="course"
    class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold text-gray-900">
            Manage Cohorts: {{ course.title }}
          </h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-500"
          >
            <span class="sr-only">Close</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div class="px-6 py-4">
        <!-- Create New Cohort Button -->
        <div class="mb-6 flex justify-between items-center">
          <p class="text-sm text-gray-600">
            Cohorts are pre-packaged sets of sessions that students enroll in as a group.
          </p>
          <button
            @click="openCreateCohortModal()"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            + Create New Cohort
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Loading cohorts...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
          <p class="text-red-800">{{ error }}</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="cohorts.length === 0" class="text-center py-12 bg-gray-50 rounded-lg">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No cohorts yet</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by creating your first cohort.</p>
          <div class="mt-6">
            <button
              @click="openCreateCohortModal()"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              + Create Cohort
            </button>
          </div>
        </div>

        <!-- Cohorts List -->
        <div v-else class="space-y-4">
          <div
            v-for="cohort in cohorts"
            :key="cohort.id"
            class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h4 class="text-lg font-medium text-gray-900">{{ cohort.name }}</h4>
                  <span
                    :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      cohort.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    ]"
                  >
                    {{ cohort.isActive ? 'Active' : 'Inactive' }}
                  </span>
                  <span
                    v-if="cohort.availableSpots === 0"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                  >
                    Full
                  </span>
                </div>
                <p v-if="cohort.description" class="text-sm text-gray-600 mt-1">
                  {{ cohort.description }}
                </p>
                <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span class="text-gray-500">Start Date:</span>
                    <span class="ml-1 font-medium">{{ formatDate(cohort.startDate) }}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">End Date:</span>
                    <span class="ml-1 font-medium">{{ formatDate(cohort.endDate) }}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">Enrollment:</span>
                    <span class="ml-1 font-medium">{{ cohort.currentEnrollment }} / {{ cohort.maxEnrollment }}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">Sessions:</span>
                    <span class="ml-1 font-medium">{{ cohort.sessionCount }} assigned</span>
                  </div>
                </div>
                <div v-if="cohort.enrollmentDeadline" class="mt-2 text-sm">
                  <span class="text-gray-500">Enrollment Deadline:</span>
                  <span class="ml-1 font-medium">{{ formatDateTime(cohort.enrollmentDeadline) }}</span>
                </div>
              </div>
              <div class="ml-4 flex flex-col gap-2">
                <button
                  @click="openAssignSessionsModal(cohort)"
                  class="text-purple-600 hover:text-purple-800 text-sm font-medium whitespace-nowrap"
                >
                  Assign Sessions
                </button>
                <button
                  @click="openCreateCohortModal(cohort)"
                  class="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                >
                  Edit
                </button>
                <button
                  @click="handleDeleteCohort(cohort)"
                  class="text-red-600 hover:text-red-800 text-sm font-medium whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Cohort Modal -->
    <CreateCohortModal
      v-if="editingCohort !== null"
      :course="course"
      :cohort="editingCohort"
      @close="closeCreateCohortModal"
      @cohort-saved="onCohortSaved"
    />

    <!-- Assign Sessions Modal -->
    <AssignSessionsModal
      v-if="assigningCohort !== null"
      :course="course"
      :cohort="assigningCohort"
      @close="closeAssignSessionsModal"
      @sessions-updated="onSessionsUpdated"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, type PropType } from 'vue';
import { thriveClient } from '@wp-shared/thrive';
import type { CourseProgramDetailDto, CourseCohortListItemDto } from '@thrive/shared';
import CreateCohortModal from './CreateCohortModal.vue';
import AssignSessionsModal from './AssignSessionsModal.vue';

export default defineComponent({
  name: 'ManageCohortsModal',
  components: {
    CreateCohortModal,
    AssignSessionsModal
  },
  props: {
    course: {
      type: Object as PropType<CourseProgramDetailDto | null>,
      default: () => null
    }
  },
  emits: ['close', 'cohorts-updated'],
  setup(props, { emit }) {
    const cohorts = ref<CourseCohortListItemDto[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const editingCohort = ref<CourseCohortListItemDto | null>(null);
    const assigningCohort = ref<CourseCohortListItemDto | null>(null);

    const loadCohorts = async () => {
      const course = props.course;
      if (!course) return;

      loading.value = true;
      error.value = null;

      try {
        const result = await thriveClient.getCourseCohorts(course.id);
        cohorts.value = result as CourseCohortListItemDto[];
      } catch (err: unknown) {
        if (err instanceof Error) {
          error.value = err.message;
        } else {
          error.value = String(err) || 'Failed to load cohorts';
        }
      } finally {
        loading.value = false;
      }
    };

    const openCreateCohortModal = (cohort: CourseCohortListItemDto | null = null) => {
      // Pass null to indicate "create new", or the cohort object for editing
      editingCohort.value = cohort === null ? ({} as CourseCohortListItemDto) : cohort;
    };

    const closeCreateCohortModal = () => {
      editingCohort.value = null;
    };

    const onCohortSaved = async () => {
      await loadCohorts();
      emit('cohorts-updated');
    };

    const openAssignSessionsModal = (cohort: CourseCohortListItemDto) => {
      assigningCohort.value = cohort;
    };

    const closeAssignSessionsModal = () => {
      assigningCohort.value = null;
    };

    const onSessionsUpdated = async () => {
      await loadCohorts();
      emit('cohorts-updated');
    };

    const handleDeleteCohort = async (cohort: CourseCohortListItemDto) => {
      if (!confirm(`Are you sure you want to delete the cohort "${cohort.name}"? This action cannot be undone.`)) {
        return;
      }

      try {
        await thriveClient.deleteCourseCohort(cohort.id);
        await loadCohorts();
        emit('cohorts-updated');
      } catch (err: unknown) {
        if (err instanceof Error) {
          error.value = err.message;
        } else {
          error.value = String(err) || 'Failed to delete cohort';
        }
      }
    };

    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatDateTime = (dateStr: string): string => {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    };

    watch(() => props.course, (newCourse) => {
      if (newCourse) {
        loadCohorts();
      }
    }, { immediate: true });

    return {
      cohorts,
      loading,
      error,
      editingCohort,
      assigningCohort,
      openCreateCohortModal,
      closeCreateCohortModal,
      onCohortSaved,
      openAssignSessionsModal,
      closeAssignSessionsModal,
      onSessionsUpdated,
      handleDeleteCohort,
      formatDate,
      formatDateTime
    };
  }
});
</script>
