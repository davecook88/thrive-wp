<?php
/**
 * Plugin Name: Thrive Admin
 * Description: A bridge to communicate with the NodeJS API.
 * Version: 1.0
 * Author: Gemini
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once plugin_dir_path(__FILE__) . 'includes/class-thrive-admin-bridge.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-thrive-admin-bridge-admin.php';

function thrive_admin_run_bridge()
{
    $plugin = new Thrive_Admin_Bridge();
    new Thrive_Admin_Bridge_Admin($plugin);
}

thrive_admin_run_bridge();
