<?php
/**
 * Server render for Thrive Calendar Context block.
 * Currently acts as a structural wrapper that provides context to children.
 */

$attrs = $attributes ?? [];
$selectedTeacherId = isset($attrs['selectedTeacherId']) ? (string) $attrs['selectedTeacherId'] : '';

// Generate wrapper attributes
$extra = [];
if ($selectedTeacherId !== '') {
    $extra['data-selected-teacher'] = $selectedTeacherId;
}
$wrapper_attributes = get_block_wrapper_attributes(array_merge([
    'class' => 'wp-block-custom-theme-thrive-calendar-context',
], $extra));

?>
<div <?php echo $wrapper_attributes; ?>>
    <?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
    <?php
    // Future: inject a data- attribute with initial serialized context if needed
    ?>
</div>