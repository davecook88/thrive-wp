<?php
/**
 * Server render for Thrive Calendar Modal block.
 */

$attrs = $attributes ?? [];
$modalId = isset($attrs['modalId']) ? (string) $attrs['modalId'] : '';
if ($modalId === '') {
    return '';
}

ob_start();
?>
<template data-modal-id="<?php echo esc_attr($modalId); ?>">
    <?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</template>
<?php
return ob_get_clean();
