<?php
/**
 * Server render for Student Calendar block.
 */

// Ensure auth helpers exist
if (!function_exists('thrive_is_logged_in')) {
    echo '';
    return;
}

// Only show for logged-in users
if (!thrive_is_logged_in()) {
    echo '<div class="student-calendar-login-required">' .
        '<p>Please <a href="/api/auth/google">sign in</a> to view your sessions.</p>' .
        '</div>';
    return;
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
<div class="student-calendar-block" data-view="<?php echo esc_attr($view); ?>"
    data-slot-duration="<?php echo esc_attr((string) $slotDuration); ?>"
    data-snap-to="<?php echo esc_attr((string) $snapTo); ?>"
    data-view-height="<?php echo esc_attr((string) $viewHeight); ?>">
</div>