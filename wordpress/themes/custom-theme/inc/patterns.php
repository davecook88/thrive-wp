<?php
// Register a block pattern that inserts the wrapper with both child blocks

function custom_theme_register_patterns()
{
    if (!function_exists('register_block_pattern')) {
        return;
    }

    $pattern_content = '<!-- wp:custom-theme/teacher-availability-wrapper {"selectedTeacherId":"me","heading":"Teacher Availability"} -->';
    $pattern_content .= '<div class="wp-block-custom-theme-teacher-availability-wrapper">';
    $pattern_content .= '<!-- wp:custom-theme/teacher-availability /-->';
    $pattern_content .= '<!-- wp:custom-theme/thrive-calendar /-->';
    $pattern_content .= '</div><!-- /wp:custom-theme/teacher-availability-wrapper -->';

    register_block_pattern(
        'custom-theme/teacher-availability',
        array(
            'title' => __('Teacher availability', 'custom-theme'),
            'categories' => array('widgets'),
            'content' => $pattern_content,
        )
    );
}
add_action('init', 'custom_theme_register_patterns');
