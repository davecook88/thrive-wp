<?php
/**
 * Template for single course pages
 * Fully dynamic - no WordPress post required
 */

get_header();

// Get course code from query var
$course_code = get_query_var('course_code');

if (empty($course_code)) {
    get_template_part('template-parts/content', 'none');
    get_footer();
    exit;
}

// Validate course exists in NestJS
$api_response = wp_remote_get("http://nestjs:3000/course-programs/{$course_code}");

if (is_wp_error($api_response) || wp_remote_retrieve_response_code($api_response) !== 200) {
    // Course not found in API
    ?>
    <main id="main" class="site-main">
        <section class="error-404 not-found">
            <header class="page-header">
                <h1 class="page-title"><?php esc_html_e('Course Not Found', 'custom-theme'); ?></h1>
            </header>
            <div class="page-content">
                <p><?php esc_html_e('Sorry, this course could not be found.', 'custom-theme'); ?></p>
            </div>
        </section>
    </main>
    <?php
    get_footer();
    exit;
}

?>

<main id="main" class="site-main course-page">
    <article class="course-page-content">
        <?php
        // Render Course Detail block (includes hero, schedule selector, calendar, and CTA)
        echo do_blocks('<!-- wp:custom-theme/course-detail /-->');
        ?>
    </article>
</main>

<?php
get_footer();
