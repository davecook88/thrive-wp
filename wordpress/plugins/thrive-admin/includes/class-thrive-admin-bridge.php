<?php


class Thrive_Admin_Bridge
{
    public function __construct()
    {
        add_action('init', [$this, 'thrive_admin_init']);
        // Early auth mapping (earlier priority than most init tasks)
        add_action('init', [$this, 'thrive_admin_map_proxied_auth_user'], 1);
    }

    public function thrive_admin_init()
    {
        add_shortcode('test_nodejs_bridge', [$this, 'thrive_admin_test_nodejs_bridge_shortcode']);
    }

    /**
     * Map reverse proxy injected auth headers to a WP user.
     * Headers set by Nginx: X-Auth-User-Id, X-Auth-Email, X-Auth-Name, X-Auth-Roles
     */
    public function thrive_admin_map_proxied_auth_user()
    {
        $email_header = isset($_SERVER['HTTP_X_AUTH_EMAIL']) ? sanitize_email(wp_unslash($_SERVER['HTTP_X_AUTH_EMAIL'])) : '';
        if ($email_header === '') {
            return; // No authenticated context
        }
        $globals = [
            'id' => isset($_SERVER['HTTP_X_AUTH_USER_ID']) ? trim(sanitize_text_field(wp_unslash($_SERVER['HTTP_X_AUTH_USER_ID']))) : null,
            'email' => $email_header,
            'name' => isset($_SERVER['HTTP_X_AUTH_NAME']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_X_AUTH_NAME'])) : null,
            'roles' => isset($_SERVER['HTTP_X_AUTH_ROLES']) ? array_filter(array_map('sanitize_key', explode(',', (string) wp_unslash($_SERVER['HTTP_X_AUTH_ROLES'])))) : [],
        ];
        $GLOBALS['thrive_header_auth'] = $globals; // Legacy lightweight global (themes now prefer thrive_get_auth_context)
    }

    public function thrive_admin_test_nodejs_bridge_shortcode()
    {
        $response = $this->thrive_admin_call_node_api('test-bridge', ['message' => 'Hello from WordPress!']);

        error_log('NodeJS Bridge Response: ' . print_r($response, true));

        if (is_wp_error($response)) {
            return 'Error: ' . $response->get_error_message();
        }

        return 'Success: ' . (isset($response['message']) ? $response['message'] : wp_json_encode($response));
    }

    public function thrive_admin_call_node_api($endpoint, $data = [], $method = 'POST')
    {
        $url = 'http://nestjs:3000/' . $endpoint;

        $args = [
            'method' => $method,
            'headers' => [],
        ];

        // Handle request body based on method
        if ($method === 'GET') {
            // For GET requests, don't set body or Content-Type
            // Query parameters should already be in the URL
            // If data is null, we don't set anything
        } elseif ($data !== null && !empty($data)) {
            // For POST, PUT, etc., set the body and content type only if data is provided
            $args['headers']['Content-Type'] = 'application/json';
            $args['body'] = json_encode($data);
        }

        // Include authentication cookie if available
        if (isset($_COOKIE['thrive_sess'])) {
            $args['headers']['Cookie'] = 'thrive_sess=' . $_COOKIE['thrive_sess'];
        }

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            return $response;
        }

        $status = wp_remote_retrieve_response_code($response);
        // Return response appropriate to status code
        if ($status > 299) {
            $body = wp_remote_retrieve_body($response);
            $error_data = json_decode($body, true);

            // Try different possible message fields
            $error_message = $error_data['message'] ??
                ($error_data['error'] ??
                    ($error_data['detail'] ?? 'API Error'));

            error_log("NodeJS API Error: " . $status . " - " . $error_message . " - Body: " . $body);
            return new WP_Error('api_error', $error_message, ['status_code' => $status, 'body' => $body]);
        }

        $body = wp_remote_retrieve_body($response);

        return json_decode($body, true);
    }

    /**
     * Get users from NestJS API
     */
    public function thrive_admin_get_users($params = [])
    {
        $query_string = http_build_query($params);
        $endpoint = 'users' . (!empty($query_string) ? '?' . $query_string : '');

        // For GET requests, don't pass data parameter to avoid WordPress HTTP issues
        return $this->thrive_admin_call_node_api($endpoint, null, 'GET');
    }
}
