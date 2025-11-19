<template>
  <div class="space-y-4">
    <div class="bg-green-50 border border-green-200 rounded-md p-3">
      <p class="text-sm text-green-800">
        Create a new group class session and automatically assign it to the selected step. After creation, you'll be returned to the assignment screen.
      </p>
    </div>

    <!-- Select Step -->
    <div class="border border-gray-200 rounded-lg p-4">
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Select a course step to assign the new session to: *
        </label>
        <select
          v-model.number="selectedStep"
          class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option :value="null">-- Choose a step --</option>
          <option v-for="step in course.steps" :key="step.id" :value="step.id">
            {{ step.label }}: {{ step.title }}
          </option>
        </select>
      </div>

      <p v-if="!selectedStep" class="text-sm text-gray-500 italic">
        Please select a step above to create a new session.
      </p>
    </div>

    <!-- Group Class Form (shown when step is selected) -->
    <div v-if="selectedStep" class="border border-green-200 rounded-lg p-4 bg-green-50">
      <GroupClassModal
        :levels="levels"
        :teachers="teachers"
        :default-values="getDefaultValuesForStep(selectedStep)"
        :auto-attach-to-course-step="{ stepId: selectedStep }"
        :course-context="{ courseProgramId: course.id, stepId: selectedStep }"
        :cohort-context="cohort"
        hide-recurring-option
        @save="handleNewSessionCreated"
        @close="selectedStep = null"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, type PropType } from 'vue';
import type { CourseProgramDetailDto, CourseCohortDetailDto, LevelDto, PublicTeacherDto } from '@thrive/shared';
import GroupClassModal from '../../GroupClassModal.vue';

export default defineComponent({
  name: 'AssignSessionsCreateTab',
  components: {
    GroupClassModal
  },
  props: {
    course: {
      type: Object as PropType<CourseProgramDetailDto>,
      required: true
    },
    cohort: {
      type: Object as PropType<CourseCohortDetailDto | null>,
      default: null
    },
    levels: {
      type: Array as PropType<LevelDto[]>,
      default: () => []
    },
    teachers: {
      type: Array as PropType<PublicTeacherDto[]>,
      default: () => []
    }
  },
  emits: ['session-created'],
  setup(props, { emit }) {
    const selectedStep = ref<number | null>(null);

    const getDefaultValuesForStep = (stepId: number) => {
      const step = props.course.steps.find(s => s.id === stepId);
      if (!step) return {};

      const courseCode = props.course.code || '';
      const courseLevelIds = props.course.levels?.map(l => l.id) || [];

      return {
        title: `${courseCode} - ${step.label}`,
        description: step.description || null,
        levelIds: courseLevelIds.length > 0 ? courseLevelIds : [],
        scheduleType: 'oneoff' as const,
      };
    };

    const handleNewSessionCreated = (createdGroupClass: any) => {
      selectedStep.value = null;
      emit('session-created', createdGroupClass);
    };

    return {
      selectedStep,
      getDefaultValuesForStep,
      handleNewSessionCreated
    };
  }
});
</script>