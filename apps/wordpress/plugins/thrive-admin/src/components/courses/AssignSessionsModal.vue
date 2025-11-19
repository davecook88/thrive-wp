<template>
  <div
    v-if="course && cohort"
    class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[60]"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <AssignSessionsModalHeader
        :course="course"
        :cohort="cohort"
        :active-tab="activeTab"
        @close="$emit('close')"
        @tab-change="activeTab = $event"
      />

      <div class="px-6 py-4">
        <!-- Loading State -->
        <AssignSessionsLoadingState v-if="loading" message="Loading cohort details..." />

        <!-- Error State -->
        <AssignSessionsErrorState v-else-if="error" :error="error" />

        <!-- SELECT EXISTING TAB -->
        <AssignSessionsSelectTab
          v-else-if="activeTab === 'select'"
          :course="course"
          :cohort-detail="cohortDetail"
          :assigning="assigning"
          @assign-session="handleAssignSession"
          @remove-session="handleRemoveSession"
        />

        <!-- CREATE NEW TAB -->
        <AssignSessionsCreateTab
          v-else-if="activeTab === 'create'"
          :course="course"
          :cohort="cohortDetail"
          :levels="levels"
          :teachers="teachers"
          @session-created="handleNewSessionCreated"
        />
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
  LevelDto,
  PublicTeacherDto
} from '@thrive/shared';
import AssignSessionsModalHeader from './assign-sessions/AssignSessionsModalHeader.vue';
import AssignSessionsLoadingState from './assign-sessions/AssignSessionsLoadingState.vue';
import AssignSessionsErrorState from './assign-sessions/AssignSessionsErrorState.vue';
import AssignSessionsSelectTab from './assign-sessions/AssignSessionsSelectTab.vue';
import AssignSessionsCreateTab from './assign-sessions/AssignSessionsCreateTab.vue';

export default defineComponent({
  name: 'AssignSessionsModal',
  components: {
    AssignSessionsModalHeader,
    AssignSessionsLoadingState,
    AssignSessionsErrorState,
    AssignSessionsSelectTab,
    AssignSessionsCreateTab
  },
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
    const activeTab = ref<'select' | 'create'>('select');
    const selectedStepForCreation = ref<number | null>(null);
    const levels = ref<LevelDto[]>([]);
    const teachers = ref<PublicTeacherDto[]>([]);

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

    const loadLevelsAndTeachers = async () => {
      try {
        const [fetchedLevels, fetchedTeachers] = await Promise.all([
          thriveClient.fetchLevels(),
          thriveClient.fetchTeachers(),
        ]);
        levels.value = fetchedLevels;
        teachers.value = fetchedTeachers;
      } catch (err: any) {
        console.error('Failed to load levels or teachers:', err);
      }
    };

    const handleNewSessionCreated = async (createdGroupClass: any) => {
      // After the session is created and auto-attached to the step,
      // refresh cohort details and return to the select tab
      await loadCohortDetails();
      activeTab.value = 'select';
      selectedStepForCreation.value = null;
      emit('sessions-updated');
    };

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

    const handleRemoveSession = async (stepId: number, optionId: number) => {
      if (!props.cohort) return;

      if (!confirm('Are you sure you want to remove this session assignment?')) {
        return;
      }

      assigning.value = true;
      error.value = null;

      try {
        await thriveClient.removeCohortSession(props.cohort.id, stepId, optionId);
        await loadCohortDetails();
        emit('sessions-updated');
      } catch (err: any) {
        error.value = err.message || 'Failed to remove session';
      } finally {
        assigning.value = false;
      }
    };

    watch(() => props.cohort, (newCohort) => {
      if (newCohort) {
        loadCohortDetails();
      }
    }, { immediate: true });

    watch(() => activeTab.value, (newTab) => {
      // Load levels and teachers when switching to create tab
      if (newTab === 'create' && levels.value.length === 0) {
        loadLevelsAndTeachers();
      }
    });

    return {
      loading,
      assigning,
      error,
      cohortDetail,
      activeTab,
      selectedStepForCreation,
      levels,
      teachers,
      handleAssignSession,
      handleRemoveSession,
      handleNewSessionCreated
    };
  }
});
</script>
