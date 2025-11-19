<template>
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
        <h3 class="text-lg font-medium text-gray-900">
          {{ isEdit ? 'Edit Group Class' : 'Create Group Class' }}
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-500">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form Content -->
      <div class="px-6 py-4">
        <GroupClassFormComponent
          :group-class="groupClass"
          :levels="levels"
          :teachers="teachers"
          :mode="isEdit ? 'edit' : 'create'"
          :default-values="defaultValues"
          :course-context="courseContext"
          :cohort-context="cohortContext"
          :hide-recurring-option="hideRecurringOption"
          @submit="handleSubmit"
          @cancel="$emit('close')"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType } from 'vue';
import { GroupClass } from './GroupClasses.vue';
import GroupClassFormComponent from './shared/GroupClassFormComponent.vue';
import { thriveClient } from '@wp-shared/thrive';
import { LevelDto, PublicTeacherDto, CourseCohortDetailDto } from '@thrive/shared';

export default defineComponent({
  name: 'GroupClassModal',
  components: {
    GroupClassFormComponent,
  },
  props: {
    groupClass: {
      type: Object as PropType<GroupClass | null>,
      default: null,
    },
    levels: {
      type: Array as PropType<LevelDto[]>,
      required: true,
    },
    teachers: {
      type: Array as PropType<PublicTeacherDto[]>,
      required: true,
    },
    defaultValues: {
      type: Object as PropType<any>,
      default: () => ({}),
    },
    autoAttachToCourseStep: {
      type: Object as PropType<{ stepId: number } | null>,
      default: null,
    },
    courseContext: {
      type: Object as PropType<{ courseProgramId: number; stepId: number } | null>,
      default: null,
    },
    cohortContext: {
      type: Object as PropType<CourseCohortDetailDto | null>,
      default: null,
    },
    hideRecurringOption: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const isEdit = computed(() => props.groupClass !== null);
    const saving = ref(false);
    const error = ref<string | null>(null);

    const handleSubmit = async (payload: any) => {
      error.value = null;
      saving.value = true;

      try {
        let result: any = null;

        if (isEdit.value) {
          // Use shared client to update
          result = await thriveClient.updateGroupClass(props.groupClass!.id, payload);
          if (!result) throw new Error('Failed to update group class');
        } else {
          // Use shared client to create
          const created = await thriveClient.createGroupClass(payload as Record<string, unknown>);
          if (!created || typeof created.id !== 'number') {
            throw new Error('Failed to create group class');
          }
          result = created;

          // If auto-attach is requested and we just created a new group class
          if (props.autoAttachToCourseStep) {
            try {
              await thriveClient.attachStepOption(props.autoAttachToCourseStep.stepId, {
                groupClassId: created.id,
                isActive: true,
              });
            } catch (attachErr: any) {
              console.error('Failed to auto-attach group class to course step:', attachErr);
              // Don't fail the whole operation - the class was created successfully
            }
          }
        }

        emit('save', result);
        emit('close');
      } catch (err: any) {
        error.value = err.message || 'Failed to save group class';
      } finally {
        saving.value = false;
      }
    };

    

    return {
      isEdit,
      saving,
      error,
      handleSubmit,
    };
  },
});
</script>
