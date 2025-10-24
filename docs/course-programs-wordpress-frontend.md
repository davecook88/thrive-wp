# Course Programs: WordPress & Frontend Implementation Plan

## Overview
This document details the WordPress and frontend components needed for the course programs feature, including API client wrappers, course catalog pages, calendar integration, student dashboard, and checkout flow.

---

## Architecture

### Component Structure
```
wordpress/
├── plugins/thrive-admin/
│   └── includes/
│       └── api/
│           └── course-programs.php      # ❌ TO CREATE - API client
├── themes/custom-theme/
│   ├── templates/
│   │   ├── course-catalog.php           # ❌ TO CREATE - Course listing page
│   │   └── course-detail.php            # ❌ TO CREATE - Single course page
│   ├── src/
│   │   ├── components/
│   │   │   ├── CourseCard.tsx           # ❌ TO CREATE - Course card component
│   │   │   ├── CourseStepList.tsx       # ❌ TO CREATE - Step listing
│   │   │   ├── EnrollmentStatus.tsx     # ❌ TO CREATE - Progress widget
│   │   │   └── CoursePurchaseModal.tsx  # ❌ TO CREATE - Purchase prompt
│   │   └── pages/
│   │       ├── CourseDetail.tsx         # ❌ TO CREATE - Course detail page
│   │       └── StudentDashboard.tsx     # ✅ UPDATE - Add course progress
│   └── functions/
│       └── course-programs.php          # ❌ TO CREATE - Helper functions
```

---

## Phase 1: API Client (PHP)

### Location: `wordpress/plugins/thrive-admin/includes/api/course-programs.php`

**Create API wrapper class:**

```php
<?php
/**
 * Course Programs API Client
 *
 * Provides methods to interact with the NestJS course-programs endpoints.
 */

namespace ThriveAdmin\API;

class CourseProgramsAPI {
    private string $api_base_url;

    public function __construct() {
        $this->api_base_url = defined('NESTJS_API_URL')
            ? NESTJS_API_URL
            : 'http://nestjs:3000';
    }

    /**
     * List all active course programs
     *
     * @return array|WP_Error
     */
    public function list_active_courses() {
        $response = wp_remote_get("{$this->api_base_url}/course-programs", [
            'timeout' => 15,
            'headers' => [
                'Content-Type' => 'application/json',
            ],
        ]);

        if (is_wp_error($response)) {
            return $response;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        return $data ?: [];
    }

    /**
     * Get course program detail by ID
     *
     * @param int $course_program_id
     * @return array|WP_Error
     */
    public function get_course_detail(int $course_program_id) {
        $response = wp_remote_get("{$this->api_base_url}/course-programs/{$course_program_id}", [
            'timeout' => 15,
            'headers' => [
                'Content-Type' => 'application/json',
            ],
        ]);

        if (is_wp_error($response)) {
            return $response;
        }

        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code === 404) {
            return new \WP_Error('not_found', 'Course program not found', ['status' => 404]);
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Get student's enrollment status for a course
     * Requires authentication
     *
     * @param int $course_program_id
     * @return array|WP_Error
     */
    public function get_enrollment_status(int $course_program_id) {
        $auth_context = thrive_get_auth_context();

        if (!$auth_context || !thrive_is_logged_in()) {
            return new \WP_Error('unauthorized', 'Authentication required', ['status' => 401]);
        }

        // Use proxied API endpoint so browser sends cookie
        $response = wp_remote_get("/api/course-programs/{$course_program_id}/enrollment-status", [
            'timeout' => 15,
            'headers' => [
                'Content-Type' => 'application/json',
                'Cookie' => $_SERVER['HTTP_COOKIE'] ?? '',
            ],
        ]);

        if (is_wp_error($response)) {
            return $response;
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Get student's active enrollments
     * Requires authentication
     *
     * @return array|WP_Error
     */
    public function get_my_enrollments() {
        $auth_context = thrive_get_auth_context();

        if (!$auth_context || !thrive_is_logged_in()) {
            return new \WP_Error('unauthorized', 'Authentication required', ['status' => 401]);
        }

        $response = wp_remote_get("/api/course-programs/me/enrollments", [
            'timeout' => 15,
            'headers' => [
                'Content-Type' => 'application/json',
                'Cookie' => $_SERVER['HTTP_COOKIE'] ?? '',
            ],
        ]);

        if (is_wp_error($response)) {
            return $response;
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Create checkout session for course purchase
     *
     * @param int $course_program_id
     * @param string $success_url
     * @param string $cancel_url
     * @return array|WP_Error Returns ['checkoutUrl' => string]
     */
    public function create_checkout_session(
        int $course_program_id,
        string $success_url,
        string $cancel_url
    ) {
        $auth_context = thrive_get_auth_context();

        if (!$auth_context || !thrive_is_logged_in()) {
            return new \WP_Error('unauthorized', 'Authentication required', ['status' => 401]);
        }

        $response = wp_remote_post("/api/course-programs/{$course_program_id}/checkout", [
            'timeout' => 15,
            'headers' => [
                'Content-Type' => 'application/json',
                'Cookie' => $_SERVER['HTTP_COOKIE'] ?? '',
            ],
            'body' => json_encode([
                'successUrl' => $success_url,
                'cancelUrl' => $cancel_url,
            ]),
        ]);

        if (is_wp_error($response)) {
            return $response;
        }

        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code !== 200 && $status_code !== 201) {
            $body = wp_remote_retrieve_body($response);
            $error = json_decode($body, true);
            return new \WP_Error(
                'checkout_failed',
                $error['message'] ?? 'Failed to create checkout session',
                ['status' => $status_code]
            );
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Format price from cents
     *
     * @param int|null $price_in_cents
     * @return string
     */
    public function format_price(?int $price_in_cents): string {
        if ($price_in_cents === null) {
            return 'Price TBD';
        }

        return '$' . number_format($price_in_cents / 100, 2);
    }
}
```

