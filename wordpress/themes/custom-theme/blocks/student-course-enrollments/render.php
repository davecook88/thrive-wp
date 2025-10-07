<?php
/**
 * Server render for student-course-enrollments block
 */

if (!defined('ABSPATH')) {
    exit;
}

$block_attributes = isset($attributes) ? $attributes : [];
$show_progress = isset($block_attributes['showProgress']) ? $block_attributes['showProgress'] : true;
$show_next_session = isset($block_attributes['showNextSession']) ? $block_attributes['showNextSession'] : true;

echo '<div
    class="student-course-enrollments-block"
    id="student-course-enrollments-root"
    data-show-progress="' . esc_attr($show_progress ? '1' : '0') . '"
    data-show-next-session="' . esc_attr($show_next_session ? '1' : '0') . '"
></div>';
