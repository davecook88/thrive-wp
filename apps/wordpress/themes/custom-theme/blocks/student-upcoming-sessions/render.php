<?php
/**
 * Server render for student-upcoming-sessions block
 */

if (!defined('ABSPATH')) {
    exit;
}

$block_attributes = isset($attributes) ? $attributes : [];
$limit = isset($block_attributes['limit']) ? intval($block_attributes['limit']) : 5;
$show_meeting_links = isset($block_attributes['showMeetingLinks']) ? $block_attributes['showMeetingLinks'] : true;

echo '<div
    class="student-upcoming-sessions-block"
    id="student-upcoming-sessions-root"
    data-limit="' . esc_attr($limit) . '"
    data-show-meeting-links="' . esc_attr($show_meeting_links ? '1' : '0') . '"
></div>';
