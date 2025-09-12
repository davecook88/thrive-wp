<?php
// Ensure booking page exists after theme setup
add_action('after_setup_theme', function () {
    if (defined('WP_INSTALLING') && WP_INSTALLING)
        return;
    $title = 'Booking Calendar';
    $slug = 'booking';
    $existing = get_page_by_path($slug);
    if ($existing)
        return;
    wp_insert_post([
        'post_title' => $title,
        'post_name' => $slug,
        'post_status' => 'publish',
        'post_type' => 'page',
        'post_content' => "",
        'meta_input' => [
            '_wp_page_template' => 'page-booking-calendar.php',
        ],
    ]);
});

// Ensure Booking Confirmation page exists with Gutenberg blocks
add_action('after_setup_theme', function () {
    if (defined('WP_INSTALLING') && WP_INSTALLING)
        return;
    
    $title = 'Booking Confirmation';
    $slug = 'booking-confirmation';
    $block_content = '<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">Confirm Your Booking</h1>
<!-- /wp:heading -->

<!-- wp:custom-theme/booking-session-details /-->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">Choose Your Package</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Select a package that works for you. Each package includes multiple sessions with your chosen teacher.</p>
<!-- /wp:paragraph -->

<!-- wp:custom-theme/package-selection /-->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">Complete Your Payment</h2>
<!-- /wp:heading -->

<!-- wp:custom-theme/conditional-stripe-payment /-->';

    $existing = get_page_by_path($slug);
    if ($existing) {
        // Update to use new block-based content and remove custom template
        wp_update_post([
            'ID' => $existing->ID,
            'post_title' => $title,
            'post_content' => $block_content,
        ]);
        // Remove custom template meta to use default
        delete_post_meta($existing->ID, '_wp_page_template');
        return;
    }
    
    wp_insert_post([
        'post_title' => $title,
        'post_name' => $slug,
        'post_status' => 'publish',
        'post_type' => 'page',
        'post_content' => $block_content,
    ]);
});

// Ensure Booking Complete page exists
add_action('after_setup_theme', function () {
    if (defined('WP_INSTALLING') && WP_INSTALLING)
        return;
    $title = 'Booking Complete';
    $slug = 'booking-complete';
    $existing = get_page_by_path($slug);
    if ($existing) {
        // Ensure template is correct even if page already exists
        $current_tpl = get_page_template_slug($existing->ID);
        if ($current_tpl !== 'page-booking-complete.php') {
            update_post_meta($existing->ID, '_wp_page_template', 'page-booking-complete.php');
        }
        if ($existing->post_title !== $title) {
            wp_update_post([
                'ID' => $existing->ID,
                'post_title' => $title,
            ]);
        }
        return;
    }
    wp_insert_post([
        'post_title' => $title,
        'post_name' => $slug,
        'post_status' => 'publish',
        'post_type' => 'page',
        'post_content' => '<!-- wp:paragraph -->
<p>Thank you for your booking! Your payment has been processed successfully.</p>
<!-- /wp:paragraph -->

<!-- wp:custom-theme/booking-status /-->

<!-- wp:paragraph -->
<p>You will receive a confirmation email shortly with the details of your session. If you have any questions, please don\'t hesitate to contact us.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"className":"is-style-fill"} -->
<div class="wp-block-button is-style-fill"><a class="wp-block-button__link" href="/">Return to Home</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->',
        'meta_input' => [
            '_wp_page_template' => 'page-booking-complete.php',
        ],
    ]);
});
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
    // Enqueue authentication refresh script
    wp_enqueue_script(
        'thrive-auth-refresh',
        get_template_directory_uri() . '/js/auth-refresh.js',
        array(),
        wp_get_theme()->get('Version'),
        true // Load in footer
    );

    // Auth component logic is now inlined within its template part (login-auth.html).
    // Add other global/enqueued scripts here as needed.

    // Optional: enqueue the calendar web component bundle (served by Nginx)
    // When not built yet, this will 404 harmlessly in dev.
    $calendar_bundle = home_url('/assets/calendar/thrive-calendar.js');

    // Load thrive-calendar as an ES module
    wp_enqueue_script(
        'thrive-calendar-wc',
        $calendar_bundle,
        array(),
        null,
        true
    );

    // Add type="module" attribute to make it load as an ES module
    add_filter('script_loader_tag', function ($tag, $handle, $src) {
        if ($handle === 'thrive-calendar-wc') {
            $tag = '<script type="module" src="' . esc_url($src) . '"></script>';
        }
        return $tag;
    }, 10, 3);
}
add_action('wp_enqueue_scripts', 'custom_theme_scripts');

