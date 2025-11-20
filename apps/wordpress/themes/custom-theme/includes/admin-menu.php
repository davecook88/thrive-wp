<?php
/**
 * Admin menu and scripts for Course Materials.
 */

function thrive_register_course_materials_page()
{
    add_menu_page(
        'Course Materials',
        'Course Materials',
        'manage_options',
        'thrive-course-materials',
        'thrive_render_course_materials_page',
        'dashicons-book',
        30
    );
}
add_action('admin_menu', 'thrive_register_course_materials_page');

function thrive_render_course_materials_page()
{
    echo '<div id="course-materials-builder-root"></div>';
}

function thrive_enqueue_admin_scripts($hook)
{
    error_log('thrive_enqueue_admin_scripts called with hook: ' . $hook);
    if ($hook !== 'toplevel_page_thrive-course-materials') {
        return;
    }
    error_log('Enqueuing course materials script');

    $asset_file = include(get_template_directory() . '/build/admin-course-materials.tsx.asset.php');

    wp_enqueue_script(
        'thrive-admin-course-materials',
        get_template_directory_uri() . '/build/admin-course-materials.tsx.js',
        $asset_file['dependencies'],
        $asset_file['version'],
        true
    );

    // wp_enqueue_style(
    //     'thrive-admin-course-materials-style',
    //     get_template_directory_uri() . '/build/admin-course-materials.css',
    //     array(),
    //     $asset_file['version']
    // );
}
add_action('admin_enqueue_scripts', 'thrive_enqueue_admin_scripts');
