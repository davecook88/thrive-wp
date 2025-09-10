<?php
/**
 * Script to create booking complete page
 * Run this once to set up the booking complete page
 */

// Load WordPress
require_once('/var/www/html/wp-load.php');

// Create booking complete page
$booking_complete_page = array(
    'post_title' => 'Booking Complete',
    'post_content' => '<!-- wp:paragraph -->
<p>Thank you for your booking! Your payment has been processed successfully.</p>
<!-- /wp:paragraph -->

<!-- wp:custom-theme/booking-status /-->

<!-- wp:paragraph -->
<p>You will receive a confirmation email shortly with the details of your session. If you have any questions, please don\'t hesitate to contact us.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"className":"is-style-fill"} -->
<div class="wp-block-button is-style-fill"><a class="wp-block-button__link" href="/">Return to Home</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->',
    'post_status' => 'publish',
    'post_type' => 'page',
    'post_name' => 'booking-complete'
);

// Check if page exists
$existing_page = get_page_by_path('booking-complete');
if (!$existing_page) {
    $page_id = wp_insert_post($booking_complete_page);
    if ($page_id) {
        echo "Created booking complete page with ID: $page_id\n";
    } else {
        echo "Failed to create booking complete page\n";
    }
} else {
    echo "Booking complete page already exists with ID: " . $existing_page->ID . "\n";
}

echo "Booking complete page setup complete!\n";
