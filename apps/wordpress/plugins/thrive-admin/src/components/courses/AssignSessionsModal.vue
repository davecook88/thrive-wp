<template>
  <div
    v-if="course && cohort"
    class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[60]"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              Assign Sessions: {{ cohort.name }}
            </h3>
            <p class="text-sm text-gray-600 mt-1">
              Course: {{ course.title }}
            </p>
          </div>
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
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Loading cohort details...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
          <p class="text-red-800">{{ error }}</p>
        </div>

        <!-- Step Assignment List -->
        <div v-else class="space-y-4">
          <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p class="text-sm text-blue-800">
              Assign a group class session to each course step. Students enrolling in this cohort will automatically be assigned these sessions.
            </p>
          </div>

          <div
            v-for="step in course.steps"
            :key="step.id"
            class="border border-gray-200 rounded-lg p-4"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {{ step.stepOrder }}
                  </span>
                  <h4 class="text-sm font-medium text-gray-900">
                    {{ step.label }}: {{ step.title }}
                  </h4>
                  <span
                    v-if="!step.isRequired"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                  >
                    Optional
                  </span>
                </div>
                <p v-if="step.description" class="text-xs text-gray-500 mt-1 ml-8">
                  {{ step.description }}
                </p>
              </div>
            </div>

            <!-- Currently Assigned Session -->
            <div v-if="getAssignedSession(step.id)" class="ml-8 mb-3 bg-green-50 border border-green-200 rounded-md p-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-green-900">
                    Currently Assigned: {{ getAssignedSession(step.id)?.groupClassName }}
                  </p>
                  <p class="text-xs text-green-700 mt-1">
                    {{ formatSessionTime(getAssignedSession(step.id)!) }}
                  </p>
                </div>
                <button
                  @click="handleRemoveSession(step.id)"
                  class="text-red-600 hover:text-red-800 text-xs font-medium"
                >
                  Remove
                </button>
              </div>
            </div>

            <!-- Available Options -->
            <div class="ml-8 space-y-2">
              <label class="block text-xs font-medium text-gray-700 mb-2">
                {{ getAssignedSession(step.id) ? 'Change to:' : 'Select Session:' }}
              </label>
              <div v-if="step.options.length === 0" class="text-sm text-gray-500 italic">
                No group class options available for this step. Add options in "Manage Steps" first.
              </div>
              <div v-else class="space-y-2">
                <button
                  v-for="option in step.options"
                  :key="option.id"
                  @click="handleAssignSession(step.id, option.id)"
                  :disabled="assigning"
                  class="w-full text-left px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-medium text-gray-900">
                        {{ option.groupClassName }}
                      </p>
                      <p class="text-xs text-gray-600 mt-0.5">
                        {{ formatSessionTime(option) }}
                      </p>
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ option.availableSeats }} seats available
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-900">
                  Assignment Progress
                </p>
                <p class="text-xs text-gray-600 mt-1">
                  {{ assignedCount }} of {{ course.steps.length }} steps have sessions assigned
                </p>
              </div>
              <div
                :class="[
                  'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                  assignedCount === course.steps.length
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                ]"
              >
                {{ assignedCount === course.steps.length ? 'Complete' : 'Incomplete' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
        <button
          @click="$emit('close')"
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed, type PropType } from 'vue';
import { thriveClient } from '@wp-shared/thrive';
import type {
  CourseProgramDetailDto,
  CourseCohortListItemDto,
  CourseCohortDetailDto,
  StepOptionDetailDto
} from '@thrive/shared';

export default defineComponent({
  name: 'AssignSessionsModal',
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
  emits: ['close', 'sessions-updated'],
  setup(props, { emit }) {
    const loading = ref(false);
    const assigning = ref(false);
    const error = ref<string | null>(null);
    const cohortDetail = ref<CourseCohortDetailDto | null>(null);

    const loadCohortDetails = async () => {
      if (!props.cohort) return;

      loading.value = true;
      error.value = null;

      try {
        cohortDetail.value = await thriveClient.getCourseCohort(props.cohort.id);
      } catch (err: any) {
        error.value = err.message || 'Failed to load cohort details';
      } finally {
        loading.value = false;
      }
    };

    const getAssignedSession = (stepId: number) => {
      if (!cohortDetail.value) return null;
      return cohortDetail.value.sessions.find(s => s.courseStepId === stepId) ?? null
    };

    const assignedCount = computed(() => {
      if (!cohortDetail.value || !props.course) return 0;
      return cohortDetail.value.sessions.length;
    });

    const handleAssignSession = async (stepId: number, optionId: number) => {
      if (!props.cohort) return;

      assigning.value = true;
      error.value = null;

      try {
        await thriveClient.assignCohortSession({
          cohortId: props.cohort.id,
          courseStepId: stepId,
          courseStepOptionId: optionId
        });

        await loadCohortDetails();
        emit('sessions-updated');
      } catch (err: any) {
        error.value = err.message || 'Failed to assign session';
      } finally {
        assigning.value = false;
      }
    };

    const handleRemoveSession = async (stepId: number) => {
      if (!props.cohort) return;

      if (!confirm('Are you sure you want to remove this session assignment?')) {
        return;
      }

      assigning.value = true;
      error.value = null;

      try {
        await thriveClient.removeCohortSession(props.cohort.id, stepId);
        await loadCohortDetails();
        emit('sessions-updated');
      } catch (err: any) {
        error.value = err.message || 'Failed to remove session';
      } finally {
        assigning.value = false;
      }
    };

    const formatSessionTime = (option: StepOptionDetailDto|CourseCohortDetailDto["sessions"][number]|null) => {
      if (!option || !option.dayOfWeek || !option.startTime) {
        return 'Schedule TBD';
      }

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[option.dayOfWeek];

      return `${dayName}s at ${option.startTime} (${option.timezone || 'UTC'})`;
    };

    watch(() => props.cohort, (newCohort) => {
      if (newCohort) {
        loadCohortDetails();
      }
    }, { immediate: true });

    return {
      loading,
      assigning,
      error,
      cohortDetail,
      assignedCount,
      getAssignedSession,
      handleAssignSession,
      handleRemoveSession,
      formatSessionTime
    };
  }
});
</script>
