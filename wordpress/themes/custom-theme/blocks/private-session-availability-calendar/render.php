<?php
/**
 * Server render for Private Session Availability Calendar block.
 */

$attrs = $attributes ?? [];
$view = $attrs['view'] ?? 'week';
$slotDuration = isset($attrs['slotDuration']) ? (int) $attrs['slotDuration'] : 30;
$snapTo = isset($attrs['snapTo']) ? (int) $attrs['snapTo'] : 15;
$viewHeight = isset($attrs['viewHeight']) ? (int) $attrs['viewHeight'] : 600;
$heading = isset($attrs['heading']) ? (string) $attrs['heading'] : 'Book a Private Session';
$showFilters = isset($attrs['showFilters']) ? (bool) $attrs['showFilters'] : true;
// Selected-event-modal IDs (optional)
$availabilityId = isset($attrs['availabilityModalId']) ? (int) $attrs['availabilityModalId'] : 0;
$classId = isset($attrs['classModalId']) ? (int) $attrs['classModalId'] : 0;
$courseId = isset($attrs['courseModalId']) ? (int) $attrs['courseModalId'] : 0;
$defaultId = isset($attrs['defaultModalId']) ? (int) $attrs['defaultModalId'] : 0;

// Ensure the web component is enqueued (served by Nginx)
wp_enqueue_script('thrive-calendar-wc');

?>
<div class="private-session-availability-calendar-block" data-view="<?php echo esc_attr($view); ?>"
    data-slot-duration="<?php echo esc_attr((string) $slotDuration); ?>"
    data-snap-to="<?php echo esc_attr((string) $snapTo); ?>"
    data-view-height="<?php echo esc_attr((string) $viewHeight); ?>" data-heading="<?php echo esc_attr($heading); ?>"
    data-show-filters="<?php echo $showFilters ? 'true' : 'false'; ?>">
</div>
<?php
// Render the Selected Event Modal as a nested block so the runtime exists on the page
$modal_attrs = array(
    'availabilityModalId' => $availabilityId,
    'classModalId' => $classId,
    'courseModalId' => $courseId,
    'defaultModalId' => $defaultId,
);
$modal_block = '<!-- wp:custom-theme/selected-event-modal ' . wp_json_encode($modal_attrs) . ' /-->';
echo do_blocks($modal_block);
?>