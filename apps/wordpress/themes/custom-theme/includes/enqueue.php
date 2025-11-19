<?php
/**
 * Enqueue styles and scripts for the theme.
 */

function custom_theme_styles()
{
    wp_enqueue_style(
        'custom-theme-style',
        get_stylesheet_uri(),
        array(),
        wp_get_theme()->get('Version')
    );

    // Google Fonts
    wp_enqueue_style(
        'custom-theme-fonts',
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        array(),
        null
    );

    // Course List block styles (compiled from blocks/course-list/style.scss)
    wp_enqueue_style(
        'custom-theme-course-list',
        get_template_directory_uri() . '/build/style-index.ts.css',
        array(),
        wp_get_theme()->get('Version')
    );
}
add_action('wp_enqueue_scripts', 'custom_theme_styles');

function custom_theme_scripts()
{
    wp_enqueue_script(
        'thrive-active-nav',
        get_template_directory_uri() . '/js/active-nav.js',
        array(),
        wp_get_theme()->get('Version'),
        true
    );

    wp_enqueue_script(
        'thrive-auth-refresh',
        get_template_directory_uri() . '/js/auth-refresh.js',
        array(),
        wp_get_theme()->get('Version'),
        true
    );

    // Optional calendar bundle (ES module)
    $calendar_bundle = home_url('/assets/calendar/thrive-calendar.js');
    wp_enqueue_script(
        'thrive-calendar-wc',
        $calendar_bundle,
        array(),
        null,
        true
    );

    // Add type="module" for the calendar web component
    add_filter('script_loader_tag', function ($tag, $handle, $src) {
        if ($handle === 'thrive-calendar-wc') {
            $tag = '<script type="module" src="' . esc_url($src) . '"></script>';
        }
        return $tag;
    }, 10, 3);
}
add_action('wp_enqueue_scripts', 'custom_theme_scripts');

// Conditional enqueue for booking confirmation page
add_action('wp_enqueue_scripts', function () {
    if (!is_page())
        return;
    $page_id = get_queried_object_id();
    $template = get_page_template_slug($page_id) ?: '';
    $slug = get_post_field('post_name', $page_id);
    if ($template !== 'page-booking-confirmation.php' && $slug !== 'booking-confirmation')
        return;

    // Stripe.js v3
    wp_enqueue_script(
        'stripe-js',
        'https://js.stripe.com/v3/',
        array(),
        null,
        true
    );

    // Booking initializer if present
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

// Register calendar wc script handle for other code to reference
add_action('wp_enqueue_scripts', function () {
    wp_register_script(
        'thrive-calendar-wc',
        home_url('/assets/calendar/thrive-calendar.js'),
        [],
        null,
        ['in_footer' => true]
    );
});

?>