<?php
/**
 * Testimonials Display Block - Server-side render
 * 
 * @var array $attributes Block attributes
 * @var string $content Block content
 * @var WP_Block $block Block instance
 */

$attrs = $attributes ?? [];
$layout = $attrs['layout'] ?? 'grid';
$columns = $attrs['columns'] ?? 3;
$limit = $attrs['limit'] ?? 6;
$teacherId = isset($attrs['teacherId']) && $attrs['teacherId'] > 0 ? $attrs['teacherId'] : 0;
$courseProgramId = isset($attrs['courseProgramId']) && $attrs['courseProgramId'] > 0 ? $attrs['courseProgramId'] : 0;
$minRating = $attrs['minRating'] ?? 1;
$featuredOnly = isset($attrs['featuredOnly']) ? (bool) $attrs['featuredOnly'] : false;
$showRating = isset($attrs['showRating']) ? (bool) $attrs['showRating'] : true;
$showDate = isset($attrs['showDate']) ? (bool) $attrs['showDate'] : true;

// Generate unique ID for this block instance
$block_id = 'testimonials-display-' . uniqid();
?>

<div 
  class="testimonials-display-block" 
  id="<?php echo esc_attr($block_id); ?>"
  data-layout="<?php echo esc_attr($layout); ?>"
  data-columns="<?php echo esc_attr($columns); ?>"
  data-limit="<?php echo esc_attr($limit); ?>"
  data-teacher-id="<?php echo esc_attr($teacherId); ?>"
  data-course-program-id="<?php echo esc_attr($courseProgramId); ?>"
  data-min-rating="<?php echo esc_attr($minRating); ?>"
  data-featured-only="<?php echo esc_attr($featuredOnly ? '1' : '0'); ?>"
  data-show-rating="<?php echo esc_attr($showRating ? '1' : '0'); ?>"
  data-show-date="<?php echo esc_attr($showDate ? '1' : '0'); ?>"
>
  <!-- React component will mount here -->
</div>
