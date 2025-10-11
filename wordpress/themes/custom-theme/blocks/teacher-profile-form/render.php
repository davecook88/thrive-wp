<?php
/**
 * Teacher Profile Form Block - Render
 */

// Only show to logged-in teachers
if (!thrive_is_teacher()) {
    echo '<p>This section is only available to teachers.</p>';
    return;
}

$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'thrive-teacher-profile-form'
]);
?>

<div <?php echo $wrapper_attributes; ?>></div>
