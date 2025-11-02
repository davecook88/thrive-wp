<?php
/**
 * Register Course Custom Post Type
 */

if (!defined('ABSPATH')) {
    exit;
}

function thrive_register_course_post_type()
{
    $labels = [
        'name' => 'Courses',
        'singular_name' => 'Course',
        'menu_name' => 'Courses',
        'add_new' => 'Add New Course',
        'add_new_item' => 'Add New Course',
        'edit_item' => 'Edit Course',
        'new_item' => 'New Course',
        'view_item' => 'View Course',
        'search_items' => 'Search Courses',
        'not_found' => 'No courses found',
        'not_found_in_trash' => 'No courses found in trash',
    ];

    $args = [
        'labels' => $labels,
        'public' => true,
        'publicly_queryable' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_rest' => true, // Enable Gutenberg
        'menu_icon' => 'dashicons-welcome-learn-more',
        'menu_position' => 5,
        'capability_type' => 'post',
        'hierarchical' => false,
        'supports' => ['title', 'editor', 'thumbnail'],
        'has_archive' => false, // We use /courses/{code} not /courses/
        'rewrite' => false, // Custom rewrite rules below
        'query_var' => 'course',
        'can_export' => true,
        'delete_with_user' => false,
    ];

    register_post_type('thrive_course', $args);
}

add_action('init', 'thrive_register_course_post_type');

/**
 * Add custom rewrite rule for /courses/{code}
 */
function thrive_course_rewrite_rules()
{
    add_rewrite_rule(
        '^courses/([^/]+)/?$',
        'index.php?post_type=thrive_course&course_code=$matches[1]',
        'top'
    );
}

add_action('init', 'thrive_course_rewrite_rules');

/**
 * Register course_code query var
 */
function thrive_course_query_vars($vars)
{
    $vars[] = 'course_code';
    return $vars;
}

add_filter('query_vars', 'thrive_course_query_vars');

/**
 * Custom template loading for course pages
 */
function thrive_course_template($template)
{
    if (get_query_var('course_code')) {
        $new_template = locate_template(['single-thrive_course.php']);
        if ($new_template) {
            return $new_template;
        }
    }
    return $template;
}

add_filter('template_include', 'thrive_course_template');
