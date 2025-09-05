<?php
/*
Template Name: Booking Calendar
Description: Displays teacher picker and calendar for booking private classes.
*/

get_header();
?>
<main id="primary" class="site-main" style="max-width:1100px;margin:0 auto;padding:24px;">
    <h1 style="margin:0 0 16px 0;">Book a Private Class</h1>

    <!-- Calendar Context provides selected teacher and loads availability events -->
    <div class="wp-block-custom-theme-thrive-calendar-context" id="booking-cal-ctx">
        <div class="thrive-teacher-picker" data-heading="Choose a Teacher" data-show-filters="1"></div>

        <div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
            <?php
            // Render the calendar block server-side for consistency with other pages
            echo do_blocks('<!-- wp:custom-theme/thrive-calendar {"view":"week","mode":"public","slotDuration":30,"showAvailability":true,"showClasses":true,"showBookings":false,"viewHeight":640} /-->');
            ?>
        </div>

        <?php
        // Inject a Selected Event Modal wrapper so clicks open a modal by default
        $default_modal_id = (int) get_option('custom_theme_default_modal_id', 0);
        if ($default_modal_id): ?>
            <div class="wp-block-custom-theme-selected-event-modal"
                data-availability-modal-id="<?php echo esc_attr((string) $default_modal_id); ?>" data-class-modal-id="0"
                data-course-modal-id="0" data-default-modal-id="<?php echo esc_attr((string) $default_modal_id); ?>"
                style="display:none"></div>
        <?php endif; ?>
    </div>
</main>
<?php get_footer(); ?>