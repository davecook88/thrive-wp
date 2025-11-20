<?php
/**
 * Template Name: Course Package Detail
 * Description: Detailed view of a student's course package progress.
 * URL: /dashboard/courses/{packageId}
 */

// Ensure user is logged in
if (!function_exists('thrive_is_logged_in') || !thrive_is_logged_in()) {
    wp_redirect('/login');
    exit;
}

get_header();

// Get package ID from query vars or URL path
// Assuming rewrite rule: ^dashboard/courses/([0-9]+)/? -> index.php?pagename=dashboard/courses&package_id=$matches[1]
// Or if using a page template assigned to a page, we might need to parse the URL manually if rewrite rules aren't set up yet.
// For now, we'll check query var 'package_id'
$package_id = get_query_var('package_id');

// Fallback: try to get from URL path if query var is empty (e.g. if using default permalinks or custom router)
if (empty($package_id)) {
    $path_segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
    // Expected format: dashboard/courses/123
    // So last segment might be the ID
    $last_segment = end($path_segments);
    if (is_numeric($last_segment)) {
        $package_id = $last_segment;
    }
}

if (empty($package_id)) {
    // Redirect to dashboard if no ID found
    wp_redirect('/student');
    exit;
}
?>

<main id="primary" class="site-main">
    <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
        <div id="course-package-detail-mount" data-package-id="<?php echo esc_attr($package_id); ?>"></div>
    </div>
</main>

<?php
get_footer();
