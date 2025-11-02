<?php
/**
 * Page Manager - Handles automatic creation and updating of theme pages
 *
 * This file manages the creation and updating of essential theme pages.
 * Use the THRIVE_UPDATE_PAGES constant to control whether existing pages
 * should be updated with new content from the page-contents/ folder.
 */

// Define whether to update existing pages with new content
// Set to false to prevent overwriting manually edited pages
if (!defined('THRIVE_UPDATE_PAGES')) {
    define('THRIVE_UPDATE_PAGES', true);
}

/**
 * Helper function to load page content from file
 */
function get_page_content_from_file($filename)
{
    $file_path = get_template_directory() . '/page-contents/' . $filename . '.html';
    if (file_exists($file_path)) {
        return file_get_contents($file_path);
    }
    return '';
}

/**
 * Create or update a page with content from file
 */
function ensure_page_exists($title, $slug, $content_filename, $template = null, $force_update = null, $parent_slug = null)
{
    // Skip during WordPress installation
    if (defined('WP_INSTALLING') && WP_INSTALLING) {
        return;
    }

    // Use global flag if not explicitly set
    if ($force_update === null) {
        $force_update = THRIVE_UPDATE_PAGES;
    }

    // Build full path if parent slug provided
    $full_path = $parent_slug ? $parent_slug . '/' . $slug : $slug;
    $existing = get_page_by_path($full_path);

    if ($existing) {
        // Update existing page if flag allows
        if ($force_update) {
            $new_content = get_page_content_from_file($content_filename);
            $current_content = get_post_field('post_content', $existing->ID);

            // Only update if content has changed
            if ($current_content !== $new_content) {
                wp_update_post([
                    'ID' => $existing->ID,
                    'post_title' => $title,
                    'post_content' => $new_content,
                ]);
            }

            // Update template if specified
            if ($template) {
                $current_template = get_page_template_slug($existing->ID);
                if ($current_template !== $template) {
                    update_post_meta($existing->ID, '_wp_page_template', $template);
                }
            }
        }
        return;
    }

    // Get parent ID if parent slug provided
    $parent_id = 0;
    if ($parent_slug) {
        $parent_page = get_page_by_path($parent_slug);
        if ($parent_page) {
            $parent_id = $parent_page->ID;
        }
    }

    // Create new page
    $page_data = [
        'post_title' => $title,
        'post_name' => $slug,
        'post_status' => 'publish',
        'post_type' => 'page',
        'post_content' => get_page_content_from_file($content_filename),
        'post_parent' => $parent_id,
    ];

    if ($template) {
        $page_data['meta_input'] = ['_wp_page_template' => $template];
    }

    wp_insert_post($page_data);
}

// Initialize essential pages
add_action('after_setup_theme', function () {
    // Booking pages
    ensure_page_exists('Booking Calendar', 'booking', 'booking', 'page-booking-calendar.php');
    ensure_page_exists('Booking Confirmation', 'booking-confirmation', 'booking-confirmation');
    ensure_page_exists('Booking Complete', 'booking-complete', 'booking-complete', 'page-booking-complete.php');

    // Enrollment pages
    ensure_page_exists('Enrollment Success', 'enrollment-success', 'enrollment-success', 'page-enrollment-success.php');

    // User dashboard pages
    ensure_page_exists('Student Dashboard', 'student', 'student');
    ensure_page_exists('Teacher Dashboard', 'teacher', 'teacher');

    // DEPRECATED: Set Availability page - functionality now integrated into Teacher Calendar
    // ensure_page_exists('Set Availability', 'set-availability', 'teacher-set-availability', null, null, 'teacher');
});