---

## Phase 2: Helper Functions (PHP)

### Location: `wordpress/themes/custom-theme/functions/course-programs.php`

```php
<?php
/**
 * Course Programs Helper Functions
 */

use ThriveAdmin\API\CourseProgramsAPI;

/**
 * Get course programs API client
 */
function thrive_course_programs_api(): CourseProgramsAPI {
    static $api = null;
    if ($api === null) {
        $api = new CourseProgramsAPI();
    }
    return $api;
}

/**
 * Get all active courses
 */
function thrive_get_active_courses(): array {
    $api = thrive_course_programs_api();
    $courses = $api->list_active_courses();

    if (is_wp_error($courses)) {
        error_log('Failed to fetch courses: ' . $courses->get_error_message());
        return [];
    }

    return $courses;
}

/**
 * Get course detail by ID
 */
function thrive_get_course_detail(int $course_id) {
    $api = thrive_course_programs_api();
    return $api->get_course_detail($course_id);
}

/**
 * Check if current user is enrolled in a course
 */
function thrive_is_enrolled_in_course(int $course_program_id): bool {
    if (!thrive_is_logged_in()) {
        return false;
    }

    $api = thrive_course_programs_api();
    $status = $api->get_enrollment_status($course_program_id);

    if (is_wp_error($status)) {
        return false;
    }

    return $status['isEnrolled'] ?? false;
}

/**
 * Get student's course progress
 */
function thrive_get_course_progress(int $course_program_id): ?array {
    if (!thrive_is_logged_in()) {
        return null;
    }

    $api = thrive_course_programs_api();
    $status = $api->get_enrollment_status($course_program_id);

    if (is_wp_error($status)) {
        return null;
    }

    return $status;
}

/**
 * Render course step status badge
 */
function thrive_render_step_status_badge(string $status): string {
    $badge_classes = [
        'UNBOOKED' => 'bg-gray-200 text-gray-700',
        'BOOKED' => 'bg-blue-500 text-white',
        'COMPLETED' => 'bg-green-500 text-white',
        'MISSED' => 'bg-red-500 text-white',
        'CANCELLED' => 'bg-yellow-500 text-white',
    ];

    $badge_labels = [
        'UNBOOKED' => 'Not Booked',
        'BOOKED' => 'Booked',
        'COMPLETED' => 'Completed',
        'MISSED' => 'Missed',
        'CANCELLED' => 'Cancelled',
    ];

    $class = $badge_classes[$status] ?? 'bg-gray-200 text-gray-700';
    $label = $badge_labels[$status] ?? $status;

    return sprintf(
        '<span class="px-2 py-1 text-xs font-semibold rounded-full %s">%s</span>',
        esc_attr($class),
        esc_html($label)
    );
}
```

**Add to theme's functions.php:**
```php
require_once get_template_directory() . '/functions/course-programs.php';
```

---

## Phase 3: Templates (PHP)

### Course Catalog Page

**Location: `wordpress/themes/custom-theme/templates/course-catalog.php`**

