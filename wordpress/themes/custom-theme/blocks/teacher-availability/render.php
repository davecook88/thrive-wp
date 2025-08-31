<?php
/**
 * Server render for Teacher Availability block.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block default content.
 * @param WP_Block $block      Block instance.
 */

// Get block attributes with defaults
$heading = $attributes['heading'] ?? 'Set Your Availability';
$help_text = $attributes['helpText'] ?? 'Configure your weekly schedule and any exceptions.';
$accent_color = $attributes['accentColor'] ?? '#9aa8ff';
$show_preview_weeks = $attributes['showPreviewWeeks'] ?? 2;

// Generate block wrapper attributes
$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'teacher-availability-block'
]);
?>

<div <?php echo $wrapper_attributes; ?>>
    <?php if (!function_exists('thrive_is_logged_in') || !thrive_is_logged_in()): ?>
        <!-- Not logged in -->
        <div style="text-align: center; padding: 2rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="color: #64748b; margin-bottom: 1rem;">Sign In Required</h3>
            <p style="color: #64748b; margin-bottom: 1.5rem;">Please sign in to manage your availability.</p>
            <a href="/api/auth/google"
                style="background: <?php echo esc_attr($accent_color); ?>; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 6px; display: inline-block;">Sign
                In with Google</a>
        </div>
    <?php elseif (!function_exists('thrive_is_teacher') || !thrive_is_teacher()): ?>
        <!-- Logged in but not a teacher -->
        <div style="text-align: center; padding: 2rem; background: #fef3c7; border-radius: 8px; border: 1px solid #f59e0b;">
            <h3 style="color: #92400e; margin-bottom: 1rem;">Teacher Access Required</h3>
            <p style="color: #92400e; margin-bottom: 0;">This page is only available to teachers. If you believe this is an
                error, please contact an administrator.</p>
        </div>
    <?php else: ?>
        <!-- Teacher is logged in - render React component -->
        <div id="teacher-availability-root" data-heading="<?php echo esc_attr($heading); ?>"
            data-help-text="<?php echo esc_attr($help_text); ?>" data-accent-color="<?php echo esc_attr($accent_color); ?>"
            data-show-preview-weeks="<?php echo esc_attr($show_preview_weeks); ?>"></div>
    <?php endif; ?>
</div>