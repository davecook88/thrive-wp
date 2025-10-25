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
            <div class="flex items-start justify-between">
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
          </div>
        </div>
        <div v-else class="text-center py-6 text-gray-500 text-sm">
          No steps added yet. Create your first step above.
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, watch } from 'vue';
import { thriveClient } from '@wp-shared/thrive';
import type { CourseProgramDetailDto } from '@thrive/shared';
import type { CourseStepForm } from './types';

export default defineComponent({
  name: 'ManageStepsModal',
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
        console.log('Updating label number based on step order:', stepForm.stepOrder, n);
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

    return {
      addingStep,
      stepForm,
      labelNumber,
      handleAddStep,
      handleDeleteStep,
      updateLabelNumber,
      onLabelChange
    };
  }
});
</script>