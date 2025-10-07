<?php
/**
 * Server render for Booking Session Details block.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block default content.
 * @param WP_Block $block      Block instance.
 */

// Get block attributes
$heading = $attributes['heading'] ?? 'Session Details';
$show_teacher_name = $attributes['showTeacherName'] ?? true;
$show_date_time = $attributes['showDateTime'] ?? true;
$date_time_format = $attributes['dateTimeFormat'] ?? 'F j, Y g:i A T';
$error_message = $attributes['errorMessage'] ?? 'Please ensure you have valid booking details in your URL.';

// Check login status
$is_logged_in = function_exists('thrive_is_logged_in') && thrive_is_logged_in();

// Generate block wrapper attributes
$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'booking-session-details-block'
]);
$global_wp = isset($wp) ? $wp : null;
if ($global_wp === null) {
    // Ensure $wp is available in this scope
    global $wp;
}

// Build the full current URL (scheme://host + request URI) to preserve path and query
// Use $_SERVER['REQUEST_URI'] which includes both path and query string (e.g. /booking-confirmation/?start=...)
$scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443) ? 'https' : 'http';
$host = isset($_SERVER['HTTP_HOST']) ? wp_unslash($_SERVER['HTTP_HOST']) : parse_url(home_url(), PHP_URL_HOST);
$request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : (isset($wp->request) ? '/' . ltrim($wp->request, '/') : '/');

$request_uri_decoded = rawurldecode($request_uri);
$current_url = $scheme . '://' . $host . $request_uri_decoded;
// Do not run esc_url_raw before rawurlencode (that can convert % into %25).
// Instead, encode exactly once using rawurlencode so query components like timestamps become %3A once.
$google_url = '/api/auth/google/start?redirect=' . rawurlencode($current_url);
?>

<div <?php echo $wrapper_attributes; ?>>
    <?php if (!$is_logged_in): ?>
        <div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;padding:16px 18px;">
            <p style="margin:0 0 10px 0;">Please sign in to view session details.</p>
            <?php
            global $wp;

            ?>
            <a class="button button-primary" href="<?php echo $google_url; ?>">
                Sign in with Google
            </a>
        </div>
    <?php else: ?>
        <div id="booking-session-details-root" data-heading="<?php echo esc_attr($heading); ?>"
            data-show-teacher-name="<?php echo esc_attr($show_teacher_name ? 'true' : 'false'); ?>"
            data-show-date-time="<?php echo esc_attr($show_date_time ? 'true' : 'false'); ?>"
            data-date-time-format="<?php echo esc_attr($date_time_format); ?>"
            data-error-message="<?php echo esc_attr($error_message); ?>"></div>
    <?php endif; ?>

</div>