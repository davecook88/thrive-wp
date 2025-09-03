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
$slotDuration = isset($attrs['slotDuration']) ? (int) $attrs['slotDuration'] : 30;
$snapTo = isset($attrs['snapTo']) ? (int) $attrs['snapTo'] : 15;
$showClasses = !empty($attrs['showClasses']);
$showAvailability = !empty($attrs['showAvailability']);
$showBookings = !empty($attrs['showBookings']);
$defaultModalId = isset($attrs['defaultModalId']) ? (string) $attrs['defaultModalId'] : '';
$oneToOneModalId = isset($attrs['oneToOneModalId']) ? (string) $attrs['oneToOneModalId'] : '';
$groupModalId = isset($attrs['groupModalId']) ? (string) $attrs['groupModalId'] : '';
$courseModalId = isset($attrs['courseModalId']) ? (string) $attrs['courseModalId'] : '';
$viewHeight = isset($attrs['viewHeight']) ? (int) $attrs['viewHeight'] : 600;

// Ensure the WC is enqueued (Nginx serves it)
wp_enqueue_script('thrive-calendar-wc');

ob_start();
?>
<thrive-calendar view="<?php echo esc_attr($view); ?>" mode="<?php echo esc_attr($mode); ?>" <?php if ($teacherId !== ''): ?>teacher-id="<?php echo esc_attr($teacherId); ?>" <?php endif; ?>
    slot-duration="<?php echo esc_attr((string) $slotDuration); ?>" snap-to="<?php echo esc_attr((string) $snapTo); ?>"
    show-classes="<?php echo $showClasses ? 'true' : 'false'; ?>"
    show-availability="<?php echo $showAvailability ? 'true' : 'false'; ?>"
    view-height="<?php echo esc_attr((string) $viewHeight); ?>"
    show-bookings="<?php echo $showBookings ? 'true' : 'false'; ?>" <?php if ($defaultModalId !== ''): ?>
        data-default-modal-id="<?php echo esc_attr($defaultModalId); ?>" <?php endif; ?> <?php if ($oneToOneModalId !== ''): ?> data-one-to-one-modal-id="<?php echo esc_attr($oneToOneModalId); ?>" <?php endif; ?> <?php if ($groupModalId !== ''): ?> data-group-modal-id="<?php echo esc_attr($groupModalId); ?>" <?php endif; ?> <?php if ($courseModalId !== ''): ?> data-course-modal-id="<?php echo esc_attr($courseModalId); ?>" <?php endif; ?>>
    <?php
    // $content may contain multiple <template data-modal-id="..."> from child modal blocks
    // We pass them through so the web component can register each by id at runtime.
    echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    ?>
</thrive-calendar>
<?php
return ob_get_clean();
