<?php
/**
 * Server render for Selected Event Modal.
 * Outputs a container with data mapping of event types to modal CPT IDs.
 */

$attrs = $attributes ?? [];
$availabilityId = isset($attrs['availabilityModalId']) ? (int) $attrs['availabilityModalId'] : 0;
$classId = isset($attrs['classModalId']) ? (int) $attrs['classModalId'] : 0;
$courseId = isset($attrs['courseModalId']) ? (int) $attrs['courseModalId'] : 0;
$defaultId = isset($attrs['defaultModalId']) ? (int) $attrs['defaultModalId'] : 0;

$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'wp-block-custom-theme-selected-event-modal',
]);

?>
<div <?php echo $wrapper_attributes; ?> data-availability-modal-id="<?php echo esc_attr((string) $availabilityId); ?>"
    data-class-modal-id="<?php echo esc_attr((string) $classId); ?>"
    data-course-modal-id="<?php echo esc_attr((string) $courseId); ?>"
    data-default-modal-id="<?php echo esc_attr((string) $defaultId); ?>" style="display:none"></div>