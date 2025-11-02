<?php
/**
 * Course Meta Fields
 */

if (!defined('ABSPATH')) {
    exit;
}

function thrive_course_meta_boxes()
{
    add_meta_box(
        'thrive_course_code',
        'Course Code',
        'thrive_course_code_callback',
        'thrive_course',
        'side',
        'high'
    );
}

add_action('add_meta_boxes', 'thrive_course_meta_boxes');

function thrive_course_code_callback($post)
{
    wp_nonce_field('thrive_course_code_nonce', 'thrive_course_code_nonce');
    $course_code = get_post_meta($post->ID, '_thrive_course_code', true);
    ?>
    <p>
        <label for="thrive_course_code">Course Code (e.g., SFZ, ADV-TECH):</label><br>
        <input type="text" id="thrive_course_code" name="thrive_course_code" value="<?php echo esc_attr($course_code); ?>"
            class="widefat" required pattern="[A-Z0-9\-]+" style="text-transform: uppercase;">
    </p>
    <p class="description">Must match a course code from the NestJS API.</p>
    <?php
}

function thrive_save_course_code($post_id)
{
    // Security checks
    if (
        !isset($_POST['thrive_course_code_nonce']) ||
        !wp_verify_nonce($_POST['thrive_course_code_nonce'], 'thrive_course_code_nonce')
    ) {
        return;
    }

    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }

    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    // Save course code
    if (isset($_POST['thrive_course_code'])) {
        $course_code = strtoupper(sanitize_text_field($_POST['thrive_course_code']));
        update_post_meta($post_id, '_thrive_course_code', $course_code);
    }
}

add_action('save_post_thrive_course', 'thrive_save_course_code');
