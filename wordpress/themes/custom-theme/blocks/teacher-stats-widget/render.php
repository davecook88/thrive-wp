<?php
/**
 * Server render for teacher-stats-widget block
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
$show_active_students = isset($block_attributes['showActiveStudents']) ? $block_attributes['showActiveStudents'] : true;

?>
<div
    class="wp-block-custom-theme-teacher-stats-widget"
    data-show-next-session="<?php echo esc_attr($show_next_session ? 'true' : 'false'); ?>"
    data-show-completed-sessions="<?php echo esc_attr($show_completed ? 'true' : 'false'); ?>"
    data-show-scheduled-sessions="<?php echo esc_attr($show_scheduled ? 'true' : 'false'); ?>"
    data-show-active-students="<?php echo esc_attr($show_active_students ? 'true' : 'false'); ?>"
></div>
