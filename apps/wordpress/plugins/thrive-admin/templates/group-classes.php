<?php
/**
 * Group Classes Management Template
 *
 * @package ThriveAdmin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

?>

<div class="wrap">
    <h1><?php _e('Group Classes', 'thrive-admin-bridge'); ?></h1>
    <p><?php _e('Manage scheduled group classes with multiple students', 'thrive-admin-bridge'); ?></p>

    <!-- Vue Island for Group Classes Management -->
    <div data-vue-component="group-classes"></div>
</div>
