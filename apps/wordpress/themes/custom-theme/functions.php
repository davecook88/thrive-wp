<?php
/**
 * Theme functions and definitions - loader
 *
 * This file now acts as a small orchestrator that includes focused files
 * under the `includes/` directory. The goal is to keep logic modular and
 * easier to maintain.
 */

// Keep backwards compatible page manager require
require_once get_template_directory() . '/includes/page-manager.php';

// Load the small modular includes
$includes_dir = get_template_directory() . '/includes/';
$files = array(
    'init.php',
    'enqueue.php',
    'setup.php',
    'block-patterns.php',
    'blocks.php',
    'auth.php',
    'admin-menu.php',
);

foreach ($files as $file) {
    $path = $includes_dir . $file;
    if (file_exists($path)) {
        require_once $path;
    }
}
