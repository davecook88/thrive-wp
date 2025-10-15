<?php
/**
 * Server render for teacher-calendar block
 */

if (!defined('ABSPATH')) {
    exit;
}

$block_attributes = isset($attributes) ? $attributes : [];
$view = isset($block_attributes['view']) ? $block_attributes['view'] : 'week';
$slot_duration = isset($block_attributes['slotDuration']) ? $block_attributes['slotDuration'] : 30;
$snap_to = isset($block_attributes['snapTo']) ? $block_attributes['snapTo'] : 15;
$view_height = isset($block_attributes['viewHeight']) ? $block_attributes['viewHeight'] : 600;

?>
<div
    class="wp-block-custom-theme-teacher-calendar"
    data-view="<?php echo esc_attr($view); ?>"
    data-slot-duration="<?php echo esc_attr($slot_duration); ?>"
    data-snap-to="<?php echo esc_attr($snap_to); ?>"
    data-view-height="<?php echo esc_attr($view_height); ?>"
></div>
