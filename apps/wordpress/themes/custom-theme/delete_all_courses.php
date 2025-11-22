<?php
require_once(dirname(__FILE__) . '/../../../wp-load.php');

$args = [
    'post_type' => 'thrive_course',
    'posts_per_page' => -1,
    'post_status' => 'any'
];

$posts = get_posts($args);

foreach ($posts as $post) {
    wp_delete_post($post->ID, true);
    echo "Deleted course program: " . $post->post_title . " (ID: " . $post->ID . ")<br>";
}

if (empty($posts)) {
    echo "No course programs found to delete.";
}
