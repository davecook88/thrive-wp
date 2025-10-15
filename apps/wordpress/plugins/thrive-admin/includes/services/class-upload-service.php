<?php
/**
 * Upload Service
 *
 * Reusable service for handling file uploads through WordPress media system.
 * This service provides a clean interface for uploading, validating, and managing
 * files while leveraging WordPress's built-in media handling capabilities.
 *
 * @package ThriveAdmin
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Class Thrive_Upload_Service
 *
 * Handles file uploads with validation, security checks, and WordPress media integration.
 */
class Thrive_Upload_Service
{
    /**
     * Default maximum file size in bytes (5MB)
     */
    const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

    /**
     * Default allowed image MIME types
     */
    const DEFAULT_IMAGE_TYPES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
    ];

    /**
     * Upload a file using WordPress media handling.
     *
     * @param array $file The file array from $_FILES.
     * @param array $constraints Optional. Upload constraints.
     *   - allowed_types: array of allowed MIME types
     *   - max_size: maximum file size in bytes
     *   - require_image: bool, whether file must be an image
     *   - min_width: minimum image width (if require_image)
     *   - min_height: minimum image height (if require_image)
     *   - max_width: maximum image width (if require_image)
     *   - max_height: maximum image height (if require_image)
     * @param int $user_id Optional. User ID to associate with upload.
     *
     * @return array|WP_Error Array with attachment_id and url on success, WP_Error on failure.
     */
    public function upload_file($file, array $constraints = [], $user_id = null)
    {
        // Validate file exists
        if (empty($file) || !isset($file['tmp_name']) || empty($file['tmp_name'])) {
            return new WP_Error('no_file', 'No file was uploaded.');
        }

        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return new WP_Error('upload_error', $this->get_upload_error_message($file['error']));
        }

        // Set defaults
        $constraints = wp_parse_args($constraints, [
            'allowed_types' => self::DEFAULT_IMAGE_TYPES,
            'max_size' => self::DEFAULT_MAX_SIZE,
            'require_image' => true,
        ]);

        // Validate file
        $validation_result = $this->validate_file($file, $constraints);
        if (is_wp_error($validation_result)) {
            return $validation_result;
        }

        // Require WordPress media handling functions
        if (!function_exists('wp_handle_upload')) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }
        if (!function_exists('wp_generate_attachment_metadata')) {
            require_once ABSPATH . 'wp-admin/includes/image.php';
        }
        if (!function_exists('media_handle_upload')) {
            require_once ABSPATH . 'wp-admin/includes/media.php';
        }

        // Set current user if provided (for permission checks)
        if ($user_id) {
            wp_set_current_user($user_id);
        }

        // Handle the upload
        $upload_overrides = [
            'test_form' => false,
            'mimes' => $this->get_allowed_mimes($constraints['allowed_types']),
        ];

        $uploaded_file = wp_handle_upload($file, $upload_overrides);

        if (isset($uploaded_file['error'])) {
            return new WP_Error('upload_failed', $uploaded_file['error']);
        }

        // Create attachment post
        $attachment = [
            'post_mime_type' => $uploaded_file['type'],
            'post_title' => sanitize_file_name(pathinfo($file['name'], PATHINFO_FILENAME)),
            'post_content' => '',
            'post_status' => 'inherit',
        ];

        if ($user_id) {
            $attachment['post_author'] = $user_id;
        }

        $attachment_id = wp_insert_attachment($attachment, $uploaded_file['file']);

        if (is_wp_error($attachment_id)) {
            // Clean up the uploaded file if attachment creation failed
            @unlink($uploaded_file['file']);
            return $attachment_id;
        }

        // Generate attachment metadata (thumbnails, etc.)
        $attachment_data = wp_generate_attachment_metadata($attachment_id, $uploaded_file['file']);
        wp_update_attachment_metadata($attachment_id, $attachment_data);

        return [
            'attachment_id' => $attachment_id,
            'url' => $uploaded_file['url'],
            'file' => $uploaded_file['file'],
            'type' => $uploaded_file['type'],
        ];
    }

    /**
     * Validate a file against constraints.
     *
     * @param array $file The file array from $_FILES.
     * @param array $constraints Upload constraints.
     *
     * @return true|WP_Error True if valid, WP_Error if validation fails.
     */
    public function validate_file($file, array $constraints)
    {
        // Validate file size
        if (isset($constraints['max_size']) && $file['size'] > $constraints['max_size']) {
            $max_mb = round($constraints['max_size'] / (1024 * 1024), 1);
            return new WP_Error(
                'file_too_large',
                sprintf('File size exceeds maximum allowed size of %s MB.', $max_mb)
            );
        }

        // Validate MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime_type = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mime_type, $constraints['allowed_types'], true)) {
            return new WP_Error(
                'invalid_file_type',
                'File type is not allowed. Allowed types: ' . implode(', ', $constraints['allowed_types'])
            );
        }

        // Validate image dimensions if required
        if (!empty($constraints['require_image']) && strpos($mime_type, 'image/') === 0) {
            $image_info = getimagesize($file['tmp_name']);
            if ($image_info === false) {
                return new WP_Error('invalid_image', 'File is not a valid image.');
            }

            list($width, $height) = $image_info;

            // Check minimum dimensions
            if (isset($constraints['min_width']) && $width < $constraints['min_width']) {
                return new WP_Error(
                    'image_too_small',
                    sprintf('Image width must be at least %dpx.', $constraints['min_width'])
                );
            }

            if (isset($constraints['min_height']) && $height < $constraints['min_height']) {
                return new WP_Error(
                    'image_too_small',
                    sprintf('Image height must be at least %dpx.', $constraints['min_height'])
                );
            }

            // Check maximum dimensions
            if (isset($constraints['max_width']) && $width > $constraints['max_width']) {
                return new WP_Error(
                    'image_too_large',
                    sprintf('Image width must not exceed %dpx.', $constraints['max_width'])
                );
            }

            if (isset($constraints['max_height']) && $height > $constraints['max_height']) {
                return new WP_Error(
                    'image_too_large',
                    sprintf('Image height must not exceed %dpx.', $constraints['max_height'])
                );
            }
        }

        return true;
    }

    /**
     * Delete an uploaded file and its attachment.
     *
     * @param int $attachment_id The attachment ID to delete.
     * @param int $user_id Optional. User ID to verify ownership.
     *
     * @return bool|WP_Error True on success, WP_Error on failure.
     */
    public function delete_file($attachment_id, $user_id = null)
    {
        if (!$attachment_id) {
            return new WP_Error('invalid_attachment', 'Invalid attachment ID.');
        }

        $attachment = get_post($attachment_id);

        if (!$attachment || $attachment->post_type !== 'attachment') {
            return new WP_Error('attachment_not_found', 'Attachment not found.');
        }

        // Verify ownership if user_id provided
        if ($user_id && (int) $attachment->post_author !== (int) $user_id) {
            return new WP_Error('permission_denied', 'You do not have permission to delete this file.');
        }

        // Delete the attachment and its files
        $deleted = wp_delete_attachment($attachment_id, true);

        if ($deleted === false) {
            return new WP_Error('delete_failed', 'Failed to delete attachment.');
        }

        return true;
    }

    /**
     * Get attachment URL by ID.
     *
     * @param int $attachment_id The attachment ID.
     * @param string $size Optional. Image size. Default 'full'.
     *
     * @return string|false Attachment URL or false on failure.
     */
    public function get_attachment_url($attachment_id, $size = 'full')
    {
        return wp_get_attachment_image_url($attachment_id, $size);
    }

    /**
     * Get allowed MIME types array for wp_handle_upload.
     *
     * @param array $allowed_types Array of MIME types.
     *
     * @return array Associative array for WordPress upload handling.
     */
    private function get_allowed_mimes($allowed_types)
    {
        $mimes = [];
        $wp_mimes = get_allowed_mime_types();

        foreach ($wp_mimes as $ext => $mime) {
            if (in_array($mime, $allowed_types, true)) {
                $mimes[$ext] = $mime;
            }
        }

        return $mimes;
    }

    /**
     * Get human-readable upload error message.
     *
     * @param int $error_code PHP upload error code.
     *
     * @return string Error message.
     */
    private function get_upload_error_message($error_code)
    {
        switch ($error_code) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                return 'File size exceeds maximum allowed size.';
            case UPLOAD_ERR_PARTIAL:
                return 'File was only partially uploaded.';
            case UPLOAD_ERR_NO_FILE:
                return 'No file was uploaded.';
            case UPLOAD_ERR_NO_TMP_DIR:
                return 'Missing temporary folder.';
            case UPLOAD_ERR_CANT_WRITE:
                return 'Failed to write file to disk.';
            case UPLOAD_ERR_EXTENSION:
                return 'Upload blocked by PHP extension.';
            default:
                return 'Unknown upload error.';
        }
    }
}
