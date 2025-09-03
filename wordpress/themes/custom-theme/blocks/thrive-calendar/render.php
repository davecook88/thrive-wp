<?php
/**
 * Server render for Thrive Calendar block.
 */

// Ensure auth helpers exist
if (!function_exists('thrive_is_logged_in')) {
    return '';
}

$attrs = $attributes ?? [];
$detectedMode = 'public';
if (function_exists('thrive_is_admin') && thrive_is_admin()) {
    $detectedMode = 'admin';
} elseif (function_exists('thrive_is_teacher') && thrive_is_teacher()) {
    $detectedMode = 'teacher';
} elseif (function_exists('thrive_is_logged_in') && thrive_is_logged_in()) {
    $detectedMode = 'student';
}
$mode = ($attrs['mode'] ?? 'auto') === 'auto' ? $detectedMode : ($attrs['mode'] ?? 'public');

$view = $attrs['view'] ?? 'week';
$teacherId = isset($attrs['teacherId']) ? (string) $attrs['teacherId'] : '';
// Prefer context from parent wrapper if available
if ($teacherId === '' && isset($block) && is_object($block) && property_exists($block, 'context')) {
    $ctx = $block->context;
    if (is_array($ctx) && isset($ctx['custom-theme/selectedTeacherId'])) {
        $teacherId = (string) $ctx['custom-theme/selectedTeacherId'];
    }
}
$slotDuration = isset($attrs['slotDuration']) ? (int) $attrs['slotDuration'] : 30;
$snapTo = isset($attrs['snapTo']) ? (int) $attrs['snapTo'] : 15;
$showClasses = !empty($attrs['showClasses']);
$showAvailability = !empty($attrs['showAvailability']);
$showBookings = !empty($attrs['showBookings']);
$viewHeight = isset($attrs['viewHeight']) ? (int) $attrs['viewHeight'] : 600;

// Ensure the WC is enqueued (Nginx serves it)
wp_enqueue_script('thrive-calendar-wc');

?>
<thrive-calendar view="<?php echo esc_attr($view); ?>" mode="<?php echo esc_attr($mode); ?>" <?php if ($teacherId !== ''): ?>teacher-id="<?php echo esc_attr($teacherId); ?>" <?php endif; ?>
    slot-duration="<?php echo esc_attr((string) $slotDuration); ?>" snap-to="<?php echo esc_attr((string) $snapTo); ?>"
    show-classes="<?php echo $showClasses ? 'true' : 'false'; ?>"
    show-availability="<?php echo $showAvailability ? 'true' : 'false'; ?>"
    view-height="<?php echo esc_attr((string) $viewHeight); ?>"
    show-bookings="<?php echo $showBookings ? 'true' : 'false'; ?>">
    <?php
    // $content may contain multiple <template data-modal-id="..."> from child modal blocks
    // We pass them through so the web component can register each by id at runtime.
    echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    ?>
</thrive-calendar>