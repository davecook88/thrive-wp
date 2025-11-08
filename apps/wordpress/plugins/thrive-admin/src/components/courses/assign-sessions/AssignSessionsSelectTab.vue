<template>
  <div class="space-y-4">
    <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
      <p class="text-sm text-blue-800">
        Assign a group class session to each course step. Students enrolling in this cohort will automatically be assigned these sessions.
      </p>
    </div>

    <AssignSessionsStepCard
      v-for="step in course.steps"
      :key="step.id"
      :step="step"
      :assigned-session="getAssignedSession(step.id)"
      :assigning="assigning"
      @assign-session="handleAssignSession"
      @remove-session="handleRemoveSession"
    />

    <AssignSessionsSummary
      :assigned-count="assignedCount"
      :total-steps="course.steps.length"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { CourseProgramDetailDto, CourseCohortDetailDto } from '@thrive/shared';
import AssignSessionsStepCard from './AssignSessionsStepCard.vue';
import AssignSessionsSummary from './AssignSessionsSummary.vue';

export default defineComponent({
  name: 'AssignSessionsSelectTab',
  components: {
    AssignSessionsStepCard,
    AssignSessionsSummary
  },
  props: {
    course: {
      type: Object as PropType<CourseProgramDetailDto>,
      required: true
    },
    cohortDetail: {
      type: Object as PropType<CourseCohortDetailDto | null>,
      default: null
    },
    assigning: {
      type: Boolean,
      default: false
    }
  },
  emits: ['assign-session', 'remove-session'],
  computed: {
    assignedCount() {
      return this.cohortDetail?.sessions.length ?? 0;
    }
  },
  methods: {
    getAssignedSession(stepId: number) {
      if (!this.cohortDetail) return null;
      return this.cohortDetail.sessions.find(s => s.courseStepId === stepId) ?? null;
    },
    handleAssignSession(stepId: number, optionId: number) {
      this.$emit('assign-session', stepId, optionId);
    },
    handleRemoveSession(stepId: number) {
      this.$emit('remove-session', stepId);
    }
  }
});
</script>