<?php
/**
 * Script to create student dashboard page
 * Run this once to set up the student dashboard page
 *
 * Usage:
 * - From host: docker-compose exec wordpress php /var/www/html/wp-content/themes/custom-theme/create-student-page.php
 * - From container: php /var/www/html/wp-content/themes/custom-theme/create-student-page.php
 */

// Load WordPress
require_once('/var/www/html/wp-load.php');

// Create student dashboard page
$student_page = array(
    'post_title' => 'Student Dashboard',
    'post_content' => '<!-- wp:heading {"level":1} -->
<h1>My Learning Dashboard</h1>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Welcome to your personal learning dashboard. Here you can view your upcoming sessions, manage your bookings, and track your progress.</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2} -->
<h2>My Sessions</h2>
<!-- /wp:heading -->

<!-- wp:custom-theme/student-calendar /-->

<!-- wp:heading {"level":2} -->
<h2>Quick Actions</h2>
<!-- /wp:heading -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"className":"is-style-fill"} -->
<div class="wp-block-button is-style-fill"><a class="wp-block-button__link" href="/teachers">Browse Teachers</a></div>
<!-- /wp:button -->

<!-- wp:button {"className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link" href="/booking-complete">View Recent Bookings</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->

<!-- wp:paragraph -->
<p><em>Note: You must be signed in to view your sessions and manage your bookings.</em></p>
<!-- /wp:paragraph -->',
    'post_status' => 'publish',
    'post_type' => 'page',
    'post_name' => 'student'
);

// Check if page exists
$existing_page = get_page_by_path('student');
if (!$existing_page) {
    $page_id = wp_insert_post($student_page);
    if ($page_id) {
        echo "Created student dashboard page with ID: $page_id\n";
    } else {
        echo "Failed to create student dashboard page\n";
    }
} else {
    echo "Student dashboard page already exists with ID: " . $existing_page->ID . "\n";
}

echo "Student dashboard page setup complete!\n";
