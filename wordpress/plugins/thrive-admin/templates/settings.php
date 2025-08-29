<?php
/**
 * Settings Template
 *
 * @package ThriveAdmin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap">
    <h1><?php _e('Thrive Admin Settings', 'thrive-admin-bridge'); ?></h1>

    <!-- Vue Island for Settings -->
    <div data-vue-component="settings"></div>
</div>