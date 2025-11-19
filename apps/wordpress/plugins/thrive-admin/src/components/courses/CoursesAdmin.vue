<template>
  <div class="thrive-admin-courses">
    <div class="mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-2">Course Programs Management</h2>
      <p class="text-gray-600">Create and manage structured course programs with sequential learning steps</p>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 'list'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === 'list'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          Course List
        </button>
        <button
          @click="activeTab = 'create'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === 'create'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          Create New Course
        </button>
      </nav>
    </div>

    <!-- List Tab -->
    <div v-if="activeTab === 'list'" class="space-y-4">
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading courses...</p>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <div v-else-if="courses.length === 0" class="text-center py-8">
        <p class="text-gray-500">No courses found. Create your first course to get started.</p>
        <button
          @click="activeTab = 'create'"
          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Create Course
        </button>
      </div>

      <div v-else class="bg-white shadow overflow-hidden sm:rounded-md">
        <ul class="divide-y divide-gray-200">
          <li v-for="course in courses" :key="course.id" class="px-6 py-4">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center">
                  <h3 class="text-lg font-medium text-gray-900">{{ course.title }}</h3>
                  <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {{ course.code }}
                  </span>
                </div>
                <p v-if="course.description" class="text-sm text-gray-500 mt-1">{{ course.description }}</p>
                <div class="mt-3 flex items-center gap-3">
                  <span class="text-sm text-gray-600">
                    {{ course.steps?.length || 0 }} steps
                  </span>
                  <span :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    course.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  ]">
                    {{ course.isActive ? 'Active' : 'Inactive' }}
                  </span>
                  <span v-if="course.stripeProductId" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Published to Stripe
                  </span>
                  <span v-else-if="course.priceInCents" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Price Set (Not Published)
                  </span>
                </div>
              </div>
              <div class="ml-4 flex items-center space-x-2">
                <button
                  @click="openManageStepsModal(course)"
                  class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Manage Steps
                </button>
                <button
                  @click="openManageCohortsModal(course)"
                  class="text-purple-600 hover:text-purple-800 text-sm font-medium"
                >
                  Manage Cohorts
                </button>
                <button
                  v-if="!course.stripeProductId"
                  @click="openPublishModal(course)"
                  class="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Publish to Stripe
                </button>
                <button
                  @click="editCourse(course)"
                  class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  v-if="course.isActive"
                  @click="deactivateCourse(course)"
                  class="text-red-600 hover:text-red-800 text-sm"
                >
                  Deactivate
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Create/Edit Tab -->
    <div v-if="activeTab === 'create' || activeTab === 'edit'" class="max-w-4xl">
      <form @submit.prevent="saveCourse" class="space-y-6">
        <div class="bg-white shadow px-6 py-6 rounded-lg">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Course Information</h3>

          <div class="grid grid-cols-1 gap-6">
            <div>
              <label for="code" class="block text-sm font-medium text-gray-700">Course Code *</label>
              <input
                id="code"
                v-model="form.code"
                type="text"
                required
                pattern="[A-Z0-9-]+"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., SFZ, ADV-TECH"
              />
              <p class="mt-1 text-xs text-gray-500">Uppercase letters, numbers, and hyphens only</p>
            </div>

            <div>
              <label for="title" class="block text-sm font-medium text-gray-700">Course Title *</label>
              <input
                id="title"
                v-model="form.title"
                type="text"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., SFZ Foundation Course"
              />
            </div>

            <div>
              <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                v-model="form.description"
                rows="4"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Marketing description for students"
              ></textarea>
            </div>

            <MediaPicker
              v-model="form.heroImageUrl"
              label="Course Hero Image"
              placeholder="No image selected"
            />

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Student Levels *</label>
              <p class="text-xs text-gray-500 mb-3">Select which student levels this course is appropriate for</p>
              <div class="space-y-2">
                <div v-for="level in levels" :key="level.id" class="flex items-center">
                  <input
                    :id="`level-${level.id}`"
                    type="checkbox"
                    :value="level.id"
                    v-model="form.levelIds"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label :for="`level-${level.id}`" class="ml-2 block text-sm text-gray-900">
                    {{ level.code }} - {{ level.name }}
                  </label>
                </div>
              </div>
            </div>

            <div class="flex items-center">
              <input
                id="isActive"
                v-model="form.isActive"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="isActive" class="ml-2 block text-sm text-gray-900">
                Course is active and available for purchase
              </label>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <button
            type="button"
            @click="cancelEdit"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="creating"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {{ creating ? 'Saving...' : (editingCourse ? 'Update Course' : 'Create Course') }}
          </button>
        </div>
      </form>
    </div>

    <!-- Manage Steps Modal -->
    <ManageStepsModal
      :course="selectedCourse"
      @close="closeManageStepsModal"
      @course-updated="onCourseUpdated"
    />

    <!-- Manage Cohorts Modal -->
    <ManageCohortsModal
      :course="selectedCourseForCohorts"
      @close="closeManageCohortsModal"
      @cohorts-updated="onCohortsUpdated"
    />

    <!-- Publish Course Modal -->
    <PublishCourseModal
      :course="publishingCourse"
      @close="closePublishModal"
      @published="onCoursePublished"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted } from 'vue';
import { thriveClient } from '@wp-shared/thrive';
import type { CourseProgramDetailDto } from '@thrive/shared';
import ManageStepsModal from './ManageStepsModal.vue';
import ManageCohortsModal from './ManageCohortsModal.vue';
import PublishCourseModal from './PublishCourseModal.vue';
import MediaPicker from '../shared/MediaPicker.vue';
import type { CourseForm } from './types';

