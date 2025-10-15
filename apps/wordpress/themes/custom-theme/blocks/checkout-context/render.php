<?php
/**
 * Server render for Checkout Context block.
 * Provides a structural wrapper and data-* attributes for initial context hydration.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Inner content.
 * @param WP_Block $block      Block instance.
 */

$attrs = $attributes ?? [];

$data = [];
foreach ([
    'bookingStart' => 'data-booking-start',
    'bookingEnd' => 'data-booking-end',
    'teacherId' => 'data-teacher-id',
    'orderId' => 'data-order-id',
    'selectedPackageId' => 'data-selected-package-id',
    'selectedPriceId' => 'data-selected-price-id',
    'selectedPackageName' => 'data-selected-package-name',
] as $key => $dataKey) {
    if (!empty($attrs[$key])) {
        $data[$dataKey] = (string) $attrs[$key];
    }
}

$wrapper_attributes = get_block_wrapper_attributes(array_merge([
    'class' => 'wp-block-custom-theme-checkout-context',
], $data));
?>
<div <?php echo $wrapper_attributes; ?>>
    <?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>