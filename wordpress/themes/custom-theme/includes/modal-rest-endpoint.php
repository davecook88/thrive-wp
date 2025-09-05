<?php
/**
 * Modal REST Endpoint
 *
 * Handles the /wp-json/custom-theme/v1/modal/render endpoint for rendering modal content by type.
 */

require_once get_template_directory() . '/includes/base-rest-endpoint.php';

class ModalRestEndpoint extends BaseRestEndpoint
{

    /**
     * Constructor.
     */
    public function __construct()
    {
        parent::__construct('custom-theme/v1', '/modal/render', ['GET', 'POST']);
    }

    /**
     * Handle the REST request.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function handle_request(WP_REST_Request $request)
    {
        // Determine modal by type rather than direct ID for authoring ergonomics
        $type_param = sanitize_key($request->get_param('type') ?? '');
        $allowed_types = ['availability', 'class', 'course', 'default'];
        $type = in_array($type_param, $allowed_types, true) ? $type_param : 'default';

        // Resolve modal post ID from options mapping, falling back to default modal
        $option_map = [
            'availability' => 'custom_theme_modal_availability_id',
            'class' => 'custom_theme_modal_class_id',
            'course' => 'custom_theme_modal_course_id',
            'default' => 'custom_theme_default_modal_id', // existing option
        ];

        $post_id = 0;
        $opt_key = $option_map[$type] ?? 'custom_theme_default_modal_id';
        $post_id = (int) get_option($opt_key, 0);
        if (!$post_id) {
            // Fallback to default modal option
            $post_id = (int) get_option('custom_theme_default_modal_id', 0);
        }
        if (!$post_id) {
            // Last resort: latest published thrive_modal
            $latest = get_posts([
                'post_type' => 'thrive_modal',
                'numberposts' => 1,
                'post_status' => 'publish',
                'orderby' => 'date',
                'order' => 'DESC',
            ]);
            if (!empty($latest) && $latest[0] instanceof WP_Post) {
                $post_id = (int) $latest[0]->ID;
            }
        }

        $post = $post_id ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'thrive_modal') {
            return new WP_REST_Response('Not found', 404);
        }

        // Get rendered content (block rendering etc.)
        $content = apply_filters('the_content', $post->post_content);

        // Basic HTTP caching: ETag/Last-Modified based on post content and modified time
        $modified_gmt = $post->post_modified_gmt ?: $post->post_modified;
        $modified_ts = $modified_gmt ? strtotime($modified_gmt) : time();
        $last_modified_http = gmdate('D, d M Y H:i:s', $modified_ts) . ' GMT';
        $etag = 'W/"' . md5($post->ID . ':' . $modified_ts . ':' . strlen($content)) . '"';

        // Conditional requests
        $if_none_match = isset($_SERVER['HTTP_IF_NONE_MATCH']) ? trim((string) $_SERVER['HTTP_IF_NONE_MATCH']) : '';
        $if_modified_since = isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) ? trim((string) $_SERVER['HTTP_IF_MODIFIED_SINCE']) : '';

        // Normalize ETag for comparison (remove quotes and unescape)
        $normalized_etag = trim(stripslashes($etag), '"');
        $normalized_if_none_match = trim(stripslashes($if_none_match), '"');

        if ($normalized_if_none_match && $normalized_if_none_match === $normalized_etag) {
            $resp = new WP_REST_Response(null, 304);
            $resp->header('ETag', $etag);
            $resp->header('Last-Modified', $last_modified_http);
            $resp->header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60, stale-if-error=600');
            return $resp;
        }
        if ($if_modified_since && strtotime($if_modified_since) >= $modified_ts) {
            $resp = new WP_REST_Response(null, 304);
            $resp->header('ETag', $etag);
            $resp->header('Last-Modified', $last_modified_http);
            $resp->header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60, stale-if-error=600');
            return $resp;
        }

        // Return JSON with HTML payload to match frontend expectations
        $response = rest_ensure_response(['html' => $content]);
        $response->header('ETag', $etag);
        $response->header('Last-Modified', $last_modified_http);
        // Note: Responses to GET are cacheable by browsers; POST caching varies by user agent.
        $response->header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60, stale-if-error=600');
        return $response;
    }
}

// Register the endpoint on rest_api_init
add_action('rest_api_init', function () {
    $endpoint = new ModalRestEndpoint();
    $endpoint->register();
});
