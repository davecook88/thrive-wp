<?php
/**
 * Testimonials Management Template
 *
 * @package ThriveAdmin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap">
    <h1><?php _e('Testimonials', 'thrive-admin-bridge'); ?></h1>

    <!-- Vue Island for Testimonials Management -->
    <div data-vue-component="testimonials-admin"></div>
</div>
