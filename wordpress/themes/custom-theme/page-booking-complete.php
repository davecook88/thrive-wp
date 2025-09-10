<?php
/*
Template Name: Booking Complete
Description: Booking completion page that handles Stripe payment redirect parameters.
*/

get_header();

// Get URL parameters from Stripe redirect
$payment_intent = isset($_GET['payment_intent']) ? sanitize_text_field(wp_unslash($_GET['payment_intent'])) : '';
$payment_intent_client_secret = isset($_GET['payment_intent_client_secret']) ? sanitize_text_field(wp_unslash($_GET['payment_intent_client_secret'])) : '';
$redirect_status = isset($_GET['redirect_status']) ? sanitize_text_field(wp_unslash($_GET['redirect_status'])) : '';

?>
<main id="primary" class="site-main" style="max-width:860px;margin:0 auto;padding:24px;">
    <h1 style="margin:0 0 16px 0;">Booking Complete</h1>

    <?php if (have_posts()): ?>
        <?php while (have_posts()):
            the_post(); ?>
            <div class="entry-content">
                <?php the_content(); ?>
            </div>
        <?php endwhile; ?>
    <?php else: ?>
        <!-- Fallback content if no page content -->
        <div class="booking-status-fallback">
            <?php if ($redirect_status === 'succeeded'): ?>
                <div class="booking-status booking-status-success">
                    <div class="booking-status-icon">✅</div>
                    <h3 class="booking-status-title">Booking Confirmed!</h3>
                    <p class="booking-status-message">Your booking has been successfully confirmed and payment processed.</p>
                    <?php if (!empty($payment_intent)): ?>
                        <div class="booking-status-details">
                            <small style="color: #6b7280;">Payment ID: <?php echo esc_html($payment_intent); ?></small>
                        </div>
                    <?php endif; ?>
                </div>
            <?php elseif ($redirect_status === 'failed' || $redirect_status === 'canceled'): ?>
                <div class="booking-status booking-status-failure">
                    <div class="booking-status-icon">❌</div>
                    <h3 class="booking-status-title">Booking Failed</h3>
                    <p class="booking-status-message">There was an issue processing your booking. Please try again or contact
                        support.</p>
                    <?php if (!empty($redirect_status)): ?>
                        <div class="booking-status-details">
                            <small style="color: #6b7280;">Status: <?php echo esc_html(ucfirst($redirect_status)); ?></small>
                        </div>
                    <?php endif; ?>
                </div>
            <?php else: ?>
                <div class="booking-status booking-status-pending">
                    <div class="booking-status-icon">⏳</div>
                    <h3 class="booking-status-title">Processing Payment</h3>
                    <p class="booking-status-message">Please wait while we process your payment...</p>
                </div>
            <?php endif; ?>

            <div style="margin-top: 2rem; text-align: center;">
                <a href="<?php echo esc_url(home_url('/booking')); ?>" class="button button-primary">Book Another
                    Session</a>
                <a href="<?php echo esc_url(home_url('/')); ?>" class="button" style="margin-left: 8px;">Return to Home</a>
            </div>
        </div>
    <?php endif; ?>
</main>

<style>
    .booking-status {
        text-align: center;
        padding: 2rem;
        border-radius: 12px;
        margin: 1rem 0;
    }

    .booking-status-success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
    }

    .booking-status-failure {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
    }

    .booking-status-pending {
        background: #fffbeb;
        border: 1px solid #fde68a;
        color: #92400e;
    }

    .booking-status-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }

    .booking-status-title {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .booking-status-message {
        margin: 0 0 1rem 0;
        font-size: 1rem;
    }

    .booking-status-details {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid currentColor;
        opacity: 0.7;
    }
</style>

<?php get_footer(); ?>