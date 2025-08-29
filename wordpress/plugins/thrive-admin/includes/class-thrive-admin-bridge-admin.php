<?php

class Thrive_Admin_Bridge_Admin
{
    private $bridge;

    public function __construct($bridge)
    {
        $this->bridge = $bridge;
        add_action('admin_menu', [$this, 'thrive_admin_add_admin_menu']);
        add_action('admin_enqueue_scripts', [$this, 'thrive_admin_enqueue_admin_scripts']);
        add_action('wp_ajax_thrive_admin_test_api_connection', [$this, 'thrive_admin_test_api_connection']);
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
            'thrive-admin_page_thrive-admin-settings'
        ];

        if (!in_array($hook, $allowed_hooks)) {
            return;
        }

        wp_enqueue_style('thrive-admin-bridge-admin', plugin_dir_url(__FILE__) . '../assets/css/thrive-admin.css', [], '1.0.0');
        wp_enqueue_script('thrive-admin-bridge-admin', plugin_dir_url(__FILE__) . '../assets/js/thrive-admin.js', ['jquery'], '1.0.0', true);

        wp_localize_script('thrive-admin-bridge-admin', 'thriveAdminBridgeAjax', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('thrive_admin_bridge_users_nonce')
        ]);
    }

    public function thrive_admin_users_page()
    {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.'));
        }

        // Get pagination parameters
        $page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
        $search = isset($_GET['search']) ? sanitize_text_field($_GET['search']) : '';
        $role = isset($_GET['role']) ? sanitize_text_field($_GET['role']) : '';

        // Call NestJS API
        $params = ['page' => $page, 'limit' => 20];
        if (!empty($search)) {
            $params['search'] = $search;
        }
        if (!empty($role)) {
            $params['role'] = $role;
        }
        error_log("Calling thrive_admin_get_users with params: " . print_r($params, true));
        $response = $this->bridge->thrive_admin_get_users($params);

        ?>
        <div class="wrap">
            <h1><?php _e('User Management', 'thrive-admin-bridge'); ?></h1>

            <!-- Search and Filter Form -->
            <form method="GET" class="users-filter-form">
                <input type="hidden" name="page" value="thrive-admin-users">

                <div class="tablenav top">
                    <div class="alignleft actions">
                        <input type="text" name="search" value="<?php echo esc_attr($search); ?>"
                            placeholder="Search by name or email..." class="regular-text">

                        <select name="role">
                            <option value="">All Roles</option>
                            <option value="admin" <?php selected($role, 'admin'); ?>>Admin</option>
                            <option value="teacher" <?php selected($role, 'teacher'); ?>>Teacher</option>
                        </select>

                        <input type="submit" class="button" value="Filter">
                        <?php if (!empty($search) || !empty($role)): ?>
                            <a href="<?php echo admin_url('admin.php?page=thrive-admin-users'); ?>" class="button">Clear
                                Filters</a>
                        <?php endif; ?>
                    </div>

                    <div class="tablenav-pages">
                        <?php if (!is_wp_error($response) && isset($response['total'])): ?>
                            <span
                                class="displaying-num"><?php printf(_n('%s user', '%s users', $response['total'], 'nodejs-bridge'), number_format_i18n($response['total'])); ?></span>
                        <?php endif; ?>
                    </div>
                </div>
            </form>

            <!-- Users Table -->
            <table class="wp-list-table widefat fixed striped users">
                <thead>
                    <tr>
                        <th><?php _e('ID', 'thrive-admin-bridge'); ?></th>
                        <th><?php _e('Name', 'thrive-admin-bridge'); ?></th>
                        <th><?php _e('Email', 'thrive-admin-bridge'); ?></th>
                        <th><?php _e('Role', 'thrive-admin-bridge'); ?></th>
                        <th><?php _e('Status', 'thrive-admin-bridge'); ?></th>
                        <th><?php _e('Created', 'thrive-admin-bridge'); ?></th>
                        <th><?php _e('Actions', 'thrive-admin-bridge'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    if (is_wp_error($response)) {
                        echo '<tr><td colspan="7"><div class="notice notice-error"><p>' . __('Error loading users: ', 'thrive-admin-bridge') . esc_html($response->get_error_message()) . '</p></div></td></tr>';
                    } elseif (isset($response['error'])) {
                        echo '<tr><td colspan="7"><div class="notice notice-error"><p>' . __('API Error: ', 'thrive-admin-bridge') . esc_html($response['error']) . '</p></div></td></tr>';
                    } elseif (empty($response['users'])) {
                        echo '<tr><td colspan="7"><div class="notice notice-info"><p>' . __('No users found.', 'thrive-admin-bridge') . '</p></div></td></tr>';
                    } else {
                        foreach ($response['users'] as $user) {
                            $this->thrive_admin_render_user_row($user);
                        }
                    }
                    ?>
                </tbody>
            </table>

            <!-- Pagination -->
            <?php if (!is_wp_error($response) && isset($response['totalPages']) && $response['totalPages'] > 1): ?>
                <div class="tablenav bottom">
                    <div class="tablenav-pages">
                        <?php
                        $pagination_args = [
                            'base' => add_query_arg('paged', '%#%'),
                            'format' => '',
                            'prev_text' => __('&laquo; Previous'),
                            'next_text' => __('Next &raquo;'),
                            'total' => $response['totalPages'],
                            'current' => $page,
                        ];

                        if (!empty($search)) {
                            $pagination_args['add_args'] = ['search' => $search];
                        }
                        if (!empty($role)) {
                            $pagination_args['add_args']['role'] = $role;
                        }

                        echo paginate_links($pagination_args);
                        ?>
                    </div>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }

    public function thrive_admin_dashboard_page()
    {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.'));
        }

        ?>
        <div class="wrap">
            <h1><?php _e('Thrive Admin Dashboard', 'thrive-admin-bridge'); ?></h1>

            <div class="thrive-admin-dashboard">
                <div class="thrive-admin-welcome-panel">
                    <h2><?php _e('Welcome to Thrive Admin', 'thrive-admin-bridge'); ?></h2>
                    <p><?php _e('Manage your Thrive application users, settings, and more from this central dashboard.', 'thrive-admin-bridge'); ?>
                    </p>
                </div>

                <div class="thrive-admin-quick-stats">
                    <h3><?php _e('Quick Actions', 'thrive-admin-bridge'); ?></h3>
                    <div class="thrive-admin-action-cards">
                        <div class="thrive-admin-card">
                            <h4><?php _e('User Management', 'thrive-admin-bridge'); ?></h4>
                            <p><?php _e('View, search, and manage application users', 'thrive-admin-bridge'); ?></p>
                            <a href="<?php echo admin_url('admin.php?page=thrive-admin-users'); ?>"
                                class="button button-primary">
                                <?php _e('Manage Users', 'thrive-admin-bridge'); ?>
                            </a>
                        </div>

                        <div class="thrive-admin-card">
                            <h4><?php _e('Settings', 'thrive-admin-bridge'); ?></h4>
                            <p><?php _e('Configure Thrive Admin settings', 'thrive-admin-bridge'); ?></p>
                            <a href="<?php echo admin_url('admin.php?page=thrive-admin-settings'); ?>"
                                class="button button-secondary">
                                <?php _e('Configure Settings', 'thrive-admin-bridge'); ?>
                            </a>
                        </div>

                        <div class="thrive-admin-card">
                            <h4><?php _e('API Status', 'thrive-admin-bridge'); ?></h4>
                            <p><?php _e('Check the connection to the NestJS API', 'thrive-admin-bridge'); ?></p>
                            <button id="thrive-admin-test-api" class="button button-secondary">
                                <?php _e('Test Connection', 'thrive-admin-bridge'); ?>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
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

        ?>
        <div class="wrap">
            <h1><?php _e('Thrive Admin Settings', 'thrive-admin-bridge'); ?></h1>

            <form method="post" action="">
                <?php wp_nonce_field('thrive_admin_settings', 'thrive_admin_settings_nonce'); ?>

                <table class="form-table">
                    <tr>
                        <th scope="row"><?php _e('API Base URL', 'thrive-admin-bridge'); ?></th>
                        <td>
                            <input type="text" name="thrive_admin_api_url" value="http://nestjs:3000" class="regular-text"
                                readonly>
                            <p class="description">
                                <?php _e('The NestJS API endpoint (configured in Docker)', 'thrive-admin-bridge'); ?>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row"><?php _e('Items Per Page', 'thrive-admin-bridge'); ?></th>
                        <td>
                            <input type="number" name="thrive_admin_items_per_page" value="20" min="5" max="100"
                                class="small-text">
                            <p class="description">
                                <?php _e('Number of items to display per page in user lists', 'thrive-admin-bridge'); ?>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row"><?php _e('Enable Debug Mode', 'thrive-admin-bridge'); ?></th>
                        <td>
                            <label for="thrive_admin_debug_mode">
                                <input type="checkbox" name="thrive_admin_debug_mode" id="thrive_admin_debug_mode" value="1">
                                <?php _e('Enable debug logging for API calls', 'thrive-admin-bridge'); ?>
                            </label>
                        </td>
                    </tr>
                </table>

                <?php submit_button(__('Save Settings', 'thrive-admin-bridge')); ?>
            </form>
        </div>
        <?php
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
            wp_send_json_error([
                'message' => 'Connection failed: ' . $response->get_error_message()
            ]);
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
            'id'    => 'thrive-admin-toolbar',
            'title' => '<span class="ab-icon dashicons-admin-network"></span>' . __('Thrive Admin', 'thrive-admin-bridge'),
            'href'  => admin_url('admin.php?page=thrive-admin-dashboard'),
            'meta'  => [
                'title' => __('Access Thrive Admin Dashboard', 'thrive-admin-bridge'),
            ],
        ]);
    }
}