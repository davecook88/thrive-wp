<?php
/**
 * Products (Packages) Management Template
 *
 * @package ThriveAdmin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

?>

<div class="wrap">
    <h1><?php _e('Products', 'thrive-admin-bridge'); ?></h1>
    <p><?php _e('Manage credit packages and course offerings', 'thrive-admin-bridge'); ?></p>

    <!-- Vue Island for Products Management -->
    <div data-vue-component="packages-admin"></div>
</div>