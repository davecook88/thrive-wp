<template>
  <div class="testimonials-admin">
    <div class="header">
      <div class="title-section">
        <h1>Testimonials</h1>
        <p class="subtitle">Review and manage student testimonials</p>
        <button @click="openCreateModal" class="btn btn-primary create-button">
          + Create Testimonial
        </button>
      </div>

      <div class="stats-bar">
        <div class="stat-card pending">
          <div class="stat-value">{{ pendingCount }}</div>
          <div class="stat-label">Pending Review</div>
        </div>
        <div class="stat-card approved">
          <div class="stat-value">{{ approvedCount }}</div>
          <div class="stat-label">Approved</div>
        </div>
        <div class="stat-card rejected">
          <div class="stat-value">{{ rejectedCount }}</div>
          <div class="stat-label">Rejected</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="filter-group">
        <label>Status</label>
        <select v-model="filters.status" @change="fetchTestimonials">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Page</label>
        <div class="pagination-controls">
          <button @click="previousPage" :disabled="currentPage === 1">Previous</button>
          <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
          <button @click="nextPage" :disabled="currentPage === totalPages">Next</button>
        </div>
      </div>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="error" class="message error">{{ error }}</div>
    <div v-if="success" class="message success">{{ success }}</div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading testimonials...</p>
    </div>

    <!-- Testimonials List -->
    <div v-else-if="testimonials.length > 0" class="testimonials-list">
      <div v-for="testimonial in testimonials" :key="testimonial.id" class="testimonial-card">
        <div class="card-header">
          <div class="student-info">
            <div class="avatar">{{ testimonial.studentName.charAt(0).toUpperCase() }}</div>
            <div class="info">
              <div class="name">{{ testimonial.studentName }}</div>
              <div class="meta">
                <span v-if="testimonial.teacherName">About: {{ testimonial.teacherName }}</span>
                <span v-else-if="testimonial.courseProgramTitle">Course: {{ testimonial.courseProgramTitle }}</span>
                <span v-else>General Testimonial</span>
                <span class="separator">•</span>
                <span>{{ formatDate(testimonial.createdAt) }}</span>
              </div>
            </div>
          </div>

          <div class="status-actions">
            <span :class="['status-badge', testimonial.status]">
              {{ testimonial.status.charAt(0).toUpperCase() + testimonial.status.slice(1) }}
            </span>
            <button
              @click="toggleFeatured(testimonial.id, testimonial.isFeatured)"
              :class="['icon-button', { featured: testimonial.isFeatured }]"
              :title="testimonial.isFeatured ? 'Remove from featured' : 'Mark as featured'"
            >
              ⭐
            </button>
          </div>
        </div>

        <div class="card-body">
          <div class="rating">
            <span v-for="i in 5" :key="i" :class="['star', { filled: i <= testimonial.rating }]">★</span>
          </div>

          <p v-if="testimonial.comment" class="comment">"{{ testimonial.comment }}"</p>
          <p v-else class="no-comment">No comment provided</p>

          <div v-if="testimonial.adminFeedback" class="admin-feedback">
            <strong>Admin Feedback:</strong>
            <p>{{ testimonial.adminFeedback }}</p>
          </div>
        </div>

        <div v-if="testimonial.status === 'pending'" class="card-actions">
          <button @click="openReviewModal(testimonial, 'approve')" class="btn btn-approve">
            ✓ Approve
          </button>
          <button @click="openReviewModal(testimonial, 'reject')" class="btn btn-reject">
            ✗ Reject
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <span class="empty-icon">📝</span>
      <h3>No testimonials found</h3>
      <p>No testimonials match the current filters.</p>
    </div>

    <!-- Create Testimonial Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal large-modal">
        <div class="modal-header">
          <h2>Create Testimonial</h2>
          <button @click="closeCreateModal" class="close-button">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="createStudent">Student <span class="required">*</span></label>
            <select id="createStudent" v-model="createForm.studentId" required>
              <option value="">Select a student...</option>
              <option v-for="student in students" :key="student.id" :value="student.id">
                {{ student.name }} ({{ student.email }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Testimonial Type</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" v-model="createForm.type" value="general" />
                General Testimonial
              </label>
              <label class="radio-option">
                <input type="radio" v-model="createForm.type" value="teacher" />
                Specific Teacher
              </label>
              <label class="radio-option">
                <input type="radio" v-model="createForm.type" value="course" />
                Specific Course
              </label>
            </div>
          </div>

          <div v-if="createForm.type === 'teacher'" class="form-group">
            <label for="createTeacher">Teacher <span class="required">*</span></label>
            <select id="createTeacher" v-model="createForm.teacherId" required>
              <option value="">Select a teacher...</option>
              <option v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">
                {{ teacher.name }}
              </option>
            </select>
          </div>

          <div v-if="createForm.type === 'course'" class="form-group">
            <label for="createCourse">Course <span class="required">*</span></label>
            <select id="createCourse" v-model="createForm.courseProgramId" required>
              <option value="">Select a course...</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.title }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="createRating">Rating <span class="required">*</span></label>
            <div class="rating-input">
              <button
                v-for="i in 5"
                :key="i"
                type="button"
                @click="createForm.rating = i"
                :class="['star-button', { active: i <= createForm.rating }]"
              >
                ★
              </button>
              <span class="rating-value">{{ createForm.rating }}/5</span>
            </div>
          </div>

          <div class="form-group">
            <label for="createComment">Comment</label>
            <textarea
              id="createComment"
              v-model="createForm.comment"
              rows="4"
              maxlength="2000"
              placeholder="The student's testimonial comment..."
            ></textarea>
            <small>{{ createForm.comment?.length || 0 }}/2000 characters</small>
          </div>

          <div class="form-group">
            <label for="createStatus">Status <span class="required">*</span></label>
            <select id="createStatus" v-model="createForm.status" required>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="createForm.isFeatured" />
              Mark as Featured
            </label>
          </div>

          <div class="form-group">
            <label for="createAdminFeedback">Admin Notes</label>
            <textarea
              id="createAdminFeedback"
              v-model="createForm.adminFeedback"
              rows="3"
              maxlength="1000"
              placeholder="Optional admin notes about this testimonial..."
            ></textarea>
            <small>{{ createForm.adminFeedback?.length || 0 }}/1000 characters</small>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeCreateModal" class="btn btn-secondary">Cancel</button>
          <button
            @click="submitCreate"
            class="btn btn-primary"
            :disabled="!isCreateFormValid"
          >
            Create Testimonial
          </button>
        </div>
      </div>
    </div>

    <!-- Review Modal -->
    <div v-if="showReviewModal" class="modal-overlay" @click.self="closeReviewModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ reviewAction === 'approve' ? 'Approve' : 'Reject' }} Testimonial</h2>
          <button @click="closeReviewModal" class="close-button">×</button>
        </div>

        <div class="modal-body">
          <div class="testimonial-preview">
            <p><strong>Student:</strong> {{ selectedTestimonial?.studentName }}</p>
            <p><strong>Rating:</strong> {{ selectedTestimonial?.rating }}/5 ⭐</p>
            <p v-if="selectedTestimonial?.comment"><strong>Comment:</strong> "{{ selectedTestimonial.comment }}"</p>
          </div>

          <div class="form-group">
            <label for="adminFeedback">
              Admin Feedback {{ reviewAction === 'reject' ? '(Required)' : '(Optional)' }}
            </label>
            <textarea
              id="adminFeedback"
              v-model="adminFeedback"
              rows="4"
              :placeholder="reviewAction === 'approve' ? 'Optional feedback for the student...' : 'Explain why this testimonial was rejected...'"
              :required="reviewAction === 'reject'"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeReviewModal" class="btn btn-secondary">Cancel</button>
          <button
            @click="submitReview"
            :class="['btn', reviewAction === 'approve' ? 'btn-approve' : 'btn-reject']"
            :disabled="reviewAction === 'reject' && !adminFeedback.trim()"
          >
            {{ reviewAction === 'approve' ? 'Approve' : 'Reject' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

interface Testimonial {
  id: number;
  studentId: number;
  studentName: string;
  teacherId?: number;
  teacherName?: string;
  courseProgramId?: number;
  courseProgramTitle?: string;
  rating: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  isFeatured: boolean;
  adminFeedback?: string;
  createdAt: string;
}

interface PaginatedResponse {
  testimonials: Testimonial[];
  total: number;
  page: number;
  limit: number;
}

interface Student {
  id: number;
  name: string;
  email: string;
}

interface Teacher {
  id: number;
  name: string;
}

interface Course {
  id: number;
  title: string;
}

interface CreateForm {
  studentId: number | '';
  type: 'general' | 'teacher' | 'course';
  teacherId: number | '';
  courseProgramId: number | '';
  rating: number;
  comment: string;
  status: 'approved' | 'pending' | 'rejected';
  isFeatured: boolean;
  adminFeedback: string;
}

const testimonials = ref<Testimonial[]>([]);
const loading = ref(true);
const error = ref('');
const success = ref('');

const filters = ref({
  status: '',
});

const currentPage = ref(1);
const totalPages = ref(1);
const totalCount = ref(0);

const showReviewModal = ref(false);
const selectedTestimonial = ref<Testimonial | null>(null);
const reviewAction = ref<'approve' | 'reject'>('approve');
const adminFeedback = ref('');

// Create modal state
const showCreateModal = ref(false);
const students = ref<Student[]>([]);
const teachers = ref<Teacher[]>([]);
const courses = ref<Course[]>([]);
const createForm = ref<CreateForm>({
  studentId: '',
  type: 'general',
  teacherId: '',
  courseProgramId: '',
  rating: 5,
  comment: '',
  status: 'approved',
  isFeatured: false,
  adminFeedback: '',
});

const pendingCount = computed(() => testimonials.value.filter(t => t.status === 'pending').length);
const approvedCount = computed(() => testimonials.value.filter(t => t.status === 'approved').length);
const rejectedCount = computed(() => testimonials.value.filter(t => t.status === 'rejected').length);

const isCreateFormValid = computed(() => {
  if (!createForm.value.studentId) return false;
  if (createForm.value.rating < 1 || createForm.value.rating > 5) return false;
  if (createForm.value.type === 'teacher' && !createForm.value.teacherId) return false;
  if (createForm.value.type === 'course' && !createForm.value.courseProgramId) return false;
  return true;
});

onMounted(() => {
  fetchTestimonials();
});

const fetchTestimonials = async () => {
  loading.value = true;
  error.value = '';

  try {
    const params = new URLSearchParams({
      page: String(currentPage.value),
      limit: '20',
    });

    if (filters.value.status) {
      params.append('status', filters.value.status);
    }

    const response = await fetch(`/api/admin/testimonials?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch testimonials');
    }

    const data: PaginatedResponse = await response.json();
    testimonials.value = data.testimonials;
    totalCount.value = data.total;
    totalPages.value = Math.ceil(data.total / data.limit);
  } catch (err: any) {
    error.value = err.message || 'Failed to load testimonials';
  } finally {
    loading.value = false;
  }
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchTestimonials();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchTestimonials();
  }
};

const openReviewModal = (testimonial: Testimonial, action: 'approve' | 'reject') => {
  selectedTestimonial.value = testimonial;
  reviewAction.value = action;
  adminFeedback.value = '';
  showReviewModal.value = true;
};

const closeReviewModal = () => {
  showReviewModal.value = false;
  selectedTestimonial.value = null;
  adminFeedback.value = '';
};

const submitReview = async () => {
  if (!selectedTestimonial.value) return;
  if (reviewAction.value === 'reject' && !adminFeedback.value.trim()) {
    error.value = 'Admin feedback is required when rejecting testimonials';
    return;
  }

  try {
    const endpoint = reviewAction.value === 'approve' ? 'approve' : 'reject';
    const response = await fetch(`/api/admin/testimonials/${selectedTestimonial.value.id}/${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        adminFeedback: adminFeedback.value.trim() || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to ${reviewAction.value} testimonial`);
    }

    success.value = `Testimonial ${reviewAction.value === 'approve' ? 'approved' : 'rejected'} successfully!`;
    closeReviewModal();
    await fetchTestimonials();

    setTimeout(() => {
      success.value = '';
    }, 3000);
  } catch (err: any) {
    error.value = err.message || `Failed to ${reviewAction.value} testimonial`;
  }
};

const toggleFeatured = async (id: number, currentStatus: boolean) => {
  try {
    const response = await fetch(`/api/admin/testimonials/${id}/featured`, {
      method: 'PATCH',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to update featured status');
    }

    success.value = currentStatus ? 'Removed from featured' : 'Marked as featured';
    await fetchTestimonials();

    setTimeout(() => {
      success.value = '';
    }, 3000);
  } catch (err: any) {
    error.value = err.message || 'Failed to update featured status';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Create modal functions
const openCreateModal = async () => {
  error.value = '';

  try {
    // Fetch creation options
    const response = await fetch('/api/admin/testimonials/creation-options', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch creation options');
    }

    const data = await response.json();
    students.value = data.students;
    teachers.value = data.teachers;
    courses.value = data.courses;

    // Reset form
    createForm.value = {
      studentId: '',
      type: 'general',
      teacherId: '',
      courseProgramId: '',
      rating: 5,
      comment: '',
      status: 'approved',
      isFeatured: false,
      adminFeedback: '',
    };

    showCreateModal.value = true;
  } catch (err: any) {
    error.value = err.message || 'Failed to load creation options';
  }
};

const closeCreateModal = () => {
  showCreateModal.value = false;
};

const submitCreate = async () => {
  if (!isCreateFormValid.value) return;

  error.value = '';

  try {
    const payload: any = {
      studentId: createForm.value.studentId,
      rating: createForm.value.rating,
      comment: createForm.value.comment || null,
      status: createForm.value.status,
      isFeatured: createForm.value.isFeatured,
      adminFeedback: createForm.value.adminFeedback || null,
    };

    // Add teacher or course ID based on type
    if (createForm.value.type === 'teacher' && createForm.value.teacherId) {
      payload.teacherId = createForm.value.teacherId;
    } else if (createForm.value.type === 'course' && createForm.value.courseProgramId) {
      payload.courseProgramId = createForm.value.courseProgramId;
    }

    const response = await fetch('/api/admin/testimonials', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create testimonial');
    }

    success.value = 'Testimonial created successfully!';
    closeCreateModal();
    await fetchTestimonials();

    setTimeout(() => {
      success.value = '';
    }, 3000);
  } catch (err: any) {
    error.value = err.message || 'Failed to create testimonial';
  }
};
</script>

<style scoped>
.testimonials-admin {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  margin-bottom: 30px;
}

.title-section {
  margin-bottom: 20px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.title-section h1 {
  margin: 0 0 5px 0;
  font-size: 28px;
  font-weight: 700;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.create-button {
  margin-left: auto;
  white-space: nowrap;
}

.stats-bar {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 150px;
  padding: 20px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid;
}

.stat-card.pending {
  border-left-color: #f59e0b;
}

.stat-card.approved {
  border-left-color: #10b981;
}

.stat-card.rejected {
  border-left-color: #ef4444;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.filters {
  display: flex;
  gap: 20px;
  align-items: end;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.page-info {
  font-size: 14px;
  color: #6b7280;
}

.message {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.message.error {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  color: #991b1b;
}

.message.success {
  background: #d1fae5;
  border-left: 4px solid #10b981;
  color: #065f46;
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.testimonials-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.testimonial-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.student-info {
  display: flex;
  gap: 15px;
  align-items: center;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
}

.info .name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.info .meta {
  font-size: 13px;
  color: #6b7280;
}

.separator {
  margin: 0 8px;
}

.status-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #991b1b;
}

.icon-button {
  padding: 6px 10px;
  border: none;
  background: #f3f4f6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
}

.icon-button:hover {
  background: #e5e7eb;
}

.icon-button.featured {
  background: #fef3c7;
}

.card-body {
  padding: 20px;
}

.rating {
  margin-bottom: 15px;
}

.star {
  font-size: 20px;
  color: #d1d5db;
}

.star.filled {
  color: #fbbf24;
}

.comment {
  font-style: italic;
  color: #374151;
  margin-bottom: 15px;
}

.no-comment {
  color: #9ca3af;
  font-style: italic;
}

.admin-feedback {
  margin-top: 15px;
  padding: 15px;
  background: #f9fafb;
  border-left: 3px solid #6b7280;
  border-radius: 4px;
}

.admin-feedback strong {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  text-transform: uppercase;
  color: #4b5563;
}

.admin-feedback p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.card-actions {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-approve {
  background: #10b981;
  color: white;
}

.btn-approve:hover:not(:disabled) {
  background: #059669;
}

.btn-reject {
  background: #ef4444;
  color: white;
}

.btn-reject:hover:not(:disabled) {
  background: #dc2626;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 20px;
  margin-bottom: 10px;
}

.empty-state p {
  color: #6b7280;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-button {
  background: none;
  border: none;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
}

.close-button:hover {
  color: #374151;
}

.modal-body {
  padding: 20px;
}

.testimonial-preview {
  background: #f9fafb;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.testimonial-preview p {
  margin: 8px 0;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
}

.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}

/* Create Modal Styles */
.large-modal {
  max-width: 700px;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.required {
  color: #ef4444;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.radio-option:hover {
  background: #f3f4f6;
}

.radio-option input[type="radio"] {
  cursor: pointer;
}

.rating-input {
  display: flex;
  align-items: center;
  gap: 5px;
}

.star-button {
  background: none;
  border: none;
  font-size: 32px;
  color: #d1d5db;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.star-button:hover {
  color: #fbbf24;
}

.star-button.active {
  color: #fbbf24;
}

.rating-value {
  margin-left: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.form-group small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.form-group select,
.form-group textarea {
  width: 100%;
}
</style>
