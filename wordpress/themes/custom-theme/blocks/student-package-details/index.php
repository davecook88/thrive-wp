<?php
/**
 * Block bootstrap for Student Package Details
 */

if (!defined('ABSPATH')) {
    exit;
}

function custom_theme_register_student_package_details_block()
{
    $dir = __DIR__;
    register_block_type($dir);
}

add_action('init', 'custom_theme_register_student_package_details_block');
