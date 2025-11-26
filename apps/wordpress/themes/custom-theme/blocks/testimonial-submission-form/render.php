<?php
/**
 * Testimonial Submission Form Block
 * 
 * @package CustomTheme
 */

$title = $attributes['title'] ?? 'Share Your Experience';
$description = $attributes['description'] ?? '';
$show_general_option = $attributes['showGeneralOption'] ?? true;

$block_attributes = [
    'title' => $title,
    'description' => $description,
    'showGeneralOption' => $show_general_option,
];

$wrapper_attributes = get_block_wrapper_attributes([
    'data-attributes' => esc_attr(wp_json_encode($block_attributes)),
]);
?>

<div <?php echo $wrapper_attributes; ?>>
    <div class="testimonial-form-loading">
        <div class="spinner"></div>
        <p><?php esc_html_e('Loading form...', 'custom-theme'); ?></p>
    </div>
</div>
