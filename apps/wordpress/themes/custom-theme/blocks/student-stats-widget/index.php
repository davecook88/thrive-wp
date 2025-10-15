<?php
/**
 * Block bootstrap for Student Stats Widget
 *
 * Registers the block and points to server render implementation in render.php
 */

if (!defined('ABSPATH')) {
    exit;
}

function custom_theme_register_student_stats_widget_block()
{
    $dir = __DIR__;

    // automatically load block.json and register assets
    register_block_type($dir);
}

add_action('init', 'custom_theme_register_student_stats_widget_block');
