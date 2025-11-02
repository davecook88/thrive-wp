<?php
/**
 * Course Details Block
 *
 * @package CustomTheme
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Render callback for course details block.
 *
 * @param array $attributes Block attributes.
 * @param string $content Block content (inner blocks).
 * @return string Block HTML.
 */
function custom_theme_render_course_details_block($attributes, $content)
{
    if (empty($content)) {
        return '';
    }

    $class = 'wp-block-custom-theme-course-details';

    // Add alignment class if set
    if (!empty($attributes['align'])) {
        $class .= ' align' . $attributes['align'];
    }

    return sprintf(
        '<div class="%s">%s</div>',
        esc_attr($class),
        $content
    );
}

// Register the block type.
register_block_type(__DIR__, [
    'render_callback' => 'custom_theme_render_course_details_block',
]);
