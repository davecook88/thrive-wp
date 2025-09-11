<?php
/**
 * Server render for Student Calendar block.
 */

// Ensure auth helpers exist
if (!function_exists('thrive_is_logged_in')) {
    return '';
}

// Only show for logged-in users
if (!thrive_is_logged_in()) {
    return '<div class="student-calendar-login-required">' .
        '<p>Please <a href="/api/auth/google">sign in</a> to view your sessions.</p>' .
        '</div>';
}

$attrs = $attributes ?? [];
$mode = 'student'; // Always student mode for this block

$view = $attrs['view'] ?? 'week';
$slotDuration = isset($attrs['slotDuration']) ? (int) $attrs['slotDuration'] : 30;
$snapTo = isset($attrs['snapTo']) ? (int) $attrs['snapTo'] : 15;
$viewHeight = isset($attrs['viewHeight']) ? (int) $attrs['viewHeight'] : 600;

// Ensure the WC is enqueued (Nginx serves it)
wp_enqueue_script('thrive-calendar-wc');

?>
<div class="student-calendar-wrapper">
    <thrive-calendar view="<?php echo esc_attr($view); ?>" mode="<?php echo esc_attr($mode); ?>"
        slot-duration="<?php echo esc_attr((string) $slotDuration); ?>"
        snap-to="<?php echo esc_attr((string) $snapTo); ?>" show-classes="true" show-availability="false"
        show-bookings="true" view-height="<?php echo esc_attr((string) $viewHeight); ?>">
    </thrive-calendar>
</div>