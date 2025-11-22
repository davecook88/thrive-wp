<?php
// Load WordPress
require_once(dirname(__FILE__) . '/../../../wp-load.php');

// Create Course Program
$program_title = 'Test Course Program';
$program = get_page_by_title($program_title, OBJECT, 'thrive_course');

if ($program) {
    echo "Course Program '$program_title' already exists (ID: " . $program->ID . ").<br>";
    $program_id = $program->ID;
} else {
    $program_id = wp_insert_post([
        'post_title'    => $program_title,
        'post_type'     => 'thrive_course',
        'post_status'   => 'publish',
    ]);
    if (is_wp_error($program_id)) {
        echo "Error creating program: " . $program_id->get_error_message() . "<br>";
        exit;
    }
    echo "Created Course Program '$program_title' (ID: $program_id).<br>";
}

// Create Course Level
$level_title = 'Level 1';
$level = get_page_by_title($level_title, OBJECT, 'course_level');

if ($level) {
    echo "Course Level '$level_title' already exists (ID: " . $level->ID . ").<br>";
} else {
    $level_id = wp_insert_post([
        'post_title'    => $level_title,
        'post_type'     => 'course_level',
        'post_status'   => 'publish',
        'post_parent'   => $program_id,
    ]);
    
    if (is_wp_error($level_id)) {
         echo "Error creating level: " . $level_id->get_error_message() . "<br>";
    } else {
        echo "Created Course Level '$level_title' (ID: $level_id).<br>";
    }
}