```php
<?php
/**
 * Template Name: Course Catalog
 */

get_header();

$courses = thrive_get_active_courses();
?>

<div class="container mx-auto px-4 py-8">
    <h1 class="text-4xl font-bold mb-8">Course Programs</h1>

    <?php if (empty($courses)): ?>
        <p class="text-gray-600">No courses available at this time.</p>
    <?php else: ?>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <?php foreach ($courses as $course): ?>
                <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div class="p-6">
                        <h2 class="text-2xl font-bold mb-2">
                            <a href="/courses/<?php echo esc_attr($course['id']); ?>" class="text-blue-600 hover:text-blue-800">
                                <?php echo esc_html($course['title']); ?>
                            </a>
                        </h2>

                        <p class="text-sm text-gray-500 mb-2">
                            Code: <?php echo esc_html($course['code']); ?>
                        </p>

                        <?php if ($course['description']): ?>
                            <p class="text-gray-700 mb-4 line-clamp-3">
                                <?php echo esc_html($course['description']); ?>
                            </p>
                        <?php endif; ?>

                        <div class="flex justify-between items-center mt-4">
                            <span class="text-2xl font-bold text-green-600">
                                <?php echo thrive_course_programs_api()->format_price($course['priceInCents']); ?>
                            </span>

                            <a href="/courses/<?php echo esc_attr($course['id']); ?>"
                               class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                                View Details
                            </a>
                        </div>

                        <?php if ($course['stepCount']): ?>
                            <p class="text-sm text-gray-600 mt-2">
                                <?php echo esc_html($course['stepCount']); ?> steps
                            </p>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>

<?php get_footer(); ?>
```

---

### Course Detail Page

**Location: `wordpress/themes/custom-theme/templates/course-detail.php`**

