<?php
/**
 * Script to create or update the Booking Confirmation page at /booking-confirmation/
 * Uses custom Gutenberg blocks for merge fields and payment selection.
 */

// Load WordPress
require_once('/var/www/html/wp-load.php');

// Compose block content
$block_content = '<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">Confirm Your Booking</h1>
<!-- /wp:heading -->

<!-- wp:custom-theme/booking-session-details /-->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">Choose Your Package</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Select a package that works for you. Each package includes multiple sessions with your chosen teacher.</p>
<!-- /wp:paragraph -->

<!-- wp:custom-theme/package-selection /-->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">Complete Your Payment</h2>
<!-- /wp:heading -->

<!-- wp:custom-theme/conditional-stripe-payment /-->';

$page_data = array(
    'post_title' => 'Booking Confirmation',
    'post_name' => 'booking-confirmation',
    'post_type' => 'page',
    'post_status' => 'publish',
    'post_content' => $block_content,
);

// Check if page exists
$existing = get_page_by_path('booking-confirmation');
if ($existing) {
    $page_data['ID'] = $existing->ID;
    $result = wp_update_post($page_data, true);
    if (is_wp_error($result)) {
        echo "Failed to update Booking Confirmation page: " . $result->get_error_message() . "\n";
    } else {
        echo "Updated Booking Confirmation page with ID: {$existing->ID}\n";
    }
} else {
    $page_id = wp_insert_post($page_data, true);
    if (is_wp_error($page_id)) {
        echo "Failed to create Booking Confirmation page: " . $page_id->get_error_message() . "\n";
    } else {
        echo "Created Booking Confirmation page with ID: $page_id\n";
    }
}

echo "Booking Confirmation page setup complete at /booking-confirmation/.\n";