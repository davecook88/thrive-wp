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
    <div
        style="background: <?php echo esc_attr($accent_color); ?>20; border: 2px solid <?php echo esc_attr($accent_color); ?>; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: <?php echo esc_attr($accent_color); ?>; margin-top: 0;">
            <?php echo esc_html($heading); ?>
        </h3>
        <p style="margin-bottom: 0; color: #666;">
            <?php echo esc_html($help_text); ?>
        </p>
        <small style="color: #999;">
            Preview weeks: <?php echo esc_html($show_preview_weeks); ?>
        </small>
    </div>
</div>