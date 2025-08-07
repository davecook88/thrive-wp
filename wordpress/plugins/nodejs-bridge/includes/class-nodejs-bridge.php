<?php

class NodeJS_Bridge
{
    public function __construct()
    {
        add_action('init', [$this, 'init']);
    }

    public function init()
    {
        add_shortcode('test_nodejs_bridge', [$this, 'test_nodejs_bridge_shortcode']);
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