export default defineComponent({
  name: 'CoursesAdmin',
  components: {
    ManageStepsModal,
    ManageCohortsModal,
    PublishCourseModal,
    MediaPicker
  },
  setup() {
    const activeTab = ref<'list' | 'create' | 'edit'>('list');
    const courses = ref<CourseProgramDetailDto[]>([]);
    const levels = ref<Array<{ id: number; code: string; name: string }>>([]);
    const loading = ref(false);
    const creating = ref(false);
    const error = ref<string | null>(null);
    const selectedCourse = ref<CourseProgramDetailDto | null>(null);
    const selectedCourseForCohorts = ref<CourseProgramDetailDto | null>(null);
    const editingCourse = ref<CourseProgramDetailDto | null>(null);
    const publishingCourse = ref<CourseProgramDetailDto | null>(null);

    const form: CourseForm = reactive({
      code: '',
      title: '',
      description: '',
      isActive: true,
      levelIds: [],
      heroImageUrl: null
    });

    const loadLevels = async () => {
      try {
        levels.value = await thriveClient.fetchLevels();
      } catch (err) {
        console.error('Failed to load levels:', err);
      }
    };

    const loadCourses = async () => {
      loading.value = true;
      error.value = null;

      try {
        courses.value = await thriveClient.getCoursePrograms();
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load courses';
      } finally {
        loading.value = false;
      }
    };

    const saveCourse = async () => {
      creating.value = true;
      error.value = null;

      try {
        if (editingCourse.value) {
          await thriveClient.updateCourseProgram(editingCourse.value.id, form);
        } else {
          await thriveClient.createCourseProgram(form);
        }

        resetForm();
        await loadCourses();
        activeTab.value = 'list';
        editingCourse.value = null;
      } catch (err: any) {
        error.value = err.message || 'Failed to save course';
      } finally {
        creating.value = false;
      }
    };

    const editCourse = (course: CourseProgramDetailDto) => {
      editingCourse.value = course;
      form.code = course.code;
      form.title = course.title;
      form.description = course.description || '';
      form.isActive = course.isActive;
      form.levelIds = course.levels?.map(l => l.id) || [];
      form.heroImageUrl = course.heroImageUrl || null;
      activeTab.value = 'edit';
    };

    const deactivateCourse = async (course: CourseProgramDetailDto) => {
      if (!confirm(`Are you sure you want to deactivate "${course.title}"?`)) {
        return;
      }

      try {
        await thriveClient.updateCourseProgram(course.id, { isActive: false });
        await loadCourses();
      } catch (err: any) {
        error.value = err.message || 'Failed to deactivate course';
      }
    };

    const openManageStepsModal = async (course: CourseProgramDetailDto) => {
      try {
        const fullCourse = await thriveClient.getCourseProgram(course.id);
        if (!fullCourse) {
          error.value = 'Failed to load course details';
          return;
        }
        selectedCourse.value = fullCourse;
      } catch (err: any) {
        error.value = err.message || 'Failed to load course details';
      }
    };

    const closeManageStepsModal = () => {
      selectedCourse.value = null;
    };

    const onCourseUpdated = async () => {
      if (selectedCourse.value) {
        // Reload the course data
        try {
          const updatedCourse = await thriveClient.getCourseProgram(selectedCourse.value.id);
          if (updatedCourse) {
            selectedCourse.value = updatedCourse;
            // Also update in the courses list
            const index = courses.value.findIndex(c => c.id === updatedCourse.id);
            if (index !== -1) {
              courses.value[index] = updatedCourse;
            }
          }
        } catch (err: any) {
          error.value = err.message || 'Failed to reload course';
        }
      }
    };

    const cancelEdit = () => {
      resetForm();
      activeTab.value = 'list';
      editingCourse.value = null;
    };

    const resetForm = () => {
      form.code = '';
      form.title = '';
      form.description = '';
      form.isActive = true;
      form.levelIds = [];
      form.heroImageUrl = null;
    };

    const openPublishModal = (course: CourseProgramDetailDto) => {
      publishingCourse.value = course;
    };

    const closePublishModal = () => {
      publishingCourse.value = null;
    };

    const onCoursePublished = async () => {
      await loadCourses();
    };

    const openManageCohortsModal = async (course: CourseProgramDetailDto) => {
      try {
        const fullCourse = await thriveClient.getCourseProgram(course.id);
        if (!fullCourse) {
          error.value = 'Failed to load course details';
          return;
        }
        selectedCourseForCohorts.value = fullCourse;
      } catch (err: any) {
        error.value = err.message || 'Failed to load course details';
      }
    };

    const closeManageCohortsModal = () => {
      selectedCourseForCohorts.value = null;
    };

    const onCohortsUpdated = async () => {
      await loadCourses();

      // Refresh the selected course details to ensure we have the latest steps/options
      if (selectedCourseForCohorts.value) {
        try {
          const fullCourse = await thriveClient.getCourseProgram(selectedCourseForCohorts.value.id);
          if (fullCourse) {
            selectedCourseForCohorts.value = fullCourse;
          }
        } catch (err) {
          console.error('Failed to refresh course details:', err);
        }
      }
    };

    onMounted(() => {
      loadLevels();
      loadCourses();
    });

    return {
      activeTab,
      courses,
      levels,
      loading,
      creating,
      error,
      selectedCourse,
      selectedCourseForCohorts,
      editingCourse,
      publishingCourse,
      form,
      loadCourses,
      saveCourse,
      editCourse,
      deactivateCourse,
      openManageStepsModal,
      closeManageStepsModal,
      onCourseUpdated,
      openManageCohortsModal,
      closeManageCohortsModal,
      onCohortsUpdated,
      cancelEdit,
      resetForm,
      openPublishModal,
      closePublishModal,
      onCoursePublished
    };
  }
});
</script>