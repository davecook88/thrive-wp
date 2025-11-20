<?php
/**
 * Template for individual course step pages
 * URL: /course/{course-slug}/step-{step-id}
 */

get_header();

// Get step ID from query var
$step_id = get_query_var('step_id');
$course_slug = get_query_var('course_slug');

if (empty($step_id) || empty($course_slug)) {
    get_template_part('template-parts/content', 'none');
    get_footer();
    exit;
}

// Note: We don't validate the step exists here; the React component will handle loading
// and will display an error message if the step is not found.
?>

<main id="main" class="site-main course-step-page">
    <article class="course-step-content">
        <!-- Course Materials Block -->
        <div class="course-step-materials">
            <?php
            // Render the course-materials block with the step ID
            // The block will handle fetching and displaying materials, progress tracking, and course header
            $course_step_id = intval($step_id);
            echo do_blocks(
                "<!-- wp:thrive/student-course-materials {\"courseStepId\": $course_step_id} /-->"
            );
            ?>
        </div>
    </article>
</main>

<?php get_footer();
