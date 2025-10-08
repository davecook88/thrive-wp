<?php
/**
 * Server-side rendering for the booking policy notice block
 */

function render_booking_policy_notice_block($attributes)
{
    // This is a dynamic block that renders on the frontend
    // Return a placeholder that will be replaced by React
    ob_start();
    ?>
    <div class="wp-block-custom-theme-booking-policy-notice">
        <div class="booking-policy-notice-placeholder">
            <!-- React component will render here -->
        </div>
    </div>
    <?php
    return ob_get_clean();
}