<?php
/**
 * Script to create teacher portal pages
 * Run this once to set up the teacher pages
 */

// Load WordPress
require_once('/var/www/html/wp-load.php');

// Create teacher home page
$teacher_home_page = array(
    'post_title'    => 'Teacher Dashboard',
    'post_content'  => '<!-- wp:paragraph -->
<p>Welcome to your teacher dashboard! Here you can manage your availability, view your classes, and access teaching resources.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"className":"is-style-fill"} -->
<div class="wp-block-button is-style-fill"><a class="wp-block-button__link" href="/teacher/set-availability">Set Availability</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->',
    'post_status'   => 'publish',
    'post_type'     => 'page',
    'post_name'     => 'teacher'
);

// Check if page exists
$existing_page = get_page_by_path('teacher');
if (!$existing_page) {
    $page_id = wp_insert_post($teacher_home_page);
    if ($page_id) {
        echo "Created teacher home page with ID: $page_id\n";
    } else {
        echo "Failed to create teacher home page\n";
    }
} else {
    echo "Teacher home page already exists with ID: " . $existing_page->ID . "\n";
}

// Create set availability page
$availability_page = array(
    'post_title'    => 'Set Availability',
    'post_content'  => '<!-- wp:custom-theme/teacher-availability {"heading":"Manage Your Availability","helpText":"Set your weekly schedule and add any exceptions or blackout periods.","accentColor":"#9aa8ff","showPreviewWeeks":2} /-->',
    'post_status'   => 'publish',
    'post_type'     => 'page',
    'post_name'     => 'teacher/set-availability'
);

// Check if page exists
$existing_availability_page = get_page_by_path('teacher/set-availability');
if (!$existing_availability_page) {
    $page_id = wp_insert_post($availability_page);
    if ($page_id) {
        echo "Created availability page with ID: $page_id\n";
    } else {
        echo "Failed to create availability page\n";
    }
} else {
    echo "Availability page already exists with ID: " . $existing_availability_page->ID . "\n";
}

echo "Teacher portal pages setup complete!\n";