```php
<?php
/**
 * Template Name: Course Detail
 */

get_header();

$course_id = get_query_var('course_id') ?: $_GET['id'] ?? null;

if (!$course_id) {
    echo '<p>Course not found.</p>';
    get_footer();
    exit;
}

$course = thrive_get_course_detail((int) $course_id);

if (is_wp_error($course)) {
    echo '<p>Course not found.</p>';
    get_footer();
    exit;
}

$is_enrolled = thrive_is_enrolled_in_course((int) $course_id);
$progress = $is_enrolled ? thrive_get_course_progress((int) $course_id) : null;
?>

<div class="container mx-auto px-4 py-8">
    <!-- Course Header -->
    <div class="mb-8">
        <h1 class="text-4xl font-bold mb-2"><?php echo esc_html($course['title']); ?></h1>
        <p class="text-lg text-gray-600">Course Code: <?php echo esc_html($course['code']); ?></p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="lg:col-span-2">
            <!-- Description -->
            <?php if ($course['description']): ?>
                <div class="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 class="text-2xl font-bold mb-4">About This Course</h2>
                    <p class="text-gray-700"><?php echo nl2br(esc_html($course['description'])); ?></p>
                </div>
            <?php endif; ?>

            <!-- Course Steps -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <h2 class="text-2xl font-bold mb-4">Course Curriculum</h2>

                <?php if (empty($course['steps'])): ?>
                    <p class="text-gray-600">No steps defined yet.</p>
                <?php else: ?>
                    <div class="space-y-4">
                        <?php foreach ($course['steps'] as $step): ?>
                            <div class="border rounded-lg p-4">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 class="text-lg font-bold">
                                            Step <?php echo esc_html($step['stepOrder']); ?>:
                                            <?php echo esc_html($step['label']); ?> - <?php echo esc_html($step['title']); ?>
                                        </h3>

                                        <?php if ($progress): ?>
                                            <?php
                                            $step_progress = array_filter(
                                                $progress['progress'],
                                                fn($p) => $p['courseStepId'] === $step['id']
                                            );
                                            $step_progress = reset($step_progress);
                                            ?>
                                            <?php if ($step_progress): ?>
                                                <div class="mt-2">
                                                    <?php echo thrive_render_step_status_badge($step_progress['status']); ?>
                                                </div>
                                            <?php endif; ?>
                                        <?php endif; ?>
                                    </div>

                                    <?php if ($step['isRequired']): ?>
                                        <span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Required</span>
                                    <?php endif; ?>
                                </div>

                                <?php if ($step['description']): ?>
                                    <p class="text-gray-600 mb-3"><?php echo esc_html($step['description']); ?></p>
                                <?php endif; ?>

                                <!-- Step Options -->
                                <?php if (!empty($step['options'])): ?>
                                    <div class="mt-3">
                                        <p class="text-sm font-semibold mb-2">Available Schedule Options:</p>
                                        <ul class="space-y-2">
                                            <?php foreach ($step['options'] as $option): ?>
                                                <?php if ($option['isActive']): ?>
                                                    <li class="text-sm text-gray-700 flex justify-between">
                                                        <span><?php echo esc_html($option['groupClassName']); ?></span>
                                                        <?php if (isset($option['availableSeats'])): ?>
                                                            <span class="text-gray-500">
                                                                <?php echo esc_html($option['availableSeats']); ?> seats available
                                                            </span>
                                                        <?php endif; ?>
                                                    </li>
                                                <?php endif; ?>
                                            <?php endforeach; ?>
                                        </ul>
                                    </div>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>

            <!-- Bundled Extras -->
            <?php if (!empty($course['bundleComponents'])): ?>
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-2xl font-bold mb-4">What's Included</h2>
                    <ul class="space-y-2">
                        <?php foreach ($course['bundleComponents'] as $component): ?>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                                </svg>
                                <span>
                                    <?php echo esc_html($component['description'] ?: "{$component['quantity']} {$component['componentType']}"); ?>
                                </span>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>
        </div>

        <!-- Sidebar -->
        <div class="lg:col-span-1">
            <div class="bg-white rounded-lg shadow p-6 sticky top-4">
                <div class="text-3xl font-bold text-green-600 mb-4">
                    <?php echo thrive_course_programs_api()->format_price($course['priceInCents']); ?>
                </div>

                <?php if ($is_enrolled): ?>
                    <div class="bg-green-100 text-green-800 p-4 rounded mb-4">
                        <p class="font-semibold">✓ You're enrolled!</p>
                        <?php if ($progress): ?>
                            <p class="text-sm mt-2">
                                Progress: <?php echo esc_html($progress['completedSteps']); ?> /
                                <?php echo esc_html($progress['totalSteps']); ?> steps completed
                            </p>
                        <?php endif; ?>
                    </div>

                    <a href="/student-dashboard?tab=courses"
                       class="block w-full bg-blue-600 text-white text-center px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                        View Your Progress
                    </a>
                <?php else: ?>
                    <?php if (thrive_is_logged_in()): ?>
                        <button
                            id="purchase-course-btn"
                            data-course-id="<?php echo esc_attr($course_id); ?>"
                            class="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                            Enroll Now
                        </button>
                    <?php else: ?>
                        <a href="/login?redirect=/courses/<?php echo esc_attr($course_id); ?>"
                           class="block w-full bg-blue-600 text-white text-center px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                            Login to Enroll
                        </a>
                    <?php endif; ?>
                <?php endif; ?>

                <!-- Course Info -->
                <div class="mt-6 pt-6 border-t">
                    <ul class="space-y-3 text-sm text-gray-700">
                        <li class="flex items-center">
                            <svg class="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                            <?php echo count($course['steps']); ?> structured steps
                        </li>

                        <li class="flex items-center">
                            <svg class="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Flexible scheduling
                        </li>

                        <li class="flex items-center">
                            <svg class="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Progress tracking
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Purchase Modal -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const purchaseBtn = document.getElementById('purchase-course-btn');

    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', async function() {
            const courseId = this.dataset.courseId;
            const successUrl = `${window.location.origin}/course-success?course_id=${courseId}`;
            const cancelUrl = window.location.href;

            try {
                const response = await fetch(`/api/course-programs/${courseId}/checkout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ successUrl, cancelUrl }),
                });

                const data = await response.json();

                if (data.checkoutUrl) {
                    window.location.href = data.checkoutUrl;
                } else {
                    alert('Failed to initiate checkout. Please try again.');
                }
            } catch (error) {
                console.error('Checkout error:', error);
                alert('An error occurred. Please try again.');
            }
        });
    }
});
</script>

<?php get_footer(); ?>
```

---

## Phase 4: Student Dashboard Integration

### Update Student Dashboard

**Location: `wordpress/themes/custom-theme/src/pages/StudentDashboard.tsx`**

**Add courses tab:**

```typescript
import { useEffect, useState } from 'react';

interface CourseEnrollment {
  id: number;
  courseProgram: {
    id: number;
    code: string;
    title: string;
  };
  status: 'ACTIVE' | 'CANCELLED' | 'REFUNDED';
  purchasedAt: string;
  progress: CourseProgress[];
}

interface CourseProgress {
  courseStepId: number;
  stepLabel: string;
  stepTitle: string;
  status: 'UNBOOKED' | 'BOOKED' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  bookedAt: string | null;
  completedAt: string | null;
}

