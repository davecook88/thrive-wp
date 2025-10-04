<?php
/**
 * Theme setup: supports, menus, default menu creation
 */

function custom_theme_setup()
{
    add_theme_support('wp-block-styles');
    add_theme_support('responsive-embeds');
    add_theme_support('editor-styles');
    add_theme_support('custom-logo');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script'
    ));
    add_theme_support('align-wide');
    add_theme_support('custom-line-height');
    add_theme_support('custom-units');

    register_nav_menus(array(
        'primary' => __('Primary Menu', 'custom-theme'),
    ));
}
add_action('after_setup_theme', 'custom_theme_setup');

// Create role-based navigation menus (wp_navigation posts)
function custom_theme_create_role_based_navigations()
{
    $navigations = array(
        'default-menu' => array(
            'title' => 'Default Menu',
            'content' => '<!-- wp:navigation-link {"label":"Home","url":"/"} /-->'
        ),
        'student-menu' => array(
            'title' => 'Student Menu',
            'content' => '<!-- wp:navigation-link {"label":"Home","url":"/"} /-->
<!-- wp:navigation-link {"label":"My Courses","url":"/my-courses"} /-->
<!-- wp:navigation-link {"label":"Schedule","url":"/schedule"} /-->'
        ),
        'teacher-menu' => array(
            'title' => 'Teacher Menu',
            'content' => '<!-- wp:navigation-link {"label":"Home","url":"/"} /-->
<!-- wp:navigation-link {"label":"My Students","url":"/my-students"} /-->
<!-- wp:navigation-link {"label":"Availability","url":"/availability"} /-->'
        ),
        'admin-menu' => array(
            'title' => 'Admin Menu',
            'content' => '<!-- wp:navigation-link {"label":"Home","url":"/"} /-->
<!-- wp:navigation-link {"label":"Dashboard","url":"/admin-dashboard"} /-->
<!-- wp:navigation-link {"label":"Users","url":"/users"} /-->
<!-- wp:navigation-link {"label":"Settings","url":"/settings"} /-->'
        )
    );

    foreach ($navigations as $slug => $nav_data) {
        // Check if this specific navigation already exists by slug
        $existing = get_posts(array(
            'post_type' => 'wp_navigation',
            'name' => $slug,
            'posts_per_page' => 1,
            'post_status' => 'publish',
        ));

        if (!empty($existing)) {
            continue; // Navigation already exists, skip
        }

        // Create the navigation
        $nav_post_id = wp_insert_post(array(
            'post_title' => $nav_data['title'],
            'post_name' => $slug,
            'post_content' => $nav_data['content'],
            'post_status' => 'publish',
            'post_type' => 'wp_navigation',
        ));

        if (is_wp_error($nav_post_id)) {
            error_log("Failed to create {$slug} navigation: " . $nav_post_id->get_error_message());
        }
    }
}
add_action('after_setup_theme', 'custom_theme_create_role_based_navigations', 11);
add_action('init', 'custom_theme_create_role_based_navigations', 1);
add_action('after_switch_theme', 'custom_theme_create_role_based_navigations');

// Filter navigation blocks to use role-based menus
function custom_theme_filter_navigation_by_role($block_content, $block)
{
    // Only apply to navigation blocks
    if ($block['blockName'] !== 'core/navigation') {
        return $block_content;
    }

    // Determine which menu to use based on user role
    $role = thrive_get_primary_role();
    $menu_slug = $role ? "{$role}-menu" : 'default-menu';

    // Get the appropriate navigation post
    $nav_posts = get_posts(array(
        'post_type' => 'wp_navigation',
        'name' => $menu_slug,
        'posts_per_page' => 1,
        'post_status' => 'publish',
    ));

    if (empty($nav_posts)) {
        return $block_content; // No custom menu found, return original
    }

    $nav_post = $nav_posts[0];

    // Parse and render the navigation content
    $parsed_blocks = parse_blocks($nav_post->post_content);
    $nav_items = '';

    foreach ($parsed_blocks as $nav_block) {
        if (!empty($nav_block['blockName'])) {
            $nav_items .= render_block($nav_block);
        }
    }

    // Inject the role-based navigation items into the navigation block
    // This is a simple string replacement approach
    if (!empty($nav_items)) {
        // Extract the opening tag and inject our items
        if (preg_match('/<nav[^>]*>/', $block_content, $matches)) {
            $opening_tag = $matches[0];
            // Find the ul container
            if (preg_match('/<ul[^>]*>/', $block_content, $ul_matches)) {
                $ul_opening = $ul_matches[0];
                // Replace the content inside the ul
                $block_content = preg_replace(
                    '/(<ul[^>]*>).*?(<\/ul>)/s',
                    '$1' . $nav_items . '$2',
                    $block_content
                );
            }
        }
    }

    return $block_content;
}
add_filter('render_block', 'custom_theme_filter_navigation_by_role', 10, 2);



// Dev convenience: auto-enable pretty permalinks when WP_DEBUG is true
add_action('init', function () {
    if (defined('WP_DEBUG') && WP_DEBUG) {
        $structure = get_option('permalink_structure');
        if (empty($structure)) {
            global $wp_rewrite;
            $wp_rewrite->set_permalink_structure('/%postname%/');
            flush_rewrite_rules();
        }
    }
}, 99);

?>