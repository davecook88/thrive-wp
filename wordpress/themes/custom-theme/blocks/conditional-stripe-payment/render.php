<?php
/**
 * Server render for Conditional Stripe Payment block.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block default content.
 * @param WP_Block $block      Block instance.
 */

// Get block attributes
$heading = $attributes['heading'] ?? 'Complete Your Payment';
$select_package_message = $attributes['selectPackageMessage'] ?? 'Please select a package above to continue with payment.';
$confirm_button_text = $attributes['confirmButtonText'] ?? 'Confirm and Pay';
$cancel_button_text = $attributes['cancelButtonText'] ?? 'Cancel';
$loading_text = $attributes['loadingText'] ?? 'Preparing secure payment...';
$show_back_link = $attributes['showBackLink'] ?? true;
$back_link_url = $attributes['backLinkUrl'] ?? '/booking';
$back_link_text = $attributes['backLinkText'] ?? 'Back to Calendar';

// Check if user is logged in
$is_logged_in = function_exists('thrive_is_logged_in') && thrive_is_logged_in();

// Get booking params for the payment session from context (preferred) or GET fallback
$start = '';
$end = '';
$teacher = '';
$initialPackageId = '';
$initialPriceId = '';
$initialPackageName = '';
if (isset($block) && is_object($block)) {
    $vars = get_object_vars($block);
    /** @var array $ctx */
    $ctx = isset($vars['context']) && is_array($vars['context']) ? $vars['context'] : [];
    $start = isset($ctx['custom-theme/bookingStart']) ? (string) $ctx['custom-theme/bookingStart'] : '';
    $end = isset($ctx['custom-theme/bookingEnd']) ? (string) $ctx['custom-theme/bookingEnd'] : '';
    $teacher = isset($ctx['custom-theme/teacherId']) ? (string) $ctx['custom-theme/teacherId'] : '';
    $initialPackageId = isset($ctx['custom-theme/selectedPackageId']) ? (string) $ctx['custom-theme/selectedPackageId'] : '';
    $initialPriceId = isset($ctx['custom-theme/selectedPriceId']) ? (string) $ctx['custom-theme/selectedPriceId'] : '';
    $initialPackageName = isset($ctx['custom-theme/selectedPackageName']) ? (string) $ctx['custom-theme/selectedPackageName'] : '';
}
if ($start === '') {
    $start = isset($_GET['start']) ? sanitize_text_field(wp_unslash($_GET['start'])) : '';
}
if ($end === '') {
    $end = isset($_GET['end']) ? sanitize_text_field(wp_unslash($_GET['end'])) : '';
}
if ($teacher === '') {
    $teacher = isset($_GET['teacher']) ? sanitize_text_field(wp_unslash($_GET['teacher'])) : '';
}

// Get wrapper attributes
$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'conditional-stripe-payment-block'
]);

?>
<div <?php echo $wrapper_attributes; ?>>
    <?php if ($is_logged_in): ?>
        <div id="conditional-stripe-payment-root" data-heading="<?php echo esc_attr($heading); ?>"
            data-select-package-message="<?php echo esc_attr($select_package_message); ?>"
            data-confirm-button-text="<?php echo esc_attr($confirm_button_text); ?>"
            data-cancel-button-text="<?php echo esc_attr($cancel_button_text); ?>"
            data-loading-text="<?php echo esc_attr($loading_text); ?>"
            data-show-back-link="<?php echo esc_attr($show_back_link ? 'true' : 'false'); ?>"
            data-back-link-url="<?php echo esc_attr($back_link_url); ?>"
            data-back-link-text="<?php echo esc_attr($back_link_text); ?>"
            data-booking-start="<?php echo esc_attr($start); ?>" data-booking-end="<?php echo esc_attr($end); ?>"
            data-teacher="<?php echo esc_attr($teacher); ?>"
            data-initial-package-id="<?php echo esc_attr($initialPackageId); ?>"
            data-initial-price-id="<?php echo esc_attr($initialPriceId); ?>"
            data-initial-package-name="<?php echo esc_attr($initialPackageName); ?>"></div>
    <?php else: ?>
        <div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;padding:16px 18px;">
            <p style="margin:0;">Please sign in to complete payment.</p>
        </div>
    <?php endif; ?>
</div>