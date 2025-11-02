<?php
/**
 * Server render for Course Cohorts block.
 */

$attrs = $attributes ?? [];

$showDescription = isset($attrs['showDescription']) ? (bool) $attrs['showDescription'] : true;
$showEnrollmentCount = isset($attrs['showEnrollmentCount']) ? (bool) $attrs['showEnrollmentCount'] : true;
$ctaText = isset($attrs['ctaText']) ? sanitize_text_field($attrs['ctaText']) : 'Enroll';

// Get course code from post meta or query var
$course_code = get_query_var('course_code');
if (empty($course_code)) {
    $course_code = get_post_meta(get_the_ID(), '_thrive_course_code', true);
}

?>
<div class="course-cohorts-block" data-show-description="<?php echo esc_attr($showDescription ? '1' : '0'); ?>"
    data-show-enrollment-count="<?php echo esc_attr($showEnrollmentCount ? '1' : '0'); ?>"
    data-cta-text="<?php echo esc_attr($ctaText); ?>" data-course-code="<?php echo esc_attr($course_code); ?>">
</div>