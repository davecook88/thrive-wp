<?php
/**
 * Script to create or update the Booking page at /booking/
 * Uses the new Private Session Availability Calendar block.
 */

// Load WordPress
require_once('/var/www/html/wp-load.php');

// Compose block content
$block_content = '<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">Book a Private Class</h1>
<!-- /wp:heading -->

<!-- wp:custom-theme/private-session-availability-calendar {"view":"week","slotDuration":30,"snapTo":15,"viewHeight":640,"heading":"Choose a Time","showFilters":true} /-->';

$page_data = array(
    'post_title' => 'Booking',
    'post_name' => 'booking',
    'post_type' => 'page',
    'post_status' => 'publish',
    'post_content' => $block_content,
);

// Check if page exists
$existing = get_page_by_path('booking');
if ($existing) {
    $page_data['ID'] = $existing->ID;
    $result = wp_update_post($page_data, true);
    if (is_wp_error($result)) {
        echo "Failed to update Booking page: " . $result->get_error_message() . "\n";
    } else {
        echo "Updated Booking page with ID: {$existing->ID}\n";
    }
} else {
    $page_id = wp_insert_post($page_data, true);
    if (is_wp_error($page_id)) {
        echo "Failed to create Booking page: " . $page_id->get_error_message() . "\n";
    } else {
        echo "Created Booking page with ID: $page_id\n";
    }
}

echo "Booking page setup complete at /booking/.\n";
