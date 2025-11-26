<?php
/**
 * Orders & Sales Management Template
 *
 * @package ThriveAdmin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap">
    <h1><?php _e('Orders & Sales', 'thrive-admin-bridge'); ?></h1>

    <!-- Vue Island for Orders Management -->
    <div data-vue-component="orders-admin"></div>
</div>