<?php
/**
 * Server render for Course List block.
 */

$attrs = $attributes ?? [];

$columns = isset($attrs['columns']) ? (int) $attrs['columns'] : 3;
$showLevelBadges = isset($attrs['showLevelBadges']) ? (bool) $attrs['showLevelBadges'] : true;
$showPrice = isset($attrs['showPrice']) ? (bool) $attrs['showPrice'] : true;
$showEnrollmentCount = isset($attrs['showEnrollmentCount']) ? (bool) $attrs['showEnrollmentCount'] : false;
$showCohortInfo = isset($attrs['showCohortInfo']) ? (bool) $attrs['showCohortInfo'] : true;
$showDescription = isset($attrs['showDescription']) ? (bool) $attrs['showDescription'] : true;
$cardLayout = $attrs['cardLayout'] ?? 'image-top';
$sortBy = $attrs['sortBy'] ?? 'startDate';
$sortOrder = $attrs['sortOrder'] ?? 'asc';
$showFilters = isset($attrs['showFilters']) ? (bool) $attrs['showFilters'] : true;
$defaultLevelId = isset($attrs['defaultLevelId']) ? (int) $attrs['defaultLevelId'] : null;
$pageSize = isset($attrs['pageSize']) ? (int) $attrs['pageSize'] : 12;
$showPagination = isset($attrs['showPagination']) ? (bool) $attrs['showPagination'] : true;
$imagePlaceholder = $attrs['imagePlaceholder'] ?? '';

?>
<div class="course-list-block" data-columns="<?php echo esc_attr((string) $columns); ?>"
    data-show-level-badges="<?php echo esc_attr($showLevelBadges ? '1' : '0'); ?>"
    data-show-price="<?php echo esc_attr($showPrice ? '1' : '0'); ?>"
    data-show-enrollment-count="<?php echo esc_attr($showEnrollmentCount ? '1' : '0'); ?>"
    data-show-cohort-info="<?php echo esc_attr($showCohortInfo ? '1' : '0'); ?>"
    data-show-description="<?php echo esc_attr($showDescription ? '1' : '0'); ?>"
    data-card-layout="<?php echo esc_attr($cardLayout); ?>" data-sort-by="<?php echo esc_attr($sortBy); ?>"
    data-sort-order="<?php echo esc_attr($sortOrder); ?>"
    data-show-filters="<?php echo esc_attr($showFilters ? '1' : '0'); ?>"
    data-default-level-id="<?php echo esc_attr($defaultLevelId !== null ? (string) $defaultLevelId : ''); ?>"
    data-page-size="<?php echo esc_attr((string) $pageSize); ?>"
    data-show-pagination="<?php echo esc_attr($showPagination ? '1' : '0'); ?>"
    data-image-placeholder="<?php echo esc_attr($imagePlaceholder); ?>">
</div>