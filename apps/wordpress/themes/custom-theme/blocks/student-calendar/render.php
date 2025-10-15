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
    $cur = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '/';
    echo '<div class="student-calendar-login-required">' .
        '<p>Please <a href="' . esc_url('/api/auth/google/start?redirect=' . rawurlencode($cur)) . '">sign in</a> to view your sessions.</p>' .
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
<?php
// Render the Selected Event Modal so clicking events opens the modal
$modal_block = '<!-- wp:custom-theme/selected-event-modal /-->';
echo do_blocks($modal_block);
?>