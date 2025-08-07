<?php
/**
 * Plugin Name: NodeJS Bridge
 * Description: A bridge to communicate with the NodeJS API.
 * Version: 1.0
 * Author: Gemini
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once plugin_dir_path(__FILE__) . 'includes/class-nodejs-bridge.php';

function run_nodejs_bridge()
{
    $plugin = new NodeJS_Bridge();
}

run_nodejs_bridge();
