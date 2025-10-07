<?php
/**
 * Server render for student-package-details block
 */

if (!defined('ABSPATH')) {
    exit;
}

$block_attributes = isset($attributes) ? $attributes : [];
$view_mode = isset($block_attributes['viewMode']) ? $block_attributes['viewMode'] : 'detailed';
$show_expired = isset($block_attributes['showExpired']) ? $block_attributes['showExpired'] : false;

echo '<div
    class="student-package-details-block"
    id="student-package-details-root"
    data-view-mode="' . esc_attr($view_mode) . '"
    data-show-expired="' . esc_attr($show_expired ? '1' : '0') . '"
></div>';
