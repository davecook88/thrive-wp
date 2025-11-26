<template>
  <div class="thrive-admin-courses max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="md:flex md:items-center md:justify-between mb-8">
      <div class="flex-1 min-w-0">
        <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          Course Programs
        </h2>
        <p class="mt-1 text-sm text-gray-500">
          Manage your course catalog, curriculum, and cohorts.
        </p>
      </div>
      <div class="mt-4 flex md:mt-0 md:ml-4 gap-3">
        <button
          v-if="activeTab === 'list'"
          @click="activeTab = 'create'"
          type="button"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
          <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          Create Course
        </button>
        <button
          v-else
          @click="cancelEdit"
          type="button"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to List
        </button>
      </div>
    </div>

    <!-- Filters & Search -->
    <div v-if="activeTab === 'list'" class="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div class="flex flex-col md:flex-row md:items-center gap-4">
        <!-- Search -->
        <div class="flex-1 relative rounded-md shadow-sm">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            v-model="searchQuery"
            class="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
            placeholder="Search courses by title or code..."
          />
        </div>

        <!-- Status Filter -->
        <div class="w-full md:w-48">
          <label for="status-filter" class="block text-xs font-medium text-gray-600 mb-1">Status Filter</label>
          <select
            id="status-filter"
            data-testid="status-filter"
            v-model="filters.status"
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <!-- Level Filter -->
        <div class="w-full md:w-48">
          <label for="level-filter" class="block text-xs font-medium text-gray-600 mb-1">Level Filter</label>
          <select
            id="level-filter"
            data-testid="level-filter"
            v-model="filters.levelId"
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option :value="null">All Levels</option>
            <option v-for="level in levels" :key="level.id" :value="level.id">
              {{ level.code }} - {{ level.name }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="mt-2 text-xs text-gray-500 text-right" data-testid="course-count">
        Showing {{ filteredCourses.length }} courses
      </div>
    </div>

    <!-- List Tab -->
    <div v-if="activeTab === 'list'" class="space-y-6">
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
        <p class="mt-4 text-gray-600 font-medium">Loading courses...</p>
      </div>

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

      <div v-else-if="filteredCourses.length === 0" class="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">No courses found</h3>
        <p class="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
          {{ courses.length === 0 ? 'Get started by creating your first course program.' : 'No courses match your current filters. Try adjusting them.' }}
        </p>
        <div class="mt-8" v-if="courses.length === 0">
          <button
            @click="activeTab = 'create'"
            class="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            Create Your First Course
          </button>
        </div>
      </div>

      <div v-else class="grid gap-6" data-testid="course-list">
        <div
          v-for="course in filteredCourses"
          :key="course.id"
          class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
          data-testid="course-card"
        >
          <div class="p-6 flex flex-col sm:flex-row gap-6">
            <!-- Course Image -->
            <div class="flex-shrink-0 w-full sm:w-48 h-32 bg-gray-100 rounded-md overflow-hidden relative">
              <img 
                v-if="course.heroImageUrl" 
                :src="course.heroImageUrl" 
                :alt="course.title"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="absolute top-2 left-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/90 text-gray-800 shadow-sm backdrop-blur-sm">
                  {{ course.code }}
                </span>
              </div>
            </div>

            <!-- Course Details -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-xl font-bold text-gray-900 truncate">{{ course.title }}</h3>
                  <div class="mt-2 flex flex-wrap items-center gap-2">
                    <span :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      course.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    ]" data-testid="status-badge" :data-status="course.isActive ? 'active' : 'inactive'">
                      <span class="w-2 h-2 mr-1.5 rounded-full" :class="course.isActive ? 'bg-green-400' : 'bg-gray-400'"></span>
                      {{ course.isActive ? 'Active' : 'Inactive' }}
                    </span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700" data-testid="step-count">
                      {{ course.steps?.length || 0 }} steps
                    </span>
                    <span v-if="course.stripeProductId" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      <svg class="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.895-1.352 2.222-1.352 2.184 0 3.105.9 3.129 2.763h2.747C18.69 4.422 16.51 2.5 12.822 2.5c-3.648 0-5.802 1.902-5.802 4.6 0 3.004 2.652 4.126 5.054 4.972 2.305.813 3.018 1.563 3.018 2.563 0 .973-1.045 1.638-2.645 1.638-2.427 0-3.38-1.004-3.405-3.004H6.265c.03 3.968 2.371 5.736 6.531 5.736 3.912 0 6.185-1.815 6.185-4.814 0-3.328-2.684-4.52-5.005-5.04z"/></svg>
                      Stripe Connected
                    </span>
                  </div>
                  <p v-if="course.description" class="mt-3 text-sm text-gray-600 line-clamp-2">{{ course.description }}</p>
                </div>
              </div>

              <!-- Actions -->
              <div class="mt-6 flex flex-wrap items-center gap-3">
                <button
                  @click="openManageStepsModal(course)"
                  class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg class="-ml-0.5 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Curriculum
                </button>

                <button
                  @click="openManageCohortsModal(course)"
                  class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg class="-ml-0.5 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Cohorts
                </button>

                <button
                  @click="openManageCourseMaterialsModal(course)"
                  class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg class="-ml-0.5 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Materials
                </button>

                <div class="h-6 w-px bg-gray-300 mx-1"></div>

                <button
                  @click="editCourse(course)"
                  class="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Edit Details
                </button>
                
                <button
                  v-if="!course.stripeProductId"
                  @click="openPublishModal(course)"
                  class="text-sm font-medium text-green-600 hover:text-green-800"
                >
                  Connect Stripe
                </button>

                <button
                  v-if="course.isActive"
                  @click="deactivateCourse(course)"
                  class="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
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

    <!-- Manage Course Materials Modal -->
    <ManageCourseMaterialsModal
      :course="selectedCourseForMaterials"
      @close="closeManageCourseMaterialsModal"
      @materials-updated="onMaterialsUpdated"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted, computed } from 'vue';
