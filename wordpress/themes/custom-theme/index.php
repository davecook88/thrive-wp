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
block_template_part('header');

if (have_posts()) {
    while (have_posts()) {
        the_post();
        the_content();
    }
} else {
    echo '<p>No content found.</p>';
}

block_template_part('footer');