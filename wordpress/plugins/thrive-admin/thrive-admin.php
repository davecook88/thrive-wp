<?php
/**
 * Plugin Name: Thrive Admin
 * Description: A bridge to communicate with the NodeJS API using Vue.js islands architecture.
 * Version: 1.0
 * Author: Gemini
 *
 * This plugin uses Vue.js islands architecture for modern frontend development:
 * - Vue components for interactive UI elements
 * - PHP for server-side rendering and WordPress integration
 * - Tailwind CSS for styling
 * - Hot reloading during development
 *
 * See VUE_ISLANDS_README.md for detailed documentation.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once plugin_dir_path(__FILE__) . 'includes/class-thrive-admin-bridge.php';
require_once plugin_dir_path(__FILE__) . 'includes/admin/bridge-admin.php';

function thrive_admin_run_bridge()
{
    $plugin = new Thrive_Admin_Bridge();
    new Thrive_Admin_Bridge_Admin($plugin);
}

thrive_admin_run_bridge();
