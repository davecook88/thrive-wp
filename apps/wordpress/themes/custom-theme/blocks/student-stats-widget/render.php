<?php
/**
 * Server render for student-stats-widget block
 *
 * Outputs a container that will be hydrated by React on the client side.
 */

if (!defined('ABSPATH')) {
    exit;
}

$block_attributes = isset($attributes) ? $attributes : [];
$show_next_session = isset($block_attributes['showNextSession']) ? $block_attributes['showNextSession'] : true;
$show_completed = isset($block_attributes['showCompletedSessions']) ? $block_attributes['showCompletedSessions'] : true;
$show_scheduled = isset($block_attributes['showScheduledSessions']) ? $block_attributes['showScheduledSessions'] : true;
$show_courses = isset($block_attributes['showActiveCourses']) ? $block_attributes['showActiveCourses'] : true;

echo '<div
    class="student-stats-widget-block"
    id="student-stats-widget-root"
    data-show-next-session="' . esc_attr($show_next_session ? '1' : '0') . '"
    data-show-completed="' . esc_attr($show_completed ? '1' : '0') . '"
    data-show-scheduled="' . esc_attr($show_scheduled ? '1' : '0') . '"
    data-show-courses="' . esc_attr($show_courses ? '1' : '0') . '"
></div>';
