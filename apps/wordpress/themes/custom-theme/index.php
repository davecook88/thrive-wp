<?php
/**
 * Main template file for block theme
 * 
 * This file redirects to the block template system.
 * The actual layout is handled by templates/index.html
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// This theme uses block templates
// Prefer a PHP header template part when available (allows server-rendered nav). Otherwise use block template part.
$php_header = get_template_directory() . '/parts/header.php';
if (file_exists($php_header)) {
    include $php_header;
} else {
    block_template_part('header');
}

if (have_posts()) {
    while (have_posts()) {
        the_post();
        the_content();
    }
} else {
    echo '<p>No content found.</p>';
}

block_template_part('footer');