<?php

use Thrive_Admin_Bridge;

class Thrive_Admin_Bridge_Admin
{
    private Thrive_Admin_Bridge $bridge;

    public function __construct(Thrive_Admin_Bridge $bridge)
    {
        $this->bridge = $bridge;
        add_action('admin_menu', [$this, 'thrive_admin_add_admin_menu']);
        add_action('admin_enqueue_scripts', [$this, 'thrive_admin_enqueue_admin_scripts']);
        // Ensure our ESM bundles are loaded as modules (dev + prod)
        add_filter('script_loader_tag', [$this, 'thrive_admin_module_script_tag'], 10, 3);
        add_action('wp_ajax_thrive_admin_test_api_connection', [$this, 'thrive_admin_test_api_connection']);
        add_action('wp_ajax_thrive_admin_save_settings', callback: [$this, 'thrive_admin_save_settings_ajax']);
        add_action('wp_ajax_thrive_admin_packages_list', [$this, 'thrive_admin_packages_list']);
        add_action('wp_ajax_thrive_admin_packages_create', [$this, 'thrive_admin_packages_create']);
        add_action('admin_bar_menu', [$this, 'thrive_admin_add_toolbar_button'], 999);
    }

    public function thrive_admin_add_admin_menu()
    {
        // Main Thrive Admin menu
        add_menu_page(
            'Thrive Admin',
            'Thrive Admin',
            'manage_options',
            'thrive-admin-dashboard',
            [$this, 'thrive_admin_dashboard_page'],
            'dashicons-admin-network',
            30
        );

        // Submenu: Dashboard
        add_submenu_page(
            'thrive-admin-dashboard',
            'Dashboard',
            'Dashboard',
            'manage_options',
            'thrive-admin-dashboard',
            [$this, 'thrive_admin_dashboard_page']
        );

        // Submenu: User Management
        add_submenu_page(
            'thrive-admin-dashboard',
            'User Management',
            'Users',
            'manage_options',
            'thrive-admin-users',
            [$this, 'thrive_admin_users_page']
        );

        // Submenu: Products (Packages)
        add_submenu_page(
            'thrive-admin-dashboard',
            'Products',
            'Products',
            'manage_options',
            'thrive-admin-products',
            [$this, 'thrive_admin_products_page']
        );

        // Submenu: Settings
        add_submenu_page(
            'thrive-admin-dashboard',
            'Thrive Admin Settings',
            'Settings',
            'manage_options',
            'thrive-admin-settings',
            [$this, 'thrive_admin_settings_page']
        );
    }

