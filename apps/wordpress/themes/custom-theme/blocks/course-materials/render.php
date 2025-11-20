<?php
/**
 * Server render for Student Course Materials block.
 */

// Ensure auth helpers exist
if (!function_exists('thrive_is_logged_in')) {
    echo '';
    return;
}

// Only show for logged-in users
if (!thrive_is_logged_in()) {
    $cur = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '/';
    echo '<div class="course-materials-login-required">' .
        '<p>Please <a href="' . esc_url('/api/auth/google/start?redirect=' . rawurlencode($cur)) . '">sign in</a> to view course materials.</p>' .
        '</div>';
    return;
}

$attrs = $attributes ?? [];
$courseStepId = isset($attrs['courseStepId']) ? (int) $attrs['courseStepId'] : 0;

if ($courseStepId <= 0) {
    echo '<div class="course-materials-error"><p>Course step not configured.</p></div>';
    return;
}

// Get auth context
$ctx = thrive_get_auth_context();
if (!$ctx || !$ctx->email) {
    echo '<div class="course-materials-error"><p>Unable to determine user context.</p></div>';
    return;
}

// Attempt to find the student package ID for this course step
global $wpdb;

// 1. Get course program ID from step
$course_program_id = $wpdb->get_var($wpdb->prepare(
    "SELECT course_program_id FROM course_step WHERE id = %d",
    $courseStepId
));

$studentPackageId = 0;

if ($course_program_id) {
    // 2. Get stripe product map ID for the course
    $stripe_map_id = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM stripe_product_map WHERE scope_type = 'course' AND scope_id = %d",
        $course_program_id
    ));

    if ($stripe_map_id) {
        // 3. Get student package ID
        // Join student_package -> student -> user to match email
        $studentPackageId = $wpdb->get_var($wpdb->prepare(
            "SELECT sp.id 
             FROM student_package sp
             JOIN student s ON sp.student_id = s.id
             JOIN user u ON s.user_id = u.id
             WHERE u.email = %s 
             AND sp.stripe_product_map_id = %d
             AND (sp.expires_at IS NULL OR sp.expires_at > NOW())
             ORDER BY sp.purchased_at DESC
             LIMIT 1",
            $ctx->email,
            $stripe_map_id
        ));
    }
}

// If we couldn't find a package, we still render the block, 
// but the React component might show an error or limited view.
// Or maybe we should show a message here?
// The React component requires studentPackageId.
// If 0, it might fail.
// But maybe the user has access via some other means (e.g. admin)?
// If admin, maybe we don't need package ID?
// But the API requires it for progress tracking.

// For now, we pass what we found.

// Enqueue the view script (handled by block.json usually, but we can ensure dependencies)
// wp_enqueue_script('thrive-course-materials-view'); // This name depends on build

?>
<div class="student-course-materials-block" data-course-step-id="<?php echo esc_attr((string) $courseStepId); ?>"
    data-student-package-id="<?php echo esc_attr((string) ($studentPackageId ?: 0)); ?>">
</div>