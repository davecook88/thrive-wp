<?php
/**
 * Server render for Course Detail block.
 */

$attrs = $attributes ?? [];

$showDescription = isset($attrs['showDescription']) ? (bool) $attrs['showDescription'] : true;
$showLevelBadges = isset($attrs['showLevelBadges']) ? (bool) $attrs['showLevelBadges'] : true;
$showPrice = isset($attrs['showPrice']) ? (bool) $attrs['showPrice'] : true;
$showStepCount = isset($attrs['showStepCount']) ? (bool) $attrs['showStepCount'] : true;
$defaultView = isset($attrs['defaultView']) ? $attrs['defaultView'] : 'week';
$calendarHeight = isset($attrs['calendarHeight']) ? (int) $attrs['calendarHeight'] : 600;

// Get course code from post meta or query var
$course_code = get_query_var('course_code');
if (empty($course_code)) {
    $course_code = get_post_meta(get_the_ID(), '_thrive_course_code', true);
}

?>
<div class="course-detail-block"
    data-show-description="<?php echo esc_attr($showDescription ? '1' : '0'); ?>"
    data-show-level-badges="<?php echo esc_attr($showLevelBadges ? '1' : '0'); ?>"
    data-show-price="<?php echo esc_attr($showPrice ? '1' : '0'); ?>"
    data-show-step-count="<?php echo esc_attr($showStepCount ? '1' : '0'); ?>"
    data-default-view="<?php echo esc_attr($defaultView); ?>"
    data-calendar-height="<?php echo esc_attr($calendarHeight); ?>"
    data-course-code="<?php echo esc_attr($course_code); ?>">
</div>