    public function thrive_admin_enqueue_admin_scripts($hook)
    {
        $allowed_hooks = [
            'toplevel_page_thrive-admin-dashboard',
            'thrive-admin_page_thrive-admin-users',
            'thrive-admin_page_thrive-admin-products',
            'thrive-admin_page_thrive-admin-settings'
        ];

        if (!in_array($hook, $allowed_hooks)) {
            return;
        }

        // Enqueue Vue and our built assets
        $plugin_dir = plugin_dir_path(__FILE__) . '../';
        $assets_dir = $plugin_dir . 'dist/';

        // Decide whether to use Vite dev server (only if WP_DEBUG and dev server is reachable)
        $is_dev = $this->thrive_admin_should_use_vite_dev();

        error_log("Is dev: " . ($is_dev ? 'true' : 'false'));

        if ($is_dev) {
            // Development mode - use Vite dev server
            $vite_port = 5173;
            // With Vite root set to "src", the entry is served at /main.js (not /src/main.js)
            wp_enqueue_script('vite-client', "http://localhost:{$vite_port}/@vite/client", [], null, true);
            // Vite will serve TS entry at /main.ts when root = src
            wp_enqueue_script('thrive-admin-vue', "http://localhost:{$vite_port}/src/main.ts", ['vite-client'], null, true);
        } else {
            // Production mode - use built assets
            $manifest_file = $assets_dir . 'manifest.json';
            if (!file_exists($manifest_file)) {
                // Vite v5 places manifest under .vite/ by default
                $manifest_file = $assets_dir . '.vite/manifest.json';
            }

            if (file_exists($manifest_file)) {
                $manifest = json_decode(file_get_contents($manifest_file), true);
                // Manifest key could be 'main.ts' or 'main.js' depending on entry
                $mainKey = isset($manifest['main.ts']) ? 'main.ts' : (isset($manifest['main.js']) ? 'main.js' : null);
                if ($mainKey === null) {
                    return;
                }

                // Enqueue CSS
                if (isset($manifest[$mainKey]['css'])) {
                    foreach ($manifest[$mainKey]['css'] as $css_file) {
                        wp_enqueue_style(
                            'thrive-admin-css',
                            plugin_dir_url(__FILE__) . '../dist/' . $css_file,
                            [],
                            filemtime($assets_dir . $css_file)
                        );
                    }
                }

                // Enqueue JS
                wp_enqueue_script(
                    'thrive-admin-vue',
                    plugin_dir_url(__FILE__) . '../dist/' . $manifest[$mainKey]['file'],
                    [],
                    filemtime($assets_dir . $manifest[$mainKey]['file']),
                    true
                );
            }
        }

        // Localize script with WordPress data
        wp_localize_script('thrive-admin-vue', 'thriveAdminBridgeAjax', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('thrive_admin_bridge_users_nonce'),
            'admin_url' => admin_url(),
            'is_dev' => $is_dev
        ]);
    }

    /**
     * Force type="module" for our ESM bundles (both dev and prod).
     */
    public function thrive_admin_module_script_tag($tag, $handle, $src)
    {
        if (in_array($handle, ['thrive-admin-vue', 'vite-client'], true)) {
            // Ensure we don't duplicate type attribute
            if (strpos($tag, 'type="module"') === false) {
                $tag = str_replace('<script ', '<script type="module" ', $tag);
            }
        }
        return $tag;
    }

    /**
     * Determine if we should use Vite dev server: WP_DEBUG must be true and dev server reachable.
     */
    private function thrive_admin_should_use_vite_dev(): bool
    {
        if (!(defined('WP_DEBUG') && WP_DEBUG)) {
            return false;
        }

        // Cache result briefly to avoid slowing down admin loads
        $cached = get_transient('thrive_admin_vite_running');
        if ($cached !== false) {
            return (bool) $cached;
        }

        $running = false;
        $port = 5173; // Check common Vite ports
        $host = 'host.docker.internal';

        // Probe the dev server via @vite/client (works for JS/TS)
        $response = wp_remote_get("http://{$host}:{$port}/@vite/client", [
            'timeout' => 0.75,
            'redirection' => 0,
        ]);
        if (!is_wp_error($response)) {
            $code = (int) wp_remote_retrieve_response_code($response);
            $body = (string) wp_remote_retrieve_body($response);
            // Consider 200/3xx; 404 with vite content; and 403 from cross-origin as reachable
            if (
                ($code >= 200 && $code < 400)
                || ($code === 404 && str_contains($body, 'vite/client'))
                || ($code === 403 && $host === 'host.docker.internal')
            ) {
                $running = true;
            }
        }

        // Cache for 30 seconds
        set_transient('thrive_admin_vite_running', $running ? 1 : 0, 30);
        return $running;
    }

    public function thrive_admin_users_page()
    {

        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.'));
        }

        // Load the Vue template
        include plugin_dir_path(__FILE__) . '../../templates/users.php';
    }

    public function thrive_admin_dashboard_page()
    {
        error_log("Loading Dashboard Page");
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.'));
        }

        // Load the Vue template
        include plugin_dir_path(__FILE__) . '../../templates/dashboard.php';
    }

    public function thrive_admin_products_page()
    {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.'));
        }

        // Load the Vue template
        include plugin_dir_path(__FILE__) . '../../templates/packages.php';
    }

    public function thrive_admin_settings_page()
    {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.'));
        }

        // Handle form submission
        if (isset($_POST['thrive_admin_settings_nonce']) && wp_verify_nonce($_POST['thrive_admin_settings_nonce'], 'thrive_admin_settings')) {
            // Save settings logic would go here
            echo '<div class="notice notice-success"><p>' . __('Settings saved successfully!', 'thrive-admin-bridge') . '</p></div>';
        }

        // Load the Vue template
        include plugin_dir_path(__FILE__) . '../../templates/settings.php';
    }

    public function thrive_admin_test_api_connection()
    {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'thrive_admin_bridge_users_nonce')) {
            wp_die(__('Security check failed', 'thrive-admin-bridge'));
        }

        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_die(__('Insufficient permissions', 'thrive-admin-bridge'));
        }

        // Test the API connection
        $response = $this->bridge->thrive_admin_call_node_api('health', [], 'GET');

        if (is_wp_error($response)) {
            $error_data = $response->get_error_data();
            wp_send_json_error([
                'message' => 'Connection failed: ' . $response->get_error_message()
            ], $error_data['status_code'] ?? 500);
        }

        // Check if we got a valid response
        if (isset($response['status']) && $response['status'] === 'ok') {
            wp_send_json_success([
                'message' => 'API is responding correctly. Status: ' . $response['status']
            ]);
        } elseif (isset($response['message'])) {
            wp_send_json_success([
                'message' => 'API responded: ' . $response['message']
            ]);
        } else {
            wp_send_json_success([
                'message' => 'API connection successful. Response: ' . wp_json_encode($response)
            ]);
        }
    }

    private function thrive_admin_get_auth_context()
    {
        // Get auth context from the global set by the bridge
        if (isset($GLOBALS['thrive_header_auth'])) {
            return $GLOBALS['thrive_header_auth'];
        }

        return null;
    }

    private function thrive_admin_render_user_row($user)
    {
        $name = trim($user['firstName'] . ' ' . $user['lastName']);
        if (empty($name)) {
            $name = __('No name', 'thrive-admin-bridge');
        }

        $role = 'Student';
        $status = 'Active';

        if (isset($user['admin']) && $user['admin']['isActive']) {
            $role = 'Admin';
            $status = $user['admin']['isActive'] ? 'Active' : 'Inactive';
        } elseif (isset($user['teacher']) && $user['teacher']['isActive']) {
            $role = 'Teacher (Tier ' . $user['teacher']['tier'] . ')';
            $status = $user['teacher']['isActive'] ? 'Active' : 'Inactive';
        }

        $created_date = date_i18n(get_option('date_format'), strtotime($user['createdAt']));

        echo '<tr>';
        echo '<td>' . esc_html($user['id']) . '</td>';
        echo '<td>' . esc_html($name) . '</td>';
        echo '<td><a href="mailto:' . esc_attr($user['email']) . '">' . esc_html($user['email']) . '</a></td>';
        echo '<td>' . esc_html($role) . '</td>';
        echo '<td><span class="user-status status-' . strtolower($status) . '">' . esc_html($status) . '</span></td>';
        echo '<td>' . esc_html($created_date) . '</td>';
        echo '<td>';
        echo '<a href="#" class="button button-small view-user" data-user-id="' . esc_attr($user['id']) . '">' . __('View', 'thrive-admin-bridge') . '</a>';
        echo '</td>';
        echo '</tr>';
    }

    /**
     * Add Thrive Admin button to WordPress admin toolbar
     */
    public function thrive_admin_add_toolbar_button($wp_admin_bar)
    {
        // Only show for users with manage_options capability
        if (!current_user_can('manage_options')) {
            return;
        }

        $wp_admin_bar->add_node([
            'id' => 'thrive-admin-toolbar',
            'title' => '<span class="ab-icon dashicons-admin-network"></span>' . __('Thrive Admin', 'thrive-admin-bridge'),
            'href' => admin_url('admin.php?page=thrive-admin-dashboard'),
            'meta' => [
                'title' => __('Access Thrive Admin Dashboard', 'thrive-admin-bridge'),
            ],
        ]);
    }



    /**
     * AJAX handler for saving settings (used by Vue component)
     */
    public function thrive_admin_save_settings_ajax()
    {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'thrive_admin_bridge_users_nonce')) {
            wp_die(__('Security check failed', 'thrive-admin-bridge'));
        }

        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_die(__('Insufficient permissions', 'thrive-admin-bridge'));
        }

        // Get settings from AJAX request
        $settings = isset($_POST['settings']) ? json_decode(stripslashes($_POST['settings']), true) : [];

        // Here you would typically save the settings to the database
        // For now, we'll just return success
        // TODO: Implement actual settings storage

        wp_send_json_success([
            'message' => 'Settings saved successfully'
        ]);
    }
}