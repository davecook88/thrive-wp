<?php
/**
 * Profile Picture Upload API
 *
 * REST API endpoints for teacher profile picture upload functionality.
 * Handles uploading, updating, and deleting teacher profile pictures.
 *
 * @package ThriveAdmin
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once plugin_dir_path(dirname(__FILE__)) . 'services/class-upload-service.php';

/**
 * Class Thrive_Profile_Picture_API
 *
 * Provides REST API endpoints for profile picture management.
 */
class Thrive_Profile_Picture_API
{
    /**
     * Upload service instance.
     *
     * @var Thrive_Upload_Service
     */
    private $upload_service;

    /**
     * Constructor.
     */
    public function __construct()
    {
        $this->upload_service = new Thrive_Upload_Service();
        $this->register_routes();
    }

    /**
     * Register REST API routes.
     */
    public function register_routes()
    {
        register_rest_route('thrive/v1', '/teachers/me/profile-picture', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'upload_profile_picture'],
                'permission_callback' => [$this, 'check_teacher_permission'],
            ],
            [
                'methods' => WP_REST_Server::DELETABLE,
                'callback' => [$this, 'delete_profile_picture'],
                'permission_callback' => [$this, 'check_teacher_permission'],
            ],
        ]);
    }

    /**
     * Check if current user is a teacher.
     *
     * @param WP_REST_Request $request Request object.
     *
     * @return bool|WP_Error True if user is teacher, WP_Error otherwise.
     */
    public function check_teacher_permission($request)
    {
        if (!thrive_is_logged_in()) {
            return new WP_Error(
                'not_authenticated',
                'You must be logged in to upload a profile picture.',
                ['status' => 401]
            );
        }

        if (!thrive_user_has_role('teacher')) {
            return new WP_Error(
                'forbidden',
                'Only teachers can upload profile pictures.',
                ['status' => 403]
            );
        }

        return true;
    }

    /**
     * Upload a profile picture.
     *
     * @param WP_REST_Request $request Request object.
     *
     * @return WP_REST_Response|WP_Error Response object or error.
     */
    public function upload_profile_picture($request)
    {
        $auth_context = thrive_get_auth_context();
        if (!$auth_context) {
            return new WP_Error(
                'no_auth_context',
                'Could not retrieve authentication context.',
                ['status' => 401]
            );
        }

        // Apply auth context to WordPress to set current user
        $user_id = $auth_context->applyToWordPress();
        if (!$user_id) {
            return new WP_Error(
                'no_user_id',
                'Could not determine user ID.',
                ['status' => 401]
            );
        }

        // Get uploaded file from $_FILES
        $files = $request->get_file_params();
        if (empty($files['file'])) {
            return new WP_Error(
                'no_file',
                'No file was uploaded. Please provide a file with the key "file".',
                ['status' => 400]
            );
        }

        $file = $files['file'];

        // Profile picture constraints
        $constraints = [
            'allowed_types' => [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/webp',
            ],
            'max_size' => 5 * 1024 * 1024, // 5MB
            'require_image' => true,
            'min_width' => 100,
            'min_height' => 100,
            'max_width' => 2000,
            'max_height' => 2000,
            'resize_if_too_large' => true,
        ];

        // Upload the file
        $upload_result = $this->upload_service->upload_file($file, $constraints, $user_id);

        if (is_wp_error($upload_result)) {
            return $upload_result;
        }

        // Ensure the URL is absolute with protocol
        $avatar_url = $upload_result['url'];
        if (strpos($avatar_url, '//') === 0) {
            // Protocol-relative URL, add http/https
            $avatar_url = (is_ssl() ? 'https:' : 'http:') . $avatar_url;
        } elseif (strpos($avatar_url, '/') === 0) {
            // Relative URL, make it absolute
            $avatar_url = home_url($avatar_url);
        }

        // Get old profile picture to delete it later
        $old_avatar_url = $this->get_teacher_avatar_url($user_id);
        $old_attachment_id = null;

        if ($old_avatar_url) {
            $old_attachment_id = attachment_url_to_postid($old_avatar_url);
        }

        // Update teacher profile in NestJS with new avatar URL
        $update_result = $this->update_teacher_avatar_in_nestjs($user_id, $avatar_url);

        if (is_wp_error($update_result)) {
            // Upload succeeded but NestJS update failed - clean up the uploaded file
            $this->upload_service->delete_file($upload_result['attachment_id'], $user_id);
            return $update_result;
        }

        // Delete old profile picture if it exists and is different
        if ($old_attachment_id && $old_attachment_id !== $upload_result['attachment_id']) {
            $this->upload_service->delete_file($old_attachment_id, $user_id);
        }

        return new WP_REST_Response([
            'success' => true,
            'attachment_id' => $upload_result['attachment_id'],
            'url' => $avatar_url,
            'message' => 'Profile picture uploaded successfully.',
        ], 200);
    }

    /**
     * Delete profile picture.
     *
     * @param WP_REST_Request $request Request object.
     *
     * @return WP_REST_Response|WP_Error Response object or error.
     */
    public function delete_profile_picture($request)
    {
        $auth_context = thrive_get_auth_context();
        if (!$auth_context) {
            return new WP_Error(
                'no_auth_context',
                'Could not retrieve authentication context.',
                ['status' => 401]
            );
        }

        // Apply auth context to WordPress to set current user
        $user_id = $auth_context->applyToWordPress();
        if (!$user_id) {
            return new WP_Error(
                'no_user_id',
                'Could not determine user ID.',
                ['status' => 401]
            );
        }

        // Get current avatar URL
        $avatar_url = $this->get_teacher_avatar_url($user_id);

        if (!$avatar_url) {
            return new WP_Error(
                'no_avatar',
                'No profile picture to delete.',
                ['status' => 404]
            );
        }

        // Get attachment ID from URL
        $attachment_id = attachment_url_to_postid($avatar_url);

        // Update teacher profile in NestJS to remove avatar
        $update_result = $this->update_teacher_avatar_in_nestjs($user_id, null);

        if (is_wp_error($update_result)) {
            return $update_result;
        }

        // Delete the attachment if we found it
        if ($attachment_id) {
            $delete_result = $this->upload_service->delete_file($attachment_id, $user_id);
            if (is_wp_error($delete_result)) {
                // Log error but don't fail the request since NestJS was updated
                error_log('Failed to delete attachment: ' . $delete_result->get_error_message());
            }
        }

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Profile picture deleted successfully.',
        ], 200);
    }

    /**
     * Get session cookie for NestJS authentication.
     *
     * @return string|null Cookie header string or null.
     */
    private function get_session_cookie()
    {
        // Default session cookie name (can be configured via env)
        $cookie_name = 'thrive_sess';

        if (isset($_COOKIE[$cookie_name])) {
            return $cookie_name . '=' . $_COOKIE[$cookie_name];
        }

        return null;
    }

    /**
     * Get current teacher avatar URL from NestJS.
     *
     * @param int $user_id User ID.
     *
     * @return string|null Avatar URL or null.
     */
    private function get_teacher_avatar_url($user_id)
    {
        $headers = [
            'Content-Type' => 'application/json',
        ];

        // Forward session cookie to NestJS for authentication
        $cookie = $this->get_session_cookie();
        if ($cookie) {
            $headers['Cookie'] = $cookie;
        }

        $response = wp_remote_get('http://nestjs:3000/teachers/me/profile', [
            'headers' => $headers,
            'timeout' => 10,
        ]);

        if (is_wp_error($response)) {
            return null;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        return $data['avatarUrl'] ?? null;
    }

    /**
     * Update teacher avatar URL in NestJS.
     *
     * @param int $user_id User ID.
     * @param string|null $avatar_url New avatar URL or null to remove.
     *
     * @return true|WP_Error True on success, WP_Error on failure.
     */
    private function update_teacher_avatar_in_nestjs($user_id, $avatar_url)
    {
        $headers = [
            'Content-Type' => 'application/json',
        ];

        // Forward session cookie to NestJS for authentication
        $cookie = $this->get_session_cookie();
        if ($cookie) {
            $headers['Cookie'] = $cookie;
        }

        // Debug: Log the avatar URL being sent
        error_log('Updating teacher avatar URL: ' . var_export($avatar_url, true));

        $response = wp_remote_request('http://nestjs:3000/teachers/me/profile', [
            'method' => 'PATCH',
            'headers' => $headers,
            'body' => json_encode([
                'avatarUrl' => $avatar_url,
            ]),
            'timeout' => 10,
        ]);

        if (is_wp_error($response)) {
            return new WP_Error(
                'nestjs_connection_error',
                'Failed to connect to API server: ' . $response->get_error_message(),
                ['status' => 500]
            );
        }

        $status_code = wp_remote_retrieve_response_code($response);

        if ($status_code !== 200) {
            $body = wp_remote_retrieve_body($response);
            return new WP_Error(
                'nestjs_update_failed',
                'Failed to update profile: ' . $body,
                ['status' => $status_code]
            );
        }

        return true;
    }
}
