<?php
/**
 * Dashboard Template
 *
 * @package ThriveAdmin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap">
    <h1><?php _e('Thrive Admin Dashboard', 'thrive-admin-bridge'); ?></h1>

    <!-- Vue Island for Dashboard -->
    <div data-vue-component="dashboard"
        data-title="<?php echo esc_attr__('Welcome to Thrive Admin', 'thrive-admin-bridge'); ?>"
        data-description="<?php echo esc_attr__('Manage your Thrive application users, settings, and more from this central dashboard.', 'thrive-admin-bridge'); ?>">
    </div>
</div>