function CourseEnrollmentsTab() {
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  async function fetchEnrollments() {
    try {
      const response = await fetch('/api/course-programs/me/enrollments', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setEnrollments(data);
      }
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading your courses...</div>;
  }

  if (enrollments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">You're not enrolled in any courses yet.</p>
        <a
          href="/courses"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Browse Courses
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {enrollments.map((enrollment) => (
        <div key={enrollment.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold">{enrollment.courseProgram.title}</h3>
              <p className="text-sm text-gray-600">Code: {enrollment.courseProgram.code}</p>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                enrollment.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {enrollment.status}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>
                {enrollment.progress.filter((p) => p.status === 'COMPLETED').length} /{' '}
                {enrollment.progress.length} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${
                    (enrollment.progress.filter((p) => p.status === 'COMPLETED').length /
                      enrollment.progress.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Step Progress */}
          <div className="space-y-2">
            <h4 className="font-semibold mb-2">Course Steps:</h4>
            {enrollment.progress.map((progress) => (
              <div
                key={progress.courseStepId}
                className="flex justify-between items-center border-b pb-2"
              >
                <div>
                  <p className="font-medium">
                    {progress.stepLabel}: {progress.stepTitle}
                  </p>
                  {progress.bookedAt && (
                    <p className="text-xs text-gray-500">
                      Booked: {new Date(progress.bookedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <StatusBadge status={progress.status} />
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <a
              href={`/courses/${enrollment.courseProgram.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Course
            </a>
            <a
              href="/calendar"
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            >
              Book Next Step
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: CourseProgress['status'] }) {
  const styles = {
    UNBOOKED: 'bg-gray-200 text-gray-700',
    BOOKED: 'bg-blue-500 text-white',
    COMPLETED: 'bg-green-500 text-white',
    MISSED: 'bg-red-500 text-white',
    CANCELLED: 'bg-yellow-500 text-white',
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}

export default CourseEnrollmentsTab;
```

---

## Phase 5: Calendar Integration

### Update Calendar to Show Course Steps

**Add course metadata to calendar events:**

```typescript
// In calendar API response processing

interface CalendarEvent {
  // ... existing fields
  courseStepId?: number;
  courseStepLabel?: string;
  courseProgramId?: number;
  courseProgramCode?: string;
  requiresEnrollment?: boolean;
}

// When rendering event
function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <div className="event-card">
      {event.courseProgramCode && (
        <div className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded mb-2">
          Course: {event.courseProgramCode} - {event.courseStepLabel}
        </div>
      )}

      {/* ... rest of event rendering */}

      {event.requiresEnrollment && !event.isEnrolled && (
        <button
          onClick={() => showEnrollmentModal(event.courseProgramId)}
          className="text-sm text-blue-600 underline"
        >
          Enroll in this course to book
        </button>
      )}
    </div>
  );
}
```

---

## Implementation Checklist

### PHP API Client
- [ ] Create `CourseProgramsAPI` class
- [ ] Implement `list_active_courses()`
- [ ] Implement `get_course_detail()`
- [ ] Implement `get_enrollment_status()`
- [ ] Implement `get_my_enrollments()`
- [ ] Implement `create_checkout_session()`
- [ ] Add error handling for all API calls

### Helper Functions
- [ ] Create helper functions file
- [ ] Implement `thrive_get_active_courses()`
- [ ] Implement `thrive_get_course_detail()`
- [ ] Implement `thrive_is_enrolled_in_course()`
- [ ] Implement `thrive_get_course_progress()`
- [ ] Implement `thrive_render_step_status_badge()`
- [ ] Add helpers to theme functions.php

### Templates
- [ ] Create course catalog template
- [ ] Create course detail template
- [ ] Add course success page template
- [ ] Test responsive design
- [ ] Add loading states
- [ ] Add error states

### Student Dashboard
- [ ] Add courses tab to dashboard
- [ ] Implement enrollment list component
- [ ] Implement progress display
- [ ] Add links to book next steps
- [ ] Add link to course detail pages

### Calendar Integration
- [ ] Add course metadata to calendar events
- [ ] Display course step badges
- [ ] Add enrollment check before booking
- [ ] Show enrollment modal for unenrolled users
- [ ] Test booking flow for course sessions

### Testing
- [ ] Test API client methods
- [ ] Test all templates with various data states
- [ ] Test enrollment flow end-to-end
- [ ] Test dashboard display
- [ ] Test calendar integration
- [ ] Test responsive design on mobile

---

## Next Steps

After WordPress/frontend implementation:
1. Build minimal admin interface for course management
2. Add email notifications for purchase confirmations
3. Implement progress tracking automation
4. Add analytics tracking for course views/purchases
