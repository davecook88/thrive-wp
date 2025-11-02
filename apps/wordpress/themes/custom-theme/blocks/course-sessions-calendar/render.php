<?php
/**
 * Course Sessions Calendar Block
 *
 * @package CustomTheme
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Render callback for course sessions calendar block.
 *
 * @param array $attributes Block attributes.
 * @return string Block HTML.
 */
function custom_theme_render_course_sessions_calendar_block($attributes)
{
    $show_future_only = isset($attributes['showFutureOnly']) ? $attributes['showFutureOnly'] : true;
    $default_view = isset($attributes['defaultView']) ? $attributes['defaultView'] : 'week';
    $height = isset($attributes['height']) ? $attributes['height'] : 600;
    $show_heading = isset($attributes['showHeading']) ? $attributes['showHeading'] : true;
    $heading_text = isset($attributes['headingText']) ? $attributes['headingText'] : 'Course Schedule';

    // Get course code from URL (from rewrite rule)
    $course_code = get_query_var('course_code');

    if (empty($course_code)) {
        return '<div class="wp-block-custom-theme-course-sessions-calendar"><p>No course code found.</p></div>';
    }

    // Generate unique ID for this instance
    $block_id = 'course-calendar-' . wp_unique_id();

    ob_start();
    ?>
    <div class="wp-block-custom-theme-course-sessions-calendar" id="<?php echo esc_attr($block_id); ?>"
        data-course-code="<?php echo esc_attr($course_code); ?>"
        data-show-future-only="<?php echo esc_attr($show_future_only ? 'true' : 'false'); ?>"
        data-default-view="<?php echo esc_attr($default_view); ?>" data-height="<?php echo esc_attr($height); ?>"
        data-show-heading="<?php echo esc_attr($show_heading ? 'true' : 'false'); ?>"
        data-heading-text="<?php echo esc_attr($heading_text); ?>">
        <div class="course-calendar-loading">
            <p>Loading calendar...</p>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

// Register the block type.
register_block_type(__DIR__, [
    'render_callback' => 'custom_theme_render_course_sessions_calendar_block',
]);
