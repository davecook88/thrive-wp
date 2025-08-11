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
    // Auth component logic is now inlined within its template part (login-auth.html).
    // Add other global/enqueued scripts here as needed.
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

// Strongly typed auth context integration
require_once get_template_directory() . '/includes/class-thrive-auth-context.php';
// Register custom dynamic blocks (metadata based)

// Enqueue built block JS for the editor globally
add_action('enqueue_block_editor_assets', function () {
    $build = get_template_directory() . '/build/index.js';
    error_log('Enqueueing: ' . $build . ' (exists: ' . (file_exists($build) ? 'yes' : 'no') . ')');

    if (file_exists($build)) {
        wp_enqueue_script(
            'custom-theme-blocks',
            get_template_directory_uri() . '/build/index.js',
            array('wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n'),
            filemtime($build)
        );
    }
});

// Register all block.json files in /blocks subfolders
add_action('init', function () {
    $blocks_dir = get_template_directory() . '/blocks';
    foreach (glob($blocks_dir . '/*/block.json') as $block_json) {
        register_block_type(dirname($block_json));
    }
});

function thrive_hydrate_user_from_proxy(): void
{
    // Parse header into context only (no WP user creation / mapping)
    $rawHeader = $_SERVER['HTTP_X_AUTH_CONTEXT'] ?? '';
    $ctx = ThriveAuthContext::fromJson($rawHeader);
    if ($ctx !== null) {
        $GLOBALS['thrive_auth_context'] = $ctx;
    }
}

// Run very early on init so templates & later hooks see the user; after pluggable is loaded.
add_action('init', 'thrive_hydrate_user_from_proxy', 1);

/**
 * Helper: get object context.
 * @return ThriveAuthContext|null
 */
function thrive_get_auth_context(): ?ThriveAuthContext
{
    $ctx = $GLOBALS['thrive_auth_context'] ?? null;
    return $ctx instanceof ThriveAuthContext ? $ctx : null;
}

/**
 * Lightweight auth check relying on reverse proxy validated session.
 * Source of truth is the NestJS session cookie (validated by Nginx before headers are injected).
 * We consider the user "logged in" if any of these are present:
 *  - Parsed ThriveAuthContext object (preferred)
 *  - X-Auth-Email header (set only after successful introspection)
 *  - Session cookie thrive_sess (name configurable, but default from docs)
 */
function thrive_is_logged_in(): bool
{
    if (thrive_get_auth_context() instanceof ThriveAuthContext) {
        return true;
    }
    if (!empty($_SERVER['HTTP_X_AUTH_EMAIL'])) {
        return true;
    }
    // Fallback: presence of session cookie (may be slightly optimistic if expired but not yet purged)
    $cookieName = $_ENV['SESSION_COOKIE_NAME'] ?? 'thrive_sess';
    return isset($_COOKIE[$cookieName]) && $_COOKIE[$cookieName] !== '';
}

/**
 * Helper: legacy array form for templates.
 * @return array<string,mixed>|null
 */
function thrive_get_auth_context_array(): ?array
{
    $ctx = thrive_get_auth_context();
    return $ctx ? $ctx->toArray() : null;
}

// Server-side replacement for template-part 'login-auth' to use PHP logic.
// Legacy template-part override removed in favor of dynamic block.

