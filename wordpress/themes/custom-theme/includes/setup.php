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

    // --- Also create classic nav_menus so designers can edit them in Appearance -> Menus
    // Map the role-based slugs to classic menu names (human readable)
    $classic_menus = array(
        'default-menu' => 'Default Menu',
        'student-menu' => 'Student Menu',
        'teacher-menu' => 'Teacher Menu',
    );

    foreach ($classic_menus as $slug => $menu_name) {
        // Check if a menu with this name exists
        $menu_term = wp_get_nav_menu_object($menu_name);
        if (!$menu_term) {
            $menu_id = wp_create_nav_menu($menu_name);
            if (is_wp_error($menu_id)) {
                error_log("Failed to create classic menu {$menu_name}: " . $menu_id->get_error_message());
                continue;
            }
        } else {
            $menu_id = $menu_term->term_id;
        }

        // Build items from the block content if we have a defined navigation
        if (isset($navigations[$slug])) {
            $content = $navigations[$slug]['content'];
            $parsed = parse_blocks($content);

            // Always ensure /booking is present for every menu
            $required_links = array(
                array('label' => 'Booking', 'url' => '/booking'),
            );

            // Role specific extra links
            if ($slug === 'teacher-menu') {
                $required_links[] = array('label' => 'Teacher', 'url' => '/teacher');
            }
            if ($slug === 'student-menu') {
                // Use 'Student Dashboard' as a clear name for /student
                $required_links[] = array('label' => 'Student Dashboard', 'url' => '/student');
            }

            // Parse navigation-link blocks
            $menu_items = array();
            foreach ($parsed as $block) {
                if (!empty($block['blockName']) && $block['blockName'] === 'core/navigation-link') {
                    $attrs = $block['attrs'] ?? array();
                    $label = $attrs['label'] ?? '';
                    $url = $attrs['url'] ?? '';
                    if (!empty($label) && !empty($url)) {
                        $menu_items[] = array('label' => $label, 'url' => $url);
                    }
                }
            }

            // Merge required links (at end) ensuring no duplicates by URL
            foreach ($required_links as $req) {
                $found = false;
                foreach ($menu_items as $mi) {
                    if ($mi['url'] === $req['url']) {
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $menu_items[] = $req;
                }
            }

            // Now add/update the menu items in the created menu
            // Simple strategy: if the menu is empty, add items; otherwise leave existing menu as-is to avoid stomping designer changes
            $existing_items = wp_get_nav_menu_items($menu_id);
            if (empty($existing_items)) {
                foreach ($menu_items as $item) {
                    wp_update_nav_menu_item($menu_id, 0, array(
                        'menu-item-title' => $item['label'],
                        'menu-item-url' => $item['url'],
                        'menu-item-status' => 'publish',
                    ));
                }
            }
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

    // Prefer classic nav_menus (Appearance -> Menus) so designers can edit them.
    $menu_map = array(
        'default-menu' => 'Default Menu',
        'student-menu' => 'Student Menu',
        'teacher-menu' => 'Teacher Menu',
    );

    $nav_items = '';

    if (isset($menu_map[$menu_slug])) {
        $classic_name = $menu_map[$menu_slug];
        $menu_obj = wp_get_nav_menu_object($classic_name);
        if ($menu_obj) {
            // Render only the <li> items so we can inject them into the navigation block's <ul>
            $nav_items = wp_nav_menu(array(
                'menu' => $classic_name,
                'container' => false,
                'echo' => false,
                'items_wrap' => '%3$s',
            ));
        }
    }

    // If no classic menu found (or menu empty), fall back to block-based wp_navigation posts
    if (empty(trim($nav_items))) {
        $nav_posts = get_posts(array(
            'post_type' => 'wp_navigation',
            'name' => $menu_slug,
            'posts_per_page' => 1,
            'post_status' => 'publish',
        ));

        if (empty($nav_posts)) {
            return $block_content; // No custom menu found, return original
        }

        $nav_post_obj = $nav_posts[0];
        if (!is_object($nav_post_obj)) {
            $nav_post_obj = get_post($nav_post_obj);
        }

        if (empty($nav_post_obj) || empty($nav_post_obj->post_content)) {
            return $block_content;
        }

        // Parse and render the navigation content
        $parsed_blocks = parse_blocks($nav_post_obj->post_content);
        foreach ($parsed_blocks as $nav_block) {
            if (!empty($nav_block['blockName'])) {
                $nav_items .= render_block($nav_block);
            }
        }
    }

    // Inject the role-based navigation items into the navigation block
    // This is a simple string replacement approach
    if (!empty($nav_items)) {
        // Extract the opening tag and inject our items
        if (preg_match('/<nav[^>]*>/', $block_content, $matches)) {
            // Find the ul container
            if (preg_match('/<ul[^>]*>/', $block_content, $ul_matches)) {
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