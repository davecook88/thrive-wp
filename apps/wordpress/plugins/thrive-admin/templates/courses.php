<?php
/**
 * Course Programs Management Template
 *
 * @package ThriveAdmin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

?>

<div class="wrap">
    <h1><?php _e('Course Programs', 'thrive-admin-bridge'); ?></h1>
    <p><?php _e('Create and manage course programs with structured learning paths', 'thrive-admin-bridge'); ?></p>

    <!-- Vue Island for Course Management -->
    <div data-vue-component="courses-admin"></div>
</div>