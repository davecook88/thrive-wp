<?php
/**
 * Block bootstrap for Student Course Enrollments
 */

if (!defined('ABSPATH')) {
    exit;
}

function custom_theme_register_student_course_enrollments_block()
{
    $dir = __DIR__;
    register_block_type($dir);
}

add_action('init', 'custom_theme_register_student_course_enrollments_block');
