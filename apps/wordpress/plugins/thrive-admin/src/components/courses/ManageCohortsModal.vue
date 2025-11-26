<template>
  <div
    v-if="course"
    class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-2xl font-bold text-gray-900">
              Cohort Management
            </h3>
            <p class="mt-1 text-sm text-gray-600">{{ course.title }}</p>
          </div>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <span class="sr-only">Close</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-6">
        <!-- Action Bar -->
        <div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <svg class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-blue-900">About Cohorts</p>
              <p class="text-sm text-blue-700 mt-0.5">
                Cohorts are pre-packaged sets of sessions that students enroll in as a group.
              </p>
            </div>
          </div>
          <button
            @click="openCreateCohortModal()"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
          >
            <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            Create Cohort
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-16">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p class="mt-4 text-gray-600 font-medium">Loading cohorts...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
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

        <!-- Empty State -->
        <div v-else-if="cohorts.length === 0" class="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <svg class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900">No cohorts yet</h3>
          <p class="mt-2 text-sm text-gray-600 max-w-sm mx-auto">Get started by creating your first cohort to organize students into learning groups.</p>
          <div class="mt-8">
            <button
              @click="openCreateCohortModal()"
              class="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              Create Your First Cohort
            </button>
          </div>
        </div>

        <!-- Cohorts Grid -->
        <div v-else class="grid gap-6">
          <div
            v-for="cohort in cohorts"
            :key="cohort.id"
            class="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <!-- Cohort Header -->
                <div class="flex items-center gap-3 mb-3">
                  <h4 class="text-xl font-bold text-gray-900">{{ cohort.name }}</h4>
                  <span
                    :class="[
                      'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                      cohort.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    ]"
                  >
                    <span class="w-2 h-2 mr-1.5 rounded-full" :class="cohort.isActive ? 'bg-green-500' : 'bg-gray-500'"></span>
                    {{ cohort.isActive ? 'Active' : 'Inactive' }}
                  </span>
                  <span
                    v-if="cohort.availableSpots === 0"
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800"
                  >
                    <svg class="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd" />
                    </svg>
                    Full
                  </span>
                </div>

                <p v-if="cohort.description" class="text-sm text-gray-600 mb-4 line-clamp-2">
                  {{ cohort.description }}
                </p>

                <!-- Stats Grid -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div class="bg-gray-50 rounded-lg p-3">
                    <div class="flex items-center gap-2 mb-1">
                      <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span class="text-xs font-medium text-gray-500">Start Date</span>
                    </div>
                    <span class="text-sm font-semibold text-gray-900">{{ formatDate(cohort.startDate) }}</span>
                  </div>
                  <div class="bg-gray-50 rounded-lg p-3">
                    <div class="flex items-center gap-2 mb-1">
                      <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span class="text-xs font-medium text-gray-500">End Date</span>
                    </div>
                    <span class="text-sm font-semibold text-gray-900">{{ formatDate(cohort.endDate) }}</span>
                  </div>
                  <div class="bg-blue-50 rounded-lg p-3">
                    <div class="flex items-center gap-2 mb-1">
                      <svg class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span class="text-xs font-medium text-blue-700">Enrollment</span>
                    </div>
                    <span class="text-sm font-semibold text-blue-900">{{ cohort.currentEnrollment }} / {{ cohort.maxEnrollment }}</span>
                  </div>
                  <div class="bg-purple-50 rounded-lg p-3">
                    <div class="flex items-center gap-2 mb-1">
                      <svg class="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span class="text-xs font-medium text-purple-700">Sessions</span>
                    </div>
                    <span class="text-sm font-semibold text-purple-900">{{ cohort.sessionCount }} assigned</span>
                  </div>
                </div>

                <div v-if="cohort.enrollmentDeadline" class="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="font-medium">Enrollment Deadline:</span>
                  <span>{{ formatDateTime(cohort.enrollmentDeadline) }}</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex flex-col gap-2">
                <button
                  @click="openAssignSessionsModal(cohort)"
                  class="inline-flex items-center px-4 py-2 border border-purple-300 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors whitespace-nowrap"
                >
                  <svg class="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Sessions
                </button>
                <button
                  @click="openCreateCohortModal(cohort)"
                  class="inline-flex items-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  <svg class="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  @click="handleDeleteCohort(cohort)"
                  class="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors whitespace-nowrap"
                >
                  <svg class="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
