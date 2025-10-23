<?php
/**
 * Package Selection Block - Server render
 * 
 * @param array $attributes Block attributes.
 * @param string $content Block content.
 * @param WP_Block $block Block instance.
 */

if (!defined('ABSPATH')) {
    exit;
}

// Get block attributes
$block_attributes = isset($attributes) ? $attributes : [];
$show_credits = isset($block_attributes['showCredits']) ? $block_attributes['showCredits'] : true;
$show_expiry = isset($block_attributes['showExpiry']) ? $block_attributes['showExpiry'] : true;
$loading_message = isset($block_attributes['loadingMessage']) ? $block_attributes['loadingMessage'] : 'Loading available packages...';
$error_message = isset($block_attributes['errorMessage']) ? $block_attributes['errorMessage'] : 'Unable to load packages at this time. Please refresh and try again.';
$no_packages_message = isset($block_attributes['noPackagesMessage']) ? $block_attributes['noPackagesMessage'] : 'No packages are currently available.';


// Check if user is logged in
$is_logged_in = function_exists('thrive_is_logged_in') && thrive_is_logged_in();

// Get context values
$initial_package_id = '';
$initial_price_id = '';

// Consume block context if provided by an ancestor provider
if (isset($block) && is_object($block)) {
    $vars = get_object_vars($block);
    /** @var array $ctx */
    $ctx = isset($vars['context']) && is_array($vars['context']) ? $vars['context'] : [];
    $initial_package_id = isset($ctx['custom-theme/selectedPackageId']) ? (string) $ctx['custom-theme/selectedPackageId'] : '';
    $initial_price_id = isset($ctx['custom-theme/selectedPriceId']) ? (string) $ctx['custom-theme/selectedPriceId'] : '';
}

// Check URL for sessionId parameter
$session_id_param = isset($_GET['sessionId']) ? sanitize_text_field($_GET['sessionId']) : '';
$service_type = isset($_GET['serviceType']) ? sanitize_text_field($_GET['serviceType']) : '';

?>
<div <?php echo get_block_wrapper_attributes(['class' => 'package-selection-block']); ?>>
    <?php if ($is_logged_in): ?>
        <div id="package-selection-root" data-show-credits="<?php echo esc_attr($show_credits ? '1' : '0'); ?>"
            data-show-expiry="<?php echo esc_attr($show_expiry ? '1' : '0'); ?>"
            data-loading-message="<?php echo esc_attr($loading_message); ?>"
            data-error-message="<?php echo esc_attr($error_message); ?>"
            data-no-packages-message="<?php echo esc_attr($no_packages_message); ?>"
            data-initial-package-id="<?php echo esc_attr($initial_package_id); ?>"
            data-initial-price-id="<?php echo esc_attr($initial_price_id); ?>"
            data-session-id="<?php echo esc_attr($session_id_param); ?>"
            data-service-type="<?php echo esc_attr($service_type); ?>"></div>
    <?php else: ?>
        <div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;padding:16px 18px;">
            <p style="margin:0;">Please sign in to view available packages.</p>
        </div>
    <?php endif; ?>
</div>