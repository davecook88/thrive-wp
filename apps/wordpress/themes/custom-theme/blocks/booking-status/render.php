<?php
/**
 * Server render for Booking Status block.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block default content.
 * @param WP_Block $block      Block instance.
 */

// Get block attributes with defaults
$success_title = $attributes['successTitle'] ?? 'Booking Confirmed!';
$success_message = $attributes['successMessage'] ?? 'Your booking has been successfully confirmed and payment processed.';
$failure_title = $attributes['failureTitle'] ?? 'Booking Failed';
$failure_message = $attributes['failureMessage'] ?? 'There was an issue processing your booking. Please try again or contact support.';
$pending_title = $attributes['pendingTitle'] ?? 'Processing Payment';
$pending_message = $attributes['pendingMessage'] ?? 'Please wait while we process your payment...';

// Get URL parameters from Stripe redirect
$payment_intent = isset($_GET['payment_intent']) ? sanitize_text_field(wp_unslash($_GET['payment_intent'])) : '';
$payment_intent_client_secret = isset($_GET['payment_intent_client_secret']) ? sanitize_text_field(wp_unslash($_GET['payment_intent_client_secret'])) : '';
$redirect_status = isset($_GET['redirect_status']) ? sanitize_text_field(wp_unslash($_GET['redirect_status'])) : '';

// Generate block wrapper attributes
$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'booking-status-block'
]);
?>

<div <?php echo $wrapper_attributes; ?>>
    <?php if (empty($payment_intent) || empty($redirect_status)): ?>
        <!-- No payment parameters - show pending state -->
        <div class="booking-status booking-status-pending">
            <div class="booking-status-icon">⏳</div>
            <h3 class="booking-status-title"><?php echo esc_html($pending_title); ?></h3>
            <p class="booking-status-message"><?php echo esc_html($pending_message); ?></p>
        </div>
    <?php elseif ($redirect_status === 'succeeded'): ?>
        <!-- Payment succeeded -->
        <div class="booking-status booking-status-success">
            <div class="booking-status-icon">✅</div>
            <h3 class="booking-status-title"><?php echo esc_html($success_title); ?></h3>
            <p class="booking-status-message"><?php echo esc_html($success_message); ?></p>
            <?php if (!empty($payment_intent)): ?>
                <div class="booking-status-details">
                    <small style="color: #6b7280;">Payment ID: <?php echo esc_html($payment_intent); ?></small>
                </div>
            <?php endif; ?>
        </div>
    <?php else: ?>
        <!-- Payment failed or other status -->
        <div class="booking-status booking-status-failure">
            <div class="booking-status-icon">❌</div>
            <h3 class="booking-status-title"><?php echo esc_html($failure_title); ?></h3>
            <p class="booking-status-message"><?php echo esc_html($failure_message); ?></p>
            <?php if (!empty($redirect_status)): ?>
                <div class="booking-status-details">
                    <small style="color: #6b7280;">Status: <?php echo esc_html(ucfirst($redirect_status)); ?></small>
                </div>
            <?php endif; ?>
        </div>
    <?php endif; ?>
</div>

<style>
    .booking-status {
        text-align: center;
        padding: 2rem;
        border-radius: 12px;
        margin: 1rem 0;
    }

    .booking-status-success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
    }

    .booking-status-failure {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
    }

    .booking-status-pending {
        background: #fffbeb;
        border: 1px solid #fde68a;
        color: #92400e;
    }

    .booking-status-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }

    .booking-status-title {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .booking-status-message {
        margin: 0 0 1rem 0;
        font-size: 1rem;
    }

    .booking-status-details {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid currentColor;
        opacity: 0.7;
    }
</style>