import { thriveClient } from '@wp-shared/thrive';
import type { CourseProgramDetailDto } from '@thrive/shared';
import ManageStepsModal from './ManageStepsModal.vue';
import ManageCohortsModal from './ManageCohortsModal.vue';
import PublishCourseModal from './PublishCourseModal.vue';
import ManageCourseMaterialsModal from './ManageCourseMaterialsModal.vue';
import MediaPicker from '../shared/MediaPicker.vue';
import type { CourseForm } from './types';

export default defineComponent({
  name: 'CoursesAdmin',
  components: {
    ManageStepsModal,
    ManageCohortsModal,
    PublishCourseModal,
    ManageCourseMaterialsModal,
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
    const selectedCourseForMaterials = ref<CourseProgramDetailDto | null>(null);
    const editingCourse = ref<CourseProgramDetailDto | null>(null);
    const publishingCourse = ref<CourseProgramDetailDto | null>(null);
    const searchQuery = ref('');

    const form: CourseForm = reactive({
      code: '',
      title: '',
      description: '',
      isActive: true,
      levelIds: [],
      heroImageUrl: null
    });

    const filters = reactive({
      status: 'all',
      levelId: null as number | null
    });

    const filteredCourses = computed(() => {
      return courses.value.filter(course => {
        // Search filter
        if (searchQuery.value) {
          const query = searchQuery.value.toLowerCase();
          const matchesTitle = course.title.toLowerCase().includes(query);
          const matchesCode = course.code.toLowerCase().includes(query);
          if (!matchesTitle && !matchesCode) return false;
        }

        // Status filter
        if (filters.status === 'active' && !course.isActive) return false;
        if (filters.status === 'inactive' && course.isActive) return false;

        // Level filter
        if (filters.levelId) {
          const hasLevel = course.levels?.some(l => l.id === filters.levelId);
          if (!hasLevel) return false;
        }

        return true;
      });
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

    const openManageCourseMaterialsModal = async (course: CourseProgramDetailDto) => {
      try {
        const fullCourse = await thriveClient.getCourseProgram(course.id);
        if (!fullCourse) {
          error.value = 'Failed to load course details';
          return;
        }
        selectedCourseForMaterials.value = fullCourse;
      } catch (err: any) {
        error.value = err.message || 'Failed to load course details';
      }
    };

    const closeManageCourseMaterialsModal = () => {
      selectedCourseForMaterials.value = null;
    };

    const onMaterialsUpdated = async () => {
      await loadCourses();

      // Refresh the selected course details
      if (selectedCourseForMaterials.value) {
        try {
          const fullCourse = await thriveClient.getCourseProgram(selectedCourseForMaterials.value.id);
          if (fullCourse) {
            selectedCourseForMaterials.value = fullCourse;
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
      selectedCourseForMaterials,
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
      openManageCourseMaterialsModal,
      closeManageCourseMaterialsModal,
      onMaterialsUpdated,
      cancelEdit,
      resetForm,
      openPublishModal,
      closePublishModal,
      onCoursePublished,
      filters,
      filteredCourses,
      searchQuery
    };
  }
});
</script>