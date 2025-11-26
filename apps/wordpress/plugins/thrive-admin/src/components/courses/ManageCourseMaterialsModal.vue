<template>
  <div
    v-if="course"
    class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold text-gray-900">
            Manage Materials: {{ course.title }}
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

      <!-- Two-panel layout -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left sidebar - Steps -->
        <div class="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0">
          <div class="p-4">
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Course Steps</h4>
            <div v-if="sortedSteps.length === 0" class="text-sm text-gray-500 italic">
              No steps yet. Add steps in the Curriculum section.
            </div>
            <div v-else class="space-y-1">
              <button
                v-for="step in sortedSteps"
                :key="step.id"
                @click="selectStep(step)"
                :class="[
                  'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  selectedStep?.id === step.id
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
                ]"
              >
                <div class="flex items-center">
                  <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white text-xs font-semibold mr-2"
                    :class="selectedStep?.id === step.id ? 'text-blue-600' : 'text-gray-600'">
                    {{ step.stepOrder }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium truncate">{{ step.label }}</div>
                    <div class="text-xs text-gray-500 truncate">
                      {{ getMaterialCount(step.id) }} materials
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Main panel - Materials -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <div v-if="!selectedStep" class="flex-1 flex items-center justify-center text-gray-500">
            <div class="text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="mt-2 text-sm">Select a step to manage its materials</p>
            </div>
          </div>

          <div v-else class="flex-1 flex flex-col overflow-hidden">
            <!-- Step header -->
            <div class="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-lg font-semibold text-gray-900">{{ selectedStep.label }}: {{ selectedStep.title }}</h4>
                  <p v-if="selectedStep.description" class="text-sm text-gray-500 mt-1">{{ selectedStep.description }}</p>
                </div>
                <button
                  @click="openMaterialForm()"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                  </svg>
                  Add Material
                </button>
              </div>
            </div>

            <!-- Materials list -->
            <div class="flex-1 overflow-y-auto px-6 py-4">
              <div v-if="loadingMaterials" class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                <p class="mt-2 text-sm text-gray-600">Loading materials...</p>
              </div>

              <div v-else-if="materialsError" class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <p class="text-sm text-red-700">{{ materialsError }}</p>
              </div>

              <div v-else-if="currentMaterials.length === 0" class="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
                <svg class="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="mt-2 text-sm text-yellow-800 font-medium">No materials yet</p>
                <p class="mt-1 text-xs text-yellow-700">Click "Add Material" to create your first course material for this step.</p>
              </div>

              <div v-else>
                <draggable
                  v-model="currentMaterials"
                  item-key="id"
                  handle=".drag-handle"
                  @end="onMaterialsDragEnd"
                  class="space-y-3"
                >
                  <template #item="{ element: material }">
                    <div class="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                      <div class="flex items-start gap-4">
                        <span class="drag-handle cursor-move text-gray-400 hover:text-gray-600 flex-shrink-0" title="Drag to reorder">
                          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                          </svg>
                        </span>

                        <div class="flex-1 min-w-0">
                          <div class="flex items-start justify-between gap-4">
                            <div class="flex-1 min-w-0">
                              <div class="flex items-center gap-2 mb-1">
                                <h5 class="text-sm font-semibold text-gray-900">{{ material.title }}</h5>
                                <span :class="getMaterialTypeBadgeClass(material.type)" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                                  {{ getMaterialTypeLabel(material.type) }}
                                </span>
                              </div>
                              <p v-if="material.description" class="text-sm text-gray-600 mt-1">{{ material.description }}</p>

                              <!-- Content preview -->
                              <div v-if="material.type === 'rich_text' && material.content" class="mt-2 text-xs text-gray-500 line-clamp-2 bg-gray-50 rounded p-2">
                                {{ material.content }}
                              </div>
                              <div v-else-if="material.type === 'video_embed' && material.content" class="mt-2 text-xs text-blue-600">
                                <svg class="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                </svg>
                                {{ material.content }}
                              </div>
                              <div v-else-if="material.type === 'file' && material.content" class="mt-2 text-xs text-gray-600">
                                <svg class="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd" />
                                </svg>
                                {{ material.content }}
                              </div>
                              <div v-else-if="material.type === 'question' && material.questions && material.questions.length > 0" class="mt-2 text-xs text-gray-700 bg-purple-50 rounded p-2">
                                <svg class="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                                </svg>
                                <strong>{{ getMaterialTypeLabel(material.questions[0].questionType) }}:</strong> {{ material.questions[0].questionText }}
                              </div>
                            </div>

                            <div class="flex items-center gap-2 flex-shrink-0">
                              <button
                                @click="openMaterialForm(material)"
                                class="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <button
                                @click="handleDeleteMaterial(material)"
                                class="text-sm font-medium text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </draggable>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Material Form Slide-out Panel -->
    <div
      v-if="showMaterialForm"
      class="fixed inset-0 overflow-hidden z-[60]"
      @click.self="closeMaterialForm"
    >
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeMaterialForm"></div>

        <div class="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div class="w-screen max-w-2xl">
            <div class="h-full flex flex-col bg-white shadow-xl">
              <!-- Form Header -->
              <div class="px-6 py-4 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold text-gray-900">
                    {{ editingMaterial ? 'Edit Material' : 'Add New Material' }}
                  </h3>
                  <button
                    @click="closeMaterialForm"
                    class="text-gray-400 hover:text-gray-500"
                  >
                    <span class="sr-only">Close</span>
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Form Body -->
              <div class="flex-1 overflow-y-auto px-6 py-4">
                <form @submit.prevent="handleSaveMaterial" class="space-y-6">
                  <!-- Material Type -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Material Type *</label>
                    <div class="grid grid-cols-2 gap-3">
                      <button
                        v-for="type in materialTypes"
                        :key="type.value"
                        type="button"
                        @click="materialForm.type = type.value"
                        :class="[
                          'p-3 border-2 rounded-lg text-left transition-all',
                          materialForm.type === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        ]"
                      >
                        <div class="flex items-center">
                          <component :is="type.icon" class="w-5 h-5 mr-2" :class="materialForm.type === type.value ? 'text-blue-600' : 'text-gray-500'" />
                          <span class="text-sm font-medium" :class="materialForm.type === type.value ? 'text-blue-900' : 'text-gray-900'">
                            {{ type.label }}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <!-- Title -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Title *</label>
                    <input
                      v-model="materialForm.title"
                      type="text"
                      required
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Introduction Video, Chapter 1 Reading"
                    />
                  </div>

                  <!-- Description -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      v-model="materialForm.description"
                      rows="2"
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional description for students"
                    ></textarea>
                  </div>

                  <!-- Type-specific content -->
                  <div v-if="materialForm.type === 'rich_text'">
                    <label class="block text-sm font-medium text-gray-700">Content *</label>
                    <textarea
                      v-model="materialForm.content"
                      rows="8"
                      required
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="Enter text content here..."
                    ></textarea>
                    <p class="mt-1 text-xs text-gray-500">Plain text or HTML content</p>
                  </div>

                  <div v-else-if="materialForm.type === 'video_embed'">
                    <label class="block text-sm font-medium text-gray-700">Video URL *</label>
                    <input
                      v-model="materialForm.content"
                      type="url"
                      required
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <p class="mt-1 text-xs text-gray-500">YouTube, Vimeo, or other video URL</p>
                  </div>

                  <div v-else-if="materialForm.type === 'file'">
                    <label class="block text-sm font-medium text-gray-700">File URL *</label>
                    <div class="mt-1 flex rounded-md shadow-sm">
                      <input
                        v-model="materialForm.content"
                        type="url"
                        required
                        class="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="https://example.com/file.pdf"
                      />
                      <button
                        type="button"
                        @click="openMediaLibrary"
                        class="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm hover:bg-gray-100"
                      >
                        Select File
                      </button>
                    </div>
                    <p class="mt-1 text-xs text-gray-500">Direct link to file (PDF, DOC, etc.)</p>
                  </div>

                  <div v-else-if="materialForm.type === 'question'">
                    <div class="space-y-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700">Question Type *</label>
                        <select
                          v-model="materialForm.question.questionType"
                          required
                          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="long_text">Long Text Answer</option>
                          <option value="file_upload">File Upload</option>
                          <option value="video_upload">Video Upload</option>
                        </select>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700">Question Text *</label>
                        <textarea
                          v-model="materialForm.question.questionText"
                          rows="3"
                          required
                          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your question here..."
                        ></textarea>
                      </div>

                      <!-- Multiple Choice Options -->
                      <div v-if="materialForm.question.questionType === 'multiple_choice'">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                        <div class="space-y-2">
                          <div
                            v-for="(option, index) in multipleChoiceOptions"
                            :key="index"
                            class="flex items-center gap-2"
                          >
                            <input
                              v-model="option.text"
                              type="text"
                              required
                              class="flex-1 block border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                              :placeholder="`Option ${index + 1}`"
                            />
                            <label class="flex items-center text-sm whitespace-nowrap">
                              <input
                                type="checkbox"
                                v-model="option.correct"
                                class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-1"
                              />
                              Correct
                            </label>
                            <button
                              v-if="multipleChoiceOptions.length > 2"
                              type="button"
                              @click="removeMultipleChoiceOption(index)"
                              class="text-red-600 hover:text-red-800"
                            >
                              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          @click="addMultipleChoiceOption"
                          class="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          + Add Option
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <!-- Form Footer -->
              <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  @click="closeMaterialForm"
                  class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  @click="handleSaveMaterial"
                  :disabled="savingMaterial"
                  class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {{ savingMaterial ? 'Saving...' : (editingMaterial ? 'Update Material' : 'Add Material') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, reactive, watch, h } from 'vue';
import Draggable from 'vuedraggable';
import { thriveClient } from '@wp-shared/thrive';
import type {
  CourseProgramDetailDto,
  CourseStepDetailDto,
  CourseStepMaterialDto,
  MaterialType,
  QuestionType,
  CreateCourseStepMaterialDto
} from '@thrive/shared';

// Icon components
const TextIcon = () => h('svg', { class: 'w-5 h-5', fill: 'currentColor', viewBox: '0 0 20 20' }, [
  h('path', { 'fill-rule': 'evenodd', d: 'M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z', 'clip-rule': 'evenodd' })
]);

const VideoIcon = () => h('svg', { class: 'w-5 h-5', fill: 'currentColor', viewBox: '0 0 20 20' }, [
  h('path', { d: 'M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z' })
]);

const FileIcon = () => h('svg', { class: 'w-5 h-5', fill: 'currentColor', viewBox: '0 0 20 20' }, [
  h('path', { 'fill-rule': 'evenodd', d: 'M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z', 'clip-rule': 'evenodd' })
]);

const QuestionIcon = () => h('svg', { class: 'w-5 h-5', fill: 'currentColor', viewBox: '0 0 20 20' }, [
  h('path', { 'fill-rule': 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z', 'clip-rule': 'evenodd' })
]);

interface MaterialForm {
  title: string;
  description: string;
  type: MaterialType;
  content: string;
  question: {
    questionText: string;
    questionType: QuestionType;
    options: Record<string, { text: string; correct: boolean }> | null;
  };
}

export default defineComponent({
  name: 'ManageCourseMaterialsModal',
  components: {
    draggable: (typeof window !== 'undefined' && (window as any).VueDraggableNext) ? (window as any).VueDraggableNext : Draggable,
  },
  props: {
    course: {
      type: Object as () => CourseProgramDetailDto | null,
      default: null
    }
  },
  emits: ['close', 'materials-updated'],
  setup(props, { emit }) {
    const selectedStep = ref<CourseStepDetailDto | null>(null);
    const materialsByStep = ref<Map<number, CourseStepMaterialDto[]>>(new Map());
    const loadingMaterials = ref(false);
    const materialsError = ref<string | null>(null);
    const showMaterialForm = ref(false);
    const editingMaterial = ref<CourseStepMaterialDto | null>(null);
    const savingMaterial = ref(false);

    const materialForm = reactive<MaterialForm>({
      title: '',
      description: '',
      type: 'rich_text',
      content: '',
      question: {
        questionText: '',
        questionType: 'multiple_choice',
        options: null
      }
    });

    const multipleChoiceOptions = ref<Array<{ text: string; correct: boolean }>>([
      { text: '', correct: false },
      { text: '', correct: false }
    ]);

    const materialTypes = [
      { value: 'rich_text' as MaterialType, label: 'Text', icon: TextIcon },
      { value: 'video_embed' as MaterialType, label: 'Video', icon: VideoIcon },
      { value: 'file' as MaterialType, label: 'File', icon: FileIcon },
      { value: 'question' as MaterialType, label: 'Question', icon: QuestionIcon }
    ];

    const sortedSteps = computed(() => {
      if (!props.course?.steps) return [];
      return [...props.course.steps].sort((a, b) => a.stepOrder - b.stepOrder);
    });

    const currentMaterials = computed({
      get: () => {
        if (!selectedStep.value) return [];
        return materialsByStep.value.get(selectedStep.value.id) || [];
      },
      set: (value) => {
        if (selectedStep.value) {
          materialsByStep.value.set(selectedStep.value.id, value);
        }
      }
    });

    const getMaterialCount = (stepId: number): number => {
      return materialsByStep.value.get(stepId)?.length || 0;
    };

    const getMaterialTypeLabel = (type: MaterialType | QuestionType): string => {
      const labels: Record<string, string> = {
        'rich_text': 'Text',
        'video_embed': 'Video',
        'file': 'File',
        'question': 'Question',
        'multiple_choice': 'Multiple Choice',
        'long_text': 'Long Text',
        'file_upload': 'File Upload',
        'video_upload': 'Video Upload'
      };
      return labels[type] || type;
    };

    const getMaterialTypeBadgeClass = (type: MaterialType): string => {
      const classes: Record<MaterialType, string> = {
        'rich_text': 'bg-blue-100 text-blue-800',
        'video_embed': 'bg-purple-100 text-purple-800',
        'file': 'bg-green-100 text-green-800',
        'question': 'bg-orange-100 text-orange-800'
      };
      return classes[type] || 'bg-gray-100 text-gray-800';
    };

    const selectStep = async (step: CourseStepDetailDto) => {
      selectedStep.value = step;
      await loadMaterials(step.id);
    };

    const loadMaterials = async (stepId: number) => {
      // Check if already loaded
      if (materialsByStep.value.has(stepId)) {
        return;
      }

      loadingMaterials.value = true;
      materialsError.value = null;

      try {
        const materials = await thriveClient.getCourseStepMaterials(stepId);
        materialsByStep.value.set(stepId, materials.sort((a, b) => a.order - b.order));
      } catch (err: any) {
        materialsError.value = err.message || 'Failed to load materials';
        console.error('Failed to load materials:', err);
      } finally {
        loadingMaterials.value = false;
      }
    };

    const openMaterialForm = (material?: CourseStepMaterialDto) => {
      if (material) {
        editingMaterial.value = material;
        materialForm.title = material.title;
        materialForm.description = material.description || '';
        materialForm.type = material.type;
        materialForm.content = material.content || '';

        if (material.type === 'question' && material.questions && material.questions.length > 0) {
          const question = material.questions[0];
          materialForm.question.questionText = question.questionText;
          materialForm.question.questionType = question.questionType;

          if (question.questionType === 'multiple_choice' && question.options) {
            multipleChoiceOptions.value = Object.entries(question.options).map(([key, value]) => {
              if (typeof value === 'string') {
                return { text: value, correct: false };
              }
              return { text: value.text, correct: value.correct || false };
            });
          }
        }
      } else {
        editingMaterial.value = null;
        resetMaterialForm();
      }
      showMaterialForm.value = true;
    };

    const closeMaterialForm = () => {
      showMaterialForm.value = false;
      editingMaterial.value = null;
      resetMaterialForm();
    };

    const resetMaterialForm = () => {
      materialForm.title = '';
      materialForm.description = '';
      materialForm.type = 'rich_text';
      materialForm.content = '';
      materialForm.question.questionText = '';
      materialForm.question.questionType = 'multiple_choice';
      materialForm.question.options = null;
      multipleChoiceOptions.value = [
        { text: '', correct: false },
        { text: '', correct: false }
      ];
    };

    const handleSaveMaterial = async () => {
      if (!selectedStep.value) return;

      savingMaterial.value = true;

      try {
        const materials = currentMaterials.value;
        const nextOrder = editingMaterial.value
          ? editingMaterial.value.order
          : materials.length > 0
            ? Math.max(...materials.map(m => m.order)) + 1
            : 1;

        const payload: CreateCourseStepMaterialDto | any = {
          courseStepId: selectedStep.value.id,
          title: materialForm.title,
          description: materialForm.description || undefined,
          type: materialForm.type,
          content: materialForm.content || undefined,
          order: nextOrder
        };

        if (materialForm.type === 'question') {
          payload.question = {
            questionText: materialForm.question.questionText,
            questionType: materialForm.question.questionType,
            options: materialForm.question.questionType === 'multiple_choice'
              ? Object.fromEntries(
                  multipleChoiceOptions.value.map((opt, idx) => [
                    `option_${idx + 1}`,
                    { text: opt.text, correct: opt.correct }
                  ])
                )
              : null
          };
        }

        if (editingMaterial.value) {
          await thriveClient.updateCourseMaterial(editingMaterial.value.id, payload);
        } else {
          await thriveClient.createCourseMaterial(payload);
        }

        // Reload materials
        materialsByStep.value.delete(selectedStep.value.id);
        await loadMaterials(selectedStep.value.id);

        closeMaterialForm();
        emit('materials-updated');
      } catch (err: any) {
        console.error('Failed to save material:', err);
        alert('Failed to save material: ' + (err.message || 'Unknown error'));
      } finally {
        savingMaterial.value = false;
      }
    };

    const handleDeleteMaterial = async (material: CourseStepMaterialDto) => {
      if (!confirm(`Are you sure you want to delete "${material.title}"?`)) {
        return;
      }

      try {
        await thriveClient.deleteCourseMaterial(material.id);

        // Remove from local state
        if (selectedStep.value) {
          materialsByStep.value.delete(selectedStep.value.id);
          await loadMaterials(selectedStep.value.id);
        }

        emit('materials-updated');
      } catch (err: any) {
        console.error('Failed to delete material:', err);
        alert('Failed to delete material: ' + (err.message || 'Unknown error'));
      }
    };

    const onMaterialsDragEnd = async () => {
      if (!selectedStep.value) return;

      const materials = currentMaterials.value;

      // Update order based on new positions
      const updates = materials.map((material, index) => ({
        id: material.id,
        order: index + 1
      }));

      // Optimistically update local state
      materials.forEach((material, index) => {
        material.order = index + 1;
      });

      try {
        // Update each material's order
        for (const update of updates) {
          const original = materials.find(m => m.id === update.id);
          if (original && original.order !== update.order) {
            await thriveClient.updateCourseMaterial(update.id, { order: update.order });
          }
        }
        emit('materials-updated');
      } catch (err) {
        console.error('Failed to reorder materials:', err);
        alert('Failed to save new material order');
        // Reload to revert
        if (selectedStep.value) {
          materialsByStep.value.delete(selectedStep.value.id);
          await loadMaterials(selectedStep.value.id);
        }
      }
    };

    const addMultipleChoiceOption = () => {
      multipleChoiceOptions.value.push({ text: '', correct: false });
    };

    const removeMultipleChoiceOption = (index: number) => {
      multipleChoiceOptions.value.splice(index, 1);
    };

    const openMediaLibrary = () => {
      // Check if wp media is available
      if (typeof (window as any).wp === 'undefined' || !(window as any).wp.media) {
        alert('WordPress Media Library is not available. Please ensure you are logged in to WordPress admin.');
        return;
      }

      const frame = (window as any).wp.media({
        title: 'Select File',
        button: {
          text: 'Use this file'
        },
        multiple: false
      });

      frame.on('select', () => {
        const attachment = frame.state().get('selection').first().toJSON();
        materialForm.content = attachment.url;
      });

      frame.open();
    };

    // Auto-select first step when modal opens
    watch(() => props.course, (newCourse) => {
      if (newCourse && newCourse.steps && newCourse.steps.length > 0) {
        const firstStep = [...newCourse.steps].sort((a, b) => a.stepOrder - b.stepOrder)[0];
        selectStep(firstStep);
      }
    }, { immediate: true });

    return {
      selectedStep,
      sortedSteps,
      currentMaterials,
      loadingMaterials,
      materialsError,
      showMaterialForm,
      editingMaterial,
      savingMaterial,
      materialForm,
      materialTypes,
      multipleChoiceOptions,
      getMaterialCount,
      getMaterialTypeLabel,
      getMaterialTypeBadgeClass,
      selectStep,
      openMaterialForm,
      closeMaterialForm,
      handleSaveMaterial,
      handleDeleteMaterial,
      onMaterialsDragEnd,
      addMultipleChoiceOption,
      removeMultipleChoiceOption,
      openMediaLibrary
    };
  }
});
</script>
