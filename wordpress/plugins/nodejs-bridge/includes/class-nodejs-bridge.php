<?php

class NodeJS_Bridge
{
    public function __construct()
    {
        add_action('init', [$this, 'init']);
        // Early auth mapping (earlier priority than most init tasks)
        add_action('init', [$this, 'map_proxied_auth_user'], 1);
    }

    public function init()
    {
        add_shortcode('test_nodejs_bridge', [$this, 'test_nodejs_bridge_shortcode']);
    }

    /**
     * Map reverse proxy injected auth headers to a WP user.
     * Headers set by Nginx: X-Auth-User-Id, X-Auth-Email, X-Auth-Name, X-Auth-Roles
     */
    public function map_proxied_auth_user()
    {
        // Skip if already logged in (avoid overriding existing session)
        if (is_user_logged_in()) {
            return;
        }

        $user_id_header = isset($_SERVER['HTTP_X_AUTH_USER_ID']) ? trim(sanitize_text_field(wp_unslash($_SERVER['HTTP_X_AUTH_USER_ID']))) : '';
        $email_header = isset($_SERVER['HTTP_X_AUTH_EMAIL']) ? sanitize_email(wp_unslash($_SERVER['HTTP_X_AUTH_EMAIL'])) : '';
        $name_header = isset($_SERVER['HTTP_X_AUTH_NAME']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_X_AUTH_NAME'])) : '';
        $roles_header = isset($_SERVER['HTTP_X_AUTH_ROLES']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_X_AUTH_ROLES'])) : '';

        if (empty($user_id_header) || empty($email_header)) {
            return; // Not authenticated
        }

        $wp_user = get_user_by('email', $email_header);
        if (!$wp_user) {
            $username_base = sanitize_user(current(explode('@', $email_header)), true);
            $username = $username_base;
            $i = 1;
            while (username_exists($username)) {
                $username = $username_base . $i;
                $i++;
                if ($i > 50) {
                    break; // prevent infinite loop
                }
            }
            $user_id = wp_insert_user([
                'user_login' => $username,
                'user_email' => $email_header,
                'display_name' => $name_header ?: $username,
                'user_pass' => wp_generate_password(),
                'role' => 'subscriber',
            ]);
            if (!is_wp_error($user_id)) {
                $wp_user = get_user_by('id', $user_id);
            }
        }

        if ($wp_user && !is_wp_error($wp_user)) {
            wp_set_current_user($wp_user->ID);
            // Optionally set WP auth cookie if we want native WP capability checks across requests
            // wp_set_auth_cookie($wp_user->ID);
            do_action('thrive_proxied_auth_mapped', $wp_user, $roles_header);
        }
    }

    public function test_nodejs_bridge_shortcode()
    {
        $response = $this->call_node_api('test-bridge', ['message' => 'Hello from WordPress!']);

        error_log('NodeJS Bridge Response: ' . print_r($response, true));

        if (is_wp_error($response)) {
            return 'Error: ' . $response->get_error_message();
        }

        return 'Success: ' . (isset($response['message']) ? $response['message'] : wp_json_encode($response));
    }

    public function call_node_api($endpoint, $data = [], $method = 'POST')
    {
        $url = 'http://nestjs:3000/' . $endpoint;

        $args = [
            'method' => $method,
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'body' => json_encode($data),
        ];

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            return $response;
        }

        return json_decode(wp_remote_retrieve_body($response), true);
    }
}
