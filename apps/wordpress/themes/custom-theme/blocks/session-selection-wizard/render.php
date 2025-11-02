<?php
/**
 * Session Selection Wizard Block Template
 *
 * @var array $attributes Block attributes
 * @var string $content Block default content
 * @var WP_Block $block Block instance
 */

// Get stripe session ID from URL
$stripe_session_id = isset($_GET['session_id']) ? sanitize_text_field($_GET['session_id']) : '';
?>

<div
    <?php echo get_block_wrapper_attributes(['class' => 'session-selection-wizard-block']); ?>
    data-stripe-session-id="<?php echo esc_attr($stripe_session_id); ?>"
>
    <?php if (empty($stripe_session_id)): ?>
        <div class="session-wizard-error">
            <p>Session ID not found. Please contact support if you completed payment.</p>
            <a href="/dashboard" class="button">Go to Dashboard</a>
        </div>
    <?php endif; ?>
</div>
