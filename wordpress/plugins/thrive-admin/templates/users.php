<?php
/**
 * Users Management Template
 *
 * @package ThriveAdmin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get current filter parameters
$page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
$search = isset($_GET['search']) ? sanitize_text_field($_GET['search']) : '';
$role = isset($_GET['role']) ? sanitize_text_field($_GET['role']) : '';


?>

<div class="wrap">
    <h1><?php _e('User Management', 'thrive-admin-bridge'); ?></h1>

    <!-- Vue Island for Users Management -->
    <div data-vue-component="users" data-initial-page="<?php echo esc_attr($page); ?>"
        data-initial-search="<?php echo esc_attr($search); ?>" data-initial-role="<?php echo esc_attr($role); ?>"></div>
</div>