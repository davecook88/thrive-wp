<?php
/**
 * Register block pattern categories and patterns.
 */

function custom_theme_register_block_patterns()
{
    if (function_exists('register_block_pattern_category')) {
        register_block_pattern_category(
            'custom-theme',
            array('label' => __('Custom Theme', 'custom-theme'))
        );
    }

    if (function_exists('register_block_pattern')) {
        $patterns = [
            'thrive-hero' => '/patterns/thrive-hero.php',
            'statistics-section' => '/patterns/statistics-section.php',
            'self-paced-section' => '/patterns/self-paced-section.php',
            'diego-section' => '/patterns/diego-section.php',
            'complete-page' => '/patterns/complete-page.php',
        ];

        foreach ($patterns as $name => $relpath) {
            $path = get_template_directory() . $relpath;
            if (!file_exists($path)) {
                continue;
            }
            $content = file_get_contents($path);
            $content = preg_replace('/^<\?php[\s\S]*?\?\>/', '', $content);
            register_block_pattern(
                'custom-theme/' . $name,
                array(
                    'title' => ucwords(str_replace('-', ' ', $name)),
                    'content' => trim($content),
                    'categories' => array('custom-theme', 'featured'),
                )
            );
        }
    }
}
add_action('init', 'custom_theme_register_block_patterns');

?>