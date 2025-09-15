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
?>

<div <?php echo $wrapper_attributes; ?>>
    <?php if (!$is_logged_in): ?>
        <div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;padding:16px 18px;">
            <p style="margin:0 0 10px 0;">Please sign in to view session details.</p>
            <?php
            global $wp;
            $path = home_url(add_query_arg(array(), $wp->request));
            $query = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '' ? ('?' . sanitize_text_field(wp_unslash($_SERVER['QUERY_STRING']))) : '';
            $redirect_to = $path . $query;
            ?>
            <a class="button button-primary"
                href="<?php echo esc_url('/api/auth/google/start?redirect=' . rawurlencode($redirect_to)); ?>">
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