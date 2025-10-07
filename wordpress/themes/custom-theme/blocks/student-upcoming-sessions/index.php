<?php
/**
 * Block bootstrap for Student Upcoming Sessions
 */

if (!defined('ABSPATH')) {
    exit;
}

function custom_theme_register_student_upcoming_sessions_block()
{
    $dir = __DIR__;
    register_block_type($dir);
}

add_action('init', 'custom_theme_register_student_upcoming_sessions_block');
