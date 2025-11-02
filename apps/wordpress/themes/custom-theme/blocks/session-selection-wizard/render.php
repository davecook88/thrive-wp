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
        <div class="session-wizard-error" style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 1.5rem; border-radius: 8px; text-align: center;">
            <p style="margin-bottom: 1rem;">Session ID not found. Please contact support if you completed payment.</p>
            <a href="/student" class="button" style="display: inline-block; background: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none;">Go to Dashboard</a>
        </div>
    <?php else: ?>
        <div style="text-align: center; padding: 2rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
            <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
            <p style="color: #166534; margin-bottom: 1rem;">Loading your enrollment details...</p>
            <small style="color: #166534; opacity: 0.7;">This may take a few moments.</small>
        </div>
    <?php endif; ?>
</div>

<style>
    .session-wizard {
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .session-wizard__title {
        font-size: 1.875rem;
        font-weight: 700;
        margin: 0 0 1rem 0;
        color: #1f2937;
    }

    .session-wizard__description {
        color: #6b7280;
        margin-bottom: 2rem;
    }

    .wizard-step {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 8px;
    }

    .wizard-step__title {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
        color: #1f2937;
    }

    .wizard-step__options {
        display: grid;
        gap: 1rem;
    }

    .option-card {
        display: block;
        padding: 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        background: white;
    }

    .option-card:hover {
        border-color: #3b82f6;
        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
    }

    .option-card--selected {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .option-card input[type="radio"] {
        margin-right: 0.75rem;
    }

    .option-card__content {
        display: inline-block;
        vertical-align: middle;
    }

    .option-card__name {
        font-weight: 600;
        color: #1f2937;
    }

    .option-card__capacity {
        font-size: 0.875rem;
        color: #6b7280;
        margin-top: 0.25rem;
    }

    .option-card__inactive {
        font-size: 0.875rem;
        color: #ef4444;
        margin-top: 0.25rem;
    }

    .session-wizard__actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid #e5e7eb;
    }

    .button {
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-block;
    }

    .button--primary {
        background: #2563eb;
        color: white;
    }

    .button--primary:hover:not(:disabled) {
        background: #1d4ed8;
    }

    .button--primary:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }

    .button--secondary {
        background: #f3f4f6;
        color: #374151;
    }

    .button--secondary:hover {
        background: #e5e7eb;
    }

    .session-wizard__success {
        text-align: center;
        padding: 2rem;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        color: #166534;
    }

    .session-wizard.loading,
    .session-wizard.error {
        text-align: center;
        padding: 2rem;
    }

    .session-wizard.error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
    }
</style>