// Conditionally enqueue Stripe + booking JavaScript on Book Lesson page.
add_action('wp_enqueue_scripts', function () {
    if (!is_page())
        return;
    $page_id = get_queried_object_id();
    $template = get_page_template_slug($page_id) ?: '';
    $slug = get_post_field('post_name', $page_id);
    error_log('Booking enqueue check – template: ' . ($template ?: '(none)') . ', slug: ' . $slug);
    if ($template !== 'page-booking-confirmation.php' && $slug !== 'booking-confirmation')
        return;

    error_log('Enqueueing booking.js on booking confirmation page');

    // Stripe.js v3
    wp_enqueue_script(
        'stripe-js',
        'https://js.stripe.com/v3/',
        array(),
        null,
        true
    );

    // Our booking initializer
    $booking_js_path = get_template_directory() . '/js/booking.js';
    if (file_exists($booking_js_path)) {
        wp_enqueue_script(
            'thrive-booking',
            get_template_directory_uri() . '/js/booking.js',
            array('stripe-js'),
            filemtime($booking_js_path),
            true
        );
    }
});

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
require_once get_template_directory() . '/includes/class-thrive-role.php';
require_once get_template_directory() . '/includes/base-rest-endpoint.php';
// Theme block patterns
if (file_exists(get_template_directory() . '/inc/patterns.php')) {
    require_once get_template_directory() . '/inc/patterns.php';
}
// Register custom dynamic blocks (metadata based)

// Enqueue built block JS for the editor globally
add_action('enqueue_block_editor_assets', function () {
    $build = get_template_directory() . '/build/index.ts.js';
    error_log('Enqueueing: ' . $build . ' (exists: ' . (file_exists($build) ? 'yes' : 'no') . ')');

    if (file_exists($build)) {
        wp_enqueue_script(
            'custom-theme-blocks',
            get_template_directory_uri() . '/build/index.ts.js',
            array('wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n'),
            filemtime($build)
        );
    }
});

// Enqueue view scripts bundled by wp-scripts for frontend runtime
add_action('wp_enqueue_scripts', function () {
    $view = get_template_directory() . '/build/view.index.ts.js';
    if (file_exists($view)) {
        wp_enqueue_script(
            'custom-theme-blocks-view',
            get_template_directory_uri() . '/build/view.index.ts.js',
            array('wp-element', 'wp-components'),
            filemtime($view),
            true
        );
        // Ensure Gutenberg component styles (Modal, Buttons, etc.) are present on the frontend
        if (wp_style_is('wp-components', 'registered')) {
            wp_enqueue_style('wp-components');
        }
    }
});

// Register all block.json files in /blocks subfolders
add_action('init', function () {
    $blocks_dir = get_template_directory() . '/blocks';
    foreach (glob($blocks_dir . '/*/block.json') as $block_json) {
        register_block_type(dirname($block_json));
    }
});


// Dev convenience: auto-enable pretty permalinks when WP_DEBUG is true
add_action('init', function () {
    if (defined('WP_DEBUG') && WP_DEBUG) {
        $structure = get_option('permalink_structure');
        if (empty($structure)) {
            global $wp_rewrite;
            $wp_rewrite->set_permalink_structure('/%postname%/');
            flush_rewrite_rules();
        }
    }
}, 99);

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

/**
 * Check if the current user has a specific role.
 * @param string|ThriveRole $role The role to check for (string or ThriveRole enum)
 * @return bool
 */
function thrive_user_has_role(string|ThriveRole $role): bool
{
    $ctx = thrive_get_auth_context();
    if (!$ctx) {
        return false;
    }

    $roleValue = is_string($role) ? $role : $role->value;
    return in_array($roleValue, array_map(fn(ThriveRole $r) => $r->value, $ctx->roles), true);
}

/**
 * Check if the current user is an admin.
 * @return bool
 */
function thrive_is_admin(): bool
{
    return thrive_user_has_role(ThriveRole::ADMIN);
}

/**
 * Check if the current user is a teacher.
 * @return bool
 */
function thrive_is_teacher(): bool
{
    return thrive_user_has_role(ThriveRole::TEACHER);
}

/**
 * Get all roles for the current user as ThriveRole enums.
 * @return ThriveRole[]
 */
function thrive_get_user_roles(): array
{
    $ctx = thrive_get_auth_context();
    return $ctx ? $ctx->roles : [];
}

/**
 * Get all roles for the current user as strings (for backward compatibility).
 * @return string[]
 */
function thrive_get_user_role_strings(): array
{
    $ctx = thrive_get_auth_context();
    return $ctx ? array_map(fn(ThriveRole $role) => $role->value, $ctx->roles) : [];
}

// Server-side replacement for template-part 'login-auth' to use PHP logic.
// Legacy template-part override removed in favor of dynamic block.

// Register thrive-calendar web component script
add_action('wp_enqueue_scripts', function () {
    wp_register_script(
        'thrive-calendar-wc',
        home_url('/assets/calendar/thrive-calendar.js'),
        [],
        null,
        ['in_footer' => true]
    );
});

