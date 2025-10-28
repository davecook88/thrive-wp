<template>
  <div
    v-if="course"
    class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold text-gray-900">
            Manage Steps: {{ course.title }}
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
        <!-- Add Step Form -->
        <div class="mb-6 bg-gray-50 rounded-lg p-4">
          <h4 class="text-sm font-medium text-gray-900 mb-3">Add New Step</h4>
          <form @submit.prevent="handleAddStep" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-700">Step Order</label>
              <input
                v-model.number="stepForm.stepOrder"
                type="number"
                min="1"
                required
                class="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">Label</label>
              <div class="mt-1 flex items-center">
                <span class="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium rounded-l-md">
                  {{ course.code }}-
                </span>
                <input
                  v-model.number="labelNumber"
                  type="number"
                  min="1"
                  required
                  placeholder="1"
                  class="block w-full text-sm border-gray-300 rounded-r-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  @change="onLabelChange"
                />
              </div>
              <p class="mt-1 text-xs text-gray-500">Format: {{ course.code }}-{number}</p>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-700">Title</label>
              <input
                v-model="stepForm.title"
                type="text"
                required
                class="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
     
              />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-700">Description</label>
              <textarea
                v-model="stepForm.description"
                rows="2"
                class="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
            <div class="sm:col-span-2 flex items-center justify-between">
              <div class="flex items-center">
                <input
                  id="stepRequired"
                  v-model="stepForm.isRequired"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label for="stepRequired" class="ml-2 block text-xs text-gray-700">
                  Step is required
                </label>
              </div>
              <button
                type="submit"
                :disabled="addingStep"
                class="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {{ addingStep ? 'Adding...' : 'Add Step' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Steps List -->
        <div v-if="course.steps && course.steps.length > 0" class="space-y-3">
          <h4 class="text-sm font-medium text-gray-900">Course Steps</h4>
          <div
            v-for="step in course.steps"
            :key="step.id"
            class="border border-gray-200 rounded-lg p-4"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <div class="flex items-center">
                  <span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    {{ step.stepOrder }}
                  </span>
                  <div class="ml-3">
                    <h5 class="text-sm font-medium text-gray-900">{{ step.label }}: {{ step.title }}</h5>
                    <p v-if="step.description" class="text-xs text-gray-500 mt-1">{{ step.description }}</p>
                    <span v-if="!step.isRequired" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                      Optional
                    </span>
                  </div>
                </div>
              </div>
              <button
                @click="handleDeleteStep(step.id)"
                class="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Delete
              </button>
            </div>

            <!-- Step Options (Group Classes) -->
            <div class="ml-11 mt-3 space-y-2 bg-gray-50 rounded-md p-3">
              <div class="flex items-center justify-between">
                <div>
                  <h6 class="text-xs font-medium text-gray-700">Class Scheduling Options</h6>
                  <p class="text-xs text-gray-500 mt-0.5">Link group classes that students can choose for this step</p>
                </div>
                <div class="flex gap-2">
                  <button
                    @click="openCreateGroupClassModal(step)"
                    class="text-xs text-green-600 hover:text-green-800 font-medium whitespace-nowrap"
                  >
                    + Create New
                  </button>
                  <button
                    @click="openAttachOptionModal(step)"
                    class="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                  >
                    + Add Existing
                  </button>
                </div>
              </div>

              <div v-if="step.options && step.options.length > 0" class="space-y-1">
                <div
                  v-for="option in step.options"
                  :key="option.id"
                  class="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2"
                >
                  <div class="flex-1">
                    <span class="text-xs font-medium text-gray-900">{{ option.groupClassName }}</span>
                    <span v-if="!option.isActive" class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  </div>
                  <button
                    @click="handleDetachOption(option.id)"
                    class="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div v-else class="bg-yellow-50 border border-yellow-200 rounded p-2">
                <p class="text-xs text-yellow-800">
                  <strong>No class options yet.</strong> Add group classes that students can book for this step.
                  Make sure to create group classes first in the Group Classes section.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-6 text-gray-500 text-sm">
          No steps added yet. Create your first step above.
        </div>
      </div>
    </div>

    <!-- Attach Option Modal -->
    <div
      v-if="showAttachOptionModal && selectedStep"
      class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[60]"
      @click.self="closeAttachOptionModal"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h4 class="text-lg font-medium text-gray-900">Add Class Option to {{ selectedStep.label }}</h4>
          <p class="text-sm text-gray-500 mt-1">Students will choose from these class options when booking this step</p>
        </div>
        <div class="px-6 py-4 space-y-4">
          <div v-if="availableGroupClasses.length === 0" class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p class="text-sm text-yellow-800">
              <strong>No group classes available.</strong><br>
              Click "Create New" to create a group class for this step.
            </p>
          </div>
          <div v-else>
            <label class="block text-sm font-medium text-gray-700 mb-2">Select Group Class</label>
            <select
              v-model="selectedGroupClassId"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option :value="null">-- Select a group class --</option>
              <option
                v-for="groupClass in availableGroupClasses"
                :key="groupClass.id"
                :value="groupClass.id"
              >
                {{ groupClass.title }} {{ groupClass.isActive ? '' : '(Inactive)' }}
              </option>
            </select>
            <p class="mt-2 text-xs text-gray-500">
              Students will be able to book sessions from the selected group class for this course step.
            </p>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="closeAttachOptionModal"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="handleAttachOption"
            :disabled="!selectedGroupClassId || attachingOption"
            class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {{ attachingOption ? 'Adding...' : 'Add Option' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Group Class Modal -->
    <GroupClassModal
      v-if="showCreateGroupClassModal && selectedStep"
      :levels="levels"
      :teachers="teachers"
      :default-values="groupClassDefaults"
      :auto-attach-to-course-step="{ stepId: selectedStep.id }"
      :course-context="course ? { courseProgramId: course.id, stepId: selectedStep.id } : null"
      @close="closeCreateGroupClassModal"
      @save="handleGroupClassCreated"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, watch, onMounted, computed } from 'vue';
import { thriveClient } from '@wp-shared/thrive';
import type { CourseProgramDetailDto, CourseStepDetailDto, LevelDto, PublicTeacherDto } from '@thrive/shared';
import type { CourseStepForm } from './types';
import GroupClassModal from '../GroupClassModal.vue';

export default defineComponent({
  name: 'ManageStepsModal',
  components: {
    GroupClassModal,
  },
  props: {
    course: {
      type: Object as () => CourseProgramDetailDto | null,
      default: null
    }
  },
  emits: ['close', 'course-updated'],
  setup(props, { emit }) {
    const labelNumber = ref(props.course?.steps ? props.course.steps.length + 1 : 1);

    // Add watcher for course prop changes
    watch(() => props.course, (newCourse, oldCourse) => {
      console.log('Course prop updated:', {
        new: newCourse,
        old: oldCourse
      });
      labelNumber.value = newCourse?.steps ? newCourse.steps.length + 1 : 1;
      updateLabelNumber(); // Ensure label is unique after course change
    }, { deep: true });
    const addingStep = ref(false);

    // Step options state
    const showAttachOptionModal = ref(false);
    const showCreateGroupClassModal = ref(false);
    const selectedStep = ref<CourseStepDetailDto | null>(null);
    const selectedGroupClassId = ref<number | null>(null);
    const attachingOption = ref(false);
    const availableGroupClasses = ref<Array<{
      id: number;
      title: string;
      description: string | null;
      isActive: boolean;
    }>>([]);
    const levels = ref<Array<LevelDto>>([]);
    const teachers = ref<Array<PublicTeacherDto>>([]);

    const stepForm: CourseStepForm = reactive({
      stepOrder: 1,
      label: '',
      title: '',
      description: '',
      isRequired: true
    });

    // Add labelNumber for UI binding
    

    // Watch stepOrder and update label number accordingly
    watch(() => stepForm.stepOrder, () => {
      updateLabelNumber();
    });

    // Initialize label when course is available
    if (props.course?.code) {
      stepForm.label = `${props.course.code}-${labelNumber.value}`;
    }

    const handleAddStep = async () => {
      if (!props.course) return;

      addingStep.value = true;

      try {
        await thriveClient.createCourseStep({
          courseProgramId: props.course.id,
          ...stepForm
        });

        // Reset step form but increment order
        stepForm.stepOrder += 1;
        labelNumber.value = stepForm.stepOrder;
        stepForm.title = '';
        stepForm.description = '';
        stepForm.isRequired = true;

        emit('course-updated');
      } catch (err: any) {
        console.error('Failed to add step:', err);
        // You might want to emit an error event here
      } finally {
        addingStep.value = false;
      }
    };

    const handleDeleteStep = async (stepId: number) => {
      if (!confirm('Are you sure you want to delete this step?')) {
        return;
      }

      try {
        await thriveClient.deleteCourseStep(stepId);
        emit('course-updated');
      } catch (err: any) {
        console.error('Failed to delete step:', err);
      }
    };

    // Initialize step order when course changes
    const updateStepOrder = () => {
      if (props.course?.steps && props.course.steps.length > 0) {
        stepForm.stepOrder = Math.max(...props.course.steps.map((s) => s.stepOrder)) + 1;
      } else {
        stepForm.stepOrder = 1;
      }
      labelNumber.value = stepForm.stepOrder;
    };

    const updateLabelNumber = (n?: string | number) => {
        const provided = typeof n === 'string' ? parseInt(n, 10) : typeof n === 'number' ? n : undefined;
        const existingStepLabels = props.course?.steps.reduce((acc, step) => {
            const parts = step.label.split('-');
            const numberPart = parseInt(parts[1], 10);
            if (!isNaN(numberPart)) {
                acc.add(numberPart);
            }
            return acc;
        }, new Set<number>());

        // Start candidate at provided value if valid, otherwise at stepForm.stepOrder
        let candidateNumber = (typeof provided === 'number' && !isNaN(provided)) ? provided : stepForm.stepOrder;
        if (existingStepLabels?.has(candidateNumber)) {
          while (existingStepLabels.has(candidateNumber)) {
              candidateNumber++;
          }
        }

        labelNumber.value = candidateNumber;
        if (props.course?.code) {
            stepForm.label = `${props.course.code}-${candidateNumber}`;
        }
    };

    const onLabelChange = (e: Event) => {
      const val = (e.target as HTMLInputElement)?.value;
      updateLabelNumber(val);
    };

    // Watch for course changes to update step order
    if (props.course) {
      updateStepOrder();
    }

    // Load available group classes, levels, and teachers
    const loadGroupClasses = async () => {
      try {
        availableGroupClasses.value = await thriveClient.getAllGroupClasses();
      } catch (err) {
        console.error('Failed to load group classes:', err);
      }
    };

    const loadLevelsAndTeachers = async () => {
      try {
        const [levelsData, teachersData] = await Promise.all([
          thriveClient.fetchLevels(),
          thriveClient.fetchTeachers(),
        ]);
        levels.value = levelsData;
        // Map PublicTeacherDto to the format expected by GroupClassFormComponent
        teachers.value = teachersData
      } catch (err) {
        console.error('Failed to load levels and teachers:', err);
      }
    };

    onMounted(() => {
      loadGroupClasses();
      loadLevelsAndTeachers();
    });

    // Step options management
    const openAttachOptionModal = (step: CourseStepDetailDto) => {
      selectedStep.value = step;
      selectedGroupClassId.value = null;
      showAttachOptionModal.value = true;
    };

    const closeAttachOptionModal = () => {
      showAttachOptionModal.value = false;
      selectedStep.value = null;
      selectedGroupClassId.value = null;
    };

    const handleAttachOption = async () => {
      if (!selectedStep.value || !selectedGroupClassId.value) return;

      attachingOption.value = true;

      try {
        await thriveClient.attachStepOption(selectedStep.value.id, {
          groupClassId: selectedGroupClassId.value,
          isActive: true,
        });

        closeAttachOptionModal();
        emit('course-updated');
      } catch (err: any) {
        console.error('Failed to attach option:', err);
      } finally {
        attachingOption.value = false;
      }
    };

    const handleDetachOption = async (optionId: number) => {
      if (!confirm('Are you sure you want to remove this class option?')) {
        return;
      }

      try {
        await thriveClient.detachStepOption(optionId);
        emit('course-updated');
      } catch (err: any) {
        console.error('Failed to detach option:', err);
      }
    };

    // Create group class modal management
    const openCreateGroupClassModal = (step: CourseStepDetailDto) => {
      selectedStep.value = step;
      showCreateGroupClassModal.value = true;
    };

    const closeCreateGroupClassModal = () => {
      showCreateGroupClassModal.value = false;
      selectedStep.value = null;
    };

    const handleGroupClassCreated = async () => {
      await loadGroupClasses();
      closeCreateGroupClassModal();
      emit('course-updated');
    };

    // Compute default values for group class creation
    const groupClassDefaults = computed(() => {
      if (!selectedStep.value || !props.course) {
        return {};
      }

      // Pre-populate title with course code and step label
      return {
        title: `${props.course.code} - ${selectedStep.value.label}`,
        description: selectedStep.value.description || props.course.description || '',
        // Use course's designated levels
        levelIds: props.course.levels?.map(l => l.id) || [],
      };
    });

    return {
      addingStep,
      stepForm,
      labelNumber,
      handleAddStep,
      handleDeleteStep,
      updateLabelNumber,
      onLabelChange,
      // Step options
      showAttachOptionModal,
      showCreateGroupClassModal,
      selectedStep,
      selectedGroupClassId,
      attachingOption,
      availableGroupClasses,
      levels,
      teachers,
      openAttachOptionModal,
      closeAttachOptionModal,
      handleAttachOption,
      handleDetachOption,
      openCreateGroupClassModal,
      closeCreateGroupClassModal,
      handleGroupClassCreated,
      groupClassDefaults,
    };
  }
});
</script>