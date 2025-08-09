<?php
/**
 * Theme functions and definitions
 */

// Enqueue theme styles
function custom_theme_styles()
{
    wp_enqueue_style(
        'custom-theme-style',
        get_stylesheet_uri(),
        array(),
        wp_get_theme()->get('Version')
    );

    // Enqueue Google Fonts
    wp_enqueue_style(
        'custom-theme-fonts',
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        array(),
        null
    );
}
add_action('wp_enqueue_scripts', 'custom_theme_styles');

// Enqueue theme scripts
function custom_theme_scripts()
{
    wp_enqueue_script(
        'custom-theme-login-modal',
        get_template_directory_uri() . '/js/login-modal.js',
        array(),
        wp_get_theme()->get('Version'),
        true
    );

    // Pass NestJS OAuth endpoint (assumes default local port)
    wp_add_inline_script(
        'custom-theme-login-modal',
        'window.ThriveAuthConfig = ' . wp_json_encode([
            'googleAuthUrl' => 'http://localhost:3000/auth/google',
        ]) . ';',
        'before'
    );
}
add_action('wp_enqueue_scripts', 'custom_theme_scripts');

// Add theme support for various features
function custom_theme_setup()
{
    // Add support for block styles
    add_theme_support('wp-block-styles');

    // Add support for responsive embeds
    add_theme_support('responsive-embeds');

    // Add support for editor styles
    add_theme_support('editor-styles');

    // Add support for custom logo
    add_theme_support('custom-logo');

    // Add support for post thumbnails
    add_theme_support('post-thumbnails');

    // Add support for HTML5
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script'
    ));

    // Add support for wide alignment
    add_theme_support('align-wide');

    // Add support for custom line height
    add_theme_support('custom-line-height');

    // Add support for custom units
    add_theme_support('custom-units');
}
add_action('after_setup_theme', 'custom_theme_setup');

// Register block patterns
function custom_theme_register_block_patterns()
{
    if (function_exists('register_block_pattern_category')) {
        register_block_pattern_category(
            'custom-theme',
            array('label' => __('Custom Theme', 'custom-theme'))
        );
    }

    // Register individual patterns
    if (function_exists('register_block_pattern')) {
        // Register Thrive Hero pattern
        $thrive_hero_content = file_get_contents(get_template_directory() . '/patterns/thrive-hero.php');
        $thrive_hero_content = preg_replace('/^<\?php[\s\S]*?\?\>/', '', $thrive_hero_content);

        register_block_pattern(
            'custom-theme/thrive-hero',
            array(
                'title' => __('Thrive in Spanish Hero', 'custom-theme'),
                'content' => trim($thrive_hero_content),
                'categories' => array('custom-theme', 'featured', 'call-to-action'),
            )
        );

        // Register Statistics Section pattern
        $statistics_content = file_get_contents(get_template_directory() . '/patterns/statistics-section.php');
        $statistics_content = preg_replace('/^<\?php[\s\S]*?\?\>/', '', $statistics_content);

        register_block_pattern(
            'custom-theme/statistics-section',
            array(
                'title' => __('Statistics Section', 'custom-theme'),
                'content' => trim($statistics_content),
                'categories' => array('custom-theme', 'featured'),
            )
        );

        // Register Self-Paced Section pattern
        $self_paced_content = file_get_contents(get_template_directory() . '/patterns/self-paced-section.php');
        $self_paced_content = preg_replace('/^<\?php[\s\S]*?\?\>/', '', $self_paced_content);

        register_block_pattern(
            'custom-theme/self-paced-section',
            array(
                'title' => __('Self-Paced Learning Section', 'custom-theme'),
                'content' => trim($self_paced_content),
                'categories' => array('custom-theme', 'featured'),
            )
        );

        // Register Diego Section pattern
        $diego_content = file_get_contents(get_template_directory() . '/patterns/diego-section.php');
        $diego_content = preg_replace('/^<\?php[\s\S]*?\?\>/', '', $diego_content);

        register_block_pattern(
            'custom-theme/diego-section',
            array(
                'title' => __('Diego AI Assistant Section', 'custom-theme'),
                'content' => trim($diego_content),
                'categories' => array('custom-theme', 'featured'),
            )
        );

        // Register Complete Page pattern
        $complete_page_content = file_get_contents(get_template_directory() . '/patterns/complete-page.php');
        $complete_page_content = preg_replace('/^<\?php[\s\S]*?\?\>/', '', $complete_page_content);

        register_block_pattern(
            'custom-theme/complete-page',
            array(
                'title' => __('Thrive Spanish Complete Page', 'custom-theme'),
                'content' => trim($complete_page_content),
                'categories' => array('custom-theme', 'featured'),
            )
        );
    }
}
add_action('init', 'custom_theme_register_block_patterns');

// Customize the block editor
function custom_theme_block_editor_settings($editor_settings, $editor_context)
{
    if (!empty($editor_context->post)) {
        $editor_settings['maxWidth'] = '1200px';
    }
    return $editor_settings;
}
add_filter('block_editor_settings_all', 'custom_theme_block_editor_settings', 10, 2);
