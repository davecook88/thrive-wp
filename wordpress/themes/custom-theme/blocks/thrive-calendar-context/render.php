<?php
/**
 * Server render for Thrive Calendar Context block.
 * Currently acts as a structural wrapper that provides context to children.
 */

$attrs = $attributes ?? [];

// Generate wrapper attributes
$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'wp-block-custom-theme-thrive-calendar-context',
]);

?>
<div <?php echo $wrapper_attributes; ?>>
    <?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
    <?php
    // Future: inject a data- attribute with initial serialized context if needed
    ?>
</div>