<?php
/**
 * Testimonial Form Block Template
 *
 * @param array    $attributes Block attributes
 * @param string   $content    Block default content
 * @param WP_Block $block      Block instance
 */

$show_my_testimonials = $attributes['showMyTestimonials'] ?? true;
$allow_general = $attributes['allowGeneralTestimonials'] ?? true;
$thank_you_message = $attributes['thankYouMessage'] ?? 'Thank you for your testimonial! It will be reviewed by our team.';
?>

<div
  class="testimonial-form-block"
  data-show-my-testimonials="<?php echo esc_attr($show_my_testimonials ? 'true' : 'false'); ?>"
  data-allow-general="<?php echo esc_attr($allow_general ? 'true' : 'false'); ?>"
  data-thank-you-message="<?php echo esc_attr($thank_you_message); ?>"
>
  <!-- React component will mount here -->
  <div style="text-align: center; padding: 40px;">
    <p>Loading testimonial form...</p>
  </div>
</div>
